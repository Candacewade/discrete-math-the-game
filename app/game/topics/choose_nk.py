import random
import math
from typing import Dict, List, Optional


def _perm(n: int, k: int) -> int:
    # Python 3.8+ usually has math.perm, but keeping a safe fallback here.
    if hasattr(math, "perm"):
        return math.perm(n, k)
    return math.factorial(n) // math.factorial(n - k)


SCENARIOS = [
    {
        "title": "Basketball Lineup",
        "n_label": "players",
        "k_label": "spots",
        "prompt_combo": "Your basketball team has {n} players. How many ways can you choose {k} players to be on the court at the same time?",
        "prompt_perm": "Your basketball team has {n} players. How many ways can you assign {k} distinct court positions to {k} players (order matters)?",
        "roles": ["PG", "SG", "SF", "PF", "C"],
    },
    {
        "title": "Photo Lineup",
        "n_label": "people",
        "k_label": "positions",
        "prompt_combo": "You have {n} friends. How many ways can you choose {k} friends to be in a group photo (no order)?",
        "prompt_perm": "You have {n} friends. How many ways can you arrange {k} friends in a line for a photo (left-to-right order matters)?",
        "roles": [],  # use 1..k slots
    },
    {
        "title": "Medals",
        "n_label": "finalists",
        "k_label": "medals",
        "prompt_combo": "{n} finalists compete. How many ways can you choose {k} medalists (no order)?",
        "prompt_perm": "{n} finalists compete. How many ways can you award Gold/Silver/Bronze (order matters)?",
        "roles": ["Gold", "Silver", "Bronze"],
    },
]


def generate_choose_nk_problem(rng: Optional[random.Random] = None) -> Dict:
    rng = rng or random.Random()

    scenario = rng.choice(SCENARIOS)

    n = rng.randint(6, 10)

    # Keep k sensible/visual
    k_max = min(5, n)
    k = rng.randint(2, k_max)

    combo_answer = math.comb(n, k)
    perm_answer = _perm(n, k)

    prompt_combo = scenario["prompt_combo"].format(n=n, k=k)
    prompt_perm = scenario["prompt_perm"].format(n=n, k=k)

    hints_combo: List[str] = [
        "Ask: does order matter? Here it does NOT → combinations.",
        "Formula: C(n,k) = n! / (k!(n-k)!)",
        f"Compute C({n},{k}).",
    ]

    hints_perm: List[str] = [
        "Ask: does order matter? Here it DOES → permutations.",
        "Formula: P(n,k) = n × (n-1) × ... × (n-k+1)",
        f"Compute P({n},{k}).",
    ]

    solution_combo = [
        "Order does NOT matter → combinations.",
        f"C({n},{k}) = {combo_answer}",
    ]
    solution_perm = [
        "Order DOES matter → permutations.",
        f"P({n},{k}) = {perm_answer}",
    ]

    roles = scenario.get("roles", [])
    # Use only k roles if present; otherwise empty means numbered slots.
    roles = roles[:k] if roles else []

    return {
        "topic": "choose_nk",
        "scenario_title": scenario["title"],
        "n": n,
        "k": k,
        "prompt_combo": prompt_combo,
        "prompt_perm": prompt_perm,
        "answer_combo": combo_answer,
        "answer_perm": perm_answer,
        "hints_combo": hints_combo,
        "hints_perm": hints_perm,
        "solution_combo": solution_combo,
        "solution_perm": solution_perm,
        "viz": {"n": n, "k": k, "roles": roles, "title": scenario["title"]},
    }
