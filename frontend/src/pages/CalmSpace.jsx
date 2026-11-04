// Calm Space: the full intervention hub (music, breathing, Pomodoro, games,
// reframing prompt) tuned to the student's latest score.
import React, { useEffect, useState } from "react";
import { api } from "../api";
import { CATEGORY_META } from "../lib/constants";
import { Button, CategoryBadge, Card, PageHeader, Skeleton } from "../components/ui";
import { EarlyWarningBanner } from "../components/EarlyWarning";
import InterventionCards from "../components/Interventions";
import { navigate } from "../lib/router";

const DESTINATIONS = [
  { key: "calming", label: "Calm down" },
  { key: "grounded", label: "Ground myself" },
  { key: "focus", label: "Focus" },
  { key: "uplifting", label: "Lift my mood" },
];

export default function CalmSpace() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [dest, setDest] = useState(null);
  const [override, setOverride] = useState(null);
  const [loadingDest, setLoadingDest] = useState(false);

  useEffect(() => {
    let alive = true;
    api.interventions().then((d) => alive && setData(d)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, []);

  async function pick(key) {
    if (key === dest) { setDest(null); setOverride(null); return; }
    setDest(key);
    setLoadingDest(true);
    try {
      const rec = await api.recommendMusic(key);
      setOverride({ transition: rec.transition, tracks: rec.tracks });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingDest(false);
    }
  }

  const cat = data?.category?.key;

  return (
    <>
      <PageHeader title="Calm space" subtitle="Small, science-backed resets to interrupt a spiral — chosen for how you're doing." />
      <div className="mg-stack">
        <EarlyWarningBanner />

        {error && <div className="mg-error" role="alert">{error}</div>}

        {!data ? (
          !error && <Skeleton height={180} />
        ) : (
          <>
            <Card className="mg-row mg-between" style={{ flexWrap: "wrap" }}>
              <div>
                <div className="mg-eyebrow">Based on your latest entry</div>
                <div className="mg-row-wrap" style={{ marginTop: 8 }}>
                  {cat ? <CategoryBadge category={cat} /> : <span className="mg-badge violet">No entry yet</span>}
                  {data.score != null && <b>{data.score}/100</b>}
                  <span className="mg-muted mg-small">{cat ? CATEGORY_META[cat].label : "Check in so we can tailor this"}</span>
                </div>
              </div>
              <Button variant="ghost" onClick={() => navigate("/checkin")}>New check-in</Button>
            </Card>

            <Card>
              <div className="mg-h3" style={{ marginBottom: 4 }}>Where do you want to get to?</div>
              <p className="mg-muted mg-small" style={{ marginBottom: 12 }}>Pick a destination and the music below re-tunes to it.</p>
              <div className="mg-row-wrap">
                {DESTINATIONS.map((d) => (
                  <button key={d.key} className={`mg-chip teal ${dest === d.key ? "on" : ""}`} onClick={() => pick(d.key)} disabled={loadingDest}>{d.label}</button>
                ))}
              </div>
            </Card>

            <InterventionCards cards={data.cards} musicOverride={override} />
          </>
        )}
      </div>
    </>
  );
}
