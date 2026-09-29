import os
import redis
from dotenv import load_dotenv
from celery import shared_task
from langchain_core.messages import HumanMessage
from app.agents.graph import builder
from langgraph.checkpoint.postgres import PostgresSaver

# 1. Force Celery to load environment variables from the .env file!
load_dotenv()

@shared_task(bind=True)
def run_agent_task(
    self, 
    message: str, 
    thread_id: str = None, 
    action: str = "start",
    agent_override: str = "auto",
    attachments: list = None
):
    """
    Executes the LangGraph network with Human-in-the-Loop (HITL) Checkpointing.
    Streams live node execution telemetry to Redis via Pub/Sub.
    """
    if attachments is None:
        attachments = []

    active_thread_id = thread_id or self.request.id
    config = {"configurable": {"thread_id": active_thread_id}}
    
    # 2. Get the DB URL
    fallback_url = "postgresql://admin:admin_password@127.0.0.1:5432/emaios_db"
    raw_db_url = os.getenv("DATABASE_URL", fallback_url)
    sync_db_url = raw_db_url.replace("+asyncpg", "")
    
    # 3. Setup Synchronous Redis Client for Telemetry Broadcasting
    redis_url = os.getenv("CELERY_BROKER_URL", "redis://127.0.0.1:6379/0")
    redis_client = redis.Redis.from_url(redis_url)
    telemetry_channel = f"telemetry_{self.request.id}"
    
    # Announce that the engine has spun up
    redis_client.publish(telemetry_channel, "STARTING")
    
    with PostgresSaver.from_conn_string(sync_db_url) as checkpointer:
        checkpointer.setup() 
        
        agent_graph = builder.compile(
            checkpointer=checkpointer,
            interrupt_before=["Reviewer"]
        )
        
        # 4. Stream the Graph execution to capture live node transitions
        if action == "start":
            initial_state = {
                "messages": [HumanMessage(content=message)],
                "next_node": agent_override if agent_override != "auto" else "",
                "research_context": "",
                "current_plan": ""
            }
            
            # Using .stream() instead of .invoke() lets us see each node as it finishes!
            for event in agent_graph.stream(initial_state, config=config):
                for node_name in event.keys():
                    # Broadcast the active node name to FastAPI!
                    redis_client.publish(telemetry_channel, node_name)
                    print(f"[TELEMETRY] Broadcasted active node: {node_name}")
            
        elif action == "resume":
            redis_client.publish(telemetry_channel, "RESUMING")
            for event in agent_graph.stream(None, config=config):
                for node_name in event.keys():
                    redis_client.publish(telemetry_channel, node_name)
            
        # 5. Evaluate the final state
        state = agent_graph.get_state(config)
        
        if state.next:
            # Paused for HITL
            redis_client.publish(telemetry_channel, "PAUSED")
            return {
                "status": "paused_for_human",
                "thread_id": active_thread_id,
                "pending_node": state.next[0],
                "message": f"Graph execution frozen. Waiting for human approval to proceed to '{state.next[0]}'."
            }
        else:
            # Execution finished
            redis_client.publish(telemetry_channel, "FINISH")
            final_message = state.values["messages"][-1].content
            return {
                "status": "success",
                "thread_id": active_thread_id,
                "response": final_message
            }