# Imports
import os
import json
import uuid
import asyncio
import aiohttp

from modules.env import load_env
from modules.key import decrypt

# Variables
load_env()
# Get Hugging Face API token for accessing AI model
HF_TOKEN = os.getenv("HF_TOKEN", "")
if HF_TOKEN and not HF_TOKEN.startswith("hf_"): HF_TOKEN = decrypt(HF_TOKEN)

# Ping interval to keep cloud inference server warm (6 hours)
PING_INTERVAL = 60 * 60 * 6

# Headers for Hugging Face API requests
headers = {"Authorization": f"Bearer {HF_TOKEN}", "Content-Type": "application/json"}
# Hugging Face space URL hosting the AI model
url = "https://EventPlanner8-API.hf.space"

# Timeout configurations for different request types
timeout_5 = aiohttp.ClientTimeout(total=5)
timeout_60 = aiohttp.ClientTimeout(total=60)

# Global reference to background ping task
ping_task = None

# Functions
# Background initialization - starts ping task to keep server warm
def _initialize():
    global ping_task

    # Send ping request to cloud server
    async def ping_cloud(session: aiohttp.ClientSession):
        if not HF_TOKEN: return

        try: 
            async with session.post(f"{url}/gradio_api/call/cloud", json={"data": [], "session_hash": uuid.uuid4().hex}, headers=headers, timeout=timeout_5): return
        except Exception: return

    # Continuous ping loop that runs in background
    async def ping_loop():
        timeout = aiohttp.ClientTimeout(total=5)

        async with aiohttp.ClientSession(timeout=timeout) as session:
            while True:
                await ping_cloud(session)
                await asyncio.sleep(PING_INTERVAL)

    if ping_task is not None or not HF_TOKEN: return
    
    try: loop = asyncio.get_running_loop()
    except RuntimeError: return
    
    # Create background task for pinging
    ping_task = loop.create_task(ping_loop())

# Make AI inference request to Hugging Face space API
async def inference(data: dict):
    if not HF_TOKEN: raise ValueError("HF_TOKEN missing")

    session_hash = uuid.uuid4().hex

    async with aiohttp.ClientSession(headers=headers) as session:
        # Call the inference endpoint with streaming results
        async with session.post(f"{url}/gradio_api/call/generate", json={"data": [json.dumps(data)], "session_hash": session_hash}, timeout=timeout_5) as join_response:
            join_status = join_response.status
            join_data = await join_response.json(content_type=None)

        if join_status != 200: raise RuntimeError(join_data)

        event_id = join_data.get("event_id")
        if not event_id: raise RuntimeError("No event_id returned")

        # Stream and wait for process completion
        async with session.get(f"{url}/gradio_api/queue/data?session_hash={session_hash}", timeout=timeout_60) as stream_response:
            async for raw_line in stream_response.content:
                line = raw_line.decode("utf-8", errors="ignore").strip()

                if not line.startswith("data:"): continue

                try: message = json.loads(line[5:].strip())
                except Exception: continue

                # Check for process completion and success
                if message.get("msg") == "process_completed" and message.get("event_id") == event_id:
                    if not message.get("success"): raise RuntimeError(message)
                    output = (((message.get("output") or {}).get("data")) or [None])[0]
                    return output

    raise RuntimeError("Stream ended unexpectedly")

# Get AI-powered event recommendations based on user interests
async def give_recommendation(input: str, choices: list):
    data = {"input": input, "choices": choices}
    if not isinstance(data, dict): raise ValueError("Data must be a dictionary.")
    data["task"] = "sentence"
    data["normalize"] = False
    return await inference(data)

# Classify input into categories - used for moderating reports
async def give_classification(input: str, choices: list):
    data = {"input": input, "choices": choices}
    if not isinstance(data, dict): raise ValueError("Data must be a dictionary.")
    data["task"] = "classification"
    data["normalize"] = True
    return await inference(data)

# Initialize
_initialize()

__all__ = ["give_recommendation", "give_classification"]
