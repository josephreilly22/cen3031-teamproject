import asyncio
import modules.recommendation as recommendation

async def main():
    result = await recommendation.give_recommendation({
        "source": "I want to go to a event with basketball, music, and technology.",
        "sentences": ["Basketball Tryouts Friday 6pm", "Live Jazz Night at the Student Union", "Intro to Python Workshop"],
    })

    highest_sentence = result["highest"]["sentence"]
    print(f"Recommendation: {highest_sentence}")

asyncio.run(main())