from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

podcast_articles = Table(
    "podcast_articles",
    Base.metadata,
    Column("podcast_id", ForeignKey("podcasts.id"), primary_key=True),
    Column("article_id", ForeignKey("articles.id"), primary_key=True),
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    rss_sources = relationship(
        "RssSource", back_populates="owner", cascade="all, delete-orphan"
    )
    podcasts = relationship(
        "Podcast", back_populates="owner", cascade="all, delete-orphan"
    )


class RssSource(Base):
    __tablename__ = "rss_sources"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    url = Column(String(2048), nullable=False)
    name = Column(String(255))
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    owner = relationship("User", back_populates="rss_sources")
    articles = relationship(
        "Article", back_populates="source", cascade="all, delete-orphan"
    )


class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("rss_sources.id"), nullable=False)
    title = Column(String(512), nullable=False)
    content = Column(Text, nullable=False)
    article_url = Column(String(2048), unique=True, nullable=False)
    fetched_at = Column(DateTime, server_default=func.now(), nullable=False)

    source = relationship("RssSource", back_populates="articles")
    podcasts = relationship(
        "Podcast", secondary=podcast_articles, back_populates="articles"
    )


class Podcast(Base):
    __tablename__ = "podcasts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    audio_file_path = Column(String(2048), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    owner = relationship("User", back_populates="podcasts")
    articles = relationship(
        "Article", secondary=podcast_articles, back_populates="podcasts"
    )

