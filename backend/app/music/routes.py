import base64
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.auth.utils import get_optional_user
from app.config import SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
from app.music.catalog import TARGET_STATES, TRANSITIONS, recommend_tracks

router = APIRouter(prefix="/api/music", tags=["music"])


class PlaylistRequest(BaseModel):
    mood: str = "calm"


def get_search_terms(mood: str) -> str:
    mood = mood.lower().strip()

    mood_map = {
        "happy": "happy uplifting",
        "sad": "sad emotional comfort",
        "angry": "calm relaxing",
        "stressed": "stress relief calm",
        "anxious": "anxiety relief calm",
        "anxiety": "anxiety relief calm",
        "overwhelmed": "calm relaxing peaceful",
        "calm": "calm peaceful",
        "relaxed": "relaxing peaceful",
        "tired": "sleep relaxing",
        "lonely": "comfort acoustic",
        "focused": "focus concentration",
        "positive": "positive uplifting",
    }

    return mood_map.get(mood, f"{mood} calm relaxing")


async def get_spotify_token() -> str:
    if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Spotify credentials are not configured.",
        )

    credentials = f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}"
    encoded_credentials = base64.b64encode(
        credentials.encode()
    ).decode()

    headers = {
        "Authorization": f"Basic {encoded_credentials}",
        "Content-Type": "application/x-www-form-urlencoded",
    }

    data = {"grant_type": "client_credentials"}

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            "https://accounts.spotify.com/api/token",
            headers=headers,
            data=data,
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail="Could not authenticate with Spotify.",
        )

    return response.json()["access_token"]


MOOD_TO_STATE = {
    "overwhelmed": "calming", "anxious": "calming", "distressed": "calming", "stressed": "calming",
    "ruminating": "grounded", "unsettled": "grounded", "angry": "grounded",
    "low": "uplifting", "sad": "uplifting", "tired": "uplifting", "lonely": "uplifting",
    "calm": "focus", "content": "uplifting", "hopeful": "uplifting", "neutral": "focus",
}


@router.get("/recommend")
async def recommend(
    state: Optional[str] = Query(None, description="calming | grounded | focus | uplifting"),
    mood: Optional[str] = Query(None),
    user=Depends(get_optional_user),
):
    """Curated, credential-free recommendations (generated soundscapes +
    embedded Spotify playlists), ranked by the student's onboarding taste."""
    target = state if state in TARGET_STATES else MOOD_TO_STATE.get((mood or "").lower(), "grounded")
    prefs = (user or {}).get("music") or {}
    return {
        "target_state": target,
        "transition": TRANSITIONS[target],
        "tracks": recommend_tracks(target, prefs.get("genres"), prefs.get("languages"), prefs.get("playlists")),
    }


@router.post("/playlist")
async def get_playlist(request: PlaylistRequest, user=Depends(get_optional_user)):
    # No Spotify API credentials? Serve the curated catalog in the same shape
    # instead of failing, so the music feature always works.
    if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
        target = MOOD_TO_STATE.get(request.mood.lower().strip(), "grounded")
        prefs = (user or {}).get("music") or {}
        tracks = recommend_tracks(target, prefs.get("genres"), prefs.get("languages"), prefs.get("playlists"))
        return {
            "mood": request.mood,
            "search_terms": TRANSITIONS[target]["label"],
            "source": "curated",
            "playlists": [
                {
                    "id": t["id"], "name": t["title"], "description": t["subtitle"],
                    "external_url": t.get("external_url"), "embed_url": t.get("embed_url"), "image_url": None,
                    "kind": t["kind"], "generator": t.get("generator"),
                }
                for t in tracks
            ],
        }

    token = await get_spotify_token()

    search_terms = get_search_terms(request.mood)

    headers = {
        "Authorization": f"Bearer {token}",
    }

    params = {
        "q": search_terms,
        "type": "playlist",
        "limit": 5,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            "https://api.spotify.com/v1/search",
            headers=headers,
            params=params,
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail="Spotify playlist search failed.",
        )

    spotify_data = response.json()

    playlists = []

    for item in spotify_data.get("playlists", {}).get("items", []):
        if not item:
            continue

        spotify_url = item.get("external_urls", {}).get("spotify")

        if not spotify_url:
            continue

        playlist_id = item.get("id")

        playlists.append(
            {
                "id": playlist_id,
                "name": item.get("name", "Mood playlist"),
                "description": item.get("description", ""),
                "external_url": spotify_url,
                "embed_url": (
                    f"https://open.spotify.com/embed/playlist/{playlist_id}"
                    if playlist_id
                    else None
                ),
                "image_url": (
                    item.get("images", [{}])[0].get("url")
                    if item.get("images")
                    else None
                ),
            }
        )

    return {
        "mood": request.mood,
        "search_terms": search_terms,
        "source": "spotify",
        "playlists": playlists,
    }