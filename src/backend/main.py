# Imports
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from modules.user import sign_up, sign_in, get_profile, update_profile, delete_account, submit_host_request, get_host_requests, approve_host_request, deny_host_request, get_admin_users, remove_hoster
from modules.events import create_event, get_events_by_host, get_all_events, get_recommended_events, get_event, get_event_attendees, attend_event, unattend_event, update_event, delete_event, report_event, get_event_report, get_admin_report_summaries, get_admin_report_detail, resolve_admin_report, remove_reported_event

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
    location_types: list[str]
    description: str
    coordinates: list[float] | None = None

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

class UpdateProfileRequest(BaseModel):
    email: str
    first_name: str
    last_name: str
    interests: str
    event_type: list[str] | str
    password: str = ""
    confirm_password: str = ""
    onboarding_complete: bool | None = None

class RemoveRequest(BaseModel):
    email: str

class AttendRequest(BaseModel):
    email: str

class ReportEventRequest(BaseModel):
    reporter_email: str
    reason: str

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

@app.post("/admin/remove")
def admin_remove(body: RemoveRequest):
    try:
        return remove_hoster(body.email)
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

@app.get("/events/recommended")
async def events_get_recommended(email: str):
    try:
        return await get_recommended_events(email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.get("/events/{event_id}")
def events_get_one(event_id: str):
    try:
        return get_event(event_id)
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.get("/events/{event_id}/attendees")
def events_get_attendees(event_id: str):
    try:
        return get_event_attendees(event_id)
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.post("/events/{event_id}/attend")
def events_attend(event_id: str, body: AttendRequest):
    try:
        return attend_event(event_id, body.email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.delete("/events/{event_id}/attend")
def events_unattend(event_id: str, email: str):
    try:
        return unattend_event(event_id, email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

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

@app.delete("/events/{event_id}")
def events_delete(event_id: str, owner_email: str):
    try:
        return delete_event(event_id, owner_email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.post("/events/{event_id}/report")
def events_report(event_id: str, body: ReportEventRequest):
    try:
        return report_event(event_id, body.reporter_email, body.reason)
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.get("/events/{event_id}/report")
def events_report_status(event_id: str, reporter_email: str):
    try:
        return get_event_report(event_id, reporter_email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.get("/admin/reports")
def admin_reports(email: str):
    try:
        return get_admin_report_summaries(email)
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.get("/admin/reports/{event_id}")
def admin_report_detail(event_id: str, email: str):
    try:
        return get_admin_report_detail(email, event_id)
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.post("/admin/reports/{event_id}/resolve")
def admin_report_resolve(event_id: str, body: RemoveRequest):
    try:
        return resolve_admin_report(body.email, event_id)
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.post("/admin/reports/{event_id}/remove-event")
def admin_report_remove_event(event_id: str, body: RemoveRequest):
    try:
        return remove_reported_event(body.email, event_id, remove_hoster=False)
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.post("/admin/reports/{event_id}/remove-event-hoster")
def admin_report_remove_event_hoster(event_id: str, body: RemoveRequest):
    try:
        return remove_reported_event(body.email, event_id, remove_hoster=True)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Initialize
print("SERVER | Server is online! 🟢")
