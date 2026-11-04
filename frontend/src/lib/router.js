// Tiny hash router — no dependency, works on any static host and with Vite's
// dev server. Routes look like  index.html#/home  .
import { useCallback, useEffect, useState } from "react";

function currentPath() {
  const h = window.location.hash.replace(/^#/, "");
  const path = h.split("?")[0] || "/";
  return path.startsWith("/") ? path : "/" + path;
}

export function navigate(path, { replace = false } = {}) {
  const target = "#" + (path.startsWith("/") ? path : "/" + path);
  if (replace) window.history.replaceState(null, "", target);
  else window.location.hash = target;
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

export function useRoute() {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const on = () => setPath(currentPath());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const go = useCallback((p, opts) => navigate(p, opts), []);
  return { path, navigate: go };
}
