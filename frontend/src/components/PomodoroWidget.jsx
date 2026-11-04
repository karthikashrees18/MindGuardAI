// 5-minute Pomodoro-style reset break with a calm countdown ring.
import React, { useEffect, useRef, useState } from "react";
import { Coffee, Droplets, Footprints, Pause, Play, RotateCcw, Wind } from "lucide-react";
import { api } from "../api";
import { useApp } from "../lib/store";
import { Button } from "./ui";
import { rewardToast } from "./rewards";

const TIPS = [
  { icon: Droplets, text: "Drink a glass of water" },
  { icon: Footprints, text: "Stand up and stretch your shoulders" },
  { icon: Wind, text: "Look out of a window — let your eyes rest far away" },
  { icon: Coffee, text: "No phone scrolling — this break is yours" },
];

export default function PomodoroWidget({ minutes = 5 }) {
  const total = minutes * 60;
  const { setGarden, toast } = useApp();
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const rewarded = useRef(false);

  useEffect(() => {
    if (!running) return undefined;
    const id = window.setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (left !== 0 || done) return;
    setRunning(false);
    setDone(true);
    if (rewarded.current) return;
    rewarded.current = true;
    api.completeGame("pomodoro", 1, total)
      .then((res) => { setGarden(res.garden); rewardToast(toast, res); })
      .catch(() => { /* reward is optional */ });
  }, [left, done, total, setGarden, toast]);

  function reset() {
    setRunning(false); setDone(false); setLeft(total); rewarded.current = false;
  }

  const size = 150, stroke = 9, r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  const frac = left / total;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div style={{ textAlign: "center" }}>
      <div className="mg-ring" style={{ width: size, height: size, margin: "4px auto 10px" }} role="timer" aria-label={`${mm}:${ss} remaining`}>
        <svg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
          <circle className="fg" cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--violet)" strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - frac)} style={{ transition: "stroke-dashoffset 1s linear" }} />
        </svg>
        <div className="num"><b style={{ fontSize: 32, color: "var(--text)" }}>{mm}:{ss}</b><small>{done ? "DONE" : running ? "RESET BREAK" : "READY"}</small></div>
      </div>

      {done ? (
        <p className="mg-muted mg-small" style={{ marginBottom: 10 }}>Break complete. Take one slow breath, then pick up just one small task.</p>
      ) : (
        <div className="mg-stack-sm" style={{ textAlign: "left", maxWidth: 320, margin: "0 auto 12px" }}>
          {TIPS.map(({ icon: Icon, text }) => (
            <div key={text} className="mg-row mg-small mg-muted"><Icon size={15} style={{ color: "var(--violet)" }} /> {text}</div>
          ))}
        </div>
      )}

      <div className="mg-row-wrap" style={{ justifyContent: "center" }}>
        {running ? (
          <Button variant="ghost" icon={Pause} onClick={() => setRunning(false)}>Pause</Button>
        ) : (
          <Button variant="violet" icon={Play} onClick={() => (done ? (reset(), setRunning(true)) : setRunning(true))}>
            {done ? "Another break" : left < total ? "Resume" : "Start 5-min break"}
          </Button>
        )}
        {(left < total || done) && <Button variant="quiet" icon={RotateCcw} onClick={reset}>Reset</Button>}
      </div>
    </div>
  );
}
