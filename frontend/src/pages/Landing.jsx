import React from "react";
import { ArrowRight, Brain, HeartPulse, Lock, Moon, Music, ShieldCheck, Sprout, Sun, UsersRound } from "lucide-react";
import { Aurora, Button, Card } from "../components/ui";
import { useApp } from "../lib/store";
import { navigate } from "../lib/router";
import "../styles/auth.css";

const FEATURES = [
  { icon: Brain, tone: "violet", title: "Two-engine detection", body: "Mood and overthinking are analysed by two complementary AI engines, so subtle signs are caught early." },
  { icon: Music, tone: "teal", title: "Music that calms", body: "Personalised soundscapes and your own playlists, chosen for how you feel right now." },
  { icon: Sprout, tone: "amber", title: "Games and a garden", body: "Gentle mini-games and breathing exercises that grow a wellness garden as you look after yourself." },
  { icon: UsersRound, tone: "coral", title: "Counselor connect", body: "When you want support, reach a counselor confidentially. You decide what gets shared." },
];

export default function Landing() {
  const { theme, toggleTheme } = useApp();
  return (
    <>
      <Aurora />
      <div className="mg-landing">
        <nav className="mg-landing-nav" aria-label="Main">
          <div className="mg-brand">
            <span className="mg-brand-mark"><HeartPulse size={18} /></span>
            Mind Guard AI
          </div>
          <div className="mg-row" style={{ gap: 8 }}>
            <button type="button" className="mg-btn ghost sm" onClick={toggleTheme} aria-label="Toggle light or dark theme">
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>Sign in</Button>
          </div>
        </nav>

        <header className="mg-hero mg-stagger">
          <div className="mg-hero-orb"><HeartPulse size={40} /></div>
          <h1>
            Early detection of student mental wellness issues{" "}
            <span className="mg-gradient-text">using AI</span>
          </h1>
          <p className="lead">
            Mind Guard AI listens to how you write and feel, notices when stress starts turning into overthinking,
            and gently guides you back to calm, before it becomes a crisis.
          </p>
          <div className="mg-hero-cta">
            <Button variant="violet" size="lg" onClick={() => navigate("/signup")}>Get started <ArrowRight size={18} /></Button>
            <Button variant="ghost" size="lg" onClick={() => navigate("/login")}>Sign in</Button>
          </div>
        </header>

        <section className="mg-feature-grid mg-stagger" aria-label="Features">
          {FEATURES.map((f) => (
            <Card key={f.title} lift>
              <div className={`mg-icon-tile ${f.tone}`}><f.icon size={20} /></div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </Card>
          ))}
        </section>

        <Card className="mg-promise" glow tint="teal">
          <div className="mg-icon-tile teal" style={{ width: 54, height: 54 }}><ShieldCheck size={26} /></div>
          <div>
            <h2 className="mg-h2">Our privacy promise</h2>
            <p className="mg-muted" style={{ marginTop: 5, fontSize: 13.5, lineHeight: 1.6 }}>
              <Lock size={13} style={{ verticalAlign: "-2px" }} /> Your journal stays yours. Nothing is shared with
              classmates or faculty, and a counselor only hears from you when you choose to connect or in a real emergency you have agreed to.
            </p>
          </div>
        </Card>

        <footer className="mg-landing-foot">
          Mind Guard AI is a wellness companion, not a medical service. If you are in danger, contact local emergency services.
        </footer>
      </div>
    </>
  );
}
