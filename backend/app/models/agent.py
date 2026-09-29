from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.core.database import Base
import uuid

class AgentConfig(Base):
    __tablename__ = "agent_configs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # E.g., 'Supervisor', 'Analyst', 'Planner'
    agent_name = Column(String, nullable=False)
    
    # Custom instructions overriding the default
    system_prompt = Column(Text, nullable=True)
    
    # LLM settings
    temperature = Column(Float, default=0.7)
    
    # Can this agent access external tools/internet?
    tools_enabled = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())