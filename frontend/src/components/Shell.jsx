// Signed-in student app chrome. Layout lives in DashboardLayout (shared with the
// counselor dashboard); this file supplies the student routes, Support button and banner.
import React from "react";
import {
  BarChart3, BookHeart, Flower2, Gamepad2, HeartHandshake, Home, LifeBuoy, MessageCircle,
  Sparkles, User, Wind,
} from "lucide-react";
import { useApp } from "../lib/store";
import { navigate } from "../lib/router";
import { displayName } from "../lib/constants";
import { Aurora } from "./ui";
import DashboardLayout from "./DashboardLayout";

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

function SosButton({ path, flagged, onClick }) {
  return (
    <button className={`mg-nav-item sos ${path === "/support" ? "active" : ""}`} onClick={() => { navigate("/support"); onClick?.(); }}>
      <LifeBuoy size={17} /> Support
      {flagged && <span className="dot" aria-label="Support available for you" />}
    </button>
  );
}

const toItem = (path) => ({ path: p, label, icon }) => ({
  key: p, label, icon, active: isActive(path, p), onSelect: () => navigate(p),
});

export default function Shell({ path, children }) {
  const { user, theme, toggleTheme, signOut, supportFlag } = useApp();
  const flagged = !!(supportFlag && supportFlag.show_prompt);
  const needsOnboarding = user && !user.onboarding_complete && path !== "/onboarding";

  const logout = () => { signOut(); navigate("/"); };

  const banner = needsOnboarding && (
    <div className="mg-card tint-violet mg-row mg-between mg-fade-up" style={{ marginBottom: 18, flexWrap: "wrap", padding: "14px 18px" }}>
      <div className="mg-row">
        <Sparkles size={18} style={{ color: "var(--lavender)" }} />
        <span className="mg-small">Personalise Mind Guard — tell us your triggers and what helps. Takes a minute.</span>
      </div>
      <button className="mg-btn violet sm" onClick={() => navigate("/onboarding")}>Personalise</button>
    </div>
  );

  const supportTab = (
    <button className={`mg-tab ${path === "/support" ? "active" : ""}`} onClick={() => navigate("/support")} style={{ color: path === "/support" ? "var(--coral)" : undefined }}>
      <HeartHandshake size={20} />Support
      {flagged && <span style={{ position: "absolute", top: 2, right: 10, width: 8, height: 8, borderRadius: "50%", background: "var(--coral)" }} />}
    </button>
  );

  return (
    <>
    <Aurora />
    <DashboardLayout
      nav={NAV.map(toItem(path))}
      tabs={TABS.map(toItem(path))}
      tabbarExtra={supportTab}
      sidebarActions={<SosButton path={path} flagged={flagged} />}
      menuActions={(close) => <SosButton path={path} flagged={flagged} onClick={close} />}
      theme={theme}
      onToggleTheme={toggleTheme}
      account={{ initialsFrom: user?.name, name: displayName(user), subtitle: user?.is_demo ? "Demo student" : "Student" }}
      onLogout={logout}
      title={TITLES[path]}
      contentKey={path}
      banner={banner}
    >
      {children}
    </DashboardLayout>
    </>
  );
}
