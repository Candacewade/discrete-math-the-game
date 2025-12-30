from fastapi import APIRouter, Request, Form
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from starlette.responses import RedirectResponse

from .game.models import parse_int
from .game.topics.product import generate_product_problem
from .game.topics.powerset import generate_powerset_problem
from .game.topics.choose_nk import generate_choose_nk_problem

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

LEVEL_STREAK_TARGET = 3  # "win condition" for Product


def _get_progress(session: dict) -> dict:
    p = session.get("progress")
    if not isinstance(p, dict):
        p = {"product_complete": False, "powerset_complete": False, "choose_complete": False}
    p.setdefault("product_complete", False)
    p.setdefault("powerset_complete", False)
    p.setdefault("choose_complete", False)
    return p


def _set_progress(session: dict, **kwargs) -> dict:
    p = _get_progress(session)
    p.update(kwargs)
    session["progress"] = p
    return p


def _get_product_stats(session: dict) -> dict:
    s = session.get("product_stats")
    if not isinstance(s, dict):
        s = {"attempts": 0, "correct": 0, "streak": 0, "best_streak": 0}
    for k in ["attempts", "correct", "streak", "best_streak"]:
        s.setdefault(k, 0)
    return s


def _new_nonrepeating(session: dict, last_sig_key: str, gen_fn, sig_fn, max_tries: int = 12):
    last = session.get(last_sig_key)
    picked = None
    for _ in range(max_tries):
        p = gen_fn()
        sig = sig_fn(p)
        picked = (p, sig)
        if sig != last:
            session[last_sig_key] = sig
            return p
    # fallback (if randomness is tiny)
    if picked:
        session[last_sig_key] = picked[1]
        return picked[0]
    return gen_fn()


@router.get("/", response_class=HTMLResponse)
def home(request: Request):
    progress = _get_progress(request.session)

    total_levels = 3
    completed_levels = sum(
        1 for key in ["product_complete", "powerset_complete", "choose_complete"]
        if progress.get(key)
    )

    if not progress["product_complete"]:
        continue_url = "/lesson/product"
    elif not progress["powerset_complete"]:
        continue_url = "/lesson/powerset"
    elif not progress["choose_complete"]:
        continue_url = "/lesson/choose"
    else:
        continue_url = "/win"

    ctx = {
        "progress": progress,
        "continue_url": continue_url,
        "total_levels": total_levels,
        "completed_levels": completed_levels,
    }
    return templates.TemplateResponse(request, "home.html", ctx)


@router.get("/levels", response_class=HTMLResponse)
def levels(request: Request):
    progress = _get_progress(request.session)
    ctx = {"progress": progress}
    return templates.TemplateResponse(request, "levels.html", ctx)


@router.get("/lesson/product", response_class=HTMLResponse)
def lesson_product(request: Request):
    problem = request.session.get("product_problem")
    hint_index = int(request.session.get("product_hint_index", 0))
    stats = _get_product_stats(request.session)
    level_complete = stats["streak"] >= LEVEL_STREAK_TARGET

    ctx = {
        "problem": problem,
        "hint_index": hint_index,
        "stats": stats,
        "level_complete": level_complete,
        "level_target": LEVEL_STREAK_TARGET,
    }
    return templates.TemplateResponse(request, "lesson_product.html", ctx)


@router.post("/lesson/product/new", response_class=HTMLResponse)
def product_new(request: Request):
    def gen():
        return generate_product_problem(force_scenario="outfits")

    def sig(p):
        v = p.get("viz") or {}
        return f"outfits|{v.get('shirts')}|{v.get('pants')}|{p.get('prompt','')}"

    problem = _new_nonrepeating(request.session, "product_last_sig", gen, sig)

    request.session["product_problem"] = problem
    request.session["product_hint_index"] = 0

    ctx = {"problem": problem, "hint_index": 0}
    return templates.TemplateResponse(request, "partials/problem_block.html", ctx)


@router.post("/lesson/product/hint", response_class=HTMLResponse)
def product_hint(request: Request):
    problem = request.session.get("product_problem")
    if not problem:
        return HTMLResponse("No problem yet. Click “New problem.”", status_code=400)

    hint_index = int(request.session.get("product_hint_index", 0))
    hint_index = min(hint_index + 1, len(problem.get("hints", [])))
    request.session["product_hint_index"] = hint_index

    ctx = {"problem": problem, "hint_index": hint_index}
    return templates.TemplateResponse(request, "partials/hint.html", ctx)


@router.post("/lesson/product/answer", response_class=HTMLResponse)
def product_answer(request: Request, answer: str = Form(...)):
    problem = request.session.get("product_problem")
    if not problem:
        return HTMLResponse("No problem yet. Click “New problem.”", status_code=400)

    user_val = parse_int(answer)
    correct = (user_val is not None) and (user_val == problem["answer"])

    stats = _get_product_stats(request.session)
    stats["attempts"] += 1
    if correct:
        stats["correct"] += 1
        stats["streak"] += 1
        stats["best_streak"] = max(stats["best_streak"], stats["streak"])
    else:
        stats["streak"] = 0

    request.session["product_stats"] = stats
    level_complete = stats["streak"] >= LEVEL_STREAK_TARGET

    if level_complete:
        _set_progress(request.session, product_complete=True)

    ctx = {
        "correct": correct,
        "expected": problem["answer"],
        "stats": stats,
        "level_complete": level_complete,
        "level_target": LEVEL_STREAK_TARGET,
    }
    return templates.TemplateResponse(request, "partials/answer_response.html", ctx)


@router.post("/lesson/product/reset", response_class=HTMLResponse)
def product_reset(request: Request):
    request.session["product_stats"] = {"attempts": 0, "correct": 0, "streak": 0, "best_streak": 0}
    request.session.pop("product_problem", None)
    request.session["product_hint_index"] = 0
    _set_progress(request.session, product_complete=False)

    ctx = {
        "stats": request.session["product_stats"],
        "level_complete": False,
        "level_target": LEVEL_STREAK_TARGET,
    }
    return templates.TemplateResponse(request, "partials/reset_response.html", ctx)


POWERSET_STREAK_TARGET = 3


def _get_powerset_stats(session: dict) -> dict:
    s = session.get("powerset_stats")
    if not isinstance(s, dict):
        s = {"attempts": 0, "correct": 0, "streak": 0, "best_streak": 0}
    for k in ["attempts", "correct", "streak", "best_streak"]:
        s.setdefault(k, 0)
    return s


@router.get("/lesson/powerset", response_class=HTMLResponse)
def lesson_powerset(request: Request):
    problem = request.session.get("powerset_problem")
    hint_index = int(request.session.get("powerset_hint_index", 0))
    stats = _get_powerset_stats(request.session)
    level_complete = stats["streak"] >= POWERSET_STREAK_TARGET

    ctx = {
        "problem": problem,
        "hint_index": hint_index,
        "stats": stats,
        "level_complete": level_complete,
        "level_target": POWERSET_STREAK_TARGET,
    }
    return templates.TemplateResponse(request, "lesson_powerset.html", ctx)


@router.post("/lesson/powerset/new", response_class=HTMLResponse)
def powerset_new(request: Request):
    def gen():
        return generate_powerset_problem()

    def sig(p):
        return f"{p.get('prompt','')}|{p.get('answer','')}"

    problem = _new_nonrepeating(request.session, "powerset_last_sig", gen, sig)

    request.session["powerset_problem"] = problem
    request.session["powerset_hint_index"] = 0

    ctx = {"problem": problem, "hint_index": 0}
    return templates.TemplateResponse(request, "partials/powerset_problem_block.html", ctx)


@router.post("/lesson/powerset/answer", response_class=HTMLResponse)
def powerset_answer(request: Request, answer: str = Form(...)):
    problem = request.session.get("powerset_problem")
    if not problem:
        return HTMLResponse("No problem yet. Click “New problem.”", status_code=400)

    user_val = parse_int(answer)
    correct = (user_val is not None) and (user_val == problem["answer"])

    stats = _get_powerset_stats(request.session)
    stats["attempts"] += 1
    if correct:
        stats["correct"] += 1
        stats["streak"] += 1
        stats["best_streak"] = max(stats["best_streak"], stats["streak"])
    else:
        stats["streak"] = 0

    request.session["powerset_stats"] = stats
    level_complete = stats["streak"] >= POWERSET_STREAK_TARGET

    if level_complete:
        _set_progress(request.session, powerset_complete=True)

    ctx = {
        "correct": correct,
        "expected": problem["answer"],
        "stats": stats,
        "level_complete": level_complete,
        "level_target": POWERSET_STREAK_TARGET,
    }
    return templates.TemplateResponse(request, "partials/powerset_answer_response.html", ctx)


@router.post("/lesson/powerset/hint", response_class=HTMLResponse)
def powerset_hint(request: Request):
    problem = request.session.get("powerset_problem")
    if not problem:
        return HTMLResponse("No problem yet. Click “New problem.”", status_code=400)

    hint_index = int(request.session.get("powerset_hint_index", 0))
    hints = problem.get("hints", [])
    hint_index = min(hint_index + 1, len(hints))
    request.session["powerset_hint_index"] = hint_index

    ctx = {"problem": problem, "hint_index": hint_index}
    return templates.TemplateResponse(request, "partials/powerset_hint.html", ctx)


@router.post("/lesson/powerset/reset", response_class=HTMLResponse)
def powerset_reset(request: Request):
    request.session["powerset_stats"] = {"attempts": 0, "correct": 0, "streak": 0, "best_streak": 0}
    request.session.pop("powerset_problem", None)
    request.session["powerset_hint_index"] = 0
    _set_progress(request.session, powerset_complete=False)

    ctx = {
        "stats": request.session["powerset_stats"],
        "level_complete": False,
        "level_target": POWERSET_STREAK_TARGET,
    }
    return templates.TemplateResponse(request, "partials/powerset_reset_response.html", ctx)


# ------------------------
# CHOOSE (COMBINATIONS ONLY)
# ------------------------

CHOOSE_STREAK_TARGET = 3


def _get_choose_stats(session: dict) -> dict:
    s = session.get("choose_stats")
    if not isinstance(s, dict):
        s = {"attempts": 0, "correct": 0, "streak": 0, "best_streak": 0}
    for k in ["attempts", "correct", "streak", "best_streak"]:
        s.setdefault(k, 0)
    return s


def _choose_combo_only(raw: dict) -> dict:
    return {
        "scenario_title": raw.get("scenario_title", "Choose k from n"),
        "n": raw.get("n"),
        "k": raw.get("k"),
        "prompt": raw.get("prompt_combo"),
        "answer": raw.get("answer_combo"),
        "hints": raw.get("hints_combo", []),
        "viz": raw.get("viz", {}),
    }


@router.get("/lesson/choose", response_class=HTMLResponse)
def lesson_choose(request: Request):
    progress = _get_progress(request.session)
    if not progress.get("powerset_complete", False):
        return templates.TemplateResponse(
            request,
            "base.html",
            {"content": "Finish Powersets to unlock this level. Go to /levels"},
        )

    problem = request.session.get("choose_problem")
    hint_index = int(request.session.get("choose_hint_index", 0))
    stats = _get_choose_stats(request.session)
    level_complete = stats["streak"] >= CHOOSE_STREAK_TARGET

    ctx = {
        "problem": problem,
        "hint_index": hint_index,
        "hints": (problem.get("hints", []) if problem else []),
        "stats": stats,
        "level_complete": level_complete,
        "level_target": CHOOSE_STREAK_TARGET,
    }
    return templates.TemplateResponse(request, "lesson_choose_nk.html", ctx)


@router.post("/lesson/choose/new", response_class=HTMLResponse)
def choose_new(request: Request):
    def gen():
        return generate_choose_nk_problem()

    def sig(p):
        return f"{p.get('scenario_title','')}|{p.get('n')}|{p.get('k')}|{p.get('prompt_combo','')}"

    raw = _new_nonrepeating(request.session, "choose_last_sig", gen, sig)
    problem = _choose_combo_only(raw)

    request.session["choose_problem"] = problem
    request.session["choose_hint_index"] = 0

    ctx = {"problem": problem, "hint_index": 0, "hints": problem.get("hints", [])}
    return templates.TemplateResponse(request, "partials/choose_problem_block.html", ctx)


@router.post("/lesson/choose/answer", response_class=HTMLResponse)
def choose_answer(request: Request, answer: str = Form(...)):
    problem = request.session.get("choose_problem")
    if not problem:
        return HTMLResponse("No problem yet. Click “New problem.”", status_code=400)

    expected = problem["answer"]
    user_val = parse_int(answer)
    correct = (user_val is not None) and (user_val == expected)

    stats = _get_choose_stats(request.session)
    stats["attempts"] += 1
    if correct:
        stats["correct"] += 1
        stats["streak"] += 1
        stats["best_streak"] = max(stats["best_streak"], stats["streak"])
    else:
        stats["streak"] = 0

    request.session["choose_stats"] = stats
    level_complete = stats["streak"] >= CHOOSE_STREAK_TARGET

    if level_complete:
        _set_progress(request.session, choose_complete=True)

        if request.headers.get("HX-Request") == "true":
            return HTMLResponse("", headers={"HX-Redirect": "/win"})

        return RedirectResponse(url="/win", status_code=303)

    ctx = {
        "correct": correct,
        "expected": expected,
        "stats": stats,
        "level_complete": level_complete,
        "level_target": CHOOSE_STREAK_TARGET,
    }
    return templates.TemplateResponse(request, "partials/choose_answer_response.html", ctx)


@router.post("/lesson/choose/hint", response_class=HTMLResponse)
def choose_hint(request: Request):
    problem = request.session.get("choose_problem")
    if not problem:
        return HTMLResponse("No problem yet. Click “New problem.”", status_code=400)

    hints = problem.get("hints", [])
    hint_index = int(request.session.get("choose_hint_index", 0))
    hint_index = min(hint_index + 1, len(hints))
    request.session["choose_hint_index"] = hint_index

    ctx = {"problem": problem, "hint_index": hint_index, "hints": hints}
    return templates.TemplateResponse(request, "partials/choose_hint.html", ctx)


@router.post("/lesson/choose/reset", response_class=HTMLResponse)
def choose_reset(request: Request):
    request.session["choose_stats"] = {"attempts": 0, "correct": 0, "streak": 0, "best_streak": 0}
    request.session.pop("choose_problem", None)
    request.session["choose_hint_index"] = 0
    _set_progress(request.session, choose_complete=False)

    ctx = {
        "stats": request.session["choose_stats"],
        "level_complete": False,
        "level_target": CHOOSE_STREAK_TARGET,
    }
    return templates.TemplateResponse(request, "partials/choose_reset_response.html", ctx)


@router.get("/win", response_class=HTMLResponse)
def win(request: Request):
    progress = _get_progress(request.session)

    if not (progress["product_complete"] and progress["powerset_complete"] and progress["choose_complete"]):
        return RedirectResponse(url="/levels", status_code=303)

    product_stats = _get_product_stats(request.session)
    powerset_stats = _get_powerset_stats(request.session)
    choose_stats = _get_choose_stats(request.session)

    ctx = {
        "product_stats": product_stats,
        "powerset_stats": powerset_stats,
        "choose_stats": choose_stats,
    }
    return templates.TemplateResponse(request, "win.html", ctx)


@router.post("/reset-all")
def reset_all(request: Request):
    request.session.clear()
    return RedirectResponse(url="/", status_code=303)
