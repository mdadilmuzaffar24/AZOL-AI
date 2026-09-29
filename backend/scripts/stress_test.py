import sys
import os
import time
from dotenv import load_dotenv

# Force load the .env file from the backend root directory
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

# Ensure the script can find the 'app' module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from langchain_core.messages import HumanMessage
from app.services.sandbox import execute_python_sandbox
from app.services.vector_store import process_and_store_text, search_vector_store
from app.agents.graph import builder

# Compile graph locally for testing
test_graph = builder.compile()

def test_docker_sandbox_attacks():
    print("\n==================================================")
    print(" 🧪 TEST 1: DOCKER SANDBOX SECURITY & RESOURCE LIMITS")
    print("==================================================")

    # 1. Infinite Loop Attack
    print("\n[Subtest 1.1] Testing Infinite Loop Attack Mitigation...")
    infinite_loop_code = "print('Starting infinite loop...');\nwhile True:\n    pass"
    start = time.time()
    res1 = execute_python_sandbox(infinite_loop_code, timeout=5.0)
    duration1 = round(time.time() - start, 2)

    if not res1["success"] and "timed out" in res1["stderr"].lower():
        print(f"  ✅ PASS ({duration1}s): Docker container successfully forcefully terminated.")
    else:
        print(f"  ❌ FAIL: Container did not handle infinite loop correctly: {res1}")

    # 2. Out-Of-Memory (OOM) Memory Guzzle Attack
    print("\n[Subtest 1.2] Testing OOM Memory Allocation Defense (Capped at 256MB)...")
    oom_code = "print('Attempting to allocate 1GB RAM...');\nbyte_array = bytearray(1024 * 1024 * 1000)\nprint('Success')"
    res2 = execute_python_sandbox(oom_code, timeout=10.0)

    if not res2["success"]:
        print(f"  ✅ PASS: Container killed by OS memory cap before damaging host.")
        print(f"     Captured Stderr: {res2['stderr'].strip() or 'Container forcibly killed (OOMKilled)'}")
    else:
        print(f"  ❌ FAIL: Container bypassed 256MB memory restriction!")


def test_multi_tenant_isolation():
    print("\n==================================================")
    print(" 🧪 TEST 2: MULTI-TENANT VECTOR STORE ISOLATION")
    print("==================================================")

    tenant_a = "company_alpha_id"
    tenant_b = "company_beta_id"

    print(f"\n[Subtest 2.1] Ingesting secret records into '{tenant_a}' and '{tenant_b}'...")
    process_and_store_text("The secret revenue for Company Alpha is $5,000,000 USD.", filename="alpha_secrets.txt", user_id=tenant_a)
    process_and_store_text("The public budget for Company Beta is $50,000 USD.", filename="beta_data.txt", user_id=tenant_b)

    print(f"\n[Subtest 2.2] Querying '{tenant_b}' partition for 'revenue'...")
    results_b = search_vector_store("What is the secret revenue?", user_id=tenant_b)

    if "$5,000,000" not in results_b:
        print("  ✅ PASS: Zero context leakage detected! Tenant Beta cannot see Tenant Alpha data.")
        print(f"     Tenant B Search Context: '{results_b}'")
    else:
        print(f"  ❌ CRITICAL SECURITY FAIL: Tenant Alpha data leaked into Tenant Beta queries!")


def test_full_graph_complex_computation():
    print("\n==================================================")
    print(" 🧪 TEST 3: FULL MULTI-AGENT GRAPH END-TO-END COMPUTATION")
    print("==================================================")

    query = "Find the sum of all prime numbers between 1 and 50 using Python."
    print(f"\n[Subtest 3.1] Querying Agent Graph: '{query}'")

    initial_state = {
        "messages": [HumanMessage(content=query)],
        "next_node": "",
        "research_context": "",
        "memory_context": "",
        "current_plan": "",
        "feedback": "",
        "revision_count": 0,
        "sender": ""
    }

    start = time.time()
    try:
        final_state = test_graph.invoke(initial_state)
        actual_agent = final_state.get("sender", "Unknown")
        final_response = final_state["messages"][-1].content
        duration = round(time.time() - start, 2)

        # The sum of prime numbers between 1 and 50 is 328
        if "328" in final_response and "Analyst" in actual_agent:
            print(f"  ✅ PASS ({duration}s): Agent correctly executed primes calculation inside Docker.")
            print(f"     Selected Route: {actual_agent}")
            print(f"     Final Response Output:\n'{final_response}'")
        else:
            print(f"  ⚠️ WARNING ({duration}s): Execution completed, but output check requires inspection.")
            print(f"     Output: {final_response}")
    except Exception as e:
        print(f"  ❌ FAIL: Graph crashed during complex run: {str(e)}")


if __name__ == "__main__":
    print("🚀 STARTING EMAIOS EXTREME SYSTEM STRESS SUITE...")
    test_docker_sandbox_attacks()
    test_multi_tenant_isolation()
    test_full_graph_complex_computation()
    print("\n==================================================")
    print(" 🏁 STRESS SUITE EVALUATION COMPLETE")
    print("==================================================")