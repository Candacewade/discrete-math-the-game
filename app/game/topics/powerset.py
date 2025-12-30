import random
from typing import Dict, List, Optional


SCENARIOS = [
    {
        "title": "Pizza Toppings",
        "items_pool": ["pepperoni", "mushrooms", "olives", "onions", "extra cheese"],
        "prompt_tpl": "A pizza shop offers these toppings: {items}. You can choose ANY combination (including none). How many different topping combinations are possible?"
    },
    {
        "title": "Feature Flags",
        "items_pool": ["dark mode", "notifications", "auto-save", "beta layout", "offline mode"],
        "prompt_tpl": "An app has these feature toggles: {items}. Each can be ON or OFF. How many possible configurations are there?"
    },
    {
        "title": "Study Topics",
        "items_pool": ["graphs", "counting", "proofs", "recursion", "sets"],
        "prompt_tpl": "You’re picking topics to study from: {items}. You can pick ANY subset (including none). How many study-plans are possible?"
    },
]

def generate_powerset_problem(rng: Optional[random.Random] = None) -> Dict:
    rng = rng or random.Random()
    scenario = rng.choice(SCENARIOS)

    n = rng.randint(3, 5)  # keep it sleek
    items: List[str] = rng.sample(scenario["items_pool"], n)

    items_str = ", ".join(items)
    prompt = scenario["prompt_tpl"].format(items=items_str)

    answer = 2 ** n

    hints = [
        "A powerset is the set of ALL subsets (including the empty set).",
        "Each item has 2 choices: in or out.",
        f"Multiply: 2 × 2 × ... (n times) = 2^{n}.",
    ]

    solution_steps = [
        f"There are {n} items.",
        "Each item is either included or not included (2 choices).",
        f"Total subsets = 2^{n} = {answer}.",
    ]

    return {
        "topic": "powersets",
        "prompt": prompt,
        "answer": answer,
        "hints": hints,
        "solution_steps": solution_steps,
        "viz": {
            "n": n,
            "items": items,
            "scenario_title": scenario["title"],
        },
    }
