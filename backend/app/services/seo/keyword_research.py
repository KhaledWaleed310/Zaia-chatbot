"""
Keyword Research Service

Provides keyword discovery algorithms including:
- Related keyword suggestions
- Long-tail keyword generation
- Question-based keywords
- Keyword difficulty estimation
- Topic clustering
"""
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import hashlib
import re
import logging

logger = logging.getLogger(__name__)

# Common question prefixes for generating question keywords
QUESTION_PREFIXES = [
    "what is", "what are", "what does", "what do",
    "how to", "how do", "how does", "how can", "how much", "how many",
    "why is", "why are", "why do", "why does",
    "when to", "when should", "when do", "when does",
    "where to", "where can", "where do", "where is",
    "which is", "which are", "which one",
    "who is", "who are", "who can",
    "can you", "can I", "can we",
    "should I", "should you", "should we",
    "is it", "are there", "is there",
    "does it", "do you", "do I",
]

# Arabic question prefixes
QUESTION_PREFIXES_AR = [
    "ما هو", "ما هي", "ما معنى",
    "كيف يمكن", "كيف أستطيع", "كيفية",
    "لماذا", "لما",
    "متى يجب", "متى",
    "أين يمكن", "أين",
    "أي", "أيهما",
    "من هو", "من هي", "من يستطيع",
    "هل يمكن", "هل",
]

# Common modifiers for long-tail keywords
MODIFIERS = {
    "intent": ["best", "top", "free", "cheap", "affordable", "premium", "professional"],
    "comparison": ["vs", "versus", "or", "compared to", "alternative to", "like"],
    "location": ["near me", "online", "local", "in"],
    "time": ["2024", "2025", "new", "latest", "updated"],
    "action": ["buy", "get", "find", "download", "learn", "use", "create", "make"],
    "quality": ["easy", "fast", "simple", "quick", "complete", "ultimate", "advanced"],
    "type": ["for beginners", "for small business", "for enterprise", "for developers"],
}

# Arabic modifiers
MODIFIERS_AR = {
    "intent": ["أفضل", "أرخص", "مجاني", "احترافي"],
    "comparison": ["مقابل", "أو", "بديل"],
    "action": ["شراء", "تحميل", "تعلم", "استخدام", "إنشاء"],
    "quality": ["سهل", "سريع", "بسيط", "كامل", "متقدم"],
}

# LSI (Latent Semantic Indexing) related terms for common industries
LSI_TERMS = {
    "chatbot": ["AI assistant", "virtual assistant", "conversational AI", "chat automation",
                "customer support bot", "messaging bot", "automated chat", "bot platform"],
    "ai": ["artificial intelligence", "machine learning", "deep learning", "neural network",
           "automation", "intelligent system", "smart technology", "cognitive computing"],
    "customer support": ["help desk", "customer service", "support ticket", "live chat",
                        "client assistance", "helpline", "support team", "service desk"],
    "marketing": ["digital marketing", "content marketing", "SEO", "social media",
                 "advertising", "branding", "lead generation", "campaign"],
    "business": ["enterprise", "company", "organization", "startup", "SMB",
                "corporation", "firm", "commerce"],
    "website": ["web page", "site", "online presence", "domain", "web platform",
               "landing page", "web portal", "online platform"],
    "software": ["application", "app", "platform", "tool", "solution",
                "program", "system", "SaaS"],
}


def generate_keyword_hash(keyword: str) -> str:
    """Generate a unique hash for a keyword."""
    return hashlib.md5(keyword.lower().strip().encode()).hexdigest()[:12]


def normalize_keyword(keyword: str) -> str:
    """Normalize a keyword for consistent comparison."""
    return keyword.lower().strip()


def estimate_keyword_difficulty(keyword: str, existing_keywords: List[Dict] = None) -> int:
    """
    Estimate keyword difficulty on a scale of 0-100.

    This is a heuristic based on:
    - Keyword length (shorter = more competitive)
    - Number of words (1-2 words = more competitive)
    - Presence of commercial intent modifiers
    - Generic vs specific terms

    Args:
        keyword: The keyword to analyze
        existing_keywords: Optional list of existing tracked keywords for context

    Returns:
        Difficulty score 0-100 (higher = more difficult)
    """
    words = keyword.lower().split()
    word_count = len(words)
    char_count = len(keyword)

    # Base difficulty starts at 50
    difficulty = 50

    # Short keywords (1-2 words) are typically more competitive
    if word_count == 1:
        difficulty += 30
    elif word_count == 2:
        difficulty += 20
    elif word_count >= 5:
        difficulty -= 15
    elif word_count >= 4:
        difficulty -= 10

    # Very short character count = highly competitive
    if char_count < 10:
        difficulty += 15
    elif char_count < 20:
        difficulty += 5
    elif char_count > 40:
        difficulty -= 10

    # Commercial intent modifiers increase difficulty
    commercial_terms = ["buy", "price", "cost", "cheap", "best", "top", "review"]
    if any(term in keyword.lower() for term in commercial_terms):
        difficulty += 10

    # Question keywords are typically less competitive
    if any(keyword.lower().startswith(q) for q in ["what", "how", "why", "when", "where", "who"]):
        difficulty -= 15

    # Long-tail with specific modifiers is less competitive
    specific_modifiers = ["for beginners", "tutorial", "guide", "example", "template"]
    if any(mod in keyword.lower() for mod in specific_modifiers):
        difficulty -= 10

    # Clamp to 0-100 range
    return max(0, min(100, difficulty))


def estimate_search_volume(keyword: str) -> Tuple[int, str]:
    """
    Estimate relative search volume based on keyword characteristics.

    Returns a tuple of (estimated_volume, volume_category)
    Volume categories: "very_low", "low", "medium", "high", "very_high"

    Note: This is a heuristic estimation. For accurate volumes,
    integrate with Google Keyword Planner or similar API.
    """
    words = keyword.lower().split()
    word_count = len(words)

    # Base estimate
    base_volume = 1000

    # Shorter keywords typically have higher volume
    if word_count == 1:
        base_volume = 10000
    elif word_count == 2:
        base_volume = 5000
    elif word_count == 3:
        base_volume = 2000
    elif word_count >= 5:
        base_volume = 500

    # Question keywords have decent volume
    if any(keyword.lower().startswith(q) for q in ["what", "how", "why"]):
        base_volume = int(base_volume * 1.2)

    # Commercial terms have higher volume
    commercial_terms = ["buy", "price", "best", "review", "vs"]
    if any(term in keyword.lower() for term in commercial_terms):
        base_volume = int(base_volume * 1.5)

    # Categorize
    if base_volume >= 10000:
        category = "very_high"
    elif base_volume >= 5000:
        category = "high"
    elif base_volume >= 1000:
        category = "medium"
    elif base_volume >= 500:
        category = "low"
    else:
        category = "very_low"

    return base_volume, category


def determine_competition(difficulty: int) -> str:
    """Convert difficulty score to competition level."""
    if difficulty >= 70:
        return "high"
    elif difficulty >= 40:
        return "medium"
    else:
        return "low"


def determine_keyword_type(keyword: str) -> str:
    """
    Determine if keyword is short_tail, long_tail, or question.
    """
    words = keyword.split()

    # Check for question keywords
    question_starters = ["what", "how", "why", "when", "where", "who", "which", "can", "should", "is", "are", "do", "does"]
    if any(keyword.lower().startswith(q) for q in question_starters):
        return "question"

    # Check for Arabic questions
    if any(keyword.startswith(q) for q in QUESTION_PREFIXES_AR):
        return "question"

    # Word count determines tail length
    if len(words) <= 2:
        return "short_tail"
    else:
        return "long_tail"


def generate_related_keywords(seed_keyword: str, limit: int = 20) -> List[Dict]:
    """
    Generate related keyword suggestions based on a seed keyword.

    Uses various techniques:
    - Adding modifiers
    - LSI terms
    - Synonyms and variations

    Args:
        seed_keyword: The base keyword to expand
        limit: Maximum number of suggestions to return

    Returns:
        List of keyword dictionaries with metadata
    """
    suggestions = []
    seed_lower = seed_keyword.lower().strip()
    seen = {seed_lower}

    # Add modifier variations
    for category, modifiers in MODIFIERS.items():
        for mod in modifiers[:3]:  # Limit modifiers per category
            # Prefix modifier
            kw = f"{mod} {seed_keyword}"
            if kw.lower() not in seen:
                seen.add(kw.lower())
                difficulty = estimate_keyword_difficulty(kw)
                volume, vol_cat = estimate_search_volume(kw)
                suggestions.append({
                    "keyword": kw,
                    "seed_keyword": seed_keyword,
                    "difficulty_score": difficulty,
                    "competition": determine_competition(difficulty),
                    "search_volume": volume,
                    "volume_category": vol_cat,
                    "keyword_type": determine_keyword_type(kw),
                    "source": f"modifier_{category}",
                })

            # Suffix modifier
            kw = f"{seed_keyword} {mod}"
            if kw.lower() not in seen:
                seen.add(kw.lower())
                difficulty = estimate_keyword_difficulty(kw)
                volume, vol_cat = estimate_search_volume(kw)
                suggestions.append({
                    "keyword": kw,
                    "seed_keyword": seed_keyword,
                    "difficulty_score": difficulty,
                    "competition": determine_competition(difficulty),
                    "search_volume": volume,
                    "volume_category": vol_cat,
                    "keyword_type": determine_keyword_type(kw),
                    "source": f"modifier_{category}",
                })

    # Add LSI terms if seed matches known categories
    for category, terms in LSI_TERMS.items():
        if category in seed_lower or seed_lower in category:
            for term in terms[:5]:
                if term.lower() not in seen:
                    seen.add(term.lower())
                    difficulty = estimate_keyword_difficulty(term)
                    volume, vol_cat = estimate_search_volume(term)
                    suggestions.append({
                        "keyword": term,
                        "seed_keyword": seed_keyword,
                        "difficulty_score": difficulty,
                        "competition": determine_competition(difficulty),
                        "search_volume": volume,
                        "volume_category": vol_cat,
                        "keyword_type": determine_keyword_type(term),
                        "source": "lsi",
                    })

                # Combine with seed
                kw = f"{seed_keyword} {term}"
                if kw.lower() not in seen:
                    seen.add(kw.lower())
                    difficulty = estimate_keyword_difficulty(kw)
                    volume, vol_cat = estimate_search_volume(kw)
                    suggestions.append({
                        "keyword": kw,
                        "seed_keyword": seed_keyword,
                        "difficulty_score": difficulty,
                        "competition": determine_competition(difficulty),
                        "search_volume": volume,
                        "volume_category": vol_cat,
                        "keyword_type": determine_keyword_type(kw),
                        "source": "lsi_combined",
                    })

    # Sort by estimated volume (higher first), then by difficulty (lower first)
    suggestions.sort(key=lambda x: (-x["search_volume"], x["difficulty_score"]))

    return suggestions[:limit]


def generate_long_tail_keywords(seed_keyword: str, limit: int = 20) -> List[Dict]:
    """
    Generate long-tail keyword variations.

    Long-tail keywords are longer, more specific phrases that typically
    have lower search volume but higher conversion rates.
    """
    suggestions = []
    seen = {seed_keyword.lower()}

    # Combine multiple modifiers
    for intent_mod in MODIFIERS["intent"][:3]:
        for action_mod in MODIFIERS["action"][:3]:
            kw = f"{intent_mod} {seed_keyword} {action_mod}"
            if kw.lower() not in seen:
                seen.add(kw.lower())
                difficulty = estimate_keyword_difficulty(kw)
                volume, vol_cat = estimate_search_volume(kw)
                suggestions.append({
                    "keyword": kw,
                    "seed_keyword": seed_keyword,
                    "difficulty_score": difficulty,
                    "competition": determine_competition(difficulty),
                    "search_volume": volume,
                    "volume_category": vol_cat,
                    "keyword_type": "long_tail",
                    "source": "long_tail_combined",
                })

    # Add type modifiers (for beginners, for business, etc.)
    for type_mod in MODIFIERS["type"]:
        kw = f"{seed_keyword} {type_mod}"
        if kw.lower() not in seen:
            seen.add(kw.lower())
            difficulty = estimate_keyword_difficulty(kw)
            volume, vol_cat = estimate_search_volume(kw)
            suggestions.append({
                "keyword": kw,
                "seed_keyword": seed_keyword,
                "difficulty_score": difficulty,
                "competition": determine_competition(difficulty),
                "search_volume": volume,
                "volume_category": vol_cat,
                "keyword_type": "long_tail",
                "source": "long_tail_type",
            })

    # Add quality + action combinations
    for quality_mod in MODIFIERS["quality"][:3]:
        for action_mod in MODIFIERS["action"][:3]:
            kw = f"{quality_mod} way to {action_mod} {seed_keyword}"
            if kw.lower() not in seen:
                seen.add(kw.lower())
                difficulty = estimate_keyword_difficulty(kw)
                volume, vol_cat = estimate_search_volume(kw)
                suggestions.append({
                    "keyword": kw,
                    "seed_keyword": seed_keyword,
                    "difficulty_score": difficulty,
                    "competition": determine_competition(difficulty),
                    "search_volume": volume,
                    "volume_category": vol_cat,
                    "keyword_type": "long_tail",
                    "source": "long_tail_how",
                })

    # Sort by difficulty (lower first for long-tail targeting)
    suggestions.sort(key=lambda x: x["difficulty_score"])

    return suggestions[:limit]


def generate_question_keywords(seed_keyword: str, language: str = "en", limit: int = 20) -> List[Dict]:
    """
    Generate question-based keywords.

    Question keywords are great for:
    - Featured snippets
    - Voice search optimization
    - FAQ content

    Args:
        seed_keyword: The base keyword
        language: "en" for English, "ar" for Arabic
        limit: Maximum suggestions to return
    """
    suggestions = []
    seen = set()

    prefixes = QUESTION_PREFIXES if language == "en" else QUESTION_PREFIXES_AR

    for prefix in prefixes:
        kw = f"{prefix} {seed_keyword}"
        if kw.lower() not in seen:
            seen.add(kw.lower())
            difficulty = estimate_keyword_difficulty(kw)
            volume, vol_cat = estimate_search_volume(kw)
            suggestions.append({
                "keyword": kw,
                "seed_keyword": seed_keyword,
                "difficulty_score": difficulty,
                "competition": determine_competition(difficulty),
                "search_volume": volume,
                "volume_category": vol_cat,
                "keyword_type": "question",
                "question_type": prefix.split()[0],  # what, how, why, etc.
                "source": "question_prefix",
            })

    # Also generate "X vs Y" comparisons if relevant
    comparison_terms = ["alternative", "comparison", "difference"]
    for term in comparison_terms:
        kw = f"{seed_keyword} {term}"
        if kw.lower() not in seen:
            seen.add(kw.lower())
            difficulty = estimate_keyword_difficulty(kw)
            volume, vol_cat = estimate_search_volume(kw)
            suggestions.append({
                "keyword": kw,
                "seed_keyword": seed_keyword,
                "difficulty_score": difficulty,
                "competition": determine_competition(difficulty),
                "search_volume": volume,
                "volume_category": vol_cat,
                "keyword_type": "question",
                "question_type": "comparison",
                "source": "comparison",
            })

    # Sort by volume (higher first)
    suggestions.sort(key=lambda x: -x["search_volume"])

    return suggestions[:limit]


def cluster_keywords_by_topic(keywords: List[Dict]) -> Dict[str, List[Dict]]:
    """
    Group keywords into topic clusters.

    This helps with content planning by grouping semantically
    related keywords together.
    """
    clusters = {}

    # Define cluster patterns
    cluster_patterns = {
        "questions": lambda k: k.get("keyword_type") == "question",
        "how_to": lambda k: "how to" in k.get("keyword", "").lower(),
        "best_of": lambda k: any(w in k.get("keyword", "").lower() for w in ["best", "top"]),
        "comparisons": lambda k: any(w in k.get("keyword", "").lower() for w in ["vs", "versus", "alternative", "compared"]),
        "tutorials": lambda k: any(w in k.get("keyword", "").lower() for w in ["guide", "tutorial", "learn", "course"]),
        "buying": lambda k: any(w in k.get("keyword", "").lower() for w in ["buy", "price", "cost", "cheap", "free"]),
        "general": lambda k: True,  # Catch-all
    }

    assigned = set()

    for cluster_name, matcher in cluster_patterns.items():
        if cluster_name == "general":
            continue
        cluster_keywords = []
        for kw in keywords:
            kw_id = kw.get("keyword", "").lower()
            if kw_id not in assigned and matcher(kw):
                cluster_keywords.append(kw)
                assigned.add(kw_id)
        if cluster_keywords:
            clusters[cluster_name] = cluster_keywords

    # Add remaining to general cluster
    general = [kw for kw in keywords if kw.get("keyword", "").lower() not in assigned]
    if general:
        clusters["general"] = general

    return clusters


def analyze_keyword(keyword: str) -> Dict:
    """
    Perform comprehensive analysis of a single keyword.

    Returns all available metrics and insights for the keyword.
    """
    difficulty = estimate_keyword_difficulty(keyword)
    volume, vol_cat = estimate_search_volume(keyword)

    # Generate related variations
    related = generate_related_keywords(keyword, limit=10)
    questions = generate_question_keywords(keyword, limit=5)
    long_tail = generate_long_tail_keywords(keyword, limit=5)

    # Find LSI terms
    lsi_terms = []
    keyword_lower = keyword.lower()
    for category, terms in LSI_TERMS.items():
        if category in keyword_lower or keyword_lower in category:
            lsi_terms.extend(terms[:5])

    return {
        "keyword": keyword,
        "difficulty_score": difficulty,
        "competition": determine_competition(difficulty),
        "search_volume": volume,
        "volume_category": vol_cat,
        "keyword_type": determine_keyword_type(keyword),
        "word_count": len(keyword.split()),
        "character_count": len(keyword),
        "related_keywords": related,
        "question_keywords": questions,
        "long_tail_keywords": long_tail,
        "lsi_keywords": lsi_terms,
        "recommendations": generate_keyword_recommendations(keyword, difficulty, vol_cat),
        "analyzed_at": datetime.utcnow().isoformat(),
    }


def generate_keyword_recommendations(keyword: str, difficulty: int, volume_category: str) -> List[str]:
    """Generate actionable recommendations for a keyword."""
    recommendations = []

    word_count = len(keyword.split())

    if difficulty >= 70:
        recommendations.append("High competition keyword - consider targeting long-tail variations first")
        recommendations.append("Build topical authority with supporting content before targeting this keyword")
    elif difficulty >= 40:
        recommendations.append("Medium competition - achievable with quality content and good on-page SEO")
    else:
        recommendations.append("Low competition - good opportunity for quick wins")

    if word_count <= 2:
        recommendations.append("Short-tail keyword - create a pillar page and support with long-tail content")
    elif word_count >= 4:
        recommendations.append("Long-tail keyword - great for specific user intent and featured snippets")

    if volume_category in ["very_high", "high"]:
        recommendations.append("High search volume - prioritize this keyword in your content strategy")
    elif volume_category in ["very_low", "low"]:
        recommendations.append("Lower search volume - but may have high conversion intent")

    # Check for question format
    if any(keyword.lower().startswith(q) for q in ["what", "how", "why"]):
        recommendations.append("Question keyword - optimize for featured snippets with direct answers")
        recommendations.append("Consider adding this to an FAQ section")

    return recommendations
