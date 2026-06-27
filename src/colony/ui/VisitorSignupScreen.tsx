import { useState, type FormEvent } from "react";
import { signupVisitor } from "../visitorClient";

interface Props {
  onSignedUp: (email: string) => void;
  onBackToLogin: () => void;
}

export function VisitorSignupScreen({ onSignedUp, onBackToLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const u = username.trim().toLowerCase();
    if (!u) {
      setError("Choose a username.");
      return;
    }
    if (u.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signupVisitor(email.trim(), password, u);
      onSignedUp(email.trim());
    } catch (err) {
      setError((err as Error).message || "Signup failed — try again.");
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
        <div className="login-sub">Visitor Registration</div>
        <p className="login-blurb">
          Create an account to request access. An operator will review your
          registration and send you an unlock code.
        </p>
        <input
          className="login-input"
          type="email"
          placeholder="email address"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          required
          autoFocus
          disabled={busy}
          autoComplete="email"
        />
        <input
          className="login-input"
          type="text"
          placeholder="username (your in-game handle)"
          value={username}
          onChange={(e) => {
            setUsername(
              e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
            );
            setError(null);
          }}
          required
          disabled={busy}
          autoComplete="username"
          minLength={3}
          maxLength={32}
        />
        <input
          className="login-input"
          type="password"
          placeholder="password (min 8 characters)"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(null);
          }}
          required
          disabled={busy}
          autoComplete="new-password"
          minLength={8}
        />
        {error && <div className="login-err">⚠ {error}</div>}
        <button className="login-btn" type="submit" disabled={busy}>
          {busy ? "Registering…" : "Request access"}
        </button>
        <div className="login-hint visitor-back">
          Already have an account?{" "}
          <button type="button" className="login-link" onClick={onBackToLogin}>
            Sign in
          </button>
        </div>
      </form>
    </div>
  );
}
