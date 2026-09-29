import os
from celery import Celery
from dotenv import load_dotenv

# Force the isolated background process to read environment keys
load_dotenv()

# Connects to your existing emaios_redis container
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Initialize the Celery application and explicitly include the tasks module
celery_app = Celery(
    "enterprise_os_worker",
    broker=REDIS_URL,     
    backend=REDIS_URL,
    include=["app.agents.tasks"]  # Tells Celery where to find your AI tasks
)

# Enterprise configuration for task serialization
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    worker_prefetch_multiplier=1 
)