"""
Context Manager - Main Orchestrator for Zaia Context System.
Coordinates all context building components.
This is the brain of the world-class context system.
"""

from typing import Dict, Any, List, Optional
import asyncio
import logging
from datetime import datetime

from .fact_extractor import extract_facts, merge_facts
from .working_memory import WorkingMemory, get_or_create_memory
from .intent_tracker import IntentTracker, detect_intent
from .stage_detector import StageDetector, detect_stage
from .user_profile_manager import UserProfileManager
from .conversation_summarizer import ConversationSummarizer, should_summarize
from .semantic_history_search import SemanticHistorySearch, format_history_for_prompt
from ...core.database import get_mongodb

logger = logging.getLogger(__name__)


class ContextManager:
    """
    Main orchestrator for building rich conversation context.

    Coordinates:
    - Working memory (Redis)
    - Fact extraction (LLM)
    - Intent tracking
    - Stage detection
    - User profiles (MongoDB)
    - Semantic history search (Qdrant)
    - Conversation summarization

    Target latency: < 800ms total
    """

    def __init__(
        self,
        session_id: str,
        bot_id: str,
        tenant_id: str
    ):
        self.session_id = session_id
        self.bot_id = bot_id
        self.tenant_id = tenant_id

        # Initialize components
        self.working_memory = WorkingMemory(session_id)
        self.profile_manager = UserProfileManager(tenant_id, bot_id)
        self.history_search = SemanticHistorySearch(tenant_id, bot_id)
        self.summarizer = ConversationSummarizer()
        self.intent_tracker = IntentTracker()
        self.stage_detector = StageDetector()

    async def build_context(
        self,
        current_query: str,
        conversation_history: List[Dict[str, str]],
        query_analysis: Dict[str, Any] = None,
        visitor_id: str = None
    ) -> Dict[str, Any]:
        """
        Build rich context for LLM response generation.

        This is the main entry point called from chat.py.

        Args:
            current_query: User's current message
            conversation_history: Recent messages
            query_analysis: Pre-computed query analysis

        Returns:
            {
                "recent_messages": [...],  # Formatted for LLM
                "working_memory": {...},   # Current session state
                "user_profile": {...},     # Cross-session profile (if linked)
                "conversation_summary": "...",  # If long conversation
                "relevant_past_conversations": [...],  # From semantic search
                "prompt_context": "...",   # Ready-to-use context block
                "stage_guidance": "...",   # Stage-specific instructions
            }
        """
        try:
            start_time = asyncio.get_event_loop().time()

            # Load working memory first (fast, from Redis)
            memory_data = await self.working_memory.get_memory()
            existing_facts = memory_data.get("facts", {})
            intent_history = [i["intent"] for i in memory_data.get("intents", [])]
            current_stage = memory_data.get("stage")

            # Parallel execution of independent operations
            # This is the key to meeting the <800ms latency target
            results = await asyncio.gather(
                # 1. Extract facts from current message
                self._extract_and_update_facts(current_query, existing_facts),

                # 2. Detect intent
                self._detect_and_track_intent(current_query, conversation_history, current_stage),

                # 3. Get/create user profile (if identifiers available)
                self._check_and_link_profile(existing_facts, visitor_id=visitor_id),

                # 4. Search relevant history
                self._search_relevant_history(current_query, memory_data.get("profile_id")),

                # Don't fail entire context build if any component fails
                return_exceptions=True
            )

            # Unpack results (handle exceptions)
            updated_facts = results[0] if not isinstance(results[0], Exception) else existing_facts
            intent_result = results[1] if not isinstance(results[1], Exception) else None
            user_profile = results[2] if not isinstance(results[2], Exception) else None
            past_conversations = results[3] if not isinstance(results[3], Exception) else []

            # Detect stage (depends on intent)
            stage_result = await self._detect_and_update_stage(
                conversation_history,
                intent_history,
                updated_facts
            )

            # Check if we should summarize
            summary_text = None
            if await should_summarize(len(conversation_history)):
                summary = await self.summarizer.process_conversation(
                    conversation_history,
                    updated_facts,
                    intent_history
                )
                if summary:
                    summary_text = self.summarizer.get_context_for_llm(max_tokens=500)

            # Build prompt context
            prompt_context = await self._build_prompt_context(
                user_profile=user_profile,
                working_memory=memory_data,
                updated_facts=updated_facts,
                summary=summary_text,
                past_conversations=past_conversations
            )

            # Get stage guidance
            stage_guidance = self.stage_detector.get_prompt_guidance()

            # Log performance
            elapsed_time = (asyncio.get_event_loop().time() - start_time) * 1000
            logger.info(f"Context built in {elapsed_time:.0f}ms for session {self.session_id}")

            return {
                "recent_messages": conversation_history[-10:],  # Last 10 messages
                "working_memory": memory_data,
                "user_profile": user_profile,
                "conversation_summary": summary_text,
                "relevant_past_conversations": past_conversations,
                "prompt_context": prompt_context,
                "stage_guidance": stage_guidance,
                "current_stage": stage_result.get("stage") if stage_result else None,
                "current_intent": intent_result.get("intent") if intent_result else None,
                "build_time_ms": elapsed_time
            }

        except Exception as e:
            logger.error(f"Error building context: {e}", exc_info=True)
            # Return minimal context on error
            return {
                "recent_messages": conversation_history[-10:],
                "working_memory": {},
                "user_profile": None,
                "conversation_summary": None,
                "relevant_past_conversations": [],
                "prompt_context": "",
                "stage_guidance": "Be helpful and professional.",
                "error": str(e)
            }

    async def _extract_and_update_facts(
        self,
        message: str,
        existing_facts: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Extract facts from message and update working memory."""
        try:
            # Extract new facts
            new_facts = await extract_facts(message, existing_facts)

            if new_facts:
                # Merge with existing facts
                updated_facts = merge_facts(existing_facts, new_facts)

                # Update working memory
                await self.working_memory.update_facts(updated_facts)

                logger.debug(f"Extracted {len(new_facts)} new facts")
                return updated_facts

            return existing_facts

        except Exception as e:
            logger.error(f"Error extracting facts: {e}")
            return existing_facts

    async def _detect_and_track_intent(
        self,
        message: str,
        history: List[Dict[str, str]],
        current_stage: str = None
    ) -> Dict[str, Any]:
        """Detect intent and update tracking."""
        try:
            # Detect intent
            intent_result = await detect_intent(message, history, current_stage)

            # Add to tracker
            self.intent_tracker.add_intent(
                intent_result["intent"],
                intent_result["confidence"],
                message
            )

            # Update working memory
            await self.working_memory.add_intent(
                intent_result["intent"],
                intent_result["confidence"]
            )

            logger.debug(f"Detected intent: {intent_result['intent']} (conf: {intent_result['confidence']})")
            return intent_result

        except Exception as e:
            logger.error(f"Error detecting intent: {e}")
            return None

    async def _detect_and_update_stage(
        self,
        conversation_history: List[Dict[str, str]],
        intent_history: List[str],
        current_facts: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Detect stage and update detector."""
        try:
            # Detect stage
            stage, confidence = await detect_stage(
                conversation_history,
                intent_history,
                current_facts
            )

            # Update tracker
            stage_changed = self.stage_detector.update_stage(stage, confidence)

            # Update working memory
            await self.working_memory.set_stage(stage, confidence)

            if stage_changed:
                logger.debug(f"Stage changed to: {stage} (conf: {confidence})")

            return {
                "stage": stage,
                "confidence": confidence,
                "changed": stage_changed
            }

        except Exception as e:
            logger.error(f"Error detecting stage: {e}")
            return {"stage": "discovery", "confidence": 0.5, "changed": False}

    async def _check_and_link_profile(
        self,
        facts: Dict[str, Any],
        visitor_id: str = None
    ) -> Optional[Dict[str, Any]]:
        """Check if we can link to user profile via email/phone/visitor_id."""
        try:
            email = None
            phone = None

            # Extract email from facts
            if "email" in facts:
                email_fact = facts["email"]
                if isinstance(email_fact, dict):
                    email = email_fact.get("value")
                else:
                    email = email_fact

            # Extract phone from facts
            if "phone" in facts:
                phone_fact = facts["phone"]
                if isinstance(phone_fact, dict):
                    phone = phone_fact.get("value")
                else:
                    phone = phone_fact

            # Use visitor_id-aware profile lookup
            if email or phone or visitor_id:
                profile, is_new = await self.profile_manager.get_or_create_profile_by_visitor(
                    visitor_id=visitor_id,
                    email=email,
                    phone=phone,
                    initial_facts=facts
                )

                if profile:
                    profile_id = profile["_id"]
                    await self.working_memory.set_profile_link(profile_id)

                    if is_new:
                        logger.info(f"Created new profile {profile_id[:8]}...")
                    else:
                        logger.debug(f"Linked to profile {profile_id[:8]}...")

                    return await self.profile_manager.get_profile_context(profile_id)

            return None

        except Exception as e:
            logger.error(f"Error in profile linking: {e}")
            return None

    async def _search_relevant_history(
        self,
        query: str,
        profile_id: str = None
    ) -> List[Dict[str, Any]]:
        """Search for relevant past conversations."""
        try:
            # Search semantic history
            conversations = await self.history_search.search_relevant_conversations(
                query=query,
                user_profile_id=profile_id,
                top_k=3,
                min_score=0.5
            )

            if conversations:
                logger.debug(f"Found {len(conversations)} relevant past conversations")

            return conversations

        except Exception as e:
            logger.error(f"Error searching history: {e}")
            return []

    async def _build_prompt_context(
        self,
        user_profile: Dict[str, Any] = None,
        working_memory: Dict[str, Any] = None,
        updated_facts: Dict[str, Any] = None,
        summary: str = None,
        past_conversations: List[Dict[str, Any]] = None
    ) -> str:
        """
        Build the context block to inject into LLM prompt.

        Example:
        ## USER CONTEXT
        Name: Ahmed | Company: TechCorp | Role: CTO
        Expertise: Technical | Language: Arabic preferred

        ## SESSION STATE
        Stage: Discovery | Intent: Technical inquiry
        Key interests: API integration, Arabic support

        ## CONVERSATION SUMMARY
        User is exploring chatbot solutions for their SaaS company...

        ## RELEVANT PAST CONVERSATIONS
        [Previous discussion about pricing...]
        """
        try:
            parts = []

            # 1. User Profile Section
            if user_profile and user_profile.get("formatted_prompt"):
                parts.append(user_profile["formatted_prompt"])

            # 2. Session State Section
            if working_memory or updated_facts:
                session_parts = ["## SESSION STATE"]

                # Stage and intent
                stage = working_memory.get("stage") if working_memory else None
                if stage:
                    session_parts.append(f"Conversation Stage: {stage}")

                # Recent intents
                intents = working_memory.get("intents", []) if working_memory else []
                if intents:
                    recent_intents = [i["intent"] for i in intents[-3:]]
                    session_parts.append(f"Recent Intents: {' → '.join(recent_intents)}")

                # Key facts from this session
                if updated_facts:
                    key_facts = []
                    priority_facts = ["name", "company", "role", "use_case", "budget"]

                    for fact_name in priority_facts:
                        if fact_name in updated_facts:
                            fact_data = updated_facts[fact_name]
                            value = fact_data.get("value") if isinstance(fact_data, dict) else fact_data
                            if value:
                                key_facts.append(f"{fact_name}: {value}")

                    if key_facts:
                        session_parts.append("Key Information: " + " | ".join(key_facts))

                if len(session_parts) > 1:  # Has more than just the header
                    parts.append("\n".join(session_parts))

            # 3. Conversation Summary Section
            if summary:
                parts.append(f"## CONVERSATION SUMMARY\n{summary}")

            # 4. Relevant Past Conversations Section
            if past_conversations:
                history_formatted = await format_history_for_prompt(
                    past_conversations,
                    max_tokens=300
                )
                if history_formatted:
                    parts.append(history_formatted)

            # Join all parts
            context = "\n\n".join(parts)

            # Token budget check (rough estimate: 1 token ≈ 4 chars)
            max_chars = 1000 * 4  # 1000 tokens
            if len(context) > max_chars:
                logger.warning(f"Context too long ({len(context)} chars), truncating")
                context = context[:max_chars] + "\n\n[Context truncated due to length]"

            return context

        except Exception as e:
            logger.error(f"Error building prompt context: {e}")
            return ""

    async def finalize_session(
        self,
        conversation: List[Dict[str, str]],
        outcome: str = None
    ) -> None:
        """
        Called when session ends. Archives to profile and Qdrant.
        """
        try:
            logger.info(f"Finalizing session {self.session_id}")

            # Get working memory
            memory_data = await self.working_memory.get_memory()
            facts = memory_data.get("facts", {})
            intents = memory_data.get("intents", [])
            intent_list = [i["intent"] for i in intents]

            # Generate final summary
            summary = await self.summarizer.process_conversation(
                conversation,
                facts,
                intent_list
            )

            if not summary:
                logger.warning(f"No summary generated for session {self.session_id}")
                return

            # Get profile ID
            profile_id = await self.working_memory.get_profile_link()

            # Index conversation in Qdrant for semantic search
            vector_id = await self.history_search.index_conversation(
                session_id=self.session_id,
                summary=summary,
                user_profile_id=profile_id
            )

            if vector_id:
                logger.debug(f"Indexed conversation in Qdrant: {vector_id}")

            # Update user profile if linked
            if profile_id:
                await self.profile_manager.add_session_summary(
                    profile_id=profile_id,
                    session_id=self.session_id,
                    summary=summary.get("short_summary", ""),
                    key_topics=summary.get("main_topics", []),
                    outcome=outcome or summary.get("outcome")
                )

                # Update behavior metrics
                sentiment = summary.get("sentiment_overall", "neutral")
                message_count = len(conversation)

                await self.profile_manager.update_behavior_metrics(
                    profile_id=profile_id,
                    session_sentiment=sentiment,
                    message_count=message_count
                )

                logger.debug(f"Updated profile {profile_id} with session data")

            logger.info(f"Session {self.session_id} finalized successfully")

        except Exception as e:
            logger.error(f"Error finalizing session: {e}", exc_info=True)


async def build_context(
    query: str,
    session_id: str,
    bot_id: str,
    tenant_id: str,
    conversation_history: List[Dict[str, str]] = None,
    query_analysis: Dict[str, Any] = None,
    visitor_id: str = None
) -> Dict[str, Any]:
    """
    Convenience function for building context.
    Called from chat.py.
    """
    manager = ContextManager(session_id, bot_id, tenant_id)
    return await manager.build_context(
        current_query=query,
        conversation_history=conversation_history or [],
        query_analysis=query_analysis,
        visitor_id=visitor_id
    )


async def finalize_session(
    session_id: str,
    bot_id: str,
    tenant_id: str,
    conversation: List[Dict[str, str]],
    outcome: str = None
) -> None:
    """
    Convenience function for finalizing a session.
    Called when conversation ends.
    """
    manager = ContextManager(session_id, bot_id, tenant_id)
    await manager.finalize_session(conversation, outcome)
