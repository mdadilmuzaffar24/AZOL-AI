import os
import re
import time
import socket
import secrets
import smtplib
from email.message import EmailMessage
from typing import Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, func
import httpx
from pydantic import BaseModel

from app.core.llm import get_llm_client
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User
from app.schemas.user import UserResponse, Token
from app.api.deps import get_current_user

router = APIRouter()

BLOCKED_EMAIL_DOMAINS = {
    "example.com", "test.com", "fake.com", "abc.com", "xyz.com", "temp.com",
    "mailinator.com", "tempmail.com", "10minutemail.com", "guerrillamail.com",
    "yopmail.com", "trashmail.com", "fakeinbox.com", "sharklasers.com", "getnada.com"
}

RATE_LIMIT_BUCKETS: Dict[str, list] = {}


# ==========================================
# PYDANTIC REQUEST SCHEMAS
# ==========================================

class RegisterRequest(BaseModel):
    email: str
    password: str
    confirm_password: Optional[str] = None
    captcha_verified: Optional[bool] = True


class VerifyEmailRequest(BaseModel):
    email: str
    code: str


class ResendVerificationRequest(BaseModel):
    email: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str


class GoogleToken(BaseModel):
    token: str


# ==========================================
# SECURITY, COOKIE & VALIDATION HELPERS
# ==========================================

def set_secure_session_cookie(response: Response, access_token: str):
    """Sets an HttpOnly, SameSite=Lax cookie so session tokens are protected against XSS."""
    is_prod = os.getenv("ENVIRONMENT", "development").lower() == "production"
    response.set_cookie(
        key="azol_session",
        value=access_token,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        max_age=60 * 60 * 24 * 7,  # 7 days
        path="/"
    )


def clear_secure_session_cookie(response: Response):
    """Purges the HttpOnly session cookie on logout."""
    response.delete_cookie(key="azol_session", path="/")


def check_rate_limit(key: str, max_requests: int = 8, window_seconds: int = 60):
    now = time.time()
    timestamps = [t for t in RATE_LIMIT_BUCKETS.get(key, []) if now - t < window_seconds]
    if len(timestamps) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please wait 60 seconds before trying again."
        )
    timestamps.append(now)
    RATE_LIMIT_BUCKETS[key] = timestamps


def validate_email_address_and_domain(email: str) -> str:
    cleaned = (email or "").strip().lower()
    email_regex = r"^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$"
    match = re.match(email_regex, cleaned)
    if not match:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    domain = match.group(1).lower()
    if domain in BLOCKED_EMAIL_DOMAINS:
        raise HTTPException(
            status_code=400,
            detail=f"Registration with disposable or test domain '{domain}' is not permitted."
        )

    try:
        socket.getaddrinfo(domain, None)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail=f"Email domain '{domain}' could not be verified. Please use a valid email address."
        )

    return cleaned


def validate_password_strength(password: str):
    if not password or len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")
    if not re.search(r"[A-Z]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter.")
    if not re.search(r"\d", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number.")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_=+\[\]\\;'/`~]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one special character.")


async def ensure_auth_security_tables(db: AsyncSession):
    """Ensures both the OTP/lockout table and the server-side JWT revocation blacklist table exist."""
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS auth_security_tokens (
            email VARCHAR PRIMARY KEY,
            is_verified BOOLEAN DEFAULT FALSE,
            verification_code VARCHAR,
            verification_expires_at FLOAT DEFAULT 0,
            reset_code VARCHAR,
            reset_expires_at FLOAT DEFAULT 0,
            failed_attempts INTEGER DEFAULT 0,
            otp_attempts INTEGER DEFAULT 0,
            locked_until FLOAT DEFAULT 0,
            last_sent_at FLOAT DEFAULT 0
        )
    """))
    await db.execute(text("""
        ALTER TABLE auth_security_tokens
        ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0
    """))
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS auth_revoked_tokens (
            token VARCHAR PRIMARY KEY,
            revoked_at FLOAT DEFAULT 0
        )
    """))
    await db.commit()


def send_transactional_email(to_email: str, subject: str, code: str, purpose: str) -> bool:
    try:
        from dotenv import load_dotenv
        load_dotenv(override=True)
    except Exception:
        pass

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587").strip())
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_pass = os.getenv("SMTP_PASSWORD", "").replace(" ", "").strip()
    smtp_from = os.getenv("SMTP_FROM", smtp_user or "security@azol.ai").strip()

    html_body = f"""
    <div style="font-family: Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #131418; color: #f1f5f9; border-radius: 16px; border: 1px solid #334155;">
      <h2 style="margin-top: 0; color: #ffffff;">AZOL AI ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Enterprise AI OS</h2>
      <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
        Use the following single-use 6-digit security code to complete your <strong>{purpose}</strong> request. This code expires in 15 minutes.
      </p>
      <div style="margin: 24px 0; padding: 18px; background: #1e293b; border: 1px solid #4f46e5; border-radius: 12px; text-align: center; font-family: monospace; font-size: 28px; font-weight: bold; letter-spacing: 8px; color: #818cf8;">
        {code}
      </div>
      <p style="color: #64748b; font-size: 12px;">
        If you did not request this code, you can safely ignore this email.
      </p>
    </div>
    """

    if smtp_user and smtp_pass:
        try:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = f"AZOL AI Security <{smtp_from}>"
            msg["To"] = to_email
            msg.set_content(f"Your AZOL AI {purpose} code is: {code} (Single-use, valid for 15 minutes).")
            msg.add_alternative(html_body, subtype="html")

            

import socket
    # Force IPv4 socket resolution for Render cloud network compatibility
    orig_getaddrinfo = socket.getaddrinfo
    socket.getaddrinfo = lambda *args, **kwargs: [r for r in orig_getaddrinfo(*args, **kwargs) if r[0] == socket.AF_INET]
    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=12) as server:
    finally:
        socket.getaddrinfo = orig_getaddrinfo
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            print(f"[AZOL SMTP SUCCESS] Sent {purpose} email to {to_email}")
            return True
        except Exception as e:
            print(f"[AZOL SMTP ERROR] Failed to send email via SMTP: {e}")

    print("\n" + "=" * 62)
    print(f" ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â AZOL AI SECURITY DISPATCH ({purpose.upper()})")
    print(f" Recipient : {to_email}")
    print(f" Code      : {code}  (Single-use, expires in 15 minutes)")
    print("=" * 62 + "\n")
    return False


# ==========================================
# 1. REGISTER (UNVERIFIED QUARANTINE + OTP DISPATCH)
# ==========================================

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    user_in: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    client_ip = request.client.host if request.client else "unknown"
    email = validate_email_address_and_domain(user_in.email)

    # Dual IP + Email rate limiting
    check_rate_limit(f"register_ip:{client_ip}", max_requests=6, window_seconds=60)
    check_rate_limit(f"register_email:{email}", max_requests=3, window_seconds=60)

    if user_in.captcha_verified is False:
        raise HTTPException(status_code=400, detail="Please complete the security verification check.")

    validate_password_strength(user_in.password)
    if user_in.confirm_password is not None and user_in.password != user_in.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    await ensure_auth_security_tables(db)

    result = await db.execute(select(User).filter(func.lower(User.email) == email))
    existing_user = result.scalars().first()

    sec_res = await db.execute(
        text("SELECT is_verified FROM auth_security_tokens WHERE email = :email"),
        {"email": email}
    )
    sec_row = sec_res.fetchone()

    if existing_user and (sec_row is None or sec_row[0] is True) and existing_user.is_active:
        raise HTTPException(
            status_code=400,
            detail="An account with this email is already registered. Please sign in."
        )

    code = f"{secrets.randbelow(900000) + 100000}"
    now = time.time()
    expires_at = now + 900  # 15 minutes

    if not existing_user:
        db_user = User(
            email=email,
            hashed_password=get_password_hash(user_in.password),
            role="admin",
            is_active=False  # Strictly quarantined until email is verified
        )
        db.add(db_user)
    else:
        existing_user.hashed_password = get_password_hash(user_in.password)
        existing_user.is_active = False

    await db.execute(
        text("""
            INSERT INTO auth_security_tokens (email, is_verified, verification_code, verification_expires_at, otp_attempts, last_sent_at)
            VALUES (:email, FALSE, :code, :exp, 0, :now)
            ON CONFLICT (email) DO UPDATE SET
                is_verified = FALSE,
                verification_code = :code,
                verification_expires_at = :exp,
                otp_attempts = 0,
                last_sent_at = :now
        """),
        {"email": email, "code": code, "exp": expires_at, "now": now}
    )
    await db.commit()

    smtp_sent = send_transactional_email(
        to_email=email,
        subject="Verify your AZOL AI account",
        code=code,
        purpose="Email Verification"
    )

    return {
        "status": "verification_required",
        "email": email,
        "smtp_dispatched": smtp_sent,
        "message": f"We've sent a 6-digit verification code to {email}."
    }


# ==========================================
# 2. VERIFY EMAIL (SINGLE-USE + MAX 5 GUESS GUARD + HTTPONLY COOKIE)
# ==========================================

@router.post("/verify-email")
async def verify_email(
    payload: VerifyEmailRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    client_ip = request.client.host if request.client else "unknown"
    email = (payload.email or "").strip().lower()
    code = (payload.code or "").strip()

    check_rate_limit(f"verify_ip:{client_ip}", max_requests=8, window_seconds=60)
    check_rate_limit(f"verify_email:{email}", max_requests=6, window_seconds=60)

    await ensure_auth_security_tables(db)

    sec_res = await db.execute(
        text("SELECT verification_code, verification_expires_at, otp_attempts FROM auth_security_tokens WHERE email = :email"),
        {"email": email}
    )
    sec_row = sec_res.fetchone()

    if not sec_row or not sec_row[0]:
        raise HTTPException(status_code=400, detail="No active verification code found. Please request a new code.")

    stored_code, expires_at, otp_attempts = sec_row[0], float(sec_row[1] or 0), int(sec_row[2] or 0)

    if time.time() > expires_at:
        await db.execute(
            text("UPDATE auth_security_tokens SET verification_code = NULL, verification_expires_at = 0 WHERE email = :email"),
            {"email": email}
        )
        await db.commit()
        raise HTTPException(status_code=400, detail="Verification code has expired. Please click 'Resend verification email'.")

    if not secrets.compare_digest(str(stored_code), str(code)):
        new_attempts = otp_attempts + 1
        if new_attempts >= 5:
            # Destroy OTP after 5 wrong guesses to prevent brute-forcing
            await db.execute(
                text("UPDATE auth_security_tokens SET verification_code = NULL, verification_expires_at = 0, otp_attempts = 0 WHERE email = :email"),
                {"email": email}
            )
            await db.commit()
            raise HTTPException(
                status_code=429,
                detail="Too many incorrect attempts. This code has been invalidatedÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Âplease click 'Resend verification email'."
            )
        await db.execute(
            text("UPDATE auth_security_tokens SET otp_attempts = :att WHERE email = :email"),
            {"att": new_attempts, "email": email}
        )
        await db.commit()
        raise HTTPException(status_code=400, detail=f"Invalid verification code ({5 - new_attempts} attempts remaining).")

    result = await db.execute(select(User).filter(func.lower(User.email) == email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Account not found.")

    # Mark account active & immediately consume single-use code
    user.is_active = True
    await db.execute(
        text("""
            UPDATE auth_security_tokens
            SET is_verified = TRUE, verification_code = NULL, verification_expires_at = 0,
                otp_attempts = 0, failed_attempts = 0, locked_until = 0
            WHERE email = :email
        """),
        {"email": email}
    )
    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(subject=str(user.id))
    set_secure_session_cookie(response, access_token)

    return {
        "status": "verified",
        "access_token": access_token,
        "token_type": "bearer",
        "message": "Email verified successfully."
    }


# ==========================================
# 3. RESEND VERIFICATION EMAIL
# ==========================================

@router.post("/resend-verification")
async def resend_verification(
    payload: ResendVerificationRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    client_ip = request.client.host if request.client else "unknown"
    email = (payload.email or "").strip().lower()

    check_rate_limit(f"resend_ip:{client_ip}", max_requests=4, window_seconds=60)
    check_rate_limit(f"resend_email:{email}", max_requests=3, window_seconds=60)

    await ensure_auth_security_tables(db)

    result = await db.execute(select(User).filter(func.lower(User.email) == email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found for this email address.")

    sec_res = await db.execute(
        text("SELECT last_sent_at FROM auth_security_tokens WHERE email = :email"),
        {"email": email}
    )
    sec_row = sec_res.fetchone()
    now = time.time()
    if sec_row and sec_row[0] and (now - float(sec_row[0])) < 30:
        wait_s = int(30 - (now - float(sec_row[0])))
        raise HTTPException(status_code=429, detail=f"Please wait {wait_s}s before requesting another code.")

    code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = now + 900

    await db.execute(
        text("""
            INSERT INTO auth_security_tokens (email, is_verified, verification_code, verification_expires_at, otp_attempts, last_sent_at)
            VALUES (:email, FALSE, :code, :exp, 0, :now)
            ON CONFLICT (email) DO UPDATE SET
                verification_code = :code,
                verification_expires_at = :exp,
                otp_attempts = 0,
                last_sent_at = :now
        """),
        {"email": email, "code": code, "exp": expires_at, "now": now}
    )
    await db.commit()

    smtp_sent = send_transactional_email(
        to_email=email,
        subject="Your new AZOL AI verification code",
        code=code,
        purpose="Email Verification"
    )

    return {
        "status": "sent",
        "smtp_dispatched": smtp_sent,
        "message": f"A new 6-digit verification code has been sent to {email}."
    }


# ==========================================
# 4. LOGIN (BRUTE-FORCE LOCKOUT + VERIFICATION GATE + HTTPONLY COOKIE)
# ==========================================

@router.post("/login", response_model=Token)
async def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    client_ip = request.client.host if request.client else "unknown"
    email = (form_data.username or "").strip().lower()

    check_rate_limit(f"login_ip:{client_ip}", max_requests=10, window_seconds=60)
    check_rate_limit(f"login_email:{email}", max_requests=6, window_seconds=60)

    await ensure_auth_security_tables(db)

    sec_res = await db.execute(
        text("SELECT is_verified, failed_attempts, locked_until FROM auth_security_tokens WHERE email = :email"),
        {"email": email}
    )
    sec_row = sec_res.fetchone()
    now = time.time()

    if sec_row and sec_row[2] and now < float(sec_row[2]):
        remaining_mins = max(1, int((float(sec_row[2]) - now) / 60) + 1)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account temporarily locked due to multiple failed login attempts. Try again in {remaining_mins} minute(s) or reset your password."
        )

    result = await db.execute(select(User).filter(func.lower(User.email) == email))
    user = result.scalars().first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        attempts = (int(sec_row[1]) + 1) if sec_row and sec_row[1] else 1
        locked_until = (now + 300) if attempts >= 5 else 0
        await db.execute(
            text("""
                INSERT INTO auth_security_tokens (email, is_verified, failed_attempts, locked_until)
                VALUES (:email, TRUE, :att, :lock)
                ON CONFLICT (email) DO UPDATE SET
                    failed_attempts = :att,
                    locked_until = :lock
            """),
            {"email": email, "att": attempts, "lock": locked_until}
        )
        await db.commit()

        if attempts >= 5:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed login attempts. Account locked for 5 minutes."
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Strictly block unverified accounts from obtaining a JWT
    is_unverified = (sec_row is not None and sec_row[0] is False) or (hasattr(user, "is_active") and not user.is_active)
    if is_unverified:
        code = f"{secrets.randbelow(900000) + 100000}"
        await db.execute(
            text("""
                INSERT INTO auth_security_tokens (email, is_verified, verification_code, verification_expires_at, otp_attempts, last_sent_at)
                VALUES (:email, FALSE, :code, :exp, 0, :now)
                ON CONFLICT (email) DO UPDATE SET
                    verification_code = :code,
                    verification_expires_at = :exp,
                    otp_attempts = 0,
                    last_sent_at = :now
            """),
            {"email": email, "code": code, "exp": now + 900, "now": now}
        )
        await db.commit()
        send_transactional_email(
            to_email=email,
            subject="Verify your AZOL AI account",
            code=code,
            purpose="Email Verification"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="EMAIL_NOT_VERIFIED: Please verify your email address before signing in. A new verification code has been sent to your email."
        )

    if sec_row and (sec_row[1] or sec_row[2]):
        await db.execute(
            text("UPDATE auth_security_tokens SET failed_attempts = 0, locked_until = 0 WHERE email = :email"),
            {"email": email}
        )
        await db.commit()

    access_token = create_access_token(subject=str(user.id))
    set_secure_session_cookie(response, access_token)
    return {"access_token": access_token, "token_type": "bearer"}


# ==========================================
# 5. FORGOT & RESET PASSWORD (SINGLE-USE + EXPIRING + 5-GUESS GUARD)
# ==========================================

@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    client_ip = request.client.host if request.client else "unknown"
    email = (payload.email or "").strip().lower()

    check_rate_limit(f"forgot_ip:{client_ip}", max_requests=4, window_seconds=60)
    check_rate_limit(f"forgot_email:{email}", max_requests=3, window_seconds=60)

    await ensure_auth_security_tables(db)

    result = await db.execute(select(User).filter(func.lower(User.email) == email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="No registered account found with that email address.")

    code = f"{secrets.randbelow(900000) + 100000}"
    now = time.time()
    expires_at = now + 900  # 15-minute expiration

    await db.execute(
        text("""
            INSERT INTO auth_security_tokens (email, is_verified, reset_code, reset_expires_at, otp_attempts, last_sent_at)
            VALUES (:email, TRUE, :code, :exp, 0, :now)
            ON CONFLICT (email) DO UPDATE SET
                reset_code = :code,
                reset_expires_at = :exp,
                otp_attempts = 0,
                last_sent_at = :now
        """),
        {"email": email, "code": code, "exp": expires_at, "now": now}
    )
    await db.commit()

    smtp_sent = send_transactional_email(
        to_email=email,
        subject="Reset your AZOL AI password",
        code=code,
        purpose="Password Reset"
    )

    return {
        "status": "reset_code_sent",
        "email": email,
        "smtp_dispatched": smtp_sent,
        "message": f"Password recovery code sent to {email}."
    }


@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    client_ip = request.client.host if request.client else "unknown"
    email = (payload.email or "").strip().lower()
    code = (payload.code or "").strip()

    check_rate_limit(f"reset_ip:{client_ip}", max_requests=6, window_seconds=60)
    check_rate_limit(f"reset_email:{email}", max_requests=5, window_seconds=60)

    validate_password_strength(payload.new_password)
    await ensure_auth_security_tables(db)

    sec_res = await db.execute(
        text("SELECT reset_code, reset_expires_at, otp_attempts FROM auth_security_tokens WHERE email = :email"),
        {"email": email}
    )
    sec_row = sec_res.fetchone()

    if not sec_row or not sec_row[0]:
        raise HTTPException(status_code=400, detail="No active password reset code found. Please request a new code.")

    stored_code, expires_at, otp_attempts = sec_row[0], float(sec_row[1] or 0), int(sec_row[2] or 0)

    if time.time() > expires_at:
        await db.execute(
            text("UPDATE auth_security_tokens SET reset_code = NULL, reset_expires_at = 0 WHERE email = :email"),
            {"email": email}
        )
        await db.commit()
        raise HTTPException(status_code=400, detail="Recovery code has expired. Please request a new code.")

    if not secrets.compare_digest(str(stored_code), str(code)):
        new_attempts = otp_attempts + 1
        if new_attempts >= 5:
            await db.execute(
                text("UPDATE auth_security_tokens SET reset_code = NULL, reset_expires_at = 0, otp_attempts = 0 WHERE email = :email"),
                {"email": email}
            )
            await db.commit()
            raise HTTPException(status_code=429, detail="Too many incorrect attempts. Recovery code invalidatedÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Âplease request a new one.")
        await db.execute(
            text("UPDATE auth_security_tokens SET otp_attempts = :att WHERE email = :email"),
            {"att": new_attempts, "email": email}
        )
        await db.commit()
        raise HTTPException(status_code=400, detail=f"Invalid recovery code ({5 - new_attempts} attempts remaining).")

    result = await db.execute(select(User).filter(func.lower(User.email) == email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Account not found.")

    user.hashed_password = get_password_hash(payload.new_password)
    user.is_active = True

    # Immediately consume single-use reset_code (SET reset_code = NULL)
    await db.execute(
        text("""
            UPDATE auth_security_tokens
            SET is_verified = TRUE, reset_code = NULL, reset_expires_at = 0,
                otp_attempts = 0, failed_attempts = 0, locked_until = 0
            WHERE email = :email
        """),
        {"email": email}
    )
    await db.commit()

    return {
        "status": "password_updated",
        "message": "Your password has been reset successfully. You can now sign in."
    }


# ==========================================
# 6. GOOGLE OAUTH, SERVER-SIDE LOGOUT & PROFILE
# ==========================================

@router.post("/google")
async def google_login(
    payload: GoogleToken,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    async with httpx.AsyncClient() as client:
        g_res = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {payload.token}"}
        )

    if g_res.status_code != 200:
        raise HTTPException(status_code=400, detail="Invalid Google authentication token.")

    google_data = g_res.json()
    email = (google_data.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Google account did not provide an email.")

    await ensure_auth_security_tables(db)

    result = await db.execute(select(User).where(func.lower(User.email) == email))
    user = result.scalars().first()

    if not user:
        random_password = secrets.token_urlsafe(32)
        hashed_pw = get_password_hash(random_password)
        user = User(email=email, hashed_password=hashed_pw, role="admin", is_active=True)
        db.add(user)
        await db.commit()
        await db.refresh(user)
    elif not user.is_active:
        user.is_active = True
        await db.commit()

    await db.execute(
        text("""
            INSERT INTO auth_security_tokens (email, is_verified, failed_attempts, locked_until)
            VALUES (:email, TRUE, 0, 0)
            ON CONFLICT (email) DO UPDATE SET is_verified = TRUE, failed_attempts = 0, locked_until = 0
        """),
        {"email": email}
    )
    await db.commit()

    access_token = create_access_token(subject=str(user.id))
    set_secure_session_cookie(response, access_token)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
async def logout_session(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Revokes the active JWT in PostgreSQL and clears the HttpOnly session cookie."""
    await ensure_auth_security_tables(db)

    auth_header = request.headers.get("Authorization") or ""
    bearer_token = auth_header.replace("Bearer ", "").strip() if auth_header.startswith("Bearer ") else None
    cookie_token = request.cookies.get("azol_session")

    for tok in {bearer_token, cookie_token}:
        if tok and tok not in ("null", "undefined", ""):
            await db.execute(
                text("""
                    INSERT INTO auth_revoked_tokens (token, revoked_at)
                    VALUES (:tok, :now)
                    ON CONFLICT (token) DO NOTHING
                """),
                {"tok": tok, "now": time.time()}
            )
    await db.commit()

    clear_secure_session_cookie(response)
    return {"status": "logged_out", "message": "Session invalidated and HttpOnly cookie cleared."}


@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/test-ai")
async def test_ai_engine():
    try:
        llm = get_llm_client()
        response = llm.invoke("Respond with exactly: 'AI Control Plane Online.'")
        return {"status": "success", "response": response.content}
    except Exception as e:
        return {"status": "error", "detail": str(e)}