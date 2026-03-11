# Imports
import os
import json
import uuid
import asyncio
import aiohttp

from modules.key import decrypt

# Variables
HF_TOKEN = os.getenv("HF_TOKEN", "")
if HF_TOKEN and not HF_TOKEN.startswith("hf_"): HF_TOKEN = decrypt(HF_TOKEN)

PING_INTERVAL = 60 * 60 * 6

headers = {"Authorization": f"Bearer {HF_TOKEN}", "Content-Type": "application/json"}
url = "https://EventPlanner8-API.hf.space"

timeout_5 = aiohttp.ClientTimeout(total=5)
timeout_60 = aiohttp.ClientTimeout(total=60)

ping_task = None

# Functions
def _initialize():
    global ping_task

    async def ping_cloud(session: aiohttp.ClientSession):
        if not HF_TOKEN: return

        try: 
            async with session.post(f"{url}/gradio_api/call/cloud", json={"data": [], "session_hash": uuid.uuid4().hex}, headers=headers, timeout=timeout_5): return
        except Exception: return

    async def ping_loop():
        timeout = aiohttp.ClientTimeout(total=5)

        async with aiohttp.ClientSession(timeout=timeout) as session:
            while True:
                await ping_cloud(session)
                await asyncio.sleep(PING_INTERVAL)

    if ping_task is not None or not HF_TOKEN: return
    
    try: loop = asyncio.get_running_loop()
    except RuntimeError: return
    
    ping_task = loop.create_task(ping_loop())

async def inference(data: dict):
    if not HF_TOKEN: raise ValueError("HF_TOKEN missing")

    session_hash = uuid.uuid4().hex

    async with aiohttp.ClientSession(headers=headers) as session:
        async with session.post(f"{url}/gradio_api/call/generate", json={"data": [json.dumps(data)], "session_hash": session_hash}, timeout=timeout_5) as join_response:
            join_status = join_response.status
            join_data = await join_response.json(content_type=None)

        if join_status != 200: raise RuntimeError(join_data)

        event_id = join_data.get("event_id")
        if not event_id: raise RuntimeError("No event_id returned")

        async with session.get(f"{url}/gradio_api/queue/data?session_hash={session_hash}", timeout=timeout_60) as stream_response:
            async for raw_line in stream_response.content:
                line = raw_line.decode("utf-8", errors="ignore").strip()

                if not line.startswith("data:"): continue

                try: message = json.loads(line[5:].strip())
                except Exception: continue

                if message.get("msg") == "process_completed" and message.get("event_id") == event_id:
                    if not message.get("success"): raise RuntimeError(message)
                    output = (((message.get("output") or {}).get("data")) or [None])[0]
                    return output

    raise RuntimeError("Stream ended unexpectedly")
    
async def give_recommendation(input: str, choices: list):
    data = {"input": input, "choices": choices}
    if not isinstance(data, dict): raise ValueError("Data must be a dictionary.")
    data["task"] = "sentence"
    data["normalize"] = False
    return await inference(data)

async def give_classification(input: str, choices: list):
    data = {"input": input, "choices": choices}
    if not isinstance(data, dict): raise ValueError("Data must be a dictionary.")
    data["task"] = "classification"
    data["normalize"] = True
    return await inference(data)

# Initialize
_initialize()

__all__ = ["give_recommendation", "give_classification"]