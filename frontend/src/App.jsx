// Mind Guard AI — student web app. Hash-routed (#/home …), auth-guarded.
import React, { Suspense, lazy, useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { useApp } from "./lib/store";
import { navigate, useRoute } from "./lib/router";
import { Aurora, Button, Toasts } from "./components/ui";
import Shell, { COUNSELOR_URL } from "./components/Shell";
import DemoDock from "./components/DemoDock";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import CheckIn from "./pages/CheckIn";
import Chat from "./pages/Chat";
import CalmSpace from "./pages/CalmSpace";
import Support from "./pages/Support";
import Profile from "./pages/Profile";

// heavier / less-visited screens load on demand
const Games = lazy(() => import("./pages/Games"));
const BubblePop = lazy(() => import("./pages/games/BubblePop"));
const Reframe = lazy(() => import("./pages/games/Reframe"));
const GardenPage = lazy(() => import("./pages/GardenPage"));
const Reports = lazy(() => import("./pages/Reports"));

const PUBLIC = ["/", "/login", "/signup"];

// #/counselor (or #/counselor-dashboard) hands off to the counselor dashboard app.
const COUNSELOR_ROUTES = ["/counselor", "/counselor-dashboard"];

const PRIVATE_ROUTES = {
  "/home": Home,
  "/checkin": CheckIn,
  "/chat": Chat,
  "/calm": CalmSpace,
  "/games": Games,
  "/games/bubble": BubblePop,
  "/games/reframe": Reframe,
  "/garden": GardenPage,
  "/reports": Reports,
  "/support": Support,
  "/profile": Profile,
};

function Splash() {
  return (
    <>
      <Aurora />
      <div className="mg-center-page">
        <div className="mg-hero-orb"><ShieldCheck size={44} /></div>
      </div>
    </>
  );
}

function PageLoading() {
  return <div className="mg-skeleton" style={{ height: 240, marginTop: 8 }} aria-busy="true" />;
}

function StaffNotice({ account }) {
  const { setStaffAccount } = useApp();
  return (
    <>
    <Aurora />
    <div className="mg-center-page">
      <div className="mg-glass-panel mg-stack" style={{ textAlign: "center" }}>
        <div className="mg-h2">Hi {account.name} — that's a staff account</div>
        <p className="mg-muted">Counselor and admin accounts use the secure portal, not the student app.</p>
        <a className="mg-btn lg" href="/admin.html">Open the counselor portal</a>
        <Button variant="quiet" onClick={() => { setStaffAccount(null); navigate("/login"); }}>Back to student sign in</Button>
      </div>
    </div>
    </>
  );
}

export default function App() {
  const { user, booting, staffAccount, toasts } = useApp();
  const { path } = useRoute();

  // route guards (done in an effect so we never navigate during render)
  useEffect(() => {
    if (COUNSELOR_ROUTES.includes(path)) { window.location.replace(COUNSELOR_URL); return; }
    if (booting) return;
    if (!user && !PUBLIC.includes(path)) navigate("/", { replace: true });
    else if (user && PUBLIC.includes(path)) navigate("/home", { replace: true });
    else if (user && path !== "/onboarding" && !PRIVATE_ROUTES[path]) navigate("/home", { replace: true });
  }, [user, booting, path]);

  let body;
  if (booting || COUNSELOR_ROUTES.includes(path)) {
    body = <Splash />;
  } else if (staffAccount && !user) {
    body = <StaffNotice account={staffAccount} />;
  } else if (!user) {
    body = path === "/login" ? <Auth mode="login" /> : path === "/signup" ? <Auth mode="signup" /> : <Landing />;
  } else if (path === "/onboarding") {
    body = <Onboarding />;
  } else {
    const Page = PRIVATE_ROUTES[path];
    body = Page ? (
      <Shell path={path}>
        <Suspense fallback={<PageLoading />}><Page /></Suspense>
      </Shell>
    ) : <Splash />;
  }

  return (
    <>
      {body}
      <DemoDock />
      <Toasts toasts={toasts} />
    </>
  );
}
