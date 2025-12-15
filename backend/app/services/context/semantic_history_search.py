"""
Semantic History Search for Zaia Context System.
Searches past conversations using vector similarity.
"""

from typing import Dict, Any, List, Optional
import uuid
import logging
from datetime import datetime

from ...core.database import get_qdrant, get_mongodb
from ...services.embedding import generate_embedding
from qdrant_client.http.models import (
    VectorParams,
    Distance,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue
)

logger = logging.getLogger(__name__)

COLLECTION_NAME = "conversation_summaries"
EMBEDDING_DIM = 384  # all-MiniLM-L6-v2


class SemanticHistorySearch:
    """
    Enables semantic search over past conversations.
    Stores conversation summaries as vectors in Qdrant.
    """

    def __init__(self, tenant_id: str, bot_id: str):
        self.tenant_id = tenant_id
        self.bot_id = bot_id
        self.qdrant = get_qdrant()
        self.db = get_mongodb()

    async def ensure_collection(self) -> None:
        """Create Qdrant collection if not exists."""
        if not self.qdrant:
            logger.warning("Qdrant not available, skipping collection creation")
            return

        try:
            # Check if collection exists
            collections = self.qdrant.get_collections().collections
            collection_exists = any(c.name == COLLECTION_NAME for c in collections)

            if not collection_exists:
                # Create collection with vector configuration
                self.qdrant.create_collection(
                    collection_name=COLLECTION_NAME,
                    vectors_config=VectorParams(
                        size=EMBEDDING_DIM,
                        distance=Distance.COSINE
                    )
                )
                logger.info(f"Created Qdrant collection: {COLLECTION_NAME}")

        except Exception as e:
            logger.error(f"Error ensuring collection: {e}")

    async def index_conversation(
        self,
        session_id: str,
        summary: Dict[str, Any],
        user_profile_id: str = None
    ) -> str:
        """
        Index conversation summary for future search.

        Args:
            session_id: Conversation session ID
            summary: Conversation summary from summarizer
            user_profile_id: Optional link to user profile

        Returns:
            Vector ID
        """
        if not self.qdrant:
            logger.warning("Qdrant not available, skipping indexing")
            return None

        try:
            # Ensure collection exists
            await self.ensure_collection()

            # Build text to embed (combine summary fields for better search)
            text_to_embed = self._build_search_text(summary)

            if not text_to_embed:
                logger.warning(f"No text to embed for session {session_id}")
                return None

            # Generate embedding
            try:
                embedding = generate_embedding(text_to_embed)
            except Exception as e:
                logger.error(f"Failed to generate embedding: {e}")
                return None

            # Generate vector ID
            vector_id = str(uuid.uuid4())

            # Prepare payload with metadata
            payload = {
                "session_id": session_id,
                "tenant_id": self.tenant_id,
                "bot_id": self.bot_id,
                "user_profile_id": user_profile_id,
                "short_summary": summary.get("short_summary", ""),
                "detailed_summary": summary.get("detailed_summary", ""),
                "key_facts": summary.get("key_facts", {}),
                "main_topics": summary.get("main_topics", []),
                "user_needs": summary.get("user_needs", []),
                "outcome": summary.get("outcome", "undecided"),
                "sentiment": summary.get("sentiment_overall", "neutral"),
                "indexed_at": datetime.utcnow().isoformat(),
                "message_count": summary.get("message_count", 0)
            }

            # Upsert into Qdrant
            self.qdrant.upsert(
                collection_name=COLLECTION_NAME,
                points=[
                    PointStruct(
                        id=vector_id,
                        vector=embedding,
                        payload=payload
                    )
                ]
            )

            logger.debug(f"Indexed conversation {session_id} with vector ID {vector_id}")
            return vector_id

        except Exception as e:
            logger.error(f"Error indexing conversation: {e}")
            return None

    async def search_relevant_conversations(
        self,
        query: str,
        user_profile_id: str = None,
        top_k: int = 3,
        min_score: float = 0.5
    ) -> List[Dict[str, Any]]:
        """
        Find relevant past conversations.

        Args:
            query: Current user query
            user_profile_id: Filter to specific user's history
            top_k: Number of results
            min_score: Minimum similarity threshold

        Returns:
            List of relevant conversation excerpts with metadata
        """
        if not self.qdrant:
            logger.warning("Qdrant not available, returning empty results")
            return []

        try:
            # Ensure collection exists
            await self.ensure_collection()

            # Generate query embedding
            try:
                query_embedding = generate_embedding(query)
            except Exception as e:
                logger.error(f"Failed to generate query embedding: {e}")
                return []

            # Build filter for tenant/bot
            filter_conditions = [
                FieldCondition(
                    key="tenant_id",
                    match=MatchValue(value=self.tenant_id)
                ),
                FieldCondition(
                    key="bot_id",
                    match=MatchValue(value=self.bot_id)
                )
            ]

            # Add user profile filter if specified
            if user_profile_id:
                filter_conditions.append(
                    FieldCondition(
                        key="user_profile_id",
                        match=MatchValue(value=user_profile_id)
                    )
                )

            # Search in Qdrant
            search_results = self.qdrant.search(
                collection_name=COLLECTION_NAME,
                query_vector=query_embedding,
                query_filter=Filter(must=filter_conditions) if filter_conditions else None,
                limit=top_k,
                score_threshold=min_score
            )

            # Format results
            conversations = []
            for result in search_results:
                conversations.append({
                    "session_id": result.payload.get("session_id"),
                    "short_summary": result.payload.get("short_summary", ""),
                    "detailed_summary": result.payload.get("detailed_summary", ""),
                    "key_facts": result.payload.get("key_facts", {}),
                    "main_topics": result.payload.get("main_topics", []),
                    "user_needs": result.payload.get("user_needs", []),
                    "outcome": result.payload.get("outcome", "undecided"),
                    "sentiment": result.payload.get("sentiment", "neutral"),
                    "indexed_at": result.payload.get("indexed_at"),
                    "relevance_score": result.score
                })

            logger.debug(f"Found {len(conversations)} relevant conversations for query")
            return conversations

        except Exception as e:
            logger.error(f"Error searching conversations: {e}")
            return []

    async def get_user_conversation_history(
        self,
        user_profile_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get all past conversations for a user (for profile page).
        """
        if not self.qdrant:
            logger.warning("Qdrant not available, returning empty history")
            return []

        try:
            # Ensure collection exists
            await self.ensure_collection()

            # Scroll through all conversations for this user
            # We use scroll because we want all conversations, not semantic search
            filter_conditions = [
                FieldCondition(
                    key="tenant_id",
                    match=MatchValue(value=self.tenant_id)
                ),
                FieldCondition(
                    key="bot_id",
                    match=MatchValue(value=self.bot_id)
                ),
                FieldCondition(
                    key="user_profile_id",
                    match=MatchValue(value=user_profile_id)
                )
            ]

            # Scroll to get all matching points
            scroll_result = self.qdrant.scroll(
                collection_name=COLLECTION_NAME,
                scroll_filter=Filter(must=filter_conditions),
                limit=limit,
                with_payload=True,
                with_vectors=False
            )

            # Format results
            conversations = []
            for point in scroll_result[0]:  # scroll returns (points, next_offset)
                conversations.append({
                    "session_id": point.payload.get("session_id"),
                    "short_summary": point.payload.get("short_summary", ""),
                    "detailed_summary": point.payload.get("detailed_summary", ""),
                    "key_facts": point.payload.get("key_facts", {}),
                    "main_topics": point.payload.get("main_topics", []),
                    "user_needs": point.payload.get("user_needs", []),
                    "outcome": point.payload.get("outcome", "undecided"),
                    "sentiment": point.payload.get("sentiment", "neutral"),
                    "indexed_at": point.payload.get("indexed_at"),
                    "message_count": point.payload.get("message_count", 0)
                })

            # Sort by indexed_at (most recent first)
            conversations.sort(
                key=lambda x: x.get("indexed_at") or "",
                reverse=True
            )

            logger.debug(f"Retrieved {len(conversations)} conversations for user {user_profile_id}")
            return conversations

        except Exception as e:
            logger.error(f"Error getting user conversation history: {e}")
            return []

    async def delete_conversation(self, session_id: str) -> bool:
        """Remove conversation from index."""
        if not self.qdrant:
            logger.warning("Qdrant not available, skipping deletion")
            return False

        try:
            # Find points with this session_id
            filter_condition = Filter(
                must=[
                    FieldCondition(
                        key="session_id",
                        match=MatchValue(value=session_id)
                    )
                ]
            )

            # Scroll to get matching points
            scroll_result = self.qdrant.scroll(
                collection_name=COLLECTION_NAME,
                scroll_filter=filter_condition,
                limit=10,
                with_payload=False,
                with_vectors=False
            )

            # Delete found points
            point_ids = [point.id for point in scroll_result[0]]

            if point_ids:
                self.qdrant.delete(
                    collection_name=COLLECTION_NAME,
                    points_selector=point_ids
                )
                logger.info(f"Deleted {len(point_ids)} points for session {session_id}")
                return True

            return False

        except Exception as e:
            logger.error(f"Error deleting conversation: {e}")
            return False

    def _build_search_text(self, summary: Dict[str, Any]) -> str:
        """
        Build searchable text from summary.
        Combines multiple fields for better semantic search.
        """
        parts = []

        # Add summaries
        if summary.get("short_summary"):
            parts.append(summary["short_summary"])

        if summary.get("detailed_summary"):
            parts.append(summary["detailed_summary"])

        # Add key facts (formatted as text)
        key_facts = summary.get("key_facts", {})
        if key_facts:
            facts_text = " ".join([
                f"{k}: {v}" for k, v in key_facts.items()
            ])
            parts.append(facts_text)

        # Add topics and needs
        main_topics = summary.get("main_topics", [])
        if main_topics:
            parts.append(" ".join(main_topics))

        user_needs = summary.get("user_needs", [])
        if user_needs:
            parts.append(" ".join(user_needs))

        return " ".join(parts)


async def format_history_for_prompt(
    conversations: List[Dict[str, Any]],
    max_tokens: int = 300
) -> str:
    """
    Format retrieved conversations for LLM context.

    Example output:
    "## Relevant Past Conversations

    [3 weeks ago] User discussed API integration and pricing.
    Key points: Needed WhatsApp integration, budget $500/month.

    [1 month ago] User asked about Arabic support features."
    """
    if not conversations:
        return ""

    lines = ["## Relevant Past Conversations\n"]

    for conv in conversations:
        # Format timestamp
        indexed_at = conv.get("indexed_at")
        time_str = ""
        if indexed_at:
            try:
                indexed_date = datetime.fromisoformat(indexed_at)
                days_ago = (datetime.utcnow() - indexed_date).days

                if days_ago == 0:
                    time_str = "[Today]"
                elif days_ago == 1:
                    time_str = "[Yesterday]"
                elif days_ago < 7:
                    time_str = f"[{days_ago} days ago]"
                elif days_ago < 30:
                    weeks = days_ago // 7
                    time_str = f"[{weeks} week{'s' if weeks > 1 else ''} ago]"
                else:
                    months = days_ago // 30
                    time_str = f"[{months} month{'s' if months > 1 else ''} ago]"
            except Exception:
                time_str = "[Past conversation]"

        # Build conversation summary line
        short_summary = conv.get("short_summary", "")
        if short_summary:
            lines.append(f"{time_str} {short_summary}")

        # Add key facts if available
        key_facts = conv.get("key_facts", {})
        if key_facts:
            facts_str = ", ".join([f"{k}: {v}" for k, v in key_facts.items()])
            lines.append(f"  Key facts: {facts_str}")

        # Add outcome if notable
        outcome = conv.get("outcome")
        if outcome and outcome != "undecided":
            lines.append(f"  Outcome: {outcome}")

        lines.append("")  # Empty line between conversations

    formatted = "\n".join(lines)

    # Truncate if too long (rough token estimation: 1 token ≈ 4 chars)
    max_chars = max_tokens * 4
    if len(formatted) > max_chars:
        formatted = formatted[:max_chars] + "..."

    return formatted
