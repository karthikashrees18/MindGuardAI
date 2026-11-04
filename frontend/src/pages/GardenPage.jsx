// Wellness garden: your plant, your streak, and a no-pressure reminder.
import React, { useEffect } from "react";
import { Check, Droplets, Flame, Gamepad2, Leaf, Moon, NotebookPen, Sprout, Trophy } from "lucide-react";
import { useApp } from "../lib/store";
import { navigate } from "../lib/router";
import { Button, Card, PageHeader, Skeleton } from "../components/ui";
import { GardenPlant } from "../components/Garden";
import "../styles/games.css";
import "../styles/home.css";

const DAY = ["S", "M", "T", "W", "T", "F", "S"];

function dayLetter(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return DAY[d.getUTCDay()];
}

export default function GardenPage() {
  const { garden, refreshGarden } = useApp();

  useEffect(() => { refreshGarden(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!garden) {
    return (
      <div className="mg-stack">
        <PageHeader eyebrow="Your space" title="Wellness garden" subtitle="Growing quietly, at your pace." />
        <div className="mg-grid mg-grid-2">
          <Skeleton height={340} style={{ borderRadius: 22 }} />
          <Skeleton height={340} style={{ borderRadius: 22 }} />
        </div>
      </div>
    );
  }

  const more = garden.next_stage_at != null ? Math.max(0, garden.next_stage_at - garden.growth_points) : 0;
  const today = garden.last_7_days?.[garden.last_7_days.length - 1]?.date;

  return (
    <div className="mg-stack">
      <PageHeader eyebrow="Your space" title="Wellness garden" subtitle="Growing quietly, at your pace." />

      <div className="mg-grid mg-grid-main-r">
        <Card glow className="mg-fade-up" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ width: "100%", maxWidth: 340, borderRadius: 20, overflow: "hidden" }}>
            <GardenPlant stage={garden.stage} size={340} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div className="mg-h2">{garden.stage_label}</div>
            <p className="mg-muted" style={{ marginTop: 4 }}>{garden.message}</p>
          </div>
        </Card>

        <div className="mg-stack">
          <Card>
            <div className="mg-row mg-between" style={{ marginBottom: 10 }}>
              <div className="mg-h3">{garden.next_stage_label ? `Growing toward ${garden.next_stage_label}` : "Fully grown"}</div>
              <span className="mg-small mg-faint">{garden.progress_pct}%</span>
            </div>
            <div className="mg-progress" role="progressbar" aria-valuenow={garden.progress_pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to next stage">
              <i style={{ width: `${garden.progress_pct}%` }} />
            </div>
            <p className="mg-small mg-muted" style={{ marginTop: 8 }}>
              {garden.next_stage_label
                ? `${more} more growth point${more === 1 ? "" : "s"} to reach ${garden.next_stage_label}.`
                : "Your tree is flourishing. Keep enjoying it."}
            </p>

            <div className="mg-grid mg-grid-2" style={{ marginTop: 18, gap: 14 }}>
              <div className="mg-stat"><b><Flame size={18} style={{ verticalAlign: "-2px", color: "var(--amber)" }} /> {garden.streak}</b><span>Current streak (days)</span></div>
              <div className="mg-stat"><b><Trophy size={18} style={{ verticalAlign: "-2px", color: "var(--violet)" }} /> {garden.longest_streak}</b><span>Longest streak</span></div>
              <div className="mg-stat"><b><Leaf size={18} style={{ verticalAlign: "-2px", color: "var(--teal)" }} /> {garden.checkin_days}</b><span>Check-in days</span></div>
              <div className="mg-stat"><b><Gamepad2 size={18} style={{ verticalAlign: "-2px", color: "var(--coral)" }} /> {garden.game_points}</b><span>Game points</span></div>
            </div>
          </Card>

          <Card>
            <div className="mg-h3" style={{ marginBottom: 12 }}>This week</div>
            <div className="mg-week" role="list">
              {(garden.last_7_days || []).map((d) => (
                <div key={d.date} role="listitem" className={`d ${d.date === today ? "today" : ""}`} aria-label={`${d.date}: ${d.checked_in ? "checked in" : "resting"}`}>
                  <div className={`dot ${d.checked_in ? "on" : ""}`}>
                    {d.checked_in ? <Leaf size={16} /> : <Moon size={13} />}
                  </div>
                  {dayLetter(d.date)}
                </div>
              ))}
            </div>
            <p className="mg-small mg-muted" style={{ marginTop: 14 }}>
              Missed a day? Your plant just rests. It never wilts. One rest day won't break your streak.
            </p>
          </Card>

          <Card tint="teal">
            {garden.checked_in_today ? (
              <div className="mg-row">
                <div className="mg-icon-tile teal"><Check size={20} /></div>
                <div>
                  <div className="mg-h3">Watered today ✓</div>
                  <p className="mg-small mg-muted">Lovely. Your garden is happy. Come back tomorrow, or play a mini-game.</p>
                </div>
              </div>
            ) : (
              <div className="mg-row-wrap mg-between">
                <div className="mg-row">
                  <div className="mg-icon-tile teal"><Droplets size={20} /></div>
                  <div>
                    <div className="mg-h3">Your garden is ready for water</div>
                    <p className="mg-small mg-muted">A short check-in is all it takes.</p>
                  </div>
                </div>
                <Button variant="teal" icon={NotebookPen} onClick={() => navigate("/checkin")}>Check in to water your garden</Button>
              </div>
            )}
          </Card>

          <p className="mg-small mg-faint" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <Sprout size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            Each check-in day is worth 10 growth points. Mini-games add up to 30 a day.
          </p>
        </div>
      </div>
    </div>
  );
}
