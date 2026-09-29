import json
import time
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from app.core.llm import get_llm_client
from app.services.vector_store import search_vector_store
from app.agents.state import OSState
from langchain_community.tools import DuckDuckGoSearchRun
from app.agents.tools import search_long_term_memory, memorize_fact
from app.services.sandbox import execute_python_sandbox
from app.core.telemetry import AGENT_ROUTE_COUNTER, AGENT_LATENCY_HISTOGRAM, SANDBOX_EXECUTION_COUNTER

# ---------------------------------------------------------
# STRUCTURED DATA MODEL FOR NATIVE MEMORY RETRIEVAL
# ---------------------------------------------------------
class MemoryAction:
    @staticmethod
    def parse(raw_text: str) -> dict:
        clean_json = raw_text.strip().strip("`").removeprefix("json\n").removeprefix("json")
        return json.loads(clean_json)

# ---------------------------------------------------------
# CORE NODES WITH OPEN-BOOK & REFLECTION SYSTEM STATE
# ---------------------------------------------------------

def supervisor_node(state: OSState) -> dict:
    """Bulletproof intent parser routing directly to specialized agents."""
    
    # --- NEW UI OVERRIDE LOGIC ---
    # If the user explicitly selected a specialist in the UI dropdown, respect it!
    override = state.get("next_node", "")
    if override and override.lower() != "auto":
        # Map the frontend ID directly to the exact Graph Node name
        node_map = {
            "researcher": "Researcher",
            "analyst": "Analyst",
            "reviewer": "Reviewer"
        }
        target_node = node_map.get(override.lower(), "Planner")
        print(f"\n[SUPERVISOR LOG] UI Override Active! Bypassing LLM -> Routing straight to {target_node.upper()}")
        return {"next_node": target_node, "feedback": "", "revision_count": 0}
    # -----------------------------

    messages = state.get("messages", [])
    
    system_prompt = """You are the Supervisor of an Enterprise AI OS.
    Route the user's latest request to the correct specialist agent.
    
    Available Agents:
    - "Researcher": Document parsing, PDF reading, or looking up live web facts.
    - "Analyst": Computing mathematical equations, handling statistics, or Pandas workflows.
    - "Planner": Creative writing, generic programming, text formatting, and general tasks.
    - "MemoryAgent": Storing, remembering, archiving, or retrieving facts from long-term memory.
    
    Respond with ONLY the exact name of the agent. No other text.
    """
    
    llm = get_llm_client(temperature=0.0)
    response = llm.invoke([SystemMessage(content=system_prompt)] + list(messages))
    decision = response.content.lower()
    
    if "memory" in decision:
        node = "MemoryAgent"
    elif "research" in decision:
        node = "Researcher"
    elif "analyst" in decision:
        node = "Analyst"
    else:
        node = "Planner"
        
    print(f"\n[SUPERVISOR LOG] Selected Route: {node.upper()}")
    return {"next_node": node, "feedback": "", "revision_count": 0}

def memory_node(state: OSState) -> dict:
    """Enforces explicit database tools, populates memory contexts, and processes self-corrections."""
    messages = state.get("messages", [])
    feedback = state.get("feedback", "")
    revision_count = state.get("revision_count", 0)
    
    llm = get_llm_client(temperature=0.0)
    
    # Check if this agent is in a reflection loop self-correcting an error
    feedback_instruction = ""
    if feedback:
        print(f"[REFLECTION LOOP LOG] MemoryAgent adjusting to QA Feedback (Attempt {revision_count})")
        feedback_instruction = f"\n\nCRITICAL: Your previous response was rejected by the QA Reviewer. Error: '{feedback}'. Fix this mistake completely in your next response."

    instruction = SystemMessage(
        content="You are the Memory Agent. You must respond with ONLY a raw JSON object. No conversation."
                "Determine if the user wants to memorize a fact or search for one. "
                "Schema: {\"action\": \"memorize\" or \"search\", \"payload\": \"the exact fact or query\"}" + feedback_instruction
    )
    
    try:
        raw_response = llm.invoke([instruction] + list(messages)).content
        decision = MemoryAction.parse(raw_response)
        action = decision.get("action", "").lower()
        payload = decision.get("payload", "")
        
        if action == "memorize":
            raw_tool_output = memorize_fact.invoke({"fact": payload})
            sys_msg = f"The database committed the data: {raw_tool_output}. Confirm execution to the user."
        else:
            raw_tool_output = search_long_term_memory.invoke({"query": payload})
            sys_msg = (f"The database returned this ground-truth text:\n<db_context>{raw_tool_output}</db_context>\n"
                       f"Synthesize an answer. Rely EXCLUSIVELY on the data inside <db_context>. Do not guess or modify facts.")
            
        final_ai_msg = llm.invoke(list(messages) + [SystemMessage(content=sys_msg)])
        
        # Open Book: Share raw tool output with the Reviewer, tag sender identity
        return {
            "messages": [final_ai_msg],
            "memory_context": raw_tool_output,
            "sender": "MemoryAgent"
        }
        
    except Exception as e:
        return {"messages": [AIMessage(content=f"[SYSTEM ERROR IN MEMORY NODE]: {str(e)}")]}

def researcher_node(state: OSState) -> dict:
    messages = state.get("messages", [])
    user_question = next((m.content for m in reversed(messages) if isinstance(m, HumanMessage)), "")
    
    faiss_context = search_vector_store(user_question, k=10)
    ddg = DuckDuckGoSearchRun()
    try:
        web_context = ddg.invoke(user_question)
    except Exception as e:
        web_context = f"Web search timeout: {str(e)}"
    
    prompt = f"Expert Assistant. Ground your answer solely in these contexts:\nFAISS:\n{faiss_context}\nWEB:\n{web_context}"
    llm = get_llm_client(temperature=0.1)
    response = llm.invoke([SystemMessage(content=prompt), messages[-1]])
    
    return {
        "messages": [response],
        "research_context": f"FAISS: {faiss_context[:500]} | WEB: {web_context[:500]}",
        "sender": "Researcher"
    }

def planner_node(state: OSState) -> dict:
    messages = state.get("messages", [])
    llm = get_llm_client(temperature=0.7)
    response = llm.invoke([SystemMessage(content="General purpose planner assistant.")] + list(messages))
    return {"messages": [response], "sender": "Planner"}

def analyst_node(state: OSState) -> dict:
    """
    High-precision analytical node. Writes raw Python code, executes it inside 
    the secure subprocess sandbox, and answers using the script's stdout results.
    """
    # 1. Telemetry Trackers: Begin tracking route metric and capture invocation timestamp
    start_time = time.time()
    AGENT_ROUTE_COUNTER.labels(agent_name="Analyst").inc()
    
    messages = state.get("messages", [])
    feedback = state.get("feedback", "")
    revision_count = state.get("revision_count", 0)
    
    llm = get_llm_client(temperature=0.0)
    
    # Adapt to QA Reviewer feedback if caught in a self-correction loop
    feedback_instruction = ""
    if feedback:
        print(f"[REFLECTION LOOP LOG] Analyst Agent adjusting to QA Feedback (Attempt {revision_count})")
        feedback_instruction = f"\n\nCRITICAL: Your previous response was rejected by the QA Reviewer. Error: '{feedback}'. Correct the code logic or output context accordingly."

    instruction = SystemMessage(
        content="You are the Analyst Agent. You handle complex mathematical calculations, data analysis, and coding tasks. "
                "You must respond with ONLY a raw JSON object containing the fields 'reasoning' and 'code'. No conversation or markdown wrapping. "
                "Write valid, executable Python code that prints the final answer to stdout using print(). "
                "Schema: {\"reasoning\": \"steps to solve\", \"code\": \"raw python code script string\"}" + feedback_instruction
    )
    
    try:
        raw_response = llm.invoke([instruction] + list(messages)).content
        
        # Clean potential markdown wrappers
        clean_json = raw_response.strip().strip("`").removeprefix("json\n").removeprefix("json")
        decision = json.loads(clean_json)
        
        code_script = decision.get("code", "")
        reasoning = decision.get("reasoning", "")
        
        print(f"\n[ANALYST LOG] Reasoning: {reasoning}")
        print(f"[ANALYST LOG] Executing Sandboxed Code:\n{code_script}\n")
        
        # Dispatch code execution to the secure sandbox service
        sandbox_result = execute_python_sandbox(code_script, timeout=5.0)
        
        if not sandbox_result["success"]:
            # Increment sandbox execution error telemetry metric
            SANDBOX_EXECUTION_COUNTER.labels(status="failure").inc()
            print(f"[SANDBOX EXECUTOR ERROR] Stderr: {sandbox_result['stderr']}")
            sys_msg = f"The code execution failed with error:\n{sandbox_result['stderr']}\nExplain this error clearly to the user."
            raw_context = f"EXECUTION FAILED: {sandbox_result['stderr']}"
        else:
            # Increment sandbox execution success telemetry metric
            SANDBOX_EXECUTION_COUNTER.labels(status="success").inc()
            print(f"[SANDBOX EXECUTOR SUCCESS] Stdout: {sandbox_result['stdout']}")
            sys_msg = (f"The code executed successfully. Standard Output (stdout):\n{sandbox_result['stdout']}\n"
                       f"Formulate a precise final response matching the user query based strictly on this output. "
                       f"CRITICAL FORMATTING RULE: Do NOT use LaTeX math delimiters like \\( \\) or symbols like \\times. "
                       f"Use ONLY clean plain text and standard Markdown bolding (e.g., **4,270**) or basic math symbols (e.g., * or x).")
            raw_context = sandbox_result['stdout']
            
        final_ai_msg = llm.invoke(list(messages) + [SystemMessage(content=sys_msg)])
        
        # --- NEW ARTIFACT INJECTION ---
        # Seamlessly bundle the generated code as an XML artifact for the UI to parse
        if code_script:
            artifact_xml = f"\n\n<artifact type=\"python\" title=\"Analyst_Execution_Script.py\">\n{code_script}\n</artifact>"
            final_ai_msg.content += artifact_xml
        # ------------------------------
        
        # 2. Latency Telemetry: Measure and record total node execution timeframe
        duration = time.time() - start_time
        AGENT_LATENCY_HISTOGRAM.labels(agent_name="Analyst").observe(duration)
        
        # Share raw sandbox context for the Open-Book QA Reviewer to cross-verify
        return {
            "messages": [final_ai_msg],
            "research_context": f"SANDBOX STDOUT: {raw_context}",
            "sender": "Analyst"
        }
        
    except Exception as e:
        # Record latency metrics even if an unhandled pipeline error occurs
        duration = time.time() - start_time
        AGENT_LATENCY_HISTOGRAM.labels(agent_name="Analyst").observe(duration)
        
        error_msg = f"[SYSTEM ERROR IN ANALYST NODE]: {str(e)}"
        print(error_msg)
        return {"messages": [AIMessage(content=error_msg)]}

def reviewer_node(state: OSState) -> dict:
    """The Open-Book Self-Healing QA Guard. Evaluates drafts against ground-truth context data streams."""
    messages = state.get("messages", [])
    memory_context = state.get("memory_context", "")
    research_context = state.get("research_context", "")
    revision_count = state.get("revision_count", 0)
    sender = state.get("sender", "")
    
    original_query = next((msg.content for msg in reversed(messages) if isinstance(msg, HumanMessage)), "Unknown Query")
    draft_response = messages[-1].content
    
    # Assemble the active open-book grounding data stream
    active_context = memory_context if sender == "MemoryAgent" else research_context
    
    # If the user is just using the generic Planner, bypass context validation checks
    if not active_context or sender == "Planner":
        print("[QA AUDIT LOG] No target database context active. Proceeding to formatting verification.")
        return {"next_node": "FINISH"}
        
    system_prompt = f"""You are the Enterprise QA Reviewer. 
    You are verifying a draft created by the '{sender}'.
    
    Your job is to compare the Draft Response against the Ground-Truth Context extracted from our databases.
    
    GROUND-TRUTH DATA:
    {active_context}
    
    Verify that the draft does not hallucinate names, metrics, parameters, or colors. 
    If the Draft Response matches the Ground-Truth Data perfectly, reply with exactly one word: APPROVED
    If there is a factual error, mismatch, or hallucination, respond with a direct critique starting with: REJECTED: [detail the exact modification needed]
    """
    
    llm = get_llm_client(temperature=0.0)
    review_output = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content=f"Query: {original_query}\nDraft: {draft_response}")]).content
    
    print(f"[QA AUDIT LOG] Evaluation result for {sender}: '{review_output.strip()}'")
    
    if "APPROVED" in review_output and "[SYSTEM ERROR" not in draft_response:
        return {"next_node": "FINISH"}
    
    # If rejected and we have retries remaining, kick off a reflection loop cycle
    if revision_count < 2:
        print(f"[QA ALERT] Hallucination caught! Routing work back to {sender} for dynamic revision.")
        return {
            "feedback": review_output.replace("REJECTED:", "").strip(),
            "next_node": sender,  # Diverges path to agent node
            "revision_count": revision_count + 1
        }
        
    # Hard fallback to prevent infinite graph loop processing
    print("[QA WARNING] Maximum loop threshold met. Finalizing response to maintain system stability.")
    return {"next_node": "FINISH"}