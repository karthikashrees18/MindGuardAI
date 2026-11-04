"""End-to-end API smoke test against a running backend (DEMO_MODE on).

    python -m scripts.smoke_test [http://localhost:8000]

Walks the whole presentation story: persona login -> check-in -> detection ->
interventions -> early warning -> counselor connect -> counselor portal ->
garden/gamification -> privacy guarantees. Exits non-zero on the first failure.
"""
import sys
import time

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
c = httpx.Client(base_url=BASE, timeout=30)
fails = 0


def check(label: str, cond: bool, extra=""):
    global fails
    print(f"  [{'PASS' if cond else 'FAIL'}] {label} {extra}")
    if not cond:
        fails += 1


def auth(token):
    return {"Authorization": f"Bearer {token}"}


HIGH = ("I keep thinking about the exam over and over. What if I fail? I always mess up, nothing ever works for me. "
        "I can't stop thinking about it and I feel so hopeless and stressed. It's all my fault, I should have studied more.")
CALM = "Had a good day. Finished my assignment early and went for a walk with friends. Feeling grateful and relaxed."

print("Waiting for demo seed...")
for _ in range(40):
    r = c.post("/api/demo/login", json={"persona": "counselor"})
    if r.status_code == 200:
        break
    time.sleep(1)
counselor = r.json()["access_token"]
check("counselor demo login", r.status_code == 200)

print("\nStudent A — high rumination")
r = c.post("/api/demo/reset", json={"persona": "high"})
a = r.json()["access_token"]
check("reset + login Student A", r.status_code == 200, r.json()["user"]["name"])
me = c.get("/api/auth/me", headers=auth(a)).json()
check("onboarding baseline present", me["baseline"]["recovery"] == "multiple_days" and "exam_pressure" in me["baseline"]["triggers"])
check("no warning flag before check-in", c.get("/api/support/status", headers=auth(a)).json()["flag"] is None)

r = c.post("/api/checkins", headers=auth(a), json={"text": HIGH, "mood": "😢", "stress_level": 85})
j = r.json()
check("check-in 200", r.status_code == 200, r.text[:200] if r.status_code != 200 else "")
an = j["analysis"]
check("score is Critical (>=71)", an["rumination_score"] >= 71 and an["category"]["key"] == "critical", f"score={an['rumination_score']}")
check("explainable factors returned", len(an["factors"]) >= 3)
check("markers detected", bool(an["markers"]["thought_loops"]) and bool(an["markers"]["helplessness"]))
check("early warning triggered + prompt", j["early_warning"]["triggered"] and j["early_warning"]["show_prompt"])
types = [x["type"] for x in j["interventions"]["cards"]]
check("counselor card first", types[0] == "counselor", str(types))
check("music + breathing + games offered", {"music", "breathing", "game_bubble", "game_reframe"} <= set(types))
music = next(x for x in j["interventions"]["cards"] if x["type"] == "music")
check("music transition label", "Calm" in music["title"] or "Grounded" in music["title"], music["title"])
check("music has a generated track", any(t["kind"] == "generated" for t in music["payload"]["tracks"]))
check("lofi/ambient taste ranked first", music["payload"]["tracks"][0]["genre"] in ("lofi", "ambient"))

print("\nEscalation -> counselor")
r = c.post("/api/support/connect", headers=auth(a), json={"channel": "in_app", "share_identity": False, "note": "Please help"})
check("1-click connect", r.status_code == 200 and r.json()["flag"]["connect_requested"])
cases = c.get("/api/counselor/cases", headers=auth(counselor)).json()
check("counselor sees cases", len(cases) > 0, f"{len(cases)} cases")
check("critical cases sorted first", cases[0]["risk"] == "critical")
alias_a = next((x["alias"] for x in cases if x["flag"] and x["flag"]["student_note"] == "Please help"), None)
check("Student A visible under alias only", alias_a is not None and next(x for x in cases if x["alias"] == alias_a)["identity"] is None, str(alias_a))
blob = str(cases)
check("no journal text / names leak to counselor", "Aarav" not in blob and "hopeless" not in blob and "aarav.demo" not in blob)
d = c.get(f"/api/counselor/cases/{alias_a}", headers=auth(counselor)).json()
check("case detail has trend + triggers", len(d["trend"]) >= 5 and d["top_triggers"], f"{len(d['trend'])} pts")
sched = c.post(f"/api/counselor/cases/{alias_a}/actions", headers=auth(counselor),
               json={"type": "schedule", "note": "Let's talk tomorrow", "scheduled_for": "2030-01-01T10:00"})
check("counselor schedules intervention", sched.status_code == 200)
st = c.get("/api/support/status", headers=auth(a)).json()["flag"]
check("student sees counselor update", st["counselor_updates"] and st["counselor_updates"][0]["type"] == "schedule")
check("student forbidden from counselor API", c.get("/api/counselor/cases", headers=auth(a)).status_code == 403)
check("student forbidden from admin API", c.get("/api/admin/aggregate-stats", headers=auth(a)).status_code == 403)
summ = c.get("/api/counselor/summary", headers=auth(counselor)).json()
check("summary counts", summ["critical"] >= 1 and summ["connect_requests"] >= 1, str(summ))

print("\nGamification")
g0 = c.get("/api/garden", headers=auth(a)).json()
check("garden state", g0["streak"] >= 1 and "stage" in g0, f"streak={g0['streak']} stage={g0['stage']}")
r = c.post("/api/games/complete", headers=auth(a), json={"game": "bubble_pop", "score": 25, "duration_s": 60}).json()
check("game awards points", r["awarded"] > 0, str(r["awarded"]))
for _ in range(6):
    r = c.post("/api/games/complete", headers=auth(a), json={"game": "reframe", "score": 8, "duration_s": 60}).json()
check("daily cap enforced", r["capped"] is True and r["awarded"] <= 30)

print("\nStudent B — calm")
r = c.post("/api/demo/reset", json={"persona": "calm"})
b = r.json()["access_token"]
g = c.get("/api/garden", headers=auth(b)).json()
check("calm student has 10+ day streak + bloom", g["streak"] >= 10 and g["stage"] in ("bloom", "tree"), f"streak={g['streak']} stage={g['stage']}")
r = c.post("/api/checkins", headers=auth(b), json={"text": CALM, "mood": "🙂", "stress_level": 10}).json()
check("calm entry is Normal/Calm", r["analysis"]["category"]["key"] == "calm", f"score={r['analysis']['rumination_score']}")
check("no early warning", not r["early_warning"]["triggered"])
check("check-in grew the garden", r["garden"]["checkin_days"] == g["checkin_days"] + 1)

print("\nSecurity")
other = c.get("/api/journals", headers=auth(b), params={"user_id": me["id"]})
check("cannot read another student's journal", other.status_code == 403)
check("journals require auth", c.get("/api/journals").status_code == 401)
check("chat works signed-out (no storage)", c.post("/api/ai/chat", json={"history": [], "message": HIGH}).json()["rumination_score"] >= 71)
r = c.get("/api/music/recommend", params={"state": "calming"}).json()
check("music/recommend credential-free", len(r["tracks"]) >= 3)
r = c.post("/api/music/playlist", json={"mood": "anxious"})
check("legacy /playlist falls back to curated", r.status_code == 200 and r.json()["playlists"])
check("admin aggregate works for counselor", c.get("/api/admin/aggregate-stats", headers=auth(counselor)).status_code == 200)

print(f"\n{'ALL CHECKS PASSED' if not fails else str(fails) + ' CHECK(S) FAILED'}")
sys.exit(1 if fails else 0)
