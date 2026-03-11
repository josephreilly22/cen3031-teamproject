# Reference

The nlp.py was our initial design for our recommendation algorithm, now simplified and optimized using ONNX and BF16 hosted on Hugging Face Spaces.

The reference directory contains the directory containing the source code for the Hugging Face API.
- The "huggingface_api" directory contains the full source code that is hosted on a free "ZeroGPU" Hugging Face Spaces hardware, which provides 16 usable cores for optimal inference on determining sentence similarity as well as classifying input.

The API itself can be hosted on the "CPU basic", which is avaliable to everyone but has only 2 usable cores (it is recommended to set CPU_THREADS to 2).

A "HF_TOKEN" into the header "Authorization" may be required if the Hugging Face Spaces is private.
- If it is private, make sure to add a "HF_TOKEN" into the .env file (must start with hf_).
- Otherwise, feel free to use the default .env configurations to use our hosted services.

The two-in-one algorithm source code is located in this directory, which is hosted under the EventPlanner8 organization owned by our team.
- Source code: [reference/huggingface_api](reference/huggingface_api)

Hugging Face organization: 
- https://huggingface.co/EventPlanner8

Hugging Face Spaces:
- https://huggingface.co/spaces/EventPlanner8/API