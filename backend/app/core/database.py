from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# Create the async engine
engine = create_async_engine(
    settings.DATABASE_URL, 
    echo=True, # Prints SQL queries to the terminal (good for development)
    future=True
)

# Create an async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base class for our future SQLAlchemy models (like Users, Tasks)
Base = declarative_base()

# Dependency injection function to get the DB session in our API routes
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session