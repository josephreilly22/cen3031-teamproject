# Reference

The nlp.py was our initial design for our recommendation algorithm, now simplified and optimized using ONNX and BF16 hosted on Hugging Face Spaces.

The reference directory contains two Hugging Face-related directories.
- The "huggingface_sentence_api" directory contains the full source code that is hosted on a free "ZeroGPU" Hugging Face Spaces hardware, which provides 16 usable cores for optimal inference on determining sentence similarity.
- The "huggingface_zeroshot_api" directory contains the full source code that is hosted on a free "CPU basic" Hugging Face Spaces hardware, which provides 2 usable cores for optimal inference on classifying input.

Both sources can be hosted on the "CPU basic", which is avaliable to everyone but has only 2 usable cores (it is recommended to set CPU_THREADS to 2).

A "HF_TOKEN" into the header "Authorization" may be required if the Hugging Face Spaces is private.
- If it is private, make sure to add a "HF_TOKEN" into the .env file.
- Otherwise, use the free "HF_TOKEN" here for demo purposes (this is reversed so make sure to unreverse it): YckEWMGAbmSQKFQAvEyQSceXzUriVdMiLF_fh

Both algorithm source codes are located in these directories, both hosted under the EventPlanner8 organization owned by our team.
- Recommendation algorithm source code: [reference/huggingface_sentence_api](reference/huggingface_sentence_api)
- Classification algorithm source code: [reference/huggingface_zeroshot_api](reference/huggingface_zeroshot_api)

Hugging Face organization: 
- https://huggingface.co/EventPlanner8

Hugging Face Spaces:
- https://huggingface.co/spaces/EventPlanner8/API
- https://huggingface.co/spaces/EventPlanner8/API2