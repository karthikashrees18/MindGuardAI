// Signed-in app chrome: desktop sidebar, mobile top bar + tab bar + menu sheet.
import React, { useEffect, useState } from "react";
import {
  BarChart3, BookHeart, Flower2, Gamepad2, HeartHandshake, Home, LifeBuoy, LogOut, Menu, MessageCircle,
  Moon, ShieldCheck, Sparkles, Sun, User, Wind, X,
} from "lucide-react";
import { useApp } from "../lib/store";
import { navigate } from "../lib/router";
import { displayName } from "../lib/constants";
import { Aurora } from "./ui";

const NAV = [
  { path: "/home", label: "Home", icon: Home },
  { path: "/checkin", label: "Check-in", icon: BookHeart },
  { path: "/chat", label: "AI companion", icon: MessageCircle },
  { path: "/calm", label: "Calm space", icon: Wind },
  { path: "/games", label: "Mini-games", icon: Gamepad2 },
  { path: "/garden", label: "Wellness garden", icon: Flower2 },
  { path: "/reports", label: "Reports", icon: BarChart3 },
  { path: "/profile", label: "Profile", icon: User },
];
// Staff reach the counselor dashboard (admin.html) from the Counselor tab on the sign-in
// screen, never from the student navigation.
export const COUNSELOR_URL = "/admin.html";

const TABS = [NAV[0], NAV[1], NAV[3], NAV[4]];

const TITLES = {
  "/home": "Home", "/checkin": "Check-in", "/chat": "AI companion", "/calm": "Calm space", "/games": "Mini-games",
  "/games/bubble": "Zen Bubble Pop", "/games/reframe": "Thought Reframe", "/garden": "Wellness garden",
  "/reports": "Reports", "/support": "Support", "/profile": "Profile", "/onboarding": "Personalise",
};

function isActive(path, itemPath) {
  return path === itemPath || (itemPath === "/games" && path.startsWith("/games/"));
}

function Brand() {
  return (
    <div className="mg-brand">
      <div className="mg-brand-mark"><ShieldCheck size={18} /></div>
      Mind Guard AI
    </div>
  );
}

function SosButton({ path, flagged, onClick }) {
  return (
    <button className={`mg-nav-item sos ${path === "/support" ? "active" : ""}`} onClick={() => { navigate("/support"); onClick?.(); }}>
      <LifeBuoy size={17} /> Support
      {flagged && <span className="dot" aria-label="Support available for you" />}
    </button>
  );
}

export default function Shell({ path, children }) {
  const { user, theme, toggleTheme, signOut, supportFlag } = useApp();
  const [menu, setMenu] = useState(false);
  const flagged = !!(supportFlag && supportFlag.show_prompt);
  const needsOnboarding = user && !user.onboarding_complete && path !== "/onboarding";

  useEffect(() => { setMenu(false); }, [path]);

  const logout = () => { signOut(); navigate("/"); };

  return (
    <>
    <Aurora />
    <div className="mg-app">
      <aside className="mg-side" aria-label="Main navigation">
        <Brand />
        {NAV.map(({ path: p, label, icon: Icon }) => (
          <button key={p} className={`mg-nav-item ${isActive(path, p) ? "active" : ""}`} onClick={() => navigate(p)} aria-current={isActive(path, p) ? "page" : undefined}>
            <Icon size={17} /> {label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <SosButton path={path} flagged={flagged} />
        <button className="mg-nav-item" onClick={toggleTheme} style={{ marginTop: 6 }}>
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />} {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <div className="mg-row" style={{ marginTop: 10, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <div className="mg-brand-mark" style={{ width: 34, height: 34, borderRadius: 12, fontSize: 12, fontWeight: 800 }}>
            {(user?.name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <div className="mg-grow">
            <div style={{ fontSize: 13, fontWeight: 650, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName(user)}</div>
            <div className="mg-tiny mg-faint">{user?.is_demo ? "Demo student" : "Student"}</div>
          </div>
          <button className="mg-btn quiet" style={{ padding: 6 }} onClick={logout} aria-label="Log out"><LogOut size={16} /></button>
        </div>
      </aside>

      <div className="mg-main">
        <header className="mg-topbar">
          <button className="mg-btn quiet" style={{ padding: 8 }} onClick={() => setMenu(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div style={{ fontWeight: 700 }}>{TITLES[path] || "Mind Guard AI"}</div>
          <button className="mg-btn quiet" style={{ padding: 8 }} onClick={toggleTheme} aria-label="Toggle theme">{theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}</button>
        </header>

        <main className="mg-content" key={path}>
          {needsOnboarding && (
            <div className="mg-card tint-violet mg-row mg-between mg-fade-up" style={{ marginBottom: 18, flexWrap: "wrap", padding: "14px 18px" }}>
              <div className="mg-row">
                <Sparkles size={18} style={{ color: "var(--lavender)" }} />
                <span className="mg-small">Personalise Mind Guard — tell us your triggers and what helps. Takes a minute.</span>
              </div>
              <button className="mg-btn violet sm" onClick={() => navigate("/onboarding")}>Personalise</button>
            </div>
          )}
          <div className="mg-fade-up">{children}</div>
        </main>
      </div>

      <nav className="mg-tabbar" aria-label="Quick navigation">
        {TABS.map(({ path: p, label, icon: Icon }) => (
          <button key={p} className={`mg-tab ${isActive(path, p) ? "active" : ""}`} onClick={() => navigate(p)} aria-current={isActive(path, p) ? "page" : undefined}>
            <Icon size={20} strokeWidth={isActive(path, p) ? 2.4 : 2} />{label.split(" ")[0]}
          </button>
        ))}
        <button className={`mg-tab ${path === "/support" ? "active" : ""}`} onClick={() => navigate("/support")} style={{ color: path === "/support" ? "var(--coral)" : undefined }}>
          <HeartHandshake size={20} />Support
          {flagged && <span style={{ position: "absolute", top: 2, right: 10, width: 8, height: 8, borderRadius: "50%", background: "var(--coral)" }} />}
        </button>
      </nav>

      {menu && (
        <div className="mg-overlay" style={{ placeItems: "stretch start", padding: 0 }} onMouseDown={(e) => e.target === e.currentTarget && setMenu(false)}>
          <div className="mg-modal" style={{ borderRadius: 0, height: "100%", maxHeight: "none", width: 280, maxWidth: "85vw", animation: "mg-fade-up .25s both" }}>
            <div className="mg-row mg-between"><Brand /><button className="mg-btn quiet" onClick={() => setMenu(false)} aria-label="Close menu"><X size={18} /></button></div>
            <div className="mg-stack-sm">
              {NAV.map(({ path: p, label, icon: Icon }) => (
                <button key={p} className={`mg-nav-item ${isActive(path, p) ? "active" : ""}`} onClick={() => navigate(p)}><Icon size={17} /> {label}</button>
              ))}
              <SosButton path={path} flagged={flagged} onClick={() => setMenu(false)} />
              <button className="mg-nav-item" onClick={logout}><LogOut size={17} /> Log out</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
