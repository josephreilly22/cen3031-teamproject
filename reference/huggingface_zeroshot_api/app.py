# Imports
import os

CPU_THREADS = 2

os.environ["OMP_NUM_THREADS"] = str(CPU_THREADS)
os.environ["MKL_NUM_THREADS"] = str(CPU_THREADS)
os.environ["OPENBLAS_NUM_THREADS"] = str(CPU_THREADS)
os.environ["VECLIB_MAXIMUM_THREADS"] = str(CPU_THREADS)
os.environ["NUMEXPR_NUM_THREADS"] = str(CPU_THREADS)
os.environ["TOKENIZERS_PARALLELISM"] = "false"

CACHE_ROOT = "/home/user/.cache"
HF_HOME = os.path.join(CACHE_ROOT, "huggingface")
ONNX_DIR = os.path.join(CACHE_ROOT, "onnx", "model")

os.environ["HF_HOME"] = HF_HOME

os.makedirs(HF_HOME, exist_ok=True)
os.makedirs(ONNX_DIR, exist_ok=True)

import json
import time
import uuid
import spaces
import gradio as gr
import onnxruntime as ort

from transformers import AutoTokenizer, pipeline
from optimum.onnxruntime import ORTModelForSequenceClassification

# Variables
MODEL_REPO = "MoritzLaurer/ModernBERT-base-zeroshot-v2.0"

session_options = ort.SessionOptions()
session_options.intra_op_num_threads = CPU_THREADS
session_options.inter_op_num_threads = 1
session_options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
session_options.enable_cpu_mem_arena = True
session_options.enable_mem_pattern = True

tokenizer = AutoTokenizer.from_pretrained(MODEL_REPO)
model = ORTModelForSequenceClassification.from_pretrained(MODEL_REPO, provider="CPUExecutionProvider", session_options=session_options)

tokenizer.save_pretrained(ONNX_DIR)
model.save_pretrained(ONNX_DIR)

tokenizer = AutoTokenizer.from_pretrained(ONNX_DIR)
model = ORTModelForSequenceClassification.from_pretrained(ONNX_DIR, provider="CPUExecutionProvider", session_options=session_options)
classifier_model = pipeline("zero-shot-classification", model=model, tokenizer=tokenizer, device=-1)

# Functions
def warmup():
    try:
        classifier_model("Red and blue together usually make purple.", candidate_labels=["purple", "green", "orange"], multi_label=False)
        print("[SYSTEM] | Warmup completed.", flush=True)
    except Exception as error:
        print(f"[SYSTEM] | Warmup failed: {error}", flush=True)

def generate(input_json: str):
    task_id = uuid.uuid4().hex

    try: input_data = json.loads(input_json or "{}")
    except Exception: return {"error": "Invalid JSON."}

    input_text = str(input_data.get("input", "") or "").strip()
    choices = input_data.get("choices", [])
    normalize = bool(input_data.get("normalize", True))

    if not isinstance(choices, list): choices = []
    choices = [str(value).strip() for value in choices if str(value).strip()]

    input_data_print = {"input": input_text, "choices": choices, "normalize": normalize}
    print(f"[GENERATE] | Generating output...\n──────────\nInput: {input_data_print}\n──────────", flush=True)

    if not input_text: return {"error": "Missing input."}
    if not choices: return {"error": "Missing choices in array data type."}

    started = time.time()

    result = classifier_model(input_text, candidate_labels=choices, multi_label=(not normalize))

    labels = result.get("labels", [])
    scores = result.get("scores", [])
    output = [{"label": labels[index], "score": float(scores[index])} for index in range(min(len(labels), len(scores)))]

    generation_time = max(time.time() - started, 1e-6)
    output_data = {
        "id": task_id,
        "output": output,
        "highest": max(output, key=lambda value: value["score"]) if output else None,
        "lowest": min(output, key=lambda value: value["score"]) if output else None,
        "generation_time": generation_time
    }

    print(f"[GENERATE] | Generation completed for '{task_id}' task in {generation_time} seconds.\n──────────\nInput: {input_data_print}\n──────────\nOutput: {output_data}\n──────────", flush=True)

    return output_data

@spaces.GPU(size="large", duration=1)
def cloud():
    print(f"[CLOUD] | Cloud called.", flush=True)
    return

# Initialize
warmup()

with gr.Blocks() as demo:
    input_box = gr.Textbox(
        label="Input",
        lines=16,
        value=json.dumps(
            {
                "input": "What color does red and blue make?",
                "choices": ["purple", "violet", "orange", "green", "yellow"],
                "normalize": True
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