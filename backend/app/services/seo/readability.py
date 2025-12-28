"""
Readability Analysis Service

Provides various readability metrics including:
- Flesch Reading Ease
- Flesch-Kincaid Grade Level
- SMOG Index
- Coleman-Liau Index
- Automated Readability Index (ARI)
- Gunning Fog Index
"""
import re
from typing import Dict, List, Tuple
import math


def count_syllables(word: str) -> int:
    """
    Count syllables in a word using a heuristic approach.

    This is an approximation that works well for English text.
    """
    word = word.lower().strip()
    if not word:
        return 0

    # Handle special cases
    if len(word) <= 3:
        return 1

    # Count vowel groups
    vowels = "aeiouy"
    count = 0
    prev_is_vowel = False

    for char in word:
        is_vowel = char in vowels
        if is_vowel and not prev_is_vowel:
            count += 1
        prev_is_vowel = is_vowel

    # Adjust for silent 'e' at end
    if word.endswith('e') and count > 1:
        count -= 1

    # Adjust for endings
    if word.endswith('le') and len(word) > 2 and word[-3] not in vowels:
        count += 1

    # Minimum 1 syllable
    return max(1, count)


def count_complex_words(words: List[str]) -> int:
    """
    Count complex words (3+ syllables, excluding common suffixes).
    Used for Gunning Fog and SMOG calculations.
    """
    complex_count = 0
    common_suffixes = ['ing', 'ed', 'es', 'ly']

    for word in words:
        syllables = count_syllables(word)
        if syllables >= 3:
            # Check if word is complex without common suffixes
            base_word = word.lower()
            for suffix in common_suffixes:
                if base_word.endswith(suffix):
                    base_word = base_word[:-len(suffix)]
                    break

            # Recount syllables for base word
            if count_syllables(base_word) >= 3:
                complex_count += 1
            elif syllables >= 3:
                # Still count if original had 3+ syllables
                complex_count += 1

    return complex_count


def extract_text_metrics(text: str) -> Dict:
    """
    Extract basic text metrics needed for readability calculations.
    """
    # Clean text
    text = text.strip()
    if not text:
        return {
            "characters": 0,
            "words": 0,
            "sentences": 0,
            "syllables": 0,
            "complex_words": 0,
            "paragraphs": 0,
            "avg_word_length": 0,
            "avg_sentence_length": 0,
            "avg_syllables_per_word": 0,
        }

    # Count characters (letters only)
    characters = len(re.findall(r'[a-zA-Z]', text))

    # Extract words
    words = re.findall(r'\b[a-zA-Z]+\b', text)
    word_count = len(words)

    # Count sentences (. ! ?)
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    sentence_count = max(1, len(sentences))

    # Count syllables
    total_syllables = sum(count_syllables(w) for w in words)

    # Count complex words
    complex_words = count_complex_words(words)

    # Count paragraphs
    paragraphs = text.split('\n\n')
    paragraphs = [p.strip() for p in paragraphs if p.strip()]
    paragraph_count = max(1, len(paragraphs))

    # Calculate averages
    avg_word_length = characters / max(1, word_count)
    avg_sentence_length = word_count / max(1, sentence_count)
    avg_syllables_per_word = total_syllables / max(1, word_count)

    return {
        "characters": characters,
        "words": word_count,
        "sentences": sentence_count,
        "syllables": total_syllables,
        "complex_words": complex_words,
        "paragraphs": paragraph_count,
        "avg_word_length": round(avg_word_length, 2),
        "avg_sentence_length": round(avg_sentence_length, 2),
        "avg_syllables_per_word": round(avg_syllables_per_word, 2),
    }


def flesch_reading_ease(words: int, sentences: int, syllables: int) -> float:
    """
    Calculate Flesch Reading Ease score.

    Score interpretation:
    - 90-100: Very Easy (5th grade)
    - 80-90: Easy (6th grade)
    - 70-80: Fairly Easy (7th grade)
    - 60-70: Standard (8th-9th grade)
    - 50-60: Fairly Difficult (10th-12th grade)
    - 30-50: Difficult (College)
    - 0-30: Very Difficult (College graduate)
    """
    if words == 0 or sentences == 0:
        return 0.0

    score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
    return max(0, min(100, round(score, 1)))


def flesch_kincaid_grade(words: int, sentences: int, syllables: int) -> float:
    """
    Calculate Flesch-Kincaid Grade Level.

    Returns the US school grade level needed to understand the text.
    """
    if words == 0 or sentences == 0:
        return 0.0

    grade = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
    return max(0, round(grade, 1))


def smog_index(sentences: int, complex_words: int) -> float:
    """
    Calculate SMOG (Simple Measure of Gobbledygook) Index.

    Best for texts with 30+ sentences. Returns grade level.
    """
    if sentences == 0:
        return 0.0

    # SMOG formula
    if sentences >= 30:
        smog = 1.0430 * math.sqrt(complex_words * (30 / sentences)) + 3.1291
    else:
        # Adjusted for shorter texts
        smog = 1.0430 * math.sqrt(complex_words * (30 / max(1, sentences))) + 3.1291

    return max(0, round(smog, 1))


def coleman_liau_index(characters: int, words: int, sentences: int) -> float:
    """
    Calculate Coleman-Liau Index.

    Uses characters instead of syllables. Returns grade level.
    """
    if words == 0:
        return 0.0

    # L = average letters per 100 words
    L = (characters / words) * 100
    # S = average sentences per 100 words
    S = (sentences / words) * 100

    cli = 0.0588 * L - 0.296 * S - 15.8
    return max(0, round(cli, 1))


def automated_readability_index(characters: int, words: int, sentences: int) -> float:
    """
    Calculate Automated Readability Index (ARI).

    Returns grade level.
    """
    if words == 0 or sentences == 0:
        return 0.0

    ari = 4.71 * (characters / words) + 0.5 * (words / sentences) - 21.43
    return max(0, round(ari, 1))


def gunning_fog_index(words: int, sentences: int, complex_words: int) -> float:
    """
    Calculate Gunning Fog Index.

    Returns years of formal education needed to understand text on first reading.
    """
    if words == 0 or sentences == 0:
        return 0.0

    fog = 0.4 * ((words / sentences) + 100 * (complex_words / words))
    return max(0, round(fog, 1))


def get_reading_level(score: float) -> str:
    """
    Convert Flesch Reading Ease score to reading level description.
    """
    if score >= 90:
        return "Very Easy"
    elif score >= 80:
        return "Easy"
    elif score >= 70:
        return "Fairly Easy"
    elif score >= 60:
        return "Standard"
    elif score >= 50:
        return "Fairly Difficult"
    elif score >= 30:
        return "Difficult"
    else:
        return "Very Difficult"


def get_grade_level_description(grade: float) -> str:
    """
    Convert grade level to description.
    """
    if grade <= 5:
        return "Elementary School"
    elif grade <= 8:
        return "Middle School"
    elif grade <= 12:
        return "High School"
    elif grade <= 16:
        return "College"
    else:
        return "Graduate Level"


def analyze_readability(text: str) -> Dict:
    """
    Perform comprehensive readability analysis on text.

    Returns all readability metrics and recommendations.
    """
    metrics = extract_text_metrics(text)

    # Calculate all readability scores
    fre = flesch_reading_ease(
        metrics["words"],
        metrics["sentences"],
        metrics["syllables"]
    )
    fkg = flesch_kincaid_grade(
        metrics["words"],
        metrics["sentences"],
        metrics["syllables"]
    )
    smog = smog_index(metrics["sentences"], metrics["complex_words"])
    cli = coleman_liau_index(
        metrics["characters"],
        metrics["words"],
        metrics["sentences"]
    )
    ari = automated_readability_index(
        metrics["characters"],
        metrics["words"],
        metrics["sentences"]
    )
    fog = gunning_fog_index(
        metrics["words"],
        metrics["sentences"],
        metrics["complex_words"]
    )

    # Calculate average grade level
    grade_levels = [fkg, smog, cli, ari, fog]
    avg_grade = round(sum(grade_levels) / len(grade_levels), 1)

    # Generate recommendations
    recommendations = []

    if fre < 60:
        recommendations.append("Consider simplifying your writing for broader accessibility")
    if metrics["avg_sentence_length"] > 20:
        recommendations.append("Break up long sentences (aim for 15-20 words average)")
    if metrics["avg_syllables_per_word"] > 1.6:
        recommendations.append("Use simpler words with fewer syllables")
    if metrics["complex_words"] > metrics["words"] * 0.1:
        recommendations.append("Reduce complex words (3+ syllables) to under 10% of total")
    if fre >= 70:
        recommendations.append("Good readability! Your content is accessible to most readers")

    return {
        "metrics": metrics,
        "scores": {
            "flesch_reading_ease": fre,
            "flesch_kincaid_grade": fkg,
            "smog_index": smog,
            "coleman_liau_index": cli,
            "automated_readability_index": ari,
            "gunning_fog_index": fog,
            "average_grade_level": avg_grade,
        },
        "interpretation": {
            "reading_level": get_reading_level(fre),
            "grade_level_description": get_grade_level_description(avg_grade),
            "target_audience": get_target_audience(fre, avg_grade),
        },
        "recommendations": recommendations,
    }


def get_target_audience(fre: float, grade: float) -> str:
    """
    Determine target audience based on readability scores.
    """
    if grade <= 6:
        return "General public, including children"
    elif grade <= 9:
        return "General adult audience"
    elif grade <= 12:
        return "Educated adults"
    elif grade <= 16:
        return "College-educated professionals"
    else:
        return "Specialists and academics"
