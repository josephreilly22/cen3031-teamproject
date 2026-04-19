# Imports
import os
from pymongo import MongoClient
from pymongo.collection import Collection

from modules.env import load_env
from modules.key import decrypt

# Variables
load_env()
# Decrypt MongoDB connection URI if it's encrypted
MONGODB_URI = os.getenv("MONGODB_URI", "")
if MONGODB_URI and not MONGODB_URI.startswith("mongodb+srv://"): MONGODB_URI = decrypt(MONGODB_URI)

# Global MongoDB connection and database instance
_client = None
_db = None
_indexed_collections = set()
MONGODB_CLIENT_OPTIONS = {
    "serverSelectionTimeoutMS": 5000,
    "connectTimeoutMS": 5000,
    "socketTimeoutMS": 15000,
    "retryReads": True,
    "retryWrites": True,
}
COLLECTION_INDEXES = {
    "Users": ["value.role"],
    "Events": ["value.owner_email", "value.location_types", "value.date", "value.end_date"],
    "EventReports": ["value.event_id", "value.reporter_email"],
}

# Functions
# Initialize MongoDB connection to 'eventplanner' database
def _get_database():
    global _client, _db

    if _db is not None: return _db
    if not MONGODB_URI: raise ValueError("MONGODB_URI is missing")

    _client = MongoClient(MONGODB_URI, **MONGODB_CLIENT_OPTIONS)
    _db = _client["eventplanner"]
    return _db

# Flatten nested dictionary into dot-notation paths for MongoDB queries
# Example: {"user": {"name": "John"}} -> {"user.name": "John"}
def _flatten_dict(value: dict, prefix: str = ""):
    output = {}

    for key, item in value.items():
        if not isinstance(key, str) or not key.strip(): raise ValueError("query keys must be non-empty strings")

        path = f"{prefix}.{key.strip()}" if prefix else key.strip()
        if isinstance(item, dict) and item and not any(str(sub_key).startswith("$") for sub_key in item):
            output.update(_flatten_dict(item, path))
        else: output[path] = item

    return output

# Validate and normalize key parameter for database queries
def _normalize_key(key):
    if isinstance(key, str):
        if not key.strip(): raise ValueError("key must be a non-empty string")
        return key.strip()

    if isinstance(key, dict):
        if not key: raise ValueError("key query cannot be empty")
        return key

    raise ValueError("key must be a non-empty string or a non-empty dict")

# Extract nested value from dictionary using dot notation path
# Example: get "user.name" from {"user": {"name": "John"}}
def _get_nested_value(value: dict, path: str):
    current = value

    for part in path.split("."):
        if not isinstance(current, dict) or part not in current: return None, False
        current = current[part]

    return current, True

# Find document in collection by key (supports both ID and nested queries)
def _find_matching_document(collection: Collection, key):
    normalized_key = _normalize_key(key)

    if isinstance(normalized_key, str): return collection.find_one({"_id": normalized_key})
    if "_id" in normalized_key: return collection.find_one({"_id": normalized_key["_id"]})

    query_items = _flatten_dict(normalized_key)
    # Query nested values stored in 'value' field
    mongo_query = {f"value.{path}": expected for path, expected in query_items.items()}
    return collection.find_one(mongo_query)

# Build MongoDB query from key parameter for finding documents
def _build_collection_query(key=None):
    if key is None:
        return {}

    normalized_key = _normalize_key(key)
    if isinstance(normalized_key, str):
        return {"_id": normalized_key}

    if "_id" in normalized_key:
        return {"_id": normalized_key["_id"]}

    query_items = _flatten_dict(normalized_key)
    return {f"value.{path}": expected for path, expected in query_items.items()}

# Database wrapper class - provides simple key-value operations on MongoDB collections
class database:
    # Initialize database interface for a collection
    def __init__(self, collection_name: str):
        if not isinstance(collection_name, str) or not collection_name.strip(): raise ValueError("collection_name must be a non-empty string")

        database = _get_database()
        self.collection_name = collection_name.strip()
        self.collection: Collection = database[self.collection_name]
        self._ensure_indexes()

    def _ensure_indexes(self):
        if self.collection_name in _indexed_collections:
            return

        try:
            for field_name in COLLECTION_INDEXES.get(self.collection_name, []):
                index_name = f"{field_name.replace('.', '_')}_idx"
                self.collection.create_index([(field_name, 1)], name=index_name)
        except Exception:
            return

        _indexed_collections.add(self.collection_name)

    # Get single document from collection - returns (value, id) tuple
    def get_document(self, key, default=None):
        document = _find_matching_document(self.collection, key)
        if document is None: return default, None
        return document.get("value", default), document.get("_id")

    # Set or update document in collection - returns (value, key) tuple
    def set_document(self, key: str, value):
        if not isinstance(key, str) or not key.strip(): raise ValueError("key must be a non-empty string")

        key = key.strip()

        if value is None:
            # Delete document if value is None
            self.collection.delete_one({"_id": key})
            return None, key

        # Create or update document with value wrapped in 'value' field
        self.collection.update_one({"_id": key}, {"$set": {"value": value}}, upsert=True)
        return value, key

    # Remove and return document from collection
    def remove_document(self, key):
        document = _find_matching_document(self.collection, key)
        if document is None: return None, None

        result = self.collection.delete_one({"_id": document["_id"]})
        if result.deleted_count <= 0: return None, None
        return document.get("value"), document["_id"]
    
    # Retrieve all documents (optionally filtered) - returns list of {key, value} pairs
    def get_collection(self, key=None):
        output = []

        for document in self.collection.find(_build_collection_query(key)):
            output.append({"key": document.get("_id"), "value": document.get("value")})

        return output
    
    # Delete entire collection and return all documents before deletion
    def remove_collection(self):
        if self.collection_name not in _get_database().list_collection_names(): return None

        output = self.get_collection()
        self.collection.drop()
        return output
    
# Initialize
__all__ = ["database"]
