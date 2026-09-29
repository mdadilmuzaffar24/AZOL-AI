import time
from prometheus_client import Counter, Histogram, CollectorRegistry

# Explicitly create a clean registry for our multi-process worker architecture
METRICS_REGISTRY = CollectorRegistry()

# 1. Track agent routing distributions
AGENT_ROUTE_COUNTER = Counter(
    "emaios_agent_routing_total",
    "Total number of times a specific agent node was routed to by the supervisor.",
    ["agent_name"],
    registry=METRICS_REGISTRY
)

# 2. Track execution duration of graph processing tasks
AGENT_LATENCY_HISTOGRAM = Histogram(
    "emaios_agent_execution_seconds",
    "Time spent executing worker node steps.",
    ["agent_name"],
    registry=METRICS_REGISTRY
)

# 3. Track execution stability within the coding sandbox environment
SANDBOX_EXECUTION_COUNTER = Counter(
    "emaios_sandbox_executions_total",
    "Track code sandbox execution outcomes.",
    ["status"],  # "success" or "failure"
    registry=METRICS_REGISTRY
)