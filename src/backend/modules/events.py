# Imports
import uuid
from datetime import datetime
from modules.database import database

# Variables
events_database = database("Events")
users_database = database("Users")
EVENT_TITLE_MAX_LENGTH = 32
EVENT_HOST_MAX_LENGTH = 64
EVENT_LOCATION_MAX_LENGTH = 128
EVENT_DESCRIPTION_MAX_LENGTH = 1024

# Functions
def _parse_event_datetime(date: str):
    try:
        return datetime.fromisoformat(date)
    except ValueError:
        raise ValueError("Invalid event date and time")

def _same_event_minute(first_date: str, second_date: str):
    first_time = _parse_event_datetime(first_date).replace(second=0, microsecond=0)
    second_time = _parse_event_datetime(second_date).replace(second=0, microsecond=0)
    return first_time == second_time

def _validate_event_window(start_date: str, end_date: str, allow_existing_past_start: bool = False):
    start_time = _parse_event_datetime(start_date)
    end_time = _parse_event_datetime(end_date)
    current_minute = datetime.now(start_time.tzinfo).replace(second=0, microsecond=0)

    if not allow_existing_past_start and start_time < current_minute:
        raise ValueError("Event date and time cannot be in the past")
    if end_time < start_time:
        raise ValueError("End date and time cannot be before the start")

    return start_date, end_date

def _normalize_location_types(location_types):
    if location_types is None:
        return []

    if not isinstance(location_types, list):
        raise ValueError("Invalid event location type")

    allowed = []
    for item in location_types:
        if not isinstance(item, str):
            continue
        normalized = item.strip()
        if normalized in {"on-campus", "off-campus"} and normalized not in allowed:
            allowed.append(normalized)

    return allowed

def _normalize_event_description(description: str):
    if not isinstance(description, str):
        raise ValueError("Description must be a string")

    trimmed = description.strip()
    if len(trimmed) > EVENT_DESCRIPTION_MAX_LENGTH:
        raise ValueError("Event description is too long")

    return trimmed

def _normalize_event_title(title: str):
    if not isinstance(title, str):
        raise ValueError("Title must be a string")

    normalized = " ".join(title.replace("\r", " ").replace("\n", " ").split())
    if not normalized:
        raise ValueError("Title is required")
    if len(normalized) > EVENT_TITLE_MAX_LENGTH:
        raise ValueError("Event title is too long")

    return normalized

def _normalize_event_host(host: str):
    if not isinstance(host, str):
        raise ValueError("Host must be a string")

    normalized = " ".join(host.strip().split())
    if not normalized:
        raise ValueError("Host is required")
    if len(normalized) > EVENT_HOST_MAX_LENGTH:
        raise ValueError("Event host is too long")

    return normalized

def _normalize_event_location(location: str):
    if not isinstance(location, str):
        raise ValueError("Location must be a string")

    trimmed = location.rstrip()
    if not trimmed:
        raise ValueError("Location is required")
    if len(trimmed) > EVENT_LOCATION_MAX_LENGTH:
        raise ValueError("Event location is too long")

    return trimmed

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

def _can_manage_event(actor_email: str, event: dict):
    if event.get("owner_email") == actor_email:
        return True

    user, _ = users_database.get_document(actor_email)
    return isinstance(user, dict) and user.get("role") == "admin"

def create_event(owner_email: str, title: str, host: str, date: str, end_date: str, location: str, location_types, description: str):
    title = _normalize_event_title(title)
    host = _normalize_event_host(host)
    date, end_date = _validate_event_window(date, end_date)
    location = _normalize_event_location(location)
    location_types = _normalize_location_types(location_types)
    description = _normalize_event_description(description)
    if not location_types:
        raise ValueError("Select at least one event location type")
    event_id = str(uuid.uuid4())
    event = {
        "id": event_id,
        "owner_email": owner_email,
        "title": title,
        "host": host,
        "date": date,
        "end_date": end_date,
        "location": location,
        "location_types": location_types,
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

def update_event(event_id: str, owner_email: str, title: str, host: str, date: str, end_date: str, location: str, location_types, description: str):
    event, _ = events_database.get_document(event_id)
    if event is None:
        return {"success": False, "message": "Event not found"}

    if not _can_manage_event(owner_email, event):
        return {"success": False, "message": "You can only edit your own events"}

    title = _normalize_event_title(title)
    host = _normalize_event_host(host)
    allow_existing_past_start = _same_event_minute(date, event.get("date"))
    date, end_date = _validate_event_window(date, end_date, allow_existing_past_start=allow_existing_past_start)
    location = _normalize_event_location(location)
    location_types = _normalize_location_types(location_types)
    description = _normalize_event_description(description)
    if not location_types:
        raise ValueError("Select at least one event location type")

    event.update({
        "title": title,
        "host": host,
        "date": date,
        "end_date": end_date,
        "location": location,
        "location_types": location_types,
        "description": description,
    })
    events_database.set_document(event_id, event)
    return {"success": True, "message": "Event updated", "event": event}

def delete_event(event_id: str, owner_email: str):
    event, _ = events_database.get_document(event_id)
    if event is None:
        return {"success": False, "message": "Event not found"}

    if not _can_manage_event(owner_email, event):
        return {"success": False, "message": "You can only delete your own events"}

    events_database.remove_document(event_id)
    return {"success": True, "message": "Event deleted"}

# Initialize
__all__ = ["create_event", "get_events_by_host", "get_all_events", "get_event", "update_event", "delete_event"]
