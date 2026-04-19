import re

from modules.database import database
from modules.events import delete_events_for_owner, remove_reports_by_reporter

# Email validation pattern
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
# Field length constraints
NAME_MAX_LENGTH = 64
PASSWORD_MAX_LENGTH = 256
INTERESTS_MAX_LENGTH = 256

# Database collections for users and host requests
users_database = database("Users")
host_requests_database = database("HostRequests")

# Helper Functions - Input Validation
# Validate and normalize email address
def _validate_email(email: str):
    if not isinstance(email, str): raise ValueError("Email must be a string")

    normalized = email.strip().lower()
    if not EMAIL_PATTERN.match(normalized): raise ValueError("Invalid email")

    return normalized

# Validate and normalize name field
def _validate_name(name: str, field_name: str):
    label = field_name.replace("_", " ").capitalize()
    if not isinstance(name, str) or not name.strip(): raise ValueError(f"{label} is required")
    normalized = " ".join(name.strip().split())
    if len(normalized) > NAME_MAX_LENGTH:
        raise ValueError(f"{label} is too long")
    return normalized

# Validate password meets requirements (min 8 chars)
def _validate_password(password: str):
    if not isinstance(password, str) or len(password) < 8: raise ValueError("Password must be at least 8 characters")
    if len(password) > PASSWORD_MAX_LENGTH: raise ValueError("Password is too long")
    return password

# Normalize user interests text
def _normalize_interests(interests: str):
    if not isinstance(interests, str):
        raise ValueError("Interests must be a string")

    trimmed = interests.rstrip()
    if len(trimmed) > INTERESTS_MAX_LENGTH:
        raise ValueError("Interests are too long")

    return trimmed

# Normalize and validate event type preferences (on-campus/off-campus)
def _normalize_event_types(event_types):
    if event_types is None:
        return []

    if isinstance(event_types, str):
        event_types = [event_types]

    if not isinstance(event_types, list):
        raise ValueError("Invalid preference")

    # Filter to only allowed location types
    allowed = []
    for item in event_types:
        if not isinstance(item, str):
            continue
        normalized = item.strip()
        if normalized in {"on-campus", "off-campus"} and normalized not in allowed:
            allowed.append(normalized)

    return allowed

# Create a new user document with default values
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

# Format user data for API response
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

# Normalize diversity preference score (-1.0 to 1.0 range, defaults to 0.2)
def _normalize_diversity(value):
    try:
        normalized = float(value)
    except (TypeError, ValueError):
        normalized = 0.2

    return max(-1.0, min(1.0, normalized))

# Public User Management Functions
# Create new user account with signup
def sign_up(first_name: str, last_name: str, email: str, password: str, confirm_password: str):
    first_name = _validate_name(first_name, "first_name")
    last_name = _validate_name(last_name, "last_name")
    email = _validate_email(email)
    password = _validate_password(password)

    # Passwords must match
    if password != confirm_password: return {"success": False, "message": "Passwords do not match"}

    # Check if email already registered
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

# Authenticate user with email and password
def sign_in(email: str, password: str):
    email = _validate_email(email)
    password = _validate_password(password)

    user, _ = users_database.get_document(email)
    # Check if user exists and password matches
    if user is None or user.get("password") != password: return {"success": False, "message": "Invalid email or password"}

    # Route to onboarding if not complete, otherwise to dashboard
    redirect = "/dashboard" if user.get("onboarding_complete", False) else "/onboarding"
    return {
        "success": True,
        "message": "Login successful",
        "user": _user_response(user, email),
        "redirect": redirect,
    }

# Get user profile data
def get_profile(email: str):
    email = _validate_email(email)

    user, _ = users_database.get_document(email)
    if user is None: return {"success": False, "message": "User not found"}

    # Ensure attending_event_ids field exists
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
        "diversity": _normalize_diversity(user.get("diversity", 0.2)),
        "event_type": list(user.get("event_type", []) or []),
        "onboarding_complete": bool(user.get("onboarding_complete", False)),
        "attending_event_ids": list(user.get("attending_event_ids", []) or []),
    }

# Submit request to become a host/event organizer
def submit_host_request(email: str, first_name: str, last_name: str, organization: str, message: str):
    email = _validate_email(email)
    first_name = _validate_name(first_name, "first_name")
    last_name = _validate_name(last_name, "last_name")

    user, _ = users_database.get_document(email)
    if user is None: return {"success": False, "message": "User not found"}
    # Users with admin/hoster roles cannot register again
    if user.get("role") in {"admin", "hoster"}:
        return {"success": False, "message": f'You cannot register as {user.get("role")}'}

    # Check if user already has a pending request
    existing_request, _ = host_requests_database.get_document(email)
    if existing_request is not None:
        return {"success": True, "message": "Host request already submitted", "already_submitted": True}

    # Create new host request
    host_requests_database.set_document(email, {
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "organization": organization.strip(),
        "message": message.strip(),
    })

    return {"success": True, "message": "Host request submitted", "already_submitted": False}

# Get host request status for user
def get_host_request(email: str):
    email = _validate_email(email)
    request, _ = host_requests_database.get_document(email)
    if request is None:
        return {"success": True, "request": None}
    return {"success": True, "request": request}

# Get all pending host requests (admin only)
def get_host_requests(): return {"success": True, "requests": host_requests_database.get_collection()}

# Approve host request - grant hoster role to user
def approve_host_request(email: str):
    email = _validate_email(email)

    user, _ = users_database.get_document(email)
    if user is None: return {"success": False, "message": "User not found"}

    request, _ = host_requests_database.get_document(email)
    # Upgrade user to hoster role and set organization
    user["role"] = "hoster"
    user["organization"] = request.get("organization", "") if isinstance(request, dict) else ""
    users_database.set_document(email, user)
    host_requests_database.remove_document(email)
    return {"success": True, "message": "Host request approved", "role": "hoster"}

# Deny host request - remove the request
def deny_host_request(email: str):
    email = _validate_email(email)
    host_requests_database.remove_document(email)
    return {"success": True, "message": "Host request denied"}

# Delete user account and all associated data
def delete_account(email: str):
    email = _validate_email(email)

    user, _ = users_database.get_document(email)
    if user is None: return {"success": False, "message": "User not found"}

    # Delete all events created by user and their reports
    cleanup = delete_events_for_owner(email)
    # Remove all reports submitted by this user
    removed_reports = remove_reports_by_reporter(email)
    # Delete user document
    users_database.remove_document(email)
    return {
        "success": True,
        "message": "Account deleted",
        "removed_hosted_events": cleanup.get("removed_event_count", 0),
        "removed_event_reports": cleanup.get("removed_report_count", 0),
        "removed_report_submissions": removed_reports,
    }

# Get all admin and hoster users for admin dashboard
def get_admin_users():
    # Helper to format user payload
    def _payload(doc):
        user = doc.get("value")
        if not isinstance(user, dict):
            return None

        return {
            "email": user.get("email", doc.get("key", "")),
            "first_name": user.get("first_name", ""),
            "last_name": user.get("last_name", ""),
            "role": user.get("role", "user"),
            "organization": user.get("organization", ""),
        }

    # Get all admins and hosters, filter out None values
    admins = [payload for payload in (_payload(doc) for doc in users_database.get_collection({"role": "admin"})) if payload]
    hosters = [payload for payload in (_payload(doc) for doc in users_database.get_collection({"role": "hoster"})) if payload]

    # Sort results for consistent ordering
    admins.sort(key=lambda user: (user["first_name"], user["last_name"], user["email"]))
    hosters.sort(key=lambda user: (user["organization"], user["first_name"], user["last_name"], user["email"]))
    return {"success": True, "admins": admins, "hosters": hosters}

# Remove hoster role and all associated events (admin only)
def remove_hoster(email: str):
    email = _validate_email(email)

    user, _ = users_database.get_document(email)
    if user is None: return {"success": False, "message": "User not found"}
    if user.get("role") != "hoster": return {"success": False, "message": "User is not a hoster"}

    # Delete all events created by this hoster
    cleanup = delete_events_for_owner(email)
    # Downgrade to regular user
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

# Update user profile with new preferences and password
def update_profile(
    email: str,
    first_name: str,
    last_name: str,
    interests: str,
    diversity,
    event_type,
    password: str = "",
    confirm_password: str = "",
    onboarding_complete: bool | None = None,
):
    email = _validate_email(email)
    first_name = _validate_name(first_name, "first_name")
    last_name = _validate_name(last_name, "last_name")
    interests = _normalize_interests(interests)
    diversity = _normalize_diversity(diversity)

    event_type = _normalize_event_types(event_type)
    if not event_type: return {"success": False, "message": "Invalid preference"}

    user, _ = users_database.get_document(email)
    if user is None: return {"success": False, "message": "User not found"}

    # Update password if provided
    if password or confirm_password:
        password = _validate_password(password)
        if password != confirm_password: return {"success": False, "message": "Passwords do not match"}
        user["password"] = password

    # Update all profile fields
    user["first_name"] = first_name
    user["last_name"] = last_name
    user["interests"] = interests
    user["diversity"] = diversity
    user["event_type"] = event_type
    if "attending_event_ids" not in user or not isinstance(user.get("attending_event_ids"), list):
        user["attending_event_ids"] = []

    # Update onboarding status if provided
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
