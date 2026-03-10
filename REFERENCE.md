# Reference Directory

The nlp.py was our initial design for our recommendation algorithm, now simplified and optimized using ONNX and BF16 hosted on Hugging Face Spaces.

The reference directory contains the "huggingface_api" directory, which contains the full source code that is hosted on a free "ZeroGPU" Hugging Face Spaces hardware, which provides 16 usable cores for optimal inference.

However, this can be hosted on the "CPU basic", which is avaliable to everyone but has only 2 usable cores (it is recommended to set CPU_THREADS to 2).

Then pass a "HF_TOKEN" into the header "Authorization" if the Hugging Face Spaces is private.

Make sure to add a "HF_TOKEN" into the .env file, otherwise use the free "HF_TOKEN" here for demo purposes (this is reversed so make sure to unreverse it):
- YckEWMGAbmSQKFQAvEyQSceXzUriVdMiLF_fh

Hugging Face organization: 
- https://huggingface.co/EventPlanner8

Hugging Face Spaces:
- https://huggingface.co/spaces/EventPlanner8/API