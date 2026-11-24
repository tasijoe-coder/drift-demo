import assert from 'node:assert/strict'
import { BONUS_NOVELS, NOVELS } from '../src/data/lives'
import { advanceNovel, chooseNovel, finishNovel, novelView, previousDecision, restoreNovel, startNovel, type NovelPosition } from '../src/engine/novel'
import { novelKeys, readNovelCompleted } from '../src/hx/novel_save'
import { matineeResources } from '../src/hx/matinee_status'
import { bonusChapterUnlocked } from '../src/hx/reading_timing'

const story = BONUS_NOVELS[1]
assert.equal(story.id, 'matinee-novel')
assert.equal(story.title, '第九世・江宜寧與許懷生')
assert.equal(story.subtitle, '晚場未散')
assert.equal(BONUS_NOVELS[0].id, 'fog-novel', 'Eighth-life save identity must stay unchanged')
const reached = new Set<string>(), shown = new Set<string>(), counts: Record<string, number> = {}, lengths: number[] = []
let checkpoints = 0, goldExhausted = false, jadeExhausted = false
function walk(position: NovelPosition, chars = 0) {
  checkpoints++
  assert.deepEqual(restoreNovel(story, JSON.parse(JSON.stringify(position))), position)
  const view = novelView(story, position), resources = matineeResources(view.flags)
  reached.add(position.node)
  for (const beat of view.beats) { shown.add(position.node + ':' + view.node.beats.indexOf(beat)); assert.ok(beat.text.trim()) }
  const route = view.route.map(part => part.node)
  assert.equal(resources.goldUsed, Number(route.includes('W2M')) + Number(route.some(id => ['A7S','C7S'].includes(id))) + Number(route.includes('F2')))
  assert.equal(resources.jadeUsed, Number(route.includes('W4S')) + Number(route.includes('B7S')) + Number(route.includes('F4')))
  assert.equal(resources.moonMarks, Number(route.includes('W2M')) + Number(route.some(id => ['A9Y','B9Y','C9Y'].includes(id))))
  assert.ok(resources.goldUsed <= 3 && resources.jadeUsed <= 3 && resources.moonMarks <= 2)
  goldExhausted ||= resources.goldUsed === 3
  jadeExhausted ||= resources.jadeUsed === 3
  assert.equal(view.flags.alive, true)
  assert.ok(['theme','daily','tension','sad','ending'].includes(view.node.bgm!))
  chars += view.beats.reduce((sum, beat) => sum + beat.text.length, 0)
  if (position.choices.length) {
    const previous = previousDecision(story, position)
    assert.equal(previous.node, position.choices.at(-1)!.node)
    if (previous.node === 'W5') {
      assert.equal(novelView(story, previous).flags.mMoonAid, false)
      assert.equal(novelView(story, previous).flags.mGoldSecond, false)
    }
  }
  if (view.node.ending) {
    assert.equal(route.length, 12); assert.equal(position.choices.length, 6)
    assert.equal(view.flags.motherFarewell, true)
    assert.ok(chars >= 6500 && chars <= 7100)
    counts[position.node] = (counts[position.node] ?? 0) + 1
    lengths.push(chars)
    assert.deepEqual(restoreNovel(story, finishNovel(story, position)), { ...position, finished: true })
    if (view.node.perfect) assert.ok(view.beats.some(beat => beat.text.includes('白頭')))
  } else if (view.node.choice) {
    assert.equal(view.options.length, position.node === 'W5' ? 3 : 2)
    for (const option of view.options) {
      assert.ok(!/本段|不受懲罰|不再安排|結局/.test(option.detail))
      walk(chooseNovel(story, position, option.id), chars)
    }
  } else walk(advanceNovel(story, position), chars)
}
walk(startNovel(story))
assert.equal(reached.size, 35); assert.equal(lengths.length, 96)
assert.deepEqual(counts, {F1:16,F2:16,F3:16,F4:16,F5:16,F6:16})
assert.equal(shown.size, story.nodes.reduce((sum, node) => sum + node.beats.length, 0))
assert.ok(goldExhausted && jadeExhausted)
const existing = [...NOVELS, BONUS_NOVELS[0]].flatMap(novel => Object.values(novelKeys(novel)))
assert.ok(Object.values(novelKeys(story)).every(key => !existing.includes(key)))
const memory = new Map<string, string>(), storage = {getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,value:string)=>{memory.set(key,value)}}
assert.equal(bonusChapterUnlocked(9, readNovelCompleted(storage, BONUS_NOVELS[0]) ? [8] : []), false)
memory.set(novelKeys(BONUS_NOVELS[0]).completed, 'true')
assert.equal(bonusChapterUnlocked(9, readNovelCompleted(storage, BONUS_NOVELS[0]) ? [8] : []), true)
assert.equal(bonusChapterUnlocked(10, []), false)
for (const invalid of [null, {}, {node:'F1',choices:[]}, {node:'W0',choices:[],finished:true}]) assert.deepEqual(restoreNovel(story, invalid), startNovel(story))
console.log(`PASS: 35 scenes, 96 routes, six endings, ${checkpoints} restore checkpoints; 12 scenes / six choices; ${Math.min(...lengths)}–${Math.max(...lengths)} visible characters.`)
console.log('PASS: all conditional prose, limited divine powers, irreversible maternal farewell, branch rewind, isolated saves and eighth-life completion gate.')
