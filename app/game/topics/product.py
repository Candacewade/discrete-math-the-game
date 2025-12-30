import random
from typing import Dict, List, Optional


def generate_product_problem(
    rng: Optional[random.Random] = None,
    force_scenario: Optional[str] = None,
) -> Dict:
    rng = rng or random.Random()
    scenario = force_scenario or rng.choice(["outfits", "meals", "password"])

    viz = {}

    if scenario == "outfits":
        shirts = rng.randint(2, 5)
        pants = rng.randint(2, 5)
        stages = [shirts, pants]
        prompt = f"You have {shirts} shirts and {pants} pairs of pants. How many different outfits (shirt + pants) can you make?"
        solution_steps = [
            "Pick a shirt, then pick pants (two independent choices).",
            f"Multiply: {shirts} × {pants}.",
        ]
        viz = {"scenario": "outfits", "shirts": shirts, "pants": pants}

    elif scenario == "meals":
        mains = rng.randint(3, 10)
        sides = rng.randint(2, 7)
        drinks = rng.randint(2, 6)
        stages = [mains, sides, drinks]
        prompt = (
            f"A lunch combo has 1 main ({mains} choices), 1 side ({sides} choices), "
            f"and 1 drink ({drinks} choices). How many combos are possible?"
        )
        solution_steps = [
            "Choose one from each category.",
            f"Multiply: {mains} × {sides} × {drinks}.",
        ]

    else:
        letters = rng.randint(2, 4)
        digits = rng.randint(2, 4)
        stages = [26] * letters + [10] * digits
        prompt = (
            f"A code has {letters} letters (26 choices each) followed by {digits} digits (10 choices each). "
            f"How many possible codes are there?"
        )
        solution_steps = [
            "Each position is an independent choice.",
            f"Multiply: 26^{letters} × 10^{digits}.",
        ]

    answer = 1
    for x in stages:
        answer *= x

    hints: List[str] = [
        "Product Principle: if you do Step A AND then Step B, multiply the number of choices.",
        f"Write the multiplication: {' × '.join(map(str, stages))}.",
        "Compute the product.",
    ]

    return {
        "topic": "product_principle",
        "scenario": scenario,
        "prompt": prompt,
        "answer": answer,
        "hints": hints,
        "solution_steps": solution_steps + [f"Final answer: {answer}"],
        "viz": viz,
    }
