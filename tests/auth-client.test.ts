import { describe, it, expect } from 'vitest'
import { AuthClient, basicAuth } from '../src/colony/authClient'

describe('AuthClient (login gate)', () => {
  const PASS = 'open-sesame'
  const mk = (now?: () => number) => new AuthClient({ expectedPasscode: PASS, now })

  it('builds an encoded Basic Auth header (password not in plaintext)', () => {
    const h = basicAuth('mayor', 'hunter2')
    expect(h).toBe('Basic ' + btoa('mayor:hunter2'))
    expect(h.includes('hunter2')).toBe(false)
  })

  it('rejects an empty operator name', () => {
    const a = mk()
    expect(a.login('', PASS)).toEqual({ ok: false, error: 'Enter an operator name.' })
    expect(a.isAuthenticated).toBe(false)
  })

  it('rejects the wrong passcode and stays logged out (fails closed)', () => {
    const a = mk()
    expect(a.login('mayor', 'nope').ok).toBe(false)
    expect(a.isAuthenticated).toBe(false)
    expect(a.authHeader()).toEqual({})
  })

  it('accepts the right passcode and attaches a Bearer token', () => {
    const a = mk()
    expect(a.login('mayor', PASS)).toEqual({ ok: true })
    expect(a.isAuthenticated).toBe(true)
    expect(a.operator?.id).toBe('mayor')
    expect(a.authHeader().Authorization?.startsWith('Bearer ')).toBe(true)
  })

  it('expires the session after the window and fails closed', () => {
    let t = 1_000_000
    const a = mk(() => t)
    a.login('mayor', PASS)
    expect(a.isAuthenticated).toBe(true)
    t += 1000 * 60 * 60 * 9 // +9h, past the 8h window
    expect(a.isAuthenticated).toBe(false)
    expect(a.authHeader()).toEqual({})
  })

  it('logout clears the session', () => {
    const a = mk()
    a.login('mayor', PASS)
    a.logout()
    expect(a.isAuthenticated).toBe(false)
    expect(a.authHeader()).toEqual({})
  })

  it('reports ok:false when no passcode is configured', () => {
    const a = new AuthClient({ expectedPasscode: undefined })
    expect(a.login('mayor', 'whatever').ok).toBe(false)
  })
})
