"""
Adaptive Prompt Evolution Engine (APEX) for AIDEN

PATENT CLAIM: A system for automatically evolving prompts for external LLM APIs
based on performance feedback, comprising:
(a) a modular prompt component structure
(b) genetic algorithm-inspired variation generation
(c) shadow A/B testing infrastructure
(d) fitness-based selection promoting high-performing variants
"""

from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import random
import uuid
import json
import logging

from .base import LearningConfig, LearningOutcome
from .llm_provider import generate_with_provider, generate_json_with_provider
from ...core.database import get_mongodb

logger = logging.getLogger(__name__)


@dataclass
class PromptComponent:
    """A modular component of a prompt that can be evolved."""
    name: str
    content: str
    importance: float = 1.0  # Higher = less likely to mutate
    variants: List[str] = field(default_factory=list)


@dataclass
class PromptVariant:
    """A complete prompt variant for testing."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    bot_id: str = ""
    components: Dict[str, str] = field(default_factory=dict)

    # Metrics
    sample_size: int = 0
    avg_quality_score: float = 0.0
    avg_user_satisfaction: float = 0.0
    conversion_rate: float = 0.0

    # Lifecycle
    status: str = "testing"  # testing, promoted, retired
    created_at: datetime = field(default_factory=datetime.utcnow)
    promoted_at: Optional[datetime] = None

    def compute_fitness(self) -> float:
        """Compute overall fitness score."""
        if self.sample_size < 10:
            return 0.0  # Not enough data

        # Weighted combination of metrics
        fitness = (
            self.avg_quality_score * 0.4 +
            self.avg_user_satisfaction * 0.4 +
            self.conversion_rate * 0.2
        )
        return fitness

    def to_dict(self) -> Dict[str, Any]:
        return {
            "_id": self.id,
            "bot_id": self.bot_id,
            "components": self.components,
            "sample_size": self.sample_size,
            "avg_quality_score": self.avg_quality_score,
            "avg_user_satisfaction": self.avg_user_satisfaction,
            "conversion_rate": self.conversion_rate,
            "status": self.status,
            "created_at": self.created_at,
            "promoted_at": self.promoted_at,
        }


class AdaptivePromptEvolver:
    """
    Evolves prompts based on performance metrics using genetic algorithm principles.

    Key Innovation: Uses shadow testing to safely experiment with prompt variations
    without impacting user experience.
    """

    # Standard prompt component structure
    COMPONENT_STRUCTURE = {
        "persona": {
            "description": "Who the AI is and its personality",
            "importance": 0.8,
            "default": "You are a helpful AI assistant.",
        },
        "instructions": {
            "description": "How the AI should behave and respond",
            "importance": 0.9,
            "default": "Be concise, helpful, and professional.",
        },
        "context_format": {
            "description": "How to use provided context",
            "importance": 0.7,
            "default": "Use the context below to answer questions accurately.",
        },
        "response_style": {
            "description": "Output format and style guidelines",
            "importance": 0.6,
            "default": "Respond in a friendly, conversational tone.",
        },
        "guardrails": {
            "description": "Safety constraints and limitations",
            "importance": 1.0,  # Never mutate safety
            "default": "Never share harmful content or make up information.",
        },
    }

    def __init__(self, config: LearningConfig = None):
        self.config = config or LearningConfig()
        self.db = None

    async def _get_db(self):
        if self.db is None:
            self.db = get_mongodb()
        return self.db

    async def evolve_prompt(
        self,
        bot_id: str,
        current_prompt: str = None,
    ) -> PromptVariant:
        """
        Evolve the prompt for a bot based on performance data.

        Uses shadow testing: generates variants but doesn't automatically deploy.
        """
        db = await self._get_db()

        # Get current best variant or create from current prompt
        current_best = await self._get_best_variant(bot_id)

        if not current_best:
            # Parse current prompt into components
            current_best = await self._parse_prompt_into_variant(
                bot_id, current_prompt or ""
            )
            await self._store_variant(current_best)

        # Check if we have enough data
        if current_best.sample_size < 50:
            logger.info(f"Not enough data for evolution (have {current_best.sample_size}, need 50)")
            return current_best

        # Generate new variants through mutation and crossover
        variants = await self._generate_variants(current_best, count=3)

        # Store variants for shadow testing
        for variant in variants:
            await self._store_variant(variant)

        logger.info(f"Generated {len(variants)} prompt variants for bot {bot_id}")
        return current_best

    async def shadow_test(
        self,
        bot_id: str,
        user_message: str,
        context: List[Dict[str, Any]],
        conversation_history: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """
        Generate shadow responses using all active variants.

        The primary response uses the production prompt.
        Shadow responses are generated but not shown to users.
        """
        db = await self._get_db()

        # Get testing variants
        cursor = db.prompt_variants.find({
            "bot_id": bot_id,
            "status": "testing"
        })

        variants = []
        async for doc in cursor:
            variants.append(PromptVariant(
                id=doc["_id"],
                bot_id=doc["bot_id"],
                components=doc["components"],
                sample_size=doc.get("sample_size", 0),
                avg_quality_score=doc.get("avg_quality_score", 0),
                status=doc["status"],
            ))

        if not variants:
            return {"shadow_responses": []}

        # Generate shadow responses (limited to 2 to save costs)
        shadow_responses = []
        for variant in variants[:2]:
            try:
                prompt = self._assemble_prompt(variant.components, context)
                response = await generate_with_provider(
                    prompt=user_message,
                    system_prompt=prompt,
                    temperature=0.7,
                    max_tokens=512
                )
                shadow_responses.append({
                    "variant_id": variant.id,
                    "response": response,
                    "components": variant.components
                })
            except Exception as e:
                logger.warning(f"Shadow response failed for variant {variant.id}: {e}")

        return {"shadow_responses": shadow_responses}

    async def record_shadow_result(
        self,
        variant_id: str,
        quality_score: float,
        user_satisfaction: float = None,
        conversion: bool = False,
    ) -> None:
        """Record the quality of a shadow response."""
        db = await self._get_db()

        # Get current variant stats
        variant = await db.prompt_variants.find_one({"_id": variant_id})
        if not variant:
            return

        # Update running averages
        n = variant.get("sample_size", 0) + 1
        old_quality = variant.get("avg_quality_score", 0)
        new_quality = old_quality + (quality_score - old_quality) / n

        updates = {
            "sample_size": n,
            "avg_quality_score": new_quality,
        }

        if user_satisfaction is not None:
            old_sat = variant.get("avg_user_satisfaction", 0)
            new_sat = old_sat + (user_satisfaction - old_sat) / n
            updates["avg_user_satisfaction"] = new_sat

        if conversion:
            old_conv = variant.get("conversion_count", 0)
            updates["conversion_count"] = old_conv + 1
            updates["conversion_rate"] = (old_conv + 1) / n

        await db.prompt_variants.update_one(
            {"_id": variant_id},
            {"$set": updates}
        )

    async def evaluate_and_promote(
        self,
        bot_id: str,
    ) -> Optional[PromptVariant]:
        """
        Evaluate all variants and promote the best one if it beats the baseline.

        Returns the promoted variant if promotion occurred.
        """
        db = await self._get_db()

        # Get all testing variants with enough samples
        cursor = db.prompt_variants.find({
            "bot_id": bot_id,
            "sample_size": {"$gte": 100}  # Minimum samples for evaluation
        })

        variants = []
        async for doc in cursor:
            variant = PromptVariant(
                id=doc["_id"],
                bot_id=doc["bot_id"],
                components=doc["components"],
                sample_size=doc.get("sample_size", 0),
                avg_quality_score=doc.get("avg_quality_score", 0),
                avg_user_satisfaction=doc.get("avg_user_satisfaction", 0),
                conversion_rate=doc.get("conversion_rate", 0),
                status=doc["status"],
            )
            variants.append(variant)

        if len(variants) < 2:
            return None

        # Find current production variant
        production = next((v for v in variants if v.status == "promoted"), None)
        if not production:
            production = variants[0]

        # Find best testing variant
        testing = [v for v in variants if v.status == "testing"]
        if not testing:
            return None

        testing.sort(key=lambda v: v.compute_fitness(), reverse=True)
        best_candidate = testing[0]

        # Check if improvement exceeds threshold
        production_fitness = production.compute_fitness()
        candidate_fitness = best_candidate.compute_fitness()
        improvement = (candidate_fitness - production_fitness) / max(production_fitness, 0.01)

        if improvement >= self.config.promotion_threshold:
            # Promote the candidate
            await db.prompt_variants.update_one(
                {"_id": best_candidate.id},
                {
                    "$set": {
                        "status": "promoted",
                        "promoted_at": datetime.utcnow()
                    }
                }
            )

            # Retire old production
            if production:
                await db.prompt_variants.update_one(
                    {"_id": production.id},
                    {"$set": {"status": "retired"}}
                )

            # Update bot's system prompt
            new_prompt = self._assemble_prompt(best_candidate.components)
            await db.chatbots.update_one(
                {"_id": bot_id},
                {
                    "$set": {
                        "system_prompt": new_prompt,
                        "prompt_evolved_at": datetime.utcnow(),
                        "prompt_variant_id": best_candidate.id
                    }
                }
            )

            logger.info(
                f"Promoted prompt variant {best_candidate.id} for bot {bot_id} "
                f"(improvement: {improvement*100:.1f}%)"
            )
            return best_candidate

        # Retire underperforming variants
        for variant in testing:
            if variant.compute_fitness() < production_fitness * 0.8:
                await db.prompt_variants.update_one(
                    {"_id": variant.id},
                    {"$set": {"status": "retired"}}
                )

        return None

    async def _get_best_variant(self, bot_id: str) -> Optional[PromptVariant]:
        """Get the current best (promoted) variant for a bot."""
        db = await self._get_db()

        doc = await db.prompt_variants.find_one({
            "bot_id": bot_id,
            "status": "promoted"
        })

        if doc:
            return PromptVariant(
                id=doc["_id"],
                bot_id=doc["bot_id"],
                components=doc["components"],
                sample_size=doc.get("sample_size", 0),
                avg_quality_score=doc.get("avg_quality_score", 0),
                avg_user_satisfaction=doc.get("avg_user_satisfaction", 0),
                conversion_rate=doc.get("conversion_rate", 0),
                status=doc["status"],
            )
        return None

    async def _parse_prompt_into_variant(
        self,
        bot_id: str,
        prompt: str
    ) -> PromptVariant:
        """Parse an existing prompt into component structure."""

        # Use LLM to decompose the prompt
        parse_prompt = f"""Decompose this system prompt into structured components.

System Prompt:
{prompt}

Categories to extract:
1. persona: Who the AI is and its personality
2. instructions: How to behave and respond
3. context_format: How to use context/knowledge base
4. response_style: Output format and style
5. guardrails: Safety constraints

Respond with JSON:
{{
    "persona": "...",
    "instructions": "...",
    "context_format": "...",
    "response_style": "...",
    "guardrails": "..."
}}"""

        try:
            components = await generate_json_with_provider(
                prompt=parse_prompt,
                temperature=0.3
            )
        except Exception:
            # Fallback to defaults
            components = {
                name: info["default"]
                for name, info in self.COMPONENT_STRUCTURE.items()
            }

        return PromptVariant(
            bot_id=bot_id,
            components=components,
            status="promoted"  # Baseline is automatically promoted
        )

    async def _generate_variants(
        self,
        base: PromptVariant,
        count: int = 3
    ) -> List[PromptVariant]:
        """Generate new variants through mutation and crossover."""
        variants = []

        for i in range(count):
            if i == 0:
                # First variant: targeted mutation based on weaknesses
                variant = await self._mutate_targeted(base)
            elif i == 1:
                # Second variant: random mutation
                variant = await self._mutate_random(base)
            else:
                # Other variants: crossover with known good patterns
                variant = await self._crossover_with_patterns(base)

            if variant:
                variants.append(variant)

        return variants

    async def _mutate_targeted(self, base: PromptVariant) -> PromptVariant:
        """Generate a mutation targeting specific weaknesses."""

        # Identify weakness based on metrics
        weakness = "general"
        if base.avg_quality_score < 0.6:
            weakness = "quality"
        elif base.avg_user_satisfaction < 0.6:
            weakness = "satisfaction"
        elif base.conversion_rate < 0.1:
            weakness = "conversion"

        prompt = f"""Improve this AI system prompt to address {weakness} issues.

Current Components:
{json.dumps(base.components, indent=2)}

Generate improved versions focusing on {weakness}.
Keep the core meaning but make it more effective.

Respond with JSON containing only the components you're improving:
{{
    "component_name": "improved version",
    ...
}}"""

        try:
            improvements = await generate_json_with_provider(
                prompt=prompt,
                temperature=0.7
            )

            new_components = base.components.copy()
            for key, value in improvements.items():
                if key in new_components and key != "guardrails":  # Never mutate safety
                    new_components[key] = value

            return PromptVariant(
                bot_id=base.bot_id,
                components=new_components,
                status="testing"
            )

        except Exception as e:
            logger.warning(f"Targeted mutation failed: {e}")
            return None

    async def _mutate_random(self, base: PromptVariant) -> PromptVariant:
        """Generate a random mutation."""

        # Select a component to mutate (weighted by inverse importance)
        mutable = [
            (name, info) for name, info in self.COMPONENT_STRUCTURE.items()
            if info["importance"] < 1.0  # Skip safety guardrails
        ]

        weights = [1 / info["importance"] for _, info in mutable]
        total = sum(weights)
        weights = [w / total for w in weights]

        selected_component = random.choices(
            [name for name, _ in mutable],
            weights=weights,
            k=1
        )[0]

        prompt = f"""Create an alternative version of this {selected_component} component for an AI system prompt.

Current version:
{base.components.get(selected_component, '')}

Create a meaningfully different but equally effective alternative.
Focus on: clarity, effectiveness, and user engagement.

Respond with just the new text, no JSON."""

        try:
            new_version = await generate_with_provider(
                prompt=prompt,
                temperature=0.8,
                max_tokens=200
            )

            new_components = base.components.copy()
            new_components[selected_component] = new_version.strip()

            return PromptVariant(
                bot_id=base.bot_id,
                components=new_components,
                status="testing"
            )

        except Exception as e:
            logger.warning(f"Random mutation failed: {e}")
            return None

    async def _crossover_with_patterns(self, base: PromptVariant) -> PromptVariant:
        """Generate a variant by crossing with learned patterns."""
        db = await self._get_db()

        # Get high-performing patterns
        patterns = await db.learned_patterns.find({
            "$or": [
                {"bot_id": base.bot_id},
                {"scope": "global"}
            ],
            "confidence": {"$gte": 0.7}
        }).limit(5).to_list(length=5)

        if not patterns:
            return await self._mutate_random(base)

        # Extract guidance from patterns
        pattern_guidance = [p.get("recommended_actions", []) for p in patterns]
        flat_guidance = [item for sublist in pattern_guidance for item in sublist]

        if not flat_guidance:
            return await self._mutate_random(base)

        prompt = f"""Incorporate these learned best practices into the AI instructions.

Current Instructions:
{base.components.get('instructions', '')}

Learned Best Practices:
{json.dumps(flat_guidance[:10], indent=2)}

Create an improved version that incorporates these practices naturally.
Respond with just the new instructions text."""

        try:
            new_instructions = await generate_with_provider(
                prompt=prompt,
                temperature=0.6,
                max_tokens=300
            )

            new_components = base.components.copy()
            new_components["instructions"] = new_instructions.strip()

            return PromptVariant(
                bot_id=base.bot_id,
                components=new_components,
                status="testing"
            )

        except Exception as e:
            logger.warning(f"Crossover failed: {e}")
            return None

    async def _store_variant(self, variant: PromptVariant) -> None:
        """Store a variant in the database."""
        db = await self._get_db()
        await db.prompt_variants.update_one(
            {"_id": variant.id},
            {"$set": variant.to_dict()},
            upsert=True
        )

    def _assemble_prompt(
        self,
        components: Dict[str, str],
        context: List[Dict[str, Any]] = None
    ) -> str:
        """Assemble a complete prompt from components."""
        parts = []

        if "persona" in components:
            parts.append(components["persona"])

        if "instructions" in components:
            parts.append(f"\n## Instructions\n{components['instructions']}")

        if "context_format" in components and context:
            context_text = "\n".join([
                f"[Source {i+1}]: {c.get('content', '')}"
                for i, c in enumerate(context)
            ])
            parts.append(f"\n## Context\n{components['context_format']}\n\n{context_text}")

        if "response_style" in components:
            parts.append(f"\n## Response Style\n{components['response_style']}")

        if "guardrails" in components:
            parts.append(f"\n## Important\n{components['guardrails']}")

        return "\n".join(parts)


# Convenience functions
async def evolve_prompt(bot_id: str, current_prompt: str = None) -> PromptVariant:
    """Evolve the prompt for a bot."""
    evolver = AdaptivePromptEvolver()
    return await evolver.evolve_prompt(bot_id, current_prompt)


async def shadow_test_prompts(
    bot_id: str,
    user_message: str,
    context: List[Dict[str, Any]],
    history: List[Dict[str, str]],
) -> Dict[str, Any]:
    """Run shadow tests with prompt variants."""
    evolver = AdaptivePromptEvolver()
    return await evolver.shadow_test(bot_id, user_message, context, history)
