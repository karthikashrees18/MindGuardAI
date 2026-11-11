// Shared signed-in app chrome used by both the student app (Shell) and the counselor
// dashboard (admin/AdminApp): desktop sidebar, mobile top bar + tab bar + menu drawer.
// Router-agnostic — callers pass nav items with their own `active` flag and `onSelect`.
import React, { useEffect, useState } from "react";
import { LogOut, Menu, Moon, ShieldCheck, Sun, X } from "lucide-react";

export function initials(name) {
  return (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function Brand({ label = "Mind Guard AI" }) {
  return (
    <div className="mg-brand">
      <div className="mg-brand-mark"><ShieldCheck size={18} /></div>
      {label}
    </div>
  );
}

/**
 * @param nav          [{ key, label, icon, active, onSelect }] — sidebar + drawer links
 * @param tabs         same shape, optional `short` label — mobile bottom tab bar
 * @param tabbarExtra  extra node appended to the tab bar
 * @param sidebarActions node rendered below the spacer, above the theme toggle
 * @param menuActions  (closeMenu) => node, rendered in the mobile drawer after the links
 * @param account      { initialsFrom, name, subtitle }
 * @param contentKey   remounts the content area and closes the drawer when it changes
 */
export default function DashboardLayout({
  brandLabel,
  nav,
  tabs = [],
  tabbarExtra = null,
  sidebarActions = null,
  menuActions,
  theme,
  onToggleTheme,
  account,
  onLogout,
  title,
  contentKey,
  banner = null,
  children,
}) {
  const [menu, setMenu] = useState(false);

  useEffect(() => { setMenu(false); }, [contentKey]);

  const closeMenu = () => setMenu(false);

  return (
    <div className="mg-app">
      <aside className="mg-side" aria-label="Main navigation">
        <Brand label={brandLabel} />
        {nav.map(({ key, label, icon: Icon, active, onSelect }) => (
          <button key={key} className={`mg-nav-item ${active ? "active" : ""}`} onClick={onSelect} aria-current={active ? "page" : undefined}>
            <Icon size={17} /> {label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {sidebarActions}
        <button className="mg-nav-item" onClick={onToggleTheme} style={{ marginTop: 6 }}>
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />} {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <div className="mg-row" style={{ marginTop: 10, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <div className="mg-brand-mark" style={{ width: 34, height: 34, borderRadius: 12, fontSize: 12, fontWeight: 800 }}>
            {initials(account?.initialsFrom)}
          </div>
          <div className="mg-grow">
            <div style={{ fontSize: 13, fontWeight: 650, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{account?.name}</div>
            <div className="mg-tiny mg-faint">{account?.subtitle}</div>
          </div>
          <button className="mg-btn quiet" style={{ padding: 6 }} onClick={onLogout} aria-label="Log out"><LogOut size={16} /></button>
        </div>
      </aside>

      <div className="mg-main">
        <header className="mg-topbar">
          <button className="mg-btn quiet" style={{ padding: 8 }} onClick={() => setMenu(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div style={{ fontWeight: 700 }}>{title || brandLabel || "Mind Guard AI"}</div>
          <button className="mg-btn quiet" style={{ padding: 8 }} onClick={onToggleTheme} aria-label="Toggle theme">{theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}</button>
        </header>

        <main className="mg-content" key={contentKey}>
          {banner}
          <div className="mg-fade-up">{children}</div>
        </main>
      </div>

      {(tabs.length > 0 || tabbarExtra) && (
        <nav className="mg-tabbar" aria-label="Quick navigation">
          {tabs.map(({ key, label, short, icon: Icon, active, onSelect }) => (
            <button key={key} className={`mg-tab ${active ? "active" : ""}`} onClick={onSelect} aria-current={active ? "page" : undefined}>
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />{short || label.split(" ")[0]}
            </button>
          ))}
          {tabbarExtra}
        </nav>
      )}

      {menu && (
        <div className="mg-overlay" style={{ placeItems: "stretch start", padding: 0 }} onMouseDown={(e) => e.target === e.currentTarget && closeMenu()}>
          <div className="mg-modal" style={{ borderRadius: 0, height: "100%", maxHeight: "none", width: 280, maxWidth: "85vw", animation: "mg-fade-up .25s both" }}>
            <div className="mg-row mg-between"><Brand label={brandLabel} /><button className="mg-btn quiet" onClick={closeMenu} aria-label="Close menu"><X size={18} /></button></div>
            <div className="mg-stack-sm">
              {nav.map(({ key, label, icon: Icon, active, onSelect }) => (
                <button key={key} className={`mg-nav-item ${active ? "active" : ""}`} onClick={onSelect}><Icon size={17} /> {label}</button>
              ))}
              {menuActions?.(closeMenu)}
              <button className="mg-nav-item" onClick={onLogout}><LogOut size={17} /> Log out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
