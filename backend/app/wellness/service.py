"""
Streak & Wellness Garden.

Design rule: reward consistency without pressure. A missed day never
"kills" the plant — it simply rests, and the streak counter forgives a single
missed day (a rest day) before it resets. Growth points never decrease.

  growth_points = 10 per distinct check-in day  +  mini-game points
"""
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from app.database import game_events, journals

POINTS_PER_CHECKIN_DAY = 10
DAILY_GAME_POINT_CAP = 30

STAGES = [
    # (min growth points, key, label)
    (0, "seed", "Seed"),
    (10, "sprout", "Sprout"),
    (40, "sapling", "Sapling"),
    (90, "bloom", "In bloom"),
    (170, "tree", "Flourishing tree"),
]

MESSAGES = {
    "seed": "Your seed is planted. One check-in waters it.",
    "sprout": "A first green shoot — you showed up for yourself.",
    "sapling": "Growing steadily. No rush, no pressure.",
    "bloom": "Look at those blooms. That's real consistency.",
    "tree": "A flourishing tree. You've built a lasting habit of self-care.",
}


def _day(iso: str) -> Optional[date]:
    try:
        return datetime.fromisoformat(iso).astimezone(timezone.utc).date()
    except (ValueError, TypeError):
        return None


def streaks_from_days(days: set[date], today: Optional[date] = None) -> tuple[int, int]:
    """(current_streak, longest_streak). One missed day is forgiven (rest day):
    a gap of exactly one empty day does not break the chain."""
    if not days:
        return 0, 0
    today = today or datetime.now(timezone.utc).date()
    ordered = sorted(days)

    longest = run = 1
    for prev, cur in zip(ordered, ordered[1:]):
        gap = (cur - prev).days
        run = run + 1 if gap <= 2 else 1
        longest = max(longest, run)

    # current streak counted backwards from the latest check-in, but only
    # "alive" if that latest check-in is within the grace window of today.
    latest = ordered[-1]
    if (today - latest).days > 2:
        return 0, longest
    current = 1
    for prev, cur in zip(reversed(ordered[:-1]), reversed(ordered[1:])):
        if (cur - prev).days <= 2:
            current += 1
        else:
            break
    return current, max(longest, current)


def stage_for(points: int) -> dict:
    idx = 0
    for i, (minimum, _, _) in enumerate(STAGES):
        if points >= minimum:
            idx = i
    minimum, key, label = STAGES[idx]
    nxt = STAGES[idx + 1] if idx + 1 < len(STAGES) else None
    if nxt:
        span = nxt[0] - minimum
        progress = round((points - minimum) / span * 100)
    else:
        progress = 100
    return {
        "stage": key,
        "stage_index": idx,
        "stage_label": label,
        "next_stage_label": nxt[2] if nxt else None,
        "next_stage_at": nxt[0] if nxt else None,
        "progress_pct": max(0, min(100, progress)),
        "message": MESSAGES[key],
    }


async def game_points_today(user_id: str) -> int:
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    total = 0
    async for ev in game_events.find({"user_id": user_id, "created_at": {"$gte": start}}):
        total += ev.get("points", 0)
    return total


async def garden_state(user_id: str) -> dict:
    days: set[date] = set()
    async for doc in journals.find({"user_id": user_id}, {"created_at": 1}):
        d = _day(doc.get("created_at", ""))
        if d:
            days.add(d)

    game_points = 0
    async for ev in game_events.find({"user_id": user_id}, {"points": 1}):
        game_points += ev.get("points", 0)

    today = datetime.now(timezone.utc).date()
    current, longest = streaks_from_days(days, today)
    growth = len(days) * POINTS_PER_CHECKIN_DAY + game_points
    week = [
        {"date": (today - timedelta(days=i)).isoformat(), "checked_in": (today - timedelta(days=i)) in days}
        for i in range(6, -1, -1)
    ]
    return {
        "streak": current,
        "longest_streak": longest,
        "checkin_days": len(days),
        "game_points": game_points,
        "growth_points": growth,
        "checked_in_today": today in days,
        "last_7_days": week,
        **stage_for(growth),
    }
