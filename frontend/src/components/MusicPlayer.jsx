// Mood-shifting music: in-browser generated soundscapes (always works), embedded
// Spotify playlists, and genre/language search links — all from the backend
// catalog (backend/app/music/catalog.py).
import React, { useState } from "react";
import { ArrowRight, ExternalLink, Pause, Play, Search, Volume2 } from "lucide-react";
import { useAudio } from "../lib/audio";
import { Button, Equalizer } from "./ui";

const KIND_LABEL = { generated: "Built-in", spotify: "Spotify", search: "Spotify search" };

function TrackRow({ track, expanded, onToggleEmbed }) {
  const { playingId, play, stop } = useAudio();
  const playing = playingId === track.id;

  if (track.kind === "generated") {
    return (
      <div className="mg-row" style={{ padding: "10px 12px", borderRadius: 14, background: playing ? "var(--teal-soft)" : "var(--surface)", border: "1px solid var(--border)" }}>
        <button
          className="mg-btn teal"
          style={{ width: 40, height: 40, padding: 0, borderRadius: 13, flexShrink: 0 }}
          onClick={() => (playing ? stop() : play(track.id, track.generator))}
          aria-label={playing ? `Pause ${track.title}` : `Play ${track.title}`}
        >
          {playing ? <Pause size={17} /> : <Play size={17} />}
        </button>
        <div className="mg-grow">
          <div className="mg-h3" style={{ fontSize: 13.5 }}>{track.title}</div>
          <div className="mg-faint mg-small">{track.subtitle}</div>
        </div>
        {playing ? <Equalizer /> : <span className="mg-badge violet">{track.tag || KIND_LABEL.generated}</span>}
      </div>
    );
  }

  if (track.kind === "spotify") {
    return (
      <div style={{ borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden" }}>
        <div className="mg-row" style={{ padding: "10px 12px" }}>
          <button
            className="mg-btn violet"
            style={{ width: 40, height: 40, padding: 0, borderRadius: 13, flexShrink: 0 }}
            onClick={() => onToggleEmbed(track.id)}
            aria-label={expanded ? `Hide ${track.title}` : `Open ${track.title}`}
            aria-expanded={expanded}
          >
            {expanded ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <div className="mg-grow">
            <div className="mg-h3" style={{ fontSize: 13.5 }}>{track.title}</div>
            <div className="mg-faint mg-small">{track.subtitle}</div>
          </div>
          {track.tag && <span className="mg-badge violet">{track.tag}</span>}
        </div>
        {expanded && (
          <div style={{ padding: "0 12px 12px" }}>
            <iframe
              title={`Spotify: ${track.title}`}
              src={track.embed_url}
              width="100%"
              height="152"
              style={{ border: 0, borderRadius: 12 }}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
            <a className="mg-small" href={track.external_url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", gap: 4, alignItems: "center", marginTop: 6 }}>
              Open in Spotify <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mg-row" style={{ padding: "10px 12px", borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="mg-icon-tile amber" style={{ width: 40, height: 40 }}><Search size={17} /></div>
      <div className="mg-grow">
        <div className="mg-h3" style={{ fontSize: 13.5 }}>{track.title}</div>
        <div className="mg-faint mg-small">{track.subtitle}</div>
      </div>
      <a className="mg-btn ghost sm" href={track.external_url} target="_blank" rel="noreferrer">Open <ExternalLink size={13} /></a>
    </div>
  );
}

/** card: an intervention card of type "music" ({ title, payload:{transition, tracks} }) */
export default function MusicPlayer({ transition, tracks = [], headline }) {
  const [embedId, setEmbedId] = useState(null);
  const { playingId, stop, volume, setVolume } = useAudio();
  const anyGenerated = tracks.some((t) => t.id === playingId);

  return (
    <div className="mg-stack-sm">
      {transition && (
        <div className="mg-row-wrap" aria-label="Mood transition">
          <span className="mg-badge mild">{transition.from}</span>
          <ArrowRight size={16} className="mg-faint" />
          <span className="mg-badge calm">{transition.to}</span>
          {headline && <span className="mg-faint mg-small">{headline}</span>}
        </div>
      )}
      {tracks.map((t) => (
        <TrackRow key={t.id} track={t} expanded={embedId === t.id} onToggleEmbed={(id) => setEmbedId((cur) => (cur === id ? null : id))} />
      ))}
      {anyGenerated && (
        <div className="mg-row" style={{ padding: "2px 4px" }}>
          <Volume2 size={15} className="mg-faint" />
          <input className="mg-range" type="range" min="0" max="1" step="0.05" value={volume}
            onChange={(e) => setVolume(Number(e.target.value))} aria-label="Volume" />
          <Button variant="quiet" size="sm" onClick={stop}>Stop</Button>
        </div>
      )}
    </div>
  );
}
