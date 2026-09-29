from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base
import uuid

class UserSetting(Base):
    __tablename__ = "user_settings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    # API Keys
    openai_api_key = Column(String, nullable=True)
    groq_api_key = Column(String, nullable=True)
    anthropic_api_key = Column(String, nullable=True)
    
    # UI Preferences
    theme = Column(String, default="dark")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())