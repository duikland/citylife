import { useMemo, useState, type ReactNode } from 'react'
import { AuthClient } from '../authClient'
import { LoginScreen } from './LoginScreen'

/** Gates its children behind operator login. Renders the LoginScreen until authenticated. */
export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useMemo(() => new AuthClient(), [])
  const [authed, setAuthed] = useState(() => auth.isAuthenticated)
  if (!authed) return <LoginScreen auth={auth} onAuthed={() => setAuthed(true)} />
  return <>{children}</>
}
