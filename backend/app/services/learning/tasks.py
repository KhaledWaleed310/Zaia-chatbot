"""
Celery Tasks for AIDEN Nightly Learning Batch

Scheduled tasks that run during low-traffic hours to:
1. Crystallize learning experiences into patterns
2. Synthesize knowledge from patterns
3. Evolve prompts based on performance
4. Replay landmark experiences
5. Reflect on recent conversations
"""

import asyncio
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


async def run_nightly_crystallization():
    """
    Main nightly learning pipeline.

    Runs at 3 AM UTC (configurable) during low-traffic hours.
    """
    from .memory_crystallizer import MemoryCrystallizer
    from .prompt_evolver import AdaptivePromptEvolver
    from .experience_replay import ExperienceReplaySystem
    from .knowledge_synthesizer import KnowledgeSynthesizer
    from .meta_cognition import MetaCognitiveReflector
    from ...core.database import get_mongodb

    logger.info("Starting nightly learning pipeline...")
    start_time = datetime.utcnow()

    results = {
        "started_at": start_time.isoformat(),
        "stages": {}
    }

    db = get_mongodb()

    # Get all active bots
    bots = await db.chatbots.find({"status": {"$ne": "deleted"}}).to_list(length=None)
    logger.info(f"Processing {len(bots)} bots")

    # Stage 1: Crystallize experiences into patterns
    logger.info("Stage 1: Memory Crystallization")
    try:
        crystallizer = MemoryCrystallizer()
        crystallization_result = await crystallizer.crystallize_batch(hours=24)
        results["stages"]["crystallization"] = {
            "success": crystallization_result.success,
            "patterns_created": crystallization_result.patterns_created,
            "patterns_updated": crystallization_result.patterns_updated,
            "items_processed": crystallization_result.items_processed,
        }
        logger.info(f"Crystallization complete: {crystallization_result.patterns_created} patterns created")
    except Exception as e:
        logger.error(f"Crystallization failed: {e}")
        results["stages"]["crystallization"] = {"success": False, "error": str(e)}

    # Stage 2: Synthesize knowledge from patterns
    logger.info("Stage 2: Knowledge Synthesis")
    try:
        synthesizer = KnowledgeSynthesizer()
        synthesis_result = await synthesizer.synthesize_knowledge()
        results["stages"]["synthesis"] = {
            "success": synthesis_result.success,
            "patterns_created": synthesis_result.patterns_created,
            "details": synthesis_result.details,
        }
        logger.info(f"Synthesis complete: {synthesis_result.details}")
    except Exception as e:
        logger.error(f"Knowledge synthesis failed: {e}")
        results["stages"]["synthesis"] = {"success": False, "error": str(e)}

    # Stage 3: Prompt Evolution (per bot)
    logger.info("Stage 3: Prompt Evolution")
    evolution_results = []
    evolver = AdaptivePromptEvolver()

    for bot in bots[:10]:  # Limit to 10 bots per night
        try:
            # Generate new variants if needed
            await evolver.evolve_prompt(
                bot_id=bot["_id"],
                current_prompt=bot.get("system_prompt", "")
            )

            # Evaluate and potentially promote
            promoted = await evolver.evaluate_and_promote(bot["_id"])
            evolution_results.append({
                "bot_id": bot["_id"],
                "promoted": promoted is not None,
            })
        except Exception as e:
            logger.error(f"Prompt evolution failed for bot {bot['_id']}: {e}")
            evolution_results.append({
                "bot_id": bot["_id"],
                "error": str(e),
            })

    results["stages"]["evolution"] = {
        "bots_processed": len(evolution_results),
        "promotions": sum(1 for r in evolution_results if r.get("promoted", False)),
    }

    # Stage 4: Experience Replay
    logger.info("Stage 4: Experience Replay")
    try:
        replay_system = ExperienceReplaySystem()
        replay_result = await replay_system.replay_batch(sample_size=100)
        results["stages"]["replay"] = {
            "success": replay_result.success,
            "items_processed": replay_result.items_processed,
            "improvements": replay_result.details.get("improvements", 0),
            "regressions": replay_result.details.get("regressions", 0),
        }
        logger.info(f"Replay complete: {replay_result.details}")
    except Exception as e:
        logger.error(f"Experience replay failed: {e}")
        results["stages"]["replay"] = {"success": False, "error": str(e)}

    # Stage 5: Meta-Cognitive Reflection (sample of recent sessions)
    logger.info("Stage 5: Meta-Cognitive Reflection")
    reflector = MetaCognitiveReflector()
    reflection_count = 0

    # Get recent sessions for reflection
    recent_sessions = await db.conversations.find({
        "updated_at": {"$gte": datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)}
    }).limit(50).to_list(length=50)

    for session in recent_sessions:
        try:
            await reflector.reflect_on_session(
                session_id=session["session_id"],
                bot_id=session["bot_id"]
            )
            reflection_count += 1
        except Exception as e:
            logger.warning(f"Reflection failed for session {session['session_id']}: {e}")

    results["stages"]["reflection"] = {
        "sessions_reflected": reflection_count,
    }

    # Calculate total duration
    end_time = datetime.utcnow()
    duration = (end_time - start_time).total_seconds()

    results["completed_at"] = end_time.isoformat()
    results["duration_seconds"] = duration

    # Store results
    await db.learning_runs.insert_one(results)

    logger.info(f"Nightly learning pipeline complete in {duration:.1f}s")
    return results


# Synchronous wrapper for Celery
def nightly_crystallization_task():
    """Celery task wrapper for nightly crystallization."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(run_nightly_crystallization())
    finally:
        loop.close()


# If using Celery, register the task
try:
    from celery import shared_task

    @shared_task(name="aiden.nightly_crystallization")
    def celery_nightly_crystallization():
        """Celery task for nightly crystallization."""
        return nightly_crystallization_task()

except ImportError:
    # Celery not installed
    pass


# Manual trigger function
async def trigger_learning_pipeline():
    """Manually trigger the learning pipeline (for testing or admin use)."""
    return await run_nightly_crystallization()
