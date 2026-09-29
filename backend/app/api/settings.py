import os
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.user_setting import UserSetting

router = APIRouter()


class SettingsUpdate(BaseModel):
    openai_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    theme: Optional[str] = None


class SettingsResponse(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = "Admin"
    has_openai_key: bool
    has_groq_key: bool
    has_anthropic_key: bool
    theme: str

    class Config:
        from_attributes = True


def is_valid_secret_input(val: Optional[str]) -> bool:
    """Rejects empty strings, masked bullets, or placeholder hints so real keys are never overwritten."""
    if not val or not isinstance(val, str):
        return False
    cleaned = val.strip()
    if len(cleaned) < 12:
        return False
    invalid_markers = ["••", "(configured)", "gsk_...", "sk-ant-...", "sk-..."]
    if any(marker in cleaned.lower() for marker in invalid_markers):
        return False
    return True


@router.get("", response_model=SettingsResponse)
@router.get("/", response_model=SettingsResponse)
async def get_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Fetches user settings and safely indicates which API keys are configured across DB or .env."""
    result = await db.execute(select(UserSetting).where(UserSetting.user_id == current_user.id))
    settings = result.scalars().first()

    # Also check if a workspace-wide admin key or .env key is available
    admin_result = await db.execute(select(UserSetting).order_by(UserSetting.id.asc()))
    all_rows = admin_result.scalars().all()

    has_openai = bool(
        (settings and is_valid_secret_input(settings.openai_api_key))
        or any(is_valid_secret_input(r.openai_api_key) for r in all_rows)
        or is_valid_secret_input(os.getenv("OPENAI_API_KEY"))
        or is_valid_secret_input(os.getenv("OPENROUTER_API_KEY"))
    )
    has_groq = bool(
        (settings and is_valid_secret_input(settings.groq_api_key))
        or any(is_valid_secret_input(r.groq_api_key) for r in all_rows)
        or is_valid_secret_input(os.getenv("GROQ_API_KEY"))
    )
    has_anthropic = bool(
        (settings and is_valid_secret_input(settings.anthropic_api_key))
        or any(is_valid_secret_input(r.anthropic_api_key) for r in all_rows)
        or is_valid_secret_input(os.getenv("ANTHROPIC_API_KEY"))
    )

    return SettingsResponse(
        email=getattr(current_user, "email", "admin@enterprise.com"),
        role=getattr(current_user, "role", None) or "Admin",
        has_openai_key=has_openai,
        has_groq_key=has_groq,
        has_anthropic_key=has_anthropic,
        theme=(settings.theme if settings and settings.theme else "Dark Mode (Default)")
    )


@router.post("")
@router.post("/")
async def update_settings(
    settings_in: SettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Updates the user's API keys and preferences without overwriting existing keys with empty strings."""
    result = await db.execute(select(UserSetting).where(UserSetting.user_id == current_user.id))
    existing_settings = result.scalars().first()

    if existing_settings:
        if is_valid_secret_input(settings_in.openai_api_key):
            existing_settings.openai_api_key = settings_in.openai_api_key.strip()
        if is_valid_secret_input(settings_in.groq_api_key):
            existing_settings.groq_api_key = settings_in.groq_api_key.strip()
        if is_valid_secret_input(settings_in.anthropic_api_key):
            existing_settings.anthropic_api_key = settings_in.anthropic_api_key.strip()
        if settings_in.theme is not None and settings_in.theme.strip():
            existing_settings.theme = settings_in.theme.strip()
    else:
        new_settings = UserSetting(
            user_id=current_user.id,
            openai_api_key=settings_in.openai_api_key.strip() if is_valid_secret_input(settings_in.openai_api_key) else None,
            groq_api_key=settings_in.groq_api_key.strip() if is_valid_secret_input(settings_in.groq_api_key) else None,
            anthropic_api_key=settings_in.anthropic_api_key.strip() if is_valid_secret_input(settings_in.anthropic_api_key) else None,
            theme=settings_in.theme.strip() if (settings_in.theme and settings_in.theme.strip()) else "Dark Mode (Default)"
        )
        db.add(new_settings)

    await db.commit()
    return {"status": "success", "message": "Settings updated securely."}