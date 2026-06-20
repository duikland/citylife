import { useEffect, useRef, useState } from "react";
import { ColonyRuntime } from "../runtime";

/** Pre-login ATTRACT backdrop. When the login screen sits idle, AuthGate mounts this behind the login
 *  card: it spins up its OWN throwaway ColonyRuntime (never the app singleton / window.__colony), starts
 *  the renderer, and drops straight into the cinematic fly-around. The login form stays on top and login
 *  is still required — this is a screensaver, not an auth bypass — so it's safe to run pre-auth.
 *
 *  It is only mounted while idle, so it costs nothing until the operator stops interacting; the moment
 *  they stir, AuthGate unmounts it and the throwaway runtime is disposed. */
export function CinematicBackdrop() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false); // drives the CSS fade-in once the first frame is up

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const runtime = new ColonyRuntime();
    runtime.start(el);
    runtime.setCinematicOnly(true);
    const raf = requestAnimationFrame(() => {
      runtime.resize(); // re-measure after the host has laid out full-screen
      setShown(true);
    });
    const ro = new ResizeObserver(() => runtime.resize());
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      runtime.setCinematicOnly(false);
      runtime.stop(); // disposes the renderer + cancels its frame loop
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={"login-cinematic-host" + (shown ? " is-active" : "")}
      aria-hidden="true"
    />
  );
}
