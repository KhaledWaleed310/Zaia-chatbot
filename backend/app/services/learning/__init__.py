"""
AIDEN: Adaptive Intelligence with Dynamic Evolutionary Networks

A patent-worthy self-learning system for API-based LLMs that enables
continuous improvement without fine-tuning.

Core Components:
- MemoryCrystallizer: Converts session experiences into learned knowledge
- AdaptivePromptEvolver: Evolves prompts based on performance feedback
- MetaCognitiveReflector: Self-evaluation and improvement hypothesis generation
- ExperienceReplaySystem: Reinforces learning through selective replay
- KnowledgeSynthesizer: Synthesizes generalizable knowledge from experiences

Key Innovations (Patent Claims):
1. Memory Crystallization Process
2. Adaptive Prompt Evolution Engine
3. Meta-Cognitive Reflection Architecture
4. Temporal Knowledge Gradient
"""

from .base import (
    LearningConfig,
    LearningExperience,
    LearnedPattern,
    CrystallizedKnowledge,
    FeedbackSignals,
    ReflectionResult,
    LearningOutcome,
)
from .llm_provider import LLMProvider, get_llm_provider
from .feedback_collector import FeedbackCollector, collect_feedback
from .importance_scorer import ImportanceScorer, compute_importance
from .memory_crystallizer import MemoryCrystallizer, crystallize_session
from .prompt_evolver import AdaptivePromptEvolver, evolve_prompt
from .meta_cognition import MetaCognitiveReflector, reflect_on_session
from .experience_replay import ExperienceReplaySystem, replay_experiences
from .knowledge_synthesizer import KnowledgeSynthesizer, synthesize_knowledge
from .tasks import trigger_learning_pipeline, nightly_crystallization_task

__all__ = [
    # Config and Types
    "LearningConfig",
    "LearningExperience",
    "LearnedPattern",
    "CrystallizedKnowledge",
    "FeedbackSignals",
    "ReflectionResult",
    "LearningOutcome",
    # LLM Provider
    "LLMProvider",
    "get_llm_provider",
    # Core Components
    "FeedbackCollector",
    "collect_feedback",
    "ImportanceScorer",
    "compute_importance",
    "MemoryCrystallizer",
    "crystallize_session",
    "AdaptivePromptEvolver",
    "evolve_prompt",
    "MetaCognitiveReflector",
    "reflect_on_session",
    "ExperienceReplaySystem",
    "replay_experiences",
    "KnowledgeSynthesizer",
    "synthesize_knowledge",
    # Tasks
    "trigger_learning_pipeline",
    "nightly_crystallization_task",
]

__version__ = "1.0.0"
__author__ = "Aiden Learning System"
