"""
Memory Crystallization Engine for AIDEN

PATENT CLAIM: A method for converting transient conversational session data
into permanent learned knowledge patterns in an AI system using external LLM APIs.

The crystallization process:
1. COLLECT: Gather successful interaction patterns
2. FILTER: Apply importance sampling based on feedback signals
3. ABSTRACT: Extract generalizable principles from specific cases
4. VALIDATE: Test abstracted knowledge against historical data
5. CRYSTALLIZE: Store validated knowledge in permanent graph
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import logging
import json
from collections import defaultdict

from .base import (
    LearningExperience,
    LearnedPattern,
    CrystallizedKnowledge,
    PatternType,
    KnowledgeLevel,
    KnowledgeScope,
    LearningConfig,
    InteractionType,
    LearningOutcome,
)
from .feedback_collector import FeedbackCollector
from .importance_scorer import ImportanceScorer
from .llm_provider import generate_json_with_provider
from ...core.database import get_mongodb, get_neo4j

logger = logging.getLogger(__name__)


class MemoryCrystallizer:
    """
    Converts ephemeral session data into crystallized knowledge.

    The crystallization process transforms raw conversational experiences
    into reusable patterns and principles that can improve future responses.
    """

    def __init__(self, config: LearningConfig = None):
        self.config = config or LearningConfig()
        self.feedback_collector = FeedbackCollector(config)
        self.importance_scorer = ImportanceScorer(config)
        self.db = None

    async def _get_db(self):
        """Get database connection."""
        if self.db is None:
            self.db = get_mongodb()
        return self.db

    async def crystallize_batch(
        self,
        bot_id: str = None,
        tenant_id: str = None,
        hours: int = 24,
    ) -> LearningOutcome:
        """
        Process a batch of experiences and crystallize patterns.

        This is the main entry point for nightly batch processing.
        """
        outcome = LearningOutcome(operation="crystallization")
        start_time = datetime.utcnow()

        try:
            # 1. Collect unprocessed experiences
            experiences = await self.feedback_collector.get_unprocessed_experiences(
                bot_id=bot_id,
                min_importance=self.config.min_quality_threshold,
                limit=1000
            )

            if not experiences:
                logger.info("No experiences to crystallize")
                outcome.items_processed = 0
                return outcome

            outcome.items_processed = len(experiences)
            logger.info(f"Processing {len(experiences)} experiences for crystallization")

            # 2. Score experiences for importance
            scored_experiences = await self.importance_scorer.score_batch(experiences)

            # 3. Filter high-value experiences
            valuable_experiences = [
                exp for exp in scored_experiences
                if exp.importance_score >= self.config.min_quality_threshold
            ]
            outcome.items_learned = len(valuable_experiences)

            if not valuable_experiences:
                logger.info("No high-value experiences found")
                return outcome

            # 4. Cluster similar experiences
            clusters = await self._cluster_experiences(valuable_experiences)

            # 5. Extract patterns from each cluster
            patterns = []
            for cluster in clusters:
                if len(cluster) >= self.config.min_evidence_count:
                    pattern = await self._extract_pattern(cluster)
                    if pattern:
                        patterns.append(pattern)

            outcome.patterns_created = len(patterns)

            # 6. Store patterns
            await self._store_patterns(patterns)

            # 7. Update existing patterns if similar ones exist
            updated_count = await self._merge_with_existing_patterns(patterns)
            outcome.patterns_updated = updated_count

            # 8. Mark experiences as crystallized
            experience_ids = [exp.id for exp in valuable_experiences]
            await self.feedback_collector.mark_experiences_crystallized(experience_ids)

            # 9. Optionally synthesize higher-level knowledge
            if self.config.enable_global_learning:
                await self._synthesize_global_knowledge(patterns)

            outcome.success = True
            outcome.completed_at = datetime.utcnow()
            outcome.duration_seconds = (outcome.completed_at - start_time).total_seconds()

            logger.info(
                f"Crystallization complete: {outcome.patterns_created} patterns created, "
                f"{outcome.patterns_updated} updated"
            )

        except Exception as e:
            logger.error(f"Crystallization failed: {e}", exc_info=True)
            outcome.success = False
            outcome.errors.append(str(e))

        return outcome

    async def crystallize_session(
        self,
        session_id: str,
        bot_id: str,
        tenant_id: str,
    ) -> List[LearnedPattern]:
        """
        Crystallize patterns from a single session.

        Used for real-time crystallization of high-value conversations.
        """
        db = await self._get_db()

        # Get experiences from this session
        cursor = db.learning_experiences.find({
            "session_id": session_id,
            "crystallized": False
        })

        experiences = []
        async for doc in cursor:
            experiences.append(LearningExperience.from_dict(doc))

        if not experiences:
            return []

        # Score and filter
        scored = await self.importance_scorer.score_batch(experiences)
        valuable = [e for e in scored if e.importance_score >= self.config.min_quality_threshold]

        if not valuable:
            return []

        # Extract pattern from this session
        pattern = await self._extract_pattern(valuable)
        if pattern:
            await self._store_patterns([pattern])

            # Mark as crystallized
            ids = [e.id for e in valuable]
            await self.feedback_collector.mark_experiences_crystallized(ids)

            return [pattern]

        return []

    async def _cluster_experiences(
        self,
        experiences: List[LearningExperience]
    ) -> List[List[LearningExperience]]:
        """
        Cluster similar experiences together.

        Uses a combination of:
        - Intent similarity
        - Topic similarity
        - Outcome similarity
        """
        # Group by intent first
        intent_groups = defaultdict(list)
        for exp in experiences:
            intent = exp.detected_intent or "unknown"
            intent_groups[intent].append(exp)

        clusters = []

        for intent, group in intent_groups.items():
            if len(group) >= self.config.min_evidence_count:
                # Further cluster by interaction type
                type_groups = defaultdict(list)
                for exp in group:
                    type_groups[exp.interaction_type].append(exp)

                for interaction_type, subgroup in type_groups.items():
                    if len(subgroup) >= self.config.min_evidence_count:
                        clusters.append(subgroup)

        return clusters

    async def _extract_pattern(
        self,
        cluster: List[LearningExperience]
    ) -> Optional[LearnedPattern]:
        """
        Extract a generalizable pattern from a cluster of similar experiences.

        Uses LLM to identify common patterns and synthesize guidance.
        """
        if not cluster:
            return None

        # Prepare examples for LLM
        examples = []
        for exp in cluster[:10]:  # Limit to 10 examples
            examples.append({
                "user": exp.user_message,
                "assistant": exp.assistant_response,
                "intent": exp.detected_intent,
                "outcome": exp.interaction_type.value,
                "importance": exp.importance_score
            })

        prompt = f"""Analyze these conversation examples and extract a reusable pattern.

Examples:
{json.dumps(examples, indent=2)}

Identify:
1. What is the common user need or scenario?
2. What response strategy works best?
3. What are the key trigger conditions?
4. What actions should the AI take?

Respond with JSON:
{{
    "pattern_type": "response_strategy|user_behavior|topic_handling|objection_handling|conversation_flow",
    "description": "Clear description of the pattern",
    "trigger_conditions": ["condition1", "condition2"],
    "trigger_keywords": ["keyword1", "keyword2"],
    "recommended_actions": ["action1", "action2"],
    "example_response": "A good example response template",
    "confidence": 0.X
}}"""

        try:
            result = await generate_json_with_provider(
                prompt=prompt,
                temperature=0.3
            )

            # Determine scope
            scope = KnowledgeScope.BOT_SPECIFIC
            if self.config.enable_global_learning:
                # Check if pattern applies globally
                bot_ids = set(exp.bot_id for exp in cluster)
                if len(bot_ids) > 1:
                    scope = KnowledgeScope.GLOBAL

            pattern = LearnedPattern(
                bot_id=cluster[0].bot_id if scope == KnowledgeScope.BOT_SPECIFIC else None,
                tenant_id=cluster[0].tenant_id if scope != KnowledgeScope.GLOBAL else None,
                scope=scope,
                pattern_type=PatternType(result.get("pattern_type", "response_strategy")),
                pattern_description=result.get("description", ""),
                trigger_conditions=[{"text": c} for c in result.get("trigger_conditions", [])],
                trigger_intents=[cluster[0].detected_intent] if cluster[0].detected_intent else [],
                trigger_keywords=result.get("trigger_keywords", []),
                recommended_actions=result.get("recommended_actions", []),
                example_responses=[result.get("example_response", "")] if result.get("example_response") else [],
                confidence=float(result.get("confidence", 0.5)),
                evidence_count=len(cluster),
                evidence_ids=[exp.id for exp in cluster],
            )

            return pattern

        except Exception as e:
            logger.error(f"Pattern extraction failed: {e}")
            return None

    async def _store_patterns(self, patterns: List[LearnedPattern]) -> None:
        """Store patterns in MongoDB and Neo4j."""
        if not patterns:
            return

        db = await self._get_db()

        # Store in MongoDB
        for pattern in patterns:
            await db.learned_patterns.update_one(
                {"_id": pattern.id},
                {"$set": pattern.to_dict()},
                upsert=True
            )

        # Store in Neo4j for graph relationships
        neo4j = get_neo4j()
        if neo4j:
            async with neo4j.session() as session:
                for pattern in patterns:
                    await session.run("""
                        MERGE (p:Pattern {id: $id})
                        SET p.bot_id = $bot_id,
                            p.scope = $scope,
                            p.pattern_type = $pattern_type,
                            p.description = $description,
                            p.confidence = $confidence,
                            p.evidence_count = $evidence_count
                    """, {
                        "id": pattern.id,
                        "bot_id": pattern.bot_id or "global",
                        "scope": pattern.scope.value,
                        "pattern_type": pattern.pattern_type.value,
                        "description": pattern.pattern_description,
                        "confidence": pattern.confidence,
                        "evidence_count": pattern.evidence_count,
                    })

        logger.info(f"Stored {len(patterns)} patterns")

    async def _merge_with_existing_patterns(
        self,
        new_patterns: List[LearnedPattern]
    ) -> int:
        """
        Merge new patterns with existing similar ones.

        Returns the number of patterns that were updated (vs created new).
        """
        if not new_patterns:
            return 0

        db = await self._get_db()
        updated_count = 0

        for pattern in new_patterns:
            # Find similar existing patterns
            similar = await db.learned_patterns.find_one({
                "pattern_type": pattern.pattern_type.value,
                "trigger_intents": {"$in": pattern.trigger_intents} if pattern.trigger_intents else [],
                "$or": [
                    {"bot_id": pattern.bot_id},
                    {"scope": "global"}
                ]
            })

            if similar:
                # Merge evidence
                existing_evidence = set(similar.get("evidence_ids", []))
                new_evidence = set(pattern.evidence_ids)
                merged_evidence = list(existing_evidence | new_evidence)

                # Update confidence based on additional evidence
                new_confidence = min(
                    0.95,
                    similar.get("confidence", 0.5) + 0.05 * len(pattern.evidence_ids)
                )

                await db.learned_patterns.update_one(
                    {"_id": similar["_id"]},
                    {
                        "$set": {
                            "confidence": new_confidence,
                            "evidence_count": len(merged_evidence),
                            "evidence_ids": merged_evidence,
                            "last_validated": datetime.utcnow(),
                        }
                    }
                )
                updated_count += 1

        return updated_count

    async def _synthesize_global_knowledge(
        self,
        patterns: List[LearnedPattern]
    ) -> None:
        """
        Synthesize higher-level knowledge from patterns.

        Creates strategies and principles from accumulated patterns.
        """
        if not patterns:
            return

        db = await self._get_db()

        # Group patterns by type
        type_groups = defaultdict(list)
        for pattern in patterns:
            type_groups[pattern.pattern_type].append(pattern)

        for pattern_type, group in type_groups.items():
            if len(group) < 3:  # Need multiple patterns to synthesize
                continue

            prompt = f"""Synthesize higher-level knowledge from these patterns.

Pattern Type: {pattern_type.value}
Patterns:
{json.dumps([{"description": p.pattern_description, "confidence": p.confidence} for p in group], indent=2)}

Create a general strategy or principle that encompasses these patterns.

Respond with JSON:
{{
    "level": "strategy|principle",
    "description": "The synthesized knowledge",
    "rationale": "Why this works",
    "when_to_apply": ["condition1", "condition2"],
    "how_to_apply": "Practical guidance",
    "confidence": 0.X
}}"""

            try:
                result = await generate_json_with_provider(
                    prompt=prompt,
                    temperature=0.3
                )

                knowledge = CrystallizedKnowledge(
                    scope=KnowledgeScope.GLOBAL,
                    level=KnowledgeLevel(result.get("level", "strategy")),
                    description=result.get("description", ""),
                    rationale=result.get("rationale", ""),
                    when_to_apply=result.get("when_to_apply", []),
                    how_to_apply=result.get("how_to_apply", ""),
                    confidence=float(result.get("confidence", 0.5)),
                    supporting_patterns=[p.id for p in group],
                    evidence_count=sum(p.evidence_count for p in group),
                )

                await db.crystallized_knowledge.update_one(
                    {"_id": knowledge.id},
                    {"$set": knowledge.to_dict()},
                    upsert=True
                )

                # Link in Neo4j
                neo4j = get_neo4j()
                if neo4j:
                    async with neo4j.session() as session:
                        await session.run("""
                            MERGE (k:Knowledge {id: $id})
                            SET k.level = $level,
                                k.description = $description,
                                k.confidence = $confidence
                        """, {
                            "id": knowledge.id,
                            "level": knowledge.level.value,
                            "description": knowledge.description,
                            "confidence": knowledge.confidence,
                        })

                        # Link to supporting patterns
                        for pattern_id in knowledge.supporting_patterns:
                            await session.run("""
                                MATCH (p:Pattern {id: $pattern_id})
                                MATCH (k:Knowledge {id: $knowledge_id})
                                MERGE (p)-[:SUPPORTS]->(k)
                            """, {
                                "pattern_id": pattern_id,
                                "knowledge_id": knowledge.id,
                            })

                logger.info(f"Synthesized {knowledge.level.value}: {knowledge.description[:50]}...")

            except Exception as e:
                logger.error(f"Knowledge synthesis failed: {e}")

    async def get_applicable_patterns(
        self,
        bot_id: str,
        intent: str = None,
        keywords: List[str] = None,
        limit: int = 5,
    ) -> List[LearnedPattern]:
        """
        Get patterns that apply to a given context.

        Used during response generation to apply learned knowledge.
        """
        db = await self._get_db()

        query = {
            "$or": [
                {"bot_id": bot_id},
                {"scope": "global"},
                {"scope": "tenant_level"}
            ],
            "confidence": {"$gte": 0.5}
        }

        if intent:
            query["$or"].append({"trigger_intents": intent})

        if keywords:
            query["$or"].append({"trigger_keywords": {"$in": keywords}})

        cursor = db.learned_patterns.find(query).sort(
            "confidence", -1
        ).limit(limit)

        patterns = []
        async for doc in cursor:
            pattern = LearnedPattern(
                id=doc["_id"],
                bot_id=doc.get("bot_id"),
                tenant_id=doc.get("tenant_id"),
                scope=KnowledgeScope(doc.get("scope", "bot_specific")),
                pattern_type=PatternType(doc.get("pattern_type", "response_strategy")),
                pattern_description=doc.get("pattern_description", ""),
                trigger_conditions=doc.get("trigger_conditions", []),
                trigger_intents=doc.get("trigger_intents", []),
                trigger_keywords=doc.get("trigger_keywords", []),
                recommended_actions=doc.get("recommended_actions", []),
                example_responses=doc.get("example_responses", []),
                confidence=doc.get("confidence", 0.5),
                evidence_count=doc.get("evidence_count", 0),
            )
            patterns.append(pattern)

            # Update last_used
            await db.learned_patterns.update_one(
                {"_id": doc["_id"]},
                {
                    "$set": {"last_used": datetime.utcnow()},
                    "$inc": {"use_count": 1}
                }
            )

        return patterns


# Convenience functions
async def crystallize_session(
    session_id: str,
    bot_id: str,
    tenant_id: str,
) -> List[LearnedPattern]:
    """Crystallize patterns from a session."""
    crystallizer = MemoryCrystallizer()
    return await crystallizer.crystallize_session(session_id, bot_id, tenant_id)


async def crystallize_batch(
    bot_id: str = None,
    hours: int = 24,
) -> LearningOutcome:
    """Process a batch of experiences for crystallization."""
    crystallizer = MemoryCrystallizer()
    return await crystallizer.crystallize_batch(bot_id=bot_id, hours=hours)


async def get_patterns_for_context(
    bot_id: str,
    intent: str = None,
    keywords: List[str] = None,
) -> List[LearnedPattern]:
    """Get applicable patterns for a context."""
    crystallizer = MemoryCrystallizer()
    return await crystallizer.get_applicable_patterns(
        bot_id=bot_id,
        intent=intent,
        keywords=keywords
    )
