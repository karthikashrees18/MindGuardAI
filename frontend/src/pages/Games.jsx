// Mini-games hub.
import React, { useEffect } from "react";
import { Brain, Clock, Flower2, Sparkles, Sprout } from "lucide-react";
import { useApp } from "../lib/store";
import { navigate } from "../lib/router";
import { Button, Card, PageHeader } from "../components/ui";
import "../styles/games.css";

const GAMES = [
  {
    path: "/games/bubble",
    icon: Sparkles,
    tone: "teal",
    title: "Zen Bubble Pop",
    benefit: "Pop anxious thoughts and watch them melt into calm affirmations.",
    time: "1 min",
    cta: "Play",
  },
  {
    path: "/games/reframe",
    icon: Brain,
    tone: "violet",
    title: "Thought Reframe",
    benefit: "Spot the thinking trap and pick the realistic reframe. Learn as you play.",
    time: "1 min",
    cta: "Play",
  },
  {
    path: "/garden",
    icon: Flower2,
    tone: "amber",
    title: "Wellness Garden",
    benefit: "Your plant grows with every check-in and game. It rests, never wilts.",
    time: "30 sec",
    cta: "Open",
  },
];

export default function Games() {
  const { garden, refreshGarden } = useApp();

  useEffect(() => { refreshGarden(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mg-stack">
      <PageHeader eyebrow="Take a breather" title="Mini-games" subtitle="Short, gentle, and good for you. No scores to beat, no way to lose." />

      <div className="mg-grid mg-grid-3 mg-stagger">
        {GAMES.map(({ path, icon: Icon, tone, title, benefit, time, cta }) => (
          <Card
            key={path}
            lift
            tint={tone}
            className="mg-game-card"
            role="link"
            tabIndex={0}
            aria-label={`${cta} ${title}`}
            onClick={() => navigate(path)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(path); } }}
          >
            <div className={`mg-icon-tile ${tone}`}><Icon size={26} /></div>
            <div>
              <div className="mg-h2">{title}</div>
              <p className="mg-muted" style={{ marginTop: 6 }}>{benefit}</p>
            </div>
            <div className="foot">
              <span className="mg-badge violet"><Clock size={12} /> {time}</span>
              <Button variant={tone === "amber" ? "ghost" : tone} size="sm" tabIndex={-1} aria-hidden="true">{cta}</Button>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="mg-row" style={{ alignItems: "flex-start" }}>
          <div className="mg-icon-tile teal"><Sprout size={20} /></div>
          <div className="mg-grow">
            {garden ? (
              <div className="mg-h3">
                Your garden: {garden.stage_label} · {garden.growth_points} growth points
                {garden.game_points > 0 ? ` (${garden.game_points} from games)` : ""}
              </div>
            ) : (
              <div className="mg-h3">Garden points earned from games today: up to 30</div>
            )}
            <p className="mg-muted mg-small" style={{ marginTop: 3 }}>
              Game points are capped at 30/day so the garden rewards showing up, not grinding.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
