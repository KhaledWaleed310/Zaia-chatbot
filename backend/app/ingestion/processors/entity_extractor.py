"""
Entity extraction using spaCy NLP.

Extracts named entities from text including:
- PERSON: People, including fictional
- ORG: Organizations, companies, agencies
- GPE: Geopolitical entities (countries, cities, states)
- PRODUCT: Products, services
- EVENT: Named events
- And more...
"""

import logging
from typing import List, Dict, Any, Set
import asyncio
from collections import defaultdict

logger = logging.getLogger(__name__)


class EntityExtractor:
    """
    Entity extractor using spaCy for NLP-based entity recognition.

    Identifies and extracts named entities from text, providing structured
    information about people, organizations, locations, products, and other entities.
    """

    def __init__(self, model_name: str = "en_core_web_sm", batch_size: int = 32):
        """
        Initialize entity extractor.

        Args:
            model_name: spaCy model to use
            batch_size: Batch size for processing multiple texts
        """
        self.model_name = model_name
        self.batch_size = batch_size
        self.nlp = None

        # Entity types to extract
        self.entity_types = {
            "PERSON",
            "ORG",
            "GPE",
            "PRODUCT",
            "EVENT",
            "WORK_OF_ART",
            "LAW",
            "LANGUAGE",
            "DATE",
            "TIME",
            "MONEY",
            "QUANTITY",
            "ORDINAL",
            "CARDINAL",
        }

    async def initialize(self):
        """Initialize spaCy model."""
        if self.nlp is None:
            try:
                import spacy

                logger.info(f"Loading spaCy model: {self.model_name}")
                self.nlp = await asyncio.to_thread(spacy.load, self.model_name)
                logger.info("spaCy model loaded successfully")

            except ImportError:
                logger.error(
                    "spaCy not installed. Install with: pip install spacy && "
                    "python -m spacy download en_core_web_sm"
                )
                raise
            except OSError:
                logger.error(
                    f"spaCy model '{self.model_name}' not found. "
                    f"Download with: python -m spacy download {self.model_name}"
                )
                raise

    async def extract(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract entities from a single text.

        Args:
            text: Text to extract entities from

        Returns:
            List of entity dictionaries with text, type, and position
        """
        if self.nlp is None:
            await self.initialize()

        try:
            if not text or not text.strip():
                return []

            # Process text in thread pool
            entities = await asyncio.to_thread(self._extract_entities, text)
            return entities

        except Exception as e:
            logger.error(f"Error extracting entities: {e}")
            return []

    def _extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract entities from text (synchronous).

        Args:
            text: Text to process

        Returns:
            List of entity dictionaries
        """
        try:
            # Process with spaCy
            doc = self.nlp(text)

            entities = []
            seen_entities = set()  # Avoid duplicates

            for ent in doc.ents:
                # Filter by entity type
                if ent.label_ in self.entity_types:
                    # Create unique key to avoid duplicates
                    entity_key = (ent.text.lower(), ent.label_)

                    if entity_key not in seen_entities:
                        entities.append({
                            "text": ent.text,
                            "type": ent.label_,
                            "start": ent.start_char,
                            "end": ent.end_char,
                        })
                        seen_entities.add(entity_key)

            return entities

        except Exception as e:
            logger.error(f"Error in entity extraction: {e}")
            return []

    async def extract_batch(self, texts: List[str]) -> List[List[Dict[str, Any]]]:
        """
        Extract entities from multiple texts efficiently.

        Args:
            texts: List of texts to process

        Returns:
            List of entity lists, one per input text
        """
        if self.nlp is None:
            await self.initialize()

        try:
            if not texts:
                return []

            # Process in batches using thread pool
            all_entities = await asyncio.to_thread(
                self._extract_batch,
                texts,
            )

            return all_entities

        except Exception as e:
            logger.error(f"Error in batch entity extraction: {e}")
            return [[] for _ in texts]

    def _extract_batch(self, texts: List[str]) -> List[List[Dict[str, Any]]]:
        """
        Extract entities from batch of texts (synchronous).

        Args:
            texts: List of texts to process

        Returns:
            List of entity lists
        """
        try:
            all_entities = []

            # Process texts in batches using spaCy's pipe
            for doc in self.nlp.pipe(texts, batch_size=self.batch_size):
                entities = []
                seen_entities = set()

                for ent in doc.ents:
                    if ent.label_ in self.entity_types:
                        entity_key = (ent.text.lower(), ent.label_)
                        if entity_key not in seen_entities:
                            entities.append({
                                "text": ent.text,
                                "type": ent.label_,
                                "start": ent.start_char,
                                "end": ent.end_char,
                            })
                            seen_entities.add(entity_key)

                all_entities.append(entities)

            return all_entities

        except Exception as e:
            logger.error(f"Error in batch processing: {e}")
            return [[] for _ in texts]

    async def extract_unique_entities(
        self, text: str
    ) -> Dict[str, List[str]]:
        """
        Extract unique entities grouped by type.

        Args:
            text: Text to extract from

        Returns:
            Dictionary mapping entity types to lists of unique entity texts
        """
        entities = await self.extract(text)

        # Group by type
        grouped = defaultdict(set)
        for ent in entities:
            grouped[ent["type"]].add(ent["text"])

        # Convert sets to sorted lists
        return {
            ent_type: sorted(list(texts))
            for ent_type, texts in grouped.items()
        }

    async def extract_entity_graph(
        self, text: str
    ) -> Dict[str, Any]:
        """
        Extract entities and their relationships for knowledge graph.

        Args:
            text: Text to process

        Returns:
            Dictionary with entities and their co-occurrence relationships
        """
        if self.nlp is None:
            await self.initialize()

        try:
            result = await asyncio.to_thread(self._build_entity_graph, text)
            return result

        except Exception as e:
            logger.error(f"Error building entity graph: {e}")
            return {"entities": [], "relationships": []}

    def _build_entity_graph(self, text: str) -> Dict[str, Any]:
        """
        Build entity graph from text (synchronous).

        Args:
            text: Text to process

        Returns:
            Graph dictionary
        """
        try:
            doc = self.nlp(text)

            # Extract entities with sentence context
            entities_by_sentence = defaultdict(list)

            for sent in doc.sents:
                sent_entities = []
                for ent in sent.ents:
                    if ent.label_ in self.entity_types:
                        sent_entities.append({
                            "text": ent.text,
                            "type": ent.label_,
                        })
                if sent_entities:
                    entities_by_sentence[sent.text] = sent_entities

            # Build co-occurrence relationships
            relationships = []
            for sentence, entities in entities_by_sentence.items():
                # Create relationships between entities in same sentence
                for i, ent1 in enumerate(entities):
                    for ent2 in entities[i + 1:]:
                        relationships.append({
                            "source": ent1["text"],
                            "source_type": ent1["type"],
                            "target": ent2["text"],
                            "target_type": ent2["type"],
                            "context": sentence[:200],  # First 200 chars of sentence
                            "relationship": "co_occurs_with",
                        })

            # Get unique entities
            all_entities = []
            seen = set()
            for entities in entities_by_sentence.values():
                for ent in entities:
                    key = (ent["text"], ent["type"])
                    if key not in seen:
                        all_entities.append(ent)
                        seen.add(key)

            return {
                "entities": all_entities,
                "relationships": relationships,
                "entity_count": len(all_entities),
                "relationship_count": len(relationships),
            }

        except Exception as e:
            logger.error(f"Error building graph: {e}")
            return {"entities": [], "relationships": []}

    async def extract_with_context(
        self, text: str, context_window: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Extract entities with surrounding context.

        Args:
            text: Text to extract from
            context_window: Number of characters before/after entity to include

        Returns:
            List of entities with context
        """
        entities = await self.extract(text)

        # Add context to each entity
        for ent in entities:
            start = max(0, ent["start"] - context_window)
            end = min(len(text), ent["end"] + context_window)

            ent["context"] = text[start:end]
            ent["context_start"] = start
            ent["context_end"] = end

        return entities

    def get_supported_entity_types(self) -> Set[str]:
        """
        Get the set of entity types that will be extracted.

        Returns:
            Set of entity type labels
        """
        return self.entity_types.copy()

    def set_entity_types(self, types: Set[str]):
        """
        Set which entity types to extract.

        Args:
            types: Set of entity type labels to extract
        """
        self.entity_types = types.copy()
        logger.info(f"Entity types set to: {self.entity_types}")
