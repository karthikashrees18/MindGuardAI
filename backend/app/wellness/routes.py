import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.auth.utils import get_current_user
from app.database import game_events
from app.wellness.service import DAILY_GAME_POINT_CAP, game_points_today, garden_state

router = APIRouter(prefix="/api", tags=["wellness"])


class GameComplete(BaseModel):
    game: Literal["bubble_pop", "reframe", "breathing", "pomodoro"]
    score: int = Field(default=0, ge=0, le=10_000)
    duration_s: int = Field(default=0, ge=0, le=36_000)


def _points_for(body: GameComplete) -> int:
    if body.game == "bubble_pop":
        return min(10, 3 + body.score // 5)
    if body.game == "reframe":
        return min(12, 4 + body.score)          # score = correct matches
    if body.game == "breathing":
        return 6 if body.duration_s >= 60 else 3
    return 5                                     # pomodoro break finished


@router.get("/garden")
async def get_garden(user=Depends(get_current_user)):
    return await garden_state(user["_id"])


@router.post("/games/complete")
async def complete_game(body: GameComplete, user=Depends(get_current_user)):
    """Records a finished mini-game / calming activity. Points are capped per
    day so the garden rewards showing up, not grinding."""
    already = await game_points_today(user["_id"])
    room = max(0, DAILY_GAME_POINT_CAP - already)
    awarded = min(room, _points_for(body))
    if awarded:
        await game_events.insert_one({
            "_id": str(uuid.uuid4()),
            "user_id": user["_id"],
            "game": body.game,
            "score": body.score,
            "points": awarded,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    garden = await garden_state(user["_id"])
    return {
        "awarded": awarded,
        "capped": awarded < _points_for(body),
        "daily_cap": DAILY_GAME_POINT_CAP,
        "garden": garden,
    }
