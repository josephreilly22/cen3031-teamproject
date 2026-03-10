from sentence_transformers import SentenceTransformer, util

model = SentenceTransformer('all-MiniLM-L6-v2')  

# User's interests as a single string
user_profile = "basketball music technology"

# Announcements
announcements = [
    {"title": "Basketball Tryouts Friday 6pm", "id": 1},
    {"title": "Live Jazz Night at the Student Union", "id": 2},
    {"title": "Intro to Python Workshop", "id": 3},
    {"title": "Chess Club Weekly Meeting", "id": 4},
]

# Encode everything
user_vector = model.encode(user_profile)
announcement_vectors = model.encode([a["title"] for a in announcements])

# Score and sort
for i, announcement in enumerate(announcements):
    score = util.cos_sim(user_vector, announcement_vectors[i]).item()
    announcement["score"] = round(score, 4)

sorted_announcements = sorted(announcements, key=lambda x: x["score"], reverse=True)

for a in sorted_announcements:
    print(f"{a['title']:45} : {a['score']:.4f}")
