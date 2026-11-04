"""
Curated mood-shifting audio library.

Every item has a `kind`:
  generated  a soundscape the browser synthesises with the Web Audio API
             (432 Hz ambient bed, theta binaural beat, lo-fi pad, rain …).
             Zero network, zero credentials — this is what guarantees the
             demo has audible music even with no Spotify/Wi-Fi.
  spotify    an official public Spotify playlist rendered with the embed
             player (open.spotify.com/embed/playlist/<id>).
  search     a Spotify search link for a genre/language we don't pin a
             playlist for — opens in a new tab.

`target_states` are the emotional destinations from the spec:
  calming    from critical distress   -> settle the nervous system
  grounded   from overthinking        -> get out of the head, into the body
  focus      from anxious/distracted  -> channel energy into the task
  uplifting  from low / flat          -> lift mood

NOTE: Spotify playlist ids are Spotify's own editorial playlists. They are
stable in practice but Spotify can retire one at any time — open the app
once before presenting and swap any dead id here (one line each).
"""
import re
from typing import Iterable, Optional

TARGET_STATES = ("calming", "grounded", "focus", "uplifting")

# genre keys match the onboarding chips: lofi | classical | ambient | indie | pop
CATALOG: list[dict] = [
    # --- generated (always works) -------------------------------------------
    {"id": "gen-432", "title": "432 Hz Ambient Soundscape", "subtitle": "Slow evolving pads tuned to A=432 — headphones optional",
     "genre": "ambient", "languages": ["instrumental"], "target_states": ["grounded", "calming"],
     "kind": "generated", "generator": "ambient432", "tag": "432Hz"},
    {"id": "gen-binaural", "title": "Theta Binaural Calm", "subtitle": "6 Hz theta beat for slowing racing thoughts — use headphones",
     "genre": "ambient", "languages": ["instrumental"], "target_states": ["calming", "grounded", "focus"],
     "kind": "generated", "generator": "binaural_theta", "tag": "Binaural"},
    {"id": "gen-lofi", "title": "Lo-Fi Chill Pad", "subtitle": "Warm detuned keys with a soft vinyl hush",
     "genre": "lofi", "languages": ["instrumental"], "target_states": ["grounded", "focus", "calming"],
     "kind": "generated", "generator": "lofi_pad", "tag": "Lo-Fi"},
    {"id": "gen-rain", "title": "Soft Rain & Brown Noise", "subtitle": "Gentle masking noise for studying or sleep",
     "genre": "ambient", "languages": ["instrumental"], "target_states": ["calming", "focus"],
     "kind": "generated", "generator": "rain", "tag": "Nature"},
    {"id": "gen-sunrise", "title": "Sunrise Arpeggio", "subtitle": "Bright major-key arpeggios to lift a flat mood",
     "genre": "classical", "languages": ["instrumental"], "target_states": ["uplifting"],
     "kind": "generated", "generator": "sunrise", "tag": "Uplifting"},

    # --- Spotify editorial playlists (embedded) --------------------------------
    {"id": "sp-lofi", "title": "Lofi Beats", "subtitle": "Spotify · chill lo-fi hip hop",
     "genre": "lofi", "languages": ["instrumental", "english"], "target_states": ["grounded", "focus", "calming"],
     "kind": "spotify", "spotify_id": "37i9dQZF1DWWQRwui0ExPn"},
    {"id": "sp-piano", "title": "Peaceful Piano", "subtitle": "Spotify · relax & indulge with beautiful piano",
     "genre": "classical", "languages": ["instrumental"], "target_states": ["calming", "grounded"],
     "kind": "spotify", "spotify_id": "37i9dQZF1DX4sWSpwq3LiO"},
    {"id": "sp-focus", "title": "Deep Focus", "subtitle": "Spotify · keep calm and focus",
     "genre": "ambient", "languages": ["instrumental"], "target_states": ["focus"],
     "kind": "spotify", "spotify_id": "37i9dQZF1DWZeKCadgRdKQ"},
    {"id": "sp-ambient", "title": "Ambient Relaxation", "subtitle": "Spotify · unwind with ambient textures",
     "genre": "ambient", "languages": ["instrumental"], "target_states": ["calming", "grounded"],
     "kind": "spotify", "spotify_id": "37i9dQZF1DX3Ogo9pFvBkY"},
    {"id": "sp-classical", "title": "Classical Essentials", "subtitle": "Spotify · timeless calm",
     "genre": "classical", "languages": ["instrumental"], "target_states": ["focus", "calming"],
     "kind": "spotify", "spotify_id": "37i9dQZF1DWWEJlAGA9gs0"},
    {"id": "sp-mood", "title": "Mood Booster", "subtitle": "Spotify · get happy with today's dose of feel-good songs",
     "genre": "pop", "languages": ["english"], "target_states": ["uplifting"],
     "kind": "spotify", "spotify_id": "37i9dQZF1DX3rxVfibe1L0"},
    {"id": "sp-happy", "title": "Happy Hits!", "subtitle": "Spotify · hits to boost your mood",
     "genre": "pop", "languages": ["english"], "target_states": ["uplifting"],
     "kind": "spotify", "spotify_id": "37i9dQZF1DXdPec7aLTmlC"},

    # --- genre / language search links ------------------------------------------
    {"id": "se-indie", "title": "Chill Indie & Acoustic", "subtitle": "Search Spotify for soft indie",
     "genre": "indie", "languages": ["english"], "target_states": ["grounded", "calming", "uplifting"],
     "kind": "search", "query": "chill indie acoustic"},
    {"id": "se-indie-up", "title": "Feel-Good Indie Pop", "subtitle": "Search Spotify for sunny indie pop",
     "genre": "indie", "languages": ["english"], "target_states": ["uplifting"],
     "kind": "search", "query": "feel good indie pop"},
    {"id": "se-hindi", "title": "Hindi Lo-Fi & Unplugged", "subtitle": "Search Spotify for mellow Hindi",
     "genre": "lofi", "languages": ["hindi"], "target_states": ["grounded", "calming"],
     "kind": "search", "query": "hindi lofi chill"},
    {"id": "se-tamil", "title": "Tamil Melodies", "subtitle": "Search Spotify for calm Tamil melodies",
     "genre": "pop", "languages": ["tamil"], "target_states": ["calming", "uplifting"],
     "kind": "search", "query": "tamil melody calm"},
    {"id": "se-telugu", "title": "Telugu Soft Hits", "subtitle": "Search Spotify for gentle Telugu songs",
     "genre": "pop", "languages": ["telugu"], "target_states": ["calming", "uplifting"],
     "kind": "search", "query": "telugu soft melodies"},
    {"id": "se-kannada", "title": "Kannada Chill", "subtitle": "Search Spotify for relaxed Kannada songs",
     "genre": "pop", "languages": ["kannada"], "target_states": ["calming", "uplifting"],
     "kind": "search", "query": "kannada chill melodies"},
]

_BY_ID = {c["id"]: c for c in CATALOG}

TRANSITIONS = {
    "calming": {"from": "Overwhelmed", "to": "Calm", "label": "From Overwhelmed to Calm"},
    "grounded": {"from": "Overthinking", "to": "Grounded", "label": "From Overthinking to Grounded"},
    "focus": {"from": "Anxious", "to": "Focused", "label": "From Anxious to Focused"},
    "uplifting": {"from": "Flat", "to": "Uplifted", "label": "From Flat to Uplifted"},
}

_SPOTIFY_ID_RE = re.compile(r"(?:playlist[/:]|^)([A-Za-z0-9]{22})(?:\?|$|/)?")


def parse_spotify_playlist(url_or_id: str) -> Optional[str]:
    """Accepts https://open.spotify.com/playlist/<id>?si=..., spotify:playlist:<id>
    or a bare 22-char id; returns the id or None."""
    if not url_or_id:
        return None
    m = _SPOTIFY_ID_RE.search(url_or_id.strip())
    return m.group(1) if m else None


def serialise(item: dict) -> dict:
    out = dict(item)
    if item["kind"] == "spotify":
        out["embed_url"] = f"https://open.spotify.com/embed/playlist/{item['spotify_id']}?utm_source=generator&theme=0"
        out["external_url"] = f"https://open.spotify.com/playlist/{item['spotify_id']}"
    elif item["kind"] == "search":
        from urllib.parse import quote
        out["external_url"] = f"https://open.spotify.com/search/{quote(item['query'])}"
    return out


def recommend_tracks(
    target_state: str,
    genres: Optional[Iterable[str]] = None,
    languages: Optional[Iterable[str]] = None,
    custom_playlists: Optional[dict] = None,
    limit: int = 6,
) -> list[dict]:
    """Ranks the catalog for a destination state, boosting the student's
    onboarding genres/languages and putting any playlist they pasted for that
    state first. Always keeps at least one 'generated' item so something
    plays offline."""
    genres = set(genres or [])
    languages = set(l.lower() for l in (languages or []))
    ranked: list[tuple[float, dict]] = []
    for item in CATALOG:
        if target_state not in item["target_states"]:
            continue
        score = 1.0
        if item["genre"] in genres:
            score += 2.0
        if languages and languages & set(item["languages"]):
            score += 1.5
        if item["kind"] == "generated":
            score += 0.6   # reliable + instant
        elif item["kind"] == "search":
            score -= 0.4
        # earlier position in item["target_states"] == better fit
        score += 0.3 * (len(item["target_states"]) - item["target_states"].index(target_state)) / len(item["target_states"])
        ranked.append((score, item))
    ranked.sort(key=lambda p: -p[0])
    picked = [serialise(i) for _, i in ranked[:limit]]

    if not any(p["kind"] == "generated" for p in picked):
        gen = next((serialise(i) for _, i in ranked if i["kind"] == "generated"), None)
        if gen:
            picked = picked[: limit - 1] + [gen]

    playlists = custom_playlists or {}
    # "grounded" has no onboarding slot of its own — the student's calming playlist serves it.
    custom = playlists.get(target_state) or (playlists.get("calming") if target_state == "grounded" else None)
    pid = parse_spotify_playlist(custom) if custom else None
    if pid:
        mine = {
            "id": f"custom-{target_state}", "title": "Your playlist", "subtitle": "From your onboarding preferences",
            "genre": "custom", "languages": [], "target_states": [target_state], "kind": "spotify",
            "spotify_id": pid, "tag": "Yours",
        }
        picked.insert(0, serialise(mine))
        picked = picked[:limit]
    return picked
