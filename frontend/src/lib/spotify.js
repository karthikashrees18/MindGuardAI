// Spotify playlist link helpers. Accepts open.spotify.com/playlist/<id>?si=...,
// open.spotify.com/intl-xx/playlist/<id>, spotify:playlist:<id>, or a bare 22-char id.
const ID_RE = /(?:playlist[/:])([A-Za-z0-9]{22})(?![A-Za-z0-9])/;

export function parseSpotifyPlaylistId(input) {
  const s = String(input || "").trim();
  if (!s) return null;
  const m = s.match(ID_RE);
  if (m) return m[1];
  return /^[A-Za-z0-9]{22}$/.test(s) ? s : null;
}

export const spotifyEmbedUrl = (id) => `https://open.spotify.com/embed/playlist/${id}?utm_source=generator&theme=0`;
export const spotifyOpenUrl = (id) => `https://open.spotify.com/playlist/${id}`;

// localStorage copy so the playlist still works if the server is unreachable / demo accounts get reset.
const KEY = "mg_custom_playlist";
export function readLocalPlaylist(userId) {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}")[userId] || null; } catch { return null; }
}
export function writeLocalPlaylist(userId, id) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (id) all[userId] = id; else delete all[userId];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* storage blocked */ }
}
