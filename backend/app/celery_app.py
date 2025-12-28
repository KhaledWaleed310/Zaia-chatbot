from celery import Celery
from celery.schedules import crontab
from .core.config import settings

celery_app = Celery(
    "zaia_chatbot",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks", "app.services.learning.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=600,  # 10 minutes
)

# Beat schedule for periodic tasks
celery_app.conf.beat_schedule = {
    # AIDEN: Nightly learning crystallization pipeline
    # Runs at 3 AM UTC daily during low-traffic hours
    "aiden-nightly-crystallization": {
        "task": "aiden.nightly_crystallization",
        "schedule": crontab(hour=3, minute=0),
        "options": {"queue": "learning"},
    },
}
