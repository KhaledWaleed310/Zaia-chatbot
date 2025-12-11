from fastapi import HTTPException, Request, status
from functools import wraps
import time
import structlog

from ..dependencies import get_redis
from ..config import settings

logger = structlog.get_logger()


class RateLimiter:
    """Simple rate limiter using Redis."""

    def __init__(self, redis_client=None, max_requests: int = None, window_seconds: int = 60):
        self.redis = redis_client or get_redis()
        self.max_requests = max_requests or settings.rate_limit_per_minute
        self.window_seconds = window_seconds

    async def is_allowed(self, key: str) -> bool:
        """Check if the request is allowed under the rate limit."""
        try:
            current = self.redis.get(key)
            if current is None:
                self.redis.setex(key, self.window_seconds, 1)
                return True

            if int(current) >= self.max_requests:
                return False

            self.redis.incr(key)
            return True
        except Exception as e:
            logger.warning("Rate limit check failed", error=str(e))
            # Allow request if Redis fails
            return True

    def get_remaining(self, key: str) -> int:
        """Get remaining requests for the key."""
        try:
            current = self.redis.get(key)
            if current is None:
                return self.max_requests
            return max(0, self.max_requests - int(current))
        except:
            return self.max_requests


rate_limiter = RateLimiter()


async def check_rate_limit(request: Request, tenant_id: str) -> None:
    """Check rate limit for a tenant."""
    key = f"rate_limit:{tenant_id}"
    if not await rate_limiter.is_allowed(key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later.",
            headers={
                "X-RateLimit-Limit": str(rate_limiter.max_requests),
                "X-RateLimit-Remaining": "0",
                "Retry-After": str(rate_limiter.window_seconds)
            }
        )
