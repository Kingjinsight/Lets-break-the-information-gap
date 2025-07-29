from celery import Celery

celery_app = Celery(
    "rss_podcast",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0",    
    include=['app.tasks']
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    
    # Quota protection settings
    task_time_limit=45 * 60,
    task_soft_time_limit=40 * 60,
    worker_prefetch_multiplier=1,
    
    # Avoid duplicate execution of precious TTS tasks
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    
    result_expires=24 * 3600,
)