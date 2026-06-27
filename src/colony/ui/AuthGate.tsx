import { useMemo, useState, useEffect, type ReactNode } from "react";
import { getAuthClient } from "../authClient";
import { LoginScreen } from "./LoginScreen";
import { CinematicBackdrop } from "./CinematicBackdrop";
import { VisitorSignupScreen } from "./VisitorSignupScreen";
import { VisitorUnlockScreen } from "./VisitorUnlockScreen";

type View =
  | "login"
  | "visitor-signup"
  | "visitor-pending"
  | "visitor-unlock"
  | "visitor-activated";

/** Gates its children behind operator login. Renders the LoginScreen until authenticated.
 *  On mount, tries a dev auto-login (async — reads VITE_OPERATOR_EMAIL + VITE_OPERATOR_PASSWORD
 *  from the gitignored .env.local and hits the kooker auth service). Shows nothing during that
 *  brief check so there's no login flash when auto-login is configured.
 *
 *  Visitor self-service flow (no operator account required):
 *    login → visitor-signup → visitor-pending → visitor-unlock → visitor-activated → login
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useMemo(() => getAuthClient(), []);
  // QA/dev affordance: ?login=1 forces the login form to show even when a cached session or dev
  // auto-login would otherwise skip it — so the login screen (and its 10s idle cinematic) can be
  // exercised on a box that auto-logs-in. It only ever SHOWS the form, never bypasses auth, so it is
  // harmless on the cluster.
  const forceLogin =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("login") === "1";
  const [authed, setAuthed] = useState(
    forceLogin ? false : auth.isAuthenticated,
  );
  const [checking, setChecking] = useState(
    forceLogin ? false : !auth.isAuthenticated,
  );
  // After 10s untouched, the login screen drops into a cinematic fly-around backdrop (LoginScreen owns
  // the idle timer; we own the backdrop). It's a screensaver behind the card — login is still required.
  const [idle, setIdle] = useState(false);
  // The visitor self-service flow's view state machine (only reached when not authed).
  const [view, setView] = useState<View>("login");
  const [signedUpEmail, setSignedUpEmail] = useState("");

  useEffect(() => {
    if (forceLogin) {
      setChecking(false);
      return;
    }
    if (auth.isAuthenticated) {
      setChecking(false);
      return;
    }
    auth.tryAutoLogin().then((ok) => {
      if (ok) setAuthed(true);
      setChecking(false);
    });
  }, [auth, forceLogin]);

  // Local-testing-only auth bypass. The colony mounts WITHOUT login ONLY when ALL of these hold:
  //   • it's a DEV build (import.meta.env.DEV) — a production `vite build` has DEV === false, so the
  //     cluster bundle (citylife.kooker.co.za) can never bypass; the real border gate always stands;
  //   • AND the page is served from a LOCAL host (localhost / 127.0.0.1 / LAN) — a belt-and-suspenders
  //     guard so the bypass can never fire on a kooker.co.za domain even if a dev build were served there;
  //   • AND either VITE_LOCAL_TEST is set in .env.local or the URL carries ?skipauth=1.
  // This keeps the skip strictly on the developer's own machine, off the cluster — by the operator's ask.
  const env = (
    import.meta as unknown as {
      env?: { DEV?: boolean; VITE_LOCAL_TEST?: string };
    }
  ).env;
  const isDev = Boolean(env?.DEV);
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const isLocalHost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
  const localTestSetting =
    env?.VITE_LOCAL_TEST === "1" || env?.VITE_LOCAL_TEST === "true";
  const urlSkip =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("skipauth") === "1";
  if (isDev && isLocalHost && (localTestSetting || urlSkip))
    return <>{children}</>;
  if (checking) return null;
  if (authed) return <>{children}</>;

  const backToLogin = () => setView("login");

  if (view === "visitor-signup") {
    return (
      <VisitorSignupScreen
        onSignedUp={(email) => {
          setSignedUpEmail(email);
          setView("visitor-pending");
        }}
        onBackToLogin={backToLogin}
      />
    );
  }

  if (view === "visitor-pending") {
    return (
      <div className="login">
        <div className="login-card">
          <div className="login-brand">
            City<span>Life</span>
          </div>
          <div className="login-sub">Registration received</div>
          <p className="login-blurb">
            Your account is pending operator review. Once approved, you'll
            receive a one-time unlock code. Enter it below when you have it.
          </p>
          <div className="visitor-pending-badge">Awaiting activation</div>
          <button
            className="login-btn"
            type="button"
            onClick={() => setView("visitor-unlock")}
          >
            I have my unlock code
          </button>
          <div className="login-hint visitor-back">
            <button type="button" className="login-link" onClick={backToLogin}>
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "visitor-unlock") {
    return (
      <VisitorUnlockScreen
        initialEmail={signedUpEmail}
        onActivated={() => setView("visitor-activated")}
        onBackToLogin={backToLogin}
      />
    );
  }

  if (view === "visitor-activated") {
    return (
      <div className="login">
        <div className="login-card">
          <div className="login-brand">
            City<span>Life</span>
          </div>
          <div className="login-sub">Account activated</div>
          <p className="login-blurb">
            Your account is now active. Sign in with your email and password to
            enter the Kookerverse.
          </p>
          <div className="visitor-activated-badge">Ready to enter</div>
          <button className="login-btn" type="button" onClick={backToLogin}>
            Sign in now
          </button>
        </div>
      </div>
    );
  }

  // The default (login) view: the form, with the idle→cinematic backdrop behind it AND the visitor
  // entry points wired in.
  return (
    <>
      {idle && <CinematicBackdrop />}
      <LoginScreen
        auth={auth}
        onAuthed={() => setAuthed(true)}
        onVisitorSignup={() => setView("visitor-signup")}
        onVisitorUnlock={() => setView("visitor-unlock")}
        onIdle={() => setIdle(true)}
        onActive={() => setIdle(false)}
        isCinematic={idle}
      />
    </>
  );
}
