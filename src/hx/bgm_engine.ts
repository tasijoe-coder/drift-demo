import config from '../data/bgm.json'

import type { BgmTrack } from '../data/bgm'
export type { BgmTrack } from '../data/bgm'
export type BgmStatus = 'locked' | 'loading' | 'playing' | 'paused' | 'blocked'
export type BgmSnapshot = { muted: boolean; track: BgmTrack; status: BgmStatus }
export interface BgmVoice {
  play(): Promise<void>
  pause(): void
  ramp(from: number, to: number, seconds: number): void
}
export interface BgmBackend {
  voices: Record<BgmTrack, BgmVoice>
  /** Called synchronously within the first user gesture. */
  prime(): Promise<void>
  resume(): Promise<void>
  now(): number
  later(callback: () => void, ms: number): () => void
}
type Ramp = { from: number; to: number; at: number; duration: number }
const tracks = Object.keys(config.tracks) as BgmTrack[]

/** Browser-independent mixer; media clocks are preserved by pausing, never seeking. */
export class BgmEngine {
  private backend?: BgmBackend
  private ready = false
  private unlocking = false
  private hidden = false
  private generation = 0
  private cancelFinish?: () => void
  private playing = new Set<BgmTrack>()
  private pending = new Map<BgmTrack, Promise<void>>()
  private ramps = new Map<BgmTrack, Ramp>()
  private listeners = new Set<() => void>()
  private snapshot: BgmSnapshot
  private createBackend: () => BgmBackend
  private persist: (muted: boolean) => void
  constructor(createBackend: () => BgmBackend, muted = false, persist: (muted: boolean) => void = () => {}) {
    this.createBackend = createBackend
    this.persist = persist
    this.snapshot = { muted, track: 'theme', status: 'locked' }
  }
  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private publish(patch: Partial<BgmSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch }
    this.listeners.forEach(listener => listener())
  }
  private level(track: BgmTrack) {
    const ramp = this.ramps.get(track)
    if (!ramp || !this.backend) return 0
    const fraction = ramp.duration ? Math.min(1, Math.max(0, (this.backend.now() - ramp.at) / ramp.duration)) : 1
    return ramp.from + (ramp.to - ramp.from) * fraction
  }
  private fade(track: BgmTrack, to: number, seconds: number) {
    const from = this.level(track)
    this.backend!.voices[track].ramp(from, to, seconds)
    this.ramps.set(track, { from, to, at: this.backend!.now(), duration: seconds })
  }
  private stop() {
    ++this.generation
    this.cancelFinish?.()
    if (this.backend) for (const track of tracks) {
      this.fade(track, 0, 0)
      this.backend.voices[track].pause()
    }
    this.playing.clear()
    this.publish({ status: this.ready ? 'paused' : 'locked' })
  }
  setTrack(track: BgmTrack) {
    if (this.snapshot.track === track) return
    this.publish({ track })
    void this.reconcile()
  }
  setMuted(muted: boolean) {
    if (muted === this.snapshot.muted) return
    this.persist(muted)
    this.publish({ muted })
    if (muted) this.stop()
    else void this.reconcile()
  }
  setHidden(hidden: boolean) {
    if (this.hidden === hidden) return
    this.hidden = hidden
    if (hidden) this.stop()
    else void this.reconcile()
  }
  /** All resume/priming calls happen before the first await, inside the gesture. */
  unlock = () => {
    if (this.hidden || this.unlocking || (this.ready && this.snapshot.status !== 'blocked')) return
    this.unlocking = true
    try {
      this.backend ??= this.createBackend()
      const resume = this.backend.resume()
      const prime = this.ready ? Promise.resolve() : this.backend.prime()
      void Promise.all([resume, prime]).then(() => {
        this.ready = true
        this.unlocking = false
        if (this.hidden || this.snapshot.muted) this.stop()
        else void this.reconcile()
      }).catch(() => { this.unlocking = false; this.publish({ status: 'blocked' }) })
    } catch { this.unlocking = false; this.publish({ status: 'blocked' }) }
  }
  private async reconcile() {
    if (!this.ready || !this.backend || this.hidden || this.snapshot.muted) return
    const track = this.snapshot.track
    const token = ++this.generation
    this.cancelFinish?.()
    const voice = this.backend.voices[track]
    this.publish({ status: 'loading' })
    try {
      await this.backend.resume()
      if (token !== this.generation) return
      if (!this.playing.has(track)) {
        let play = this.pending.get(track)
        if (!play) {
          this.fade(track, 0, 0)
          play = voice.play()
          this.pending.set(track, play)
          void play.finally(() => { if (this.pending.get(track) === play) this.pending.delete(track) }).catch(() => {})
        }
        await play
      }
      if (token !== this.generation) {
        if (this.hidden || this.snapshot.muted || (this.snapshot.track !== track && this.level(track) === 0)) voice.pause()
        return
      }
      this.playing.add(track)
      // Retarget every existing ramp from its interpolated current level. Even a
      // third scene during a crossfade remains continuous and below maxVolume.
      const seconds = config.crossfadeMs / 1000
      for (const active of this.playing) this.fade(active, active === track ? config.maxVolume : 0, seconds)
      this.publish({ status: 'playing' })
      this.cancelFinish = this.backend.later(() => {
        if (token !== this.generation) return
        for (const active of [...this.playing]) if (active !== track) {
          this.backend!.voices[active].pause()
          this.playing.delete(active)
        }
      }, config.crossfadeMs)
    } catch {
      if (token === this.generation) this.publish({ status: 'blocked' })
    }
  }
}
