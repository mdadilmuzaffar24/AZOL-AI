from typing import Annotated, TypedDict, Sequence
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class OSState(TypedDict):
    # Core Data
    messages: Annotated[Sequence[BaseMessage], add_messages]
    next_node: str
    research_context: str
    current_plan: str
    
    # --- NEW: OPEN BOOK & REFLECTION FIELDS ---
    memory_context: str       # Stores raw DB output for the QA Reviewer to read
    feedback: str             # Stores the Reviewer's critique if an agent makes a mistake
    revision_count: int       # Tracks the loop count (e.g., max 2 retries) to prevent infinite loops
    sender: str               # Remembers which agent sent the draft so the Reviewer knows who to route back to