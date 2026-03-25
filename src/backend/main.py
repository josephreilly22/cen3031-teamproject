# Imports
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Variables
app = FastAPI()

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

# Functions
@app.get("/")
def root(): return {"status": "ok"}

# Initialize
print("SERVER | Server is online! 🟢")