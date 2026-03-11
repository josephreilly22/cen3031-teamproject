import asyncio
import json
    
import modules.data as data
import modules.engine as engine

def print_result(input: str, result: dict):
    highest_sentence = result["highest"].get("label")

    print("=== API Result ===")
    print(f"Input: {input}") # The original source text provided by the user
    print(f"Top Choice: {highest_sentence}") # The sentence with the highest similarity score to the source text
    print(f"Inference Time: {result['generation_time']} seconds") # The time taken to compute the recommendation (very fast)
    # print(f"Full JSON Result: {json.dumps(result, indent=2)}")
    print("=============================")

async def example_1(): # Example usage to sort event announcements by tags or brief description
    input = "I am a professional saxophone player who wants to go to an event.", # Example source text
    choices = [ # Example sentences to compare against the source
        "Basketball Tryouts Friday 6pm",
        "Live Jazz Night at the Student Union",
        "Intro to Python Workshop",
        "Tax filing workshop for small business owners"
    ]

    result = await engine.give_recommendation(input, choices)
    print_result(input, result)

async def example_2(): # Example usage to check if an event is appropriate or not based on the title
    input = "Hosted Event: We are hosting a hazing event this Friday night!"
    choices = ["safe university event, sport, or promotion", "hazing, harassment, or harm", "drinking, alcohol, or drug activity", "violent threat or assault", "weapon possession or weapon use", "adult sexual content", "spam or scam"]
    result = await engine.give_classification(input, choices)
    print_result(input, result)

asyncio.run(example_1())
asyncio.run(example_2())