from fastapi import APIRouter, Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from app.core.telemetry import METRICS_REGISTRY

router = APIRouter(prefix="/metrics", tags=["Telemetry"])

@router.get("/")
def get_metrics():
    """
    Exposes system and multi-agent execution metrics in standard Prometheus format.
    Scraped every 15 seconds by the Prometheus monitoring engine.
    """
    # Generate the raw text format required by Prometheus
    metrics_data = generate_latest(METRICS_REGISTRY)
    
    return Response(content=metrics_data, media_type=CONTENT_TYPE_LATEST)