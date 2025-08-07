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
    source_id: int
    summary: Optional[str] = None

class Article(ArticleBase):
    id: int
    author: Optional[str] = None  
    published_date: Optional[datetime] = None
    published_at: Optional[datetime] = None  # 添加这个字段，作为published_date的别名
    fetched_at: datetime
    created_at: Optional[datetime] = None
    source_id: int
    summary: Optional[str] = None  # 添加摘要字段
    is_read: bool = False  # 添加阅读状态
    read_at: Optional[datetime] = None  # 添加阅读时间
    link: Optional[str] = None  # 添加链接字段作为article_url的别名
    source: Optional['RssSource'] = None  # 添加关联的RSS源
    
    model_config = ConfigDict(from_attributes=True)

    # 添加一个属性来确保链接字段的兼容性
    @property
    def url(self) -> str:
        return self.link or self.article_url

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

# Simplified User schema without relationships (for auth endpoints)
class UserProfile(UserBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ======================= User Settings =======================
class UserSettingsBase(BaseModel):
    google_api_key: Optional[str] = None

class UserSettingsCreate(UserSettingsBase):
    pass

class UserSettingsUpdate(BaseModel):
    google_api_key: Optional[str] = None

class UserSettings(UserSettingsBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    
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

class RssValidationRequest(BaseModel):
    url: str

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