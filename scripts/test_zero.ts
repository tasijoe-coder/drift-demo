import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { chooseStory, storyNode, storyTranscript } from '../src/hx/theatre_story'
import { nextZero, previousZero, restoreZero, startZero, ZERO_SAVE_KEY, zeroDelay, zeroFinished, zeroReadCount, zeroStills, zeroStory, zeroTotal } from '../src/hx/zero_story'

assert.equal(zeroStory.nodes.length, 3)
assert.notEqual(ZERO_SAVE_KEY, 'hx.theatre.qin-opening.v1', 'Revised sentence positions must not overwrite the older theatre save')
assert.notEqual(ZERO_SAVE_KEY, 'hx.save.v1', 'The card save must remain separate')
assert.equal(new Set(zeroStory.nodes.map(node => node.id)).size, zeroStory.nodes.length)
for (const node of zeroStory.nodes) {
  assert.equal(node.choice, undefined, 'Lifetime zero must never expose a story decision')
  if (node.next) assert.ok(zeroStory.nodes.some(next => next.id === node.next), 'No exit to a hidden mortal lifetime')
  assert.ok(node.beats.length)
  for (const beat of node.beats) {
    assert.ok(beat.text.trim())
    assert.ok(beat.still && zeroStills[beat.still], 'Every displayed sentence must resolve to a static frame')
    assert.equal(zeroDelay(beat.text), 1200 + [...beat.text].length * 120)
  }
}
let position = startZero()
const frames: string[] = []
const positions = [position]
const speakers = new Set<string>()
let count = 0
while (!zeroFinished(position)) {
  const node = storyNode(zeroStory, position.node)
  const beat = node.beats[position.beat]
  assert.deepEqual(restoreZero(JSON.parse(JSON.stringify(position))), position)
  assert.deepEqual(position.choices, [])
  assert.deepEqual(chooseStory(zeroStory, position, 'anything'), position)
  const lines = storyTranscript(zeroStory, position)
  assert.equal(lines.length, ++count, 'Each advance must reveal exactly one new sentence')
  assert.equal(lines.at(-1)!.text, beat.text)
  assert.equal(zeroReadCount(position), count)
  assert.equal(new Set(lines.map(line => line.key)).size, count)
  if (frames.at(-1) !== beat.still) frames.push(beat.still!)
  speakers.add(beat.speaker)
  const next = nextZero(position)
  if (!zeroFinished(next)) assert.deepEqual(previousZero(next), position, 'Previous must cross chapter boundaries without skipping or duplicating text')
  position = next
  positions.push(position)
  assert.ok(count < 200)
}
assert.equal(count, zeroTotal)
assert.equal(zeroTotal, 117)
assert.deepEqual(frames, ['banquet', 'wound', 'court', 'bridge', 'ledger'])
for (const speaker of ['金童','玉女','玉帝','月老・你']) assert.ok(speakers.has(speaker))
assert.equal(storyTranscript(zeroStory, position).length, zeroTotal)
assert.equal(zeroReadCount(position), zeroTotal)
assert.deepEqual(nextZero(position), position, 'Repeated advance must stay at the prologue ending')
assert.deepEqual(restoreZero(position), position, 'A completed prologue must remain complete on reload')
assert.deepEqual(nextZero(previousZero(position)), position, 'The last sentence and ending can be revisited')
assert.deepEqual(previousZero(startZero()), startZero())
for (const saved of positions) assert.deepEqual(restoreZero(saved), saved)
for (const corrupt of [null, {}, {node:'arrival',beat:0,choices:[]}, {node:'zero-court',beat:999,choices:[]}, {node:'zero-bridge',beat:-1,choices:[]}, {node:'zero-court',beat:0,choices:[{node:'arrival',option:'shelter'}]}]) assert.deepEqual(restoreZero(corrupt), startZero())
for (const [id, still] of Object.entries(zeroStills)) {
  const file = new URL(`../public${still.src}`, import.meta.url)
  const bytes = readFileSync(file)
  assert.equal(bytes.toString('ascii',0,4), 'RIFF')
  assert.equal(bytes.toString('ascii',8,12), 'WEBP')
  assert.ok(statSync(file).size < 300_000, `${id}: mobile still should stay under 300 KB`)
  assert.ok(still.alt)
}
console.log(`PASS: ${zeroTotal} sentence advances, ${positions.length} restore checkpoints, 3 chapters, no choices or exits to hidden lifetimes.`)
console.log('PASS: 5 ordered image cues, every sentence mapped, previous/next across all chapter boundaries, replay and ending restore, invalid/older saves rejected without touching older keys.')
console.log('PASS: all 5 WebP assets present, accessible descriptions, each under 300 KB.')
