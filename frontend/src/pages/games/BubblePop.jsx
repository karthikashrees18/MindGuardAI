// Zen Bubble Pop — a calm 60-second canvas game. Anxious thoughts float up in
// glowing bubbles; popping one turns it into a concrete, doable reframe.
// No fail state: missed bubbles simply drift away.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Flower2, Hand, RotateCcw, Sparkles, Volume2, VolumeX } from "lucide-react";
import { api } from "../../api";
import { useApp } from "../../lib/store";
import { navigate } from "../../lib/router";
import { Button } from "../../components/ui";
import "../../styles/games.css";

const ROUND_SECONDS = 60;

// Each bubble pairs a realistic student worry with a concrete, doable reframe
// that appears when the bubble is popped.
const THOUGHTS = [
  { thought: "Everyone else already got placed", reframe: "Timelines differ. Pick one company to research today and apply." },
  { thought: "I'm completely behind on my project", reframe: "Behind isn't stuck. Split it up and finish just the next small part." },
  { thought: "What if I blank out in the viva?", reframe: "Prepare 3 core points. If you blank, pause and say it's a good question." },
  { thought: "I feel like an imposter in my branch", reframe: "Your seat was earned. Ask one doubt today; most people share it." },
  { thought: "My attendance is low and I can't catch up", reframe: "Email your professor about make-up options. Asking early helps." },
  { thought: "I have no energy left for today", reframe: "Do one 10-minute task, then rest. Small counts on low-energy days." },
  { thought: "My CGPA is ruining my chances", reframe: "Projects, skills and interviews count too. Add one this week." },
  { thought: "I bombed the interview, I'm hopeless", reframe: "Write down 2 questions you'd answer better, then practice those." },
  { thought: "Everyone understood that lecture but me", reframe: "Ask a classmate to explain one concept. Teaching helps them too." },
  { thought: "I can't focus for more than 5 minutes", reframe: "Try a 20-minute timer, phone away. Build up from there." },
  { thought: "I'll never finish this backlog", reframe: "List the papers, order them by date, and start with the nearest." },
  { thought: "My friends are all doing better than me", reframe: "You're comparing your behind-the-scenes to their highlights." },
  { thought: "I haven't slept properly in days", reframe: "Tonight: screens off 30 minutes early. Sleep fuels everything else." },
  { thought: "I'm wasting my parents' money", reframe: "You're learning every day. Show up for one class and one task." },
];

// [h, s, l] — teal, violet, lavender, soft blue
const HUES = [[172, 72, 62], [258, 85, 74], [266, 100, 86], [200, 80, 68], [285, 70, 78]];
const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];

// Mute lives in memory for the whole session (not localStorage).
let mutedInMemory = false;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function wrapText(ctx, text, maxW) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export default function BubblePop() {
  const { setGarden, toast } = useApp();
  const [phase, setPhase] = useState("intro"); // intro | playing | done
  const [popped, setPopped] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [muted, setMuted] = useState(mutedInMemory);
  const [reward, setReward] = useState(null);
  const [saving, setSaving] = useState(false);
  const [announce, setAnnounce] = useState("");

  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const engine = useRef(null);
  const alive = useRef(true);
  const mutedRef = useRef(mutedInMemory);
  const phaseRef = useRef("intro");
  const startRoundRef = useRef(null);
  const popNextRef = useRef(null);

  const setPhaseBoth = (p) => { phaseRef.current = p; setPhase(p); };

  // ---- audio (lazy, created on first user gesture) -------------------------------
  const audioRef = useRef(null);
  const playPop = useCallback((step) => {
    if (mutedRef.current) return;
    try {
      if (!audioRef.current) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audioRef.current = new AC();
      }
      const ac = audioRef.current;
      if (ac.state === "suspended") ac.resume();
      const t = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(NOTES[Math.min(step, NOTES.length - 1)], t);
      osc.frequency.exponentialRampToValueAtTime(NOTES[Math.min(step, NOTES.length - 1)] * 0.62, t + 0.16);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.09, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.connect(gain).connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    } catch { /* audio is a nicety, never fatal */ }
  }, []);

  const toggleMute = () => {
    mutedInMemory = !mutedInMemory;
    mutedRef.current = mutedInMemory;
    setMuted(mutedInMemory);
  };

  // ---- finish the round: persist + reward -------------------------------------------
  const finish = useCallback(async (count, seconds) => {
    setPhaseBoth("done");
    setSaving(true);
    setAnnounce(`Round complete. ${count} anxious thoughts turned into calm.`);
    try {
      const res = await api.completeGame("bubble_pop", count, seconds);
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

  // ---- the engine: one effect, one rAF loop, full cleanup -------------------------------
  useEffect(() => {
    alive.current = true;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return undefined;
    const ctx = canvas.getContext("2d");
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const s = {
      w: 0, h: 0, dpr: 1,
      bubbles: [], particles: [], floaters: [], rings: [],
      spawnIn: 0.4, elapsed: 0, left: ROUND_SECONDS, lastSecond: ROUND_SECONDS,
      popped: 0, combo: 0, lastPopAt: -10, lastThought: "", lastAffirm: "", running: false,
    };
    engine.current = s;

    const resize = () => {
      const r = stage.getBoundingClientRect();
      s.dpr = Math.min(window.devicePixelRatio || 1, 2);
      s.w = Math.max(1, r.width);
      s.h = Math.max(1, r.height);
      canvas.width = Math.round(s.w * s.dpr);
      canvas.height = Math.round(s.h * s.dpr);
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(stage);

    const speedK = reduced ? 0.5 : 1;

    function spawn() {
      const small = s.w < 520;
      const r = rand(small ? 50 : 64, small ? 60 : 76);
      let item = pick(THOUGHTS);
      if (item === s.lastThought) item = pick(THOUGHTS);
      s.lastThought = item;
      const text = item.thought;
      ctx.font = `600 ${r * 0.21}px Inter, system-ui, sans-serif`;
      let fs = r * 0.21;
      let lines = wrapText(ctx, text, r * 1.7);
      while (lines.length > 3 && fs > 8) {
        fs -= 1;
        ctx.font = `600 ${fs}px Inter, system-ui, sans-serif`;
        lines = wrapText(ctx, text, r * 1.7);
      }
      s.bubbles.push({
        x: rand(r + 6, s.w - r - 6), y: s.h + r + 4, r, vy: rand(26, 46) * speedK,
        amp: rand(10, 26) * (reduced ? 0.5 : 1), freq: rand(0.5, 1.1), phase: rand(0, Math.PI * 2), t: 0, x0: 0,
        hue: pick(HUES), text, reframe: item.reframe, lines, fs, born: s.elapsed,
      });
      s.bubbles[s.bubbles.length - 1].x0 = s.bubbles[s.bubbles.length - 1].x;
    }

    function burst(b) {
      const [h, sat, l] = b.hue;
      const n = reduced ? 6 : 16;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand(-0.2, 0.2);
        const sp = rand(40, 130) * (reduced ? 0.5 : 1);
        s.particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 10, life: 0, max: rand(0.5, 0.95), r: rand(1.8, 4), c: `${h}, ${sat}%, ${l}%` });
      }
      s.rings.push({ x: b.x, y: b.y, r: b.r * 0.8, life: 0, max: 0.45, c: `${h}, ${sat}%, ${l}%` });
    }

    function popBubble(b) {
      const i = s.bubbles.indexOf(b);
      if (i < 0) return;
      s.bubbles.splice(i, 1);
      burst(b);
      const aff = b.reframe;
      s.floaters.push({ x: b.x, y: b.y, text: aff, life: 0, max: reduced ? 4.5 : 4, hue: b.hue, fs: 14 });

      if (phaseRef.current === "playing") {
        s.combo = s.elapsed - s.lastPopAt < 1.7 ? s.combo + 1 : 1;
        s.lastPopAt = s.elapsed;
        s.popped += 1;
        setPopped(s.popped);
        setCombo(s.combo);
        setAnnounce(aff);
        playPop(Math.min(s.combo - 1, NOTES.length - 1));
      }
    }

    function hit(x, y) {
      // topmost = last drawn; generous hit radius for fingers
      for (let i = s.bubbles.length - 1; i >= 0; i--) {
        const b = s.bubbles[i];
        const dx = x - b.x;
        const dy = y - b.y;
        if (dx * dx + dy * dy <= (b.r * 1.12) ** 2) return b;
      }
      return null;
    }

    const onPointerDown = (e) => {
      if (phaseRef.current !== "playing") return;
      const r = canvas.getBoundingClientRect();
      const b = hit(e.clientX - r.left, e.clientY - r.top);
      if (b) { e.preventDefault(); popBubble(b); }
    };
    canvas.addEventListener("pointerdown", onPointerDown);

    popNextRef.current = () => {
      if (phaseRef.current !== "playing") return;
      let low = null;
      for (const b of s.bubbles) {
        if (b.y < s.h + b.r * 0.2 && b.y > -b.r * 0.3 && (!low || b.y > low.y)) low = b;
      }
      if (low) popBubble(low);
    };

    startRoundRef.current = () => {
      s.bubbles = []; s.particles = []; s.floaters = []; s.rings = [];
      s.elapsed = 0; s.left = ROUND_SECONDS; s.lastSecond = ROUND_SECONDS; s.popped = 0; s.combo = 0; s.lastPopAt = -10;
      s.spawnIn = 0.2; s.running = true;
      setPopped(0); setCombo(0); setTimeLeft(ROUND_SECONDS); setReward(null);
      setAnnounce("Round started. Pop the thoughts that weigh on you.");
      // seed a few bubbles already on screen so it never feels empty
      for (let i = 0; i < 4; i++) { spawn(); const b = s.bubbles[i]; b.y = rand(s.h * 0.35, s.h * 0.95); b.x0 = b.x; }
      setPhaseBoth("playing");
    };

    // seed ambience for the intro screen
    for (let i = 0; i < 5; i++) { spawn(); const b = s.bubbles[i]; b.y = rand(s.h * 0.2, s.h * 0.95); }

    // ---- loop ---------------------------------------------------------------------------
    let raf = 0;
    let last = performance.now();
    const maxBubbles = () => (s.w < 520 ? 7 : 10);

    function drawBubble(b) {
      const [h, sat, l] = b.hue;
      const g = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.1, b.x, b.y, b.r);
      g.addColorStop(0, `hsla(${h}, ${sat}%, ${l + 14}%, 0.34)`);
      g.addColorStop(0.7, `hsla(${h}, ${sat}%, ${l}%, 0.22)`);
      g.addColorStop(1, `hsla(${h}, ${sat}%, ${l}%, 0.5)`);
      ctx.save();
      ctx.shadowColor = `hsla(${h}, ${sat}%, ${l}%, 0.55)`;
      ctx.shadowBlur = reduced ? 8 : 18;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = `hsla(${h}, ${sat}%, ${l + 10}%, 0.7)`;
      ctx.stroke();
      // glossy highlight
      ctx.beginPath();
      ctx.ellipse(b.x - b.r * 0.38, b.y - b.r * 0.46, b.r * 0.22, b.r * 0.12, -0.7, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fill();
      // thought text
      ctx.font = `600 ${b.fs}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255,255,255,0.94)";
      const lh = b.fs * 1.22;
      const top = b.y - ((b.lines.length - 1) * lh) / 2;
      b.lines.forEach((ln, i) => ctx.fillText(ln, b.x, top + i * lh));
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      s.elapsed += dt;
      const playing = phaseRef.current === "playing";

      // timer
      if (playing && s.running) {
        s.left = Math.max(0, s.left - dt);
        const sec = Math.ceil(s.left);
        if (sec !== s.lastSecond) { s.lastSecond = sec; setTimeLeft(sec); }
        if (s.left <= 0) {
          s.running = false;
          finish(s.popped, ROUND_SECONDS);
        }
      }

      // spawn: gentle in-round, sparse ambience otherwise
      s.spawnIn -= dt;
      if (s.spawnIn <= 0) {
        const cap = playing ? maxBubbles() : 5;
        if (s.bubbles.length < cap) spawn();
        s.spawnIn = (playing ? rand(0.7, 1.3) : rand(1.6, 2.6)) / (reduced ? 0.7 : 1);
      }

      // update
      for (let i = s.bubbles.length - 1; i >= 0; i--) {
        const b = s.bubbles[i];
        b.t += dt;
        b.y -= b.vy * dt;
        b.x = b.x0 + Math.sin(b.t * b.freq * 2 + b.phase) * b.amp;
        if (b.y < -b.r - 10) s.bubbles.splice(i, 1);
      }
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.life += dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.96; p.vy = p.vy * 0.96 - 14 * dt;
        if (p.life >= p.max) s.particles.splice(i, 1);
      }
      for (let i = s.rings.length - 1; i >= 0; i--) {
        const r = s.rings[i];
        r.life += dt;
        if (r.life >= r.max) s.rings.splice(i, 1);
      }
      for (let i = s.floaters.length - 1; i >= 0; i--) {
        const f = s.floaters[i];
        f.life += dt;
        f.y -= (reduced ? 16 : 26) * dt;
        if (f.life >= f.max) s.floaters.splice(i, 1);
      }

      // draw
      ctx.clearRect(0, 0, s.w, s.h);
      s.bubbles.forEach(drawBubble);
      for (const r of s.rings) {
        const k = r.life / r.max;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r + k * 34, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${r.c}, ${0.55 * (1 - k)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      for (const p of s.particles) {
        const k = 1 - p.life / p.max;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (0.4 + k * 0.6), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.c}, ${k * 0.9})`;
        ctx.fill();
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const f of s.floaters) {
        const k = f.life / f.max;
        const alpha = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.55) / 0.45);
        ctx.font = `700 ${f.fs}px Inter, system-ui, sans-serif`;
        const maxW = Math.min(230, s.w - 24);
        const flines = wrapText(ctx, f.text, maxW);
        const x = Math.min(s.w - maxW / 2 - 8, Math.max(maxW / 2 + 8, f.x));
        const lh = f.fs * 1.3;
        const y0 = Math.max(lh, f.y - (flines.length - 1) * lh / 2);
        ctx.save();
        ctx.shadowColor = `hsla(${f.hue[0]}, 90%, 70%, ${0.7 * alpha})`;
        ctx.shadowBlur = 14;
        ctx.fillStyle = `rgba(246, 250, 255, ${alpha})`;
        flines.forEach((ln, i) => ctx.fillText(ln, x, y0 + i * lh));
        ctx.restore();
      }
    }
    raf = requestAnimationFrame((t) => { last = t; frame(t); });

    return () => {
      alive.current = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      engine.current = null;
      startRoundRef.current = null;
      popNextRef.current = null;
      if (audioRef.current) {
        try { audioRef.current.close(); } catch { /* ignore */ }
        audioRef.current = null;
      }
    };
  }, [finish, playPop]);

  // Space pops the lowest thought when nothing else has focus.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== " " || phaseRef.current !== "playing") return;
      const t = document.activeElement;
      if (t && t !== document.body && t.tagName !== "DIV") return;
      e.preventDefault();
      popNextRef.current?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const begin = () => startRoundRef.current?.();
  const endEarly = () => {
    const s = engine.current;
    if (!s || phaseRef.current !== "playing") return;
    s.running = false;
    finish(s.popped, Math.max(1, Math.round(ROUND_SECONDS - s.left)));
  };

  const circ = 2 * Math.PI * 20;
  const frac = timeLeft / ROUND_SECONDS;

  return (
    <div className="mg-stack">
      <div className="mg-game-top">
        <Button variant="quiet" size="sm" icon={ArrowLeft} onClick={() => navigate("/games")}>Games</Button>
        <div className="mg-row">
          {phase === "playing" && <Button variant="quiet" size="sm" onClick={endEarly}>End round</Button>}
          <Button variant="ghost" size="sm" icon={muted ? VolumeX : Volume2} onClick={toggleMute} aria-label={muted ? "Unmute pop sounds" : "Mute pop sounds"} aria-pressed={muted}>
            {muted ? "Muted" : "Sound on"}
          </Button>
        </div>
      </div>

      <div className="mg-game-stage mg-bubble-stage" ref={stageRef}>
        <canvas ref={canvasRef} aria-label="Floating bubbles, each holding an anxious thought. Tap one to pop it." />

        {phase === "playing" && (
          <div className="mg-bubble-hud">
            <div className="mg-timer-ring" role="timer" aria-label={`${timeLeft} seconds left`}>
              <svg viewBox="0 0 46 46" width="46" height="46">
                <circle cx="23" cy="23" r="20" fill="rgba(8,12,30,0.4)" stroke="rgba(255,255,255,0.14)" strokeWidth="3.5" />
                <circle cx="23" cy="23" r="20" fill="none" stroke="#5eead4" strokeWidth="3.5" strokeLinecap="round"
                  strokeDasharray={circ} strokeDashoffset={circ * (1 - frac)} style={{ transition: "stroke-dashoffset 1s linear" }} />
              </svg>
              <b>{timeLeft}</b>
            </div>
            <div className={`pill mg-combo ${combo >= 3 ? "on" : ""}`}><Sparkles size={14} /> Flow x{combo}</div>
            <div className="pill">{popped} popped</div>
          </div>
        )}

        {phase === "intro" && (
          <div className="mg-stage-overlay">
            <div className="box">
              <div className="mg-icon-tile teal" style={{ width: 58, height: 58, borderRadius: 18 }}><Sparkles size={28} /></div>
              <h1 className="mg-h1">Zen Bubble Pop</h1>
              <p className="muted">
                Anxious thoughts are floating by. Tap or click a bubble to pop it and watch the thought turn into
                something kinder. One minute, no pressure, no way to lose.
              </p>
              <div className="muted mg-small"><Hand size={13} style={{ verticalAlign: "-2px" }} /> Prefer the keyboard? Use the “Pop next thought” button or Space.</div>
              <Button variant="teal" size="lg" icon={Sparkles} onClick={begin}>Begin</Button>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="mg-stage-overlay">
            <div className="box">
              <div className="mg-big-num mg-gradient-text">{popped}</div>
              <h2 className="mg-h2">{popped === 1 ? "1 anxious thought" : `${popped} anxious thoughts`} turned into calm</h2>
              <p className="muted mg-small" aria-live="polite">
                {saving
                  ? "Watering your garden…"
                  : reward
                    ? reward.awarded > 0
                      ? `+${reward.awarded} garden points 🌱`
                      : "Daily garden points reached. The garden thanks you."
                    : "Nicely done."}
              </p>
              <div className="mg-row-wrap" style={{ justifyContent: "center" }}>
                <Button variant="teal" icon={RotateCcw} onClick={begin} disabled={saving}>Play again</Button>
                <Button variant="ghost" onClick={() => navigate("/games")}>Back to games</Button>
                <Button variant="ghost" icon={Flower2} onClick={() => navigate("/garden")}>Open garden</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mg-row-wrap mg-between">
        <Button variant="violet" onClick={() => popNextRef.current?.()} disabled={phase !== "playing"}>
          Pop next thought
        </Button>
        <span className="mg-small mg-faint">Missed bubbles just drift away. That's okay.</span>
      </div>

      <div className="mg-sr-only" aria-live="polite" role="status">{announce}</div>
    </div>
  );
}
