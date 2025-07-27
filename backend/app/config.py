from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    google_api_key: str
    text_model_name: str = "gemini-2.5-flash"
    tts_model_name: str = "gemini-2.5-flash-preview-tts"

    class Config:
        env_file = ".env"
        extra = "ignore" 

settings = Settings()