# Imports
from modules.database import database
from modules.engine import give_recommendation
from modules.interests import rank_announcements
from modules.user import sign_in, sign_up

# Variables

# Functions
def run_t1():
    print("T1: Verify a new user can create an account with valid registration details.")
    try:
        database("Users").remove_document("johndoe@email.com")
        result = sign_up("john_doe", "johndoe@email.com", "Password123!", "Password123!")
        print("Input: username=john_doe, email=johndoe@email.com, password=Password123!")
        if result.get("success"):
            print(f"Actual Result: Account created for {result['user']['username']} with redirect to {result['redirect']}.")
        else:
            print(f"Actual Result: {result.get('message')}")
        print("Status: Pass" if result.get("success") else "Status: Fail")
    except Exception as error:
        print("Actual Result:", error)
        print("Status: Fail")
    print()

def run_t2():
    print("T2: Verify login is rejected for a registered email with an incorrect password.")
    try:
        result = sign_in("johndoe@email.com", "WrongPassword1!")
        print("Input: email=johndoe@email.com, password=WrongPassword1!")
        print(f"Actual Result: {result.get('message')}")
        print("Status: Pass" if not result.get("success") else "Status: Fail")
    except Exception as error:
        print("Actual Result:", error)
        print("Status: Fail")
    print()

async def run_t3():
    print("T3: Verify a related announcement scores higher than an unrelated announcement.")
    try:
        user_tags = ["basketball", "sports"]
        choice_a = "Basketball Tryouts Friday 6pm"
        choice_b = "Chess Club Weekly Meeting"
        result = await give_recommendation(", ".join(user_tags), [choice_a, choice_b])
        print("Input:", {"user_tags": user_tags, "announcement_a": choice_a, "announcement_b": choice_b})
        highest = (result.get("highest") or {}).get("label")
        lowest = (result.get("lowest") or {}).get("label")
        scores = result.get("output") or []
        top_score = scores[0].get("score") if scores else None
        bottom_score = scores[-1].get("score") if scores else None
        print(f"Actual Result: Highest match was '{highest}' with score {top_score}; lowest match was '{lowest}' with score {bottom_score}.")
        print("Status: Pass" if highest == choice_a else "Status: Fail")
    except Exception as error:
        print("Actual Result:", error)
        print("Status: Fail")
    print()

async def run_t4():
    print("T4: Verify empty tags do not crash the recommendation flow.")
    try:
        announcements = ["Basketball Tryouts", "Jazz Night", "Python Workshop"]
        result = await rank_announcements([], announcements)
        print("Input:", {"user_tags": [], "announcements": announcements})
        print(f"Actual Result: Fallback mode '{result.get('fallback')}' returned {len(result.get('output', []))} announcements with neutral scores.")
        print("Status: Pass" if result.get("task") == "fallback" else "Status: Fail")
    except Exception as error:
        print("Actual Result:", error)
        print("Status: Fail")
    print()

def run_t5():
    print("T5: Verify database can store and fetch a complex value.")
    try:
        main_db = database("Main")
        value = {"name": "Kwanyoung", "id": 1000}
        main_db.set_document("key", value)
        result, key = main_db.get_document("key")
        print("Input:", {"database": "Main", "key": "key", "value": value})
        if result == value:
            print(f"Actual Result: Retrieved key '{key}' with matching value {result}.")
        else:
            print(f"Actual Result: Retrieved key '{key}' with non-matching value {result}.")
        print("Status: Pass" if result == value else "Status: Fail")
    except Exception as error:
        print("Actual Result:", error)
        print("Status: Fail")
    print()

def run_t6():
    print("T6: Verify sign up is rejected when password and confirm password do not match.")
    try:
        database("Users").remove_document("janedoe@email.com")
        result = sign_up("jane_doe", "janedoe@email.com", "Password123!", "Password124!")
        print("Input: username=jane_doe, email=janedoe@email.com, password=Password123!, confirm_password=Password124!")
        print(f"Actual Result: {result.get('message')}")
        print("Status: Pass" if not result.get("success") else "Status: Fail")
    except Exception as error:
        print("Actual Result:", error)
        print("Status: Fail")
    print()

def run_t7():
    print("T7: Verify sign up is rejected when email is already registered.")
    try:
        sign_up("john_doe", "johndoe@email.com", "Password123!", "Password123!")
        result = sign_up("john_doe_2", "johndoe@email.com", "Password123!", "Password123!")
        print("Input: username=john_doe_2, email=johndoe@email.com, password=Password123!")
        print(f"Actual Result: {result.get('message')}")
        print("Status: Pass" if not result.get("success") else "Status: Fail")
    except Exception as error:
        print("Actual Result:", error)
        print("Status: Fail")
    print()

def run_t8():
    print("T8: Verify login is rejected when the email format is invalid.")
    try:
        print("Input: email=johndoeemail.com, password=Password123!")
        result = sign_in("johndoeemail.com", "Password123!")
        print(f"Actual Result: {result.get('message')}")
        print("Status: Fail")
    except Exception as error:
        print(f"Actual Result: {error}")
        print("Status: Pass")
    print()

# Initialize
if __name__ == "__main__":
    import asyncio

    run_t1()
    run_t2()
    asyncio.run(run_t3())
    asyncio.run(run_t4())
    run_t5()
    run_t6()
    run_t7()
    run_t8()
