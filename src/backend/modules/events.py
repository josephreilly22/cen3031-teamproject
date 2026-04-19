# Imports
import uuid
from datetime import datetime, timezone, timedelta
from modules.database import database
from modules.engine import give_recommendation

# Variables
# Database collections
events_database = database("Events")
users_database = database("Users")
reports_database = database("EventReports")
# Event field constraints
EVENT_TITLE_MAX_LENGTH = 32
EVENT_HOST_MAX_LENGTH = 64
EVENT_LOCATION_MAX_LENGTH = 128
EVENT_DESCRIPTION_MAX_LENGTH = 1024
AI_CHOICE_MAX_LENGTH = 64
# Valid report reasons for event moderation
REPORT_REASONS = {"Spam", "Harassment", "Explicit", "Irrelevant", "Other"}
# Rate limiting for event creation (seconds between events per user)
EVENT_CREATION_RATE_LIMIT_SECONDS = 5
# Precision for storing geographical coordinates
COORDINATE_PRECISION = 6
# Interval for purging expired events (seconds)
EVENT_PURGE_INTERVAL_SECONDS = 60
# Track last purge time to avoid excessive database queries
_last_event_purge_at = None

# Helper Functions - DateTime Processing
# Parse event datetime and normalize to UTC
def _parse_event_datetime(date: str):
    try:
        # Accept ISO strings with 'Z' or offsets and normalize to UTC
        if isinstance(date, str) and date.endswith('Z'):
            date = date[:-1] + '+00:00'
        dt = datetime.fromisoformat(date)
        if dt.tzinfo is not None:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        # Ensure we're treating this as UTC for storage
        return dt
    except Exception:
        raise ValueError("Invalid event date and time")

# Check if two event datetimes are in the same minute
def _same_event_minute(first_date: str, second_date: str):
    first_time = _parse_event_datetime(first_date).replace(second=0, microsecond=0)
    second_time = _parse_event_datetime(second_date).replace(second=0, microsecond=0)
    return first_time == second_time

# Validate event has valid start and end times (not in past unless updating)
def _validate_event_window(start_date: str, end_date: str, allow_existing_past_start: bool = False):
    start_time = _parse_event_datetime(start_date)
    end_time = _parse_event_datetime(end_date)
    
    # Add a 10-minute grace period to account for UI input delays
    current_minute = (datetime.utcnow() - timedelta(minutes=10)).replace(second=0, microsecond=0)

    if not allow_existing_past_start and start_time < current_minute:
        raise ValueError("Event date and time cannot be in the past")
    if end_time < start_time:
        raise ValueError("End date and time cannot be before the start")

    return start_date, end_date

# Helper Functions - Event Validation
# Validate and normalize location type preferences (on-campus/off-campus)
def _normalize_location_types(location_types):
    if location_types is None:
        return []

    if not isinstance(location_types, list):
        raise ValueError("Invalid event location type")

    # Filter to only allowed location types
    allowed = []
    for item in location_types:
        if not isinstance(item, str):
            continue
        normalized = item.strip()
        if normalized in {"on-campus", "off-campus"} and normalized not in allowed:
            allowed.append(normalized)

    return allowed

# Validate and normalize event description text
def _normalize_event_description(description: str):
    if not isinstance(description, str):
        raise ValueError("Description must be a string")

    trimmed = description.strip()
    if len(trimmed) > EVENT_DESCRIPTION_MAX_LENGTH:
        raise ValueError("Event description is too long")

    return trimmed

# Validate and normalize event title
def _normalize_event_title(title: str):
    if not isinstance(title, str):
        raise ValueError("Title must be a string")

    # Remove line breaks and excess whitespace
    normalized = " ".join(title.replace("\r", " ").replace("\n", " ").split())
    if not normalized:
        raise ValueError("Title is required")
    if len(normalized) > EVENT_TITLE_MAX_LENGTH:
        raise ValueError("Event title is too long")

    return normalized

# Validate and normalize event host/organizer name
def _normalize_event_host(host: str):
    if not isinstance(host, str):
        raise ValueError("Host must be a string")

    normalized = " ".join(host.strip().split())
    if not normalized:
        raise ValueError("Host is required")
    if len(normalized) > EVENT_HOST_MAX_LENGTH:
        raise ValueError("Event host is too long")

    return normalized

# Validate and normalize event location string
def _normalize_event_location(location: str):
    if not isinstance(location, str):
        raise ValueError("Location must be a string")

    trimmed = location.rstrip()
    if not trimmed:
        raise ValueError("Location is required")
    if len(trimmed) > EVENT_LOCATION_MAX_LENGTH:
        raise ValueError("Event location is too long")

    return trimmed

# Validate and normalize geographical coordinates (latitude, longitude)
def _normalize_coordinates(coordinates):
    if coordinates is None or coordinates == "":
        return None

    if not isinstance(coordinates, list) or len(coordinates) != 2:
        raise ValueError("Invalid coordinates")

    try:
        latitude = round(float(coordinates[0]), COORDINATE_PRECISION)
        longitude = round(float(coordinates[1]), COORDINATE_PRECISION)
    except (TypeError, ValueError):
        raise ValueError("Invalid coordinates")

    # Validate latitude and longitude ranges
    if latitude < -90 or latitude > 90:
        raise ValueError("Invalid coordinates")
    if longitude < -180 or longitude > 180:
        raise ValueError("Invalid coordinates")

    return [latitude, longitude]

# Helper Functions - Event Management
# Get expiry time of event from end_date or date field
def _event_expiry_time(event: dict):
    end_date = event.get("end_date") or event.get("date")
    if not end_date:
        return None
    return _parse_event_datetime(end_date)

def _normalize_event_type_to_tags(event_type: str):
    if isinstance(event_type, list):
        return {
            str(tag).strip()
            for tag in event_type
            if isinstance(tag, str) and str(tag).strip() in {"on-campus", "off-campus"}
        }
    if event_type in {"on-campus", "off-campus"}:
        return {event_type}
    return set()

def _event_matches_tags(event: dict, allowed_tags: set[str]):
    if not allowed_tags:
        return False

    event_tags = {
        str(tag).strip()
        for tag in (event.get("location_types") or [])
        if isinstance(tag, str) and str(tag).strip()
    }
    if not event_tags:
        return False

    return bool(event_tags & allowed_tags)

def _first_sentence(description: str):
    normalized = (description or "").strip()
    if not normalized:
        return ""

    sentence = normalized.splitlines()[0].strip()
    for marker in [". ", "! ", "? "]:
        if marker in sentence:
            return sentence.split(marker, 1)[0].strip() + marker.strip()

    return sentence

def _event_recommendation_text(event: dict):
    title = " ".join(str(event.get("title", "")).split())
    first_sentence = _first_sentence(str(event.get("description", "")))
    combined = f"{title}. {first_sentence}".strip() if first_sentence else title
    prefixed = f"Event: {combined}" if combined else "Event:"
    return prefixed[:AI_CHOICE_MAX_LENGTH].rstrip()

def _extract_ranked_scores(result: dict):
    output = result.get("output")
    if isinstance(output, list) and output:
        if isinstance(output[0], dict):
            return [output]
        if isinstance(output[0], list):
            return output
    return []

def _normalize_diversity_threshold(value):
    try:
        diversity = float(value)
    except (TypeError, ValueError):
        diversity = 0.2

    diversity = max(-1.0, min(1.0, diversity))
    return 0.15 + (diversity * 0.25)

def _normalize_attendee_emails(attendee_emails):
    if not isinstance(attendee_emails, list):
        return []

    normalized = []
    for email in attendee_emails:
        if not isinstance(email, str):
            continue
        cleaned = email.strip().lower()
        if cleaned and cleaned not in normalized:
            normalized.append(cleaned)
    return normalized

def _ensure_event_defaults(event: dict):
    if not isinstance(event, dict):
        return event

    if "attendee_emails" not in event or not isinstance(event.get("attendee_emails"), list):
        event["attendee_emails"] = []
    else:
        event["attendee_emails"] = _normalize_attendee_emails(event.get("attendee_emails"))

    if event.get("created_at") and not event.get("published_at"):
        event["published_at"] = event["created_at"]
    elif event.get("published_at") and not event.get("created_at"):
        event["created_at"] = event["published_at"]

    # Explicitly mark datetime fields as UTC by appending 'Z' if not already present
    for date_field in ["date", "end_date"]:
        if isinstance(event.get(date_field), str) and event[date_field] and not event[date_field].endswith('Z'):
            event[date_field] = f"{event[date_field]}Z"

    return event

def _ensure_user_defaults(user: dict):
    if not isinstance(user, dict):
        return user

    if "attending_event_ids" not in user or not isinstance(user.get("attending_event_ids"), list):
        user["attending_event_ids"] = []
    else:
        user["attending_event_ids"] = [str(event_id) for event_id in user.get("attending_event_ids", []) if str(event_id).strip()]

    return user

def _attendee_payload(user: dict, email: str):
    return {
        "email": email,
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
        "role": user.get("role", "user"),
    }

def _purge_expired_events():
    global _last_event_purge_at

    now = datetime.utcnow()
    if _last_event_purge_at is not None and (now - _last_event_purge_at).total_seconds() < EVENT_PURGE_INTERVAL_SECONDS:
        return

    _last_event_purge_at = now
    for doc in events_database.get_collection():
        event = doc.get("value")
        if not isinstance(event, dict):
            continue

        expiry_time = _event_expiry_time(event)
        if expiry_time is not None and expiry_time < now:
            _delete_event_records(doc.get("key"))

def _parse_timestamp(value: str):
    if not isinstance(value, str) or not value.strip():
        return None

    normalized = value.strip()
    if normalized.endswith("Z"):
        normalized = f"{normalized[:-1]}+00:00"

    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        return None

def _event_creation_is_rate_limited(owner_email: str):
    latest_published_at = None

    for doc in events_database.get_collection({"owner_email": owner_email}):
        event = doc.get("value")
        if not isinstance(event, dict):
            continue

        published_at = _parse_timestamp(event.get("published_at") or event.get("created_at"))
        if published_at is None:
            continue

        comparable_published_at = published_at.replace(tzinfo=None) if published_at.tzinfo else published_at
        if latest_published_at is None or comparable_published_at > latest_published_at:
            latest_published_at = comparable_published_at

    if latest_published_at is None:
        return False

    # Check if user is creating events too quickly
    elapsed_seconds = (datetime.utcnow() - latest_published_at).total_seconds()
    return elapsed_seconds < EVENT_CREATION_RATE_LIMIT_SECONDS

# Helper functions for permission and deletion management
def _can_manage_event(owner_email: str, event: dict):
    # Check if user is the event owner or an admin
    user, _ = users_database.get_document(owner_email)
    if user is None:
        return False
    return user.get("role") == "admin" or event.get("owner_email") == owner_email

def _is_admin(email: str):
    # Check if user has admin role
    user, _ = users_database.get_document(email)
    if user is None:
        return False
    return user.get("role") == "admin"

def _delete_event_records(event_id: str):
    # Delete event from database and remove from all attendee profiles
    event, _ = events_database.get_document(event_id)
    if isinstance(event, dict):
        attendees = event.get("attendee_emails", [])
        for attendee_email in attendees:
            user, _ = users_database.get_document(attendee_email)
            if isinstance(user, dict):
                attending = user.get("attending_event_ids", [])
                user["attending_event_ids"] = [eid for eid in attending if eid != event_id]
                users_database.set_document(attendee_email, user)
    
    # Delete event from events database
    events_database.remove_document(event_id)
    
    # Remove all reports for this event
    _remove_reports_for_event(event_id)

def _remove_reports_for_event(event_id: str):
    # Delete all reports for a specific event and return count
    removed_count = 0
    for doc in reports_database.get_collection({"event_id": event_id}):
        report_id = doc.get("key")
        if report_id:
            reports_database.remove_document(report_id)
            removed_count += 1
    return removed_count

def _normalize_report_reason(reason: str):
    # Validate and normalize report reason
    reason = str(reason).strip()
    if reason not in REPORT_REASONS:
        return "Other"
    return reason

def _reporter_identity(email: str):
    # Get reporter's display name and role for reports
    user, _ = users_database.get_document(email)
    if not isinstance(user, dict):
        return {"first_name": "", "last_name": "", "role": "user"}
    return {
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
        "role": user.get("role", "user"),
    }

def _group_reports_by_event():
    # Group all reports by event_id for admin dashboard
    grouped = {}
    for doc in reports_database.get_collection():
        report = doc.get("value")
        if not isinstance(report, dict):
            continue
        event_id = report.get("event_id")
        if event_id not in grouped:
            grouped[event_id] = []
        grouped[event_id].append(report)
    return grouped

def _build_report_summary(event_id: str, reports: list):
    # Build summary for a reported event
    if not reports:
        return None
    
    event, _ = events_database.get_document(event_id)
    if not isinstance(event, dict):
        return None
    
    latest_report = max(reports, key=lambda r: r.get("created_at", ""))
    return {
        "event_id": event_id,
        "event_title": event.get("title", ""),
        "event_owner_email": event.get("owner_email", ""),
        "total_reports": len(reports),
        "latest_reported_at": latest_report.get("created_at", ""),
        "status": latest_report.get("status", "open"),
    }

# Public functions for account deletion cleanup
def delete_events_for_owner(owner_email: str):
    # Delete all events created by a user (called when account is deleted or hoster role removed)
    removed_event_count = 0
    removed_report_count = 0
    
    for doc in events_database.get_collection({"owner_email": owner_email}):
        event_id = doc.get("key")
        if event_id:
            removed_report_count += _remove_reports_for_event(event_id)
            _delete_event_records(event_id)
            removed_event_count += 1
    
    return {
        "removed_event_count": removed_event_count,
        "removed_report_count": removed_report_count,
    }

def remove_reports_by_reporter(reporter_email: str):
    # Remove all reports submitted by a user (called when account is deleted)
    removed_count = 0
    
    for doc in reports_database.get_collection({"reporter_email": reporter_email}):
        report_id = doc.get("key")
        if report_id:
            reports_database.remove_document(report_id)
            removed_count += 1
    
    return removed_count

# Public Event Management Functions
# Create new event (hoster/admin only)
def create_event(owner_email: str, title: str, host: str, date: str, end_date: str, location: str, location_types, description: str, coordinates=None):
    user, _ = users_database.get_document(owner_email)
    if user is None:
        return {"success": False, "message": "User not found"}

    # Only hosters and admins can create events
    if user.get("role") not in {"hoster", "admin"}:
        return {"success": False, "message": "Only hosters and admins can create events"}

    # Enforce rate limiting for non-admins
    if user.get("role") != "admin" and _event_creation_is_rate_limited(owner_email):
        return {"success": False, "message": "You are making events too fast. Please wait 5 seconds before creating another event."}

    # Validate and normalize all event fields
    title = _normalize_event_title(title)
    host = _normalize_event_host(host)
    date, end_date = _validate_event_window(date, end_date)
    location = _normalize_event_location(location)
    location_types = _normalize_location_types(location_types)
    description = _normalize_event_description(description)
    coordinates = _normalize_coordinates(coordinates)
    if not location_types:
        raise ValueError("Select at least one event preference")
    
    # Ensure dates have 'Z' indicator for UTC
    if isinstance(date, str) and date and not date.endswith('Z'):
        date = f"{date}Z"
    if isinstance(end_date, str) and end_date and not end_date.endswith('Z'):
        end_date = f"{end_date}Z"
    
    # Create event document
    event_id = str(uuid.uuid4())
    published_at = datetime.utcnow().isoformat() + 'Z'
    event = {
        "id": event_id,
        "owner_email": owner_email,
        "title": title,
        "host": host,
        "date": date,
        "end_date": end_date,
        "location": location,
        "coordinates": coordinates,
        "location_types": location_types,
        "description": description,
        "published_at": published_at,
        "created_at": published_at,
        "last_modified_at": published_at,
        "attendee_emails": [],
    }
    events_database.set_document(event_id, event)
    return {"success": True, "message": "Event created", "event": event}

# Get all events created by a hoster
def get_events_by_host(owner_email: str):
    _purge_expired_events()
    events = []
    for doc in events_database.get_collection({"owner_email": owner_email}):
        event = doc.get("value")
        if not isinstance(event, dict):
            continue
        event = _ensure_event_defaults(event)
        events.append(event)
    # Sort by creation date, newest first
    events.sort(key=lambda e: e.get("created_at", ""), reverse=True)
    return {"success": True, "events": events}

# Get all events across the platform
def get_all_events():
    _purge_expired_events()
    all_events = events_database.get_collection()
    events = []
    for doc in all_events:
        event = doc.get("value")
        if not isinstance(event, dict):
            continue
        event = _ensure_event_defaults(event)
        events.append(event)

    # Sort by event date
    events.sort(key=lambda e: e.get("date", ""))
    return {"success": True, "events": events}

# Get recommended events for user using AI
async def get_recommended_events(email: str):
    _purge_expired_events()
    user, _ = users_database.get_document(email)
    if user is None:
        return {"success": False, "message": "User not found"}

    interests = str(user.get("interests", "")).strip()
    score_threshold = _normalize_diversity_threshold(user.get("diversity", 0.2))
    event_type = user.get("event_type", [])
    allowed_tags = _normalize_event_type_to_tags(event_type)
    if not interests or not allowed_tags:
        return {"success": True, "events": [], "ai_ranked": False}

    # Get candidate events matching user's location preferences
    candidate_events = []
    for doc in events_database.get_collection({"location_types": {"$in": list(allowed_tags)}}):
        event = doc.get("value")
        if not isinstance(event, dict):
            continue
        event = _ensure_event_defaults(event)
        if _event_matches_tags(event, allowed_tags):
            candidate_events.append(event)

    if not candidate_events:
        return {"success": True, "events": [], "ai_ranked": False}

    # Build event texts and lookup for AI scoring
    event_texts = [_event_recommendation_text(event) for event in candidate_events]
    event_lookup = {_event_recommendation_text(event): event for event in candidate_events}

    # Call AI engine to rank events based on user interests
    try:
        result = await give_recommendation(interests, event_texts)
        event_scores = _extract_ranked_scores(result)
    except Exception:
        return {"success": True, "events": [], "ai_ranked": False}

    # Extract and rank scored events
    ranked_events = []
    for label, score in sorted(event_scores.items(), key=lambda pair: pair[1], reverse=True):
        if score < score_threshold:
            continue
        
        event = event_lookup.get(label)
        if not event:
            continue

        ranked_event = dict(event)
        ranked_event["ai_ranked"] = True
        ranked_event["ai_score"] = score
        ranked_events.append(ranked_event)

    return {"success": True, "events": ranked_events[:5], "ai_ranked": True}

def get_event(event_id: str):
    _purge_expired_events()
    event, _ = events_database.get_document(event_id)
    if event is None:
        return {"success": False, "message": "Event not found"}
    event = _ensure_event_defaults(event)
    events_database.set_document(event_id, event)
    return {"success": True, "event": event}

def get_event_attendees(event_id: str):
    _purge_expired_events()
    event, _ = events_database.get_document(event_id)
    if event is None:
        return {"success": False, "message": "Event not found"}

    event = _ensure_event_defaults(event)
    events_database.set_document(event_id, event)

    attendees = []
    for email in event.get("attendee_emails", []):
        user, _ = users_database.get_document(email)
        if not isinstance(user, dict):
            continue
        user = _ensure_user_defaults(user)
        users_database.set_document(email, user)
        attendees.append(_attendee_payload(user, email))

    attendees.sort(key=lambda person: (person.get("first_name", ""), person.get("last_name", ""), person.get("email", "")))
    return {"success": True, "event_id": event_id, "attendees": attendees, "attendee_count": len(attendees)}

def attend_event(event_id: str, email: str):
    event, _ = events_database.get_document(event_id)
    if event is None:
        return {"success": False, "message": "Event not found"}

    user, _ = users_database.get_document(email)
    if user is None:
        return {"success": False, "message": "User not found"}

    event = _ensure_event_defaults(event)
    user = _ensure_user_defaults(user)

    event_attendees = event.get("attendee_emails", [])
    if email not in event_attendees:
        event_attendees.append(email)
    event["attendee_emails"] = _normalize_attendee_emails(event_attendees)

    attending_ids = user.get("attending_event_ids", [])
    if event_id not in attending_ids:
        attending_ids.append(event_id)
    user["attending_event_ids"] = [str(value) for value in attending_ids if str(value).strip()]

    events_database.set_document(event_id, event)
    users_database.set_document(email, user)

    return {"success": True, "message": "Attending event", "attending": True, "attendee_count": len(event["attendee_emails"]) }

def unattend_event(event_id: str, email: str):
    event, _ = events_database.get_document(event_id)
    if event is None:
        return {"success": False, "message": "Event not found"}

    user, _ = users_database.get_document(email)
    if user is None:
        return {"success": False, "message": "User not found"}

    event = _ensure_event_defaults(event)
    user = _ensure_user_defaults(user)

    event["attendee_emails"] = [attendee for attendee in event.get("attendee_emails", []) if attendee != email]
    user["attending_event_ids"] = [event_ref for event_ref in user.get("attending_event_ids", []) if event_ref != event_id]

    events_database.set_document(event_id, event)
    users_database.set_document(email, user)

    return {"success": True, "message": "Unattending event", "attending": False, "attendee_count": len(event["attendee_emails"]) }

def update_event(event_id: str, owner_email: str, title: str, host: str, date: str, end_date: str, location: str, location_types, description: str, coordinates=None):
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
    coordinates = _normalize_coordinates(coordinates)
    if not location_types:
        raise ValueError("Select at least one event preference")

    # Ensure dates have 'Z' indicator for UTC
    if isinstance(date, str) and date and not date.endswith('Z'):
        date = f"{date}Z"
    if isinstance(end_date, str) and end_date and not end_date.endswith('Z'):
        end_date = f"{end_date}Z"

    event.update({
        "title": title,
        "host": host,
        "date": date,
        "end_date": end_date,
        "location": location,
        "coordinates": coordinates,
        "location_types": location_types,
        "description": description,
        "last_modified_at": datetime.utcnow().isoformat() + 'Z',
    })
    events_database.set_document(event_id, event)
    return {"success": True, "message": "Event updated", "event": event}

def delete_event(event_id: str, owner_email: str):
    event, _ = events_database.get_document(event_id)
    if event is None:
        return {"success": False, "message": "Event not found"}

    if not _can_manage_event(owner_email, event):
        return {"success": False, "message": "You can only delete your own events"}

    _delete_event_records(event_id)
    return {"success": True, "message": "Event deleted"}

def report_event(event_id: str, reporter_email: str, reason: str):
    event, _ = events_database.get_document(event_id)
    if event is None:
        return {"success": False, "message": "Event not found"}

    reporter, _ = users_database.get_document(reporter_email)
    if reporter is None:
        return {"success": False, "message": "User not found"}

    if event.get("owner_email") == reporter_email:
        return {"success": False, "message": "You cannot report your own event"}

    reason = _normalize_report_reason(reason)
    report_id = f"{event_id}:{reporter_email}"
    existing_report, _ = reports_database.get_document(report_id)
    if existing_report is not None:
        return {"success": True, "message": "Report already submitted", "already_reported": True, "report": existing_report}

    report = {
        "id": report_id,
        "event_id": event_id,
        "event_title": event.get("title", ""),
        "event_owner_email": event.get("owner_email", ""),
        "reporter_email": reporter_email,
        "reporter_first_name": reporter.get("first_name", ""),
        "reporter_last_name": reporter.get("last_name", ""),
        "reporter_role": reporter.get("role", "user"),
        "reason": reason,
        "status": "open",
        "created_at": datetime.utcnow().isoformat(),
    }
    reports_database.set_document(report_id, report)
    return {"success": True, "message": "Report submitted", "already_reported": False, "report": report}

def get_event_report(event_id: str, reporter_email: str):
    report_id = f"{event_id}:{reporter_email}"
    report, _ = reports_database.get_document(report_id)
    if report is None:
        return {"success": True, "exists": False}

    return {"success": True, "exists": True, "report": report}

def get_admin_report_summaries(admin_email: str):
    if not _is_admin(admin_email):
        return {"success": False, "message": "Admin access required"}

    summaries = []
    for event_id, reports in _group_reports_by_event().items():
        summary = _build_report_summary(event_id, reports)
        if summary:
            summaries.append(summary)

    summaries.sort(key=lambda item: (item.get("total_reports", 0), item.get("latest_reported_at", "")), reverse=True)
    return {"success": True, "reports": summaries}

def get_admin_report_detail(admin_email: str, event_id: str):
    if not _is_admin(admin_email):
        return {"success": False, "message": "Admin access required"}

    reports = _group_reports_by_event().get(event_id, [])
    summary = _build_report_summary(event_id, reports)
    if summary is None:
        return {"success": False, "message": "This report no longer exists"}

    reporters = []
    for report in sorted(reports, key=_report_sort_key, reverse=True):
        identity = _reporter_identity(report)
        reporters.append({
            "first_name": identity.get("first_name", ""),
            "last_name": identity.get("last_name", ""),
            "email": identity.get("email", "N/A"),
            "deleted": identity.get("deleted", False),
            "role": report.get("reporter_role", "user"),
            "reason": report.get("reason", ""),
            "created_at": report.get("created_at", ""),
        })

    return {"success": True, "report": {**summary, "reporters": reporters}}

def resolve_admin_report(admin_email: str, event_id: str):
    if not _is_admin(admin_email):
        return {"success": False, "message": "Admin access required"}

    reports = _group_reports_by_event().get(event_id, [])
    if not reports:
        return {"success": False, "message": "This report no longer exists"}

    removed_reports = _remove_reports_for_event(event_id)
    return {"success": True, "message": "Report resolved", "resolved_count": removed_reports}

def remove_reported_event(admin_email: str, event_id: str, remove_hoster: bool = False):
    if not _is_admin(admin_email):
        return {"success": False, "message": "Admin access required"}

    reports = _group_reports_by_event().get(event_id, [])
    if not reports:
        return {"success": False, "message": "This report no longer exists"}

    event, _ = events_database.get_document(event_id)

    owner_email = ""
    if isinstance(event, dict):
        owner_email = event.get("owner_email", "")
        if remove_hoster:
            owner, _ = users_database.get_document(owner_email)
            if isinstance(owner, dict) and owner.get("role") == "admin":
                return {"success": False, "message": "You cannot remove the hoster role from an admin account"}

        if remove_hoster and owner_email:
            cleanup = delete_events_for_owner(owner_email)
            owner, _ = users_database.get_document(owner_email)
            if isinstance(owner, dict) and owner.get("role") == "hoster":
                owner["role"] = "user"
                owner["organization"] = ""
                users_database.set_document(owner_email, owner)
            return {
                "success": True,
                "message": "Hoster removed with hosted events and reports deleted",
                "removed_reports": cleanup.get("removed_report_count", 0),
                "removed_events": cleanup.get("removed_event_count", 0),
                "hoster_removed": True,
            }

        deletion_result = delete_event(event_id, admin_email)
        if not deletion_result.get("success"):
            return deletion_result

    removed_reports = _remove_reports_for_event(event_id)
    return {
        "success": True,
        "message": "Event and reports removed",
        "removed_reports": removed_reports,
        "hoster_removed": bool(remove_hoster),
    }

# Initialize
__all__ = [
    "create_event",
    "delete_events_for_owner",
    "get_events_by_host",
    "get_all_events",
    "get_recommended_events",
    "get_event",
    "get_event_attendees",
    "attend_event",
    "unattend_event",
    "update_event",
    "delete_event",
    "report_event",
    "get_event_report",
    "get_admin_report_summaries",
    "get_admin_report_detail",
    "resolve_admin_report",
    "remove_reports_by_reporter",
    "remove_reported_event",
]
