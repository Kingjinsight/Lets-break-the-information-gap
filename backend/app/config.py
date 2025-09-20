from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    database_url: str
    redis_url: str = "redis://valkey:6379/0"
    frontend_url: str = "http://localhost:5173"
    google_api_key: Optional[str] = None
    text_model_name: str = "gemini-2.5-flash"
    tts_model_name: str = "gemini-2.5-flash-preview-tts"

    class Config:
        env_file = ".env"
        extra = "ignore" 

settings = Settings()