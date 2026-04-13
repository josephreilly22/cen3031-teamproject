# EventPlanner8

> Your all-in-one platform for events near you.

Whether you're trying to get more involved this year or just looking to try new things, **EventPlanner8** is the solution. Our platform connects users with local events tailored to their interests, powered by personalized recommendations and a secure, verified host ecosystem.

---

## Features

- **Personalized Suggestions:** A machine learning algorithm learns what you like to do and suggests events tailored to your interests.
- **Location-Based Events:** Find events closest to you and discover what's coming up in your area.
- **Security in Mind:** Our host verification process ensures every event is legitimate, protecting the community from fraudulent listings and unverified organizers.

---

## Screenshots

Coming Soon!
<!-- Add screenshots of the app here -->

---

## Tech Stack

### Frontend
This directory contains every feature as part of our front-end for our application.
- [React](https://react.dev/) (v19)
- [React Router](https://reactrouter.com/): client-side routing

### Backend
This directory contains every feature as part of our back-end for our application.
- [Python](https://www.python.org/): server-side logic and API
- [MongoDB](https://www.mongodb.com/): database for users and events
- [Hugging Face](https://huggingface.co/): open-source machine learning models and inference for the recommendation and classification system

### Recommendation/Classification Engine
Both the event recommendation and classification system are powered by Hugging Face models running inside a Hugging Face Space.

The recommendation engine allows sorting feeds by similar title by user preferences or tags.

The classification engine allows automatically moderating innapropriate event content and perform other smart classification operations.

Both engines support batching, allowing efficient processing with multiple inputs in one request.

Libraries used:
- [Hugging Face Transformers](https://huggingface.co/docs/transformers/index): model loading and tokenizer utilities
- [ONNX Runtime](https://onnxruntime.ai/): optimized inference engine for running the model
- [Optimum ONNX](https://huggingface.co/docs/optimum/index): Hugging Face integration for ONNX models
- [NumPy](https://numpy.org/): numerical computation for vector operations
- [Gradio](https://www.gradio.app/): interface used to host the Hugging Face Space API

Model used:
- [keisuke-miyako/all-MiniLM-L6-v2-onnx-fp16](https://huggingface.co/keisuke-miyako/all-MiniLM-L6-v2-onnx-fp16): An optimized version of the MiniLM embedding model used for semantic similarity between event descriptions and user interests
- [MoritzLaurer/ModernBERT-base-zeroshot-v2.0](https://huggingface.co/MoritzLaurer/ModernBERT-base-zeroshot-v2.0): a ModernBERT-based zero-shot classification model designed for fast and efficient classification

Additional information regarding setting up the recommendation engine and classification engine are located in [REFERENCE.md](REFERENCE.md).

---

## Getting Started

### Prerequisites
- Node.js & npm
- Python 3.x
- MongoDB

### Run the Frontend

```bash
cd src/frontend/event_web
npm install
npm start
```

The app will be available at `http://localhost:3000`.

### Run the Backend

```bash
cd src/backend
# setup instructions coming soon
```

Read [REFERENCE.md](REFERENCE.md) if you want to learn how to host your own recommendation/classification engine, otherwise feel free to use our endpoint.

---

## Pages & Routes

| Route | Description |
|-------|-------------|
| `/` | Landing / Home |
| `/login` | User login |
| `/signup` | New user registration |
| `/dashboard` | Main app dashboard |
| `/profile` | User profile |
| `/hostregistration` | Register as an event host |
| `/about` | About the platform |
| `/forgotpassword` | Password reset |

---

## Contributing

This is a student group project for **CEN3031**. Please follow the team's branching and PR conventions when contributing.

Made with passion by the students at the Univeristy of Florida. ✨

---
