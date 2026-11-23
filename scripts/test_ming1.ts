import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { NOVELS } from '../src/data/lives'
import { advanceNovel, chooseNovel, finishNovel, novelNode, novelView, previousNovel, previousDecision, restoreNovel, startNovel, type NovelPosition } from '../src/engine/novel'
import { novelKeys, readNovel, readEndings, readNovelCompleted } from '../src/hx/novel_save'

const previous=NOVELS.slice(0,4), fourth=NOVELS[3], story=NOVELS[4]
assert.equal(story.id,'ming1-novel')
assert.equal(story.nodes.length,47)
assert.equal(new Set(story.nodes.map(n=>n.id)).size,47)
const reached=new Set<string>(),shown=new Set<string>(),griefSources=new Set<string>()
const endings:Record<string,number>={},lengths:number[]=[]
let checkpoints=0
function walk(position:NovelPosition,chars=0){
  checkpoints++
  assert.deepEqual(restoreNovel(story,JSON.parse(JSON.stringify(position))),position)
  const {node,flags,route,beats,options}=novelView(story,position)
  reached.add(node.id)
  assert.deepEqual(flags,Object.assign({},...route.map(r=>novelNode(story,r.node).set)))
  assert.ok(beats.length&&beats.every(b=>b.text.trim()&&!/^\[/.test(b.text)))
  beats.forEach(b=>shown.add(node.id+':'+node.beats.indexOf(b)))
  const passedDeath=route.some(r=>r.node==='C2')
  assert.equal(flags.deathConfirmed,passedDeath,'Only the observed death is confirmed')
  assert.equal(flags.alive,!passedDeath,'No later node resurrects Shang Lin')
  if(passedDeath)assert.notEqual(flags.recovered,true)
  if(route.length>1){
    const back=previousNovel(story,position),v=novelView(story,back)
    assert.deepEqual(v.options.length?chooseNovel(story,back,position.choices.at(-1)!.option):advanceNovel(story,back),{...position,finished:false})
  }
  if(position.choices.length){
    const back=previousDecision(story,position)
    assert.equal(back.node,position.choices.at(-1)!.node)
    assert.equal(back.choices.length,position.choices.length-1)
    if(back.node==='M6'){
      const f=novelView(story,back).flags
      assert.equal(f.route,undefined);assert.equal(f.deathConfirmed,false);assert.equal(f.alive,true)
    }
  }
  chars+=beats.reduce((s,b)=>s+b.text.length,0)
  if(node.ending){
    assert.equal(route.length,16);assert.equal(position.choices.length,6)
    assert.ok(chars>=12500&&chars<=14000,node.id+': visible length '+chars)
    assert.deepEqual(advanceNovel(story,position),position)
    assert.deepEqual(restoreNovel(story,finishNovel(story,position)),{...position,finished:true})
    if(['E5','E6'].includes(node.id)){
      assert.equal(flags.route,'late');assert.equal(flags.deathConfirmed,true);assert.equal(flags.together,false)
      griefSources.add(node.id+':'+flags.grief)
    }else{
      assert.equal(flags.deathConfirmed,false);assert.equal(flags.recovered,true)
      assert.equal(flags.together,node.id!=='E4')
    }
    if(node.id==='E1'){assert.equal(node.perfect,true);assert.ok(beats.some(b=>b.text.includes('白頭')))}
    endings[node.id]=(endings[node.id]??0)+1;lengths.push(chars);return
  }
  assert.deepEqual(finishNovel(story,position),position)
  assert.deepEqual(chooseNovel(story,position,'invalid'),position)
  if(node.choice){
    assert.equal(options.length,node.id==='M6'?3:2)
    assert.ok(node.choice.prompt)
    assert.deepEqual(advanceNovel(story,position),position)
    for(const option of options){
      assert.ok(option.label&&option.detail&&novelNode(story,option.next))
      walk(chooseNovel(story,position,option.id),chars)
    }
  }else{assert.ok(node.next);walk(advanceNovel(story,position),chars)}
}
walk(startNovel(story))
assert.equal(reached.size,47);assert.equal(lengths.length,96)
assert.deepEqual(endings,{E1:16,E2:16,E3:16,E4:16,E5:16,E6:16})
assert.deepEqual([...griefSources].sort(),['E5:house','E5:work','E6:house','E6:work'])
assert.equal(shown.size,story.nodes.reduce((s,n)=>s+n.beats.length,0),'Every conditional paragraph is reachable')
assert.equal(new Set(NOVELS.flatMap(s=>Object.values(novelKeys(s)))).size,NOVELS.length*4)
for(const bad of [null,{},...previous.map(startNovel),{node:'E1',choices:[]},{node:'M0',choices:[],finished:true},{node:'C2',choices:[],flags:{alive:true}}]){
  assert.deepEqual(restoreNovel(story,bad),startNovel(story))
}
assert.ok(novelNode(story,'M6').choice!.options.find(o=>o.id==='wait')!.detail.includes('病勢可能惡化'),'Risk of deterioration is disclosed before waiting')
const memory=new Map<string,string>(),storage={getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v)}}
for(const old of previous){
  memory.set(novelKeys(old).save,JSON.stringify(startNovel(old)))
  memory.set(novelKeys(old).bookmark,JSON.stringify({node:old.start,top:700}))
  memory.set(novelKeys(old).endings,JSON.stringify([old.nodes.find(n=>n.ending)!.id]))
}
const before=JSON.stringify([...memory])
assert.equal(readNovelCompleted(storage,fourth),true)
assert.equal(readNovelCompleted(storage,story),false)
assert.deepEqual(readNovel(storage,story),startNovel(story));assert.deepEqual(readEndings(storage,story),[])
assert.equal(JSON.stringify([...memory]),before,'Fifth reads do not alter earlier saves, bookmarks or collections')
let end=startNovel(fourth)
while(!novelView(fourth,end).node.ending){const v=novelView(fourth,end);end=v.options.length?chooseNovel(fourth,end,v.options[0].id):advanceNovel(fourth,end)}
memory.clear();memory.set(novelKeys(fourth).save,JSON.stringify(end))
assert.equal(readNovelCompleted(storage,fourth),false,'Visiting fourth ending alone cannot unlock fifth')
memory.set(novelKeys(fourth).save,JSON.stringify(finishNovel(fourth,end)))
assert.equal(readNovelCompleted(storage,fourth),true)
memory.set(novelKeys(fourth).completed,'true');memory.set(novelKeys(fourth).save,'{broken replay')
assert.equal(readNovelCompleted(storage,fourth),true)
assert.equal(readNovelCompleted(storage,story),false)
const app=readFileSync(new URL('../src/hx/PrologueApp.tsx',import.meta.url),'utf8')
assert.ok(app.includes("reading === 'ming1' && ming1Unlocked"))
assert.ok(app.includes('songUnlocked && songProgress.completed'))
assert.ok(app.includes('if (ming1Unlocked) ming1Progress.setPosition(next)'))
assert.ok(app.indexOf('<NovelEntry story={song}')<app.indexOf('<NovelEntry story={ming1}'))
assert.ok(readFileSync(new URL('../src/hx/NovelReader.tsx',import.meta.url),'utf8').includes('src="/art/zero/ledger.webp"'))
console.log('PASS: 47 scenes, 96 routes, 6 endings, '+checkpoints+' restore checkpoints; 16 scenes / 6 decisions per run.')
console.log('PASS: actual visible text '+Math.min(...lengths)+'–'+Math.max(...lengths)+' characters; all conditional text, four grief origins, confirmed death never reversed.')
console.log('PASS: fourth finish-only unlock, permanent replay completion, isolated save keys, old progress preservation, corrupt saves and backtracking.')
