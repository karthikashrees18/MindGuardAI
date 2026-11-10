import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, HeartPulse, Moon, Sun } from "lucide-react";
import { Aurora, Button, Chip, Field } from "../components/ui";
import {
  TriggersStep, RecoveryStep, CopingStep, MusicStep, StepTitle,
  cleanMusic, validateBaselineStep, emptyBaseline, emptyMusic,
} from "../components/onboarding/BaselineSteps";
import { useApp } from "../lib/store";
import { navigate } from "../lib/router";
import { adminApi, saveAdminToken, clearAdminToken } from "../admin/api";
import { COUNSELOR_URL } from "../components/Shell";
import "../styles/auth.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function strengthOf(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) s++;
  return pw ? Math.max(1, s) : 0;
}
const STRENGTH_LABEL = ["", "Weak", "Okay", "Good", "Strong"];

function ThemeButton() {
  const { theme, toggleTheme } = useApp();
  return (
    <div className="mg-top-actions">
      <button type="button" className="mg-btn ghost sm" onClick={toggleTheme} aria-label="Toggle light or dark theme">
        {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
      </button>
    </div>
  );
}

function PasswordInput({ id, value, onChange, invalid, autoComplete, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="mg-pw-wrap">
      <input
        id={id} className={`mg-input ${invalid ? "invalid" : ""}`} type={show ? "text" : "password"}
        value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete}
        placeholder={placeholder} aria-invalid={!!invalid}
      />
      <button type="button" className="mg-btn quiet mg-pw-toggle" style={{ padding: 8 }} onClick={() => setShow(!show)}
        aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function TextField({ id, label, hint, error, value, onChange, ...rest }) {
  return (
    <div>
      <label className="mg-label" htmlFor={id}>{label}</label>
      <input id={id} className={`mg-input ${error ? "invalid" : ""}`} value={value}
        onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} {...rest} />
      {error ? <div className="mg-error" role="alert">{error}</div> : hint ? <div className="mg-hint">{hint}</div> : null}
    </div>
  );
}

function Brand({ title, sub }) {
  return (
    <div className="mg-auth-head">
      <div className="mg-hero-orb"><HeartPulse size={28} /></div>
      <h1 className="mg-h1">{title}</h1>
      {sub && <p className="mg-muted" style={{ marginTop: 6 }}>{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ login */
const ROLE_KEY = "mg_role";
const ROLES = {
  student: { label: "Student", placeholder: "you@university.edu", sub: "Sign in to continue your wellness journey." },
  counselor: { label: "Counselor", placeholder: "counselor@university.edu", sub: "Sign in to the counselor dashboard." },
};

function Login() {
  const { signIn } = useApp();
  const [role, setRole] = useState("student");
  // Non-secret convenience: the counselor tab pre-fills the email (set VITE_COUNSELOR_EMAIL on Vercel);
  // the password comes from the browser's saved-password autofill.
  const counselorEmail = import.meta.env.VITE_COUNSELOR_EMAIL || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const errs = {};
    if (!EMAIL_RE.test(email.trim())) errs.email = "Enter a valid email address.";
    if (!password) errs.password = "Enter your password.";
    setErrors(errs);
    setServerError("");
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      if (role === "counselor") {
        // Staff sign in against the same API but land in the counselor dashboard app.
        const res = await adminApi.login(email.trim(), password);
        saveAdminToken(res.access_token);
        const me = await adminApi.me();
        if (me.role !== "counselor" && me.role !== "admin") {
          clearAdminToken();
          throw new Error("This account doesn't have counselor access. Use the Student tab instead.");
        }
        try { localStorage.setItem(ROLE_KEY, me.role); } catch { /* storage blocked */ }
        window.location.assign(COUNSELOR_URL);
        return;
      }
      await signIn(email.trim(), password);
      try { localStorage.setItem(ROLE_KEY, "student"); } catch { /* storage blocked */ }
      navigate("/home");
    } catch (err) {
      setServerError(err?.message || "Couldn't sign you in. Please try again.");
      setBusy(false);
    }
  };

  return (
    <form className="mg-glass-panel" onSubmit={submit} noValidate>
      <Brand title="Welcome back" sub={ROLES[role].sub} />
      <div className="mg-stack">
        <div role="tablist" aria-label="Sign in as" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: 4, borderRadius: 14, background: "var(--surface)", border: "1px solid var(--border)" }}>
          {Object.entries(ROLES).map(([key, r]) => (
            <button key={key} type="button" role="tab" aria-selected={role === key}
              className={`mg-btn ${role === key ? "violet" : "quiet"} sm`}
              onClick={() => { setRole(key); setServerError(""); setErrors({}); setEmail(key === "counselor" ? counselorEmail : ""); }}>
              {r.label}
            </button>
          ))}
        </div>
        <TextField id="login-email" label="Email" type="email" autoComplete="email" placeholder={ROLES[role].placeholder}
          value={email} onChange={setEmail} error={errors.email} />
        <Field label={null} error={errors.password}>
          <label className="mg-label" htmlFor="login-password">Password</label>
          <PasswordInput id="login-password" value={password} onChange={setPassword} invalid={errors.password}
            autoComplete="current-password" placeholder="Your password" />
        </Field>
        {serverError && <div className="mg-form-error" role="alert">{serverError}</div>}
        <Button variant="violet" size="lg" block type="submit" loading={busy}>
          {role === "counselor" ? "Sign in to dashboard" : "Sign in"}
        </Button>
        {role === "student" && (
          <p className="mg-muted mg-small" style={{ textAlign: "center" }}>
            New here?{" "}
            <a href="#/signup" style={{ color: "var(--lavender)", fontWeight: 700 }}>Create account</a>
          </p>
        )}
        <p style={{ textAlign: "center" }}>
          <a href="#/" className="mg-faint mg-small">Back to home</a>
        </p>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------------- signup */
const STEPS = ["account", "about", "triggers", "recovery", "coping", "music", "support"];
const YEARS = ["1st year", "2nd year", "3rd year", "4th year", "5th year+", "Postgraduate", "PhD"];
const PHONE_RE = /^\+?[0-9][0-9\s\-()]{6,17}$/;

function Signup() {
  const { signUp } = useApp();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");

  const [account, setAccount] = useState({ name: "", email: "", password: "", confirm: "" });
  const [profile, setProfile] = useState({ preferred_name: "", institution: "", department: "", year_of_study: "" });
  const [baseline, setBaseline] = useState(emptyBaseline);
  const [music, setMusic] = useState(emptyMusic);
  const [support, setSupport] = useState({
    name: "", relationship: "", phone: "", email: "", checkin_time: "", privacy: false, crisis: false,
  });

  const kind = STEPS[step];
  const last = step === STEPS.length - 1;
  const setA = (k) => (v) => setAccount((a) => ({ ...a, [k]: v }));
  const setP = (k) => (v) => setProfile((p) => ({ ...p, [k]: v }));
  const setS = (k) => (v) => setSupport((s) => ({ ...s, [k]: v }));

  const validate = () => {
    const e = {};
    if (kind === "account") {
      if (account.name.trim().length < 2) e.name = "Please tell us your name.";
      if (!EMAIL_RE.test(account.email.trim())) e.email = "Enter a valid email address.";
      if (account.password.length < 8) e.password = "Use at least 8 characters.";
      if (account.confirm !== account.password) e.confirm = "Passwords don't match.";
    } else if (kind === "about") {
      if (!profile.institution.trim()) e.institution = "Which university or college are you at?";
    } else if (kind === "support") {
      if (support.name.trim() && !support.phone.trim()) e.phone = "Add a phone number so we can reach this person.";
      if (support.phone.trim() && !PHONE_RE.test(support.phone.trim())) e.phone = "That phone number doesn't look right.";
      if (support.email.trim() && !EMAIL_RE.test(support.email.trim())) e.contactEmail = "That email doesn't look right.";
      if (!support.privacy) e.privacy = "Please agree to continue.";
      if (!support.crisis) e.crisis = "Please agree to continue.";
    } else {
      Object.assign(e, validateBaselineStep(kind, baseline, music));
    }
    return e;
  };

  const buildPayload = () => {
    const trim = (v) => v.trim();
    const prof = {};
    Object.entries(profile).forEach(([k, v]) => { if (trim(v)) prof[k] = trim(v); });
    const peer = support.name.trim() && support.phone.trim()
      ? {
        full_name: trim(support.name), phone_number: trim(support.phone),
        ...(trim(support.relationship) ? { relationship: trim(support.relationship) } : {}),
        ...(trim(support.email) ? { email: trim(support.email) } : {}),
      }
      : null;
    return {
      name: trim(account.name),
      email: trim(account.email),
      password: account.password,
      profile: prof,
      peer_contact: peer,
      preferences: {
        ...(support.checkin_time ? { checkin_time: support.checkin_time } : {}),
        privacy_consent: support.privacy,
        crisis_consent: support.crisis,
      },
      baseline,
      music: cleanMusic(music),
    };
  };

  const next = async () => {
    if (busy) return;
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (!last) { setStep(step + 1); return; }
    setBusy(true);
    setServerError("");
    try {
      await signUp(buildPayload());
      navigate("/home");
    } catch (err) {
      setServerError(err?.message || "We couldn't create your account. Please try again.");
      setBusy(false);
    }
  };

  const back = () => { setErrors({}); setServerError(""); setStep(step - 1); };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "checkbox") { e.preventDefault(); next(); }
  };

  const strength = strengthOf(account.password);

  return (
    <div className="mg-glass-panel mg-wide-panel" onKeyDown={onKeyDown}>
      <Brand title="Create your account" sub="A calm space that notices when things get heavy." />
      <div className="mg-steps" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-label="Signup progress">
        {STEPS.map((k, i) => <i key={k} className={i < step ? "done" : i === step ? "cur" : ""} />)}
      </div>
      <div className="mg-step-meta">
        <span>Step {step + 1} of {STEPS.length}</span>
        <a href="#/login" className="mg-faint">Already have an account? Sign in</a>
      </div>

      <div className="mg-step-body" key={kind}>
        {kind === "account" && (
          <div className="mg-stack">
            <StepTitle title="Let's start with the basics" />
            <TextField id="su-name" label="Full name" autoComplete="name" value={account.name} onChange={setA("name")} error={errors.name} />
            <TextField id="su-email" label="Email" type="email" autoComplete="email" placeholder="you@university.edu"
              value={account.email} onChange={setA("email")} error={errors.email} />
            <div>
              <label className="mg-label" htmlFor="su-pw">Password</label>
              <PasswordInput id="su-pw" value={account.password} onChange={setA("password")} invalid={errors.password}
                autoComplete="new-password" placeholder="At least 8 characters" />
              <div className={`mg-meter s${strength}`} aria-hidden="true"><i /><i /><i /><i /></div>
              {errors.password
                ? <div className="mg-error" role="alert">{errors.password}</div>
                : <div className="mg-hint">{strength ? `Strength: ${STRENGTH_LABEL[strength]}` : "Mix letters, numbers and a symbol for a stronger password."}</div>}
            </div>
            <div>
              <label className="mg-label" htmlFor="su-confirm">Confirm password</label>
              <PasswordInput id="su-confirm" value={account.confirm} onChange={setA("confirm")} invalid={errors.confirm}
                autoComplete="new-password" placeholder="Type it once more" />
              {errors.confirm && <div className="mg-error" role="alert">{errors.confirm}</div>}
            </div>
          </div>
        )}

        {kind === "about" && (
          <div className="mg-stack">
            <StepTitle title="A little about you" sub="Helps us feel less like a form and more like a friend." />
            <TextField id="su-pref" label="What should we call you? (optional)" placeholder="Preferred name" value={profile.preferred_name} onChange={setP("preferred_name")} />
            <TextField id="su-inst" label="Institution" autoComplete="organization" value={profile.institution} onChange={setP("institution")} error={errors.institution} />
            <TextField id="su-dept" label="Department / major (optional)" value={profile.department} onChange={setP("department")} />
            <div>
              <label className="mg-label" htmlFor="su-year">Year of study (optional)</label>
              <select id="su-year" className="mg-select" value={profile.year_of_study} onChange={(e) => setP("year_of_study")(e.target.value)}>
                <option value="">Prefer not to say</option>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        )}

        {kind === "triggers" && <TriggersStep value={baseline.triggers} onChange={(triggers) => setBaseline({ ...baseline, triggers })} />}
        {kind === "recovery" && <RecoveryStep value={baseline.recovery} error={errors.recovery} onChange={(recovery) => { setErrors({}); setBaseline({ ...baseline, recovery }); }} />}
        {kind === "coping" && <CopingStep value={baseline.coping} onChange={(coping) => setBaseline({ ...baseline, coping })} />}
        {kind === "music" && <MusicStep value={music} errors={errors} onChange={setMusic} />}

        {kind === "support" && (
          <div className="mg-stack">
            <StepTitle title="Support and consent" sub="Almost there. You stay in control of all of this." />
            <div className="mg-stack" style={{ gap: 12 }}>
              <div className="mg-label" style={{ marginBottom: 0 }}>A trusted person (optional)</div>
              <TextField id="su-cname" label="Name" placeholder="A friend or family member" value={support.name} onChange={setS("name")} />
              <div className="mg-row" style={{ alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}><TextField id="su-crel" label="Relationship" placeholder="Friend, sibling..." value={support.relationship} onChange={setS("relationship")} /></div>
                <div style={{ flex: 1 }}><TextField id="su-cphone" label="Phone" type="tel" autoComplete="off" value={support.phone} onChange={setS("phone")} error={errors.phone} /></div>
              </div>
              <TextField id="su-cmail" label="Email (optional)" type="email" value={support.email} onChange={setS("email")} error={errors.contactEmail} />
            </div>
            <div>
              <div className="mg-label">When would you like to check in?</div>
              <div className="mg-row-wrap" role="group" aria-label="Preferred check-in time">
                <Chip on={support.checkin_time === "morning"} onClick={() => setS("checkin_time")(support.checkin_time === "morning" ? "" : "morning")}>Morning</Chip>
                <Chip on={support.checkin_time === "evening"} onClick={() => setS("checkin_time")(support.checkin_time === "evening" ? "" : "evening")}>Evening</Chip>
              </div>
            </div>
            <div className="mg-stack" style={{ gap: 10 }}>
              <div>
                <label className="mg-check-row">
                  <input type="checkbox" checked={support.privacy} onChange={(e) => setS("privacy")(e.target.checked)} aria-invalid={!!errors.privacy} />
                  <span>I understand my journal entries are private. They are analysed to support my wellbeing and are never shown to classmates or faculty.</span>
                </label>
                {errors.privacy && <div className="mg-error" role="alert">{errors.privacy}</div>}
              </div>
              <div>
                <label className="mg-check-row">
                  <input type="checkbox" checked={support.crisis} onChange={(e) => setS("crisis")(e.target.checked)} aria-invalid={!!errors.crisis} />
                  <span>If I'm ever in serious distress, Mind Guard may reach out to a counselor or my trusted person so I get help. I can change this any time.</span>
                </label>
                {errors.crisis && <div className="mg-error" role="alert">{errors.crisis}</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      {serverError && <div className="mg-form-error" role="alert" style={{ marginTop: 16 }}>{serverError}</div>}

      <div className="mg-step-foot">
        {step > 0
          ? <Button variant="ghost" icon={ArrowLeft} onClick={back} disabled={busy}>Back</Button>
          : <Button variant="quiet" onClick={() => navigate("/")}>Home</Button>}
        <Button variant="violet" loading={busy} icon={last ? Check : undefined} onClick={next}>
          {last ? "Create account" : <>Next <ArrowRight size={16} /></>}
        </Button>
      </div>
    </div>
  );
}

export default function Auth({ mode = "login" }) {
  return (
    <>
      <Aurora />
      <ThemeButton />
      <div className="mg-center-page">
        {mode === "signup" ? <Signup /> : <Login />}
      </div>
    </>
  );
}
