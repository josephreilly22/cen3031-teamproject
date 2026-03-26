# Imports
import re
from modules.database import database

# Variables
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

users_database = database("Users")

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

    users_database.set_document(email, {"first_name": first_name, "last_name": last_name, "email": email, "password": password})
    return {"success": True, "message": "Account created successfully", "user": {"first_name": first_name, "last_name": last_name, "email": email}, "redirect": "/onboarding"}

def sign_in(email: str, password: str):
    email = _validate_email(email)
    password = _validate_password(password)

    user, _ = users_database.get_document(email)
    if user is None: return {"success": False, "message": "Invalid email or password"}
    if user.get("password") != password: return {"success": False, "message": "Invalid email or password"}

    return {"success": True, "message": "Login successful", "user": {"first_name": user.get("first_name"), "last_name": user.get("last_name"), "email": email}, "redirect": "/dashboard"}

# Initialize
__all__ = ["sign_up", "sign_in"]
