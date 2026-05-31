import { useEffect, useRef, useState } from 'react'
import { channelEmbedUrl, currentChannel, anyConfigured, type RadioState } from '../radio'
import type { ColonyRuntime } from '../runtime'

/** Send a YouTube IFrame Player API command via postMessage. Works as long as the embed URL has
 *  `enablejsapi=1` (it does — see channelEmbedUrl). Avoids reloading the iframe on mute/play. */
function sendYT(iframe: HTMLIFrameElement | null, func: string, args: unknown[] = []) {
  if (!iframe?.contentWindow) return
  iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), '*')
}

/** Low Power Radio tray — bottom-right toggle that expands to a Now Playing panel.
 *  The iframe starts MUTED so YouTube + Chrome allow autoplay; the operator's first Sound click
 *  flips it via postMessage (no iframe reload, no track restart). */
export function RadioPanel({ runtime, radio, tv }: { runtime: ColonyRuntime; radio: RadioState; tv: boolean }) {
  const [open, setOpen] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const ch = currentChannel(radio)
  // ALWAYS load the iframe muted so YouTube autoplay isn't blocked; we unmute via the JS API on
  // the operator's first Sound click. The iframe URL stays constant per channel so it never reloads.
  const url = ch ? channelEmbedUrl(ch, { autoplay: true, muted: true }) : ''
  const wired = anyConfigured(radio)

  // React to radio.muted state: send the YouTube IFrame API command, don't rebuild the iframe.
  useEffect(() => {
    if (!iframeRef.current || !radio.on) return
    sendYT(iframeRef.current, radio.muted ? 'mute' : 'unMute')
    if (!radio.muted) sendYT(iframeRef.current, 'playVideo')
  }, [radio.muted, radio.on, radio.channelId])

  // React to radio.on: pause/resume without reloading.
  useEffect(() => {
    if (!iframeRef.current) return
    sendYT(iframeRef.current, radio.on ? 'playVideo' : 'pauseVideo')
  }, [radio.on])

  return (
    <>
      <div className={`radio-tray ${open ? 'is-open' : ''} ${tv ? 'is-tv' : ''}`}>
        <button className="radio-toggle" onClick={() => setOpen((v) => !v)} title="Low Power Radio">
          {radio.on ? '📻' : '📻 ̲'}
          <span className="radio-toggle-label">{radio.on && ch ? ch.name : 'Radio'}</span>
        </button>
        {open && (
          <div className="radio-panel">
            <div className="radio-head">
              <b>📻 Low Power Radio</b>
              <span className="radio-sub">a tiny always-on station on the roof</span>
            </div>

            {!wired && (
              <div className="radio-note">
                Set <code>VITE_RADIO_PLAYLIST_DRIVE</code> (and friends) in <code>.env.local</code> to a YouTube playlist id to start broadcasting. YouTube handles licensing for embedded playback — see <code>docs/research/2026-05-31-low-power-radio.md</code>.
              </div>
            )}

            <div className="radio-channels">
              {radio.channels.map((c) => (
                <button key={c.id} className={`radio-channel ${radio.channelId === c.id ? 'on' : ''} ${c.ref ? '' : 'empty'}`} onClick={() => runtime.tuneRadio(c.id)} disabled={!c.ref} title={c.ref ? c.vibe : 'no playlist configured'}>
                  <b>{c.name}</b>
                  <span>{c.vibe}</span>
                </button>
              ))}
            </div>

            <div className="radio-controls">
              <button onClick={() => runtime.toggleRadio()}>{radio.on ? '⏸ Pause' : '▶ Play'}</button>
              <button onClick={() => runtime.toggleRadioMuted()}>{radio.muted ? '🔇 Unmute' : '🔈 Mute'}</button>
              <button onClick={() => runtime.toggleTv()}>{tv ? '📺 Exit TV' : '📺 TV mode'}</button>
            </div>

            {radio.on && radio.muted && (
              <div className="radio-note">
                YouTube blocks autoplay-with-sound on first paint. Click <b>🔇 Unmute</b> once and the sound stays on.
              </div>
            )}

            {radio.ads.length > 0 && (
              <div className="radio-ads">
                <div className="radio-ads-head">📣 Sponsor reads (in-game ad market)</div>
                {radio.ads.slice(0, 4).map((a) => (
                  <div key={a.id} className="radio-ad">
                    <b>{a.sponsor}</b> — {a.copy}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {radio.on && url && (
        <iframe
          ref={iframeRef}
          className="radio-iframe"
          src={url}
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="origin-when-cross-origin"
          title="Low Power Radio"
        />
      )}

      {tv && ch && radio.on && (
        <div className="tv-now-playing">
          <span className="tv-tag">LOW POWER RADIO</span>
          <b>{ch.name}</b>
          <span>{ch.vibe}</span>
        </div>
      )}
    </>
  )
}
