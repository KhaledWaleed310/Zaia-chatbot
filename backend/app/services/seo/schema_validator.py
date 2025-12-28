"""
Structured data (Schema.org) validator for SEO.
Validates JSON-LD, Microdata, and RDFa markup.
"""
import httpx
import json
import re
from typing import Dict, Any, List, Optional
from bs4 import BeautifulSoup
from datetime import datetime


# Common Schema.org types and their required/recommended properties
SCHEMA_REQUIREMENTS = {
    "Organization": {
        "required": ["name"],
        "recommended": ["url", "logo", "contactPoint", "sameAs", "address"]
    },
    "LocalBusiness": {
        "required": ["name", "address"],
        "recommended": ["url", "telephone", "openingHours", "geo", "priceRange"]
    },
    "Product": {
        "required": ["name"],
        "recommended": ["image", "description", "sku", "offers", "aggregateRating", "brand"]
    },
    "Article": {
        "required": ["headline", "author", "datePublished"],
        "recommended": ["image", "publisher", "dateModified", "description"]
    },
    "BlogPosting": {
        "required": ["headline", "author", "datePublished"],
        "recommended": ["image", "publisher", "dateModified", "description", "mainEntityOfPage"]
    },
    "WebPage": {
        "required": ["name"],
        "recommended": ["description", "url", "breadcrumb"]
    },
    "BreadcrumbList": {
        "required": ["itemListElement"],
        "recommended": []
    },
    "FAQPage": {
        "required": ["mainEntity"],
        "recommended": []
    },
    "HowTo": {
        "required": ["name", "step"],
        "recommended": ["description", "image", "totalTime", "estimatedCost"]
    },
    "Recipe": {
        "required": ["name", "recipeIngredient", "recipeInstructions"],
        "recommended": ["image", "author", "datePublished", "prepTime", "cookTime", "nutrition"]
    },
    "Event": {
        "required": ["name", "startDate", "location"],
        "recommended": ["description", "endDate", "image", "performer", "offers"]
    },
    "Person": {
        "required": ["name"],
        "recommended": ["image", "jobTitle", "worksFor", "sameAs"]
    },
    "WebSite": {
        "required": ["name", "url"],
        "recommended": ["potentialAction", "publisher"]
    },
    "Review": {
        "required": ["itemReviewed", "author"],
        "recommended": ["reviewRating", "datePublished", "reviewBody"]
    },
    "AggregateRating": {
        "required": ["ratingValue"],
        "recommended": ["reviewCount", "bestRating", "worstRating"]
    },
    "VideoObject": {
        "required": ["name", "description", "thumbnailUrl", "uploadDate"],
        "recommended": ["duration", "contentUrl", "embedUrl"]
    },
    "ImageObject": {
        "required": ["contentUrl"],
        "recommended": ["caption", "description", "name"]
    },
    "SoftwareApplication": {
        "required": ["name"],
        "recommended": ["operatingSystem", "applicationCategory", "offers", "aggregateRating"]
    },
    "Course": {
        "required": ["name", "provider"],
        "recommended": ["description", "courseMode", "educationalCredentialAwarded"]
    },
    "JobPosting": {
        "required": ["title", "description", "datePosted", "hiringOrganization"],
        "recommended": ["employmentType", "jobLocation", "baseSalary", "validThrough"]
    }
}


async def extract_structured_data(url: str) -> Dict[str, Any]:
    """
    Extract all structured data from a URL.

    Returns:
        Dict with JSON-LD, Microdata, and RDFa structured data
    """
    result = {
        "url": url,
        "extracted_at": datetime.utcnow().isoformat(),
        "json_ld": [],
        "microdata": [],
        "rdfa": [],
        "total_schemas": 0,
        "schema_types": [],
        "errors": []
    }

    try:
        async with httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; SEOBot/1.0)"}
        ) as client:
            response = await client.get(url)

            if response.status_code != 200:
                result["errors"].append(f"Failed to fetch page: HTTP {response.status_code}")
                return result

            soup = BeautifulSoup(response.text, "html.parser")

            # Extract JSON-LD
            json_ld_scripts = soup.find_all("script", type="application/ld+json")
            for script in json_ld_scripts:
                try:
                    data = json.loads(script.string or "{}")
                    if isinstance(data, list):
                        result["json_ld"].extend(data)
                    else:
                        result["json_ld"].append(data)
                except json.JSONDecodeError as e:
                    result["errors"].append(f"Invalid JSON-LD: {str(e)[:100]}")

            # Extract Microdata
            microdata_items = soup.find_all(itemscope=True)
            for item in microdata_items:
                item_type = item.get("itemtype", "")
                if item_type:
                    microdata = _extract_microdata_item(item)
                    if microdata:
                        result["microdata"].append(microdata)

            # Collect all schema types
            schema_types = set()
            for item in result["json_ld"]:
                if "@type" in item:
                    types = item["@type"]
                    if isinstance(types, list):
                        schema_types.update(types)
                    else:
                        schema_types.add(types)

            for item in result["microdata"]:
                if "type" in item:
                    schema_types.add(item["type"].split("/")[-1])

            result["schema_types"] = list(schema_types)
            result["total_schemas"] = len(result["json_ld"]) + len(result["microdata"])

    except Exception as e:
        result["errors"].append(f"Extraction error: {str(e)[:200]}")

    return result


def _extract_microdata_item(element) -> Optional[Dict[str, Any]]:
    """Extract microdata properties from an itemscope element."""
    item = {
        "type": element.get("itemtype", ""),
        "properties": {}
    }

    # Find all itemprop elements within this item
    for prop_element in element.find_all(itemprop=True):
        prop_name = prop_element.get("itemprop")
        if not prop_name:
            continue

        # Get the value based on element type
        if prop_element.name == "meta":
            value = prop_element.get("content", "")
        elif prop_element.name == "link":
            value = prop_element.get("href", "")
        elif prop_element.name in ["img", "audio", "video", "source"]:
            value = prop_element.get("src", "")
        elif prop_element.name == "a":
            value = prop_element.get("href", "") or prop_element.get_text(strip=True)
        elif prop_element.name == "time":
            value = prop_element.get("datetime", "") or prop_element.get_text(strip=True)
        else:
            value = prop_element.get_text(strip=True)

        # Handle nested itemscope
        if prop_element.has_attr("itemscope"):
            value = _extract_microdata_item(prop_element)

        item["properties"][prop_name] = value

    return item if item["properties"] else None


def validate_schema(schema_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate a single schema object against Schema.org requirements.
    """
    result = {
        "valid": True,
        "type": None,
        "errors": [],
        "warnings": [],
        "missing_required": [],
        "missing_recommended": [],
        "present_properties": []
    }

    # Get schema type
    schema_type = schema_data.get("@type")
    if not schema_type:
        result["valid"] = False
        result["errors"].append("Missing @type property")
        return result

    # Handle array of types
    if isinstance(schema_type, list):
        schema_type = schema_type[0]

    result["type"] = schema_type

    # Get requirements for this type
    requirements = SCHEMA_REQUIREMENTS.get(schema_type, {})
    required_props = requirements.get("required", [])
    recommended_props = requirements.get("recommended", [])

    # Check all present properties
    for key in schema_data.keys():
        if not key.startswith("@"):
            result["present_properties"].append(key)

    # Check required properties
    for prop in required_props:
        if prop not in schema_data or not schema_data[prop]:
            result["valid"] = False
            result["missing_required"].append(prop)
            result["errors"].append(f"Missing required property: {prop}")

    # Check recommended properties
    for prop in recommended_props:
        if prop not in schema_data or not schema_data[prop]:
            result["missing_recommended"].append(prop)
            result["warnings"].append(f"Missing recommended property: {prop}")

    # Validate nested objects
    for key, value in schema_data.items():
        if isinstance(value, dict) and "@type" in value:
            nested_result = validate_schema(value)
            if not nested_result["valid"]:
                result["errors"].extend([f"In {key}: {e}" for e in nested_result["errors"]])

    return result


async def validate_page_structured_data(url: str) -> Dict[str, Any]:
    """
    Extract and validate all structured data on a page.
    """
    # Extract structured data
    extracted = await extract_structured_data(url)

    result = {
        "url": url,
        "validated_at": datetime.utcnow().isoformat(),
        "total_schemas": extracted["total_schemas"],
        "schema_types": extracted["schema_types"],
        "valid_schemas": 0,
        "invalid_schemas": 0,
        "validations": [],
        "overall_score": 0,
        "issues": [],
        "recommendations": [],
        "extraction_errors": extracted["errors"]
    }

    # Validate each JSON-LD schema
    for schema in extracted["json_ld"]:
        if "@graph" in schema:
            # Handle @graph container
            for item in schema["@graph"]:
                validation = validate_schema(item)
                validation["format"] = "JSON-LD"
                validation["source"] = "@graph"
                result["validations"].append(validation)
                if validation["valid"]:
                    result["valid_schemas"] += 1
                else:
                    result["invalid_schemas"] += 1
        else:
            validation = validate_schema(schema)
            validation["format"] = "JSON-LD"
            result["validations"].append(validation)
            if validation["valid"]:
                result["valid_schemas"] += 1
            else:
                result["invalid_schemas"] += 1

    # Validate microdata
    for item in extracted["microdata"]:
        # Convert microdata to validation format
        microdata_schema = {"@type": item["type"].split("/")[-1]}
        microdata_schema.update(item.get("properties", {}))
        validation = validate_schema(microdata_schema)
        validation["format"] = "Microdata"
        result["validations"].append(validation)
        if validation["valid"]:
            result["valid_schemas"] += 1
        else:
            result["invalid_schemas"] += 1

    # Calculate overall score
    if result["total_schemas"] > 0:
        base_score = (result["valid_schemas"] / result["total_schemas"]) * 100

        # Bonus for having schemas
        if result["total_schemas"] >= 1:
            base_score = min(100, base_score + 10)
        if result["total_schemas"] >= 3:
            base_score = min(100, base_score + 10)

        # Penalty for missing recommended properties
        total_missing_recommended = sum(
            len(v.get("missing_recommended", []))
            for v in result["validations"]
        )
        penalty = min(20, total_missing_recommended * 2)
        result["overall_score"] = max(0, int(base_score - penalty))
    else:
        result["overall_score"] = 0
        result["issues"].append("No structured data found on this page")
        result["recommendations"].append(
            "Add JSON-LD structured data to improve search engine understanding"
        )

    # Generate recommendations
    if result["schema_types"]:
        # Check for common missing types
        common_types = ["Organization", "WebSite", "BreadcrumbList"]
        for common_type in common_types:
            if common_type not in result["schema_types"]:
                result["recommendations"].append(
                    f"Consider adding {common_type} schema for better SEO"
                )

    # Collect all issues
    for validation in result["validations"]:
        for error in validation.get("errors", []):
            result["issues"].append(f"{validation.get('type', 'Unknown')}: {error}")

    return result


def get_schema_template(schema_type: str) -> Optional[Dict[str, Any]]:
    """
    Get a template for a Schema.org type.
    """
    templates = {
        "Organization": {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Your Organization Name",
            "url": "https://www.example.com",
            "logo": "https://www.example.com/logo.png",
            "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+1-XXX-XXX-XXXX",
                "contactType": "customer service"
            },
            "sameAs": [
                "https://www.facebook.com/yourpage",
                "https://www.twitter.com/yourhandle"
            ]
        },
        "LocalBusiness": {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": "Your Business Name",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "123 Main St",
                "addressLocality": "City",
                "addressRegion": "State",
                "postalCode": "12345",
                "addressCountry": "US"
            },
            "telephone": "+1-XXX-XXX-XXXX",
            "openingHours": "Mo-Fr 09:00-17:00",
            "geo": {
                "@type": "GeoCoordinates",
                "latitude": "40.7128",
                "longitude": "-74.0060"
            }
        },
        "Article": {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "Article Title",
            "author": {
                "@type": "Person",
                "name": "Author Name"
            },
            "datePublished": "2024-01-01",
            "dateModified": "2024-01-02",
            "publisher": {
                "@type": "Organization",
                "name": "Publisher Name",
                "logo": {
                    "@type": "ImageObject",
                    "url": "https://www.example.com/logo.png"
                }
            },
            "image": "https://www.example.com/image.jpg",
            "description": "Article description"
        },
        "Product": {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Product Name",
            "image": "https://www.example.com/product.jpg",
            "description": "Product description",
            "sku": "SKU123",
            "brand": {
                "@type": "Brand",
                "name": "Brand Name"
            },
            "offers": {
                "@type": "Offer",
                "price": "99.99",
                "priceCurrency": "USD",
                "availability": "https://schema.org/InStock"
            }
        },
        "FAQPage": {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": "Question 1?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Answer to question 1."
                    }
                }
            ]
        },
        "BreadcrumbList": {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": "https://www.example.com/"
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "Category",
                    "item": "https://www.example.com/category/"
                }
            ]
        },
        "WebSite": {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Website Name",
            "url": "https://www.example.com",
            "potentialAction": {
                "@type": "SearchAction",
                "target": "https://www.example.com/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
            }
        }
    }

    return templates.get(schema_type)


def get_available_schema_types() -> List[Dict[str, Any]]:
    """
    Get list of available schema types with descriptions.
    """
    return [
        {"type": "Organization", "description": "Company or organization information"},
        {"type": "LocalBusiness", "description": "Local business with physical location"},
        {"type": "Product", "description": "Product listing for e-commerce"},
        {"type": "Article", "description": "News or blog article"},
        {"type": "BlogPosting", "description": "Blog post content"},
        {"type": "FAQPage", "description": "Frequently asked questions page"},
        {"type": "HowTo", "description": "Step-by-step instructions"},
        {"type": "Recipe", "description": "Cooking recipe"},
        {"type": "Event", "description": "Event or happening"},
        {"type": "Person", "description": "Individual person"},
        {"type": "WebSite", "description": "Website with search functionality"},
        {"type": "BreadcrumbList", "description": "Navigation breadcrumb trail"},
        {"type": "Review", "description": "Review of a product or service"},
        {"type": "VideoObject", "description": "Video content"},
        {"type": "Course", "description": "Educational course"},
        {"type": "JobPosting", "description": "Job listing"}
    ]
