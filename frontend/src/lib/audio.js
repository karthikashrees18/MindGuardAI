// Generative soundscapes built with the Web Audio API — no files, no network,
// no credentials. These back the "generated" tracks in the music catalog
// (backend/app/music/catalog.py), so the mood-shifting music feature is always
// audible, even offline or without Spotify.
//
//   audio.play("gen-432", "ambient432")   audio.stop()   audio.setVolume(0.5)
//   const { playingId, play, stop, volume, setVolume } = useAudio();
import { useEffect, useState } from "react";

let ctx = null;
let master = null;
let current = null; // { id, cleanup, fadeNode }
let volume = 0.6;
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp);
    comp.connect(ctx.destination);
  }
  return ctx;
}

function noiseBuffer(c, seconds, kind = "white") {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      if (kind === "brown") {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      } else {
        data[i] = white;
      }
    }
  }
  return buf;
}

function loopNoise(c, kind) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 4, kind);
  src.loop = true;
  src.start();
  return src;
}

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

/* ---------------------------------------------------------------- generators */
// Each takes (ctx, out) and returns a cleanup function.

function ambient432(c, out) {
  const stops = [];
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1400;
  lp.connect(out);
  const base = 432;
  const voices = [
    [base / 4, "sine", 0.24], [base / 2, "sine", 0.17], [base, "triangle", 0.11],
    [base * 1.5, "sine", 0.05], [base * 2, "sine", 0.025],
  ];
  voices.forEach(([f, type, gain]) => {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = (Math.random() - 0.5) * 8;
    const g = c.createGain();
    g.gain.value = gain;
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.04 + Math.random() * 0.08;
    const lg = c.createGain();
    lg.gain.value = gain * 0.55;
    lfo.connect(lg);
    lg.connect(g.gain);
    o.connect(g);
    g.connect(lp);
    o.start();
    lfo.start();
    stops.push(o, lfo);
  });
  const delay = c.createDelay(2);
  delay.delayTime.value = 0.95;
  const fb = c.createGain();
  fb.gain.value = 0.38;
  lp.connect(delay);
  delay.connect(fb);
  fb.connect(delay);
  delay.connect(out);
  return () => {
    stops.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } });
    [lp, delay, fb].forEach((n) => n.disconnect());
  };
}

function binauralTheta(c, out) {
  const stops = [];
  const left = c.createOscillator();
  const right = c.createOscillator();
  left.frequency.value = 200;
  right.frequency.value = 206; // 6 Hz difference = theta band
  const panL = c.createStereoPanner(); panL.pan.value = -1;
  const panR = c.createStereoPanner(); panR.pan.value = 1;
  const g = c.createGain(); g.gain.value = 0.16;
  left.connect(panL); right.connect(panR);
  panL.connect(g); panR.connect(g); g.connect(out);
  left.start(); right.start();
  stops.push(left, right);
  // soft bed so it isn't just two sine waves
  const pad = c.createOscillator(); pad.type = "sine"; pad.frequency.value = 108;
  const padG = c.createGain(); padG.gain.value = 0.1;
  pad.connect(padG); padG.connect(out); pad.start(); stops.push(pad);
  const hush = loopNoise(c, "brown");
  const hushLp = c.createBiquadFilter(); hushLp.type = "lowpass"; hushLp.frequency.value = 500;
  const hushG = c.createGain(); hushG.gain.value = 0.05;
  hush.connect(hushLp); hushLp.connect(hushG); hushG.connect(out); stops.push(hush);
  return () => {
    stops.forEach((n) => { try { n.stop(); } catch { /* ok */ } });
    [panL, panR, g, padG, hushLp, hushG].forEach((n) => n.disconnect());
  };
}

function lofiPad(c, out) {
  const chords = [
    [57, 60, 64, 67], // Am7
    [53, 57, 60, 64], // Fmaj7
    [48, 52, 55, 59], // Cmaj7
    [55, 59, 62, 64], // G6
  ];
  const bus = c.createGain();
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; lp.Q.value = 0.6;
  bus.connect(lp); lp.connect(out);
  const delay = c.createDelay(1); delay.delayTime.value = 0.42;
  const fb = c.createGain(); fb.gain.value = 0.28;
  lp.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(out);

  // vinyl hush
  const hiss = loopNoise(c, "white");
  const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 4200;
  const hissG = c.createGain(); hissG.gain.value = 0.012;
  hiss.connect(hp); hp.connect(hissG); hissG.connect(out);

  let step = 0;
  const live = new Set();
  function playChord() {
    const now = c.currentTime;
    const chord = chords[step % chords.length];
    step++;
    chord.forEach((n, i) => {
      const o = c.createOscillator();
      o.type = "triangle";
      o.frequency.value = midi(n);
      o.detune.value = (Math.random() - 0.5) * 14;
      const g = c.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.11 - i * 0.012, now + 0.5);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 3.9);
      o.connect(g); g.connect(bus);
      o.start(now); o.stop(now + 4.1);
      live.add(o);
      o.onended = () => { live.delete(o); g.disconnect(); };
    });
    // soft bass note
    const b = c.createOscillator(); b.type = "sine"; b.frequency.value = midi(chord[0] - 12);
    const bg = c.createGain();
    bg.gain.setValueAtTime(0, now);
    bg.gain.linearRampToValueAtTime(0.2, now + 0.08);
    bg.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
    b.connect(bg); bg.connect(out); b.start(now); b.stop(now + 1.8);
    live.add(b);
    b.onended = () => { live.delete(b); bg.disconnect(); };
  }
  playChord();
  const timer = window.setInterval(playChord, 3600);
  return () => {
    window.clearInterval(timer);
    live.forEach((o) => { try { o.stop(); } catch { /* ok */ } });
    try { hiss.stop(); } catch { /* ok */ }
    [bus, lp, delay, fb, hp, hissG].forEach((n) => n.disconnect());
  };
}

function rain(c, out) {
  const brown = loopNoise(c, "brown");
  const bLp = c.createBiquadFilter(); bLp.type = "lowpass"; bLp.frequency.value = 900;
  const bG = c.createGain(); bG.gain.value = 0.55;
  brown.connect(bLp); bLp.connect(bG); bG.connect(out);

  const white = loopNoise(c, "white");
  const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 3200; bp.Q.value = 0.5;
  const wG = c.createGain(); wG.gain.value = 0.07;
  white.connect(bp); bp.connect(wG); wG.connect(out);

  const drops = window.setInterval(() => {
    const now = c.currentTime;
    const o = c.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(1400 + Math.random() * 1800, now);
    o.frequency.exponentialRampToValueAtTime(500, now + 0.08);
    const g = c.createGain();
    g.gain.setValueAtTime(0.03, now);
    g.gain.exponentialRampToValueAtTime(0.0005, now + 0.1);
    o.connect(g); g.connect(out); o.start(now); o.stop(now + 0.12);
    o.onended = () => g.disconnect();
  }, 260);
  return () => {
    window.clearInterval(drops);
    [brown, white].forEach((n) => { try { n.stop(); } catch { /* ok */ } });
    [bLp, bG, bp, wG].forEach((n) => n.disconnect());
  };
}

function sunrise(c, out) {
  const scale = [72, 74, 76, 79, 81, 84, 79, 76]; // C major pentatonic, up and back
  const delay = c.createDelay(1); delay.delayTime.value = 0.36;
  const fb = c.createGain(); fb.gain.value = 0.42;
  const wet = c.createGain(); wet.gain.value = 0.5;
  delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(out);
  let i = 0;
  let base = 0;
  const timer = window.setInterval(() => {
    const now = c.currentTime;
    if (i % 16 === 0) base = [0, 5, -3, 2][Math.floor(Math.random() * 4)];
    const note = scale[i % scale.length] + base + (i % 5 === 4 ? 12 : 0) - 12 * (i % 3 === 0 ? 1 : 0);
    i++;
    const o = c.createOscillator(); o.type = "triangle"; o.frequency.value = midi(note);
    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.13, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0006, now + 1.4);
    o.connect(g); g.connect(out); g.connect(delay);
    o.start(now); o.stop(now + 1.5);
    o.onended = () => g.disconnect();
  }, 330);
  return () => {
    window.clearInterval(timer);
    [delay, fb, wet].forEach((n) => n.disconnect());
  };
}

const GENERATORS = { ambient432, binaural_theta: binauralTheta, lofi_pad: lofiPad, rain, sunrise };

/* ------------------------------------------------------------------- manager */

function teardown(track, fadeSeconds) {
  if (!track) return;
  const c = ctx;
  const now = c.currentTime;
  track.fade.gain.cancelScheduledValues(now);
  track.fade.gain.setValueAtTime(track.fade.gain.value, now);
  track.fade.gain.linearRampToValueAtTime(0, now + fadeSeconds);
  window.setTimeout(() => {
    try { track.cleanup(); } catch { /* ok */ }
    track.fade.disconnect();
  }, fadeSeconds * 1000 + 80);
}

export const audio = {
  get playingId() { return current ? current.id : null; },
  get volume() { return volume; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  async play(id, generator) {
    const make = GENERATORS[generator];
    if (!make) return false;
    const c = getCtx();
    if (c.state === "suspended") await c.resume();
    if (current) { teardown(current, 0.6); current = null; }
    const fade = c.createGain();
    fade.gain.setValueAtTime(0, c.currentTime);
    fade.gain.linearRampToValueAtTime(1, c.currentTime + 2);
    fade.connect(master);
    const cleanup = make(c, fade);
    current = { id, cleanup, fade };
    emit();
    return true;
  },

  stop() {
    if (!current) return;
    teardown(current, 0.8);
    current = null;
    emit();
  },

  setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (master) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.05);
    emit();
  },
};

export function useAudio() {
  const [, tick] = useState(0);
  useEffect(() => audio.subscribe(() => tick((n) => n + 1)), []);
  return {
    playingId: audio.playingId,
    volume: audio.volume,
    play: (id, generator) => audio.play(id, generator),
    stop: () => audio.stop(),
    setVolume: (v) => audio.setVolume(v),
  };
}
