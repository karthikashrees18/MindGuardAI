// "My Custom Spotify Playlist": paste any public playlist link, save it to the profile
// (server + localStorage fallback) and play it in an embedded Spotify player.
import React, { useEffect, useState } from "react";
import { ExternalLink, Music2, Trash2 } from "lucide-react";
import { api } from "../api";
import { useApp } from "../lib/store";
import { parseSpotifyPlaylistId, readLocalPlaylist, spotifyEmbedUrl, spotifyOpenUrl, writeLocalPlaylist } from "../lib/spotify";
import { Button } from "./ui";

export default function CustomPlaylist({ title = "My Custom Spotify Playlist", compact = false }) {
  const { user, setUser, toast } = useApp();
  const savedId = user?.custom_playlist || readLocalPlaylist(user?.id) || null;
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [changing, setChanging] = useState(false);

  // Server copy missing (e.g. older backend / demo reset) but a local one exists: keep using it.
  useEffect(() => {
    if (user && user.custom_playlist) writeLocalPlaylist(user.id, user.custom_playlist);
  }, [user?.id, user?.custom_playlist]); // eslint-disable-line react-hooks/exhaustive-deps

  async function persist(id) {
    writeLocalPlaylist(user.id, id);
    try {
      setUser(await api.saveProfile({ custom_playlist: id ? spotifyOpenUrl(id) : "" }));
    } catch (e) {
      // Local copy is already saved, so the playlist still plays.
      setUser({ ...user, custom_playlist: id || null });
      toast("Saved on this device. We couldn't reach the server, so it may not follow you to other devices.", { type: "warn" });
    }
  }

  async function save() {
    const id = parseSpotifyPlaylistId(value);
    if (!id) { setError("That doesn't look like a Spotify playlist link. Try one like https://open.spotify.com/playlist/…"); return; }
    setError("");
    setBusy(true);
    await persist(id);
    setBusy(false);
    setValue("");
    setChanging(false);
    toast("Playlist saved.");
  }

  async function remove() {
    setBusy(true);
    await persist(null);
    setBusy(false);
    setChanging(false);
    toast("Playlist removed.");
  }

  const showInput = !savedId || changing;

  return (
    <div className="mg-stack-sm">
      <div className="mg-row"><Music2 size={17} style={{ color: "var(--lavender)" }} /><div className="mg-h3">{title}</div></div>
      {showInput && (
        <>
          <p className="mg-muted mg-small">Paste the link to any public Spotify playlist and it will play right here.</p>
          <div className="mg-row-wrap" style={{ alignItems: "stretch" }}>
            <input
              className={`mg-input ${error ? "invalid" : ""}`} style={{ flex: "1 1 240px" }}
              value={value} onChange={(e) => { setValue(e.target.value); setError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } }}
              placeholder="https://open.spotify.com/playlist/…" aria-label="Spotify playlist link" aria-invalid={!!error}
            />
            <Button variant="violet" size="sm" loading={busy} onClick={save}>Save Playlist</Button>
            {changing && <Button variant="quiet" size="sm" onClick={() => { setChanging(false); setError(""); setValue(""); }}>Cancel</Button>}
          </div>
          {error && <div className="mg-error" role="alert">{error}</div>}
        </>
      )}
      {savedId && (
        <>
          <iframe
            title="My Spotify playlist" src={spotifyEmbedUrl(savedId)} width="100%" height={compact ? 152 : 352}
            style={{ border: 0, borderRadius: 12 }} loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
          <div className="mg-row-wrap">
            <a className="mg-small" href={spotifyOpenUrl(savedId)} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
              Open in Spotify <ExternalLink size={12} />
            </a>
            {!changing && <Button variant="ghost" size="sm" onClick={() => setChanging(true)}>Change link</Button>}
            <Button variant="quiet" size="sm" icon={Trash2} loading={busy && !showInput} onClick={remove}>Remove</Button>
          </div>
        </>
      )}
    </div>
  );
}
