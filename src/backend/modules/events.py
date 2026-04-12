# Imports
import uuid
from datetime import datetime
from modules.database import database

# Variables
events_database = database("Events")

# Functions
def _parse_event_datetime(date: str):
    try:
        return datetime.fromisoformat(date)
    except ValueError:
        raise ValueError("Invalid event date and time")

def _validate_event_window(start_date: str, end_date: str):
    start_time = _parse_event_datetime(start_date)
    end_time = _parse_event_datetime(end_date)

    if start_time < datetime.now(start_time.tzinfo):
        raise ValueError("Event date and time cannot be in the past")
    if end_time < start_time:
        raise ValueError("End date and time cannot be before the start")

    return start_date, end_date

def _event_expiry_time(event: dict):
    end_date = event.get("end_date") or event.get("date")
    if not end_date:
        return None
    return _parse_event_datetime(end_date)

def _purge_expired_events():
    now = datetime.now()
    for doc in events_database.get_collection():
        event = doc.get("value")
        if not isinstance(event, dict):
            continue

        expiry_time = _event_expiry_time(event)
        if expiry_time is not None and expiry_time < now:
            events_database.remove_document(doc.get("key"))

def create_event(owner_email: str, title: str, host: str, date: str, end_date: str, location: str, description: str):
    date, end_date = _validate_event_window(date, end_date)
    event_id = str(uuid.uuid4())
    event = {
        "id": event_id,
        "owner_email": owner_email,
        "title": title,
        "host": host,
        "date": date,
        "end_date": end_date,
        "location": location,
        "description": description,
        "created_at": datetime.utcnow().isoformat(),
    }
    events_database.set_document(event_id, event)
    return {"success": True, "message": "Event created", "event": event}

def get_events_by_host(owner_email: str):
    _purge_expired_events()
    all_events = events_database.get_collection()
    events = [
        doc["value"] for doc in all_events
        if isinstance(doc.get("value"), dict) and doc["value"].get("owner_email") == owner_email
    ]
    events.sort(key=lambda e: e.get("created_at", ""), reverse=True)
    return {"success": True, "events": events}

def get_all_events():
    _purge_expired_events()
    all_events = events_database.get_collection()
    events = [doc["value"] for doc in all_events if isinstance(doc.get("value"), dict)]
    events.sort(key=lambda e: e.get("date", ""))
    return {"success": True, "events": events}

def get_event(event_id: str):
    event, _ = events_database.get_document(event_id)
    if event is None:
        return {"success": False, "message": "Event not found"}
    return {"success": True, "event": event}

def update_event(event_id: str, owner_email: str, title: str, host: str, date: str, end_date: str, location: str, description: str):
    event, _ = events_database.get_document(event_id)
    if event is None:
        return {"success": False, "message": "Event not found"}

    if event.get("owner_email") != owner_email:
        return {"success": False, "message": "You can only edit your own events"}

    date, end_date = _validate_event_window(date, end_date)

    event.update({
        "title": title,
        "host": host,
        "date": date,
        "end_date": end_date,
        "location": location,
        "description": description,
    })
    events_database.set_document(event_id, event)
    return {"success": True, "message": "Event updated", "event": event}

def delete_event(event_id: str, owner_email: str):
    event, _ = events_database.get_document(event_id)
    if event is None:
        return {"success": False, "message": "Event not found"}

    if event.get("owner_email") != owner_email:
        return {"success": False, "message": "You can only delete your own events"}

    events_database.remove_document(event_id)
    return {"success": True, "message": "Event deleted"}

# Initialize
__all__ = ["create_event", "get_events_by_host", "get_all_events", "get_event", "update_event", "delete_event"]
