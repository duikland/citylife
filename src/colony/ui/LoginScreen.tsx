import { useState, type FormEvent } from 'react'
import type { AuthClient } from '../authClient'

/** Border Authority login. No one reaches the Kookerverse / Border Control unauthenticated. */
export function LoginScreen({ auth, onAuthed }: { auth: AuthClient; onAuthed: () => void }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const r = auth.login(name, code)
    if (r.ok) onAuthed()
    else setError(r.error)
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">City<span>Life</span></div>
        <div className="login-sub">Kookerverse · Border Authority</div>
        <p className="login-blurb">The border is the only way onto the planet. Authenticate to open it — no open doors.</p>
        <input className="login-input" placeholder="operator name" value={name} onChange={(e) => { setName(e.target.value); setError(null) }} autoFocus />
        <input className="login-input" type="password" placeholder="passcode" value={code} onChange={(e) => { setCode(e.target.value); setError(null) }} />
        {error && <div className="login-err">⚠ {error}</div>}
        <button className="login-btn" type="submit">Enter the Kookerverse</button>
        {!auth.configured && <div className="login-hint">Dev: set <code>VITE_OPERATOR_PASSCODE</code> in <code>.env.local</code> to enable login.</div>}
      </form>
    </div>
  )
}
