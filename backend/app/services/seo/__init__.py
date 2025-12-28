"""
SEO Services Module

Provides keyword research, content analysis, technical SEO,
and other SEO-related services.
"""
from .keyword_research import (
    generate_related_keywords,
    generate_long_tail_keywords,
    generate_question_keywords,
    cluster_keywords_by_topic,
    analyze_keyword,
    estimate_keyword_difficulty,
    estimate_search_volume,
    determine_keyword_type,
    determine_competition,
)

from .readability import (
    analyze_readability,
    extract_text_metrics,
    flesch_reading_ease,
    flesch_kincaid_grade,
    smog_index,
    coleman_liau_index,
    automated_readability_index,
    gunning_fog_index,
)

from .content_analyzer import (
    analyze_content,
    analyze_keyword_density,
    analyze_heading_structure,
    analyze_images,
    analyze_content_length,
    clean_html,
)

from .page_speed import (
    analyze_page_speed,
    get_core_web_vitals,
    check_mobile_friendliness,
    get_score_interpretation,
)

from .link_checker import (
    scan_page_links,
    check_single_link,
    check_ssl_certificate,
    get_link_health_score,
)

from .schema_validator import (
    extract_structured_data,
    validate_schema,
    validate_page_structured_data,
    get_schema_template,
    get_available_schema_types,
)

from .technical_audit import (
    run_full_technical_audit,
    get_quick_technical_check,
)

__all__ = [
    # Keyword Research
    "generate_related_keywords",
    "generate_long_tail_keywords",
    "generate_question_keywords",
    "cluster_keywords_by_topic",
    "analyze_keyword",
    "estimate_keyword_difficulty",
    "estimate_search_volume",
    "determine_keyword_type",
    "determine_competition",
    # Readability
    "analyze_readability",
    "extract_text_metrics",
    "flesch_reading_ease",
    "flesch_kincaid_grade",
    "smog_index",
    "coleman_liau_index",
    "automated_readability_index",
    "gunning_fog_index",
    # Content Analysis
    "analyze_content",
    "analyze_keyword_density",
    "analyze_heading_structure",
    "analyze_images",
    "analyze_content_length",
    "clean_html",
    # PageSpeed
    "analyze_page_speed",
    "get_core_web_vitals",
    "check_mobile_friendliness",
    "get_score_interpretation",
    # Link Checker
    "scan_page_links",
    "check_single_link",
    "check_ssl_certificate",
    "get_link_health_score",
    # Schema Validator
    "extract_structured_data",
    "validate_schema",
    "validate_page_structured_data",
    "get_schema_template",
    "get_available_schema_types",
    # Technical Audit
    "run_full_technical_audit",
    "get_quick_technical_check",
]
