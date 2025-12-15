# Intelligence Layer - Quick Reference

## Import

```python
from app.services.context import (
    IntentTracker,
    StageDetector,
    UserProfileManager,
    detect_intent,
    detect_stage
)
```

## Intent Tracker

```python
# Detect intent
result = await detect_intent("What are your prices?")
# {'intent': 'pricing', 'confidence': 0.85, 'secondary_intent': None, 'keywords': ['prices']}

# Track intents
tracker = IntentTracker()
tracker.add_intent(result['intent'], result['confidence'], message)
print(tracker.get_dominant_intent())  # Most important intent
print(tracker.predict_next_intent())  # Likely next intent

# Serialize
data = tracker.to_dict()
restored = IntentTracker.from_dict(data)
```

**Intent Categories**: greeting, inquiry, technical, pricing, comparison, objection, commitment, support, feedback, closing

## Stage Detector

```python
# Detect stage
stage, confidence = await detect_stage(
    conversation_history=[...],
    intent_history=['greeting', 'inquiry', 'pricing']
)

# Track stages
detector = StageDetector()
detector.update_stage(stage, confidence)
print(detector.get_prompt_guidance())  # LLM guidance
print(detector.is_progressing())  # Moving forward?

# Serialize
data = detector.to_dict()
restored = StageDetector.from_dict(data)
```

**Stages**: greeting → discovery → solution → pricing → objection_handling → closing

## User Profile Manager

```python
# Initialize
manager = UserProfileManager(tenant_id="...", bot_id="...")

# Get or create profile
profile, is_new = await manager.get_or_create_profile(
    email="user@example.com",
    initial_facts={"name": "John"}
)

# Update facts
await manager.update_profile_facts(
    profile_id=profile["_id"],
    new_facts={"company": "Acme", "interested_in": "API"}
)

# Add session summary
await manager.add_session_summary(
    profile_id=profile["_id"],
    session_id="session_123",
    summary="User asked about pricing...",
    key_topics=["pricing", "API"],
    outcome="interested"
)

# Update behavior
await manager.update_behavior_metrics(
    profile_id=profile["_id"],
    session_sentiment="positive",
    message_count=10
)

# Get context for LLM
context = await manager.get_profile_context(profile["_id"])
llm_prompt = context["formatted_prompt"]

# Search profiles (admin)
results = await manager.search_profiles(query="john", limit=20)
```

## Setup (Run Once on Startup)

```python
from app.services.context.user_profile_manager import ensure_indexes

# Create MongoDB indexes
await ensure_indexes()
```

## Performance

- Intent Detection: ~20-50ms
- Stage Detection: ~10-30ms
- Profile Operations: ~10-40ms (with indexes)

## Language Support

**Arabic Keywords**: مرحبا، السلام، سعر، تكلفة، ازاي، كيف، مهتم، عايز اعرف

**English**: Full support for all categories
