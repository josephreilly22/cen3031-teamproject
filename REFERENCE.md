# Reference

`nlp.py` was our initial design for the recommendation algorithm. The current deployment is simplified and optimized using ONNX and BF16 on Hugging Face Spaces.

The `reference` directory contains the source code for the Hugging Face API.
- The `huggingface_api` directory contains the full source code hosted on Hugging Face Spaces. The free `ZeroGPU` hardware provides 16 usable cores for sentence similarity and classification inference.

The API can also be hosted on `CPU basic`, which is available to everyone but has only 2 usable cores. In that case, it is recommended to set `CPU_THREADS=2`.

A `HF_TOKEN` in the `Authorization` header may be required if the Hugging Face Space is private.
- If it is private, add `HF_TOKEN` to the `.env` file. The token must start with `hf_`.
- Otherwise, feel free to use the default .env configurations to use our hosted services.

The combined recommendation and classification source code is located in this directory and is hosted under the `EventPlanner8` organization owned by the team.
- Source code: [reference/huggingface_api](reference/huggingface_api)

Hugging Face organization: 
- https://huggingface.co/EventPlanner8

Hugging Face Spaces (private):
- https://huggingface.co/spaces/EventPlanner8/API
