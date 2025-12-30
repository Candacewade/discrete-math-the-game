
# Discrete Math: The Game

A tiny web app to learn discrete math concepts with interactive visuals and practice problems.

## Run locally
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Features
- 3 progressive levels: Product Principle → Powersets → Combinations
- Animated visualizations (GSAP) synced to each generated problem
- Practice questions with streak-based progression + reset
- HTMX-powered interactions (no full page reloads for practice)

## Tech Stack
- FastAPI + Jinja2 templates
- HTMX for partial-page updates
- GSAP for animations
- Pytest for tests

## Tests
```bash
python -m pytest -q
```

## Feedback
Email: wade.candace1@gmail.com
