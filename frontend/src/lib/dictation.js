// Voice input via the browser's Web Speech API (Chrome/Edge/Safari). Where it
// isn't available `supported` is false and callers hide the mic button.
import { useCallback, useEffect, useRef, useState } from "react";

const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export function useDictation(onFinalText) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recRef = useRef(null);
  const cbRef = useRef(onFinalText);
  cbRef.current = onFinalText;

  useEffect(() => () => { try { recRef.current?.stop(); } catch { /* ignore */ } }, []);

  const start = useCallback(() => {
    if (!SR) return;
    setError("");
    const rec = new SR();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) text += e.results[i][0].transcript;
      }
      if (text.trim()) cbRef.current(text.trim());
    };
    rec.onerror = (e) => {
      setError(e.error === "not-allowed" ? "Microphone permission was blocked." : "Voice input stopped.");
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try { rec.start(); setListening(true); } catch { setListening(false); }
  }, []);

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  }, []);

  return { supported: !!SR, listening, error, start, stop };
}
