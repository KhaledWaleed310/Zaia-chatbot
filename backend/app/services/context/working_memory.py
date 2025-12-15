"""
Working Memory for Zaia Context System.
Redis-based fast access to current session context.
TTL: 24 hours for auto-cleanup.
"""

from typing import Dict, Any, Optional, List
import json
import logging
from datetime import datetime

from ...core.database import get_redis

logger = logging.getLogger(__name__)

# Redis key patterns
SESSION_MEMORY_KEY = "session:{session_id}:memory"
SESSION_PROFILE_KEY = "session:{session_id}:profile_id"
DEFAULT_TTL = 86400  # 24 hours


class WorkingMemory:
    """
    Manages session-level working memory in Redis.

    Stores:
    - Extracted facts
    - Intent history
    - Current conversation stage
    - Partial conversation summary
    """

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.redis = get_redis()
        self.memory_key = SESSION_MEMORY_KEY.format(session_id=session_id)
        self.profile_key = SESSION_PROFILE_KEY.format(session_id=session_id)

    async def get_memory(self) -> Dict[str, Any]:
        """
        Get full working memory for session.

        Returns:
            Dict with:
            - facts: Dict of extracted facts
            - intents: List of detected intents
            - stage: Current conversation stage
            - summary: Partial conversation summary
            - metadata: Session metadata (created_at, updated_at)
        """
        if not self.redis:
            logger.warning("Redis not available, returning empty memory")
            return self._empty_memory()

        try:
            # Get all fields from Redis hash
            memory_data = await self.redis.hgetall(self.memory_key)

            if not memory_data:
                return self._empty_memory()

            # Parse JSON fields
            memory = {
                "facts": json.loads(memory_data.get("facts", "{}")),
                "intents": json.loads(memory_data.get("intents", "[]")),
                "stage": memory_data.get("stage"),
                "stage_confidence": float(memory_data.get("stage_confidence", 0.0)),
                "summary": memory_data.get("summary"),
                "metadata": {
                    "created_at": memory_data.get("created_at"),
                    "updated_at": memory_data.get("updated_at")
                }
            }

            return memory

        except Exception as e:
            logger.error(f"Error getting memory for session {self.session_id}: {e}")
            return self._empty_memory()

    async def update_facts(self, facts: Dict[str, Any]) -> None:
        """
        Update extracted facts in memory.

        Args:
            facts: Dict of facts with confidence scores
        """
        if not self.redis:
            logger.warning("Redis not available, skipping fact update")
            return

        try:
            # Get current memory or initialize
            current_memory = await self.get_memory()

            # Merge with existing facts (new facts override)
            current_facts = current_memory.get("facts", {})
            current_facts.update(facts)

            # Update Redis
            await self._update_fields({
                "facts": json.dumps(current_facts, ensure_ascii=False)
            })

            logger.debug(f"Updated {len(facts)} facts for session {self.session_id}")

        except Exception as e:
            logger.error(f"Error updating facts for session {self.session_id}: {e}")

    async def add_intent(self, intent: str, confidence: float) -> None:
        """
        Add detected intent to history.

        Args:
            intent: Intent name/category
            confidence: Confidence score (0-1)
        """
        if not self.redis:
            logger.warning("Redis not available, skipping intent addition")
            return

        try:
            # Get current intents
            current_memory = await self.get_memory()
            intents = current_memory.get("intents", [])

            # Add new intent with timestamp
            intent_entry = {
                "intent": intent,
                "confidence": confidence,
                "timestamp": datetime.utcnow().isoformat()
            }
            intents.append(intent_entry)

            # Keep only last 20 intents to prevent unbounded growth
            if len(intents) > 20:
                intents = intents[-20:]

            # Update Redis
            await self._update_fields({
                "intents": json.dumps(intents)
            })

            logger.debug(f"Added intent '{intent}' (conf: {confidence:.2f}) for session {self.session_id}")

        except Exception as e:
            logger.error(f"Error adding intent for session {self.session_id}: {e}")

    async def set_stage(self, stage: str, confidence: float) -> None:
        """
        Set current conversation stage.

        Args:
            stage: Stage name (e.g., "discovery", "qualification", "demo", "closing")
            confidence: Confidence score (0-1)
        """
        if not self.redis:
            logger.warning("Redis not available, skipping stage update")
            return

        try:
            await self._update_fields({
                "stage": stage,
                "stage_confidence": str(confidence)
            })

            logger.debug(f"Set stage '{stage}' (conf: {confidence:.2f}) for session {self.session_id}")

        except Exception as e:
            logger.error(f"Error setting stage for session {self.session_id}: {e}")

    async def get_intent_history(self) -> List[Dict[str, Any]]:
        """
        Get list of intents detected in this session.

        Returns:
            List of intent entries with intent, confidence, timestamp
        """
        memory = await self.get_memory()
        return memory.get("intents", [])

    async def set_profile_link(self, profile_id: str) -> None:
        """
        Link session to user profile.

        Args:
            profile_id: User profile ID
        """
        if not self.redis:
            logger.warning("Redis not available, skipping profile link")
            return

        try:
            await self.redis.set(self.profile_key, profile_id, ex=DEFAULT_TTL)
            logger.debug(f"Linked session {self.session_id} to profile {profile_id}")

        except Exception as e:
            logger.error(f"Error linking profile for session {self.session_id}: {e}")

    async def get_profile_link(self) -> Optional[str]:
        """
        Get linked user profile ID.

        Returns:
            Profile ID if linked, None otherwise
        """
        if not self.redis:
            logger.warning("Redis not available, returning None")
            return None

        try:
            profile_id = await self.redis.get(self.profile_key)
            return profile_id

        except Exception as e:
            logger.error(f"Error getting profile link for session {self.session_id}: {e}")
            return None

    async def set_summary(self, summary: str) -> None:
        """
        Set partial conversation summary.

        Args:
            summary: Summary text
        """
        if not self.redis:
            logger.warning("Redis not available, skipping summary update")
            return

        try:
            await self._update_fields({
                "summary": summary
            })

            logger.debug(f"Updated summary for session {self.session_id}")

        except Exception as e:
            logger.error(f"Error setting summary for session {self.session_id}: {e}")

    async def clear(self) -> None:
        """
        Clear working memory (for session reset).

        Removes all session data from Redis.
        """
        if not self.redis:
            logger.warning("Redis not available, skipping clear")
            return

        try:
            # Delete memory hash
            await self.redis.delete(self.memory_key)

            # Delete profile link
            await self.redis.delete(self.profile_key)

            logger.info(f"Cleared memory for session {self.session_id}")

        except Exception as e:
            logger.error(f"Error clearing memory for session {self.session_id}: {e}")

    async def _update_fields(self, fields: Dict[str, str]) -> None:
        """
        Update specific fields in Redis hash atomically.

        Args:
            fields: Dict of field names to values
        """
        try:
            # Check if memory exists
            exists = await self.redis.exists(self.memory_key)

            # If creating new memory, set created_at
            if not exists:
                fields["created_at"] = datetime.utcnow().isoformat()

            # Always update updated_at
            fields["updated_at"] = datetime.utcnow().isoformat()

            # Update fields atomically
            await self.redis.hset(self.memory_key, mapping=fields)

            # Set TTL
            await self.redis.expire(self.memory_key, DEFAULT_TTL)

        except Exception as e:
            logger.error(f"Error updating fields in Redis: {e}")
            raise

    def _empty_memory(self) -> Dict[str, Any]:
        """Return empty memory structure."""
        return {
            "facts": {},
            "intents": [],
            "stage": None,
            "stage_confidence": 0.0,
            "summary": None,
            "metadata": {
                "created_at": None,
                "updated_at": None
            }
        }


async def get_or_create_memory(session_id: str) -> WorkingMemory:
    """
    Factory function to get working memory instance.

    Args:
        session_id: Session ID

    Returns:
        WorkingMemory instance for the session
    """
    memory = WorkingMemory(session_id)

    # Ensure memory exists in Redis (creates if needed)
    if memory.redis:
        try:
            current = await memory.get_memory()
            # If memory doesn't exist, initialize it
            if not current.get("metadata", {}).get("created_at"):
                await memory._update_fields({})
        except Exception as e:
            logger.error(f"Error initializing memory for session {session_id}: {e}")

    return memory


async def get_recent_sessions(
    prefix: str = "session:",
    limit: int = 10
) -> List[Dict[str, Any]]:
    """
    Get list of recent active sessions (for debugging/analytics).

    Args:
        prefix: Redis key prefix to search
        limit: Maximum number of sessions to return

    Returns:
        List of session info dicts
    """
    redis_client = get_redis()
    if not redis_client:
        logger.warning("Redis not available")
        return []

    try:
        # Scan for session keys
        sessions = []
        pattern = f"{prefix}*:memory"

        cursor = 0
        scanned_keys = []

        # Use SCAN to get keys (more efficient than KEYS)
        while True:
            cursor, keys = await redis_client.scan(
                cursor,
                match=pattern,
                count=100
            )
            scanned_keys.extend(keys)

            if cursor == 0:
                break

            # Stop if we have enough
            if len(scanned_keys) >= limit:
                break

        # Get memory for each session
        for key in scanned_keys[:limit]:
            try:
                # Extract session_id from key
                session_id = key.split(":")[1]

                # Get memory
                memory = WorkingMemory(session_id)
                memory_data = await memory.get_memory()

                sessions.append({
                    "session_id": session_id,
                    "created_at": memory_data.get("metadata", {}).get("created_at"),
                    "updated_at": memory_data.get("metadata", {}).get("updated_at"),
                    "stage": memory_data.get("stage"),
                    "num_facts": len(memory_data.get("facts", {})),
                    "num_intents": len(memory_data.get("intents", []))
                })

            except Exception as e:
                logger.error(f"Error getting session data for {key}: {e}")
                continue

        # Sort by updated_at (most recent first)
        sessions.sort(
            key=lambda x: x.get("updated_at") or "",
            reverse=True
        )

        return sessions

    except Exception as e:
        logger.error(f"Error getting recent sessions: {e}")
        return []


async def cleanup_expired_sessions() -> int:
    """
    Cleanup expired sessions (Redis handles this with TTL, but useful for manual cleanup).

    Returns:
        Number of sessions cleaned up
    """
    redis_client = get_redis()
    if not redis_client:
        logger.warning("Redis not available")
        return 0

    try:
        cleaned = 0
        pattern = "session:*:memory"

        cursor = 0
        while True:
            cursor, keys = await redis_client.scan(
                cursor,
                match=pattern,
                count=100
            )

            for key in keys:
                # Check TTL
                ttl = await redis_client.ttl(key)

                # If no TTL set (ttl == -1), set it
                if ttl == -1:
                    await redis_client.expire(key, DEFAULT_TTL)
                    cleaned += 1

            if cursor == 0:
                break

        if cleaned > 0:
            logger.info(f"Set TTL for {cleaned} sessions without expiration")

        return cleaned

    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
        return 0
