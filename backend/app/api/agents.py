from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, ConfigDict
from typing import List, Optional

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.agent import AgentConfig

router = APIRouter()

class AgentConfigUpdate(BaseModel):
    agent_name: str
    system_prompt: Optional[str] = None
    temperature: Optional[float] = 0.7
    tools_enabled: Optional[bool] = True

class AgentConfigResponse(AgentConfigUpdate):
    id: str
    
    # Updated to Pydantic V2 syntax to prevent deprecation warnings
    model_config = ConfigDict(from_attributes=True)

@router.get("/config", response_model=List[AgentConfigResponse])
async def get_agent_configs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Fetches all custom agent configurations for the current operator."""
    result = await db.execute(
        select(AgentConfig).where(AgentConfig.user_id == current_user.id)
    )
    return result.scalars().all()

@router.post("/config", response_model=AgentConfigResponse)
async def update_agent_config(
    config_in: AgentConfigUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Updates or creates a custom configuration for a specific agent."""
    result = await db.execute(
        select(AgentConfig).where(
            AgentConfig.user_id == current_user.id,
            AgentConfig.agent_name == config_in.agent_name
        )
    )
    existing_config = result.scalars().first()

    if existing_config:
        existing_config.system_prompt = config_in.system_prompt
        existing_config.temperature = config_in.temperature
        existing_config.tools_enabled = config_in.tools_enabled
        await db.commit()
        await db.refresh(existing_config)
        return existing_config
    else:
        new_config = AgentConfig(
            user_id=current_user.id,
            agent_name=config_in.agent_name,
            system_prompt=config_in.system_prompt,
            temperature=config_in.temperature,
            tools_enabled=config_in.tools_enabled
        )
        db.add(new_config)
        await db.commit()
        await db.refresh(new_config)
        return new_config