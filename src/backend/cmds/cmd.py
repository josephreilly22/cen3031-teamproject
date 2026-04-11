"""
GET A LIST OF COMMANDS:

WindowsOS:
.\.venv\Scripts\python.exe .\src\backend\cmds\cmd.py

MacOS:
./.venv/bin/python src/backend/cmds/cmd.py
"""

# Imports
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path: sys.path.insert(0, str(BACKEND_DIR))

from modules.env import load_env
from modules.database import database

# Variables
users_db = database("Users")

roles = ["user", "hoster", "admin"]

# Functions
def users():
    users = users_db.get_collection()
    if not users:
        print("No users found.")
        return 0

    for user in users:
        value = user.get("value", {})
        print(f"[{value.get('email')}]: {value.get('role', 'user')}")

    return 0

def role(email, role):
    user, _ = users_db.get_document(email)
    if user is None:
        print(f"User '{email}' not found.")
        return 1

    if role not in roles:
        print(f"Invalid role '{role}'. Please use one of: {', '.join(roles)}")
        return 1

    user["role"] = role
    users_db.set_document(email, user)

    print(f"Updated '{email}' role to '{role}'.")

    return 0

def cmds():
    print("Here are the list of commands:")
    print("  users | Lists all users by email and role.")
    print("  role <email> <role> | Sets a user's role by email (user, hoster, admin).")

def main():
    args = sys.argv[1:]

    if not args:
        cmds()
        return 1

    command = args[0]

    if command == "users" and len(args) == 1:  return users()
    if command == "role" and len(args) == 3: return role(args[1], args[2])

    cmds()
    return 1

# Initialize
if __name__ == "__main__": raise SystemExit(main())
