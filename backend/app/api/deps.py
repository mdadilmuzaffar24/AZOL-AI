from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User

# auto_error=False allows falling back cleanly to the HttpOnly cookie if no Authorization header is sent
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
    header_token: Optional[str] = Depends(oauth2_scheme)
) -> User:
    """
    Validates the operator's session via HttpOnly Cookie OR Bearer Header:
    1. Extracts token from HttpOnly cookie ('azol_session') or Authorization header.
    2. Checks PostgreSQL 'auth_revoked_tokens' table to ensure the session hasn't been logged out.
    3. Verifies the user exists and is_active=True (email verified).
    """
    cookie_token = request.cookies.get("azol_session")
    token = header_token if (header_token and header_token not in ("null", "undefined", "")) else cookie_token

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session expired or invalid. Please sign in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        raise credentials_exception

    # 1. Check if this JWT was invalidated via Logout
    try:
        rev_res = await db.execute(
            text("SELECT 1 FROM auth_revoked_tokens WHERE token = :tok LIMIT 1"),
            {"tok": token}
        )
        if rev_res.fetchone():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has been logged out. Please sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except HTTPException:
        raise
    except Exception:
        # Table may not be initialized yet on very first boot
        pass

    # 2. Decode & Verify JWT Signature and Expiration
    try:
        secret_key = getattr(settings, "SECRET_KEY", "super-secret-enterprise-key-change-in-production")
        algorithm = getattr(settings, "ALGORITHM", "HS256")
        payload = jwt.decode(token, secret_key, algorithms=[algorithm])
        user_id_raw = payload.get("sub")
        if user_id_raw is None:
            raise credentials_exception
        user_id = int(user_id_raw)
    except (JWTError, ValueError, TypeError):
        raise credentials_exception

    # 3. Fetch User from PostgreSQL & Enforce Email Verification (is_active == True)
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()

    if not user:
        raise credentials_exception

    if hasattr(user, "is_active") and not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email address is not verified. Access to AZOL AI workspace is restricted."
        )

    return user