from fastapi import FastAPI

app = FastAPI(title="Event API", version="1.0.0")


@app.get("/")
def root():
    """Root endpoint."""
    return {"message": "Event API is running"}

