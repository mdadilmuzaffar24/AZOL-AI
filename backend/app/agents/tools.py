from langchain_core.tools import tool, Tool
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_core.runnables.config import RunnableConfig
from app.services.vector_store import search_vector_store, process_and_store_text

# ==========================================
# 1. WEB SEARCH TOOL
# ==========================================
search = DuckDuckGoSearchRun()

web_search_tool = Tool(
    name="web_search",
    description="Useful for searching the internet for real-time information, recent events, or facts you do not know. Input should be a specific search query.",
    func=search.invoke,
)

# ==========================================
# 2. LONG-TERM MEMORY (RAG) TOOLS
# ==========================================
@tool
def search_long_term_memory(query: str, config: RunnableConfig) -> str:
    """
    Use this tool to search the system's long-term memory for past facts, 
    documents, or historical context.
    """
    # Securely extract the user_id injected by the FastAPI orchestrator
    user_id = config.get("configurable", {}).get("user_id", "default_user")
    
    context = search_vector_store(query=query, user_id=user_id)
    
    if not context or "No documents have been ingested yet" in context:
        return "No relevant information found in long-term memory for this account."
    
    return f"Found the following historical context:\n{context}"

@tool
def memorize_fact(fact: str, config: RunnableConfig) -> str:
    """
    Use this tool to permanently save an important fact, preference, 
    or summary into the system's long-term memory for future use.
    """
    # Securely extract the user_id injected by the FastAPI orchestrator
    user_id = config.get("configurable", {}).get("user_id", "default_user")
    
    chunks_added = process_and_store_text(text=fact, filename="memorized_facts.txt", user_id=user_id)
    
    if chunks_added > 0:
        return f"Fact successfully committed to permanent memory."
    return "Failed to save fact to memory."

# ==========================================
# 3. TOOLKIT EXPORT
# ==========================================
AVAILABLE_TOOLS = [web_search_tool, search_long_term_memory, memorize_fact]