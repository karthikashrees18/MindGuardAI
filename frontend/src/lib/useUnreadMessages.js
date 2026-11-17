// Polls the unread direct-message count for the sidebar badge (both apps).
import { useEffect, useState } from "react";

export default function useUnreadMessages(client, enabled = true, ms = 30000) {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!enabled) { setUnread(0); return undefined; }
    let alive = true;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      client.unread().then((r) => alive && setUnread(r.unread || 0)).catch(() => {});
    };
    tick();
    const timer = window.setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    return () => { alive = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, [client, enabled, ms]);
  return unread;
}
