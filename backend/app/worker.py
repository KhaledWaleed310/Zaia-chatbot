"""Celery worker configuration for async task processing."""

from celery import Celery
from .config import settings

# Initialize Celery
celery_app = Celery(
    "zaia_worker",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.ingestion.tasks"]
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max
    task_soft_time_limit=3000,  # 50 minutes soft limit
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
)

# Task routes
celery_app.conf.task_routes = {
    "app.ingestion.tasks.*": {"queue": "ingestion"},
}
