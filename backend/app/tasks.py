from celery import current_task
from app.celery_app import celery_app
from app.services import script_writer, tts_service
from app import models
from app.config import settings
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import asyncio
import os

# Create synchronous database engine - Fix URL conversion issue
def get_sync_database_url():
    """Convert async database URL to sync version"""
    url = settings.database_url
    print(f"🔍 Original database URL: {url[:50]}...")
    
    # Convert to psycopg2 format (sync version)
    if "postgresql+psycopg://" in url:
        sync_url = url.replace("postgresql+psycopg://", "postgresql://")
    elif "postgresql://" in url and "psycopg" not in url:
        # If already basic PostgreSQL URL, use directly
        sync_url = url
    else:
        # Other cases, try to clean to basic format
        sync_url = url.replace("postgresql+psycopg://", "postgresql://")
    
    print(f"🔄 Converted URL: {sync_url[:50]}...")
    return sync_url

try:
    sync_database_url = get_sync_database_url()
    
    # Create sync engine, use psycopg2
    sync_engine = create_engine(
        sync_database_url,
        echo=False,
        pool_pre_ping=True,
        pool_recycle=300,
        # Explicitly specify using psycopg2 driver
        connect_args={
            "options": "-c timezone=utc"
        }
    )
    SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)
    print(f"✅ Sync database engine created successfully")
except Exception as e:
    print(f"❌ Failed to create sync database engine: {e}")
    print(f"🔧 Please check if psycopg2-binary is installed")
    sync_engine = None
    SyncSessionLocal = None

@celery_app.task(bind=True)
def generate_podcast_task(self, podcast_id: int, user_id: int, articles_data: list):
    """Generate podcast Celery task - Complete sync version with fixed field names"""
    try:
        print(f"🎙️ Starting podcast generation, Podcast ID: {podcast_id}")
        
        # Check database connection
        if not SyncSessionLocal:
            raise Exception("Database connection not available in Celery worker")
        
        # Update progress: Start processing
        self.update_state(
            state='PROGRESS',
            meta={'current': 10, 'total': 100, 'status': 'Generating script...'}
        )
        
        # 1. Generate script
        print(f"📝 Starting script generation for {len(articles_data)} articles...")
        script = script_writer.generate_script_from_articles(articles_data)
        
        if not script:
            raise Exception("Script generation failed")
        
        print(f"✅ Script generation completed: {len(script)} characters")
        
        # Update progress: Script completed
        self.update_state(
            state='PROGRESS',
            meta={'current': 40, 'total': 100, 'status': 'Script generated, creating audio...'}
        )
        
        # 2. Generate audio
        print(f"🎵 Starting audio generation...")
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        audio_filename = f"podcast_{podcast_id}_{user_id}_{timestamp}.wav"
        
        try:
            # Run TTS generation in asyncio context
            audio_path = asyncio.run(tts_service.generate_podcast_audio(script, audio_filename))
            print(f"✅ Audio generation completed: {audio_path}")
        except Exception as audio_error:
            print(f"⚠️ Audio generation failed: {audio_error}")
            # Continue with script-only podcast
            audio_path = ""
        
        # Update progress: Audio completed
        self.update_state(
            state='PROGRESS',
            meta={'current': 90, 'total': 100, 'status': 'Updating database...'}
        )
        
        # 3. Update database using sync operations
        def update_podcast_record():
            """Update podcast record using sync SQLAlchemy"""
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    with SyncSessionLocal() as session:
                        # Query podcast record
                        stmt = select(models.Podcast).filter(models.Podcast.id == podcast_id)
                        podcast = session.execute(stmt).scalars().first()
                        
                        if not podcast:
                            raise Exception(f"Podcast record {podcast_id} not found")
                        
                        # Update podcast fields
                        podcast.script = script
                        if audio_path and os.path.exists(audio_path):
                            podcast.audio_file_path = audio_path
                        
                        session.commit()
                        print(f"✅ Podcast record updated: {podcast_id}")
                        return True
                        
                except Exception as e:
                    print(f"❌ Database update failed (attempt {attempt + 1}/{max_retries}): {e}")
                    if attempt == max_retries - 1:
                        raise
                    import time
                    time.sleep(2)  # Wait 2 seconds before retry
                    
            return False
        
        # Run database update
        success = update_podcast_record()
        
        if success:
            result = {
                'podcast_id': podcast_id,
                'audio_path': audio_path,
                'script_length': len(script),
                'status': 'completed' if audio_path else 'script_only',
                'has_audio': bool(audio_path and os.path.exists(audio_path))
            }
            
            print(f"🎉 Podcast generation completed!")
            print(f"📊 Result: {result}")
            
            return result
        else:
            raise Exception(f"Failed to update podcast record {podcast_id}")
            
    except Exception as e:
        error_message = str(e)
        print(f"❌ Task failed: {error_message}")
        
        self.update_state(
            state='FAILURE',
            meta={
                'error': error_message,
                'podcast_id': podcast_id,
                'timestamp': datetime.now().isoformat()
            }
        )
        raise