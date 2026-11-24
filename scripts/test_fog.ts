import assert from 'node:assert/strict'
import { BONUS_NOVELS, NOVELS } from '../src/data/lives'
import { advanceNovel, chooseNovel, finishNovel, novelView, novelNode, previousDecision, previousNovel, restoreNovel, startNovel, type NovelPosition } from '../src/engine/novel'
import { fogResources } from '../src/hx/fog_status'
import { afterwordFinished, afterwordKey, afterwordStory, advanceAfterword, AFTERWORD_COMPLETED_KEY, readAfterwordUnlock, startAfterword, type AfterwordOrigin } from '../src/hx/afterword_story'
import { novelKeys, readNovel, readEndings } from '../src/hx/novel_save'

const story=BONUS_NOVELS[0],reached=new Set<string>(),shown=new Set<string>(),counts:Record<string,number>={},lengths:number[]=[]
let checkpoints=0,exhausted=0
function walk(position:NovelPosition,chars=0){
  checkpoints++
  assert.deepEqual(restoreNovel(story,JSON.parse(JSON.stringify(position))),position)
  const v=novelView(story,position),r=fogResources(v.flags)
  reached.add(v.node.id)
  v.beats.forEach(b=>shown.add(v.node.id+':'+v.node.beats.indexOf(b)))
  assert.ok(v.beats.every(b=>b.text.trim()&&b.speaker.trim()))
  assert.ok(r.goldUsed>=1&&r.goldUsed<=3)
  assert.ok(r.jadeUsed>=1&&r.jadeUsed<=3)
  assert.ok(r.goldLeft>=0&&r.jadeLeft>=0)
  assert.ok(r.moonMarks>=0&&r.moonMarks<=2)
  assert.equal(r.goldUsed,1+Number(v.route.some(p=>['A10S','B10S','C10S'].includes(p.node)))+Number(v.route.some(p=>['F2','F3','C13'].includes(p.node))))
  assert.equal(r.jadeUsed,1+Number(v.route.some(p=>p.node==='J5'))+Number(v.route.some(p=>['F2','F3','C13'].includes(p.node))))
  assert.equal(r.moonMarks,Number(v.route.some(p=>p.node==='H3'))+Number(v.route.some(p=>['A12Y','B12Y','C12Y'].includes(p.node))))
  assert.equal(v.flags.alive,true)
  if(r.goldUsed===3&&r.jadeUsed===3)exhausted++
  if(v.route.length>1){
    const back=previousNovel(story,position),bv=novelView(story,back)
    const fwd=bv.node.choice?chooseNovel(story,back,position.choices.at(-1)!.option):advanceNovel(story,back)
    assert.deepEqual(fwd,{...position,finished:false})
  }
  if(position.choices.length){
    const back=previousDecision(story,position)
    assert.equal(back.node,position.choices.at(-1)!.node)
    assert.equal(back.choices.length,position.choices.length-1)
    if(back.node==='P7')assert.equal(novelView(story,back).flags.goldExtra,false)
    if(back.node==='P4')assert.equal(novelView(story,back).flags.jadeExtra,false)
  }
  chars+=v.beats.reduce((a,b)=>a+b.text.length,0)
  if(v.node.ending){
    assert.equal(v.route.length,16);assert.equal(position.choices.length,6)
    assert.ok(chars>=8500&&chars<=11000,v.node.id+': '+chars+' visible characters')
    counts[v.node.id]=(counts[v.node.id]??0)+1;lengths.push(chars)
    assert.deepEqual(restoreNovel(story,finishNovel(story,position)),{...position,finished:true})
    if(v.node.id==='F5'){assert.ok(r.sealed&&r.closed);assert.equal(r.goldLeft,0);assert.equal(r.jadeLeft,0)}
    if(v.node.id==='F6'){assert.equal(r.closed,true);assert.equal(r.sealed,false)}
    if(v.node.perfect)assert.ok(v.beats.some(b=>b.text.includes('白頭')))
    return
  }
  assert.deepEqual(finishNovel(story,position),position)
  assert.deepEqual(chooseNovel(story,position,'forged'),position)
  if(v.node.choice){
    assert.equal(v.options.length,v.node.id==='P7'?3:2)
    for(const option of v.options){assert.ok(novelNode(story,option.next));walk(chooseNovel(story,position,option.id),chars)}
  }else{assert.ok(v.node.next);walk(advanceNovel(story,position),chars)}
}
walk(startNovel(story))
assert.equal(reached.size,43);assert.equal(lengths.length,96)
assert.deepEqual(counts,{F1:16,F2:16,F3:16,F4:16,F5:16,F6:16})
assert.equal(shown.size,story.nodes.reduce((a,n)=>a+n.beats.length,0))
assert.ok(exhausted>0)
const oldKeys=NOVELS.flatMap(n=>Object.values(novelKeys(n)))
assert.ok(Object.values(novelKeys(story)).every(k=>!oldKeys.includes(k)))
assert.equal(new Set([...NOVELS,...BONUS_NOVELS].map(n=>n.start)).size,8)
for(const bad of [null,{},...NOVELS.map(startNovel),{node:'F1',choices:[]},{node:'P0',choices:[],finished:true},{node:'C13',choices:[],flags:{goldExtra:false}}]){
 assert.deepEqual(restoreNovel(story,bad),startNovel(story))
}
const memory=new Map<string,string>(),storage={getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v)}}
for(const old of NOVELS){
 memory.set(novelKeys(old).save,JSON.stringify(startNovel(old)))
 memory.set(novelKeys(old).endings,JSON.stringify([old.nodes.find(n=>n.ending)!.id]))
}
const before=JSON.stringify([...memory])
assert.equal(readAfterwordUnlock(storage),false)
assert.deepEqual(readNovel(storage,story),startNovel(story));assert.deepEqual(readEndings(storage,story),[])
assert.equal(JSON.stringify([...memory]),before)
for(const origin of ['E1','E2','E3','E4','E5','E6'] as AfterwordOrigin[]){
 memory.clear()
 const coda=afterwordStory(origin);let pos=startAfterword(coda)
 while(!afterwordFinished(coda,pos)){
   memory.set(afterwordKey(origin),JSON.stringify(pos))
   assert.equal(readAfterwordUnlock(storage),false,'Last visible sentence alone must not unlock')
   pos=advanceAfterword(coda,pos)
 }
 memory.set(afterwordKey(origin),JSON.stringify(pos))
 assert.equal(readAfterwordUnlock(storage),true)
 memory.set(AFTERWORD_COMPLETED_KEY,'true');memory.set(afterwordKey(origin),JSON.stringify(startAfterword(coda)))
 assert.equal(readAfterwordUnlock(storage),true,'Replaying must not relock bonus')
 memory.set(afterwordKey(origin),'{broken')
 assert.equal(readAfterwordUnlock(storage),true)
}
memory.clear();memory.set(afterwordKey('E1'),'{broken')
const coda=afterwordStory('E2');let pos=startAfterword(coda)
while(!afterwordFinished(coda,pos))pos=advanceAfterword(coda,pos)
memory.set(afterwordKey('E2'),JSON.stringify(pos))
assert.equal(readAfterwordUnlock(storage),true)
console.log('PASS: 43 scenes, 96 routes, six endings, '+checkpoints+' restore checkpoints, 16 scenes / six choices per run.')
console.log('PASS: visible text '+Math.min(...lengths)+'–'+Math.max(...lengths)+' characters; every conditional passage reached; each character uses at most three spells; at most two matchmaker interventions; rewind restores resources.')
console.log('PASS: all six afterword finish-only unlocks, permanent replay unlock, corrupt saves, isolated bonus keys and earlier progress untouched.')
