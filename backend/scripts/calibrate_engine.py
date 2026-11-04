"""Prints how the two-engine scorer rates a few canned entries — handy for
sanity-checking thresholds before the demo.   python -m scripts.calibrate_engine"""
from app.ai.scoring import analyze_text
from app.engine.rumination import compute_rumination

SAMPLES = {
    "high rumination": "I keep thinking about the exam over and over. What if I fail? I always mess up, nothing ever works for me. I can't stop thinking about it and I feel so hopeless and stressed. It's all my fault, I should have studied more.",
    "panic": "Presentation tomorrow and I'm panicking. I keep replaying every mistake. Everyone will think I'm stupid. I can't cope, I can't sleep, my deadlines are piling up and I'm so behind.",
    "mild": "Pretty stressed about the assignment deadline and a bit anxious about the viva. Feeling tired but I'll manage.",
    "calm": "Had a good day. Finished my assignment early and went for a walk with friends. Feeling grateful and relaxed.",
    "neutral": "Went to class, had lunch, studied for a bit.",
    "crisis": "I want to end it all, I don't want to be here",
    "low but ok": "Not feeling great today but it's okay, just a bit tired.",
}

if __name__ == "__main__":
    base = {"recovery": "full_day", "triggers": ["exam_pressure"]}
    print(f"{'sample':16} {'mood':11} {'sent':>6} {'stress':>6} {'rumin':>6} | {'plain':>5} {'personalised':>12}  category")
    for name, text in SAMPLES.items():
        a = analyze_text(text)
        plain = compute_rumination(a, text=text)
        pers = compute_rumination(a, text=text, baseline=base, recent_scores=[60, 55])
        print(f"{name:16} {a['mood']:11} {a['sentiment']:6} {a['stress_intensity']:6} {a['rumination_markers_score']:6} | {plain['score']:5} {pers['score']:12}  {pers['category']['label']}")
