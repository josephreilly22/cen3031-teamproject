# Imports
import os

CPU_THREADS = 16

os.environ["OMP_NUM_THREADS"] = str(CPU_THREADS)
os.environ["MKL_NUM_THREADS"] = str(CPU_THREADS)
os.environ["OPENBLAS_NUM_THREADS"] = str(CPU_THREADS)
os.environ["VECLIB_MAXIMUM_THREADS"] = str(CPU_THREADS)
os.environ["NUMEXPR_NUM_THREADS"] = str(CPU_THREADS)
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["HF_HOME"] = "/home/user/.cache/huggingface"

import json
import time
import uuid
import spaces
import numpy as np
import gradio as gr
import onnxruntime as ort

from transformers import AutoTokenizer
from optimum.onnxruntime import ORTModelForFeatureExtraction

# Variables
MODEL_REPO = "keisuke-miyako/all-MiniLM-L6-v2-onnx-fp16"

session_options = ort.SessionOptions()
session_options.intra_op_num_threads = CPU_THREADS
session_options.inter_op_num_threads = 1
session_options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
session_options.enable_cpu_mem_arena = True
session_options.enable_mem_pattern = True

tokenizer = AutoTokenizer.from_pretrained(MODEL_REPO)
model = ORTModelForFeatureExtraction.from_pretrained(MODEL_REPO, provider="CPUExecutionProvider", session_options=session_options)

# Functions
def mean_pool(last_hidden_state, attention_mask):
    mask = attention_mask[..., None].astype(np.float32)
    hidden = last_hidden_state * mask
    pooled = hidden.sum(axis = 1) / np.clip(mask.sum(axis = 1), 1e-9, None)
    return pooled

def normalize(x): return x / np.clip(np.linalg.norm(x, axis=1, keepdims=True), 1e-12, None)

def encode_texts(texts):
    prepared = [str(text).strip() for text in texts if str(text).strip()]

    if not prepared: return np.empty((0, 384), dtype=np.float32)
    
    batch = tokenizer(prepared, padding=True, truncation=True, max_length=256, return_tensors="np")
    
    outputs = model(**batch)
    embeddings = mean_pool(outputs.last_hidden_state, batch["attention_mask"])
    return normalize(embeddings).astype(np.float32)

def warmup():
    try:
        encode_texts(["University of Florida campus announcements"])
        encode_texts(["UF engineering workshop and student events"])
        print("[SYSTEM] | Warmup completed.", flush=True)
    except Exception as error:
        print(f"[SYSTEM] | Warmup failed: {error}", flush=True)

def generate(input_json: str):
    task_id = uuid.uuid4().hex

    try: input_data = json.loads(input_json or "{}")
    except Exception: return {"error": "Invalid JSON."}

    source = str(input_data.get("source", "") or "").strip()
    sentences = input_data.get("sentences", [])
    if not isinstance(sentences, list): sentences = []
    sentences = [str(value).strip() for value in sentences if str(value).strip()]

    normalize_scores = bool(input_data.get("normalize", True))
    
    print(f"[GENERATE] | Generating output...\n──────────\nInput: {input_data}\n──────────", flush=True)

    if not source: return {"error": "Missing source."}
    if not sentences: return {"error": "Missing sentences in array data type."}

    started = time.time()

    all_texts = [source] + sentences
    embeddings = encode_texts(all_texts)
    source_embedding = embeddings[0]
    sentence_embeddings = embeddings[1:]

    scores = np.matmul(sentence_embeddings, source_embedding)
    scores = (np.exp(scores) / np.sum(np.exp(scores))).tolist() if normalize_scores else scores.tolist()

    output = [{"sentence": sentences[index], "score": float(scores[index])} for index in range(len(sentences))]
    output.sort(key=lambda value: value["score"], reverse=True)

    generation_time = max(time.time() - started, 1e-6)
    output_data = {"id": task_id, "output": output, "highest": output[0] if output else None, "lowest": output[-1] if output else None, "generation_time": generation_time}

    print(f"[GENERATE] | Generation completed for '{task_id}' task in {generation_time} seconds.\n──────────\nInput: {input_data}\n──────────\nOutput: {output_data}\n──────────", flush=True)
    
    return output_data

@spaces.GPU(size="large", duration=1)
def cloud():
    print(f"[CLOUD] | Cloud called.", flush=True)
    return

# Initialize
warmup()

with gr.Blocks() as demo:
    input_box=gr.Textbox(
        label="Input",
        lines=16,
        value=json.dumps(
            {
                "source": "University of Florida student life, engineering, research, and campus events",
                "sentences": [
                    "UF College of Engineering hosts an artificial intelligence workshop this Friday",
                    "Gators football student ticket lottery opens for the next home game",
                    "University of Florida research symposium now accepting undergraduate posters",
                    "Local apartment complex offers discounted parking for summer residents",
                    "Marston Science Library announces extended exam week study hours"
                ],
                "normalize": True,
            },
            indent=4
        )
    )

    with gr.Row():
        generate_btn = gr.Button("Generate")
        cloud_btn = gr.Button("Cloud")

    output_box = gr.JSON(label="Output")

    generate_btn.click(generate, inputs=[input_box], outputs=[output_box], api_name="generate")
    cloud_btn.click(cloud, inputs=[], outputs=[], api_name="cloud")

demo.launch(ssr_mode = False)