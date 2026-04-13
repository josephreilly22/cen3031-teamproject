import re

from modules.database import database
from modules.events import delete_events_for_owner, remove_reports_by_reporter

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
NAME_MAX_LENGTH = 64
PASSWORD_MAX_LENGTH = 256
INTERESTS_MAX_LENGTH = 256

users_database = database("Users")
host_requests_database = database("HostRequests")

def _validate_email(email: str):
    if not isinstance(email, str): raise ValueError("Email must be a string")

    normalized = email.strip().lower()
    if not EMAIL_PATTERN.match(normalized): raise ValueError("Invalid email")

    return normalized

def _validate_name(name: str, field_name: str):
    label = field_name.replace("_", " ").capitalize()
    if not isinstance(name, str) or not name.strip(): raise ValueError(f"{label} is required")
    normalized = " ".join(name.strip().split())
    if len(normalized) > NAME_MAX_LENGTH:
        raise ValueError(f"{label} is too long")
    return normalized

def _validate_password(password: str):
    if not isinstance(password, str) or len(password) < 8: raise ValueError("Password must be at least 8 characters")
    if len(password) > PASSWORD_MAX_LENGTH: raise ValueError("Password is too long")
    return password

def _normalize_interests(interests: str):
    if not isinstance(interests, str):
        raise ValueError("Interests must be a string")

    trimmed = interests.rstrip()
    if len(trimmed) > INTERESTS_MAX_LENGTH:
        raise ValueError("Interests are too long")

    return trimmed

def _normalize_event_types(event_types):
    if event_types is None:
        return []

    if isinstance(event_types, str):
        event_types = [event_types]

    if not isinstance(event_types, list):
        raise ValueError("Invalid preference")

    allowed = []
    for item in event_types:
        if not isinstance(item, str):
            continue
        normalized = item.strip()
        if normalized in {"on-campus", "off-campus"} and normalized not in allowed:
            allowed.append(normalized)

    return allowed

def _user_template(first_name: str, last_name: str, email: str, password: str, role: str = "user"):
    return {
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "password": password,
        "role": role,
        "interests": "",
        "event_type": [],
        "onboarding_complete": False,
        "attending_event_ids": [],
    }

def _user_response(user: dict, email: str):
    return {
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
        "email": email,
        "role": user.get("role", "user"),
        "onboarding_complete": bool(user.get("onboarding_complete", False)),
        "attending_event_ids": list(user.get("attending_event_ids", []) or []),
        "event_type": list(user.get("event_type", []) or []),
    }

def sign_up(first_name: str, last_name: str, email: str, password: str, confirm_password: str):
    first_name = _validate_name(first_name, "first_name")
    last_name = _validate_name(last_name, "last_name")
    email = _validate_email(email)
    password = _validate_password(password)

    if password != confirm_password: return {"success": False, "message": "Passwords do not match"}

    user, _ = users_database.get_document(email)
    if user is not None: return {"success": False, "message": "Email already registered"}

    created_user = _user_template(first_name, last_name, email, password)
    users_database.set_document(email, created_user)
    return {
        "success": True,
        "message": "Account created successfully",
        "user": _user_response(created_user, email),
        "redirect": "/onboarding",
    }

def sign_in(email: str, password: str):
    email = _validate_email(email)
    password = _validate_password(password)

    user, _ = users_database.get_document(email)
    if user is None or user.get("password") != password: return {"success": False, "message": "Invalid email or password"}

    redirect = "/dashboard" if user.get("onboarding_complete", False) else "/onboarding"
    return {
        "success": True,
        "message": "Login successful",
        "user": _user_response(user, email),
        "redirect": redirect,
    }

def get_profile(email: str):
    email = _validate_email(email)

    user, _ = users_database.get_document(email)
    if user is None: return {"success": False, "message": "User not found"}

    if "attending_event_ids" not in user or not isinstance(user.get("attending_event_ids"), list):
        user["attending_event_ids"] = []
        users_database.set_document(email, user)

    return {
        "success": True,
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
        "role": user.get("role", "user"),
        "organization": user.get("organization", ""),
        "interests": user.get("interests", ""),
        "event_type": list(user.get("event_type", []) or []),
        "onboarding_complete": bool(user.get("onboarding_complete", False)),
        "attending_event_ids": list(user.get("attending_event_ids", []) or []),
    }

def submit_host_request(email: str, first_name: str, last_name: str, organization: str, message: str):
    email = _validate_email(email)
    first_name = _validate_name(first_name, "first_name")
    last_name = _validate_name(last_name, "last_name")

    user, _ = users_database.get_document(email)
    if user is None: return {"success": False, "message": "User not found"}
    if user.get("role") in {"admin", "hoster"}:
        return {"success": False, "message": f'You cannot register as {user.get("role")}'}

    host_requests_database.set_document(email, {
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "organization": organization.strip(),
        "message": message.strip(),
    })

    return {"success": True, "message": "Host request submitted"}

def get_host_requests(): return {"success": True, "requests": host_requests_database.get_collection()}

def approve_host_request(email: str):
    email = _validate_email(email)

    user, _ = users_database.get_document(email)
    if user is None: return {"success": False, "message": "User not found"}

    request, _ = host_requests_database.get_document(email)
    user["role"] = "hoster"
    user["organization"] = request.get("organization", "") if isinstance(request, dict) else ""
    users_database.set_document(email, user)
    host_requests_database.remove_document(email)
    return {"success": True, "message": "Host request approved", "role": "hoster"}

def deny_host_request(email: str):
    email = _validate_email(email)
    host_requests_database.remove_document(email)
    return {"success": True, "message": "Host request denied"}

def delete_account(email: str):
    email = _validate_email(email)

    user, _ = users_database.get_document(email)
    if user is None: return {"success": False, "message": "User not found"}

    cleanup = delete_events_for_owner(email)
    removed_reports = remove_reports_by_reporter(email)
    users_database.remove_document(email)
    return {
        "success": True,
        "message": "Account deleted",
        "removed_hosted_events": cleanup.get("removed_event_count", 0),
        "removed_event_reports": cleanup.get("removed_report_count", 0),
        "removed_report_submissions": removed_reports,
    }

def get_admin_users():
    admins = []
    hosters = []

    for doc in users_database.get_collection():
        user = doc.get("value")
        if not isinstance(user, dict):
            continue

        role = user.get("role", "user")
        if role not in {"admin", "hoster"}:
            continue

        payload = {
            "email": user.get("email", doc.get("key", "")),
            "first_name": user.get("first_name", ""),
            "last_name": user.get("last_name", ""),
            "role": role,
            "organization": user.get("organization", ""),
        }

        if role == "admin":
            admins.append(payload)
        else:
            hosters.append(payload)

    admins.sort(key=lambda user: (user["first_name"], user["last_name"], user["email"]))
    hosters.sort(key=lambda user: (user["organization"], user["first_name"], user["last_name"], user["email"]))
    return {"success": True, "admins": admins, "hosters": hosters}

def remove_hoster(email: str):
    email = _validate_email(email)

    user, _ = users_database.get_document(email)
    if user is None: return {"success": False, "message": "User not found"}
    if user.get("role") != "hoster": return {"success": False, "message": "User is not a hoster"}

    cleanup = delete_events_for_owner(email)
    user["role"] = "user"
    user["organization"] = ""
    users_database.set_document(email, user)
    return {
        "success": True,
        "message": "Hoster removed",
        "role": "user",
        "removed_hosted_events": cleanup.get("removed_event_count", 0),
        "removed_event_reports": cleanup.get("removed_report_count", 0),
    }

def update_profile(
    email: str,
    first_name: str,
    last_name: str,
    interests: str,
    event_type,
    password: str = "",
    confirm_password: str = "",
    onboarding_complete: bool | None = None,
):
    email = _validate_email(email)
    first_name = _validate_name(first_name, "first_name")
    last_name = _validate_name(last_name, "last_name")
    interests = _normalize_interests(interests)

    event_type = _normalize_event_types(event_type)
    if not event_type: return {"success": False, "message": "Invalid preference"}

    user, _ = users_database.get_document(email)
    if user is None: return {"success": False, "message": "User not found"}

    if password or confirm_password:
        password = _validate_password(password)
        if password != confirm_password: return {"success": False, "message": "Passwords do not match"}
        user["password"] = password

    user["first_name"] = first_name
    user["last_name"] = last_name
    user["interests"] = interests
    user["event_type"] = event_type
    if "attending_event_ids" not in user or not isinstance(user.get("attending_event_ids"), list):
        user["attending_event_ids"] = []

    if onboarding_complete is not None: user["onboarding_complete"] = bool(onboarding_complete)

    users_database.set_document(email, user)

    return {
        "success": True,
        "message": "Profile updated",
        "user": _user_response(user, email),
    }

__all__ = [
    "sign_up",
    "sign_in",
    "get_profile",
    "update_profile",
    "get_admin_users",
    "remove_hoster",
]
