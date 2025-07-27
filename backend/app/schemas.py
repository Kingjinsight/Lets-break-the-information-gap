from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

# Article
class ArticleBase(BaseModel):
    title: str
    article_url: str
    content: str

class ArticleCreate(ArticleBase):
    pass


class Article(ArticleBase):
    id: int
    content: str
    fetched_at: datetime

    class Config:
        from_attributes = True


# RSS

class RssSourceBase(BaseModel):
    url: str
    name: Optional[str] = None

class RssSourceCreate(RssSourceBase):
    pass

class RssSource(RssSourceBase):
    id: int
    created_at: datetime
    user_id: int


    class Config:
        from_attributes = True

# Podcast

class PodcastBase(BaseModel):
    pass

class PodcastCreate(PodcastBase):
    article_ids: List[int]

class Podcast(PodcastBase):
    id: int
    audio_file_path: str
    created_at: datetime
    owner_id: int
    articles: List[Article] = []

    class Config:
        from_attributes = True

# User

class UserBase(BaseModel):
    email: str
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime
    rss_sources: List[RssSource] = []
    podcasts: List[Podcast] = []

    class Config:
        from_attributes = True


# Token

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str