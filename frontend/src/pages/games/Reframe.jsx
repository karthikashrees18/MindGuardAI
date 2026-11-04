// Thought Reframe — a 60-second game that teaches common thinking traps
// (cognitive distortions) by asking for the most realistic reframe.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Flame, Flower2, Lightbulb, RotateCcw, Timer } from "lucide-react";
import { api } from "../../api";
import { useApp } from "../../lib/store";
import { navigate } from "../../lib/router";
import { Button, Card } from "../../components/ui";
import "../../styles/games.css";

const ROUND_MS = 60000;

const ITEMS = [
  {
    thought: "I failed one quiz, so I'm a complete failure.",
    distortion: "All-or-nothing thinking",
    best: "One quiz went badly. That's one result, not a verdict on me, and I can still improve.",
    traps: ["I'm just bad at this subject and always will be.", "It doesn't matter at all, I'm sure I'll ace everything else."],
    why: "Seeing things as total success or total failure ignores all the shades in between.",
  },
  {
    thought: "If I stumble in my presentation, everyone will think I'm hopeless and my grade is ruined.",
    distortion: "Catastrophizing",
    best: "I might stumble a little, but most people won't notice much and one talk won't define my grade.",
    traps: ["I'll be perfect because I'm going to rehearse non-stop.", "They'll definitely laugh, so I should avoid presenting."],
    why: "Catastrophizing jumps to the worst possible outcome and treats it as certain.",
  },
  {
    thought: "My friend didn't reply, so she must be angry with me.",
    distortion: "Mind-reading",
    best: "She might be busy or away from her phone. I can check in with her instead of guessing.",
    traps: ["She's ignoring me on purpose, I must have done something wrong.", "It's fine, friends never get upset about anything."],
    why: "Mind-reading assumes we know what others think without any real evidence.",
  },
  {
    thought: "I'm going to bomb the placement interview. I just know it.",
    distortion: "Fortune-telling",
    best: "I can't predict the outcome. I can prepare well and handle each question as it comes.",
    traps: ["I'll definitely get the job, there's nothing to worry about.", "Interviews always go badly for me, so why try."],
    why: "Fortune-telling treats a prediction as a fact, usually a gloomy one.",
  },
  {
    thought: "I feel like such a burden, so I must be one.",
    distortion: "Emotional reasoning",
    best: "Feeling like a burden is a feeling, not a fact. I can check it against what people actually say and do.",
    traps: ["My feelings are always right, so I should trust them completely.", "I shouldn't feel this way at all. Just think positive."],
    why: "Emotional reasoning treats how we feel as proof of how things are.",
  },
  {
    thought: "I got a low mark. I'm an idiot.",
    distortion: "Labeling",
    best: "I got a low mark on this paper. That says something about this exam, not about my worth or intelligence.",
    traps: ["Everyone else is an idiot for setting such a hard paper.", "Marks are meaningless, so I won't think about it again."],
    why: "Labeling pins a harsh name on yourself instead of describing one event.",
  },
  {
    thought: "I should be able to finish all of this today without any break.",
    distortion: "Should-statements",
    best: "I'd like to get a lot done, but I'll do it in realistic chunks with breaks so I can keep going.",
    traps: ["I must push through all night, rest is for lazy people.", "There's no point starting, I'll never get it all done."],
    why: "Rigid 'shoulds' and 'musts' set standards that create guilt when we can't meet them.",
  },
  {
    thought: "Our group project got a poor grade. It's totally my fault.",
    distortion: "Personalization",
    best: "A group result has many causes. I can own my part and talk with the team about what to change.",
    traps: ["It's entirely my teammates' fault, I did everything right.", "Grades don't matter, so it's not worth reflecting on."],
    why: "Personalization blames yourself for things that had many contributors.",
  },
  {
    thought: "I messed up one assignment, so I always mess everything up.",
    distortion: "Overgeneralization",
    best: "This assignment went badly. I've done well on other things, so I'll learn from this one.",
    traps: ["I never mess up. This is just a fluke and I don't need to change anything.", "I'll always be the one who ruins things."],
    why: "Overgeneralization turns a single event into a never-ending pattern.",
  },
  {
    thought: "If I don't get above 90%, my whole future is over.",
    distortion: "Catastrophizing",
    best: "A good score would help, but there are many paths forward and my future isn't decided by one number.",
    traps: ["I'll definitely score 90%+, I've got this in the bag.", "Since I probably won't, I may as well stop studying."],
    why: "Catastrophizing makes one outcome feel like the end of everything.",
  },
  {
    thought: "Everyone in class seems so confident. I'm the only one who's struggling.",
    distortion: "Overgeneralization",
    best: "I only see how others look on the outside. Many classmates struggle too, they just don't show it.",
    traps: ["They're all smarter than me, that's the real reason.", "Struggling is a sign of weakness, so I'll hide it."],
    why: "Assuming 'everyone' is fine and 'only I' struggle skips the evidence we can't see.",
  },
  {
    thought: "My teacher gave me a short reply. She must think my work is terrible.",
    distortion: "Mind-reading",
    best: "A short reply could just be a busy day. If I want to know, I can ask for specific feedback.",
    traps: ["She hates my work, there's no other explanation.", "She's definitely impressed. Short replies mean perfection."],
    why: "Mind-reading fills the gaps with the most painful guess.",
  },
  {
    thought: "I'll never be able to finish this deadline. It's pointless to even begin.",
    distortion: "Fortune-telling",
    best: "I don't know that yet. If I start with one small piece for 20 minutes, I'll see what's possible.",
    traps: ["I'll finish it in no time, it's easy, I'll start tomorrow.", "Deadlines are stupid, I'll just skip this one."],
    why: "Fortune-telling predicts failure and then talks us out of trying.",
  },
  {
    thought: "I'm anxious about the exam, so something bad must be about to happen.",
    distortion: "Emotional reasoning",
    best: "Anxiety is a normal reaction to something that matters. It doesn't mean I'll fail. It means I care.",
    traps: ["Anxiety proves I'm not ready, so I should withdraw.", "I shouldn't feel anxious. Everyone else is fine."],
    why: "A strong feeling is not evidence. It's a signal we can take care of.",
  },
  {
    thought: "I'm such a loser. I forgot a deadline.",
    distortion: "Labeling",
    best: "I forgot a deadline. That's a mistake I can fix with a reminder system, not a label about who I am.",
    traps: ["Deadlines are not that big a deal, so there's nothing to fix.", "I'm just lazy, and that's how I'll always be."],
    why: "A label like 'loser' hides the real, fixable problem.",
  },
  {
    thought: "I must never ask questions in class, or people will think I'm stupid.",
    distortion: "Should-statements",
    best: "I'd prefer not to feel awkward, but questions help me learn, and others likely wonder the same.",
    traps: ["I should always know the answer before anyone else does.", "Questions are for weak students, so I'll stay silent."],
    why: "Absolute rules about what we 'must' do trap us in fear of being judged.",
  },
];

const TAKEAWAYS = [
  "Thoughts are not facts. Naming the trap takes away much of its power.",
  "The kindest reframe is usually also the most accurate one.",
  "You don't have to think positively, just realistically.",
];

function shuffle(a) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildRound() {
  return shuffle(ITEMS).map((it) => ({
    ...it,
    options: shuffle([{ text: it.best, ok: true }, ...it.traps.map((t) => ({ text: t, ok: false }))]),
  }));
}

export default function Reframe() {
  const { setGarden, toast } = useApp();
  const [phase, setPhase] = useState("intro"); // intro | playing | done
  const [round, setRound] = useState(() => buildRound());
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null); // index of chosen option
  const [correct, setCorrect] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [msLeft, setMsLeft] = useState(ROUND_MS);
  const [reward, setReward] = useState(null);
  const [saving, setSaving] = useState(false);
  const [takeaway, setTakeaway] = useState(TAKEAWAYS[0]);

  const alive = useRef(true);
  const stats = useRef({ correct: 0, attempted: 0, usedMs: 0 });
  const nextRef = useRef(null);
  const phaseRef = useRef("intro");
  const pickedRef = useRef(null);
  const streakRef = useRef(0);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const setPhaseBoth = (p) => { phaseRef.current = p; setPhase(p); };

  const finish = useCallback(async () => {
    if (phaseRef.current === "done") return;
    const { correct: c, usedMs } = stats.current;
    setTakeaway(TAKEAWAYS[Math.floor(Math.random() * TAKEAWAYS.length)]);
    setPhaseBoth("done");
    setSaving(true);
    try {
      const res = await api.completeGame("reframe", c, Math.max(1, Math.round(usedMs / 1000)));
      if (!alive.current) return;
      if (res?.garden) setGarden(res.garden);
      setReward(res);
      toast(
        res.awarded > 0 ? `+${res.awarded} garden points 🌱` : "Daily garden points reached — nice work, the garden thanks you",
        { type: "reward" },
      );
    } catch (e) {
      if (alive.current) toast(e.message || "Couldn't save your round", { type: "error" });
    } finally {
      if (alive.current) setSaving(false);
    }
  }, [setGarden, toast]);

  // timer: counts only while a question is open (reading the explanation is free)
  useEffect(() => {
    if (phase !== "playing") return undefined;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      if (pickedRef.current !== null) return;
      stats.current.usedMs += dt;
      const left = Math.max(0, ROUND_MS - stats.current.usedMs);
      setMsLeft(left);
      if (left <= 0) finish();
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, finish]);

  const start = () => {
    stats.current = { correct: 0, attempted: 0, usedMs: 0 };
    pickedRef.current = null;
    streakRef.current = 0;
    setRound(buildRound());
    setIdx(0); setPicked(null); setCorrect(0); setAttempted(0); setStreak(0); setBestStreak(0);
    setMsLeft(ROUND_MS); setReward(null);
    setPhaseBoth("playing");
  };

  const item = round[idx];

  const choose = useCallback((i) => {
    if (phaseRef.current !== "playing" || pickedRef.current !== null) return;
    const opt = round[idx]?.options[i];
    if (!opt) return;
    pickedRef.current = i;
    setPicked(i);
    stats.current.attempted += 1;
    setAttempted(stats.current.attempted);
    if (opt.ok) {
      stats.current.correct += 1;
      setCorrect(stats.current.correct);
      streakRef.current += 1;
      setBestStreak((b) => Math.max(b, streakRef.current));
    } else {
      streakRef.current = 0;
    }
    setStreak(streakRef.current);
  }, [round, idx]);

  const next = useCallback(() => {
    if (idx + 1 >= round.length) { finish(); return; }
    pickedRef.current = null;
    setPicked(null);
    setIdx(idx + 1);
  }, [idx, round.length, finish]);

  // focus the Next button once feedback is shown, so Enter/Space continues
  useEffect(() => {
    if (picked !== null) nextRef.current?.focus();
  }, [picked]);

  useEffect(() => {
    if (phase !== "playing") return undefined;
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (["1", "2", "3"].includes(e.key)) choose(Number(e.key) - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, choose]);

  const pct = useMemo(() => (msLeft / ROUND_MS) * 100, [msLeft]);
  const secs = Math.ceil(msLeft / 1000);

  return (
    <div className="mg-stack">
      <div className="mg-game-top">
        <Button variant="quiet" size="sm" icon={ArrowLeft} onClick={() => navigate("/games")}>Games</Button>
        {phase === "playing" && (
          <div className="mg-row-wrap">
            <span className="mg-badge violet"><Check size={12} /> {correct}/{attempted}</span>
            <span className="mg-badge mild"><Flame size={12} /> Streak {streak}</span>
            <span className="mg-badge calm"><Timer size={12} /> {secs}s</span>
          </div>
        )}
      </div>

      {phase === "intro" && (
        <Card tint="violet" glow className="mg-fade-up">
          <div className="mg-stack" style={{ alignItems: "flex-start" }}>
            <div className="mg-icon-tile violet" style={{ width: 54, height: 54 }}><Lightbulb size={26} /></div>
            <h1 className="mg-h1">Thought Reframe</h1>
            <p className="mg-muted">
              When we're stressed, our minds play tricks called thinking traps. You'll see a worried thought. Pick the
              most realistic, balanced reframe. You get 60 seconds of thinking time, and you'll learn each trap's name
              as you go.
            </p>
            <p className="mg-small mg-faint">Tip: press <span className="mg-kbd">1</span> <span className="mg-kbd">2</span> <span className="mg-kbd">3</span> to answer.</p>
            <Button variant="violet" size="lg" icon={ArrowRight} onClick={start}>Start</Button>
          </div>
        </Card>
      )}

      {phase === "playing" && item && (
        <Card className="mg-fade-up" key={idx}>
          <div className="mg-stack">
            <div className={`mg-timebar ${pct < 20 ? "low" : ""}`} role="progressbar" aria-label="Time left" aria-valuemin={0} aria-valuemax={60} aria-valuenow={secs}>
              <i style={{ width: `${pct}%` }} />
            </div>
            <div>
              <div className="mg-eyebrow" style={{ marginBottom: 8 }}>Thought {idx + 1} of {round.length}</div>
              <div className="mg-thought">“{item.thought}”</div>
            </div>
            <div className="mg-eyebrow">Which is the most realistic reframe?</div>
            <div className="mg-stack-sm" role="group" aria-label="Reframe options">
              {item.options.map((o, i) => {
                const state = picked === null ? "" : o.ok ? "right" : picked === i ? "wrong" : "dim";
                return (
                  <button key={i} type="button" className={`mg-opt ${state}`} disabled={picked !== null} onClick={() => choose(i)}>
                    <span className="k">{state === "right" ? <Check size={14} /> : i + 1}</span>
                    <span>{o.text}</span>
                  </button>
                );
              })}
            </div>

            {picked !== null && (
              <div className={`mg-feedback ${item.options[picked].ok ? "ok" : "no"}`} role="status" aria-live="polite">
                <div className="mg-h3">
                  {item.options[picked].ok ? "Yes, nicely reframed" : "Not quite. That's okay."}
                </div>
                <p className="mg-small mg-muted" style={{ marginTop: 4 }}>
                  This was <b>{item.distortion}</b>. {item.why}
                </p>
                {!item.options[picked].ok && (
                  <p className="mg-small" style={{ marginTop: 6 }}>
                    <b>Best reframe:</b> {item.best}
                  </p>
                )}
                <div style={{ marginTop: 12 }}>
                  <button ref={nextRef} type="button" className="mg-btn violet sm" onClick={next}>
                    {idx + 1 >= round.length ? "Finish" : "Next thought"} <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {phase === "done" && (
        <Card glow tint="teal" className="mg-fade-up" style={{ textAlign: "center" }}>
          <div className="mg-stack" style={{ alignItems: "center" }}>
            <div className="mg-big-num mg-gradient-text" style={{ fontSize: 56, fontWeight: 800, lineHeight: 1 }}>{correct}/{attempted}</div>
            <h2 className="mg-h2">{attempted === 0 ? "No worries, you can try again anytime" : "reframes landed"}</h2>
            {bestStreak > 1 && <span className="mg-badge violet"><Flame size={12} /> Best streak {bestStreak}</span>}
            <p className="mg-muted" style={{ maxWidth: 420 }}>{takeaway}</p>
            <p className="mg-small mg-muted" aria-live="polite">
              {saving
                ? "Watering your garden…"
                : reward
                  ? reward.awarded > 0 ? `+${reward.awarded} garden points 🌱` : "Daily garden points reached. The garden thanks you."
                  : ""}
            </p>
            <div className="mg-row-wrap" style={{ justifyContent: "center" }}>
              <Button variant="violet" icon={RotateCcw} onClick={start} disabled={saving}>Play again</Button>
              <Button variant="ghost" onClick={() => navigate("/games")}>Back to games</Button>
              <Button variant="ghost" icon={Flower2} onClick={() => navigate("/garden")}>Open garden</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
