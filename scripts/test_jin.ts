import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { NOVELS } from '../src/data/lives'
import { advanceNovel, chooseNovel, finishNovel, novelNode, novelView, previousDecision, previousNovel, restoreNovel, startNovel, type NovelPosition } from '../src/engine/novel'
import { novelKeys, QIN_SAVE_KEY, QIN_ENDINGS_KEY, QIN_BOOKMARK_KEY, QIN_COMPLETED_KEY, readNovel, readEndings, readNovelCompleted } from '../src/hx/novel_save'

const [qin, story] = NOVELS
assert.equal(NOVELS.length, 2, 'Only the first two mortal lifetimes are exposed')
assert.equal(story.id, 'jin-novel')
assert.equal(story.nodes.length, 49)
assert.equal(new Set(story.nodes.map(n => n.id)).size, 49)
const start = startNovel(story)
const reached = new Set<string>()
const counts: Record<string, number> = {}
const lengths: number[] = []
const e2Routes = new Set<string>()
let checkpoints = 0
function walk(position: NovelPosition, chars = 0) {
  checkpoints++
  assert.deepEqual(restoreNovel(story, JSON.parse(JSON.stringify(position))), position)
  const view = novelView(story, position)
  const { node, flags, route, options } = view
  reached.add(node.id)
  assert.deepEqual(flags, Object.assign({}, ...route.map(entry => novelNode(story, entry.node).set)))
  assert.ok(view.beats.length)
  assert.ok(view.beats.every(beat => beat.text.trim() && !/^\[/.test(beat.text)))
  if (route.length > 1) {
    const previous = previousNovel(story, position)
    const prev = novelView(story, previous)
    const forward = prev.node.next ? advanceNovel(story, previous) : chooseNovel(story, previous, position.choices.at(-1)!.option)
    assert.deepEqual(forward, { ...position, finished: false })
  }
  const last = position.choices.at(-1)
  if (last) {
    const back = previousDecision(story, position)
    assert.equal(back.node, last.node)
    assert.equal(back.choices.length, position.choices.length - 1)
  }
  if (node.id === 'S4') {
    const text = view.beats.map(beat => beat.text).join('\n')
    assert.equal(text.includes('師母依約將信交到他手裡'), flags.disclosure === 'mediated', 'The revealed route cannot pretend Liang is still unaware')
    assert.equal(text.includes('就說家裡的事'), flags.disclosure === 'direct')
  }
  if (node.id === 'E2') e2Routes.add(String(flags.route))
  if (flags.deathConfirmed) assert.ok(['C1A','C2D','C3C','C3F','C4D','C5V','C5M','E5'].includes(node.id))
  chars += view.beats.reduce((sum, beat) => sum + beat.text.length, 0)
  if (node.ending) {
    assert.equal(position.choices.length, 6)
    assert.equal(route.length, 16)
    assert.ok(chars >= 12500 && chars <= 14500, `${node.id} actual visible text: ${chars}`)
    assert.equal(options.length, 0)
    assert.deepEqual(advanceNovel(story, position), position)
    assert.deepEqual(restoreNovel(story, finishNovel(story, position)), { ...position, finished: true })
    assert.equal(flags.marriageClosed, true, 'Every ending settles the old engagement')
    if (node.id === 'E1') {
      assert.equal(node.perfect, true)
      assert.equal(flags.ownName, true)
      assert.equal(flags.alive, true)
      assert.equal(flags.together, true)
      assert.ok(view.beats.some(b => b.text.includes('白髮')))
    }
    if (node.id === 'E5') {
      assert.equal(flags.deathConfirmed, true)
      assert.equal(flags.alive, false)
      assert.equal(flags.yingtaiAlive, true)
    }
    if (node.id === 'E4') assert.equal(flags.together, false)
    counts[node.id] = (counts[node.id] ?? 0) + 1
    lengths.push(chars)
    return
  }
  assert.deepEqual(finishNovel(story, position), position)
  assert.deepEqual(chooseNovel(story, position, 'invalid'), position)
  if (node.choice) {
    assert.equal(options.length, node.id === 'S6' ? 3 : 2)
    assert.ok(node.choice.prompt)
    assert.deepEqual(advanceNovel(story, position), position)
    for (const option of options) {
      assert.ok(option.label && option.detail && novelNode(story, option.next))
      walk(chooseNovel(story, position, option.id), chars)
    }
  } else {
    assert.ok(node.next)
    walk(advanceNovel(story, position), chars)
  }
}
walk(start)
assert.equal(reached.size, 49)
assert.equal(lengths.length, 96)
assert.deepEqual(counts, { E1:16, E2:40, E4:16, E3:8, E5:16 })
assert.deepEqual([...e2Routes].sort(), ['departure','family','waiting'])
for (const raw of [null,{},startNovel(qin),{node:'E1',choices:[]},{node:'S4',choices:[],flags:{disclosure:'direct'}},{node:'S0',choices:[],finished:true}]) assert.deepEqual(restoreNovel(story, raw), start)
assert.deepEqual(restoreNovel(qin, start), startNovel(qin))
assert.deepEqual(novelKeys(qin), { save:QIN_SAVE_KEY,endings:QIN_ENDINGS_KEY,bookmark:QIN_BOOKMARK_KEY,completed:QIN_COMPLETED_KEY })
assert.equal(new Set([...Object.values(novelKeys(qin)), ...Object.values(novelKeys(story))]).size, 8)
const memory = new Map<string,string>()
const storage = {getItem:(key:string)=>memory.get(key) ?? null,setItem:(key:string,value:string)=>{memory.set(key,value)}}
memory.set(QIN_SAVE_KEY, JSON.stringify(startNovel(qin)))
memory.set(QIN_BOOKMARK_KEY, JSON.stringify({node:'G0',top:400}))
memory.set(QIN_ENDINGS_KEY, JSON.stringify(['EA1']))
const before = JSON.stringify([...memory])
assert.equal(readNovelCompleted(storage, qin), true, 'Older collected endings permanently unlock the next lifetime even during replay')
assert.equal(readNovelCompleted(storage, story), false, 'Qin completion cannot be mistaken for Jin completion')
assert.deepEqual(readNovel(storage, story), start)
assert.deepEqual(readEndings(storage, story), [])
assert.equal(JSON.stringify([...memory]), before, 'Reads and migrations leave legacy keys intact')
memory.set(novelKeys(story).endings, JSON.stringify(['E5','EA1','E5','S0']))
assert.deepEqual(readEndings(storage, story), ['E5'])
memory.set(novelKeys(story).completed, 'true')
memory.set(novelKeys(story).save, '{damaged replay')
memory.set(novelKeys(story).endings, '[]')
assert.equal(readNovelCompleted(storage, story), true, 'A replay cannot relock a completed lifetime')
memory.clear()
let first = startNovel(qin)
while (!novelView(qin, first).node.ending) {
  const v = novelView(qin, first)
  first = v.options.length ? chooseNovel(qin, first, v.options[0].id) : advanceNovel(qin, first)
}
memory.set(QIN_SAVE_KEY, JSON.stringify(first))
assert.equal(readNovelCompleted(storage, qin), false, 'Entering an ending is not finishing it')
memory.set(QIN_SAVE_KEY, JSON.stringify(finishNovel(qin, first)))
assert.equal(readNovelCompleted(storage, qin), true)
const app = readFileSync(new URL('../src/hx/PrologueApp.tsx',import.meta.url),'utf8')
assert.ok(app.includes("reading === 'jin' && jinUnlocked"))
assert.ok(app.includes('qinUnlocked && qinProgress.completed'))
assert.ok(app.indexOf('story={qin} position=') < app.indexOf('story={jin} position='))
console.log(`PASS: 49 scenes, 96 routes, 5 endings, ${checkpoints} restore checkpoints; 16 scenes / 6 choices per route.`)
console.log(`PASS: actual visible text ${Math.min(...lengths)}–${Math.max(...lengths)} characters; distinct disclosure scenes, all E2 origins retained, no resurrection.`)
console.log('PASS: sequential unlock, legacy completion migration, finish-only completion, independent saves/bookmarks/collections, replay keeps unlocks.')
