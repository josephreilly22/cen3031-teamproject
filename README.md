# Event Planners

> Your all-in-one platform for events near you.

Whether you're trying to get more involved this year or just looking to try new things, **Event Planners** is the solution. Our platform connects users with local events tailored to their interests, powered by personalized recommendations and a secure, verified host ecosystem.

---

## Features

- **Personalized Suggestions** — A machine learning algorithm learns what you like to do and suggests events tailored to your interests.
- **Location-Based Events** — Find events closest to you and discover what's coming up in your area.
- **Security in Mind** — Our host verification process ensures every event is legitimate, protecting the community from fraudulent listings and unverified organizers.

---

## Screenshots

Coming Soon!
<!-- Add screenshots of the app here -->

---

## Tech Stack

### Frontend
This directory contains every feature as part of our front-end for our application.
- [React](https://react.dev/) (v19)
- [React Router](https://reactrouter.com/) — client-side routing

### Backend
This directory contains every feature as part of our back-end for our application.
- [Python](https://www.python.org/) — server-side logic and API
- [MongoDB](https://www.mongodb.com/) — database for users and events
- [Hugging Face](https://huggingface.co/) — open-source machine learning models and inference for the recommendation system

### Recommendation Engine
The event recommendation system is powered by Hugging Face models running inside a Hugging Face Space.

Libraries used:
- [Hugging Face Transformers](https://huggingface.co/docs/transformers/index)
- [ONNX Runtime](https://onnxruntime.ai/)
- [Optimum ONNX](https://huggingface.co/docs/optimum/index)
- [NumPy](https://numpy.org/)
- [Gradio](https://www.gradio.app/)

Model used:
- [keisuke-miyako/all-MiniLM-L6-v2-onnx-fp16](https://huggingface.co/keisuke-miyako/all-MiniLM-L6-v2-onnx-fp16)

This model converts text into semantic embeddings so the system can compare event descriptions with user interests.

Similarity scoring is performed using cosine similarity via the dot product of normalized vectors.

The Hugging Face API source code is located in [reference/huggingface_api](reference/huggingface_api).

Additional information regarding setting up the recommendation engine is located in [REFERENCE.md](REFERENCE.md).

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

This is a university group project for **CEN3031**. Please follow the team's branching and PR conventions when contributing.

---
