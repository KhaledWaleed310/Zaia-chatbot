"""
Knowledge Synthesis Engine for AIDEN

PATENT CLAIM: A system for automatically synthesizing generalizable knowledge
from accumulated conversational experiences using hierarchical abstraction.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import json
import logging

from .base import (
    LearningExperience,
    LearnedPattern,
    CrystallizedKnowledge,
    KnowledgeLevel,
    KnowledgeScope,
    PatternType,
    LearningConfig,
    LearningOutcome,
)
from .llm_provider import generate_json_with_provider
from ...core.database import get_mongodb, get_neo4j

logger = logging.getLogger(__name__)


class KnowledgeSynthesizer:
    """
    Synthesizes high-level knowledge from accumulated experiences.

    Knowledge Hierarchy:
    1. Facts: Specific information
    2. Patterns: Repeated behaviors
    3. Strategies: Response approaches
    4. Principles: Universal rules
    """

    def __init__(self, config: LearningConfig = None):
        self.config = config or LearningConfig()
        self.db = None

    async def _get_db(self):
        if self.db is None:
            self.db = get_mongodb()
        return self.db

    async def synthesize_knowledge(
        self,
        bot_id: str = None,
        scope: KnowledgeScope = None
    ) -> LearningOutcome:
        """
        Synthesize knowledge from patterns and experiences.

        This creates higher-level strategies and principles from
        accumulated patterns.
        """
        outcome = LearningOutcome(operation="knowledge_synthesis")
        start_time = datetime.utcnow()

        try:
            db = await self._get_db()

            # 1. Gather patterns
            query = {"confidence": {"$gte": 0.6}}
            if bot_id:
                query["$or"] = [
                    {"bot_id": bot_id},
                    {"scope": "global"}
                ]

            patterns = []
            cursor = db.learned_patterns.find(query)
            async for doc in cursor:
                patterns.append(self._doc_to_pattern(doc))

            if not patterns:
                logger.info("No patterns available for synthesis")
                return outcome

            outcome.items_processed = len(patterns)

            # 2. Group patterns by type
            type_groups = defaultdict(list)
            for pattern in patterns:
                type_groups[pattern.pattern_type].append(pattern)

            # 3. Synthesize strategies from pattern groups
            strategies = []
            for pattern_type, group in type_groups.items():
                if len(group) >= self.config.synthesis_min_cluster_size:
                    strategy = await self._synthesize_strategy(group, pattern_type)
                    if strategy:
                        strategies.append(strategy)

            # 4. Synthesize principles from strategies
            principles = []
            if len(strategies) >= 3:
                principle = await self._synthesize_principles(strategies)
                if principle:
                    principles.append(principle)

            # 5. Store synthesized knowledge
            for strategy in strategies:
                await self._store_knowledge(strategy)
            for principle in principles:
                await self._store_knowledge(principle)

            # 6. Update knowledge graph
            await self._update_knowledge_graph(strategies, principles)

            outcome.patterns_created = len(strategies) + len(principles)
            outcome.details = {
                "strategies_created": len(strategies),
                "principles_created": len(principles),
                "patterns_analyzed": len(patterns)
            }

            outcome.success = True
            outcome.completed_at = datetime.utcnow()
            outcome.duration_seconds = (outcome.completed_at - start_time).total_seconds()

            logger.info(
                f"Knowledge synthesis complete: {len(strategies)} strategies, "
                f"{len(principles)} principles created"
            )

        except Exception as e:
            logger.error(f"Knowledge synthesis failed: {e}", exc_info=True)
            outcome.success = False
            outcome.errors.append(str(e))

        return outcome

    async def _synthesize_strategy(
        self,
        patterns: List[LearnedPattern],
        pattern_type: PatternType
    ) -> Optional[CrystallizedKnowledge]:
        """Synthesize a strategy from a group of patterns."""

        # Prepare pattern summaries
        pattern_summaries = [
            {
                "description": p.pattern_description,
                "actions": p.recommended_actions,
                "confidence": p.confidence,
                "evidence": p.evidence_count
            }
            for p in patterns[:10]  # Limit to top 10
        ]

        prompt = f"""Synthesize a high-level strategy from these related patterns.

Pattern Type: {pattern_type.value}

Patterns:
{json.dumps(pattern_summaries, indent=2)}

Create a strategy that:
1. Captures the common approach across these patterns
2. Provides actionable guidance
3. Explains when and how to apply it

Respond with JSON:
{{
    "description": "Clear strategy description",
    "rationale": "Why this strategy works",
    "when_to_apply": ["condition1", "condition2"],
    "how_to_apply": "Step-by-step guidance",
    "example": {{
        "situation": "Example scenario",
        "application": "How to apply the strategy"
    }},
    "confidence": 0.X
}}"""

        try:
            result = await generate_json_with_provider(
                prompt=prompt,
                temperature=0.4
            )

            strategy = CrystallizedKnowledge(
                scope=KnowledgeScope.GLOBAL if self.config.enable_global_learning else KnowledgeScope.BOT_SPECIFIC,
                level=KnowledgeLevel.STRATEGY,
                description=result.get("description", ""),
                rationale=result.get("rationale", ""),
                when_to_apply=result.get("when_to_apply", []),
                how_to_apply=result.get("how_to_apply", ""),
                example_applications=[result.get("example", {})] if result.get("example") else [],
                confidence=float(result.get("confidence", 0.5)),
                supporting_patterns=[p.id for p in patterns],
                evidence_count=sum(p.evidence_count for p in patterns),
            )

            return strategy

        except Exception as e:
            logger.error(f"Strategy synthesis failed: {e}")
            return None

    async def _synthesize_principles(
        self,
        strategies: List[CrystallizedKnowledge]
    ) -> Optional[CrystallizedKnowledge]:
        """Synthesize a universal principle from strategies."""

        strategy_summaries = [
            {
                "description": s.description,
                "rationale": s.rationale,
                "confidence": s.confidence
            }
            for s in strategies[:10]
        ]

        prompt = f"""Synthesize a universal principle from these strategies.

Strategies:
{json.dumps(strategy_summaries, indent=2)}

Create a principle that:
1. Is universally applicable across different scenarios
2. Captures a fundamental truth about effective AI communication
3. Is memorable and actionable

Respond with JSON:
{{
    "description": "The principle in one clear sentence",
    "rationale": "Why this principle matters",
    "applications": ["How it applies in different contexts"],
    "confidence": 0.X
}}"""

        try:
            result = await generate_json_with_provider(
                prompt=prompt,
                temperature=0.3
            )

            principle = CrystallizedKnowledge(
                scope=KnowledgeScope.GLOBAL,
                level=KnowledgeLevel.PRINCIPLE,
                description=result.get("description", ""),
                rationale=result.get("rationale", ""),
                when_to_apply=result.get("applications", []),
                how_to_apply="Apply this principle universally when interacting with users.",
                confidence=float(result.get("confidence", 0.5)),
                supporting_patterns=[],  # Linked through strategies
                evidence_count=sum(s.evidence_count for s in strategies),
            )

            return principle

        except Exception as e:
            logger.error(f"Principle synthesis failed: {e}")
            return None

    async def _store_knowledge(self, knowledge: CrystallizedKnowledge) -> None:
        """Store synthesized knowledge in MongoDB."""
        db = await self._get_db()

        await db.crystallized_knowledge.update_one(
            {"_id": knowledge.id},
            {"$set": knowledge.to_dict()},
            upsert=True
        )

    async def _update_knowledge_graph(
        self,
        strategies: List[CrystallizedKnowledge],
        principles: List[CrystallizedKnowledge]
    ) -> None:
        """Update Neo4j knowledge graph with new relationships."""
        neo4j = get_neo4j()
        if not neo4j:
            return

        async with neo4j.session() as session:
            # Create strategy nodes and link to patterns
            for strategy in strategies:
                await session.run("""
                    MERGE (s:Strategy {id: $id})
                    SET s.description = $description,
                        s.level = $level,
                        s.confidence = $confidence
                """, {
                    "id": strategy.id,
                    "description": strategy.description,
                    "level": strategy.level.value,
                    "confidence": strategy.confidence,
                })

                # Link to supporting patterns
                for pattern_id in strategy.supporting_patterns:
                    await session.run("""
                        MATCH (p:Pattern {id: $pattern_id})
                        MATCH (s:Strategy {id: $strategy_id})
                        MERGE (p)-[:SUPPORTS]->(s)
                    """, {
                        "pattern_id": pattern_id,
                        "strategy_id": strategy.id,
                    })

            # Create principle nodes and link to strategies
            for principle in principles:
                await session.run("""
                    MERGE (p:Principle {id: $id})
                    SET p.description = $description,
                        p.level = $level,
                        p.confidence = $confidence
                """, {
                    "id": principle.id,
                    "description": principle.description,
                    "level": principle.level.value,
                    "confidence": principle.confidence,
                })

                # Link strategies to principle
                for strategy in strategies:
                    await session.run("""
                        MATCH (s:Strategy {id: $strategy_id})
                        MATCH (p:Principle {id: $principle_id})
                        MERGE (s)-[:SUPPORTS]->(p)
                    """, {
                        "strategy_id": strategy.id,
                        "principle_id": principle.id,
                    })

    def _normalize_scope(self, scope_value: str) -> str:
        """Normalize scope value to valid KnowledgeScope enum value."""
        scope_mapping = {
            "bot": "bot_specific",
            "bot_specific": "bot_specific",
            "tenant": "tenant_level",
            "tenant_level": "tenant_level",
            "global": "global",
        }
        return scope_mapping.get(scope_value, "bot_specific")

    def _doc_to_pattern(self, doc: Dict[str, Any]) -> LearnedPattern:
        """Convert a MongoDB document to a LearnedPattern."""
        return LearnedPattern(
            id=doc["_id"],
            bot_id=doc.get("bot_id"),
            tenant_id=doc.get("tenant_id"),
            scope=KnowledgeScope(self._normalize_scope(doc.get("scope", "bot_specific"))),
            pattern_type=PatternType(doc.get("pattern_type", "response_strategy")),
            pattern_description=doc.get("pattern_description", ""),
            trigger_conditions=doc.get("trigger_conditions", []),
            trigger_intents=doc.get("trigger_intents", []),
            trigger_keywords=doc.get("trigger_keywords", []),
            recommended_actions=doc.get("recommended_actions", []),
            example_responses=doc.get("example_responses", []),
            confidence=doc.get("confidence", 0.5),
            evidence_count=doc.get("evidence_count", 0),
            evidence_ids=doc.get("evidence_ids", []),
        )

    async def get_applicable_knowledge(
        self,
        bot_id: str,
        intent: str = None,
        limit: int = 5
    ) -> List[CrystallizedKnowledge]:
        """Get knowledge applicable to a given context."""
        db = await self._get_db()

        query = {
            "$or": [
                {"scope": "global"},
                {"bot_id": bot_id}
            ],
            "confidence": {"$gte": 0.5}
        }

        cursor = db.crystallized_knowledge.find(query).sort(
            [("level", 1), ("confidence", -1)]  # Principles first, then by confidence
        ).limit(limit)

        knowledge = []
        async for doc in cursor:
            k = CrystallizedKnowledge(
                id=doc["_id"],
                scope=KnowledgeScope(doc.get("scope", "global")),
                level=KnowledgeLevel(doc.get("level", "strategy")),
                description=doc.get("description", ""),
                rationale=doc.get("rationale", ""),
                when_to_apply=doc.get("when_to_apply", []),
                how_to_apply=doc.get("how_to_apply", ""),
                example_applications=doc.get("example_applications", []),
                confidence=doc.get("confidence", 0.5),
            )
            knowledge.append(k)

        return knowledge

    async def format_knowledge_for_prompt(
        self,
        bot_id: str,
        intent: str = None,
        max_tokens: int = 500
    ) -> str:
        """Format applicable knowledge as prompt context."""
        knowledge = await self.get_applicable_knowledge(bot_id, intent)

        if not knowledge:
            return ""

        parts = ["## Learned Best Practices"]

        # Add principles first
        principles = [k for k in knowledge if k.level == KnowledgeLevel.PRINCIPLE]
        if principles:
            parts.append("\n### Principles:")
            for p in principles[:2]:
                parts.append(f"- {p.description}")

        # Add strategies
        strategies = [k for k in knowledge if k.level == KnowledgeLevel.STRATEGY]
        if strategies:
            parts.append("\n### Strategies:")
            for s in strategies[:3]:
                parts.append(f"- {s.description}")
                if s.how_to_apply:
                    parts.append(f"  How: {s.how_to_apply[:100]}...")

        result = "\n".join(parts)

        # Truncate if too long
        if len(result) > max_tokens * 4:  # Rough char to token ratio
            result = result[:max_tokens * 4] + "\n[truncated]"

        return result


# Convenience function
async def synthesize_knowledge(
    bot_id: str = None,
    scope: KnowledgeScope = None
) -> LearningOutcome:
    """Synthesize knowledge from patterns."""
    synthesizer = KnowledgeSynthesizer()
    return await synthesizer.synthesize_knowledge(bot_id, scope)
