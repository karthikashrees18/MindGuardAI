import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { Aurora, Button } from "../components/ui";
import {
  TriggersStep, RecoveryStep, CopingStep, MusicStep,
  cleanMusic, validateBaselineStep, emptyBaseline, emptyMusic,
} from "../components/onboarding/BaselineSteps";
import { api } from "../api";
import { useApp } from "../lib/store";
import { navigate } from "../lib/router";
import "../styles/auth.css";

const KINDS = ["triggers", "recovery", "coping", "music"];

/**
 * Embeddable wizard for baseline + music preferences (signup steps 3-6).
 * No navigation or page layout inside; the parent decides what happens next.
 */
export function BaselineWizard({ initialBaseline, initialMusic, submitLabel = "Finish", onSubmit, onCancel }) {
  const [step, setStep] = useState(0);
  const [baseline, setBaseline] = useState(() => ({ ...emptyBaseline, ...(initialBaseline || {}) }));
  const [music, setMusic] = useState(() => ({
    ...emptyMusic, ...(initialMusic || {}), playlists: { ...(initialMusic?.playlists || {}) },
  }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");

  const kind = KINDS[step];
  const last = step === KINDS.length - 1;

  const next = async () => {
    if (busy) return;
    const errs = validateBaselineStep(kind, baseline, music);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (!last) { setStep(step + 1); return; }
    setBusy(true);
    setServerError("");
    try {
      await onSubmit({ baseline, music: cleanMusic(music) });
    } catch (e) {
      setServerError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const back = () => { setErrors({}); setStep(step - 1); };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT") { e.preventDefault(); next(); }
  };

  return (
    <div onKeyDown={onKeyDown}>
      <div className="mg-steps" role="progressbar" aria-valuemin={1} aria-valuemax={KINDS.length} aria-valuenow={step + 1} aria-label="Progress">
        {KINDS.map((k, i) => <i key={k} className={i < step ? "done" : i === step ? "cur" : ""} />)}
      </div>
      <div className="mg-step-meta">
        <span>Step {step + 1} of {KINDS.length}</span>
        {onCancel && <button type="button" className="mg-btn quiet sm" onClick={onCancel}>Cancel</button>}
      </div>

      <div className="mg-step-body" key={kind}>
        {kind === "triggers" && <TriggersStep value={baseline.triggers} onChange={(triggers) => setBaseline({ ...baseline, triggers })} />}
        {kind === "recovery" && <RecoveryStep value={baseline.recovery} error={errors.recovery} onChange={(recovery) => { setErrors({}); setBaseline({ ...baseline, recovery }); }} />}
        {kind === "coping" && <CopingStep value={baseline.coping} onChange={(coping) => setBaseline({ ...baseline, coping })} />}
        {kind === "music" && <MusicStep value={music} errors={errors} onChange={setMusic} />}
      </div>

      {serverError && <div className="mg-form-error" role="alert" style={{ marginTop: 16 }}>{serverError}</div>}

      <div className="mg-step-foot">
        {step > 0 ? <Button variant="ghost" icon={ArrowLeft} onClick={back} disabled={busy}>Back</Button> : <span />}
        <Button variant="violet" loading={busy} icon={last ? Check : undefined} onClick={next}>
          {last ? submitLabel : <>Next <ArrowRight size={16} /></>}
        </Button>
      </div>
    </div>
  );
}

export default function Onboarding() {
  const { user, setUser, toast } = useApp();

  const save = async ({ baseline, music }) => {
    const updated = await api.saveOnboarding({ baseline, music });
    if (updated) setUser(updated);
    toast("All set. Mind Guard is now personalised for you.");
    navigate("/home");
  };

  const name = user?.preferred_name || (user?.name || "").split(" ")[0];

  return (
    <>
      <Aurora />
      <div className="mg-center-page">
        <div className="mg-glass-panel mg-wide-panel">
          <div className="mg-auth-head">
            <div className="mg-hero-orb"><Sparkles size={28} /></div>
            <h1 className="mg-h1">Let's personalise Mind Guard for you</h1>
            <p className="mg-muted" style={{ marginTop: 6 }}>
              {name ? `Welcome, ${name}. ` : "Welcome. "}A few quick questions help us understand what works for you. Takes about a minute.
            </p>
          </div>
          <BaselineWizard
            initialBaseline={user?.baseline}
            initialMusic={user?.music}
            submitLabel="Finish setup"
            onSubmit={save}
          />
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <button type="button" className="mg-btn quiet sm" onClick={() => navigate("/home")}>Skip for now</button>
          </div>
        </div>
      </div>
    </>
  );
}
