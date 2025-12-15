"""
User Profile Manager for Zaia Context System.
Manages cross-session user memory - the key differentiator from ChatGPT.
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import uuid
import logging
from ...core.database import get_mongodb

logger = logging.getLogger(__name__)

# Collection name
PROFILES_COLLECTION = "user_profiles"


class UserProfileManager:
    """
    Manages persistent user profiles across sessions.

    Links users via email or phone from lead capture.
    Stores: facts, preferences, behavior, session summaries.
    """

    def __init__(self, tenant_id: str, bot_id: str):
        self.tenant_id = tenant_id
        self.bot_id = bot_id
        self.db = get_mongodb()

    async def find_profile(
        self,
        email: str = None,
        phone: str = None
    ) -> Optional[Dict[str, Any]]:
        """
        Find existing user profile by email or phone.
        """
        if not email and not phone:
            logger.warning("find_profile called without email or phone")
            return None

        query = {
            "tenant_id": self.tenant_id,
            "bot_id": self.bot_id
        }

        # Build OR query for email/phone
        or_conditions = []
        if email:
            or_conditions.append({"email": email.lower().strip()})
        if phone:
            # Normalize phone (remove spaces, dashes)
            normalized_phone = phone.replace(" ", "").replace("-", "").strip()
            or_conditions.append({"phone": normalized_phone})

        if or_conditions:
            query["$or"] = or_conditions

        try:
            profile = await self.db[PROFILES_COLLECTION].find_one(query)
            return profile
        except Exception as e:
            logger.error(f"Error finding profile: {e}")
            return None

    async def create_profile(
        self,
        email: str = None,
        phone: str = None,
        initial_facts: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Create new user profile.
        """
        profile_id = str(uuid.uuid4())
        now = datetime.utcnow()

        profile = {
            "_id": profile_id,
            "tenant_id": self.tenant_id,
            "bot_id": self.bot_id,
            "email": email.lower().strip() if email else None,
            "phone": phone.replace(" ", "").replace("-", "").strip() if phone else None,
            "facts": initial_facts or {},
            "preferences": {},
            "session_summaries": [],
            "behavior": {
                "total_sessions": 0,
                "total_messages": 0,
                "average_sentiment": None,
                "engagement_level": "new",  # new, active, engaged, disengaged
                "last_sentiment": None
            },
            "created_at": now,
            "updated_at": now
        }

        try:
            await self.db[PROFILES_COLLECTION].insert_one(profile)
            logger.info(f"Created new user profile: {profile_id}")
            return profile
        except Exception as e:
            logger.error(f"Error creating profile: {e}")
            raise

    async def get_or_create_profile(
        self,
        email: str = None,
        phone: str = None,
        initial_facts: Dict[str, Any] = None
    ) -> Tuple[Dict[str, Any], bool]:
        """
        Get existing or create new profile.
        Returns (profile, is_new).
        """
        # Try to find existing profile
        profile = await self.find_profile(email=email, phone=phone)

        if profile:
            return (profile, False)

        # Create new profile
        profile = await self.create_profile(
            email=email,
            phone=phone,
            initial_facts=initial_facts
        )
        return (profile, True)

    async def update_profile_facts(
        self,
        profile_id: str,
        new_facts: Dict[str, Any]
    ) -> None:
        """
        Merge new facts into profile.
        """
        if not new_facts:
            return

        try:
            # Get existing profile
            profile = await self.db[PROFILES_COLLECTION].find_one({"_id": profile_id})
            if not profile:
                logger.warning(f"Profile not found: {profile_id}")
                return

            # Merge facts (new facts override old ones)
            current_facts = profile.get("facts", {})
            updated_facts = {**current_facts, **new_facts}

            # Update database
            await self.db[PROFILES_COLLECTION].update_one(
                {"_id": profile_id},
                {
                    "$set": {
                        "facts": updated_facts,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            logger.info(f"Updated facts for profile: {profile_id}")

        except Exception as e:
            logger.error(f"Error updating profile facts: {e}")

    async def add_session_summary(
        self,
        profile_id: str,
        session_id: str,
        summary: str,
        key_topics: List[str],
        outcome: str = None
    ) -> None:
        """
        Add conversation summary to profile history.
        """
        session_summary = {
            "session_id": session_id,
            "summary": summary,
            "key_topics": key_topics,
            "outcome": outcome,
            "timestamp": datetime.utcnow()
        }

        try:
            # Add to session summaries (keep last 20)
            await self.db[PROFILES_COLLECTION].update_one(
                {"_id": profile_id},
                {
                    "$push": {
                        "session_summaries": {
                            "$each": [session_summary],
                            "$slice": -20  # Keep only last 20 sessions
                        }
                    },
                    "$inc": {"behavior.total_sessions": 1},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            logger.info(f"Added session summary for profile: {profile_id}")

        except Exception as e:
            logger.error(f"Error adding session summary: {e}")

    async def update_behavior_metrics(
        self,
        profile_id: str,
        session_sentiment: str = None,
        session_duration: int = None,
        message_count: int = 0
    ) -> None:
        """
        Update behavior patterns (engagement, sentiment trend).
        """
        try:
            profile = await self.db[PROFILES_COLLECTION].find_one({"_id": profile_id})
            if not profile:
                logger.warning(f"Profile not found: {profile_id}")
                return

            behavior = profile.get("behavior", {})

            # Update message count
            total_messages = behavior.get("total_messages", 0) + message_count

            # Update sentiment
            update_fields = {
                "behavior.total_messages": total_messages,
                "updated_at": datetime.utcnow()
            }

            if session_sentiment:
                update_fields["behavior.last_sentiment"] = session_sentiment

                # Calculate average sentiment (simple mapping: positive=1, neutral=0, negative=-1)
                sentiment_map = {"positive": 1, "neutral": 0, "negative": -1}
                sentiment_value = sentiment_map.get(session_sentiment, 0)

                current_avg = behavior.get("average_sentiment")
                total_sessions = behavior.get("total_sessions", 0)

                if current_avg is None:
                    new_avg = sentiment_value
                else:
                    # Running average
                    new_avg = ((current_avg * total_sessions) + sentiment_value) / (total_sessions + 1)

                update_fields["behavior.average_sentiment"] = new_avg

            # Determine engagement level
            # Simple heuristic based on total sessions and messages
            total_sessions = behavior.get("total_sessions", 0)

            if total_sessions == 0:
                engagement = "new"
            elif total_sessions <= 2:
                engagement = "active"
            elif total_sessions >= 5:
                engagement = "engaged"
            else:
                engagement = "active"

            # Check for disengagement (negative sentiment trend)
            avg_sentiment = update_fields.get("behavior.average_sentiment", behavior.get("average_sentiment"))
            if avg_sentiment is not None and avg_sentiment < -0.3 and total_sessions > 2:
                engagement = "disengaged"

            update_fields["behavior.engagement_level"] = engagement

            await self.db[PROFILES_COLLECTION].update_one(
                {"_id": profile_id},
                {"$set": update_fields}
            )

            logger.info(f"Updated behavior metrics for profile: {profile_id}")

        except Exception as e:
            logger.error(f"Error updating behavior metrics: {e}")

    async def get_profile_context(
        self,
        profile_id: str
    ) -> Dict[str, Any]:
        """
        Get formatted profile context for LLM prompt.
        Includes: name, company, preferences, recent topics, summary of past conversations.
        """
        try:
            profile = await self.db[PROFILES_COLLECTION].find_one({"_id": profile_id})
            if not profile:
                return {}

            facts = profile.get("facts", {})
            preferences = profile.get("preferences", {})
            session_summaries = profile.get("session_summaries", [])
            behavior = profile.get("behavior", {})

            # Build context dictionary
            context = {
                "user_id": profile_id,
                "email": profile.get("email"),
                "phone": profile.get("phone"),
                "facts": facts,
                "preferences": preferences,
                "engagement_level": behavior.get("engagement_level", "new"),
                "total_sessions": behavior.get("total_sessions", 0),
                "average_sentiment": behavior.get("average_sentiment"),
                "last_sentiment": behavior.get("last_sentiment")
            }

            # Add recent session summaries (last 5)
            if session_summaries:
                recent_sessions = session_summaries[-5:]
                context["recent_conversations"] = [
                    {
                        "summary": s.get("summary"),
                        "topics": s.get("key_topics", []),
                        "outcome": s.get("outcome")
                    }
                    for s in recent_sessions
                ]

            # Format for LLM prompt
            formatted_context = self._format_context_for_llm(context)
            context["formatted_prompt"] = formatted_context

            return context

        except Exception as e:
            logger.error(f"Error getting profile context: {e}")
            return {}

    def _format_context_for_llm(self, context: Dict[str, Any]) -> str:
        """Format profile context as a prompt string for the LLM."""
        parts = []

        # User identification
        if context.get("facts", {}).get("name"):
            parts.append(f"User's name: {context['facts']['name']}")

        if context.get("facts", {}).get("company"):
            parts.append(f"Company: {context['facts']['company']}")

        # Facts
        facts = context.get("facts", {})
        if facts:
            fact_strings = []
            for key, value in facts.items():
                if key not in ["name", "company"] and value:
                    fact_strings.append(f"- {key}: {value}")

            if fact_strings:
                parts.append("Known facts:\n" + "\n".join(fact_strings))

        # Preferences
        preferences = context.get("preferences", {})
        if preferences:
            pref_strings = [f"- {key}: {value}" for key, value in preferences.items()]
            parts.append("Preferences:\n" + "\n".join(pref_strings))

        # Engagement level
        engagement = context.get("engagement_level")
        total_sessions = context.get("total_sessions", 0)
        if engagement:
            parts.append(f"Engagement: {engagement} ({total_sessions} previous sessions)")

        # Recent conversations
        recent = context.get("recent_conversations", [])
        if recent:
            conv_strings = []
            for i, conv in enumerate(recent, 1):
                summary = conv.get("summary", "")
                topics = conv.get("topics", [])
                outcome = conv.get("outcome")

                conv_str = f"{i}. {summary}"
                if topics:
                    conv_str += f" (Topics: {', '.join(topics)})"
                if outcome:
                    conv_str += f" - {outcome}"

                conv_strings.append(conv_str)

            parts.append("Previous conversations:\n" + "\n".join(conv_strings))

        # Sentiment
        last_sentiment = context.get("last_sentiment")
        if last_sentiment:
            parts.append(f"Last interaction sentiment: {last_sentiment}")

        if not parts:
            return ""

        return "\n\n".join(parts)

    async def search_profiles(
        self,
        query: str = None,
        filters: Dict[str, Any] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search profiles for admin dashboard.
        """
        try:
            search_query = {
                "tenant_id": self.tenant_id,
                "bot_id": self.bot_id
            }

            # Add filters
            if filters:
                search_query.update(filters)

            # Text search if query provided
            if query:
                search_query["$or"] = [
                    {"email": {"$regex": query, "$options": "i"}},
                    {"phone": {"$regex": query, "$options": "i"}},
                    {"facts.name": {"$regex": query, "$options": "i"}},
                    {"facts.company": {"$regex": query, "$options": "i"}}
                ]

            # Execute search
            cursor = self.db[PROFILES_COLLECTION].find(search_query).sort(
                "updated_at", -1
            ).limit(limit)

            profiles = await cursor.to_list(length=limit)
            return profiles

        except Exception as e:
            logger.error(f"Error searching profiles: {e}")
            return []

    async def get_profile_by_id(self, profile_id: str) -> Optional[Dict[str, Any]]:
        """Get profile by ID."""
        try:
            return await self.db[PROFILES_COLLECTION].find_one({"_id": profile_id})
        except Exception as e:
            logger.error(f"Error getting profile by ID: {e}")
            return None

    async def update_profile_email_phone(
        self,
        profile_id: str,
        email: str = None,
        phone: str = None
    ) -> None:
        """Update profile email or phone."""
        update_fields = {"updated_at": datetime.utcnow()}

        if email:
            update_fields["email"] = email.lower().strip()
        if phone:
            update_fields["phone"] = phone.replace(" ", "").replace("-", "").strip()

        try:
            await self.db[PROFILES_COLLECTION].update_one(
                {"_id": profile_id},
                {"$set": update_fields}
            )
            logger.info(f"Updated contact info for profile: {profile_id}")
        except Exception as e:
            logger.error(f"Error updating profile contact info: {e}")

    async def merge_profiles(
        self,
        primary_profile_id: str,
        secondary_profile_id: str
    ) -> bool:
        """
        Merge two profiles (when we discover they're the same user).
        Keeps primary, merges data from secondary, deletes secondary.
        """
        try:
            primary = await self.get_profile_by_id(primary_profile_id)
            secondary = await self.get_profile_by_id(secondary_profile_id)

            if not primary or not secondary:
                logger.error("Cannot merge: profile not found")
                return False

            # Merge facts (primary takes precedence)
            merged_facts = {**secondary.get("facts", {}), **primary.get("facts", {})}

            # Merge preferences
            merged_preferences = {**secondary.get("preferences", {}), **primary.get("preferences", {})}

            # Merge session summaries
            merged_sessions = primary.get("session_summaries", []) + secondary.get("session_summaries", [])
            # Sort by timestamp and keep last 20
            merged_sessions.sort(key=lambda x: x.get("timestamp", datetime.min))
            merged_sessions = merged_sessions[-20:]

            # Merge behavior metrics
            primary_behavior = primary.get("behavior", {})
            secondary_behavior = secondary.get("behavior", {})

            merged_behavior = {
                "total_sessions": primary_behavior.get("total_sessions", 0) + secondary_behavior.get("total_sessions", 0),
                "total_messages": primary_behavior.get("total_messages", 0) + secondary_behavior.get("total_messages", 0),
                "average_sentiment": primary_behavior.get("average_sentiment"),  # Keep primary
                "engagement_level": primary_behavior.get("engagement_level", "active"),
                "last_sentiment": primary_behavior.get("last_sentiment") or secondary_behavior.get("last_sentiment")
            }

            # Update primary profile
            await self.db[PROFILES_COLLECTION].update_one(
                {"_id": primary_profile_id},
                {
                    "$set": {
                        "facts": merged_facts,
                        "preferences": merged_preferences,
                        "session_summaries": merged_sessions,
                        "behavior": merged_behavior,
                        "updated_at": datetime.utcnow()
                    }
                }
            )

            # Delete secondary profile
            await self.db[PROFILES_COLLECTION].delete_one({"_id": secondary_profile_id})

            logger.info(f"Merged profiles: {secondary_profile_id} -> {primary_profile_id}")
            return True

        except Exception as e:
            logger.error(f"Error merging profiles: {e}")
            return False

    async def find_profile_by_visitor_id(
        self,
        visitor_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Find existing user profile by visitor_id.

        Args:
            visitor_id: Anonymous visitor identifier from localStorage

        Returns:
            Profile if found, None otherwise
        """
        if not visitor_id:
            return None

        query = {
            "tenant_id": self.tenant_id,
            "bot_id": self.bot_id,
            "visitor_ids": visitor_id
        }

        try:
            profile = await self.db[PROFILES_COLLECTION].find_one(query)
            return profile
        except Exception as e:
            logger.error(f"Error finding profile by visitor_id: {e}")
            return None

    async def link_visitor_id_to_profile(
        self,
        profile_id: str,
        visitor_id: str
    ) -> None:
        """
        Add visitor_id to profile's visitor_ids array.
        Enables cross-device sync when user provides email.

        Args:
            profile_id: User profile ID
            visitor_id: Visitor ID to link
        """
        if not visitor_id:
            return

        try:
            await self.db[PROFILES_COLLECTION].update_one(
                {"_id": profile_id},
                {
                    "$addToSet": {"visitor_ids": visitor_id},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            logger.info(f"Linked visitor_id {visitor_id[:8]}... to profile {profile_id[:8]}...")
        except Exception as e:
            logger.error(f"Error linking visitor_id: {e}")

    async def get_or_create_profile_by_visitor(
        self,
        visitor_id: str,
        email: str = None,
        phone: str = None,
        initial_facts: Dict[str, Any] = None
    ) -> Tuple[Dict[str, Any], bool]:
        """
        Get or create profile using visitor_id as primary identifier.

        Priority order:
        1. If email/phone provided, find by those (enables cross-device sync)
        2. Otherwise find by visitor_id
        3. If not found, create new profile with visitor_id

        Args:
            visitor_id: Browser-based anonymous ID
            email: Optional email for cross-device sync
            phone: Optional phone for cross-device sync
            initial_facts: Initial facts to store

        Returns:
            Tuple of (profile, is_new)
        """
        # Priority 1: Find by email/phone if provided
        if email or phone:
            profile = await self.find_profile(email=email, phone=phone)
            if profile:
                # Link visitor_id if not already linked
                if visitor_id and visitor_id not in profile.get("visitor_ids", []):
                    await self.link_visitor_id_to_profile(profile["_id"], visitor_id)
                return (profile, False)

        # Priority 2: Find by visitor_id
        if visitor_id:
            profile = await self.find_profile_by_visitor_id(visitor_id)
            if profile:
                # Update email/phone if newly provided
                if email or phone:
                    update_data = {"updated_at": datetime.utcnow()}
                    if email and not profile.get("email"):
                        update_data["email"] = email.lower().strip()
                    if phone and not profile.get("phone"):
                        update_data["phone"] = phone
                    if len(update_data) > 1:
                        await self.db[PROFILES_COLLECTION].update_one(
                            {"_id": profile["_id"]},
                            {"$set": update_data}
                        )
                return (profile, False)

        # Priority 3: Create new profile
        profile = await self._create_profile_with_visitor(
            visitor_id=visitor_id,
            email=email,
            phone=phone,
            initial_facts=initial_facts
        )
        return (profile, True)

    async def _create_profile_with_visitor(
        self,
        visitor_id: str,
        email: str = None,
        phone: str = None,
        initial_facts: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Create new profile with visitor_id."""
        profile_id = str(uuid.uuid4())
        now = datetime.utcnow()

        profile = {
            "_id": profile_id,
            "tenant_id": self.tenant_id,
            "bot_id": self.bot_id,
            "visitor_ids": [visitor_id] if visitor_id else [],
            "email": email.lower().strip() if email else None,
            "phone": phone if phone else None,
            "facts": initial_facts or {},
            "preferences": {},
            "session_summaries": [],
            "behavior": {
                "total_sessions": 0,
                "total_messages": 0,
                "average_sentiment": None,
                "engagement_level": "new",
                "last_sentiment": None
            },
            "created_at": now,
            "updated_at": now
        }

        try:
            await self.db[PROFILES_COLLECTION].insert_one(profile)
            logger.info(f"Created profile {profile_id[:8]}... with visitor_id")
            return profile
        except Exception as e:
            logger.error(f"Error creating profile: {e}")
            raise

    async def get_greeting_for_visitor(
        self,
        visitor_id: str,
        default_greeting: str
    ) -> str:
        """
        Get personalized greeting for returning visitor.

        Args:
            visitor_id: Browser-based visitor ID
            default_greeting: Fallback greeting

        Returns:
            Personalized greeting if name known, else default
        """
        if not visitor_id:
            return default_greeting

        try:
            profile = await self.find_profile_by_visitor_id(visitor_id)

            if profile and profile.get("facts"):
                facts = profile["facts"]
                name = None

                # Try to get name from facts
                if "name" in facts:
                    name_fact = facts["name"]
                    if isinstance(name_fact, dict):
                        name = name_fact.get("value")
                    else:
                        name = name_fact

                if name:
                    return f"Welcome back, {name}! How can I help you today?"

            return default_greeting

        except Exception as e:
            logger.error(f"Error getting greeting: {e}")
            return default_greeting


async def ensure_indexes():
    """Create MongoDB indexes for user_profiles collection."""
    db = get_mongodb()

    try:
        # Email index (sparse because not all profiles have email)
        await db[PROFILES_COLLECTION].create_index(
            [("email", 1), ("tenant_id", 1), ("bot_id", 1)],
            sparse=True
        )

        # Phone index (sparse because not all profiles have phone)
        await db[PROFILES_COLLECTION].create_index(
            [("phone", 1), ("tenant_id", 1), ("bot_id", 1)],
            sparse=True
        )

        # Visitor IDs index (sparse because not all profiles have visitor_ids)
        await db[PROFILES_COLLECTION].create_index(
            [("visitor_ids", 1), ("tenant_id", 1), ("bot_id", 1)],
            sparse=True,
            name="visitor_ids_lookup"
        )

        # Tenant/bot with updated_at for listing
        await db[PROFILES_COLLECTION].create_index(
            [("tenant_id", 1), ("bot_id", 1), ("updated_at", -1)]
        )

        # Engagement level for filtering
        await db[PROFILES_COLLECTION].create_index(
            [("tenant_id", 1), ("bot_id", 1), ("behavior.engagement_level", 1)]
        )

        logger.info("User profile indexes created successfully")

    except Exception as e:
        logger.error(f"Error creating user profile indexes: {e}")
