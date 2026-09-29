import asyncio
from app.core.database import engine, Base

# Import all models so SQLAlchemy knows exactly what to drop
from app.models.user import User
from app.models.chat import Thread, Message
from app.models.document import Document
from app.models.project import Project
from app.models.agent import AgentConfig
from app.models.analytics import AnalyticEvent
from app.models.user_setting import UserSetting

async def reset_database():
    async with engine.begin() as conn:
        print("Dropping existing tables...")
        await conn.run_sync(Base.metadata.drop_all)
        print("Database wiped clean! Restart FastAPI to rebuild Phase 1 Core Architecture.")

if __name__ == "__main__":
    asyncio.run(reset_database())