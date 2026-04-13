# Imports
import uuid
from datetime import datetime
from modules.database import database
from modules.engine import give_recommendation

# Variables
events_database = database("Events")
users_database = database("Users")
reports_database = database("EventReports")
EVENT_TITLE_MAX_LENGTH = 32
EVENT_HOST_MAX_LENGTH = 64
EVENT_LOCATION_MAX_LENGTH = 128
EVENT_DESCRIPTION_MAX_LENGTH = 1024
AI_CHOICE_MAX_LENGTH = 64
REPORT_REASONS = {"Spam", "Harassment", "Explicit", "Irrelevant", "Other"}
EVENT_CREATION_RATE_LIMIT_SECONDS = 5
COORDINATE_PRECISION = 6

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

    if latitude < -90 or latitude > 90:
        raise ValueError("Invalid coordinates")
    if longitude < -180 or longitude > 180:
        raise ValueError("Invalid coordinates")

    return [latitude, longitude]

def _event_expiry_time(event: dict):
    end_date = event.get("end_date") or event.get("date")
    if not end_date:
        return None
    return _parse_event_datetime(end_date)

def _normalize_interest_queries(interests: str):
    if not isinstance(interests, str):
        return []

    normalized = interests.replace("\r", "\n")
    parts = []
    for raw_part in normalized.replace(";", ",").splitlines():
        for chunk in raw_part.split(","):
            cleaned = " ".join(chunk.strip().split())
            if cleaned and cleaned not in parts:
                parts.append(cleaned)

    if not parts:
        fallback = " ".join(normalized.split())
        return [fallback] if fallback else []

    return parts[:8]

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
    return combined[:AI_CHOICE_MAX_LENGTH].rstrip()

def _extract_ranked_scores(result: dict):
    output = result.get("output")
    if isinstance(output, list):
        return output
    return []

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
    now = datetime.now()
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

    for doc in events_database.get_collection():
        event = doc.get("value")
        if not isinstance(event, dict) or event.get("owner_email") != owner_email:
            continue

        published_at = _parse_timestamp(event.get("published_at") or event.get("created_at"))
        if published_at is None:
            continue

        comparable_published_at = published_at.replace(tzinfo=None) if published_at.tzinfo else published_at
        if latest_published_at is None or comparable_published_at > latest_published_at:
            latest_published_at = comparable_published_at

    if latest_published_at is None:
        return False

    elapsed_seconds = (datetime.utcnow() - latest_published_at).total_seconds()
    return elapsed_seconds < EVENT_CREATION_RATE_LIMIT_SECONDS

def _delete_event_records(event_id: str):
    event, _ = events_database.get_document(event_id)
    if event is None:
        return None

    events_database.remove_document(event_id)
    _remove_reports_for_event(event_id)
    return event

def delete_events_for_owner(owner_email: str):
    removed_event_ids = []
    removed_report_count = 0

    for doc in events_database.get_collection():
        event = doc.get("value")
        if not isinstance(event, dict) or event.get("owner_email") != owner_email:
            continue

        event_id = doc.get("key")
        if not isinstance(event_id, str) or not event_id.strip():
            continue

        removed_report_count += _remove_reports_for_event(event_id)
        events_database.remove_document(event_id)
        removed_event_ids.append(event_id)

    return {
        "removed_event_ids": removed_event_ids,
        "removed_event_count": len(removed_event_ids),
        "removed_report_count": removed_report_count,
    }

def _can_manage_event(actor_email: str, event: dict):
    if event.get("owner_email") == actor_email:
        return True

    user, _ = users_database.get_document(actor_email)
    return isinstance(user, dict) and user.get("role") == "admin"

def _normalize_report_reason(reason: str):
    if not isinstance(reason, str):
        raise ValueError("Reason must be a string")

    normalized = " ".join(reason.strip().split())
    if normalized not in REPORT_REASONS:
        raise ValueError("Invalid report reason")

    return normalized

def _is_admin(email: str):
    user, _ = users_database.get_document(email)
    return isinstance(user, dict) and user.get("role") == "admin"

def _report_sort_key(report: dict):
    return report.get("created_at", "")

def _group_reports_by_event(include_resolved: bool = False):
    grouped_reports = {}

    for doc in reports_database.get_collection():
        report = doc.get("value")
        if not isinstance(report, dict):
            continue

        if not include_resolved and report.get("status") == "resolved":
            continue

        event_id = str(report.get("event_id", "")).strip()
        if not event_id:
            continue

        grouped_reports.setdefault(event_id, []).append(report)

    return grouped_reports

def _build_report_summary(event_id: str, reports: list[dict]):
    if not reports:
        return None

    event, _ = events_database.get_document(event_id)
    latest_report = max(reports, key=_report_sort_key)
    reason_counts = {reason: 0 for reason in sorted(REPORT_REASONS)}
    for report in reports:
        reason = report.get("reason", "")
        if reason in reason_counts:
            reason_counts[reason] += 1

    total_reports = sum(reason_counts.values())
    if total_reports <= 0:
        return None

    return {
        "event_id": event_id,
        "event_title": (event or {}).get("title") or latest_report.get("event_title", "Untitled Event"),
        "event_owner_email": (event or {}).get("owner_email") or latest_report.get("event_owner_email", ""),
        "event_exists": isinstance(event, dict),
        "total_reports": total_reports,
        "latest_reported_at": latest_report.get("created_at", ""),
        "reason_counts": reason_counts,
    }

def _reporter_identity(report: dict):
    if report.get("reporter_deleted"):
        return {
            "first_name": "Deleted",
            "last_name": "User",
            "email": "N/A",
            "deleted": True,
        }

    reporter_email = str(report.get("reporter_email", "")).strip()
    reporter, _ = users_database.get_document(reporter_email) if reporter_email else (None, None)

    if isinstance(reporter, dict):
        first_name = reporter.get("first_name", "")
        last_name = reporter.get("last_name", "")
        email = reporter_email or "N/A"
        deleted = False
    else:
        first_name = "Deleted"
        last_name = "User"
        email = "N/A"
        deleted = True

    return {
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "deleted": deleted,
    }

def _remove_reports_for_event(event_id: str):
    removed = 0
    for doc in reports_database.get_collection():
        report = doc.get("value")
        if not isinstance(report, dict):
            continue
        if report.get("event_id") != event_id:
            continue
        reports_database.remove_document(doc.get("key"))
        removed += 1
    return removed

def remove_reports_by_reporter(reporter_email: str):
    removed = 0
    for doc in reports_database.get_collection():
        report = doc.get("value")
        if not isinstance(report, dict):
            continue
        report_key = str(doc.get("key", "")).strip()
        if report.get("reporter_email") != reporter_email and not report_key.endswith(f":{reporter_email}"):
            continue

        reports_database.remove_document(report_key)
        removed += 1

    return removed

def create_event(owner_email: str, title: str, host: str, date: str, end_date: str, location: str, location_types, description: str, coordinates=None):
    user, _ = users_database.get_document(owner_email)
    if user is None:
        return {"success": False, "message": "User not found"}

    if user.get("role") not in {"hoster", "admin"}:
        return {"success": False, "message": "Only hosters and admins can create events"}

    if _event_creation_is_rate_limited(owner_email):
        return {"success": False, "message": "You are making events too fast. Please wait 5 seconds before creating another event."}

    title = _normalize_event_title(title)
    host = _normalize_event_host(host)
    date, end_date = _validate_event_window(date, end_date)
    location = _normalize_event_location(location)
    location_types = _normalize_location_types(location_types)
    description = _normalize_event_description(description)
    coordinates = _normalize_coordinates(coordinates)
    if not location_types:
        raise ValueError("Select at least one event location type")
    event_id = str(uuid.uuid4())
    published_at = datetime.utcnow().isoformat()
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
        "attendee_emails": [],
    }
    events_database.set_document(event_id, event)
    return {"success": True, "message": "Event created", "event": event}

def get_events_by_host(owner_email: str):
    _purge_expired_events()
    all_events = events_database.get_collection()
    events = []
    for doc in all_events:
        event = doc.get("value")
        if not isinstance(event, dict):
            continue
        event = _ensure_event_defaults(event)
        if event.get("owner_email") == owner_email:
            events.append(event)
    events.sort(key=lambda e: e.get("created_at", ""), reverse=True)
    return {"success": True, "events": events}

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

    events.sort(key=lambda e: e.get("date", ""))
    return {"success": True, "events": events}

async def get_recommended_events(email: str):
    user, _ = users_database.get_document(email)
    if user is None:
        return {"success": False, "message": "User not found"}

    interests = str(user.get("interests", "")).strip()
    event_type = user.get("event_type", [])
    allowed_tags = _normalize_event_type_to_tags(event_type)
    if not interests or not allowed_tags:
        return {"success": True, "events": [], "ai_ranked": False}

    all_events_response = get_all_events()
    events = all_events_response.get("events", [])
    candidate_events = [event for event in events if _event_matches_tags(event, allowed_tags)]
    if not candidate_events:
        return {"success": True, "events": [], "ai_ranked": False}

    interest_queries = _normalize_interest_queries(interests)
    if not interest_queries:
        return {"success": True, "events": [], "ai_ranked": False}

    event_texts = []
    event_lookup = {}
    for event in candidate_events:
        summary = _event_recommendation_text(event)
        if not summary:
            continue
        if summary in event_lookup:
            summary = f"{summary} [{event.get('id', '')}]"
        event_texts.append(summary)
        event_lookup[summary] = event

    if not event_texts:
        return {"success": True, "events": [], "ai_ranked": False}

    prompts = [f"I want to attend events related to {query}." for query in interest_queries]

    try:
        result = await give_recommendation(prompts, event_texts)
    except Exception:
        return {"success": True, "events": [], "ai_ranked": False}

    ranked_batches = _extract_ranked_scores(result)
    event_scores = {}
    for batch in ranked_batches:
        if not isinstance(batch, list):
            continue

        for item in batch:
            if not isinstance(item, dict):
                continue

            label = item.get("label")
            score = item.get("score")
            if not isinstance(label, str) or not isinstance(score, (int, float)):
                continue
            if score <= 0.25:
                continue

            previous = event_scores.get(label, float("-inf"))
            if score > previous:
                event_scores[label] = float(score)

    ranked_events = []
    for label, score in sorted(event_scores.items(), key=lambda pair: pair[1], reverse=True):
        event = event_lookup.get(label)
        if not event:
            continue

        ranked_event = dict(event)
        ranked_event["ai_ranked"] = True
        ranked_event["ai_score"] = score
        ranked_events.append(ranked_event)

    return {"success": True, "events": ranked_events[:5], "ai_ranked": True}

def get_event(event_id: str):
    event, _ = events_database.get_document(event_id)
    if event is None:
        return {"success": False, "message": "Event not found"}
    event = _ensure_event_defaults(event)
    events_database.set_document(event_id, event)
    return {"success": True, "event": event}

def get_event_attendees(event_id: str):
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
        raise ValueError("Select at least one event location type")

    event.update({
        "title": title,
        "host": host,
        "date": date,
        "end_date": end_date,
        "location": location,
        "coordinates": coordinates,
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
