import asyncio
import json

import modules.data as data
import modules.classification as classification
import modules.recommendation as recommendation

def print_result(data: dict, result: dict):
    highest_sentence = result["highest"].get("sentence") or result["highest"].get("label")

    print("=== API Result ===")
    print(f"Input: {data.get('source') or data.get('input')}") # The original source text provided by the user
    print(f"Top Choice: {highest_sentence}") # The sentence with the highest similarity score to the source text
    print(f"Inference Time: {result['generation_time']} seconds") # The time taken to compute the recommendation (very fast)
    # print(f"Full JSON Result: {json.dumps(result, indent=2)}")
    print("=============================")

async def example_1(): # Example usage to sort event announcements by tags or brief description
    data = {
        "source": "I am a: professional saxophone player who wants to go to an event.", # Example source text
        "sentences": [ # Example sentences to compare against the source
            "Basketball Tryouts Friday 6pm",
            "Live Jazz Night at the Student Union",
            "Intro to Python Workshop",
            "Tax filing workshop for small business owners"
        ],
        "normalize": True # Whether to normalize the text before computing similarity, with default being False; normalizing will use similarity score range between 0 and 1, while not normalizing will use similarity score range between -1 and 1
    }

    result = await recommendation.give_recommendation(data)
    print_result(data, result)

async def example_2(): # Example usage to check if an event is appropriate or not based on the title
    data = {
        "input": "Hosted Event: Hosting a hazing club this weekend night!",
        "choices": ["This event follows university policies and is appropriate.", "This event violates university policies and is inappropriate."],
        "normalize": True
    }

    result = await classification.give_classification(data)
    print_result(data, result)

asyncio.run(example_1())
asyncio.run(example_2())