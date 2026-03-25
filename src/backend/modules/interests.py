# Imports
from modules.engine import give_recommendation

# Variables

# Functions
async def rank_announcements(user_tags: list, announcements: list):
    if not isinstance(user_tags, list): raise ValueError("user_tags must be a list")
    if not isinstance(announcements, list) or not announcements: raise ValueError("announcements must be a non-empty list")

    cleaned_tags = [str(tag).strip() for tag in user_tags if str(tag).strip()]

    if not cleaned_tags:
        fallback_scores = [{"label": announcement, "score": 0} for announcement in announcements]
        return {"task": "fallback", "input": [], "output": fallback_scores, "highest": fallback_scores[0] if fallback_scores else None, "lowest": fallback_scores[-1] if fallback_scores else None, "generation_time": 0, "fallback": "date"}

    return await give_recommendation(", ".join(cleaned_tags), announcements)

# Initialize
__all__ = ["rank_announcements"]