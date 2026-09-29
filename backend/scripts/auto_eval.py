import sys
import os
import time
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv

# Force load the .env file from the backend root directory
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

# Ensure the script can find the 'app' module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.agents.graph import builder

# Compile the graph locally for synchronous testing (bypassing Celery)
test_graph = builder.compile()

# Define our rigorous test suite
TEST_CASES = [
    {
        "name": "Math & Sandbox Execution",
        "query": "Calculate 15 multiplied by 4.",
        "expected_agent": "Analyst",
        "expected_keyword": "60"
    },
    {
        "name": "General Planning",
        "query": "Write a 1-sentence greeting.",
        "expected_agent": "Planner",
        "expected_keyword": "" # Just checking routing
    }
]

def run_evaluations():
    print(f"--- STARTING EMAIOS AUTOMATED EVALUATION SUITE ---")
    score = 0
    
    for i, test in enumerate(TEST_CASES):
        print(f"\n[Test {i+1}] {test['name']}")
        print(f"Query: '{test['query']}'")
        
        # Initialize test state
        initial_state = {
            "messages": [HumanMessage(content=test["query"])],
            "next_node": "",
            "research_context": "",
            "memory_context": "",
            "current_plan": "",
            "feedback": "",
            "revision_count": 0,
            "sender": ""
        }
        
        start_time = time.time()
        
        try:
            # Run the graph synchronously
            final_state = test_graph.invoke(initial_state)
            
            # Extract results
            actual_agent = final_state.get("sender", "Unknown")
            final_response = final_state["messages"][-1].content
            
            duration = round(time.time() - start_time, 2)
            
            # Grading Logic
            passed_routing = test["expected_agent"].lower() in actual_agent.lower()
            passed_content = test["expected_keyword"].lower() in final_response.lower() if test["expected_keyword"] else True
            
            if passed_routing and passed_content:
                print(f"✅ PASS ({duration}s)")
                score += 1
            else:
                print(f"❌ FAIL ({duration}s)")
                print(f"   Expected Agent: {test['expected_agent']} | Got: {actual_agent}")
                print(f"   Response Output: {final_response}")
                
        except Exception as e:
            print(f"❌ CRITICAL GRAPH ERROR: {str(e)}")

    print(f"\n--- EVALUATION COMPLETE: {score}/{len(TEST_CASES)} PASSED ---")

if __name__ == "__main__":
    run_evaluations()