import { useEffect, useSyncExternalStore } from 'react'
import config from '../data/bgm.json'
import { BgmEngine, type BgmBackend, type BgmTrack } from './bgm_engine'

export const BGM_MUTE_KEY = 'hx.bgm.muted.v1'
const tracks = Object.keys(config.tracks) as BgmTrack[]
function createBackend(): BgmBackend {
  const Context = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  // Ask supported Safari versions to treat this as music, not ambient effects.
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
    if (session) session.type = 'playback'
  } catch { /* Older browsers can still use the normal media session. */ }
  const context = new Context()
  const channels = tracks.map(track => {
    const audio = document.createElement('audio')
    audio.hidden = true
    audio.loop = true
    audio.preload = 'none'
    audio.src = config.tracks[track]
    audio.dataset.bgm = track
    document.body.append(audio)
    const source = context.createMediaElementSource(audio)
    const gain = context.createGain()
    gain.gain.value = 0
    source.connect(gain).connect(context.destination)
    return { track, audio, gain,
      voice: {
        play: () => audio.play(),
        isPlaying: () => !audio.paused,
        pause: () => audio.pause(),
        ramp: (from: number, to: number, seconds: number) => {
          const now = context.currentTime
          gain.gain.cancelScheduledValues(now)
          gain.gain.setValueAtTime(from, now)
          if (seconds) gain.gain.linearRampToValueAtTime(to, now + seconds)
          else gain.gain.setValueAtTime(to, now)
        },
      },
    }
  })
  return {
    voices: Object.fromEntries(channels.map(channel => [channel.track, channel.voice])) as BgmBackend['voices'],
    resume: async () => {
      if (context.state !== 'running') await context.resume()
      if (context.state !== 'running') throw new Error('Audio context did not resume')
    },
    isRunning: () => context.state === 'running',
    now: () => context.currentTime,
    later: (callback, ms) => { const timer = window.setTimeout(callback, ms); return () => window.clearTimeout(timer) },
  }
}
let muted = false
try { muted = localStorage.getItem(BGM_MUTE_KEY) === '1' } catch { /* Optional preference. */ }
export const bgm = new BgmEngine(createBackend, muted, value => {
  try { localStorage.setItem(BGM_MUTE_KEY, value ? '1' : '0') } catch { /* Keep session preference. */ }
})
export function installBgm() {
  document.addEventListener('click', bgm.unlock, { capture: true })
  document.addEventListener('touchend', bgm.unlock, { capture: true, passive: true })
  document.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') bgm.unlock() }, { capture: true })
  document.addEventListener('visibilitychange', () => bgm.setHidden(document.hidden))
  window.addEventListener('pagehide', () => bgm.setHidden(true))
  window.addEventListener('pageshow', () => bgm.setHidden(document.hidden))
  bgm.setHidden(document.hidden)
}
export function useBgmTrack(track?: BgmTrack) { useEffect(() => { if (track) bgm.setTrack(track) }, [track]) }
export function useBgm() {
  const snapshot = useSyncExternalStore(bgm.subscribe, bgm.getSnapshot)
  return { ...snapshot, playMusic: bgm.unlock, toggleMusic: () => {
    bgm.setMuted(!snapshot.muted)
    if (snapshot.muted) bgm.unlock()
  } }
}
