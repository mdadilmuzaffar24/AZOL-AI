from dotenv import load_dotenv
load_dotenv()

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Enterprise AI OS"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # Security Settings 
    SECRET_KEY: str = "super-secret-enterprise-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    
    # AI Settings (UPDATED FOR GROQ)
    GROQ_API_KEY: str = "" 
    
    # Database Settings
    POSTGRES_USER: str = "admin"
    POSTGRES_PASSWORD: str = "admin_password"
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "emaios_db"
    
    # MinIO / Data Lake Settings 
    MINIO_ENDPOINT: str = "http://localhost:9000"
    MINIO_ACCESS_KEY: str = "admin"
    MINIO_SECRET_KEY: str = "admin_password"
    MINIO_BUCKET_NAME: str = "emaios-documents"
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

settings = Settings()