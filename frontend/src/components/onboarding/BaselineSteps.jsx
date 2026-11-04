// Shared steps 3-6 (triggers, recovery, coping, music) used by both the signup
// flow and BaselineWizard. Each step is controlled: it receives its slice of
// state and an onChange callback.
import React from "react";
import { BookOpen, Gamepad2, Wind, Headphones } from "lucide-react";
import { Chip, Choice } from "../ui";
import { TRIGGERS, RECOVERY, COPING, GENRES, LANGUAGES, PLAYLIST_STATES } from "../../lib/constants";
import "../../styles/auth.css";

const COPING_ICONS = { music: Headphones, breathing: Wind, mini_games: Gamepad2, journaling: BookOpen };

export function toggleIn(list, key) {
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
}

const SPOTIFY_URL = /^https?:\/\/open\.spotify\.com\/(intl-[a-z]{2}\/)?playlist\/[A-Za-z0-9]+([/?#].*)?$/i;
const SPOTIFY_URI = /^spotify:playlist:[A-Za-z0-9]+$/i;

/** Returns an error string, or "" when the value is empty or looks valid. */
export function playlistError(value) {
  const v = (value || "").trim();
  if (!v) return "";
  return SPOTIFY_URL.test(v) || SPOTIFY_URI.test(v)
    ? ""
    : "That doesn't look like a Spotify playlist link (open.spotify.com/playlist/...)";
}

export function StepTitle({ title, sub }) {
  return (
    <div className="mg-onb-title">
      <h2 className="mg-h2">{title}</h2>
      {sub && <p className="mg-muted mg-small">{sub}</p>}
    </div>
  );
}

export function TriggersStep({ value, onChange }) {
  return (
    <div className="mg-stack">
      <StepTitle title="What situations hit you hardest?" sub="Pick any that feel familiar. You can skip this and change it later." />
      <div className="mg-stack" style={{ gap: 8 }}>
        {TRIGGERS.map((t) => (
          <Choice key={t.key} on={value.includes(t.key)} onClick={() => onChange(toggleIn(value, t.key))} title={t.label} hint={t.hint} />
        ))}
      </div>
    </div>
  );
}

export function RecoveryStep({ value, onChange, error }) {
  return (
    <div className="mg-stack">
      <StepTitle title="How long does it usually take you to bounce back?" sub="From stress or a low mood. There's no right answer." />
      <div className="mg-stack" style={{ gap: 8 }}>
        {RECOVERY.map((r) => (
          <Choice key={r.key} on={value === r.key} onClick={() => onChange(r.key)} title={r.label} hint={r.hint} />
        ))}
      </div>
      {error && <div className="mg-error" role="alert">{error}</div>}
    </div>
  );
}

export function CopingStep({ value, onChange }) {
  return (
    <div className="mg-stack">
      <StepTitle title="What helps you ground yourself?" sub="We'll lean on these when you need a gentle nudge." />
      <div className="mg-stack" style={{ gap: 8 }}>
        {COPING.map((c) => (
          <Choice key={c.key} icon={COPING_ICONS[c.key]} on={value.includes(c.key)} onClick={() => onChange(toggleIn(value, c.key))} title={c.label} hint={c.hint} />
        ))}
      </div>
    </div>
  );
}

export function MusicStep({ value, onChange, errors = {} }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const setPlaylist = (key, v) => set({ playlists: { ...value.playlists, [key]: v } });
  return (
    <div className="mg-stack">
      <StepTitle title="Your sound" sub="Mind Guard picks calming music that fits you. All optional." />
      <div>
        <div className="mg-label">Genres you like</div>
        <div className="mg-row-wrap" role="group" aria-label="Genres">
          {GENRES.map((g) => (
            <Chip key={g.key} on={value.genres.includes(g.key)} onClick={() => set({ genres: toggleIn(value.genres, g.key) })}>{g.label}</Chip>
          ))}
        </div>
      </div>
      <div>
        <div className="mg-label">Languages</div>
        <div className="mg-row-wrap" role="group" aria-label="Languages">
          {LANGUAGES.map((l) => (
            <Chip key={l.key} tone="teal" on={value.languages.includes(l.key)} onClick={() => set({ languages: toggleIn(value.languages, l.key) })}>{l.label}</Chip>
          ))}
        </div>
      </div>
      <div className="mg-stack" style={{ gap: 12 }}>
        <div className="mg-label" style={{ marginBottom: 0 }}>Your own Spotify playlists (optional)</div>
        {PLAYLIST_STATES.map((p) => {
          const id = `pl-${p.key}`;
          const err = errors[p.key];
          return (
            <div key={p.key}>
              <label className="mg-label" htmlFor={id} style={{ fontWeight: 500 }}>
                <b>{p.label}</b> <span className="mg-faint">{p.hint}</span>
              </label>
              <input
                id={id}
                className={`mg-input ${err ? "invalid" : ""}`}
                value={value.playlists[p.key] || ""}
                onChange={(e) => setPlaylist(p.key, e.target.value)}
                placeholder="https://open.spotify.com/playlist/..."
                autoComplete="off"
                aria-invalid={!!err}
              />
              {err && <div className="mg-error" role="alert">{err}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function musicErrors(music) {
  const errs = {};
  PLAYLIST_STATES.forEach((p) => {
    const e = playlistError(music.playlists[p.key]);
    if (e) errs[p.key] = e;
  });
  return errs;
}

/** Strip empty playlists and trim values so the backend payload is clean. */
export function cleanMusic(music) {
  const playlists = {};
  PLAYLIST_STATES.forEach((p) => {
    const v = (music.playlists[p.key] || "").trim();
    if (v) playlists[p.key] = v;
  });
  return { genres: music.genres, languages: music.languages, playlists };
}

export const emptyBaseline = { triggers: [], recovery: null, coping: [] };
export const emptyMusic = { genres: [], languages: [], playlists: {} };

/** Step table shared by BaselineWizard and Auth signup: validate returns an errors object. */
export function validateBaselineStep(kind, baseline, music) {
  if (kind === "recovery") return baseline.recovery ? {} : { recovery: "Please pick the option that fits best." };
  if (kind === "music") return musicErrors(music);
  return {};
}
