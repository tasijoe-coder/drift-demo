import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { NOVELS } from '../src/data/lives'
import { advanceNovel, chooseNovel, finishNovel, novelNode, novelView, previousNovel, previousDecision, restoreNovel, startNovel, type NovelPosition } from '../src/engine/novel'
import { novelKeys, readNovel, readEndings, readNovelCompleted } from '../src/hx/novel_save'

const earlier=NOVELS.slice(0,5), fifth=NOVELS[4],story=NOVELS[5]
assert.equal(story.id,'ming2-novel')
assert.equal(story.nodes.length,47)
assert.equal(new Set(story.nodes.map(n=>n.id)).size,47)
const reached=new Set<string>(),shown=new Set<string>(),origins=new Set<string>()
const endings:Record<string,number>={},lengths:number[]=[]
let checkpoints=0
function walk(position:NovelPosition,chars=0){
  checkpoints++
  assert.deepEqual(restoreNovel(story,JSON.parse(JSON.stringify(position))),position)
  const {node,flags,route,beats,options}=novelView(story,position)
  reached.add(node.id)
  assert.deepEqual(flags,Object.assign({},...route.map(r=>novelNode(story,r.node).set)))
  assert.equal(flags.alive,true);assert.equal(flags.deathConfirmed,false,'No obituary is invented to reunite living people')
  assert.ok(beats.length&&beats.every(b=>b.text.trim()&&!/^\[/.test(b.text)))
  beats.forEach(b=>shown.add(node.id+':'+node.beats.indexOf(b)))
  if(route.length>1){
    const back=previousNovel(story,position),v=novelView(story,back)
    assert.deepEqual(v.options.length?chooseNovel(story,back,position.choices.at(-1)!.option):advanceNovel(story,back),{...position,finished:false})
  }
  if(position.choices.length){
    const back=previousDecision(story,position)
    assert.equal(back.node,position.choices.at(-1)!.node)
    assert.equal(back.choices.length,position.choices.length-1)
    if(back.node==='L6'){
      assert.equal(novelView(story,back).flags.storm,undefined)
      assert.equal(novelView(story,back).flags.relationship,undefined)
    }
  }
  chars+=beats.reduce((s,b)=>s+b.text.length,0)
  if(node.ending){
    assert.equal(route.length,16);assert.equal(position.choices.length,6)
    // The editorial trial trims repeated daily scenes while retaining all 16 scenes.
    assert.ok(chars>=11500&&chars<=14000,node.id+': actual visible text '+chars)
    assert.deepEqual(advanceNovel(story,position),position)
    assert.deepEqual(restoreNovel(story,finishNovel(story,position)),{...position,finished:true})
    assert.equal(flags.together,!['E4','E6'].includes(node.id))
    if(['E5','E6'].includes(node.id)){
      assert.equal(flags.storm,'rescued')
      origins.add(node.id+':'+flags.recovery)
      assert.equal(flags.relationship,node.id==='E5'?'renewed':'released')
    }
    if(node.id==='E1'){assert.equal(node.perfect,true);assert.ok(beats.some(b=>b.text.includes('白首')))}
    endings[node.id]=(endings[node.id]??0)+1;lengths.push(chars);return
  }
  assert.deepEqual(finishNovel(story,position),position)
  assert.deepEqual(chooseNovel(story,position,'invalid'),position)
  if(node.choice){
    assert.equal(options.length,node.id==='L6'?3:2)
    assert.ok(node.choice.prompt)
    assert.deepEqual(advanceNovel(story,position),position)
    for(const o of options){assert.ok(o.label&&o.detail&&novelNode(story,o.next));walk(chooseNovel(story,position,o.id),chars)}
  }else{assert.ok(node.next);walk(advanceNovel(story,position),chars)}
}
walk(startNovel(story))
assert.equal(reached.size,47);assert.equal(lengths.length,96)
assert.deepEqual(endings,{E1:16,E2:16,E3:16,E4:16,E5:16,E6:16})
assert.deepEqual([...origins].sort(),['E5:away','E5:near','E6:away','E6:near'])
assert.equal(shown.size,story.nodes.reduce((s,n)=>s+n.beats.length,0),'Every conditional callback can actually be read')
assert.equal(new Set(NOVELS.flatMap(s=>Object.values(novelKeys(s)))).size,NOVELS.length*4)
for(const bad of [null,{},...earlier.map(startNovel),{node:'E1',choices:[]},{node:'L0',choices:[],finished:true},{node:'C5R',choices:[],flags:{storm:'rescued',together:true}}]){
  assert.deepEqual(restoreNovel(story,bad),startNovel(story))
}
const memory=new Map<string,string>(),storage={getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v)}}
for(const old of earlier){
  memory.set(novelKeys(old).save,JSON.stringify(startNovel(old)))
  memory.set(novelKeys(old).bookmark,JSON.stringify({node:old.start,top:650}))
  memory.set(novelKeys(old).endings,JSON.stringify([old.nodes.find(n=>n.ending)!.id]))
}
const before=JSON.stringify([...memory])
assert.equal(readNovelCompleted(storage,fifth),true)
assert.equal(readNovelCompleted(storage,story),false)
assert.deepEqual(readNovel(storage,story),startNovel(story));assert.deepEqual(readEndings(storage,story),[])
assert.equal(JSON.stringify([...memory]),before,'Adding sixth preserves every earlier bookmark and collection')
let end=startNovel(fifth)
while(!novelView(fifth,end).node.ending){const v=novelView(fifth,end);end=v.options.length?chooseNovel(fifth,end,v.options[0].id):advanceNovel(fifth,end)}
memory.clear();memory.set(novelKeys(fifth).save,JSON.stringify(end))
assert.equal(readNovelCompleted(storage,fifth),false)
memory.set(novelKeys(fifth).save,JSON.stringify(finishNovel(fifth,end)))
assert.equal(readNovelCompleted(storage,fifth),true)
memory.set(novelKeys(fifth).completed,'true');memory.set(novelKeys(fifth).save,'{broken')
assert.equal(readNovelCompleted(storage,fifth),true)
assert.equal(readNovelCompleted(storage,story),false)
const app=readFileSync(new URL('../src/hx/PrologueApp.tsx',import.meta.url),'utf8')
assert.ok(app.includes("reading === 'ming2' && ming2Unlocked"))
assert.ok(app.includes('ming1Unlocked && ming1Progress.completed'))
assert.ok(app.includes('if (ming2Unlocked) ming2Progress.setPosition(next)'))
assert.ok(NOVELS.findIndex(story => story.id === 'ming1-novel') < NOVELS.findIndex(story => story.id === 'ming2-novel'), 'Chapter data preserves directory order')
assert.ok(readFileSync(new URL('../src/hx/NovelReader.tsx',import.meta.url),'utf8').includes('src="/art/zero/ledger.webp"'))
console.log('PASS: 47 scenes, 96 routes, 6 endings, '+checkpoints+' restore checkpoints; 16 scenes / 6 decisions per run.')
console.log('PASS: actual visible text '+Math.min(...lengths)+'–'+Math.max(...lengths)+' characters; all conditional text, four shared ending origins, every route alive.')
console.log('PASS: fifth finish-only unlock, permanent replay completion, independent keys, old progress retained, corrupt saves and backtracking.')
