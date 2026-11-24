import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { NOVELS } from '../src/data/lives'
import { advanceNovel, chooseNovel, finishNovel, novelNode, novelView, previousNovel, previousDecision, restoreNovel, startNovel, type NovelPosition } from '../src/engine/novel'
import { novelKeys, readNovel, readEndings, readNovelCompleted } from '../src/hx/novel_save'

const earlier=NOVELS.slice(0,6),sixth=NOVELS[5],story=NOVELS[6]
assert.deepEqual(NOVELS.map(n=>n.id),['qin-novel','jin-novel','tang-novel','song-novel','ming1-novel','ming2-novel','seventh-novel'])
assert.equal(story.nodes.length,47)
assert.equal(new Set(story.nodes.map(n=>n.id)).size,47)
assert.equal(new Set(NOVELS.map(s=>s.start)).size,7)
const reached=new Set<string>(),shown=new Set<string>(),origins=new Set<string>()
const endings:Record<string,number>={},lengths:number[]=[]
let checkpoints=0
function walk(position:NovelPosition,chars=0){
  checkpoints++
  assert.deepEqual(restoreNovel(story,JSON.parse(JSON.stringify(position))),position)
  const {node,flags,route,beats,options}=novelView(story,position)
  reached.add(node.id)
  assert.deepEqual(flags,Object.assign({},...route.map(r=>novelNode(story,r.node).set)))
  const lifetimeComplete=route.some(r=>['C5R','C5B'].includes(r.node))
  assert.equal(flags.alive,!lifetimeComplete)
  assert.equal(flags.deathConfirmed,lifetimeComplete,'Return to heaven follows a completed natural human lifetime, never resurrection')
  if(lifetimeComplete)assert.equal(flags.mortalLifeComplete,true)
  assert.ok(beats.length&&beats.every(b=>b.text.trim()&&!/^\[/.test(b.text)))
  beats.forEach(b=>shown.add(node.id+':'+node.beats.indexOf(b)))
  if(route.length>1){
    const back=previousNovel(story,position),v=novelView(story,back)
    assert.deepEqual(v.options.length?chooseNovel(story,back,position.choices.at(-1)!.option):advanceNovel(story,back),{...position,finished:false})
  }
  if(position.choices.length){
    const back=previousDecision(story,position)
    assert.equal(back.node,position.choices.at(-1)!.node);assert.equal(back.choices.length,position.choices.length-1)
    if(['C4H','C4W'].includes(back.node)){
      assert.equal(novelView(story,back).flags.mortalLifeComplete,undefined)
      assert.equal(novelView(story,back).flags.alive,true)
    }
    if(back.node==='V6'){assert.equal(novelView(story,back).flags.route,undefined);assert.equal(novelView(story,back).flags.fire,undefined)}
  }
  chars+=beats.reduce((s,b)=>s+b.text.length,0)
  if(node.ending){
    assert.equal(route.length,16);assert.equal(position.choices.length,6)
    assert.ok(chars>=12500&&chars<=14000,node.id+': actual text '+chars)
    assert.equal(flags.together,true,'The final lifetime gives six distinct shared futures')
    assert.deepEqual(advanceNovel(story,position),position)
    assert.deepEqual(restoreNovel(story,finishNovel(story,position)),{...position,finished:true})
    if(['E2','E4'].includes(node.id)){assert.equal(flags.scroll,'sealed');assert.equal(flags.alive,true)}
    else assert.equal(flags.scroll,'opened')
    if(node.perfect)assert.ok(beats.some(b=>/白頭|白首/.test(b.text)))
    if(['E5','E6'].includes(node.id)){
      origins.add(node.id+':'+flags.rebuild)
      assert.equal(flags.afterlife,node.id==='E5'?'return':'unpromised')
      assert.equal(lifetimeComplete,node.id==='E5')
    }
    endings[node.id]=(endings[node.id]??0)+1;lengths.push(chars);return
  }
  assert.deepEqual(finishNovel(story,position),position)
  assert.deepEqual(chooseNovel(story,position,'invalid'),position)
  if(node.choice){
    assert.equal(options.length,node.id==='V6'?3:2)
    assert.ok(node.choice.prompt)
    assert.deepEqual(advanceNovel(story,position),position)
    for(const o of options){assert.ok(o.label&&o.detail&&novelNode(story,o.next));walk(chooseNovel(story,position,o.id),chars)}
  }else{assert.ok(node.next);walk(advanceNovel(story,position),chars)}
}
walk(startNovel(story))
assert.equal(reached.size,47);assert.equal(lengths.length,96)
assert.deepEqual(endings,{E1:16,E2:16,E3:16,E4:16,E5:16,E6:16})
assert.deepEqual([...origins].sort(),['E5:house','E5:work','E6:house','E6:work'])
assert.equal(shown.size,story.nodes.reduce((s,n)=>s+n.beats.length,0))
assert.equal(new Set(NOVELS.flatMap(s=>Object.values(novelKeys(s)))).size,28)
for(const bad of [null,{},...earlier.map(startNovel),{node:'E1',choices:[]},{node:'V0',choices:[],finished:true},{node:'C5R',choices:[],flags:{mortalLifeComplete:true}}]){
  assert.deepEqual(restoreNovel(story,bad),startNovel(story))
}
const memory=new Map<string,string>(),storage={getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v)}}
for(const old of earlier){
  memory.set(novelKeys(old).save,JSON.stringify(startNovel(old)))
  memory.set(novelKeys(old).bookmark,JSON.stringify({node:old.start,top:800}))
  memory.set(novelKeys(old).endings,JSON.stringify([old.nodes.find(n=>n.ending)!.id]))
}
const before=JSON.stringify([...memory])
assert.equal(readNovelCompleted(storage,sixth),true)
assert.equal(readNovelCompleted(storage,story),false)
assert.deepEqual(readNovel(storage,story),startNovel(story));assert.deepEqual(readEndings(storage,story),[])
assert.equal(JSON.stringify([...memory]),before,'Reading seventh never canonicalizes or rewrites earlier choices')
let end=startNovel(sixth)
while(!novelView(sixth,end).node.ending){const v=novelView(sixth,end);end=v.options.length?chooseNovel(sixth,end,v.options[0].id):advanceNovel(sixth,end)}
memory.clear();memory.set(novelKeys(sixth).save,JSON.stringify(end))
assert.equal(readNovelCompleted(storage,sixth),false)
memory.set(novelKeys(sixth).save,JSON.stringify(finishNovel(sixth,end)))
assert.equal(readNovelCompleted(storage,sixth),true)
memory.set(novelKeys(sixth).completed,'true');memory.set(novelKeys(sixth).save,'{broken')
assert.equal(readNovelCompleted(storage,sixth),true)
assert.equal(readNovelCompleted(storage,story),false)
const app=readFileSync(new URL('../src/hx/PrologueApp.tsx',import.meta.url),'utf8')
assert.ok(app.includes("reading === 'seventh' && seventhUnlocked"))
assert.ok(app.includes('ming2Unlocked && ming2Progress.completed'))
assert.ok(app.includes('if (seventhUnlocked) seventhProgress.setPosition(next)'))
assert.ok(NOVELS.findIndex(story => story.id === 'ming2-novel') < NOVELS.findIndex(story => story.id === 'seventh-novel'), 'Chapter data preserves directory order')
assert.ok(!app.includes('<NovelEntry story={modern}'),'Modern lifetime stays hidden')
assert.ok(readFileSync(new URL('../src/hx/NovelReader.tsx',import.meta.url),'utf8').includes('src="/art/zero/ledger.webp"'))
console.log('PASS: 47 scenes, 96 routes, 6 endings, '+checkpoints+' restore checkpoints; 16 scenes / 6 decisions per run.')
console.log('PASS: actual visible text '+Math.min(...lengths)+'–'+Math.max(...lengths)+' characters; all callbacks, four final origins, sealed-scroll futures remain valid, no mortal resurrection.')
console.log('PASS: sixth finish-only unlock, permanent replay completion, 28 isolated keys, prior choices untouched, corrupt saves, backtracking and hidden eighth lifetime.')
