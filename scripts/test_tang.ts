import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { NOVELS } from '../src/data/lives'
import { advanceNovel, chooseNovel, finishNovel, novelNode, novelView, previousNovel, previousDecision, restoreNovel, startNovel, type NovelPosition } from '../src/engine/novel'
import { novelKeys, readNovel, readEndings, readNovelCompleted } from '../src/hx/novel_save'

const [qin,jin,story] = NOVELS
assert.deepEqual(NOVELS.slice(0,3).map(s=>s.id), ['qin-novel','jin-novel','tang-novel'])
assert.equal(story.nodes.length,41)
assert.equal(new Set(story.nodes.map(n=>n.id)).size,41)
const reached=new Set<string>(), sharedE4=new Set<string>(), repairE5=new Set<string>()
const endings:Record<string,number>={}, lengths:number[]=[]
let checkpoints=0
function walk(position:NovelPosition, chars=0){
  checkpoints++
  assert.deepEqual(restoreNovel(story, JSON.parse(JSON.stringify(position))),position)
  const {node,flags,route,beats,options}=novelView(story,position)
  reached.add(node.id)
  assert.deepEqual(flags,Object.assign({},...route.map(r=>novelNode(story,r.node).set)))
  assert.ok(beats.length&&beats.every(b=>b.text.trim()&&!/^\[/.test(b.text)))
  assert.equal(flags.alive,true,'The mortal pair remain alive in every playable route')
  assert.notEqual(flags.deathConfirmed,true,'The folklore death/revival is not introduced into the playable rewrite')
  if(route.length>1){
    const previous=previousNovel(story,position),view=novelView(story,previous)
    const next=view.options.length?chooseNovel(story,previous,position.choices.at(-1)!.option):advanceNovel(story,previous)
    assert.deepEqual(next,{...position,finished:false})
  }
  if(position.choices.length){
    const back=previousDecision(story,position)
    assert.equal(back.node,position.choices.at(-1)!.node)
    assert.equal(back.choices.length,position.choices.length-1)
  }
  if(node.id.startsWith('A'))assert.equal(flags.missed,false)
  if(node.id.startsWith('B'))assert.equal(flags.missed,true)
  if(node.id==='E4')sharedE4.add(String(flags.route))
  if(node.id==='E5')repairE5.add(String(flags.repairBoundary))
  chars+=beats.reduce((n,b)=>n+b.text.length,0)
  if(node.ending){
    assert.equal(route.length,16);assert.equal(position.choices.length,6)
    // The editorial trial trims repeated daily scenes while retaining all 16 scenes.
    assert.ok(chars>=11500&&chars<=14000,`${node.id}: actual visible length ${chars}`)
    assert.deepEqual(advanceNovel(story,position),position)
    assert.deepEqual(restoreNovel(story,finishNovel(story,position)),{...position,finished:true})
    if(node.id==='E1'){assert.equal(node.perfect,true);assert.ok(beats.some(b=>b.text.includes('白首')))}
    if(['E1','E2','E5'].includes(node.id))assert.equal(flags.together,true)
    if(['E3','E4','E6'].includes(node.id))assert.equal(flags.together,false)
    if(node.id==='E6'){assert.equal(flags.relationship,'declined');assert.equal(flags.repairBoundary,'mother')}
    endings[node.id]=(endings[node.id]??0)+1;lengths.push(chars);return
  }
  assert.deepEqual(finishNovel(story,position),position)
  assert.deepEqual(chooseNovel(story,position,'invalid'),position)
  if(node.choice){
    assert.equal(options.length,2)
    assert.ok(node.choice.prompt)
    assert.deepEqual(advanceNovel(story,position),position)
    for(const option of options){assert.ok(option.label&&option.detail&&novelNode(story,option.next));walk(chooseNovel(story,position,option.id),chars)}
  }else{assert.ok(node.next);walk(advanceNovel(story,position),chars)}
}
walk(startNovel(story))
assert.equal(reached.size,41)
assert.equal(lengths.length,64)
assert.deepEqual(endings,{E1:8,E2:8,E3:8,E4:16,E5:16,E6:8})
assert.deepEqual([...sharedE4].sort(),['kept','missed'])
assert.deepEqual([...repairE5].sort(),['mother','space'])
assert.equal(new Set(NOVELS.flatMap(s=>Object.values(novelKeys(s)))).size,NOVELS.length*4,'Save, bookmark, collection and completion keys never overlap')
for(const corrupt of [null,{},startNovel(qin),startNovel(jin),{node:'E1',choices:[]},{node:'T0',choices:[],finished:true},{node:'B0',choices:[],flags:{route:'missed'}}]){
 assert.deepEqual(restoreNovel(story,corrupt),startNovel(story))
}
const memory=new Map<string,string>()
const storage={getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v)}}
memory.set(novelKeys(qin).endings,JSON.stringify(['EA1']))
memory.set(novelKeys(jin).endings,JSON.stringify(['E1']))
memory.set(novelKeys(jin).save,JSON.stringify(startNovel(jin)))
memory.set(novelKeys(jin).bookmark,JSON.stringify({node:'S0',top:500}))
const before=JSON.stringify([...memory])
assert.equal(readNovelCompleted(storage,jin),true,'A completed Jin replay can unlock Tang')
assert.equal(readNovelCompleted(storage,story),false)
assert.deepEqual(readEndings(storage,story),[])
assert.deepEqual(readNovel(storage,story),startNovel(story))
assert.equal(JSON.stringify([...memory]),before,'Migration and reads preserve earlier lifetimes')
let jinEnd=startNovel(jin)
while(!novelView(jin,jinEnd).node.ending){const v=novelView(jin,jinEnd);jinEnd=v.options.length?chooseNovel(jin,jinEnd,v.options[0].id):advanceNovel(jin,jinEnd)}
memory.clear();memory.set(novelKeys(jin).save,JSON.stringify(jinEnd))
assert.equal(readNovelCompleted(storage,jin),false,'Reaching an ending is not finishing the previous lifetime')
memory.set(novelKeys(jin).save,JSON.stringify(finishNovel(jin,jinEnd)))
assert.equal(readNovelCompleted(storage,jin),true)
memory.set(novelKeys(jin).completed,'true');memory.set(novelKeys(jin).save,'{damaged replay')
assert.equal(readNovelCompleted(storage,jin),true,'A damaged replay must not relock the next lifetime')
const app=readFileSync(new URL('../src/hx/PrologueApp.tsx',import.meta.url),'utf8')
assert.ok(app.includes("reading === 'tang' && tangUnlocked"))
assert.ok(app.includes('jinUnlocked && jinProgress.completed'))
assert.ok(app.indexOf('story={jin} position=')<app.indexOf('story={tang} position='))
const reader=readFileSync(new URL('../src/hx/NovelReader.tsx',import.meta.url),'utf8')
assert.ok(reader.includes('src="/art/zero/ledger.webp"'))
console.log(`PASS: 41 reachable scenes, 64 complete routes, 6 endings, ${checkpoints} restore checkpoints; 16 scenes / 6 choices per run.`)
console.log(`PASS: actual text ${Math.min(...lengths)}–${Math.max(...lengths)} characters, both shared ending origins retained, all routes alive, no automatic decisions.`)
console.log('PASS: sequential finish-only unlock, older progress preserved, isolated save keys, invalid saves, backtracking and permanent replay unlock.')
