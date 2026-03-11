# Imports
import os
from pymongo import MongoClient

from modules.key import decrypt

# Variables
MONGODB_URI = os.getenv("MONGODB_URI", "")
if MONGODB_URI and not MONGODB_URI.startswith("mongodb+srv://"): MONGODB_URI = decrypt(MONGODB_URI)

# Functions
def data():
    try:
        client = MongoClient(MONGODB_URI)

        db = client["eventplanner"]

        collections = db.list_collection_names()

        print("Connected to MongoDB")
        print("Collections:", collections)

        return db

    except Exception as e:
        print("MongoDB connection failed:", e)
        return None

# Initialize
data()