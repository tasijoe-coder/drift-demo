import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import config from '../src/data/bgm.json'
import { BgmEngine, type BgmBackend, type BgmTrack, type BgmVoice } from '../src/hx/bgm_engine'
import { NOVELS, BONUS_NOVELS } from '../src/data/lives'
import { zeroStory } from '../src/hx/zero_story'
import { afterwordStory, type AfterwordOrigin } from '../src/hx/afterword_story'
import { opening } from '../src/hx/theatre_story'

const tracks = Object.keys(config.tracks) as BgmTrack[]
const settle = async () => { for (let i = 0; i < 16; i++) await Promise.resolve() }
class Voice implements BgmVoice {
  plays = 0; running = false; stored = 0; since = 0
  from = 0; to = 0; at = 0; seconds = 0
  delay?: Promise<void>
  fail = false
  clock: () => number
  constructor(clock: () => number) { this.clock = clock }
  get position() { return this.stored + (this.running ? this.clock() - this.since : 0) }
  get level() { return this.from + (this.to - this.from) * (this.seconds ? Math.min(1, (this.clock() - this.at) / this.seconds) : 1) }
  async play() {
    this.plays++
    if (this.fail) throw new Error('Blocked or unavailable')
    if (this.delay) await this.delay
    if (!this.running) { this.running = true; this.since = this.clock() }
  }
  pause() { this.stored = this.position; this.running = false }
  isPlaying() { return this.running }
  ramp(from: number, to: number, seconds: number) { this.from = from; this.to = to; this.seconds = seconds; this.at = this.clock() }
}
function setup(muted = false) {
  let now = 0; let created = 0
  const timers = new Set<{ due: number; callback: () => void }>()
  const voices = Object.fromEntries(tracks.map(track => [track, new Voice(() => now)])) as Record<BgmTrack, Voice>
  const saved: boolean[] = []
  const backend: BgmBackend = { voices, resume: async () => {}, now: () => now,
    later: (callback, ms) => { const timer = { due: now + ms / 1000, callback }; timers.add(timer); return () => { timers.delete(timer) } },
  }
  const engine = new BgmEngine(() => { created++; return backend }, muted, value => saved.push(value))
  return { engine, voices, saved, get created() { return created },
    tick: (seconds: number) => { now += seconds; for (const timer of [...timers]) if (timer.due <= now) { timers.delete(timer); timer.callback() } },
  }
}
const gesture = setup()
gesture.engine.unlock()
assert.equal(gesture.voices.theme.plays, 1, 'Start the real track synchronously inside the gesture, before awaiting resume or other media')
await settle()

const hung = setup()
hung.voices.theme.delay = new Promise<void>(() => {})
hung.engine.unlock()
hung.tick(10)
assert.equal(hung.engine.getSnapshot().status, 'blocked', 'A stalled start must expose retry instead of staying loading forever')
hung.voices.theme.delay = undefined
hung.engine.unlock(); await settle()
assert.equal(hung.engine.getSnapshot().status, 'playing', 'A subsequent gesture can recover a stalled start')

const interrupted = setup()
interrupted.engine.unlock(); await settle(); interrupted.tick(2)
interrupted.voices.theme.pause()
const interruptedAt = interrupted.voices.theme.position
interrupted.engine.unlock()
assert.equal(interrupted.voices.theme.plays, 2, 'Retry a media element paused by the operating system, even if the mixer previously reported playing')
await settle()
assert.equal(interrupted.voices.theme.position, interruptedAt, 'Recovery must keep the playback position')

const a = setup()
assert.equal(a.created, 0, 'Do not construct audio or autoplay before interaction')
a.engine.setTrack('daily')
assert.equal(a.voices.daily.plays, 0)
a.engine.unlock(); await settle()
assert.equal(a.created, 1)
assert.equal(a.voices.daily.seconds, 2)
a.tick(2)
assert.equal(a.voices.daily.level, .45)
a.tick(9)
const position = a.voices.daily.position
for (let i = 0; i < 20; i++) { a.engine.setTrack('daily'); a.engine.unlock() }
await settle()
assert.equal(a.voices.daily.plays, 1, 'Same cue must not restart or replay')
assert.equal(a.voices.daily.position, position)
a.engine.setTrack('tension'); await settle()
assert.equal(a.voices.daily.running, true)
assert.equal(a.voices.tension.from, 0)
a.tick(1)
assert.equal(a.voices.daily.level, .225)
assert.equal(a.voices.tension.level, .225)
a.engine.setTrack('sad'); await settle()
assert.equal(a.voices.daily.from, .225, 'Retarget a running crossfade continuously')
a.tick(1)
assert.ok(Math.abs(tracks.reduce((sum, track) => sum + a.voices[track].level, 0) - .45) < 1e-9)
a.tick(1)
assert.equal(a.voices.daily.running, false)
assert.equal(a.voices.tension.running, false)
assert.equal(a.voices.sad.level, .45)
const beforeHide = a.voices.sad.position
a.engine.setHidden(true)
assert.equal(a.voices.sad.running, false)
a.tick(30)
assert.equal(a.voices.sad.position, beforeHide)
a.engine.setHidden(false); await settle()
assert.equal(a.voices.sad.position, beforeHide)
assert.equal(a.voices.sad.from, 0)
a.tick(2); assert.equal(a.voices.sad.level, .45)
a.engine.setMuted(true)
assert.ok(tracks.every(track => !a.voices[track].running && a.voices[track].level === 0))
a.engine.setHidden(true); a.engine.setHidden(false); await settle()
assert.equal(a.voices.sad.running, false, 'Foreground must not override mute')
a.engine.setTrack('ending'); a.engine.setMuted(false); await settle()
assert.equal(a.voices.ending.running, true)
assert.deepEqual(a.saved, [true, false])

const b = setup(true)
b.engine.unlock(); await settle()
assert.ok(tracks.every(track => b.voices[track].plays === 0), 'Restored mute suppresses music')
b.engine.setMuted(false); b.engine.unlock(); await settle(); b.tick(2)
let resolve!: () => void
b.voices.daily.delay = new Promise<void>(yes => { resolve = yes })
b.engine.setTrack('daily'); await settle()
b.engine.setTrack('tension'); await settle(); b.tick(2)
resolve(); await settle()
assert.equal(b.voices.daily.running, false, 'Late play promises cannot revive a stale cue')
assert.equal(b.voices.tension.running, true)
b.voices.sad.fail = true
b.engine.setTrack('sad'); await settle()
assert.equal(b.engine.getSnapshot().status, 'blocked')
assert.equal(b.voices.tension.running, true, 'Keep the old music if the new MP3 is unavailable')
b.voices.sad.fail = false
b.engine.unlock(); await settle(); b.tick(2)
assert.equal(b.voices.sad.running, true)
assert.equal(b.voices.tension.running, false)

const c = setup()
c.engine.unlock(); await settle(); c.tick(2)
let finish!: () => void
c.voices.daily.delay = new Promise<void>(yes => { finish = yes })
c.engine.setTrack('daily'); await settle()
c.engine.setHidden(true); finish(); await settle()
assert.equal(c.voices.daily.running, false, 'A late audio load cannot play behind a locked screen')
c.engine.setHidden(false); await settle()
assert.equal(c.voices.daily.running, true)

let nodes = 0
for (const story of [...NOVELS, ...BONUS_NOVELS, zeroStory, opening, ...(['E1','E2','E3','E4','E5','E6'] as AfterwordOrigin[]).map(afterwordStory)]) for (const node of story.nodes) {
  assert.ok(node.bgm && tracks.includes(node.bgm), `${story.id}/${node.id}: missing BGM cue`)
  nodes++
}
for (const [track, url] of Object.entries(config.tracks)) {
  const file = new URL('../public' + url, import.meta.url)
  assert.ok(existsSync(file), track)
  const data = readFileSync(file)
  assert.ok(data.length > 100_000)
  assert.ok(data.subarray(0,3).toString() === 'ID3' || data[0] === 0xff, `${track}: invalid MP3 header`)
}
assert.equal(NOVELS[0].nodes.find(node => node.id === 'EC1')?.bgm, 'sad')
assert.equal(NOVELS[0].nodes.find(node => node.id === 'EA1')?.bgm, 'ending')
console.log(`PASS: lazy gesture unlock, same-cue continuity, 2000ms crossfade, .45 mix ceiling, rapid changes, visibility resume, persistent mute, late loads, playback retry; ${nodes} node/intro cues and five MP3 assets.`)
