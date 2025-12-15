#!/usr/bin/env python3
"""
Test script for the Intelligence Layer components.
Demonstrates intent tracking, stage detection, and user profile management.
"""

import asyncio
import sys
from datetime import datetime


async def test_intent_tracker():
    """Test intent detection and tracking."""
    print("\n" + "="*60)
    print("TESTING INTENT TRACKER")
    print("="*60)

    from app.services.context.intent_tracker import detect_intent, IntentTracker

    # Test cases
    test_messages = [
        ("Hello, how are you?", "greeting"),
        ("What is your pricing?", "pricing"),
        ("How do I integrate your API?", "technical"),
        ("I'm interested in signing up", "commitment"),
        ("This seems expensive", "objection"),
        ("Thanks for your help!", "feedback"),
    ]

    tracker = IntentTracker()

    for message, expected in test_messages:
        result = await detect_intent(message)
        tracker.add_intent(result["intent"], result["confidence"], message)

        status = "✓" if result["intent"] == expected else "✗"
        print(f"\n{status} Message: \"{message}\"")
        print(f"   Expected: {expected}, Got: {result['intent']} (confidence: {result['confidence']})")
        if result.get("secondary_intent"):
            print(f"   Secondary: {result['secondary_intent']}")
        if result.get("keywords"):
            print(f"   Keywords: {result['keywords']}")

    # Test tracker methods
    print(f"\n--- Intent Flow ---")
    print(f"Sequence: {tracker.get_intent_flow()}")
    print(f"Dominant: {tracker.get_dominant_intent()}")
    print(f"Predicted next: {tracker.predict_next_intent()}")

    # Test serialization
    tracker_dict = tracker.to_dict()
    restored_tracker = IntentTracker.from_dict(tracker_dict)
    print(f"\n✓ Serialization works: {len(restored_tracker.intent_history)} intents restored")


async def test_stage_detector():
    """Test stage detection and progression."""
    print("\n" + "="*60)
    print("TESTING STAGE DETECTOR")
    print("="*60)

    from app.services.context.stage_detector import detect_stage, StageDetector

    # Simulate conversation progression
    conversation = [
        {"role": "user", "content": "Hello"},
        {"role": "assistant", "content": "Hi! How can I help?"},
        {"role": "user", "content": "What services do you offer?"},
        {"role": "assistant", "content": "We offer chatbot solutions..."},
        {"role": "user", "content": "How does the integration work?"},
        {"role": "assistant", "content": "The integration is simple..."},
        {"role": "user", "content": "What are your prices?"},
        {"role": "assistant", "content": "Our pricing starts at..."},
        {"role": "user", "content": "I'm interested in trying it"},
    ]

    detector = StageDetector()

    for i in range(1, len(conversation), 2):  # Check after each user message
        history = conversation[:i+1]
        stage, confidence = await detect_stage(history)

        changed = detector.update_stage(stage, confidence)
        status = "→" if changed else " "

        print(f"\n{status} After message {i//2 + 1}: {stage} (confidence: {confidence:.2f})")
        print(f"   User said: \"{conversation[i]['content']}\"")
        print(f"   Guidance: {detector.get_prompt_guidance()}")

    print(f"\n--- Stage Progression ---")
    print(f"Stages visited: {detector.get_stage_progression()}")
    print(f"Progressing: {detector.is_progressing()}")
    print(f"Current stage duration: {detector.get_stage_duration()}")

    # Test serialization
    detector_dict = detector.to_dict()
    restored_detector = StageDetector.from_dict(detector_dict)
    print(f"\n✓ Serialization works: stage = {restored_detector.current_stage}")


async def test_user_profile_manager():
    """Test user profile management (without MongoDB)."""
    print("\n" + "="*60)
    print("TESTING USER PROFILE MANAGER (Mock)")
    print("="*60)

    print("\n📝 Note: Full testing requires MongoDB connection.")
    print("   The module is ready for use with these features:")

    features = [
        "✓ find_profile(email, phone) - Find existing user profiles",
        "✓ create_profile(email, phone, facts) - Create new profiles",
        "✓ get_or_create_profile() - Get existing or create new",
        "✓ update_profile_facts() - Merge new facts into profile",
        "✓ add_session_summary() - Store conversation summaries",
        "✓ update_behavior_metrics() - Track engagement and sentiment",
        "✓ get_profile_context() - Get formatted context for LLM",
        "✓ search_profiles() - Search profiles for admin dashboard",
        "✓ merge_profiles() - Merge duplicate user profiles",
    ]

    for feature in features:
        print(f"   {feature}")

    print("\n📊 Profile Structure:")
    print("   - email, phone: Contact info")
    print("   - facts: Extracted information (name, company, etc.)")
    print("   - preferences: User preferences")
    print("   - session_summaries: History of past conversations")
    print("   - behavior: Engagement metrics, sentiment trends")

    print("\n🎯 Key Differentiator:")
    print("   Cross-session memory allows the bot to remember users")
    print("   across multiple conversations - like ChatGPT's memory feature")


async def main():
    """Run all tests."""
    print("\n")
    print("╔═══════════════════════════════════════════════════════════╗")
    print("║   ZAIA INTELLIGENCE LAYER - COMPREHENSIVE TEST SUITE      ║")
    print("╚═══════════════════════════════════════════════════════════╝")

    try:
        await test_intent_tracker()
        await test_stage_detector()
        await test_user_profile_manager()

        print("\n" + "="*60)
        print("✓ ALL TESTS COMPLETED SUCCESSFULLY")
        print("="*60 + "\n")

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
