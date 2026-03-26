# Imports
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from modules.user import sign_up, sign_in

# Variables
app = FastAPI()

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

class SignUpRequest(BaseModel):
    username: str
    email: str
    password: str
    confirm_password: str

class SignInRequest(BaseModel):
    email: str
    password: str

# Functions
@app.get("/")
def root(): return {"status": "ok"}

@app.post("/signup")
def signup(body: SignUpRequest):
    try:
        return sign_up(body.username, body.email, body.password, body.confirm_password)
    except ValueError as e:
        return {"success": False, "message": str(e)}

@app.post("/login")
def login(body: SignInRequest):
    try:
        return sign_in(body.email, body.password)
    except ValueError as e:
        return {"success": False, "message": str(e)}

# Initialize
print("SERVER | Server is online! 🟢")