# Imports
import uuid
from datetime import datetime
from modules.database import database

# Variables
events_database = database("Events")

# Functions
def create_event(owner_email: str, title: str, host: str, date: str, location: str, description: str):
    event_id = str(uuid.uuid4())
    event = {
        "id": event_id,
        "owner_email": owner_email,
        "title": title,
        "host": host,
        "date": date,
        "location": location,
        "description": description,
        "created_at": datetime.utcnow().isoformat(),
    }
    events_database.set_document(event_id, event)
    return {"success": True, "message": "Event created", "event": event}

def get_events_by_host(owner_email: str):
    all_events = events_database.get_collection()
    events = [
        doc["value"] for doc in all_events
        if isinstance(doc.get("value"), dict) and doc["value"].get("owner_email") == owner_email
    ]
    events.sort(key=lambda e: e.get("created_at", ""), reverse=True)
    return {"success": True, "events": events}

def get_all_events():
    all_events = events_database.get_collection()
    events = [doc["value"] for doc in all_events if isinstance(doc.get("value"), dict)]
    events.sort(key=lambda e: e.get("date", ""))
    return {"success": True, "events": events}

# Initialize
__all__ = ["create_event", "get_events_by_host", "get_all_events"]
