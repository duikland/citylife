import { useState, type FormEvent } from "react";
import { redeemUnlockCode } from "../visitorClient";

interface Props {
  /** Pre-filled from the signup step. */
  initialEmail?: string;
  onActivated: () => void;
  onBackToLogin: () => void;
}

export function VisitorUnlockScreen({
  initialEmail = "",
  onActivated,
  onBackToLogin,
}: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const formatCode = (raw: string) => {
    // Allow only hex chars, auto-insert hyphens at 4-char boundaries → XXXX-XXXX-XXXX-...
    const hex = raw
      .replace(/[^0-9a-fA-F]/g, "")
      .toUpperCase()
      .slice(0, 32);
    return hex.match(/.{1,4}/g)?.join("-") ?? hex;
  };

  const handleCodeChange = (v: string) => {
    setCode(formatCode(v));
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const stripped = code.replace(/-/g, "");
    if (stripped.length < 16) {
      setError("Code is incomplete — check you typed it correctly.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await redeemUnlockCode(email.trim(), stripped);
      onActivated();
    } catch (err) {
      // The backend returns a single generic error for all failure cases — surface it directly.
      setError((err as Error).message || "Invalid or expired code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          City<span>Life</span>
        </div>
        <div className="login-sub">Enter unlock code</div>
        <p className="login-blurb">
          An operator has reviewed your registration and sent you a one-time
          unlock code. Enter it below to activate your account.
        </p>
        <input
          className="login-input"
          type="email"
          placeholder="your registration email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          required
          disabled={busy}
          autoComplete="email"
          autoFocus={!initialEmail}
        />
        <input
          className="login-input visitor-code-input"
          type="text"
          placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          required
          disabled={busy}
          autoFocus={!!initialEmail}
          autoComplete="off"
          spellCheck={false}
        />
        {error && <div className="login-err">⚠ {error}</div>}
        <button className="login-btn" type="submit" disabled={busy}>
          {busy ? "Activating…" : "Activate account"}
        </button>
        <div className="login-hint visitor-back">
          No code yet?{" "}
          <button type="button" className="login-link" onClick={onBackToLogin}>
            Back to sign in
          </button>
        </div>
      </form>
    </div>
  );
}
