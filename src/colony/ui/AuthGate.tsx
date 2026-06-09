import { useMemo, useState, useEffect, type ReactNode } from 'react'
import { getAuthClient } from '../authClient'
import { LoginScreen } from './LoginScreen'

/** Gates its children behind operator login. Renders the LoginScreen until authenticated.
 *  On mount, tries a dev auto-login (async — reads VITE_OPERATOR_EMAIL + VITE_OPERATOR_PASSWORD
 *  from the gitignored .env.local and hits the kooker auth service). Shows nothing during that
 *  brief check so there's no login flash when auto-login is configured. */
export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useMemo(() => getAuthClient(), [])
  const [authed, setAuthed] = useState(auth.isAuthenticated)
  const [checking, setChecking] = useState(!auth.isAuthenticated)

  useEffect(() => {
    if (auth.isAuthenticated) {
      setChecking(false)
      return
    }
    auth.tryAutoLogin().then((ok) => {
      if (ok) setAuthed(true)
      setChecking(false)
    })
  }, [auth])

  // Local-testing-only auth bypass. On a DEV build, the colony mounts WITHOUT login when either the
  // VITE_LOCAL_TEST flag is set in .env.local (the persistent setting) or the URL carries ?skipauth=1
  // (a one-off, handy for grabbing screenshots). A production / kind-cluster bundle has
  // import.meta.env.DEV === false, so this is a no-op there and the real border gate always stands.
  const env = (import.meta as unknown as { env?: { DEV?: boolean; VITE_LOCAL_TEST?: string } }).env
  const isDev = Boolean(env?.DEV)
  const localTestSetting = env?.VITE_LOCAL_TEST === '1' || env?.VITE_LOCAL_TEST === 'true'
  const urlSkip = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('skipauth') === '1'
  if (isDev && (localTestSetting || urlSkip)) return <>{children}</>
  if (checking) return null
  if (!authed) return <LoginScreen auth={auth} onAuthed={() => setAuthed(true)} />
  return <>{children}</>
}
