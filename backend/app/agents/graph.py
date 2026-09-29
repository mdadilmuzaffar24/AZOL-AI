from langgraph.graph import StateGraph, START, END
from app.agents.state import OSState
from app.agents.nodes import (
    supervisor_node, researcher_node, planner_node, 
    analyst_node, reviewer_node, memory_node 
)

def route_supervisor(state: OSState):
    """Reads the Supervisor's decision and directs traffic to the correct specialist."""
    return state.get("next_node")

def route_reviewer(state: OSState):
    """The Reflection Router: Decides whether to approve the draft or send it back for revision."""
    # If the Reviewer approves it, or we hit our retry limit, end the graph execution
    if state.get("next_node") == "FINISH":
        return END
    
    # Otherwise, loop BACK to the agent that made the mistake
    return state.get("sender")

def human_approval_gate(state: OSState):
    """
    A dummy pass-through node for dangerous tasks. 
    Because 'Reviewer' is registered in tasks.py's interrupt_before list, 
    LangGraph will automatically freeze execution right BEFORE this node runs.
    """
    return {}

# 1. Initialize Graph
builder = StateGraph(OSState)

# 2. Add Nodes
builder.add_node("Supervisor", supervisor_node)
builder.add_node("Researcher", researcher_node)
builder.add_node("Planner", planner_node)
builder.add_node("Analyst", analyst_node)
builder.add_node("MemoryAgent", memory_node)

# We rename the actual evaluation function node to "QA_Audit" internally
builder.add_node("QA_Audit", reviewer_node)

# We assign the name "Reviewer" to the dummy gate so the Celery worker intercepts it!
builder.add_node("Reviewer", human_approval_gate)

# 3. Entry Point
builder.add_edge(START, "Supervisor")

# 4. Supervisor Routing
builder.add_conditional_edges(
    "Supervisor",
    route_supervisor,
    {
        "Researcher": "Researcher",
        "Planner": "Planner",
        "Analyst": "Analyst",
        "MemoryAgent": "MemoryAgent"
    }
)

# 5. SMART ROUTING (The Fix)
# ONLY dangerous agents route to the human approval gate
builder.add_edge("Analyst", "Reviewer")
builder.add_edge("MemoryAgent", "Reviewer")

# After approval, they proceed to the actual QA context check
builder.add_edge("Reviewer", "QA_Audit")

# Safe agents bypass the human gate entirely and go straight to QA context check
builder.add_edge("Researcher", "QA_Audit")
builder.add_edge("Planner", "QA_Audit")

# 6. REFLECTION LOOP: QA_Audit conditionally routes to END or loops back
builder.add_conditional_edges(
    "QA_Audit",
    route_reviewer,
    {
        "Researcher": "Researcher",
        "Planner": "Planner",
        "Analyst": "Analyst",
        "MemoryAgent": "MemoryAgent",
        END: END
    }
)