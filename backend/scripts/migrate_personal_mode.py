#!/usr/bin/env python3
"""
Database migration script for Personal Chatbot Mode.
Adds indexes for visitor_id queries and sets defaults.
"""

import asyncio
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings


async def migrate():
    """Run database migrations for Personal Mode."""
    print("🚀 Starting Personal Mode database migration...")

    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]

    try:
        # 1. Add index on conversations for visitor_id queries
        print("\n📊 Creating indexes on conversations collection...")
        conversations = db["conversations"]

        # Index for listing conversations by visitor_id and bot_id
        await conversations.create_index(
            [("visitor_id", 1), ("bot_id", 1), ("updated_at", -1)],
            name="visitor_bot_updated_idx",
            background=True
        )
        print("  ✓ Created visitor_bot_updated_idx")

        # 2. Add index on user_profiles for visitor_ids array
        print("\n📊 Creating indexes on user_profiles collection...")
        user_profiles = db["user_profiles"]

        # Index for finding profile by visitor_id
        await user_profiles.create_index(
            [("visitor_ids", 1), ("tenant_id", 1), ("bot_id", 1)],
            name="visitor_ids_tenant_bot_idx",
            background=True
        )
        print("  ✓ Created visitor_ids_tenant_bot_idx")

        # 3. Add index on chatbots for is_personal
        print("\n📊 Creating indexes on chatbots collection...")
        chatbots = db["chatbots"]

        await chatbots.create_index(
            [("is_personal", 1)],
            name="is_personal_idx",
            background=True
        )
        print("  ✓ Created is_personal_idx")

        # 4. Set default values for existing documents
        print("\n📝 Setting default values for existing documents...")

        # Set is_personal = false for existing chatbots
        result = await chatbots.update_many(
            {"is_personal": {"$exists": False}},
            {"$set": {"is_personal": False}}
        )
        print(f"  ✓ Updated {result.modified_count} chatbots with is_personal=false")

        # Set visitor_id = null and title = null for existing conversations
        result = await conversations.update_many(
            {"visitor_id": {"$exists": False}},
            {"$set": {"visitor_id": None, "title": None}}
        )
        print(f"  ✓ Updated {result.modified_count} conversations with visitor_id and title fields")

        # Initialize visitor_ids array for existing profiles
        result = await user_profiles.update_many(
            {"visitor_ids": {"$exists": False}},
            {"$set": {"visitor_ids": []}}
        )
        print(f"  ✓ Updated {result.modified_count} user_profiles with visitor_ids array")

        # 5. Verify indexes
        print("\n🔍 Verifying indexes...")

        conv_indexes = await conversations.index_information()
        print(f"  Conversations indexes: {list(conv_indexes.keys())}")

        profile_indexes = await user_profiles.index_information()
        print(f"  User Profiles indexes: {list(profile_indexes.keys())}")

        bot_indexes = await chatbots.index_information()
        print(f"  Chatbots indexes: {list(bot_indexes.keys())}")

        print("\n✅ Migration completed successfully!")

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        raise
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(migrate())
