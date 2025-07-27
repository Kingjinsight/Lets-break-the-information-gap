from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool
from .config import settings

engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=180,
    poolclass=NullPool,
)

AsyncSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
