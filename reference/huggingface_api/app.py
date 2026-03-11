# Imports
import os

CPU_THREADS = 16
SENTENCE_CPU_THREADS = 8
CLASSIFICATION_CPU_THREADS = 8

os.environ["OMP_NUM_THREADS"] = str(CPU_THREADS)
os.environ["MKL_NUM_THREADS"] = str(CPU_THREADS)
os.environ["OPENBLAS_NUM_THREADS"] = str(CPU_THREADS)
os.environ["VECLIB_MAXIMUM_THREADS"] = str(CPU_THREADS)
os.environ["NUMEXPR_NUM_THREADS"] = str(CPU_THREADS)
os.environ["TOKENIZERS_PARALLELISM"] = "false"

CACHE_ROOT = "/home/user/.cache"
HF_HOME = os.path.join(CACHE_ROOT, "huggingface")
CLASSIFICATION_DIR = os.path.join(CACHE_ROOT, "onnx", "classification")
SENTENCE_DIR = os.path.join(CACHE_ROOT, "onnx", "sentence")

os.environ["HF_HOME"] = HF_HOME

os.makedirs(HF_HOME, exist_ok=True)
os.makedirs(CLASSIFICATION_DIR, exist_ok=True)
os.makedirs(SENTENCE_DIR, exist_ok=True)

import json
import time
import uuid
import spaces
import numpy as np
import gradio as gr
import onnxruntime as ort

from transformers import AutoTokenizer, pipeline
from optimum.onnxruntime import ORTModelForFeatureExtraction, ORTModelForSequenceClassification

# Variables
CLASSIFICATION_MODEL_REPO = "MoritzLaurer/ModernBERT-base-zeroshot-v2.0"
SENTENCE_MODEL_REPO = "keisuke-miyako/all-MiniLM-L6-v2-onnx-fp16"

classification_session_options = ort.SessionOptions()
classification_session_options.intra_op_num_threads = CLASSIFICATION_CPU_THREADS
classification_session_options.inter_op_num_threads = 1
classification_session_options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
classification_session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
classification_session_options.enable_cpu_mem_arena = True
classification_session_options.enable_mem_pattern = True

sentence_session_options = ort.SessionOptions()
sentence_session_options.intra_op_num_threads = SENTENCE_CPU_THREADS
sentence_session_options.inter_op_num_threads = 1
sentence_session_options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
sentence_session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
sentence_session_options.enable_cpu_mem_arena = True
sentence_session_options.enable_mem_pattern = True

classification_tokenizer = AutoTokenizer.from_pretrained(CLASSIFICATION_MODEL_REPO)
classification_model = ORTModelForSequenceClassification.from_pretrained(CLASSIFICATION_MODEL_REPO, provider="CPUExecutionProvider", session_options=classification_session_options)

classification_tokenizer.save_pretrained(CLASSIFICATION_DIR)
classification_model.save_pretrained(CLASSIFICATION_DIR)

classification_tokenizer = AutoTokenizer.from_pretrained(CLASSIFICATION_DIR)
classification_model = ORTModelForSequenceClassification.from_pretrained(CLASSIFICATION_DIR, provider="CPUExecutionProvider", session_options=classification_session_options)
classifier_model = pipeline("zero-shot-classification", model=classification_model, tokenizer=classification_tokenizer, device=-1)

sentence_tokenizer = AutoTokenizer.from_pretrained(SENTENCE_MODEL_REPO)
sentence_model = ORTModelForFeatureExtraction.from_pretrained(SENTENCE_MODEL_REPO, provider="CPUExecutionProvider", session_options=sentence_session_options)

sentence_tokenizer.save_pretrained(SENTENCE_DIR)
sentence_model.save_pretrained(SENTENCE_DIR)

sentence_tokenizer = AutoTokenizer.from_pretrained(SENTENCE_DIR)
sentence_model = ORTModelForFeatureExtraction.from_pretrained(SENTENCE_DIR, provider="CPUExecutionProvider", session_options=sentence_session_options)

# Functions
def mean_pool(last_hidden_state, attention_mask):
    mask = attention_mask[..., None].astype(np.float32)
    hidden = last_hidden_state * mask
    pooled = hidden.sum(axis = 1) / np.clip(mask.sum(axis = 1), 1e-9, None)
    return pooled

def normalize_embeddings(x): return x / np.clip(np.linalg.norm(x, axis=1, keepdims=True), 1e-12, None)

def encode_texts(texts):
    prepared = [str(text).strip() for text in texts if str(text).strip()]

    if not prepared: return np.empty((0, 384), dtype=np.float32)

    batch = sentence_tokenizer(prepared, padding=True, truncation=True, max_length=256, return_tensors="np")
    outputs = sentence_model(**batch)
    embeddings = mean_pool(outputs.last_hidden_state, batch["attention_mask"])

    return normalize_embeddings(embeddings).astype(np.float32)

def generate_classification(input_text: str | list[str], choices: list[str], normalize: bool):
    result = classifier_model(input_text, candidate_labels=choices, multi_label=(not normalize))

    if isinstance(input_text, list):
        batch_output = []

        for item in result:
            labels = item.get("labels", [])
            scores = item.get("scores", [])
            output = [{"label": labels[index], "score": float(scores[index])} for index in range(min(len(labels), len(scores)))]
            batch_output.append(output)

        return batch_output

    labels = result.get("labels", [])
    scores = result.get("scores", [])
    output = [{"label": labels[index], "score": float(scores[index])} for index in range(min(len(labels), len(scores)))]

    return output

def generate_sentence(input_text: str | list[str], choices: list[str], normalize: bool):
    if isinstance(input_text, list):
        prepared_inputs = [str(value).strip() for value in input_text if str(value).strip()]

        if not prepared_inputs: return []

        all_texts = prepared_inputs + choices
        embeddings = encode_texts(all_texts)

        input_embeddings = embeddings[:len(prepared_inputs)]
        choice_embeddings = embeddings[len(prepared_inputs):]

        batch_output = []

        for input_embedding in input_embeddings:
            scores = np.matmul(choice_embeddings, input_embedding)
            scores = (np.exp(scores) / np.sum(np.exp(scores))).tolist() if normalize else scores.tolist()

            output = [{"label": choices[index], "score": float(scores[index])} for index in range(len(choices))]
            output.sort(key=lambda value: value["score"], reverse=True)
            batch_output.append(output)

        return batch_output

    all_texts = [input_text] + choices
    embeddings = encode_texts(all_texts)

    input_embedding = embeddings[0]
    choice_embeddings = embeddings[1:]

    scores = np.matmul(choice_embeddings, input_embedding)
    scores = (np.exp(scores) / np.sum(np.exp(scores))).tolist() if normalize else scores.tolist()

    output = [{"label": choices[index], "score": float(scores[index])} for index in range(len(choices))]
    output.sort(key=lambda value: value["score"], reverse=True)

    return output

def warmup():
    try:
        classifier_model("University of Florida hosts an engineering and research event for students on campus.", candidate_labels=["engineering", "research", "sports"], multi_label=False)
        encode_texts(["University of Florida campus announcements", "UF engineering workshop and student events"])
        print("[SYSTEM] | Warmup completed.", flush=True)
    except Exception as error:
        print(f"[SYSTEM] | Warmup failed: {error}", flush=True)

def generate(input_json: str):
    task_id = uuid.uuid4().hex

    try: input_data = json.loads(input_json or "{}")
    except Exception: return {"error": "Invalid JSON."}

    task = str(input_data.get("task", "classification") or "classification").strip().lower()
    
    raw_input = input_data.get("input", "")
    if isinstance(raw_input, list): input_text = [str(value).strip() for value in raw_input if str(value).strip()]
    else: input_text = str(raw_input or "").strip()

    choices = input_data.get("choices", [])
    if not isinstance(choices, list): choices = []
    choices = [str(value).strip() for value in choices if str(value).strip()]

    normalize = bool(input_data.get("normalize", True))

    print(f"[GENERATE] | Generating output...\n──────────\nInput: {input_data}\n──────────", flush=True)

    if task not in ["sentence", "classification"]: return {"error": "Invalid task. Use 'sentence' or 'classification'."}
    if isinstance(input_text, list) and not input_text: return {"error": "Missing input."}
    if isinstance(input_text, str) and not input_text: return {"error": "Missing input."}
    if not choices: return {"error": "Missing choices in array data type."}

    started = time.time()

    if task == "sentence": output = generate_sentence(input_text, choices, normalize)
    elif task == "classification": output = generate_classification(input_text, choices, normalize)

    if isinstance(output, list) and output and isinstance(output[0], list):
        highest = [item[0] if item else None for item in output]
        lowest = [item[-1] if item else None for item in output]
    else:
        highest = output[0] if output else None
        lowest = output[-1] if output else None

    generation_time = max(time.time() - started, 1e-6)
    output_data = {"id": task_id, "task": task, "output": output, "highest": highest, "lowest": lowest, "generation_time": generation_time}
    print(f"[GENERATE] | Generation completed for '{task_id}' task in {generation_time} seconds.\n──────────\nInput: {input_data}\n──────────\nOutput: {output_data}\n──────────", flush=True)

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
        value=json.dumps(
            {
                "task": "sentence",
                "input": "University of Florida student life, engineering, research, and campus events",
                "choices": [
                    "UF College of Engineering hosts an artificial intelligence workshop this Friday",
                    "Gators football student ticket lottery opens for the next home game",
                    "University of Florida research symposium now accepting undergraduate posters",
                    "Local apartment complex offers discounted parking for summer residents",
                    "Marston Science Library announces extended exam week study hours"
                ],
                "normalize": True
            },
            indent=4
        )
    )

    with gr.Row():
        generate_btn = gr.Button("Generate")
        cloud_btn = gr.Button("Cloud")

    output_box = gr.JSON(label="Output")

    generate_btn.click(generate, inputs=[input_box], outputs=[output_box], api_name="generate", concurrency_limit=2, queue=True)
    cloud_btn.click(cloud, inputs=[], outputs=[], api_name="cloud")

demo.launch(ssr_mode = False)