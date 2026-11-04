// 4-7-8 breathing with a visual inhale / hold / exhale pacer.
// All display state is derived from one `elapsed` seconds counter, so the timer
// has no side effects inside state updaters (safe under React StrictMode).
import React, { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { api } from "../api";
import { useApp } from "../lib/store";
import { Button } from "./ui";
import { rewardToast } from "./rewards";

function phaseAt(elapsed, inhale, hold, exhale) {
  const cycle = inhale + hold + exhale;
  const inCycle = elapsed % cycle;
  if (inCycle < inhale) return { key: "inhale", label: "Breathe in", left: inhale - inCycle, scale: 1.55, seconds: inhale };
  if (inCycle < inhale + hold) return { key: "hold", label: "Hold", left: inhale + hold - inCycle, scale: 1.55, seconds: hold };
  return { key: "exhale", label: "Breathe out", left: cycle - inCycle, scale: 1, seconds: exhale };
}

export default function BreathingWidget({ inhale = 4, hold = 7, exhale = 8, rounds = 4 }) {
  const { setGarden, toast } = useApp();
  const cycle = inhale + hold + exhale;
  const total = cycle * rounds;
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const startedAt = useRef(0);
  const rewarded = useRef(false);

  const done = elapsed >= total;

  useEffect(() => {
    if (!running) return undefined;
    const id = window.setInterval(() => setElapsed((e) => Math.min(total, e + 1)), 1000);
    return () => window.clearInterval(id);
  }, [running, total]);

  // finishing is an effect of `done`, not of a state updater
  useEffect(() => {
    if (!done || rewarded.current) return;
    rewarded.current = true;
    setRunning(false);
    const secs = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
    api.completeGame("breathing", rounds, secs)
      .then((res) => { setGarden(res.garden); rewardToast(toast, res); })
      .catch(() => { /* the reward is a bonus; never block the exercise */ });
  }, [done, rounds, setGarden, toast]);

  function start() {
    rewarded.current = false;
    startedAt.current = Date.now();
    setElapsed(0);
    setRunning(true);
  }
  function reset() {
    setRunning(false);
    setElapsed(0);
    rewarded.current = false;
  }

  const phase = phaseAt(Math.min(elapsed, total - 1), inhale, hold, exhale);
  const round = Math.min(rounds, Math.floor(elapsed / cycle) + 1);
  const started = elapsed > 0 || running;
  const orbScale = running ? phase.scale : 1;
  const duration = running ? phase.seconds : 0.6;

  return (
    <div style={{ textAlign: "center" }}>
      <div className="mg-breath-stage" aria-hidden="true">
        <div className="mg-breath-ring" />
        <div className="mg-breath-orb" style={{ transform: `scale(${orbScale})`, transitionDuration: `${duration}s` }} />
      </div>
      <div aria-live="polite" style={{ minHeight: 56 }}>
        {done ? (
          <>
            <div className="mg-h2">Beautifully done</div>
            <div className="mg-muted mg-small">{rounds} rounds of 4-7-8. Notice how your shoulders feel.</div>
          </>
        ) : running ? (
          <>
            <div className="mg-h2">{phase.label}</div>
            <div className="mg-muted mg-small">{Math.ceil(phase.left)}s · round {round} of {rounds}</div>
          </>
        ) : (
          <>
            <div className="mg-h3">{started ? "Paused" : `Inhale ${inhale} · Hold ${hold} · Exhale ${exhale}`}</div>
            <div className="mg-muted mg-small">{rounds} slow rounds · about {Math.round((total / 60) * 10) / 10} min</div>
          </>
        )}
      </div>
      <div className="mg-row-wrap" style={{ justifyContent: "center", marginTop: 12 }}>
        {running ? (
          <Button variant="ghost" icon={Pause} onClick={() => setRunning(false)}>Pause</Button>
        ) : (
          <Button variant="teal" icon={Play} onClick={started && !done ? () => setRunning(true) : start}>
            {done ? "Go again" : started ? "Resume" : "Start breathing"}
          </Button>
        )}
        {(started || done) && <Button variant="quiet" icon={RotateCcw} onClick={reset}>Reset</Button>}
      </div>
    </div>
  );
}
