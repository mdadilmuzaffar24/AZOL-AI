from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

class Project(Base):
    __tablename__ = "projects"

    # Using UUIDs for secure, unguessable project links
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="ACTIVE") # Added to map to AZOL AI frontend
    
    # CRITICAL: Tie the project to the specific user for data isolation
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # --- V1 Persistent Fields (Fixed task/memory persistence bug) ---
    memory = Column(Text, default="")
    tasks = Column(JSONB, default=list)
    assigned_agents = Column(JSONB, default=list)
    recent_outputs = Column(JSONB, default=list)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Establish relationships so deleting a project deletes its associated chat threads
    threads = relationship("Thread", back_populates="project", cascade="all, delete")