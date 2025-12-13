import spacy
from typing import List, Dict, Tuple
from collections import defaultdict

# Load spaCy model globally
_nlp = None


def get_nlp():
    global _nlp
    if _nlp is None:
        _nlp = spacy.load("en_core_web_sm")
    return _nlp


def extract_entities(text: str) -> List[Dict]:
    """
    Extract named entities from text using spaCy NER.
    Returns list of {text, label, start, end}.
    """
    nlp = get_nlp()
    doc = nlp(text)

    entities = []
    for ent in doc.ents:
        entities.append({
            "text": ent.text,
            "label": ent.label_,
            "start": ent.start_char,
            "end": ent.end_char
        })

    return entities


def extract_entities_with_relations(text: str) -> Tuple[List[Dict], List[Dict]]:
    """
    Extract entities and their co-occurrence relations.
    Returns (entities, relations).
    """
    nlp = get_nlp()
    doc = nlp(text)

    # Extract entities
    entities = []
    entity_map = {}  # Map entity text to entity info

    for ent in doc.ents:
        entity_key = ent.text.lower()
        if entity_key not in entity_map:
            entity_info = {
                "text": ent.text,
                "label": ent.label_,
                "mentions": 1
            }
            entity_map[entity_key] = entity_info
            entities.append(entity_info)
        else:
            entity_map[entity_key]["mentions"] += 1

    # Extract relations based on sentence co-occurrence
    relations = []
    for sent in doc.sents:
        sent_entities = [ent for ent in doc.ents if ent.start >= sent.start and ent.end <= sent.end]

        # Create relations between entities in the same sentence
        for i, ent1 in enumerate(sent_entities):
            for ent2 in sent_entities[i + 1:]:
                relations.append({
                    "source": ent1.text,
                    "source_label": ent1.label_,
                    "target": ent2.text,
                    "target_label": ent2.label_,
                    "relation_type": "co_occurs_with"
                })

    return entities, relations


def merge_entities(entities_list: List[List[Dict]]) -> List[Dict]:
    """Merge entities from multiple chunks, aggregating mentions."""
    merged = defaultdict(lambda: {"text": "", "label": "", "mentions": 0})

    for entities in entities_list:
        for ent in entities:
            key = ent["text"].lower()
            if not merged[key]["text"]:
                merged[key]["text"] = ent["text"]
                merged[key]["label"] = ent["label"]
            merged[key]["mentions"] += ent.get("mentions", 1)

    return list(merged.values())
