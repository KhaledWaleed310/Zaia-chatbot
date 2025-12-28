"""
Content Analyzer Service

Provides comprehensive content analysis for SEO including:
- Overall content score
- Keyword density analysis
- Heading structure analysis
- Image alt text audit
- Content length recommendations
- Internal link suggestions
"""
import re
from typing import Dict, List, Optional, Tuple
from collections import Counter
from .readability import analyze_readability, extract_text_metrics
from bs4 import BeautifulSoup
import html


def clean_html(html_content: str) -> str:
    """
    Extract plain text from HTML content.
    """
    if not html_content:
        return ""

    # Parse HTML
    soup = BeautifulSoup(html_content, 'html.parser')

    # Remove script and style elements
    for element in soup(['script', 'style', 'meta', 'link']):
        element.decompose()

    # Get text
    text = soup.get_text(separator=' ')

    # Clean up whitespace
    text = re.sub(r'\s+', ' ', text).strip()

    return text


def analyze_keyword_density(
    content: str,
    primary_keyword: str,
    secondary_keywords: List[str] = None
) -> Dict:
    """
    Analyze keyword density in content.

    Ideal density: 1-2% for primary keyword
    Secondary keywords: 0.5-1% each
    """
    if not content or not primary_keyword:
        return {
            "primary_keyword": primary_keyword,
            "primary_count": 0,
            "primary_density": 0,
            "secondary_keywords": [],
            "total_words": 0,
            "issues": ["No content or keyword provided"],
            "score": 0,
        }

    # Clean and tokenize content
    content_lower = content.lower()
    words = re.findall(r'\b[a-zA-Z]+\b', content_lower)
    total_words = len(words)

    if total_words == 0:
        return {
            "primary_keyword": primary_keyword,
            "primary_count": 0,
            "primary_density": 0,
            "secondary_keywords": [],
            "total_words": 0,
            "issues": ["No words found in content"],
            "score": 0,
        }

    # Count primary keyword
    primary_lower = primary_keyword.lower()
    primary_pattern = re.compile(r'\b' + re.escape(primary_lower) + r'\b', re.IGNORECASE)
    primary_count = len(primary_pattern.findall(content))
    primary_density = (primary_count / total_words) * 100

    # Analyze secondary keywords
    secondary_analysis = []
    if secondary_keywords:
        for kw in secondary_keywords:
            kw_lower = kw.lower()
            kw_pattern = re.compile(r'\b' + re.escape(kw_lower) + r'\b', re.IGNORECASE)
            kw_count = len(kw_pattern.findall(content))
            kw_density = (kw_count / total_words) * 100
            secondary_analysis.append({
                "keyword": kw,
                "count": kw_count,
                "density": round(kw_density, 2),
                "status": get_density_status(kw_density, is_primary=False),
            })

    # Generate issues and recommendations
    issues = []
    recommendations = []

    if primary_density < 0.5:
        issues.append(f"Primary keyword '{primary_keyword}' density too low ({primary_density:.2f}%)")
        recommendations.append(f"Add more mentions of '{primary_keyword}' (aim for 1-2%)")
    elif primary_density > 3:
        issues.append(f"Primary keyword '{primary_keyword}' may be over-optimized ({primary_density:.2f}%)")
        recommendations.append("Reduce keyword stuffing to avoid penalties")
    elif primary_density < 1:
        recommendations.append(f"Consider adding a few more mentions of '{primary_keyword}'")

    # Calculate score
    score = calculate_keyword_score(primary_density, secondary_analysis)

    return {
        "primary_keyword": primary_keyword,
        "primary_count": primary_count,
        "primary_density": round(primary_density, 2),
        "primary_status": get_density_status(primary_density, is_primary=True),
        "secondary_keywords": secondary_analysis,
        "total_words": total_words,
        "issues": issues,
        "recommendations": recommendations,
        "score": score,
    }


def get_density_status(density: float, is_primary: bool = True) -> str:
    """
    Get status for keyword density.
    """
    if is_primary:
        if density < 0.5:
            return "low"
        elif density <= 2.5:
            return "good"
        elif density <= 3:
            return "warning"
        else:
            return "high"
    else:
        if density < 0.3:
            return "low"
        elif density <= 1.5:
            return "good"
        else:
            return "high"


def calculate_keyword_score(primary_density: float, secondary_analysis: List[Dict]) -> int:
    """
    Calculate overall keyword optimization score (0-100).
    """
    # Primary keyword contributes 60% of score
    if 1 <= primary_density <= 2:
        primary_score = 60
    elif 0.5 <= primary_density < 1:
        primary_score = 40
    elif 2 < primary_density <= 3:
        primary_score = 45
    elif primary_density > 3:
        primary_score = 20
    else:
        primary_score = 20

    # Secondary keywords contribute 40% of score
    if secondary_analysis:
        good_secondary = sum(1 for s in secondary_analysis if s["status"] == "good")
        secondary_score = int((good_secondary / len(secondary_analysis)) * 40)
    else:
        secondary_score = 40  # No secondary keywords is fine

    return min(100, primary_score + secondary_score)


def analyze_heading_structure(html_content: str) -> Dict:
    """
    Analyze heading hierarchy (H1-H6) in content.

    SEO best practices:
    - One H1 per page
    - H2s for main sections
    - Hierarchical structure (no skipping levels)
    - Keywords in headings
    """
    if not html_content:
        return {
            "h1_count": 0,
            "h2_count": 0,
            "h3_count": 0,
            "h4_count": 0,
            "h5_count": 0,
            "h6_count": 0,
            "total_headings": 0,
            "headings": [],
            "issues": ["No content provided"],
            "score": 0,
        }

    soup = BeautifulSoup(html_content, 'html.parser')

    # Extract all headings
    headings = []
    heading_counts = {"h1": 0, "h2": 0, "h3": 0, "h4": 0, "h5": 0, "h6": 0}

    for level in range(1, 7):
        tag = f"h{level}"
        for heading in soup.find_all(tag):
            text = heading.get_text().strip()
            if text:
                headings.append({
                    "level": level,
                    "tag": tag,
                    "text": text[:100],  # Limit text length
                })
                heading_counts[tag] += 1

    total_headings = sum(heading_counts.values())

    # Analyze issues
    issues = []
    recommendations = []

    # Check H1
    if heading_counts["h1"] == 0:
        issues.append("Missing H1 heading")
        recommendations.append("Add an H1 heading with your main keyword")
    elif heading_counts["h1"] > 1:
        issues.append(f"Multiple H1 headings found ({heading_counts['h1']})")
        recommendations.append("Use only one H1 per page")

    # Check hierarchy
    prev_level = 0
    for h in headings:
        if h["level"] > prev_level + 1 and prev_level > 0:
            issues.append(f"Heading hierarchy skipped from H{prev_level} to H{h['level']}")
        prev_level = h["level"]

    # Check if too few headings
    if total_headings < 3:
        recommendations.append("Add more headings to structure your content")

    # Check if H2s are used
    if heading_counts["h2"] == 0 and total_headings > 0:
        issues.append("No H2 headings found")
        recommendations.append("Use H2 headings for main content sections")

    # Calculate score
    score = calculate_heading_score(heading_counts, issues)

    return {
        "h1_count": heading_counts["h1"],
        "h2_count": heading_counts["h2"],
        "h3_count": heading_counts["h3"],
        "h4_count": heading_counts["h4"],
        "h5_count": heading_counts["h5"],
        "h6_count": heading_counts["h6"],
        "total_headings": total_headings,
        "headings": headings[:20],  # Limit to first 20
        "issues": issues,
        "recommendations": recommendations,
        "score": score,
    }


def calculate_heading_score(counts: Dict, issues: List) -> int:
    """
    Calculate heading structure score (0-100).
    """
    score = 100

    # Deduct for issues
    score -= len(issues) * 15

    # Bonus for good structure
    if counts["h1"] == 1:
        score += 10
    if counts["h2"] >= 2:
        score += 10

    return max(0, min(100, score))


def analyze_images(html_content: str) -> Dict:
    """
    Audit images for alt text and SEO optimization.

    Checks:
    - Missing alt attributes
    - Empty alt text
    - Alt text length
    - Descriptive alt text
    """
    if not html_content:
        return {
            "total_images": 0,
            "with_alt": 0,
            "without_alt": 0,
            "empty_alt": 0,
            "images": [],
            "issues": [],
            "score": 100,
        }

    soup = BeautifulSoup(html_content, 'html.parser')
    images = soup.find_all('img')

    total = len(images)
    with_alt = 0
    without_alt = 0
    empty_alt = 0

    image_list = []
    issues = []

    for img in images:
        src = img.get('src', '')
        alt = img.get('alt')

        if alt is None:
            without_alt += 1
            status = "missing"
        elif alt.strip() == '':
            empty_alt += 1
            status = "empty"
        else:
            with_alt += 1
            status = "good"

        # Get filename from src
        filename = src.split('/')[-1].split('?')[0] if src else 'unknown'

        image_list.append({
            "src": src[:100] if src else None,
            "filename": filename[:50],
            "alt": alt[:100] if alt else None,
            "status": status,
        })

    # Generate issues
    if without_alt > 0:
        issues.append(f"{without_alt} image(s) missing alt attribute")
    if empty_alt > 0:
        issues.append(f"{empty_alt} image(s) have empty alt text")

    # Calculate score
    if total == 0:
        score = 100
    else:
        score = int((with_alt / total) * 100)

    return {
        "total_images": total,
        "with_alt": with_alt,
        "without_alt": without_alt,
        "empty_alt": empty_alt,
        "images": image_list[:20],  # Limit to first 20
        "issues": issues,
        "recommendations": generate_image_recommendations(without_alt, empty_alt),
        "score": score,
    }


def generate_image_recommendations(without_alt: int, empty_alt: int) -> List[str]:
    """
    Generate recommendations for image optimization.
    """
    recommendations = []

    if without_alt > 0:
        recommendations.append("Add descriptive alt text to all images for accessibility and SEO")
    if empty_alt > 0:
        recommendations.append("Replace empty alt attributes with descriptive text")

    recommendations.append("Use keywords naturally in alt text when relevant")
    recommendations.append("Keep alt text under 125 characters")

    return recommendations


def analyze_content_length(text: str, content_type: str = "article") -> Dict:
    """
    Analyze content length for SEO.

    Recommended lengths:
    - Blog post: 1000-2000 words
    - Article: 1500-2500 words
    - Landing page: 500-1000 words
    - Product page: 300-500 words
    """
    metrics = extract_text_metrics(text)
    word_count = metrics["words"]

    # Define thresholds based on content type
    thresholds = {
        "blog_post": {"min": 1000, "ideal_min": 1500, "ideal_max": 2000, "max": 3000},
        "article": {"min": 1500, "ideal_min": 2000, "ideal_max": 2500, "max": 4000},
        "landing_page": {"min": 500, "ideal_min": 700, "ideal_max": 1000, "max": 1500},
        "product_page": {"min": 300, "ideal_min": 400, "ideal_max": 500, "max": 800},
    }

    threshold = thresholds.get(content_type, thresholds["article"])

    # Determine status
    if word_count < threshold["min"]:
        status = "too_short"
        score = max(20, int((word_count / threshold["min"]) * 60))
    elif word_count < threshold["ideal_min"]:
        status = "short"
        score = 70
    elif word_count <= threshold["ideal_max"]:
        status = "ideal"
        score = 100
    elif word_count <= threshold["max"]:
        status = "long"
        score = 85
    else:
        status = "too_long"
        score = 70

    return {
        "word_count": word_count,
        "content_type": content_type,
        "status": status,
        "recommended_min": threshold["ideal_min"],
        "recommended_max": threshold["ideal_max"],
        "score": score,
        "recommendation": get_length_recommendation(word_count, threshold, status),
    }


def get_length_recommendation(word_count: int, threshold: Dict, status: str) -> str:
    """
    Get recommendation for content length.
    """
    if status == "too_short":
        return f"Add {threshold['min'] - word_count}+ words to reach minimum recommended length"
    elif status == "short":
        return f"Consider adding {threshold['ideal_min'] - word_count} more words for optimal SEO"
    elif status == "ideal":
        return "Content length is optimal for SEO"
    elif status == "long":
        return "Content is slightly long but acceptable"
    else:
        return "Consider breaking this into multiple pieces of content"


def calculate_overall_content_score(
    readability: Dict,
    keyword_analysis: Dict,
    heading_analysis: Dict,
    image_analysis: Dict,
    length_analysis: Dict
) -> Dict:
    """
    Calculate overall content SEO score.

    Weights:
    - Readability: 20%
    - Keywords: 25%
    - Headings: 20%
    - Images: 15%
    - Length: 20%
    """
    # Get individual scores
    readability_score = min(100, readability["scores"]["flesch_reading_ease"])
    keyword_score = keyword_analysis.get("score", 0)
    heading_score = heading_analysis.get("score", 0)
    image_score = image_analysis.get("score", 100)
    length_score = length_analysis.get("score", 0)

    # Apply weights
    weighted_scores = {
        "readability": {"score": readability_score, "weight": 0.20},
        "keywords": {"score": keyword_score, "weight": 0.25},
        "headings": {"score": heading_score, "weight": 0.20},
        "images": {"score": image_score, "weight": 0.15},
        "length": {"score": length_score, "weight": 0.20},
    }

    overall = sum(s["score"] * s["weight"] for s in weighted_scores.values())

    return {
        "overall_score": round(overall),
        "component_scores": {
            "readability": readability_score,
            "keywords": keyword_score,
            "headings": heading_score,
            "images": image_score,
            "length": length_score,
        },
        "grade": get_content_grade(overall),
    }


def get_content_grade(score: float) -> str:
    """
    Convert score to letter grade.
    """
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    elif score >= 70:
        return "C"
    elif score >= 60:
        return "D"
    else:
        return "F"


def analyze_content(
    content: str,
    html_content: str = None,
    primary_keyword: str = None,
    secondary_keywords: List[str] = None,
    content_type: str = "article",
    url: str = None
) -> Dict:
    """
    Perform comprehensive content analysis.

    Args:
        content: Plain text content
        html_content: Optional HTML content for structure analysis
        primary_keyword: Main target keyword
        secondary_keywords: Secondary keywords to track
        content_type: Type of content (article, blog_post, landing_page, product_page)
        url: Optional URL of the content

    Returns:
        Complete content analysis with scores and recommendations
    """
    # Use HTML content for structure, plain text for other analysis
    text_content = clean_html(html_content) if html_content else content
    structure_content = html_content or f"<p>{content}</p>"

    # Run all analyses
    readability = analyze_readability(text_content)
    keyword_analysis = analyze_keyword_density(
        text_content,
        primary_keyword or "",
        secondary_keywords or []
    )
    heading_analysis = analyze_heading_structure(structure_content)
    image_analysis = analyze_images(structure_content)
    length_analysis = analyze_content_length(text_content, content_type)

    # Calculate overall score
    overall = calculate_overall_content_score(
        readability,
        keyword_analysis,
        heading_analysis,
        image_analysis,
        length_analysis
    )

    # Compile all recommendations
    all_recommendations = []
    all_recommendations.extend(readability.get("recommendations", []))
    all_recommendations.extend(keyword_analysis.get("recommendations", []))
    all_recommendations.extend(heading_analysis.get("recommendations", []))
    all_recommendations.extend(image_analysis.get("recommendations", []))
    if length_analysis.get("recommendation"):
        all_recommendations.append(length_analysis["recommendation"])

    # Compile all issues
    all_issues = []
    all_issues.extend(keyword_analysis.get("issues", []))
    all_issues.extend(heading_analysis.get("issues", []))
    all_issues.extend(image_analysis.get("issues", []))

    return {
        "url": url,
        "content_type": content_type,
        "overall": overall,
        "readability": readability,
        "keyword_analysis": keyword_analysis,
        "heading_analysis": heading_analysis,
        "image_analysis": image_analysis,
        "length_analysis": length_analysis,
        "all_recommendations": all_recommendations[:10],  # Top 10
        "all_issues": all_issues[:10],  # Top 10
    }
