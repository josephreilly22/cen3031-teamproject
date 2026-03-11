import asyncio
import json
    
import modules.data as data
import modules.engine as engine

def print_result(input: str, result: dict):
    highest = result.get("highest")
    highest_label = ""

    if isinstance(highest, list): highest_label = [str(item.get("label", "")) for item in highest if isinstance(item, dict)]
    elif isinstance(highest, dict): highest_label = str(highest.get("label", ""))
    else: highest_label = str(highest or "")

    print("=== API Result ===")
    print(f"Input: {input}") # The original source text provided by the user
    print(f"Top Choice: {highest_label}") # The sentence with the highest similarity score to the source text
    print(f"Inference Time: {result['generation_time']} seconds") # The time taken to compute the recommendation (very fast)
    # print(f"Full JSON Result: {json.dumps(result, indent=2)}")
    print("=============================")

async def example_1(): # Example usage to sort event announcements by tags or brief description
    # Example source text (accepts a string or a list of strings for batching)
    input = ["I am a professional saxophone player who wants to go to an event.", "I am interested in attending a software engineering workshop."]
    
    # Example sentences to compare against the source
    choices = [
        "Basketball Tryouts Friday 6pm",
        "Live Jazz Night at the Student Union",
        "Intro to Python Workshop",
        "Tax filing workshop for small business owners"
    ]

    result = await engine.give_recommendation(input, choices)
    print_result(input, result)

async def example_2(): # Example usage to check if an event is appropriate or not based on the title
    input = ["Hosted Event: We are hosting a hazing event this Friday night!", "Join us for a fun and safe university sports event this weekend!"] # Example event titles
    choices = ["safe university event, sport, or promotion", "hazing, harassment, or harm", "drinking, alcohol, or drug activity", "violent threat or assault", "weapon possession or weapon use", "adult sexual content", "spam or scam"]
    result = await engine.give_classification(input, choices)
    print_result(input, result)

async def main(): await asyncio.gather(example_1(), example_1(), example_1(), example_2())

asyncio.run(main())