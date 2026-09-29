import asyncio
from sqlalchemy import text
from app.core.database import engine

async def upgrade_table():
    try:
        async with engine.begin() as conn:
            # This safely injects the missing column into your existing PostgreSQL table
            await conn.execute(text("ALTER TABLE projects ADD COLUMN status VARCHAR DEFAULT 'ACTIVE';"))
        print("✅ SUCCESS: The 'status' column has been added to the projects table!")
    except Exception as e:
        print(f"⚠️ Notice: {str(e)}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(upgrade_table())