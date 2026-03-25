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

def _validate_username(username: str):
    if not isinstance(username, str) or not username.strip(): raise ValueError("username is required")
    return username.strip()

def _validate_password(password: str):
    if not isinstance(password, str) or len(password) < 8: raise ValueError("password must be at least 8 characters")
    return password

def sign_up(username: str, email: str, password: str, confirm_password: str):
    username = _validate_username(username)
    email = _validate_email(email)
    password = _validate_password(password)

    if password != confirm_password: return {"success": False, "message": "Passwords do not match"}

    user, _ = users_database.get_document(email)
    if user is not None: return {"success": False, "message": "Email already registered"}

    users_database.set_document(email, {"username": username, "email": email, "password": password})
    return {"success": True, "message": "Account created successfully", "user": {"username": username, "email": email}, "redirect": "/onboarding"}

def sign_in(email: str, password: str):
    email = _validate_email(email)
    password = _validate_password(password)

    user, _ = users_database.get_document(email)
    if user is None: return {"success": False, "message": "Invalid email or password"}
    if user.get("password") != password: return {"success": False, "message": "Invalid email or password"}

    return {"success": True, "message": "Login successful", "user": {"username": user.get("username"), "email": email}, "redirect": "/dashboard"}

# Initialize
__all__ = ["sign_up", "sign_in"]
