import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { NOVELS } from '../src/data/lives'
import { advanceNovel, chooseNovel, finishNovel, novelNode, novelView, previousDecision, previousNovel, restoreNovel, startNovel, type NovelPosition } from '../src/engine/novel'
import { QIN_ENDINGS_KEY, QIN_SAVE_KEY, readEndings, readNovel, readZeroUnlock, unlockedZero, ZERO_COMPLETED_KEY } from '../src/hx/novel_save'
import { nextZero, startZero, ZERO_SAVE_KEY, zeroFinished } from '../src/hx/zero_story'

const story = NOVELS[0]
assert.equal(story.nodes.length, 45)
assert.equal(new Set(story.nodes.map(n => n.id)).size, 45)
const start = startNovel(story)
const reached = new Set<string>()
const endingCounts: Record<string, number> = {}
const lengths: number[] = []
let checkpoints = 0
let backChecks = 0
function walk(position: NovelPosition, chars = 0, deathConfirmed = false) {
  assert.deepEqual(restoreNovel(story, JSON.parse(JSON.stringify(position))), position)
  const view = novelView(story, position)
  const { node, flags, route, options } = view
  assert.deepEqual(flags, Object.assign({}, ...route.map(entry => novelNode(story, entry.node).set)), 'Only the current path may contribute flags')
  reached.add(node.id)
  checkpoints++
  assert.ok(view.beats.length)
  assert.ok(view.beats.every(beat => beat.text.trim() && !/\[(旁白|孟姜女|范喜良)\]/.test(beat.text)))
  if (deathConfirmed) assert.equal(flags.deathConfirmed, true)
  if (route.length > 1) {
    const previous = previousNovel(story, position)
    assert.equal(previous.node, route.at(-2)!.node)
    const predecessor = novelView(story, previous)
    assert.deepEqual(predecessor.route.map(r => r.node), route.slice(0, -1).map(r => r.node))
    const forward = predecessor.node.next ? advanceNovel(story, previous) : chooseNovel(story, previous, position.choices.at(-1)!.option)
    assert.deepEqual(forward, { ...position, finished: false }, 'Backtracking then advancing reconstructs the route without future flags')
    backChecks++
  }
  const lastChoice = position.choices.at(-1)
  const back = previousDecision(story, position)
  if (lastChoice) {
    assert.equal(back.node, lastChoice.node)
    assert.equal(back.choices.length, position.choices.length - 1)
    assert.ok(!back.finished)
  } else assert.deepEqual(back, position)
  assert.deepEqual(chooseNovel(story, position, 'invalid'), position)
  chars += view.beats.reduce((n, beat) => n + beat.text.length, 0)
  if (node.ending) {
    assert.equal(position.choices.length, 6)
    assert.equal(route.length, 16)
    assert.equal(options.length, 0)
    assert.deepEqual(advanceNovel(story, position), position)
    const finished = finishNovel(story, position)
    assert.equal(finished.finished, true)
    assert.deepEqual(restoreNovel(story, finished), finished)
    assert.ok(chars >= 12500 && chars <= 15000, `${node.id}: actual per-route content length is ${chars}`)
    if (deathConfirmed || flags.deathConfirmed) assert.ok(node.id === 'EC1' || node.id === 'EC2', 'Confirmed death cannot lead to a living ending')
    if (node.id === 'EA1') {
      assert.equal(flags.substitute, false)
      assert.equal(flags.released, true)
      assert.equal(node.perfect, true)
      assert.ok(view.beats.some(b => b.text.includes('白髮')))
    }
    endingCounts[node.id] = (endingCounts[node.id] ?? 0) + 1
    lengths.push(chars)
    return
  }
  assert.deepEqual(finishNovel(story, position), position, 'Only an ending can be marked finished')
  if (node.choice) {
    assert.equal(options.length, node.id === 'G6' ? 3 : 2, `${node.id} must expose the planned choices`)
    assert.equal(new Set(options.map(o => o.id)).size, options.length)
    assert.deepEqual(advanceNovel(story, position), position, 'A decision requires a deliberate choice')
    assert.ok(node.choice.prompt)
    for (const option of options) {
      assert.ok(option.label && option.detail && novelNode(story, option.next))
      walk(chooseNovel(story, position, option.id), chars, deathConfirmed || flags.deathConfirmed === true)
    }
    if (node.id === 'C4') {
      assert.equal(options.some(o => o.id === 'petition-escorted'), flags.escort === true)
      assert.equal(options.some(o => o.id === 'petition-alone'), flags.escort === false)
      const blocked = flags.escort ? 'petition-alone' : 'petition-escorted'
      assert.deepEqual(chooseNovel(story, position, blocked), position)
    }
  } else {
    assert.ok(node.next)
    walk(advanceNovel(story, position), chars, deathConfirmed || flags.deathConfirmed === true)
  }
}
walk(start)
assert.equal(reached.size, 45)
assert.equal(lengths.length, 96)
assert.deepEqual(endingCounts, { EA1:16, EA2:16, EB1:24, EB2:24, EC2:12, EC1:4 })
for (const bad of [null, {}, { node:'EA1',choices:[] }, {node:'G1',choices:[],finished:true}, {node:'B2',choices:[{node:'G1',option:'hide'}]}, {node:'G0',choices:[null]}, {node:'G0',choices:Array(100).fill({node:'G1',option:'hide'})}]) assert.deepEqual(restoreNovel(story, bad), start)
assert.deepEqual(restoreNovel(story, {...start, flags:{escort:true,deathConfirmed:false}}), start, 'Saved flags cannot unlock a different branch')
const memory = new Map<string,string>()
const storage = { getItem: (key:string) => memory.get(key) ?? null, setItem: (key:string,value:string) => {memory.set(key,value)} }
memory.set('hx.save.v1', 'legacy')
memory.set(QIN_SAVE_KEY, '{bad json')
assert.deepEqual(readNovel(storage, story), start)
assert.equal(memory.get('hx.save.v1'), 'legacy')
memory.set(QIN_ENDINGS_KEY, JSON.stringify(['EA1','EA1','G1','forged',null,'EC2']))
assert.deepEqual(readEndings(storage, story), ['EA1','EC2'])
assert.notEqual(QIN_SAVE_KEY, ZERO_SAVE_KEY)
assert.notEqual(QIN_SAVE_KEY, 'hx.save.v1')
assert.notEqual(ZERO_COMPLETED_KEY, ZERO_SAVE_KEY)
assert.equal(unlockedZero(null, startZero()), false)
let zero = startZero()
while (!zeroFinished(zero)) zero = nextZero(zero)
assert.equal(unlockedZero(null, zero), true, 'Existing completed prologue saves migrate to unlock')
assert.equal(unlockedZero('true', startZero()), true, 'Replaying the prologue must never relock lifetime one')
assert.equal(unlockedZero(null, {node:zero.node,beat:9999,choices:[]}), false)
memory.set(ZERO_COMPLETED_KEY, 'true')
memory.set(ZERO_SAVE_KEY, '{damaged replay')
assert.equal(readZeroUnlock(storage), true, 'A damaged replay cannot erase permanent completion')
const app = readFileSync(new URL('../src/hx/PrologueApp.tsx', import.meta.url),'utf8')
assert.ok(app.includes("reading === 'qin' && qinUnlocked"), 'Route itself is guarded')
const reader = readFileSync(new URL('../src/hx/NovelReader.tsx', import.meta.url),'utf8')
assert.equal((reader.match(/<img /g) ?? []).length, 1)
assert.ok(reader.includes('src="/art/zero/ledger.webp"'), 'Every first-lifetime scene uses one fixed placeholder')
assert.ok(!reader.includes('setTimeout'), 'Reading and choices are not timed')
console.log(`PASS: 45 nodes, 96 complete routes, 6 reachable endings, ${checkpoints} save checkpoints, ${backChecks} back/forward checks.`)
console.log(`PASS: 16 scenes and 6 decisions per run; actual visible text ${Math.min(...lengths)}–${Math.max(...lengths)} characters; no future-flag leaks or resurrection.`)
console.log('PASS: invalid saves, route guard, monotonic prologue unlock, separate legacy saves, conditional choices, ending collection, fixed image.')
