import React, { useState, useRef, useEffect } from "react";
import {
  ShieldCheck, Sparkles, Smile, Brain, Wind, Music, MessageCircle,
  BarChart2, User, Home as HomeIcon, BookOpen, Send, Mic, PhoneCall,
  Headphones, Stethoscope, CalendarDays, Users, Lock, Bell, Download,
  ChevronRight, ChevronLeft, LogOut, Moon, Sun, TrendingDown, PauseCircle,
  Waves, AlertCircle, Menu, X,
} from "lucide-react";
import { api, saveToken, getStoredUserId, setStoredUserId } from "./api";

/* ---------------------------------------------------------------------- */
/*  DESIGN TOKENS — teal / lavender / coral, per the Mind Guard AI spec   */
/* ---------------------------------------------------------------------- */

const LIGHT = {
  name: "light",
  page: "#F1F5F9",
  surface: "#FFFFFF",
  sidebar: "#FFFFFF",
  textPrimary: "#1E293B",
  textSecondary: "#64748B",
  textFaint: "#94A3B8",
  border: "#E2E8F0",
  teal: "#4DB6AC",
  tealDeep: "#2F8F86",
  tealGrad: "linear-gradient(135deg,#4DB6AC,#3AA79C)",
  tealSoft: "#EAF7F5",
  lavender: "#B39DDB",
  lavenderDeep: "#8A6FC0",
  lavenderGrad: "linear-gradient(135deg,#B39DDB,#9C82C9)",
  lavenderSoft: "#F3EEFB",
  coral: "#FF8A80",
  coralDeep: "#E15C50",
  coralGrad: "linear-gradient(135deg,#FF8A80,#E15C50)",
  coralSoft: "#FFF1F0",
  coralBorder: "#FFDAD6",
  shadow: "0 12px 30px -10px rgba(100,116,139,0.18)",
  inputBg: "#F8FAFC",
  track: "#E2E8F0",
  bubbleIn: "#F1F5F9",
  heroGrad: "linear-gradient(160deg,#4DB6AC,#B39DDB)",
};

const DARK = {
  name: "dark",
  page: "#0B1220",
  surface: "#1E293B",
  sidebar: "#111C31",
  textPrimary: "#F1F5F9",
  textSecondary: "#94A3B8",
  textFaint: "#64748B",
  border: "#2A3B55",
  teal: "#5FD1C4",
  tealDeep: "#4DB6AC",
  tealGrad: "linear-gradient(135deg,#4DB6AC,#2F8F86)",
  tealSoft: "rgba(77,182,172,0.14)",
  lavender: "#C4B5EE",
  lavenderDeep: "#B39DDB",
  lavenderGrad: "linear-gradient(135deg,#C4B5EE,#8A6FC0)",
  lavenderSoft: "rgba(179,157,219,0.12)",
  coral: "#FF9A90",
  coralDeep: "#FF8A80",
  coralGrad: "linear-gradient(135deg,#FF9A90,#E15C50)",
  coralSoft: "rgba(255,138,128,0.12)",
  coralBorder: "rgba(255,138,128,0.35)",
  shadow: "0 12px 30px -10px rgba(0,0,0,0.5)",
  inputBg: "#0F172A",
  track: "#334155",
  bubbleIn: "#0F172A",
  heroGrad: "linear-gradient(160deg,#2F8F86,#6E5AA6)",
};

/* ---------------------------------------------------------------------- */
/*  GLOBAL / RESPONSIVE STYLES                                            */
/* ---------------------------------------------------------------------- */

function GlobalStyle() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      .mga-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
      .mga-scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.4); border-radius: 8px; }
      .mga-nav-item:hover { filter: brightness(1.03); }
      .mga-card { transition: transform .15s ease, box-shadow .15s ease; }
      .mga-clickable:hover { transform: translateY(-2px); }
      .mga-btn { transition: opacity .15s ease, transform .1s ease; }
      .mga-btn:active { transform: scale(0.98); }
      .mga-desktop-sidebar { display: flex; }
      .mga-mobile-topbar { display: none; }
      .mga-mobile-tabbar { display: none; }
      @media (max-width: 880px) {
        .mga-desktop-sidebar { display: none; }
        .mga-mobile-topbar { display: flex; }
        .mga-mobile-tabbar { display: flex; }
        .mga-main-padding { padding-bottom: 84px !important; }
        .mga-grid-2 { grid-template-columns: 1fr !important; }
        .mga-grid-3 { grid-template-columns: 1fr !important; }
        .mga-grid-4 { grid-template-columns: 1fr 1fr !important; }
      }
      input:focus, textarea:focus, button:focus-visible {
        outline: 2px solid #4DB6AC;
        outline-offset: 2px;
      }
    `}</style>
  );
}

/* ---------------------------------------------------------------------- */
/*  SHARED PRIMITIVES                                                     */
/* ---------------------------------------------------------------------- */

function Card({ t, children, style, className }) {
  return (
    <div
      className={`mga-card ${className || ""}`}
      style={{
        background: t.surface,
        borderRadius: 18,
        border: `1px solid ${t.border}`,
        padding: 20,
        boxShadow: t.shadow,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function PrimaryButton({ grad, shadowColor, children, onClick, style }) {
  return (
    <button
      className="mga-btn"
      onClick={onClick}
      style={{
        border: "none",
        borderRadius: 14,
        padding: "12px 20px",
        fontWeight: 600,
        fontSize: 13.5,
        color: "#fff",
        background: grad,
        boxShadow: `0 10px 22px ${shadowColor}`,
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({ t, children, onClick, style }) {
  return (
    <button
      className="mga-btn"
      onClick={onClick}
      style={{
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        padding: "11px 18px",
        fontSize: 13,
        fontWeight: 500,
        color: t.textPrimary,
        background: t.surface,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function inputStyle(t) {
  return {
    width: "100%",
    borderRadius: 12,
    border: `1px solid ${t.border}`,
    background: t.inputBg,
    color: t.textPrimary,
    padding: "12px 14px",
    fontSize: 13.5,
    outline: "none",
    boxSizing: "border-box",
  };
}

const NAV_ITEMS = [
  { key: "home", icon: HomeIcon, label: "Home" },
  { key: "journal", icon: BookOpen, label: "Journal" },
  { key: "chat", icon: MessageCircle, label: "AI Chat" },
  { key: "reports", icon: BarChart2, label: "Reports" },
  { key: "profile", icon: User, label: "Profile" },
];

const PAGE_TITLES = {
  home: "Home",
  journal: "Daily journal",
  analysis: "AI analysis",
  suggestions: "Wellness suggestions",
  chat: "AI chat",
  reports: "Reports",
  emergency: "Emergency support",
  profile: "Profile",
};

/* ---------------------------------------------------------------------- */
/*  SIDEBAR (desktop) + MOBILE TOP BAR / TAB BAR                          */
/* ---------------------------------------------------------------------- */

function Sidebar({ t, theme, setTheme, route, setRoute }) {
  return (
    <div
      className="mga-desktop-sidebar"
      style={{
        width: 240,
        flexShrink: 0,
        background: t.sidebar,
        borderRight: `1px solid ${t.border}`,
        flexDirection: "column",
        padding: "22px 16px",
        gap: 4,
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 22px" }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: t.tealGrad, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ShieldCheck size={18} color="#fff" />
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary }}>Mind Guard AI</div>
      </div>

      {NAV_ITEMS.map(({ key, icon: Icon, label }) => {
        const active = route === key;
        return (
          <button
            key={key}
            className="mga-nav-item"
            onClick={() => setRoute(key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              border: "none",
              background: active ? t.tealSoft : "transparent",
              color: active ? t.tealDeep : t.textSecondary,
              fontWeight: active ? 700 : 500,
              fontSize: 13.5,
              padding: "10px 12px",
              borderRadius: 12,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <Icon size={17} /> {label}
          </button>
        );
      })}

      <div style={{ flex: 1 }} />

      <button
        className="mga-nav-item"
        onClick={() => setRoute("emergency")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          border: `1px solid ${t.coralBorder}`,
          background: t.coralSoft,
          color: t.coralDeep,
          fontWeight: 700,
          fontSize: 13,
          padding: "10px 12px",
          borderRadius: 12,
          cursor: "pointer",
          marginBottom: 10,
        }}
      >
        <AlertCircle size={16} /> Emergency support
      </button>

      <button
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          border: `1px solid ${t.border}`,
          background: "transparent",
          color: t.textSecondary,
          fontSize: 12.5,
          padding: "9px 12px",
          borderRadius: 12,
          cursor: "pointer",
        }}
      >
        {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
        {theme === "light" ? "Dark mode" : "Light mode"}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${t.border}` }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: t.lavenderGrad }} />
        <div style={{ fontSize: 12, color: t.textPrimary, fontWeight: 600 }}>
          Ananya Rao
          <div style={{ fontSize: 10.5, color: t.textFaint, fontWeight: 400 }}>Student</div>
        </div>
      </div>
    </div>
  );
}

function MobileTopBar({ t, title, onBack, theme, setTheme, menuOpen, setMenuOpen }) {
  return (
    <div
      className="mga-mobile-topbar"
      style={{
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px",
        borderBottom: `1px solid ${t.border}`,
        background: t.surface,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {onBack ? (
        <button onClick={onBack} style={{ background: "none", border: "none", color: t.textSecondary, cursor: "pointer" }}>
          <ChevronLeft size={20} />
        </button>
      ) : (
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", color: t.textSecondary, cursor: "pointer" }}>
          <Menu size={20} />
        </button>
      )}
      <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>{title}</div>
      <button
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        style={{ background: "none", border: "none", color: t.textSecondary, cursor: "pointer" }}
      >
        {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
      </button>
    </div>
  );
}

function MobileTabBar({ t, route, setRoute }) {
  return (
    <div
      className="mga-mobile-tabbar"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: "space-around",
        background: t.surface,
        borderTop: `1px solid ${t.border}`,
        padding: "10px 8px 12px",
        zIndex: 20,
      }}
    >
      {NAV_ITEMS.map(({ key, icon: Icon, label }) => {
        const active = route === key;
        return (
          <button
            key={key}
            onClick={() => setRoute(key)}
            style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, color: active ? t.teal : t.textFaint, cursor: "pointer" }}
          >
            <Icon size={19} strokeWidth={active ? 2.4 : 2} />
            <span style={{ fontSize: 9 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function MobileMenu({ t, theme, setTheme, route, setRoute, open, setOpen }) {
  if (!open) return null;
  return (
    <div
      onClick={() => setOpen(false)}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 30, display: "flex" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 260, background: t.sidebar, height: "100%", padding: 20, display: "flex", flexDirection: "column", gap: 6 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>Mind Guard AI</div>
          <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: t.textSecondary }}>
            <X size={18} />
          </button>
        </div>
        {NAV_ITEMS.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => {
              setRoute(key);
              setOpen(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              border: "none",
              background: route === key ? t.tealSoft : "transparent",
              color: route === key ? t.tealDeep : t.textSecondary,
              fontWeight: 600,
              fontSize: 13.5,
              padding: "10px 12px",
              borderRadius: 12,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <Icon size={17} /> {label}
          </button>
        ))}
        <button
          onClick={() => {
            setRoute("emergency");
            setOpen(false);
          }}
          style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${t.coralBorder}`, background: t.coralSoft, color: t.coralDeep, fontWeight: 700, fontSize: 13, padding: "10px 12px", borderRadius: 12, cursor: "pointer", marginTop: 8 }}
        >
          <AlertCircle size={16} /> Emergency support
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  SPLASH + LOGIN (full-screen web pages, no shell)                     */
/* ---------------------------------------------------------------------- */

function SplashPage({ t, theme, setTheme, go }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: t.heroGrad, padding: 24, position: "relative" }}>
      <button
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        style={{ position: "absolute", top: 20, right: 20, width: 38, height: 38, borderRadius: 999, border: "none", background: "rgba(255,255,255,0.25)", color: "#fff", cursor: "pointer" }}
      >
        {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
      </button>
      <div style={{ width: 96, height: 96, borderRadius: 28, background: "rgba(255,255,255,0.22)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 28px rgba(0,0,0,0.2)", marginBottom: 22 }}>
        <ShieldCheck size={46} color="#fff" strokeWidth={1.8} />
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Mind Guard AI</div>
      <div style={{ fontSize: 15, color: "rgba(255,255,255,0.92)", textAlign: "center", maxWidth: 360, lineHeight: 1.6, marginBottom: 28 }}>
        Your AI companion for mental wellness — gentle monitoring, proactive nudges, and real help when it matters.
      </div>
      <PrimaryButton grad="#fff" shadowColor="rgba(0,0,0,0.2)" onClick={() => go("login")} style={{ color: "#2F8F86", padding: "14px 30px", fontSize: 14 }}>
        Get started
      </PrimaryButton>
    </div>
  );
}

function LoginPage({ t, theme, setTheme, go, onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    setBusy(true);
    try {
      const result = isSignup ? await api.signup(name, email, password) : await api.login(email, password);
      saveToken(result.access_token);
      const me = await api.me();
      setStoredUserId(me.id);
      onLogin();
    } catch (err) {
      setError(err.message || "Something went wrong — is the backend running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: t.page }}>
      <div className="mga-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", width: "100%" }}>
        <div style={{ background: t.heroGrad, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", padding: "60px", color: "#fff" }}>
          <ShieldCheck size={40} style={{ marginBottom: 20 }} />
          <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 12 }}>Welcome to Mind Guard AI</div>
          <div style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 380, color: "rgba(255,255,255,0.9)" }}>
            Track your mood, journal your thoughts, and let your AI companion notice the patterns — so support finds you before overthinking takes over.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 40, position: "relative" }}>
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            style={{ position: "absolute", top: 20, right: 20, width: 34, height: 34, borderRadius: 999, border: `1px solid ${t.border}`, background: t.inputBg, color: t.textSecondary, cursor: "pointer" }}
          >
            {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
          </button>
          <div style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>
              {isSignup ? "Create your account" : "Welcome back"}
            </div>
            {isSignup && <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle(t)} />}
            <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle(t)} />
            <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} style={inputStyle(t)} />
            {error && <div style={{ fontSize: 11.5, color: t.coralDeep }}>{error}</div>}
            {!isSignup && <div style={{ fontSize: 12, color: t.lavender, textAlign: "right", fontWeight: 600, cursor: "pointer" }}>Forgot password?</div>}
            <PrimaryButton grad={t.tealGrad} shadowColor="rgba(77,182,172,0.35)" onClick={submit} style={{ marginTop: 4, opacity: busy ? 0.7 : 1 }}>
              {busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
            </PrimaryButton>
            <div style={{ fontSize: 12.5, color: t.textSecondary, textAlign: "center", marginTop: 6 }}>
              {isSignup ? "Already have an account? " : "New here? "}
              <span onClick={() => setIsSignup((v) => !v)} style={{ color: t.teal, fontWeight: 700, cursor: "pointer" }}>
                {isSignup ? "Sign in" : "Sign up"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  HOME DASHBOARD                                                        */
/* ---------------------------------------------------------------------- */

function HomePage({ t, go, liveSignal }) {
  const bars = [60, 80, 40, 90, 55, 70, 65, 50, 75, 60, 85, 45];
  const days = ["M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F"];

  const ruminationScore = liveSignal ? liveSignal.rumination_score : 22;
  const wellnessScore = Math.max(0, Math.min(100, 100 - ruminationScore));
  const mood = liveSignal ? liveSignal.mood : "Calm";
  const overthinkingLabel = ruminationScore >= 66 ? "High" : ruminationScore >= 33 ? "Moderate" : "Low";
  const wellnessBlurb = wellnessScore >= 70 ? "Good balance today" : wellnessScore >= 40 ? "Keeping steady" : "A bit of a heavy day";
  const nudgeText = liveSignal
    ? liveSignal.suggestion
    : "Your overthinking signal ticked up slightly this afternoon.";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: t.textPrimary, display: "flex", alignItems: "center", gap: 8 }}>
          Hi Ananya <Sparkles size={18} color={t.coral} />
        </div>
        <div style={{ fontSize: 13.5, color: t.textSecondary, marginTop: 4 }}>
          {liveSignal ? "Based on your latest chat with your AI companion." : "Here's how you're doing today."}
        </div>
      </div>

      <div className="mga-grid-3" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 16 }}>
        <Card t={t} style={{ display: "flex", alignItems: "center", gap: 16, background: t.name === "light" ? "linear-gradient(135deg,#EAF7F5,#F3EEFB)" : t.surface }}>
          <div style={{ width: 78, height: 78, borderRadius: "50%", background: `conic-gradient(${t.teal} 0% ${wellnessScore}%, ${t.track} ${wellnessScore}% 100%)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: t.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: t.tealDeep }}>
              {wellnessScore}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12.5, color: t.textSecondary }}>Wellness score</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary }}>{wellnessBlurb}</div>
          </div>
        </Card>

        <Card t={t} style={{ background: t.lavenderSoft, border: "none" }}>
          <Smile size={22} color={t.lavender} />
          <div style={{ fontSize: 11.5, color: t.textSecondary, marginTop: 10 }}>Mood</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>{mood}</div>
        </Card>
        <Card t={t} style={{ background: t.coralSoft, border: "none" }}>
          <Brain size={22} color={t.coral} />
          <div style={{ fontSize: 11.5, color: t.textSecondary, marginTop: 10 }}>Overthinking</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>{overthinkingLabel}</div>
        </Card>
      </div>

      <div className="mga-grid-2" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <Card t={t}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, marginBottom: 14 }}>Weekly activity</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120 }}>
            {bars.map((h, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ width: "100%", maxWidth: 16, height: `${h}%`, background: i % 3 === 2 ? t.lavender : t.teal, borderRadius: 5 }} />
                <span style={{ fontSize: 9, color: t.textFaint }}>{days[i]}</span>
              </div>
            ))}
          </div>
        </Card>

        <button
          className="mga-clickable"
          onClick={() => go(liveSignal && liveSignal.risk_level === "High" ? "emergency" : "chat")}
          style={{ border: "none", cursor: "pointer", textAlign: "left", background: t.tealSoft, borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}
        >
          <Wind size={26} color={t.tealDeep} />
          <div style={{ fontSize: 14, fontWeight: 700, color: t.tealDeep }}>
            {liveSignal && liveSignal.risk_level === "High" ? "Get support now" : "Try a 5-min breathing break"}
          </div>
          <div style={{ fontSize: 12, color: t.textSecondary }}>{nudgeText}</div>
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  JOURNAL                                                               */
/* ---------------------------------------------------------------------- */

function JournalPage({ t, go, setLiveSignal }) {
  const [text, setText] = useState("");
  const [mood, setMood] = useState(1);
  const [stress, setStress] = useState(50);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const moods = ["😀", "🙂", "😐", "😔", "😢"];

  async function persistEntry(extra = {}) {
    const userId = getStoredUserId();
    return api.createJournal({
      user_id: userId,
      text,
      mood: moods[mood],
      stress_level: Number(stress),
      ...extra,
    });
  }

  async function handleSave() {
    if (!text.trim() || saving) return;
    setSaving(true);
    setSaveStatus("");
    try {
      await persistEntry();
      setSaveStatus("Saved.");
    } catch (err) {
      setSaveStatus(err.message || "Couldn't save — is journal-service running?");
    } finally {
      setSaving(false);
    }
  }

  async function handleAnalyze() {
    if (!text.trim() || analyzing) return;
    setAnalyzing(true);
    try {
      const result = await api.analyzeJournal(text, moods[mood], Number(stress));
      setLiveSignal((prev) => ({
        mood: result.mood,
        rumination_score: result.rumination_score,
        risk_level: result.risk_level,
        suggestion: result.suggestion,
        overthinking_percent: result.overthinking_percent,
        anxiety_risk: result.anxiety_risk,
        summary: result.summary,
        history: [...((prev && prev.history) || []).slice(-11), result.rumination_score],
      }));
      await persistEntry({
        rumination_score: result.rumination_score,
        risk_level: result.risk_level,
      });
      go("analysis");
    } catch (err) {
      setSaveStatus(err.message || "Couldn't reach the AI service.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="mga-grid-2" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
      <Card t={t} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary }}>Today's thoughts</div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write whatever is on your mind..."
          style={{ background: t.inputBg, borderRadius: 14, border: `1px solid ${t.border}`, padding: 14, fontSize: 13.5, color: t.textPrimary, minHeight: 220, resize: "vertical", outline: "none", fontFamily: "inherit" }}
        />
        <div>
          <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 8, fontWeight: 600 }}>Mood</div>
          <div style={{ display: "flex", gap: 14, background: t.lavenderSoft, borderRadius: 14, padding: 12, width: "fit-content" }}>
            {moods.map((m, i) => (
              <span
                key={i}
                onClick={() => setMood(i)}
                style={{ fontSize: 24, cursor: "pointer", opacity: mood === i ? 1 : 0.4, transform: mood === i ? "scale(1.15)" : "scale(1)", transition: "all .15s" }}
              >
                {m}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 8, fontWeight: 600 }}>Stress level</div>
          <input type="range" value={stress} onChange={(e) => setStress(e.target.value)} style={{ accentColor: t.coral, width: "100%" }} />
        </div>
        {saveStatus && <div style={{ fontSize: 11.5, color: t.textSecondary }}>{saveStatus}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <GhostButton t={t} style={{ flex: 1 }}>
            <Mic size={15} color={t.lavender} /> Voice
          </GhostButton>
          <PrimaryButton grad={t.tealGrad} shadowColor="rgba(77,182,172,0.35)" onClick={handleSave} style={{ flex: 1, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Save"}
          </PrimaryButton>
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card t={t}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: t.textPrimary, marginBottom: 8 }}>Why journal?</div>
          <div style={{ fontSize: 12, color: t.textSecondary, lineHeight: 1.6 }}>
            Writing daily helps the AI notice patterns in mood and stress early, so support arrives before things build up.
          </div>
        </Card>
        <PrimaryButton grad={t.lavenderGrad} shadowColor="rgba(179,157,219,0.4)" onClick={handleAnalyze} style={{ padding: "16px", opacity: analyzing ? 0.7 : 1 }}>
          {analyzing ? "Analyzing…" : "Analyze with AI"}
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  AI ANALYSIS                                                           */
/* ---------------------------------------------------------------------- */

function AnalysisPage({ t, go, liveSignal }) {
  const overthinking = liveSignal?.overthinking_percent ?? liveSignal?.rumination_score ?? 0;
  const anxiety = liveSignal?.anxiety_risk ?? liveSignal?.risk_level ?? "Low";
  const summary = liveSignal?.summary || liveSignal?.suggestion || "Journal something and analyze it to see your AI summary here.";
  const sentimentPct = Math.max(4, 100 - overthinking);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card t={t}>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, marginBottom: 10 }}>Journal sentiment</div>
        <div style={{ background: t.inputBg, borderRadius: 10, height: 14, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${sentimentPct}%`, background: `linear-gradient(90deg,${t.teal},${t.lavender})`, borderRadius: 10 }} />
        </div>
        <div style={{ fontSize: 11.5, color: t.textSecondary, marginTop: 8 }}>Positive vs negative emotion</div>
      </Card>

      <div className="mga-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card t={t} style={{ background: t.coralSoft, border: "none" }}>
          <div style={{ fontSize: 12, color: t.textSecondary }}>Overthinking</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: t.coralDeep }}>{overthinking}%</div>
        </Card>
        <Card t={t} style={{ background: t.lavenderSoft, border: "none" }}>
          <div style={{ fontSize: 12, color: t.textSecondary }}>Anxiety risk</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: t.lavenderDeep }}>{anxiety}</div>
        </Card>
      </div>

      <Card t={t} style={{ background: t.tealSoft, border: "none" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.tealDeep, marginBottom: 4 }}>AI summary</div>
        <div style={{ fontSize: 12.5, color: t.tealDeep, lineHeight: 1.6 }}>{summary}</div>
      </Card>

      <div className="mga-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <button className="mga-clickable" onClick={() => go("suggestions")} style={{ border: "none", cursor: "pointer", background: t.lavenderSoft, borderRadius: 16, padding: 18, textAlign: "center", color: t.lavenderDeep }}>
          <Wind size={22} style={{ display: "block", margin: "0 auto 6px" }} />
          Breathing
        </button>
        <button className="mga-clickable" onClick={() => go("suggestions")} style={{ border: "none", cursor: "pointer", background: t.tealSoft, borderRadius: 16, padding: 18, textAlign: "center", color: t.tealDeep }}>
          <Music size={22} style={{ display: "block", margin: "0 auto 6px" }} />
          Music
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  WELLNESS SUGGESTIONS                                                  */
/* ---------------------------------------------------------------------- */

function SuggestionCard({ t, icon: Icon, iconColor, bg, label, labelColor, desc, cta, ctaBg, onClick }) {
  return (
    <Card t={t} style={{ background: bg, border: "none", display: "flex", flexDirection: "column", gap: 10 }}>
      <Icon size={22} color={iconColor} />
      <div style={{ fontSize: 13.5, fontWeight: 700, color: labelColor || t.textPrimary }}>{label}</div>
      <div style={{ fontSize: 11.5, color: t.textSecondary, flex: 1 }}>{desc}</div>
      <button
        onClick={onClick}
        style={{ alignSelf: "flex-start", fontSize: 11.5, padding: "7px 16px", borderRadius: 10, border: "none", background: ctaBg, color: "#fff", fontWeight: 700, cursor: "pointer" }}
      >
        {cta}
      </button>
    </Card>
  );
}

function SuggestionsPage({ t, go }) {
  return (
    <div className="mga-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
      <SuggestionCard t={t} icon={PauseCircle} iconColor={t.tealDeep} bg={t.tealSoft} label="5-min break" desc="A short pause to reset before your next task." cta="Start" ctaBg={t.teal} />
      <SuggestionCard t={t} icon={Wind} iconColor={t.lavenderDeep} bg={t.lavenderSoft} label="Deep breathing" desc="Guided breathing to calm a racing mind." cta="Start" ctaBg={t.lavender} />
      <SuggestionCard t={t} icon={Waves} iconColor={t.tealDeep} bg={t.tealSoft} label="Meditation" desc="A 10-minute guided session for focus." cta="Start" ctaBg={t.teal} />
      <SuggestionCard t={t} icon={Music} iconColor={t.lavenderDeep} bg={t.lavenderSoft} label="Calming music" desc="A playlist picked for your current mood." cta="Play" ctaBg={t.lavender} />
      <SuggestionCard
        t={t}
        icon={AlertCircle}
        iconColor={t.coralDeep}
        bg={t.coralSoft}
        labelColor={t.coralDeep}
        label="Talk to a counselor"
        desc="If things still feel heavy, real support is one tap away."
        cta="Book"
        ctaBg={t.coral}
        onClick={() => go("emergency")}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  AI CHAT                                                               */
/* ---------------------------------------------------------------------- */

function ChatPage({ t, liveSignal, setLiveSignal, go }) {
  const [displayMessages, setDisplayMessages] = useState([
    { role: "assistant", text: "Hi, I'm here to check in with you. How are you feeling today?" },
  ]);
  const [apiHistory, setApiHistory] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages, loading]);

  async function send(text) {
    if (!text.trim() || loading) return;
    setErrorMsg("");
    const newApiHistory = [...apiHistory, { role: "user", content: text }];
    setApiHistory(newApiHistory);
    setDisplayMessages((m) => [...m, { role: "user", text }]);
    setDraft("");
    setLoading(true);

    try {
      // ai-service owns the system prompt and the Claude call — the
      // frontend just sends history + the new message and gets back
      // {reply, mood, rumination_score, risk_level, suggestion}.
      const result = await api.chat(apiHistory, text);

      setApiHistory((prev) => [...prev, { role: "assistant", content: result.reply }]);
      setDisplayMessages((prev) => [...prev, { role: "assistant", text: result.reply }]);

      const score = Math.max(0, Math.min(100, Number(result.rumination_score) || 0));
      setLiveSignal((prev) => ({
        mood: result.mood || "Neutral",
        rumination_score: score,
        risk_level: result.risk_level || "Low",
        suggestion: result.suggestion || "",
        history: [...((prev && prev.history) || []).slice(-11), score],
      }));
    } catch (err) {
      setErrorMsg(err.message || "Couldn't reach the AI companion — is ai-service running?");
    } finally {
      setLoading(false);
    }
  }

  const score = liveSignal ? liveSignal.rumination_score : null;
  const riskColor = liveSignal?.risk_level === "High" ? t.coral : liveSignal?.risk_level === "Moderate" ? t.lavender : t.teal;

  return (
    <div className="mga-grid-2" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20, alignItems: "start" }}>
      <Card t={t} style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 180px)", padding: 0, overflow: "hidden" }}>
        <div className="mga-scroll" style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          {displayMessages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                background: m.role === "user" ? t.tealGrad : t.bubbleIn,
                color: m.role === "user" ? "#fff" : t.textPrimary,
                borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                padding: "10px 14px",
                fontSize: 13,
                maxWidth: "75%",
                whiteSpace: "pre-wrap",
              }}
            >
              {m.text}
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: "flex-start", background: t.bubbleIn, borderRadius: "16px 16px 16px 4px", padding: "10px 14px", fontSize: 13, color: t.textFaint }}>
              typing…
            </div>
          )}
          {errorMsg && <div style={{ fontSize: 11.5, color: t.coralDeep }}>{errorMsg}</div>}
          <div ref={endRef} />
        </div>
        <div style={{ padding: 16, borderTop: `1px solid ${t.border}` }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", background: t.inputBg, borderRadius: 16, padding: "9px 14px" }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(draft)}
              placeholder="Type a message"
              disabled={loading}
              style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, outline: "none", color: t.textPrimary }}
            />
            <Mic size={18} color={t.lavender} style={{ cursor: "pointer" }} />
            <Send size={18} color={t.teal} style={{ cursor: loading ? "default" : "pointer", opacity: loading ? 0.5 : 1 }} onClick={() => send(draft)} />
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card t={t}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textPrimary, marginBottom: 14 }}>Live wellness signal</div>
          {score === null ? (
            <div style={{ fontSize: 12, color: t.textSecondary }}>Say something to get started — your AI companion reads mood and overthinking as you chat.</div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: `conic-gradient(${riskColor} 0% ${score}%, ${t.track} ${score}% 100%)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: t.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: riskColor }}>
                    {score}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: t.textSecondary }}>Rumination score</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>{liveSignal.risk_level} risk · {liveSignal.mood}</div>
                </div>
              </div>
              {liveSignal.history && liveSignal.history.length > 1 && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 32, marginBottom: 14 }}>
                  {liveSignal.history.map((h, i) => (
                    <div key={i} style={{ flex: 1, height: `${Math.max(6, h)}%`, background: riskColor, borderRadius: 2, opacity: 0.75 }} />
                  ))}
                </div>
              )}
              <div style={{ fontSize: 11.5, color: t.textSecondary, lineHeight: 1.5, marginBottom: liveSignal.risk_level === "High" ? 14 : 0 }}>
                {liveSignal.suggestion}
              </div>
              {liveSignal.risk_level === "High" && (
                <PrimaryButton grad={t.coralGrad} shadowColor="rgba(255,138,128,0.35)" onClick={() => go("emergency")} style={{ width: "100%" }}>
                  Get support now
                </PrimaryButton>
              )}
            </>
          )}
        </Card>
        <Card t={t} style={{ background: t.tealSoft, border: "none" }}>
          <div style={{ fontSize: 11.5, color: t.tealDeep, lineHeight: 1.6 }}>
            This chat is AI-generated support, not a replacement for professional care. If you're in crisis, please use Emergency Support.
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  REPORTS                                                               */
/* ---------------------------------------------------------------------- */

function ReportsPage({ t }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .reportsSummary(getStoredUserId())
      .then(setSummary)
      .catch((err) => setError(err.message || "Couldn't load reports — is journal-service running?"));
  }, []);

  const bars = summary && summary.recent_scores.length
    ? summary.recent_scores.map((s) => Math.max(6, 100 - s))
    : [50, 50, 50, 50, 50, 50];
  const progressScore = summary?.average_rumination_score != null
    ? Math.round(100 - summary.average_rumination_score)
    : null;
  const trendLabel = {
    easing: "Stress trend easing",
    rising: "Stress trend rising",
    steady: "Stress trend steady",
    "not enough data": "Not enough data yet",
  }[summary?.trend] || "Loading trend…";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && <div style={{ fontSize: 11.5, color: t.coralDeep }}>{error}</div>}
      <Card t={t}>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, marginBottom: 14 }}>Recent wellness scores</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
          {bars.map((h, i) => (
            <div key={i} style={{ flex: 1, maxWidth: 22, height: `${h}%`, background: i % 3 === 2 ? t.lavender : t.teal, borderRadius: 5 }} />
          ))}
        </div>
      </Card>
      <div className="mga-grid-3" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 16 }}>
        <Card t={t} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <TrendingDown size={26} color={t.coral} />
          <div style={{ fontSize: 13, color: t.textPrimary, fontWeight: 600 }}>{trendLabel}</div>
        </Card>
        <Card t={t} style={{ background: t.tealSoft, border: "none" }}>
          <div style={{ fontSize: 12, color: t.tealDeep }}>Journal entries</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: t.textPrimary }}>{summary?.total_entries ?? "—"}</div>
        </Card>
        <Card t={t} style={{ background: t.lavenderSoft, border: "none" }}>
          <div style={{ fontSize: 12, color: t.lavenderDeep }}>Progress score</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: t.textPrimary }}>{progressScore != null ? `${progressScore}%` : "—"}</div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  EMERGENCY SUPPORT                                                     */
/* ---------------------------------------------------------------------- */

function rowBtn(t, bg, border, color) {
  return {
    borderRadius: 14,
    border: `1px solid ${border}`,
    background: bg,
    padding: 16,
    fontSize: 13,
    color,
    fontWeight: 600,
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
  };
}

function EmergencyPage({ t }) {
  const [status, setStatus] = useState("");
  const [busyType, setBusyType] = useState("");

  async function trigger(alertType, label) {
    setBusyType(alertType);
    setStatus("");
    try {
      const result = await api.emergencyAlert(getStoredUserId(), null, alertType);
      setStatus(result.dry_run ? `${label}: ${result.detail} (dry run — no real SMS sent)` : `${label}: ${result.detail}`);
    } catch (err) {
      setStatus(err.message || `Couldn't reach notification-service for "${label}".`);
    } finally {
      setBusyType("");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 640, margin: "0 auto" }}>
      <div style={{ background: t.coralGrad, borderRadius: 20, padding: 26, textAlign: "center", boxShadow: `0 14px 30px ${t.name === "light" ? "rgba(255,138,128,0.4)" : "rgba(0,0,0,0.4)"}` }}>
        <PhoneCall size={30} color="#fff" style={{ margin: "0 auto" }} />
        <div style={{ fontSize: 16, color: "#fff", marginTop: 10, fontWeight: 700 }}>Immediate support</div>
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.9)", marginTop: 6 }}>
          You don't have to go through this alone.
        </div>
      </div>
      {status && <div style={{ fontSize: 11.5, color: t.textSecondary, textAlign: "center" }}>{status}</div>}
      <div className="mga-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <button onClick={() => trigger("helpline", "Emergency helpline")} disabled={busyType === "helpline"} style={rowBtn(t, t.coralSoft, t.coralBorder, t.coralDeep)}>
          <Headphones size={16} style={{ marginRight: 10 }} /> Emergency helpline
        </button>
        <button onClick={() => trigger("counselor", "Contact counselor")} disabled={busyType === "counselor"} style={rowBtn(t, t.surface, t.border, t.textPrimary)}>
          <Stethoscope size={16} color={t.teal} style={{ marginRight: 10 }} /> Contact counselor
        </button>
        <button style={rowBtn(t, t.surface, t.border, t.textPrimary)}>
          <CalendarDays size={16} color={t.lavender} style={{ marginRight: 10 }} /> Book appointment
        </button>
        <button onClick={() => trigger("trusted_contact", "Alert trusted contact")} disabled={busyType === "trusted_contact"} style={rowBtn(t, t.surface, t.border, t.textPrimary)}>
          <Users size={16} color={t.coral} style={{ marginRight: 10 }} /> Alert trusted contact
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  PROFILE                                                               */
/* ---------------------------------------------------------------------- */

function ProfileRow({ t, icon: Icon, iconColor, label }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: t.textPrimary, padding: "12px 0", cursor: "pointer", borderBottom: `1px solid ${t.border}` }}>
      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Icon size={16} color={iconColor} /> {label}
      </span>
      <ChevronRight size={15} color={t.textFaint} />
    </div>
  );
}

function ProfilePage({ t, go }) {
  return (
    <div className="mga-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20 }}>
      <Card t={t} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10, height: "fit-content" }}>
        <div style={{ width: 70, height: 70, borderRadius: "50%", background: t.tealGrad }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary }}>Ananya Rao</div>
        <div style={{ fontSize: 12, color: t.textSecondary }}>Student</div>
        <PrimaryButton grad={t.coralGrad} shadowColor="rgba(255,138,128,0.35)" onClick={() => go("splash")} style={{ marginTop: 10, width: "100%" }}>
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <LogOut size={14} /> Log out
          </span>
        </PrimaryButton>
      </Card>
      <Card t={t}>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, marginBottom: 6 }}>Settings</div>
        <ProfileRow t={t} icon={Lock} iconColor={t.teal} label="Privacy settings" />
        <ProfileRow t={t} icon={Bell} iconColor={t.lavender} label="Notification preferences" />
        <ProfileRow t={t} icon={Brain} iconColor={t.coral} label="AI monitoring settings" />
        <ProfileRow t={t} icon={Download} iconColor="#4CAF50" label="Download reports" />
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  APP SHELL + ROOT                                                      */
/* ---------------------------------------------------------------------- */

const PAGES = {
  home: HomePage,
  journal: JournalPage,
  analysis: AnalysisPage,
  suggestions: SuggestionsPage,
  chat: ChatPage,
  reports: ReportsPage,
  emergency: EmergencyPage,
  profile: ProfilePage,
};

const BACK_MAP = { analysis: "home", suggestions: "analysis", emergency: "suggestions" };

function AppShell({ t, theme, setTheme, route, setRoute, liveSignal, setLiveSignal }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const Page = PAGES[route];
  const isSubPage = Object.keys(BACK_MAP).includes(route);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: t.page }}>
      <Sidebar t={t} theme={theme} setTheme={setTheme} route={route} setRoute={setRoute} />
      <MobileMenu t={t} theme={theme} setTheme={setTheme} route={route} setRoute={setRoute} open={menuOpen} setOpen={setMenuOpen} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <MobileTopBar
          t={t}
          title={PAGE_TITLES[route]}
          onBack={isSubPage ? () => setRoute(BACK_MAP[route]) : null}
          theme={theme}
          setTheme={setTheme}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
        />
        <div className="mga-main-padding mga-scroll" style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
          {isSubPage && (
            <button
              onClick={() => setRoute(BACK_MAP[route])}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: t.textSecondary, fontSize: 12.5, marginBottom: 14, cursor: "pointer", padding: 0 }}
            >
              <ChevronLeft size={16} /> Back
            </button>
          )}
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <Page t={t} go={setRoute} liveSignal={liveSignal} setLiveSignal={setLiveSignal} />
          </div>
        </div>
        <MobileTabBar t={t} route={route === "analysis" || route === "suggestions" || route === "emergency" ? "home" : route} setRoute={setRoute} />
      </div>
    </div>
  );
}

export default function MindGuardWebApp() {
  const [theme, setTheme] = useState("light");
  const [stage, setStage] = useState("splash"); // splash | login | app
  const [route, setRoute] = useState("home");
  const [liveSignal, setLiveSignal] = useState(null);
  const t = theme === "light" ? LIGHT : DARK;

  return (
    <div style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <GlobalStyle />
      {stage === "splash" && <SplashPage t={t} theme={theme} setTheme={setTheme} go={() => setStage("login")} />}
      {stage === "login" && (
        <LoginPage
          t={t}
          theme={theme}
          setTheme={setTheme}
          go={setStage}
          onLogin={() => {
            setRoute("home");
            setStage("app");
          }}
        />
      )}
      {stage === "app" && (
        <AppShell
          t={t}
          theme={theme}
          setTheme={setTheme}
          route={route}
          setRoute={(r) => {
            if (r === "splash") {
              setStage("splash");
            } else {
              setRoute(r);
            }
          }}
          liveSignal={liveSignal}
          setLiveSignal={setLiveSignal}
        />
      )}
    </div>
  );
}
