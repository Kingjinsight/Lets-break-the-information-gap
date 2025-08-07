from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool
from .config import settings
import asyncio
from contextlib import asynccontextmanager

# Create main engine for regular operations
engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=300,  # Recycle connections every 5 minutes
    connect_args={
        "connect_timeout": 20,
        "options": "-c statement_timeout=30s -c application_name=rss_podcast_main"
    },
    echo=False,  # Set to True for SQL debugging
)

# Create separate engine for bulk RSS operations - DISABLE SSL to avoid connection issues
bulk_database_url = settings.database_url
if "sslmode=" not in bulk_database_url:
    if "?" in bulk_database_url:
        bulk_database_url += "&sslmode=disable"
    else:
        bulk_database_url += "?sslmode=disable"

bulk_engine = create_async_engine(
    bulk_database_url,
    poolclass=NullPool,  # No connection pooling for bulk operations
    connect_args={
        "connect_timeout": 5,  # Very short timeout for bulk operations
        "options": "-c statement_timeout=10s -c application_name=rss_bulk -c tcp_keepalives_idle=30 -c tcp_keepalives_interval=5 -c tcp_keepalives_count=3"
    },
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)
BulkSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=bulk_engine)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

@asynccontextmanager
async def get_bulk_db_session():
    """Context manager for bulk database operations with robust error handling"""
    session = None
    try:
        session = BulkSessionLocal()
        yield session
    except Exception as e:
        if session:
            try:
                await session.rollback()
            except:
                pass  # Ignore rollback errors on connection issues
        raise e
    finally:
        if session:
            try:
                await session.close()
            except:
                pass  # Ignore close errors on connection issues
