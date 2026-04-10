# Imports
import re
from modules.database import database

# Variables
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

users_database = database("Users")
host_requests_database = database("HostRequests")

# Functions
def _validate_email(email: str):
    if not isinstance(email, str): raise ValueError("email must be a string")

    normalized = email.strip().lower()
    if not EMAIL_PATTERN.match(normalized): raise ValueError("invalid email")

    return normalized

def _validate_name(name: str, field_name: str):
    if not isinstance(name, str) or not name.strip(): raise ValueError(f"{field_name} is required")
    return name.strip()

def _validate_password(password: str):
    if not isinstance(password, str) or len(password) < 8: raise ValueError("password must be at least 8 characters")
    return password

def sign_up(first_name: str, last_name: str, email: str, password: str, confirm_password: str):
    first_name = _validate_name(first_name, "first_name")
    last_name = _validate_name(last_name, "last_name")
    email = _validate_email(email)
    password = _validate_password(password)

    if password != confirm_password: return {"success": False, "message": "Passwords do not match"}

    user, _ = users_database.get_document(email)
    if user is not None: return {"success": False, "message": "Email already registered"}

    users_database.set_document(email, {"first_name": first_name, "last_name": last_name, "email": email, "password": password, "role": "normal"})
    return {"success": True, "message": "Account created successfully", "user": {"first_name": first_name, "last_name": last_name, "email": email, "role": "normal"}, "redirect": "/onboarding"}

def sign_in(email: str, password: str):
    email = _validate_email(email)
    password = _validate_password(password)

    user, _ = users_database.get_document(email)
    if user is None: return {"success": False, "message": "Invalid email or password"}
    if user.get("password") != password: return {"success": False, "message": "Invalid email or password"}

    return {"success": True, "message": "Login successful", "user": {"first_name": user.get("first_name"), "last_name": user.get("last_name"), "email": email, "role": user.get("role", "normal")}, "redirect": "/dashboard"}

def get_profile(email: str):
    email = _validate_email(email)

    user, _ = users_database.get_document(email)
    if user is None: return {"success": False, "message": "User not found"}

    return {
        "success": True,
        "interests": user.get("interests", ""),
        "event_type": user.get("event_type", ""),
    }

def submit_host_request(email: str, first_name: str, last_name: str, organization: str, message: str):
    email = _validate_email(email)
    first_name = _validate_name(first_name, "first_name")
    last_name = _validate_name(last_name, "last_name")

    user, _ = users_database.get_document(email)
    if user is None: return {"success": False, "message": "User not found"}

    host_requests_database.set_document(email, {
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "organization": organization.strip(),
        "message": message.strip(),
    })
    return {"success": True, "message": "Host request submitted"}

def get_host_requests():
    return {"success": True, "requests": host_requests_database.get_collection()}

def approve_host_request(email: str):
    email = _validate_email(email)

    user, _ = users_database.get_document(email)
    if user is None: return {"success": False, "message": "User not found"}

    user["role"] = "event-host"
    users_database.set_document(email, user)
    host_requests_database.remove_document(email)
    return {"success": True, "message": "Host request approved", "role": "event-host"}

def deny_host_request(email: str):
    email = _validate_email(email)
    host_requests_database.remove_document(email)
    return {"success": True, "message": "Host request denied"}

def delete_account(email: str):
    email = _validate_email(email)

    user, _ = users_database.get_document(email)
    if user is None: return {"success": False, "message": "User not found"}

    users_database.remove_document(email)
    return {"success": True, "message": "Account deleted"}

def update_profile(email: str, interests: str, event_type: str):
    email = _validate_email(email)

    if event_type not in {"on-campus", "off-campus", "both"}:
        return {"success": False, "message": "Invalid event type"}

    user, _ = users_database.get_document(email)
    if user is None: return {"success": False, "message": "User not found"}

    user["interests"] = interests.strip()
    user["event_type"] = event_type
    users_database.set_document(email, user)
    return {"success": True, "message": "Profile updated"}

# Initialize
__all__ = ["sign_up", "sign_in", "get_profile", "update_profile"]
