from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base
import uuid

class AnalyticEvent(Base):
    __tablename__ = "analytic_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # E.g., 'agent_execution', 'document_upload', 'tool_call'
    event_type = Column(String, nullable=False, index=True)
    
    # Which agent performed the action (if applicable)
    agent_name = Column(String, nullable=True)
    
    # Performance metrics
    execution_time_ms = Column(Float, nullable=True)
    tokens_used = Column(Integer, default=0)
    success = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)