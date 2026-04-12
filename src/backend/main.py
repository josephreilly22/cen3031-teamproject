# Imports
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from modules.user import sign_up, sign_in, get_profile, update_profile, delete_account, submit_host_request, get_host_requests, approve_host_request, deny_host_request, get_admin_users, banish_hoster
from modules.events import create_event, get_events_by_host, get_all_events, get_event, update_event, delete_event

# Variables
app = FastAPI()

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

class SignUpRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    confirm_password: str

class SignInRequest(BaseModel):
    email: str
    password: str

class HostRegistrationRequest(BaseModel):
    email: str
    first_name: str
    last_name: str
    organization: str
    message: str

class CreateEventRequest(BaseModel):
    owner_email: str
    title: str
    host: str
    date: str
    end_date: str
    location: str
    description: str

class UpdateEventRequest(BaseModel):
    owner_email: str
    title: str
    host: str
    date: str
    end_date: str
    location: str
    description: str

class UpdateProfileRequest(BaseModel):
    email: str
    first_name: str
    last_name: str
    interests: str
    event_type: str
    password: str = ""
    confirm_password: str = ""
    onboarding_complete: bool | None = None

class BanishRequest(BaseModel):
    email: str

# Functions
@app.get("/")
def root(): return {"status": "ok"}

@app.post("/signup")
def signup(body: SignUpRequest):
    try:
        return sign_up(body.first_name, body.last_name, body.email, body.password, body.confirm_password)
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.post("/login")
def login(body: SignInRequest):
    try:
        return sign_in(body.email, body.password)
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.post("/host-registration")
def host_registration(body: HostRegistrationRequest):
    try:
        return submit_host_request(body.email, body.first_name, body.last_name, body.organization, body.message)
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.get("/admin/host-requests")
def admin_host_requests():
    try:
        return get_host_requests()
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.get("/admin/users")
def admin_users():
    try:
        return get_admin_users()
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.post("/admin/approve/{email}")
def admin_approve(email: str):
    try:
        return approve_host_request(email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.post("/admin/deny/{email}")
def admin_deny(email: str):
    try:
        return deny_host_request(email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.post("/admin/banish")
def admin_banish(body: BanishRequest):
    try:
        return banish_hoster(body.email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.delete("/account")
def account_delete(email: str):
    try:
        return delete_account(email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.get("/profile")
def profile_get(email: str):
    try:
        return get_profile(email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.post("/profile")
def profile_update(body: UpdateProfileRequest):
    try:
        return update_profile(
            body.email,
            body.first_name,
            body.last_name,
            body.interests,
            body.event_type,
            body.password,
            body.confirm_password,
            body.onboarding_complete,
        )
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.post("/events")
def events_create(body: CreateEventRequest):
    try:
        return create_event(body.owner_email, body.title, body.host, body.date, body.end_date, body.location, body.description)
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.get("/events/host")
def events_by_host(email: str):
    try:
        return get_events_by_host(email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.get("/events")
def events_get_all():
    try:
        return get_all_events()
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.get("/events/{event_id}")
def events_get_one(event_id: str):
    try:
        return get_event(event_id)
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.put("/events/{event_id}")
def events_update(event_id: str, body: UpdateEventRequest):
    try:
        return update_event(event_id, body.owner_email, body.title, body.host, body.date, body.end_date, body.location, body.description)
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.delete("/events/{event_id}")
def events_delete(event_id: str, owner_email: str):
    try:
        return delete_event(event_id, owner_email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Initialize
print("SERVER | Server is online! 🟢")
