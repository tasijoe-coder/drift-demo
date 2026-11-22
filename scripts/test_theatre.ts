import assert from 'node:assert/strict'
import { advanceStory, chooseStory, opening, restoreStory, startStory, storyMemories, storyNode, storyTranscript, type StoryPosition } from '../src/hx/theatre_story'
import { performance, samplePerformance, solveArm, armPose } from '../src/hx/celestial_rig'

const ids = new Set(opening.nodes.map((node) => node.id))
assert.equal(ids.size, opening.nodes.length, 'Scene IDs must be unique')
for (const node of opening.nodes) {
  assert.ok(node.beats.length, `${node.id}: empty scene`)
  assert.ok(!(node.next && node.choice), `${node.id}: ambiguous scene transition`)
  if (node.next) assert.ok(ids.has(node.next), `${node.id}: dangling next scene`)
  if (node.choice) {
    assert.ok(node.choice.options.length >= 2, `${node.id}: missing alternatives`)
    assert.equal(new Set(node.choice.options.map((item) => item.id)).size, node.choice.options.length)
    for (const option of node.choice.options) assert.ok(ids.has(option.next), `${node.id}: dangling choice`)
  }
}

let routes = 0, checkpoints = 0
const scenes = new Set<string>()
const summaries = new Set<string>()
function walk(initial: StoryPosition, visited = new Set<string>()) {
  let position = initial
  for (let guard = 0; guard < 150; guard++) {
    const node = storyNode(opening, position.node)
    scenes.add(node.id)
    assert.deepEqual(restoreStory(opening, JSON.parse(JSON.stringify(position))), position, 'Save/resume must preserve reading and choice positions')
    const transcript = storyTranscript(opening, position)
    assert.equal(transcript.at(-1)?.text, node.beats[Math.min(position.beat, node.beats.length - 1)].text)
    assert.equal(new Set(transcript.map((line) => line.key)).size, transcript.length)
    checkpoints++
    if (position.beat === node.beats.length) {
      if (!node.choice) {
        assert.equal(node.id, 'interval')
        assert.equal(position.choices.length, 3)
        assert.equal(storyMemories(opening, position).length, 3)
        summaries.add(storyMemories(opening, position).join('|'))
        routes++
        return
      }
      assert.deepEqual(advanceStory(opening, position), position, 'Auto-play must stop at a choice')
      assert.deepEqual(chooseStory(opening, position, 'invalid'), position)
      assert.ok(!visited.has(node.id), 'Story graph must not loop')
      for (const option of node.choice.options) walk(chooseStory(opening, position, option.id), new Set([...visited, node.id]))
      return
    }
    if (node.choice) assert.equal(chooseStory(opening, position, node.choice.options[0].id), position, 'A choice cannot be made before the performance finishes')
    position = advanceStory(opening, position)
  }
  assert.fail('Story did not terminate')
}
walk(startStory(opening))
assert.equal(routes, 8)
assert.equal(summaries.size, 8)
assert.equal(scenes.size, opening.nodes.length)
// The celestial origin is a performance, never a hidden decision or an automatic choice.
let prologue = startStory(opening)
let prologueLines = 0
while (storyNode(opening, prologue.node).era) {
  const node = storyNode(opening, prologue.node)
  assert.equal(node.choice, undefined, 'Lifetime zero must not ask for choices')
  assert.deepEqual(prologue.choices, [])
  prologue = advanceStory(opening, prologue)
  prologueLines++
  assert.ok(prologueLines < 80)
}
assert.equal(prologue.node, 'arrival')
assert.equal(prologueLines, 23)
const existingSave = { node: 'proposal', beat: 0, choices: [{ node: 'arrival', option: 'shelter' }, { node: 'lodging', option: 'lamp' }] }
assert.deepEqual(restoreStory(opening, existingSave), existingSave, 'Existing first-lifetime saves must survive the added prologue')
for (const corrupt of [null, {}, { node: 'truth', beat: 0, choices: [] }, { node: 'arrival', beat: 999, choices: [] }, { node: 'arrival', beat: -1, choices: [] }, { node: 'interval', beat: 0, choices: [{ node: 'arrival', option: 'invented' }] }]) {
  assert.deepEqual(restoreStory(opening, corrupt), startStory(opening))
}
console.log(`PASS: ${routes} complete routes, ${scenes.size} scenes, ${checkpoints} save/resume checkpoints; all 3 decisions gated, 8 distinct recaps, invalid saves rejected.`)
console.log(`PASS: ${prologueLines} celestial prologue beats without choices; existing mortal progress retained.`)
// The first scene must perform real joint/prop motion and preserve the accident.
for (let beat = 0; beat < 8; beat++) {
  const p = performance('heaven-banquet', beat, 'toast')
  assert.ok(p.duration > 0)
  assert.equal(p.keys[0].at, 0)
  assert.equal(p.keys.at(-1)!.at, 1)
  for (let i = 1; i < p.keys.length; i++) assert.ok(p.keys[i].at > p.keys[i - 1].at)
  for (let i = 0; i <= 20; i++) for (const v of Object.values(samplePerformance(p, i / 20))) assert.ok(Number.isFinite(v))
}
assert.equal(samplePerformance(performance('heaven-banquet', 4, 'cup-fall'), 1).drop, 1)
assert.equal(samplePerformance(performance('heaven-banquet', 6, 'offer'), 1).blood, 1)
for (const flip of [-1, 1]) {
  const angles = solveArm([190 + flip * 136, 213], [190, 110], flip, 0)
  const a = angles.upper * Math.PI / 180, b = (angles.upper + angles.lower) * Math.PI / 180
  assert.ok(Math.abs(52 * Math.cos(a) + 50 * Math.cos(b) - 70) < .001)
  assert.ok(Math.abs(52 * Math.sin(a) + 50 * Math.sin(b) - 15) < .001)
}
console.log('PASS: 8 animated cues, finite joint poses, cup release and injury continuity, mirrored arm reach.')
// Palm direction must remain independent of elbow and torso rotation.
for (const flip of [-1,1]) for (const lean of [-15,0,15]) for (const hand of [-22,0,24]) {
  const root:[number,number]=[190,110],target:[number,number]=[190+flip*130,230]
  const p=armPose(target,root,flip,lean,hand)
  assert.ok(Math.abs(p.upper+p.lower+p.wrist+lean-hand)<1e-8)
  assert.ok(Math.hypot(p.grip[0]-target[0],p.grip[1]-target[1])<.001,'Reachable grip must meet prop/rod attachment')
  assert.ok(p.lower<=0,'Elbow should bend below the reaching hand')
}
const distant=armPose([1000,1000],[190,110],1,0)
assert.ok(Math.hypot(distant.grip[0]-256-15,distant.grip[1]-198)<=102.001,'Unreachable targets must not stretch the arm')
console.log('PASS: independent wrist direction, mirrored grip attachment, natural elbow bend and bounded reach.')
