from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base 

class Document(Base):
    __tablename__ = "documents_v2"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True, nullable=False)
    size = Column(String, nullable=True)
    status = Column(String, default="processing")
    s3_path = Column(String, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Enforce strict data isolation: a document cannot exist without an owner
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)