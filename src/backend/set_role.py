import sys
from modules.env import load_env
load_env()
from modules.database import database

users_db = database("Users")

if len(sys.argv) == 1:
    # List all users and their roles
    users = users_db.get_collection()
    if not users:
        print("No users found.")
    else:
        for u in users:
            v = u.get("value", {})
            print(f"{v.get('email')}  —  role: {v.get('role', 'normal')}")

elif len(sys.argv) == 3:
    email, role = sys.argv[1], sys.argv[2]
    user, _ = users_db.get_document(email)
    if user is None:
        print(f"User '{email}' not found.")
        sys.exit(1)
    user["role"] = role
    users_db.set_document(email, user)
    print(f"Updated '{email}' role to '{role}'.")

else:
    print("Usage:")
    print("  List users:        python set_role.py")
    print("  Set role:          python set_role.py <email> <role>")
