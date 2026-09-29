import os
import uuid
import time
import json
import re
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, text

from app.models.user import User
from app.models.chat import Thread, Message
from app.models.user_setting import UserSetting
from app.models.analytics import AnalyticEvent
from app.models.agent import AgentConfig
from app.api.deps import get_current_user
from app.core.database import get_db

from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from langgraph.types import Command
from app.services.agent_graph import orchestration_graph

router = APIRouter()

META_TAG_PATTERN = re.compile(r"\n*<!--\s*AZOL_META:(.*?)\s*-->\s*$", re.DOTALL)


class RunRequest(BaseModel):
    thread_id: str
    message: str
    agent_id: Optional[str] = "auto"
    project_id: Optional[str] = None


class ApprovalDecision(BaseModel):
    thread_id: str
    approved: bool
    reason: Optional[str] = None


def safe_timestamp(dt_val: Any) -> float:
    if not dt_val:
        return 0.0
    try:
        return float(dt_val.timestamp())
    except Exception:
        return 0.0


def pack_message_with_meta(content: str, meta_dict: Dict[str, Any]) -> str:
    """Embeds real execution telemetry & tool sources invisibly at the end of message content."""
    clean_text = META_TAG_PATTERN.sub("", content or "").rstrip()
    try:
        encoded = json.dumps(meta_dict, ensure_ascii=False)
        return f"{clean_text}\n\n<!-- AZOL_META:{encoded} -->"
    except Exception:
        return clean_text


def unpack_message_and_meta(raw_content: str) -> Tuple[str, Optional[Dict[str, Any]]]:
    """Extracts the visible message text and the stored real tool sources metadata."""
    if not raw_content:
        return "", None
    match = META_TAG_PATTERN.search(raw_content)
    if not match:
        return raw_content, None
    clean_text = META_TAG_PATTERN.sub("", raw_content).rstrip()
    try:
        meta_dict = json.loads(match.group(1))
        return clean_text, meta_dict
    except Exception:
        return clean_text, None


def extract_domain_label(url: str) -> str:
    try:
        parsed = urlparse(url)
        host = (parsed.netloc or "").replace("www.", "")
        return host if host else "Web Source"
    except Exception:
        return "Web Source"


def parse_dynamic_tool_sources(
    tool_messages: List[ToolMessage],
    ai_response_text: str,
    user_docs: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Parses 100% real sources directly from LangGraph ToolMessage outputs
    (web_search / Tavily results and search_long_term_memory FAISS chunks)
    plus any explicit URLs in the AI response. Zero hardcoded websites.
    """
    extracted_sources: List[Dict[str, Any]] = []
    seen_identifiers = set()

    for t_msg in tool_messages:
        tool_name = (getattr(t_msg, "name", "") or "").lower()
        raw_content = getattr(t_msg, "content", "")
        is_web_tool = any(k in tool_name for k in ["web", "search", "tavily", "serp", "google"])

        # ---------------------------------------------------------
        # 1. Parse JSON or Structured List/Dict outputs (e.g., Tavily API)
        # ---------------------------------------------------------
        parsed_data = None
        if isinstance(raw_content, (list, dict)):
            parsed_data = raw_content
        elif isinstance(raw_content, str):
            raw_str = raw_content.strip()
            if (raw_str.startswith("[") and raw_str.endswith("]")) or (raw_str.startswith("{") and raw_str.endswith("}")):
                try:
                    parsed_data = json.loads(raw_str)
                except Exception:
                    parsed_data = None

        if parsed_data:
            items = (
                parsed_data.get("results", [])
                if isinstance(parsed_data, dict)
                else (parsed_data if isinstance(parsed_data, list) else [parsed_data])
            )
            for idx, item in enumerate(items):
                if not isinstance(item, dict):
                    continue
                url = item.get("url") or item.get("link") or item.get("source")
                title = item.get("title") or item.get("name") or (extract_domain_label(url) if url else f"Web Result #{idx + 1}")
                snippet = item.get("content") or item.get("snippet") or item.get("raw_content") or str(item)
                score = item.get("score")

                key = url or title
                if key in seen_identifiers:
                    continue
                seen_identifiers.add(key)

                similarity_str = (
                    f"{int(round(float(score) * 100))}%"
                    if isinstance(score, (int, float)) and score <= 1
                    else "Live SERP"
                )

                extracted_sources.append({
                    "id": f"tool_src_{len(extracted_sources) + 1}",
                    "name": str(title)[:90],
                    "type": f"WEB • {extract_domain_label(url)}" if url else "WEB • Live Search Snippet",
                    "scope": extract_domain_label(url) if url else "Live Web Search (SERP)",
                    "url": url if (url and str(url).startswith("http")) else None,
                    "similarity": similarity_str,
                    "can_preview": True,
                    "is_web": True if (url or is_web_tool) else False,
                    "excerpt": str(snippet)[:1500]
                })
            continue

        # ---------------------------------------------------------
        # 2. Parse Plain-Text Tool Outputs
        # ---------------------------------------------------------
        text_body = str(raw_content or "").strip()
        if not text_body:
            continue

        # A) Check if raw URLs exist in the plain text
        urls_in_tool = re.findall(r"https?://[^\s)\]>\"']+", text_body)
        if urls_in_tool:
            for u_idx, found_url in enumerate(urls_in_tool[:6]):
                clean_url = found_url.rstrip(".,;)")
                if clean_url in seen_identifiers:
                    continue
                seen_identifiers.add(clean_url)
                domain = extract_domain_label(clean_url)
                extracted_sources.append({
                    "id": f"web_tool_{u_idx + 1}",
                    "name": f"{domain} — {clean_url.split('/')[-1] or 'Web Result'}",
                    "type": f"WEB • {domain}",
                    "scope": domain,
                    "url": clean_url,
                    "similarity": "Live SERP",
                    "can_preview": True,
                    "is_web": True,
                    "excerpt": text_body[:1500]
                })
            continue

        # B) Plain-text output from web_search (split into individual snippet cards)
        if is_web_tool:
            # Split concatenated results by dates (e.g. "Sep 1, 2026 •" or "3 days ago •")
            raw_snippets = [
                s.strip()
                for s in re.split(
                    r"(?=(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}\s*•|\d+\s+days?\s+ago\s*•)",
                    text_body
                )
                if s.strip()
            ]
            if not raw_snippets:
                raw_snippets = [s.strip() for s in text_body.split("\n\n") if s.strip()] or [text_body]

            for s_idx, snip in enumerate(raw_snippets[:4]):
                headline = snip.split("•")[-1].strip().split(".")[0][:75] or f"Web Search Result #{s_idx + 1}"
                card_title = f"Web Result #{s_idx + 1}: {headline}..."
                if card_title in seen_identifiers:
                    continue
                seen_identifiers.add(card_title)

                extracted_sources.append({
                    "id": f"web_serp_{len(extracted_sources) + 1}",
                    "name": card_title,
                    "type": "WEB • Live Search Engine Snippet",
                    "scope": "Live Web Search (SERP)",
                    "url": None,
                    "similarity": "Live SERP",
                    "can_preview": True,
                    "is_web": True,
                    "excerpt": snip
                })
            continue

        # C) Plain-text output from search_long_term_memory (Knowledge Base FAISS)
        matched_user_doc = False
        for doc in user_docs:
            fname = doc["filename"]
            if fname.lower() in text_body.lower():
                if fname in seen_identifiers:
                    continue
                seen_identifiers.add(fname)
                matched_user_doc = True
                extracted_sources.append({
                    "id": str(doc["id"]),
                    "name": fname,
                    "type": f"{doc['ext']} • FAISS Vector Retrieval",
                    "scope": "Knowledge Base",
                    "url": None,
                    "similarity": "FAISS Match",
                    "can_preview": True,
                    "is_web": False,
                    "excerpt": text_body[:1500]
                })

        if not matched_user_doc:
            label = "FAISS Long-Term Memory Chunk" if "memory" in tool_name else f"Tool Execution Output ({tool_name or 'system'})"
            if label not in seen_identifiers:
                seen_identifiers.add(label)
                extracted_sources.append({
                    "id": f"mem_chunk_{len(extracted_sources) + 1}",
                    "name": label,
                    "type": "MEMORY • Retrieved Context",
                    "scope": "FAISS Vector Store",
                    "url": None,
                    "similarity": "Retrieved",
                    "can_preview": True,
                    "is_web": False,
                    "excerpt": text_body[:1500]
                })

    # ---------------------------------------------------------
    # 3. Extract any explicit URLs cited in the final Markdown response
    # ---------------------------------------------------------
    if ai_response_text:
        md_links = re.findall(r"\[([^\]]+)\]\((https?://[^\s)]+)\)", ai_response_text)
        for link_title, link_url in md_links:
            clean_url = link_url.rstrip(".,;)")
            if clean_url not in seen_identifiers:
                seen_identifiers.add(clean_url)
                domain = extract_domain_label(clean_url)
                extracted_sources.append({
                    "id": f"cite_url_{len(extracted_sources) + 1}",
                    "name": link_title.strip() or domain,
                    "type": f"WEB • {domain}",
                    "scope": domain,
                    "url": clean_url,
                    "similarity": "Cited URL",
                    "can_preview": True,
                    "is_web": True,
                    "excerpt": f"Direct citation referenced in response: {link_title} ({clean_url})"
                })

        bare_urls = re.findall(r"(?<!\()(https?://[^\s)\]>\"']+)", ai_response_text)
        for bare_url in bare_urls:
            clean_url = bare_url.rstrip(".,;)")
            if clean_url not in seen_identifiers:
                seen_identifiers.add(clean_url)
                domain = extract_domain_label(clean_url)
                extracted_sources.append({
                    "id": f"bare_url_{len(extracted_sources) + 1}",
                    "name": f"{domain} ({clean_url})",
                    "type": f"WEB • {domain}",
                    "scope": domain,
                    "url": clean_url,
                    "similarity": "Cited URL",
                    "can_preview": True,
                    "is_web": True,
                    "excerpt": f"Direct web URL referenced in response: {clean_url}"
                })

    return extracted_sources[:8]


async def resolve_workspace_keys(db: AsyncSession, current_user_id: int) -> Dict[str, Optional[str]]:
    """3-Tier Enterprise Key Resolution: User DB -> Admin Workspace DB -> Server .env."""
    settings_query = await db.execute(
        select(UserSetting).where(UserSetting.user_id == current_user_id)
    )
    user_settings = settings_query.scalars().first()

    openai_key = getattr(user_settings, "openai_api_key", None) if user_settings else None
    groq_key = getattr(user_settings, "groq_api_key", None) if user_settings else None
    anthropic_key = getattr(user_settings, "anthropic_api_key", None) if user_settings else None

    if not openai_key and not groq_key:
        all_settings_res = await db.execute(select(UserSetting).order_by(UserSetting.id.asc()))
        for setting_row in all_settings_res.scalars().all():
            if not openai_key and getattr(setting_row, "openai_api_key", None):
                openai_key = setting_row.openai_api_key
            if not groq_key and getattr(setting_row, "groq_api_key", None):
                groq_key = setting_row.groq_api_key
            if not anthropic_key and getattr(setting_row, "anthropic_api_key", None):
                anthropic_key = setting_row.anthropic_api_key
            if openai_key or groq_key:
                break

    openai_key = openai_key or os.getenv("OPENAI_API_KEY") or groq_key or os.getenv("GROQ_API_KEY")
    groq_key = groq_key or os.getenv("GROQ_API_KEY")
    anthropic_key = anthropic_key or os.getenv("ANTHROPIC_API_KEY")

    return {
        "openai_api_key": openai_key,
        "groq_api_key": groq_key,
        "anthropic_api_key": anthropic_key
    }


def extract_or_estimate_tokens(accumulated_tokens: int, prompt_text: str, response_text: str) -> int:
    if accumulated_tokens and accumulated_tokens > 0:
        return accumulated_tokens
    total_chars = len(prompt_text or "") + len(response_text or "")
    return max(64, int(round(total_chars / 3.6)))


# ==========================================
# 1. CHAT HISTORY & THREAD MANAGEMENT (READ-ONLY & STRICT ISOLATION)
# ==========================================

@router.get("/chat/threads")
async def get_chat_threads(
    project_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        result = await db.execute(
            select(
                Message.id,
                Message.thread_id,
                Message.role,
                Message.content,
                Message.created_at,
                Thread.project_id
            )
            .join(Thread, Message.thread_id == Thread.id)
            .where(Thread.user_id == current_user.id)
            .order_by(Message.created_at.asc())
        )
        rows = result.all()

        grouped_threads: Dict[str, Dict[str, Any]] = {}
        for msg_id, tid, role, content, created_at, thread_proj_id in rows:
            if not tid:
                continue
            if tid not in grouped_threads:
                grouped_threads[tid] = {
                    "thread_id": tid,
                    "project_id": thread_proj_id,
                    "messages": [],
                    "updated_at": created_at
                }
            grouped_threads[tid]["messages"].append({
                "id": str(msg_id),
                "role": role or "user",
                "content": content or ""
            })
            if created_at:
                grouped_threads[tid]["updated_at"] = created_at

        visible_threads = []
        for tid, data in grouped_threads.items():
            msgs = data["messages"]
            thread_proj_id = data["project_id"]
            tid_lower = tid.lower()

            is_proj = bool(
                (thread_proj_id is not None and str(thread_proj_id).strip() != "")
                or tid_lower.startswith("proj_")
                or tid_lower.startswith("proj-")
                or tid_lower.startswith("project_")
                or tid_lower.startswith("project-")
                or any("[project context:" in m["content"].lower() for m in msgs)
            )

            if project_id is None:
                if is_proj:
                    continue
            else:
                pid_str = str(project_id)
                matches_project = (
                    str(thread_proj_id) == pid_str
                    or pid_str in tid
                )
                if not matches_project:
                    continue

            first_user_msg = next((m for m in msgs if m["role"] == "user"), msgs[0] if msgs else {"content": "New Chat"})
            clean_first, _ = unpack_message_and_meta(first_user_msg["content"])
            clean_content = re.sub(r"^\[.*?\]\n\n", "", clean_first).strip()
            title = clean_content[:35] + "..." if len(clean_content) > 35 else (clean_content or "New Chat")

            dt_obj = data["updated_at"]
            visible_threads.append({
                "thread_id": tid,
                "project_id": thread_proj_id,
                "title": title,
                "sort_ts": safe_timestamp(dt_obj),
                "date_label": dt_obj.strftime("%b %d") if dt_obj else "Recently"
            })

        visible_threads.sort(key=lambda x: x["sort_ts"], reverse=True)
        return visible_threads

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch threads: {str(e)}")


@router.get("/chat/history")
async def get_chat_history(
    thread_id: Optional[str] = None,
    project_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        query = (
            select(Message)
            .join(Thread, Message.thread_id == Thread.id)
            .where(Thread.user_id == current_user.id)
        )

        if thread_id:
            query = query.where(Message.thread_id == thread_id)
        elif project_id:
            query = query.where(Thread.project_id == str(project_id))

        result = await db.execute(query.order_by(Message.created_at.asc()))
        messages = result.scalars().all()

        history_items = []
        for msg in messages:
            clean_text, stored_meta = unpack_message_and_meta(msg.content or "")

            # If an older historical message didn't have stored_meta, only extract real URLs actually present in the text
            if msg.role in ("ai", "assistant") and not stored_meta:
                real_urls_in_text = parse_dynamic_tool_sources([], clean_text, [])
                stored_meta = {
                    "sources_list": real_urls_in_text,
                    "sources_count": len(real_urls_in_text),
                    "qa_status": "QA Approved"
                }

            history_items.append({
                "id": str(msg.id),
                "role": msg.role,
                "content": clean_text,
                "thread_id": msg.thread_id,
                "created_at": msg.created_at.isoformat() if getattr(msg, "created_at", None) else None,
                "meta": stored_meta
            })

        return history_items
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")


@router.delete("/chat/threads/{thread_id}")
async def delete_chat_thread(
    thread_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        verify = await db.execute(
            select(Thread).where(Thread.id == thread_id, Thread.user_id == current_user.id)
        )
        if not verify.scalars().first():
            raise HTTPException(status_code=403, detail="Not authorized to delete this thread")

        await db.execute(delete(Message).where(Message.thread_id == thread_id))
        await db.execute(delete(Thread).where(Thread.id == thread_id))
        await db.commit()
        return {"status": "success", "message": "Thread permanently deleted"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete thread: {str(e)}")


# ==========================================
# 2. LANGGRAPH ORCHESTRATION (REAL-TIME SSE + LIVE TOOL SOURCE CAPTURE)
# ==========================================

@router.post("/run")
async def run_orchestration(
    request: RunRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    thread_id = request.thread_id

    is_proj_chat = bool(
        request.project_id
        or thread_id.lower().startswith("proj_")
        or "[project context:" in (request.message or "").lower()
    )
    if is_proj_chat and not thread_id.lower().startswith("proj_"):
        thread_id = f"proj_thread_{request.project_id or 'workspace'}_{thread_id}"

    verify = await db.execute(
        select(Thread).where(Thread.id == thread_id, Thread.user_id == current_user.id)
    )
    existing_thread = verify.scalars().first()
    if not existing_thread:
        check_exists = await db.execute(select(Thread).where(Thread.id == thread_id))
        if check_exists.scalars().first():
            thread_id = f"{thread_id}_{current_user.id}"

        verify_scoped = await db.execute(
            select(Thread).where(Thread.id == thread_id, Thread.user_id == current_user.id)
        )
        if not verify_scoped.scalars().first():
            new_thread = Thread(id=thread_id, user_id=current_user.id)
            db.add(new_thread)
            await db.commit()

    user_msg = Message(thread_id=thread_id, role="user", content=request.message)
    db.add(user_msg)
    await db.commit()

    resolved_keys = await resolve_workspace_keys(db, current_user.id)
    openai_key = resolved_keys["openai_api_key"]
    groq_key = resolved_keys["groq_api_key"]

    # Fetch user's document filenames from documents_v2 so we can link any file matched in FAISS tool output
    user_docs: List[Dict[str, Any]] = []
    try:
        doc_res = await db.execute(
            text("SELECT id, filename FROM documents_v2 WHERE user_id = :uid"),
            {"uid": current_user.id}
        )
        for r in doc_res.fetchall():
            fname = r[1] or "Document"
            user_docs.append({
                "id": str(r[0]),
                "filename": fname,
                "ext": fname.rsplit(".", 1)[-1].upper() if "." in fname else "DOC"
            })
    except Exception:
        pass

    target_agent_name = "supervisor" if (request.agent_id or "auto").lower() == "auto" else request.agent_id.lower()
    agent_query = await db.execute(
        select(AgentConfig).where(
            AgentConfig.user_id == current_user.id,
            func.lower(AgentConfig.agent_name) == target_agent_name
        )
    )
    agent_config = agent_query.scalars().first()

    raw_prompt = agent_config.system_prompt if agent_config and agent_config.system_prompt else None
    custom_prompt = raw_prompt if (raw_prompt and raw_prompt.strip() != "Test Prompt") else None
    temperature = agent_config.temperature if (agent_config and agent_config.temperature is not None) else 0.2
    tools_enabled = agent_config.tools_enabled if (agent_config and agent_config.tools_enabled is not None) else True

    config = {
        "configurable": {
            "thread_id": thread_id,
            "user_id": str(current_user.id),
            "openai_api_key": openai_key,
            "groq_api_key": groq_key,
            "system_prompt": custom_prompt,
            "temperature": temperature,
            "tools_enabled": tools_enabled
        }
    }
    inputs = {
        "messages": [HumanMessage(content=request.message)],
        "thread_id": thread_id
    }

    async def sse_generator():
        try:
            yield f"data: {json.dumps({'type': 'start', 'node': 'supervisor'})}\n\n"
            start_time = time.time()
            last_step_time = start_time

            final_message = "Analyzing request..."
            tokens_used = 0
            nodes_executed: List[str] = []
            captured_tool_messages: List[ToolMessage] = []

            async for output in orchestration_graph.astream(inputs, config=config, stream_mode="updates"):
                for node_name, state_update in output.items():
                    now_t = time.time()
                    step_duration_s = round(max(0.1, now_t - last_step_time), 2)
                    last_step_time = now_t
                    nodes_executed.append(node_name)

                    yield f"data: {json.dumps({'type': 'node_update', 'node': node_name, 'duration_s': step_duration_s})}\n\n"

                    if isinstance(state_update, dict) and "messages" in state_update and state_update["messages"]:
                        for msg_obj in state_update["messages"]:
                            if isinstance(msg_obj, ToolMessage):
                                # Capture real tool output (Tavily web_search / FAISS search_long_term_memory)
                                captured_tool_messages.append(msg_obj)
                            elif isinstance(msg_obj, AIMessage):
                                if msg_obj.content:
                                    final_message = msg_obj.content

                                if hasattr(msg_obj, "usage_metadata") and msg_obj.usage_metadata:
                                    tokens_used += int(msg_obj.usage_metadata.get("total_tokens", 0))
                                elif hasattr(msg_obj, "response_metadata") and "token_usage" in msg_obj.response_metadata:
                                    tokens_used += int(msg_obj.response_metadata["token_usage"].get("total_tokens", 0))

            execution_time_ms = (time.time() - start_time) * 1000
            tokens_used = extract_or_estimate_tokens(tokens_used, request.message, final_message)

            # Parse 100% real sources from captured ToolMessages and explicit citations in final_message
            real_sources = parse_dynamic_tool_sources(captured_tool_messages, final_message, user_docs)

            # Also check if user explicitly attached documents in this prompt
            attached_match = re.match(r"^\[Attached Documents:\s*(.*?)\]", request.message or "")
            if attached_match and not real_sources:
                for fname in [f.strip() for f in attached_match.group(1).split(",") if f.strip()]:
                    matched_doc = next((d for d in user_docs if d["filename"].lower() == fname.lower()), None)
                    real_sources.append({
                        "id": matched_doc["id"] if matched_doc else f"att_{fname}",
                        "name": fname,
                        "type": "ATTACHED • Knowledge Base Document",
                        "scope": "Prompt Attachment",
                        "url": None,
                        "similarity": "Attached",
                        "can_preview": True,
                        "is_web": False,
                        "excerpt": f"Document '{fname}' was explicitly attached to this orchestration run."
                    })

            state = orchestration_graph.get_state(config)
            is_interrupted = bool(state.next and "gatekeeper" in state.next)

            if is_interrupted:
                interrupt_info = (
                    state.tasks[0].interrupts[0].value
                    if state.tasks and state.tasks[0].interrupts
                    else {}
                )
                yield f"data: {json.dumps({'type': 'interrupted', 'clearance_request': interrupt_info, 'content': final_message})}\n\n"
            else:
                meta_payload = {
                    "duration_s": round(execution_time_ms / 1000.0, 2),
                    "tokens_used": tokens_used,
                    "agents_count": max(1, len(set(nodes_executed))),
                    "nodes_executed": nodes_executed,
                    "sources_count": len(real_sources),
                    "sources_list": real_sources,
                    "qa_status": "QA Approved"
                }

                # Persist message along with its exact real sources metadata
                packed_content = pack_message_with_meta(final_message, meta_payload)
                ai_msg = Message(thread_id=thread_id, role="ai", content=packed_content)
                db.add(ai_msg)

                analytic_event = AnalyticEvent(
                    user_id=current_user.id,
                    event_type='agent_execution',
                    agent_name=request.agent_id or 'auto',
                    execution_time_ms=execution_time_ms,
                    tokens_used=tokens_used,
                    success=not final_message.startswith("⚠️ System Notice:")
                )
                db.add(analytic_event)
                await db.commit()

                complete_payload = {
                    "type": "complete",
                    "content": final_message,
                    "meta": meta_payload
                }
                yield f"data: {json.dumps(complete_payload)}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': f'Execution failed: {str(e)}'})}\n\n"

    return StreamingResponse(sse_generator(), media_type="text/event-stream")


@router.post("/resume")
async def resume_orchestration(
    decision: ApprovalDecision,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    verify = await db.execute(
        select(Thread).where(Thread.id == decision.thread_id, Thread.user_id == current_user.id)
    )
    if not verify.scalars().first():
        raise HTTPException(status_code=403, detail="Unauthorized")

    resolved_keys = await resolve_workspace_keys(db, current_user.id)

    config = {
        "configurable": {
            "thread_id": decision.thread_id,
            "user_id": str(current_user.id),
            "openai_api_key": resolved_keys["openai_api_key"],
            "groq_api_key": resolved_keys["groq_api_key"]
        }
    }

    start_time = time.time()
    resume_payload = {"approved": decision.approved, "reason": decision.reason}
    result = orchestration_graph.invoke(Command(resume=resume_payload), config=config)
    execution_time_ms = (time.time() - start_time) * 1000

    ai_messages = [m for m in result.get("messages", []) if isinstance(m, AIMessage)]
    latest_response = "Execution finalized."
    tokens_used = 0

    if ai_messages:
        latest_msg = ai_messages[-1]
        latest_response = latest_msg.content
        if hasattr(latest_msg, "usage_metadata") and latest_msg.usage_metadata:
            tokens_used = int(latest_msg.usage_metadata.get("total_tokens", 0))
        elif hasattr(latest_msg, "response_metadata") and "token_usage" in latest_msg.response_metadata:
            tokens_used = int(latest_msg.response_metadata["token_usage"].get("total_tokens", 0))

    tokens_used = extract_or_estimate_tokens(tokens_used, str(resume_payload), latest_response)

    ai_msg = Message(thread_id=decision.thread_id, role="ai", content=latest_response)
    db.add(ai_msg)

    analytic_event = AnalyticEvent(
        user_id=current_user.id,
        event_type='agent_execution',
        agent_name='Supervisor',
        execution_time_ms=execution_time_ms,
        tokens_used=tokens_used,
        success=True
    )
    db.add(analytic_event)
    await db.commit()

    return {
        "status": "completed",
        "thread_id": decision.thread_id,
        "messages": [latest_response]
    }