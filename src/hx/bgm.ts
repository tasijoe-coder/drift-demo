import { useEffect, useSyncExternalStore } from 'react'
import config from '../data/bgm.json'
import { BgmEngine, type BgmBackend, type BgmTrack } from './bgm_engine'

export const BGM_MUTE_KEY = 'hx.bgm.muted.v1'
const tracks = Object.keys(config.tracks) as BgmTrack[]
// Tiny silent PCM clips unlock media elements without downloading all five MP3s.
function silence() {
  const data = new Uint8Array(844)
  const view = new DataView(data.buffer)
  for (const [offset, word] of [[0, 'RIFF'], [8, 'WAVE'], [12, 'fmt '], [36, 'data']] as const)
    for (let i = 0; i < word.length; i++) data[offset + i] = word.charCodeAt(i)
  view.setUint32(4, 836, true); view.setUint32(16, 16, true)
  view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, 8000, true); view.setUint32(28, 16000, true)
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); view.setUint32(40, 800, true)
  return 'data:audio/wav;base64,' + btoa(String.fromCharCode(...data))
}
function createBackend(): BgmBackend {
  const Context = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const context = new Context()
  const silent = silence()
  const channels = tracks.map(track => {
    const audio = document.createElement('audio')
    audio.hidden = true
    audio.loop = true
    audio.preload = 'none'
    audio.src = silent
    audio.dataset.bgm = track
    document.body.append(audio)
    const source = context.createMediaElementSource(audio)
    const gain = context.createGain()
    gain.gain.value = 0
    source.connect(gain).connect(context.destination)
    let configured = false
    return { track, audio, gain,
      voice: {
        play: () => {
          if (!configured) { audio.src = config.tracks[track]; configured = true }
          return audio.play()
        },
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
    prime: () => Promise.all(channels.map(channel => channel.audio.play().then(() => channel.audio.pause()))).then(() => {}),
    resume: () => context.state === 'running' ? Promise.resolve() : context.resume(),
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
  document.addEventListener('pointerdown', bgm.unlock, { capture: true })
  document.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') bgm.unlock() }, { capture: true })
  document.addEventListener('visibilitychange', () => bgm.setHidden(document.hidden))
  window.addEventListener('pagehide', () => bgm.setHidden(true))
  window.addEventListener('pageshow', () => bgm.setHidden(document.hidden))
  bgm.setHidden(document.hidden)
}
export function useBgmTrack(track?: BgmTrack) { useEffect(() => { if (track) bgm.setTrack(track) }, [track]) }
export function useBgm() {
  const snapshot = useSyncExternalStore(bgm.subscribe, bgm.getSnapshot)
  return { ...snapshot, toggleMusic: () => {
    bgm.setMuted(!snapshot.muted)
    if (snapshot.muted) bgm.unlock()
  } }
}
