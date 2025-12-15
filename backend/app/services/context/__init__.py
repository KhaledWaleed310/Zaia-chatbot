"""
World-Class Context Management System for Zaia Chatbot.

This module provides intelligent conversation context management with:
- Session memory (facts, intents, stages)
- Cross-session user profiles
- Conversation summarization
- Semantic history search
- Adaptive context building

Better than ChatGPT's context following.
"""

from .fact_extractor import extract_facts, extract_facts_batch, merge_facts, get_fact_summary, FACT_CATEGORIES
from .working_memory import WorkingMemory, get_or_create_memory, get_recent_sessions, cleanup_expired_sessions, DEFAULT_TTL
from .intent_tracker import IntentTracker, detect_intent
from .stage_detector import StageDetector, detect_stage
from .user_profile_manager import UserProfileManager
from .conversation_summarizer import ConversationSummarizer, summarize_conversation
from .semantic_history_search import SemanticHistorySearch
from .context_manager import ContextManager, build_context

__all__ = [
    # Fact Extraction
    "extract_facts",
    "extract_facts_batch",
    "merge_facts",
    "get_fact_summary",
    "FACT_CATEGORIES",

    # Working Memory
    "WorkingMemory",
    "get_or_create_memory",
    "get_recent_sessions",
    "cleanup_expired_sessions",
    "DEFAULT_TTL",

    # Intent Tracking
    "IntentTracker",
    "detect_intent",

    # Stage Detection
    "StageDetector",
    "detect_stage",

    # User Profiles
    "UserProfileManager",

    # Summarization
    "ConversationSummarizer",
    "summarize_conversation",

    # Semantic Search
    "SemanticHistorySearch",

    # Main Orchestrator
    "ContextManager",
    "build_context",
]
