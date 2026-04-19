# Imports
import json
import os
import threading
import time
import uuid
from pathlib import Path
from urllib.request import urlopen, Request

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from modules.key import decrypt
from modules.user import sign_up, sign_in, get_profile, update_profile, delete_account, submit_host_request, get_host_requests, approve_host_request, deny_host_request, get_admin_users, remove_hoster, get_host_request
from modules.events import create_event, get_events_by_host, get_all_events, get_recommended_events, get_event, get_event_attendees, attend_event, unattend_event, update_event, delete_event, report_event, get_event_report, get_admin_report_summaries, get_admin_report_detail, resolve_admin_report, remove_reported_event

# Variables
# Initialize FastAPI app - main entry point for all HTTP requests
app = FastAPI()
BASE_DIR = Path(__file__).resolve().parent

# Locate the frontend build directory from env var or known locations
frontend_build_dir_env = os.getenv("FRONTEND_BUILD_DIR", "").strip()
FRONTEND_BUILD_DIR = Path(frontend_build_dir_env).expanduser() if frontend_build_dir_env else BASE_DIR / "frontend_build"
if not FRONTEND_BUILD_DIR.exists():
    candidate = BASE_DIR / "frontend_build"
    if candidate.exists():
        FRONTEND_BUILD_DIR = candidate
if not FRONTEND_BUILD_DIR.exists():
    candidate = BASE_DIR.parent / "frontend" / "build"
    if candidate.exists():
        FRONTEND_BUILD_DIR = candidate
if not FRONTEND_BUILD_DIR.exists() and frontend_build_dir_env:
    FRONTEND_BUILD_DIR = BASE_DIR / "frontend_build"

# Mount static files (CSS, JS) if they exist
STATIC_DIR = FRONTEND_BUILD_DIR / "static"
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Enable CORS to allow frontend to communicate with backend
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

# Request Classes - define expected JSON payloads from client
# Class for user registration endpoint
class SignUpRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    confirm_password: str

# Class for user login endpoint
class LoginRequest(BaseModel):
    email: str
    password: str

# Class for requesting host/organizer status
class HostRegistrationRequest(BaseModel):
    email: str
    first_name: str
    last_name: str
    organization: str
    message: str

# Class for creating a new event
class CreateEventRequest(BaseModel):
    owner_email: str
    title: str
    host: str
    date: str
    end_date: str
    location: str
    location_types: list[str]
    description: str
    coordinates: list[float] | None = None

# Class for updating event details
class UpdateEventRequest(BaseModel):
    owner_email: str
    title: str
    host: str
    date: str
    end_date: str
    location: str
    location_types: list[str]
    description: str
    coordinates: list[float] | None = None

# Class for updating user profile and preferences
class UpdateProfileRequest(BaseModel):
    email: str
    first_name: str
    last_name: str
    interests: str
    diversity: float = 0.2
    event_type: list[str] | str
    password: str = ""
    confirm_password: str = ""
    onboarding_complete: bool | None = None

# Class for removal requests (user or hoster)
class RemoveRequest(BaseModel):
    email: str

# Class for event attendance request
class AttendRequest(BaseModel):
    email: str

# Class for reporting an event
class ReportEventRequest(BaseModel):
    reporter_email: str
    reason: str

# Functions - API Endpoints
# Root route - serve frontend index.html or health check
@app.get("/")
def root():
    index_file = FRONTEND_BUILD_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"status": "ok"}

# User signup endpoint - create new account
@app.post("/signup")
def signup(body: SignUpRequest):
    try:
        return sign_up(body.first_name, body.last_name, body.email, body.password, body.confirm_password)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# User login endpoint - authenticate and return user info
@app.post("/login")
def login(body: LoginRequest):
    try:
        return sign_in(body.email, body.password)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Host registration endpoint - submit request to become an event organizer
@app.post("/host-registration")
def host_registration(body: HostRegistrationRequest):
    try:
        return submit_host_request(body.email, body.first_name, body.last_name, body.organization, body.message)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Check host registration status - retrieve existing request for user
@app.get("/host-registration")
def host_registration_get(email: str | None = None):
    if email is None:
        return {"success": False, "message": "Email required"}
    try:
        return get_host_request(email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Admin endpoint - retrieve all pending host requests
@app.get("/admin/host-requests")
def admin_host_requests():
    try:
        return get_host_requests()
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Admin endpoint - retrieve all users (admins and hosters)
@app.get("/admin/users")
def admin_users():
    try:
        return get_admin_users()
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Admin endpoint - approve a host registration request
@app.post("/admin/approve/{email}")
def admin_approve(email: str):
    try:
        return approve_host_request(email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Admin endpoint - deny a host registration request
@app.post("/admin/deny/{email}")
def admin_deny(email: str):
    try:
        return deny_host_request(email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Admin endpoint - remove hoster role from user
@app.post("/admin/remove")
def admin_remove(body: RemoveRequest):
    try:
        return remove_hoster(body.email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Account deletion endpoint - delete user and all associated data
@app.delete("/account")
def account_delete(email: str):
    try:
        return delete_account(email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Get user profile endpoint - retrieve user info and preferences
@app.get("/profile")
def profile_get(email: str | None = None):
    if email is None:
        index_file = FRONTEND_BUILD_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return {"detail": "Frontend build not found"}

    try:
        return get_profile(email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Update user profile endpoint - update user info, interests, and preferences
@app.post("/profile")
def profile_update(body: UpdateProfileRequest):
    try:
        return update_profile(
            body.email,
            body.first_name,
            body.last_name,
            body.interests,
            body.diversity,
            body.event_type,
            body.password,
            body.confirm_password,
            body.onboarding_complete,
        )
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.post("/events")
# Create new event endpoint - requires hoster or admin privileges
def events_create(body: CreateEventRequest):
    try:
        return create_event(
            body.owner_email,
            body.title,
            body.host,
            body.date,
            body.end_date,
            body.location,
            body.location_types,
            body.description,
            body.coordinates,
        )
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Get events by host endpoint - retrieve all events created by a specific hoster
@app.get("/events/host")
def events_by_host(email: str):
    try:
        return get_events_by_host(email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Get all events endpoint - retrieve complete list of all events
@app.get("/events")
def events_get_all():
    try:
        return get_all_events()
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Get recommended events endpoint - AI-powered recommendations based on user interests
@app.get("/events/recommended")
async def events_get_recommended(email: str):
    try:
        return await get_recommended_events(email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Get single event endpoint - retrieve detailed info for one event
@app.get("/events/{event_id}")
def events_get_one(event_id: str):
    try:
        return get_event(event_id)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Get event attendees endpoint - retrieve list of users attending an event
@app.get("/events/{event_id}/attendees")
def events_get_attendees(event_id: str):
    try:
        return get_event_attendees(event_id)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Attend event endpoint - mark user as attending an event
@app.post("/events/{event_id}/attend")
def events_attend(event_id: str, body: AttendRequest):
    try:
        return attend_event(event_id, body.email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Unattend event endpoint - remove user from event attendance
@app.delete("/events/{event_id}/attend")
def events_unattend(event_id: str, email: str):
    try:
        return unattend_event(event_id, email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Update event endpoint - modify event details (owner or admin only)
@app.put("/events/{event_id}")
def events_update(event_id: str, body: UpdateEventRequest):
    try:
        return update_event(
            event_id,
            body.owner_email,
            body.title,
            body.host,
            body.date,
            body.end_date,
            body.location,
            body.location_types,
            body.description,
            body.coordinates,
        )
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Delete event endpoint - remove event (owner or admin only)
@app.delete("/events/{event_id}")
def events_delete(event_id: str, owner_email: str):
    try:
        return delete_event(event_id, owner_email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Report event endpoint - submit report for inappropriate event
@app.post("/events/{event_id}/report")
def events_report(event_id: str, body: ReportEventRequest):
    try:
        return report_event(event_id, body.reporter_email, body.reason)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Get event report status endpoint - check if user already reported this event
@app.get("/events/{event_id}/report")
def events_report_status(event_id: str, reporter_email: str):
    try:
        return get_event_report(event_id, reporter_email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Admin endpoint - get summary of all event reports
@app.get("/admin/reports")
def admin_reports(email: str):
    try:
        return get_admin_report_summaries(email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Admin endpoint - get detailed info about reports for one event
@app.get("/admin/reports/{event_id}")
def admin_report_detail(event_id: str, email: str):
    try:
        return get_admin_report_detail(email, event_id)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Admin endpoint - resolve/close reports for an event
@app.post("/admin/reports/{event_id}/resolve")
def admin_report_resolve(event_id: str, body: RemoveRequest):
    try:
        return resolve_admin_report(body.email, event_id)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Admin endpoint - remove reported event (keep hoster account)
@app.post("/admin/reports/{event_id}/remove-event")
def admin_report_remove_event(event_id: str, body: RemoveRequest):
    try:
        return remove_reported_event(body.email, event_id, remove_hoster=False)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Admin endpoint - remove reported event and hoster account
@app.post("/admin/reports/{event_id}/remove-event-hoster")
def admin_report_remove_event_hoster(event_id: str, body: RemoveRequest):
    try:
        return remove_reported_event(body.email, event_id, remove_hoster=True)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Catch-all route - serve frontend SPA (single page app) for non-API paths
@app.get("/{path:path}")
def serve_frontend(path: str):
    if path.startswith(("signup", "login", "host-registration", "admin", "account", "profile", "events")):
        return {"detail": "Not found"}

    index_file = FRONTEND_BUILD_DIR / "index.html"
    if index_file.exists():
        requested_file = FRONTEND_BUILD_DIR / path
        if requested_file.exists() and requested_file.is_file():
            return FileResponse(requested_file)
        return FileResponse(index_file)

    return {"detail": "Frontend build not found"}

# Initialize

# Background task - ping self to keep server warm on cloud platforms like Hugging Face
def _start_self_pinger():
    domain = os.getenv("PING_DOMAIN", "").strip()
    if not domain: return
    if not domain.startswith(("http://", "https://")): domain = f"https://{domain}"

    target_url = domain.rstrip("/")

    def ping_loop():
        while True:
            try:
                # Send ping request to self to prevent cold starts on serverless platforms
                with urlopen(target_url, timeout=10) as response:
                    response.read(1)
                print("SERVER | Successfully pinged server! 🟢")
            except Exception:
                print("SERVER | Failed to ping server! 🔴")
                
            time.sleep(60)

    threading.Thread(target=ping_loop, daemon=True).start()

def _start_self_hf_pinger():
    # Retrieve Hugging Face API token from environment and decrypt if necessary
    HF_TOKEN = os.getenv("HF_TOKEN", "")
    if HF_TOKEN and not HF_TOKEN.startswith("hf_"): 
        HF_TOKEN = decrypt(HF_TOKEN)
    if not HF_TOKEN: 
        return

    # Define the payload to send to Hugging Face Spaces queue
    payload = {
        "data": [],
        "event_data": None,
        "fn_index": 2,
        "trigger_id": 4,
        "session_hash": str(uuid.uuid4())
    }

    def hf_ping_loop():
        # Background loop - sends ping request to HF Spaces every 60 seconds to keep server warm
        while True:
            try:
                # Create POST request to HF Spaces queue join endpoint with JSON payload
                req = Request(
                    "https://eventplanner8-api.hf.space/gradio_api/queue/join",
                    data=json.dumps(payload).encode('utf-8'),
                    headers={'Content-Type': 'application/json'},
                    method='POST'
                )
                # Send request and read response to confirm successful ping
                with urlopen(req, timeout=10) as response:
                    response.read(1)
                print("SERVER | Successfully pinged HF server! 🟢")
            except Exception:
                # Catch any errors during ping attempt (network issues, timeouts, etc.)
                # print("SERVER | Failed to ping HF server! 🔴")
                pass
            
            # Wait 60 seconds before next ping
            time.sleep(60)

    # Start HF pinger as background daemon thread
    threading.Thread(target=hf_ping_loop, daemon=True).start()

_start_self_pinger()
_start_self_hf_pinger()

print("SERVER | Server is online! 🟢")
