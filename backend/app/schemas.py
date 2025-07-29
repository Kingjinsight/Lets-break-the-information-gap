# backend/app/schemas.py - Fixed version
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional, Dict

# ======================= Article =======================
class ArticleBase(BaseModel):
    title: str
    article_url: str
    content: str

class ArticleCreate(ArticleBase):
    author: Optional[str] = 'Unknown Author'
    published_date: Optional[datetime] = None
    fetched_at: Optional[datetime] = None

class Article(ArticleBase):
    id: int
    author: Optional[str] = None  
    published_date: Optional[datetime] = None
    fetched_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ======================= Simplified Article Model (for use in podcasts) =======================
class ArticleInPodcast(BaseModel):
    """Simplified article info displayed in podcasts"""
    id: int
    title: str
    author: Optional[str] = None
    published_date: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

# ======================= RSS Source =======================
class RssSourceBase(BaseModel):
    url: str
    name: Optional[str] = None

class RssSourceCreate(RssSourceBase):
    pass

class RssSource(RssSourceBase):
    id: int
    created_at: datetime
    user_id: int

    model_config = ConfigDict(from_attributes=True)

# ======================= Podcast =======================
class PodcastBase(BaseModel):
    title: Optional[str] = None
    script: Optional[str] = None
    audio_file_path: str

class PodcastCreate(BaseModel):
    article_ids: List[int]

class Podcast(PodcastBase):
    id: int
    created_at: datetime
    owner_id: int
    articles: List[ArticleInPodcast] = []

    model_config = ConfigDict(from_attributes=True)

class PodcastResponse(BaseModel):
    """Podcast response schema for API endpoints"""
    id: int
    title: Optional[str] = None
    script: Optional[str] = None
    audio_file_path: str
    created_at: datetime
    owner_id: int
    articles: List[ArticleInPodcast] = []
    
    model_config = ConfigDict(from_attributes=True)


# ======================= Simplified Podcast Model (for use in user) =======================
class PodcastSummary(BaseModel):
    """Simplified podcast info displayed in user info"""
    id: int
    title: Optional[str] = None
    created_at: datetime
    audio_file_path: str
    
    model_config = ConfigDict(from_attributes=True)

# ======================= User =======================
class UserBase(BaseModel):
    email: str
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime
    rss_sources: List[RssSource] = []
    podcasts: List[PodcastSummary] = []

    model_config = ConfigDict(from_attributes=True)

# ======================= Other models remain unchanged =======================
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class RssValidationResult(BaseModel):
    valid: bool
    error: Optional[str] = None
    details: Optional[str] = None
    feed_info: Optional[Dict] = None

class RssValidationResponse(BaseModel):
    url: str
    validation: RssValidationResult
    is_duplicate: bool
    message: str

class PodcastConfig(BaseModel):
    duration_minutes: int = 15
    voice_joe: str = "charon"
    voice_jane: str = "aoede" 
    include_overview: bool = True
    max_articles: Optional[int] = None
    preferred_categories: List[str] = []

class PodcastCreateEnhanced(BaseModel):
    article_ids: List[int]
    title: Optional[str] = None
    config: Optional[PodcastConfig] = None