# Imports
import os
from pymongo import MongoClient
from pymongo.collection import Collection

from modules.env import load_env
from modules.key import decrypt

# Variables
load_env()
MONGODB_URI = os.getenv("MONGODB_URI", "")
if MONGODB_URI and not MONGODB_URI.startswith("mongodb+srv://"): MONGODB_URI = decrypt(MONGODB_URI)

_client = None
_db = None

# Functions
def _get_database():
    global _client, _db

    if _db is not None: return _db
    if not MONGODB_URI: raise ValueError("MONGODB_URI is missing")

    _client = MongoClient(MONGODB_URI)
    _db = _client["eventplanner"]
    return _db

def _flatten_dict(value: dict, prefix: str = ""):
    output = {}

    for key, item in value.items():
        if not isinstance(key, str) or not key.strip(): raise ValueError("query keys must be non-empty strings")

        path = f"{prefix}.{key.strip()}" if prefix else key.strip()
        if isinstance(item, dict) and item: output.update(_flatten_dict(item, path))
        else: output[path] = item

    return output

def _normalize_key(key):
    if isinstance(key, str):
        if not key.strip(): raise ValueError("key must be a non-empty string")
        return key.strip()

    if isinstance(key, dict):
        if not key: raise ValueError("key query cannot be empty")
        return key

    raise ValueError("key must be a non-empty string or a non-empty dict")

def _get_nested_value(value: dict, path: str):
    current = value

    for part in path.split("."):
        if not isinstance(current, dict) or part not in current: return None, False
        current = current[part]

    return current, True

def _find_matching_document(collection: Collection, key):
    normalized_key = _normalize_key(key)

    if isinstance(normalized_key, str): return collection.find_one({"_id": normalized_key})
    if "_id" in normalized_key: return collection.find_one({"_id": normalized_key["_id"]})

    query_items = _flatten_dict(normalized_key)

    for document in collection.find():
        value = document.get("value")
        if not isinstance(value, dict): continue

        matches_all = True
        for path, expected in query_items.items():
            current, exists = _get_nested_value(value, path)
            if not exists or current != expected:
                matches_all = False
                break

        if matches_all: return document

    return None

class database:
    def __init__(self, collection_name: str):
        if not isinstance(collection_name, str) or not collection_name.strip(): raise ValueError("collection_name must be a non-empty string")

        database = _get_database()
        self.collection_name = collection_name.strip()
        self.collection: Collection = database[self.collection_name]

    def get_document(self, key, default=None):
        document = _find_matching_document(self.collection, key)
        if document is None: return default, None
        return document.get("value", default), document.get("_id")

    def set_document(self, key: str, value):
        if not isinstance(key, str) or not key.strip(): raise ValueError("key must be a non-empty string")

        key = key.strip()

        if value is None:
            self.collection.delete_one({"_id": key})
            return None, key

        self.collection.update_one({"_id": key}, {"$set": {"value": value}}, upsert=True)
        return value, key

    def remove_document(self, key):
        document = _find_matching_document(self.collection, key)
        if document is None: return None, None

        result = self.collection.delete_one({"_id": document["_id"]})
        if result.deleted_count <= 0: return None, None
        return document.get("value"), document["_id"]
    
    def get_collection(self):
        output = []

        for document in self.collection.find():
            output.append({"key": document.get("_id"), "value": document.get("value")})

        return output
    
    def remove_collection(self):
        if self.collection_name not in _get_database().list_collection_names(): return None

        output = self.get_collection()
        self.collection.drop()
        return output
    
# Initialize
__all__ = ["database"]
