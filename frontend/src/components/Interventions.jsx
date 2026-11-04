// Renders the intervention cards returned by the backend's smart intervention
// engine (backend/app/interventions/engine.py): mood-shifting music, 4-7-8
// breathing, Pomodoro reset, mini-games, reframing prompt, counselor connect.
import React, { useState } from "react";
import { Brain, Clock, Gamepad2, HeartHandshake, Music, NotebookPen, Wind } from "lucide-react";
import { navigate } from "../lib/router";
import { Button, Card } from "./ui";
import BreathingWidget from "./BreathingWidget";
import MusicPlayer from "./MusicPlayer";
import PomodoroWidget from "./PomodoroWidget";
import { ConnectModal } from "./EarlyWarning";

const ICONS = {
  music: [Music, "violet"],
  breathing: [Wind, "teal"],
  pomodoro: [Clock, "violet"],
  game_bubble: [Gamepad2, "teal"],
  game_reframe: [Brain, "amber"],
  journal_prompt: [NotebookPen, "violet"],
  counselor: [HeartHandshake, "coral"],
};

function CardShell({ card, children, tint, span }) {
  const [Icon, tone] = ICONS[card.type] || [Music, "violet"];
  return (
    <Card tint={tint} className="mg-fade-up" style={span ? { gridColumn: "1 / -1" } : undefined}>
      <div className="mg-row" style={{ alignItems: "flex-start", marginBottom: children ? 14 : 0 }}>
        <div className={`mg-icon-tile ${tone}`}><Icon size={20} /></div>
        <div className="mg-grow">
          <div className="mg-h3">{card.title}</div>
          <div className="mg-muted mg-small" style={{ marginTop: 2 }}>{card.subtitle}</div>
        </div>
      </div>
      {children}
    </Card>
  );
}

function ExpandCard({ card, label, children, tint }) {
  const [open, setOpen] = useState(false);
  return (
    <CardShell card={card} tint={tint}>
      {open ? (
        <>{children}<div style={{ marginTop: 10, textAlign: "center" }}><Button variant="quiet" size="sm" onClick={() => setOpen(false)}>Close</Button></div></>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>{label}</Button>
      )}
    </CardShell>
  );
}

/** props: cards[] from the API; `only` limits to certain types; `musicOverride` swaps the music tracks (Calm Space picker). */
export default function InterventionCards({ cards = [], only, musicOverride }) {
  const [connectOpen, setConnectOpen] = useState(false);
  const list = only ? cards.filter((c) => only.includes(c.type)) : cards;

  return (
    <>
      <div className="mg-grid mg-grid-2">
        {list.map((card) => {
          switch (card.type) {
            case "music": {
              const payload = musicOverride || card.payload;
              return (
                <CardShell key={card.id} card={card} tint="violet" span>
                  <MusicPlayer transition={payload.transition} tracks={payload.tracks} />
                </CardShell>
              );
            }
            case "breathing":
              return (
                <ExpandCard key={card.id} card={card} label="Start the pacer" tint="teal">
                  <BreathingWidget {...card.payload} />
                </ExpandCard>
              );
            case "pomodoro":
              return (
                <ExpandCard key={card.id} card={card} label="Start a 5-min break">
                  <PomodoroWidget minutes={card.payload?.minutes || 5} />
                </ExpandCard>
              );
            case "game_bubble":
              return (
                <CardShell key={card.id} card={card}>
                  <Button variant="teal" size="sm" onClick={() => navigate("/games/bubble")}>Play Bubble Pop</Button>
                </CardShell>
              );
            case "game_reframe":
              return (
                <CardShell key={card.id} card={card}>
                  <Button variant="violet" size="sm" onClick={() => navigate("/games/reframe")}>Play Thought Reframe</Button>
                </CardShell>
              );
            case "journal_prompt":
              return (
                <CardShell key={card.id} card={card}>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => {
                      try { sessionStorage.setItem("mg_prompt", card.payload?.prompt || card.subtitle); } catch { /* ignore */ }
                      navigate("/checkin");
                    }}
                  >
                    Write about it
                  </Button>
                </CardShell>
              );
            case "counselor":
              return (
                <CardShell key={card.id} card={card} tint="coral">
                  <Button variant="coral" size="sm" icon={HeartHandshake} onClick={() => setConnectOpen(true)}>Connect confidentially</Button>
                </CardShell>
              );
            default:
              return null;
          }
        })}
      </div>
      <ConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} />
    </>
  );
}
