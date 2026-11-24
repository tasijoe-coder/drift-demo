import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { NOVELS } from '../src/data/lives'
import { advanceNovel, chooseNovel, finishNovel, novelNode, novelView, previousNovel, previousDecision, restoreNovel, startNovel, type NovelPosition } from '../src/engine/novel'
import { novelKeys, readNovel, readEndings, readNovelCompleted } from '../src/hx/novel_save'

const [qin,jin,tang,story] = NOVELS
assert.equal(story.id,'song-novel')
assert.equal(story.nodes.length,47)
assert.equal(new Set(story.nodes.map(n=>n.id)).size,47)
const reached=new Set<string>(), visibleBeats=new Set<string>(), reunionOrigins=new Set<string>()
const endings:Record<string,number>={}, lengths:number[]=[]
let checkpoints=0
function walk(position:NovelPosition,chars=0){
  checkpoints++
  assert.deepEqual(restoreNovel(story,JSON.parse(JSON.stringify(position))),position)
  const {node,flags,route,beats,options}=novelView(story,position)
  reached.add(node.id)
  assert.deepEqual(flags,Object.assign({},...route.map(r=>novelNode(story,r.node).set)))
  assert.equal(flags.alive,true)
  assert.notEqual(flags.deathConfirmed,true,'Unverified obituary never becomes confirmed death')
  assert.ok(beats.length&&beats.every(b=>b.text.trim()&&!/^\[/.test(b.text)))
  beats.forEach(b=>visibleBeats.add(node.id+':'+node.beats.indexOf(b)))
  if(route.length>1){
    const previous=previousNovel(story,position),view=novelView(story,previous)
    const next=view.options.length?chooseNovel(story,previous,position.choices.at(-1)!.option):advanceNovel(story,previous)
    assert.deepEqual(next,{...position,finished:false})
  }
  if(position.choices.length){
    const back=previousDecision(story,position)
    assert.equal(back.node,position.choices.at(-1)!.node)
    assert.equal(back.choices.length,position.choices.length-1)
    if(back.node==='F6'){
      assert.equal(novelView(story,back).flags.route,undefined,'Rewinding the major fork clears its outcome')
      assert.equal(novelView(story,back).flags.mutualAliveKnown,undefined)
    }
  }
  if(node.id.startsWith('A'))assert.equal(flags.route,'verify')
  if(node.id.startsWith('B'))assert.equal(flags.route,'shelter')
  if(node.id.startsWith('C'))assert.equal(flags.route,'search')
  chars+=beats.reduce((n,b)=>n+b.text.length,0)
  if(node.ending){
    assert.equal(route.length,16);assert.equal(position.choices.length,6)
    assert.ok(chars>=12500&&chars<=14000,node.id+': visible text '+chars)
    assert.deepEqual(advanceNovel(story,position),position)
    assert.deepEqual(restoreNovel(story,finishNovel(story,position)),{...position,finished:true})
    if(node.id==='E1'){assert.equal(node.perfect,true);assert.ok(beats.some(b=>b.text.includes('白頭')))}
    if(node.id==='E6'){
      assert.equal(flags.identityVerified,false);assert.equal(flags.mutualAliveKnown,false)
      assert.equal(flags.together,false)
      assert.ok(beats.some(b=>b.text.includes('尚未收到')))
    }else{
      assert.equal(flags.identityVerified,true);assert.equal(flags.mutualAliveKnown,true)
      assert.equal(flags.together,node.id!=='E4')
    }
    if(node.id==='E5'){
      reunionOrigins.add(route.at(-2)!.node)
      assert.equal(flags.news,'unverified')
      assert.ok(beats.some(b=>b.text.includes('第五年')))
    }
    endings[node.id]=(endings[node.id]??0)+1;lengths.push(chars);return
  }
  assert.deepEqual(finishNovel(story,position),position)
  assert.deepEqual(chooseNovel(story,position,'invalid'),position)
  if(node.choice){
    assert.equal(options.length,node.id==='F6'?3:2)
    assert.ok(node.choice.prompt)
    assert.deepEqual(advanceNovel(story,position),position)
    for(const option of options){
      assert.ok(option.label&&option.detail&&novelNode(story,option.next))
      walk(chooseNovel(story,position,option.id),chars)
    }
  }else{assert.ok(node.next);walk(advanceNovel(story,position),chars)}
}
walk(startNovel(story))
assert.equal(reached.size,47)
assert.equal(lengths.length,96)
assert.deepEqual(endings,{E1:16,E2:16,E3:16,E4:16,E5:24,E6:8})
assert.deepEqual([...reunionOrigins].sort(),['C5F','C5O','C5P'])
assert.equal(visibleBeats.size,story.nodes.reduce((n,s)=>n+s.beats.length,0),'Every conditional paragraph is reachable')
assert.equal(new Set(NOVELS.flatMap(s=>Object.values(novelKeys(s)))).size,NOVELS.length*4)
for(const corrupt of [null,{},startNovel(qin),startNovel(jin),startNovel(tang),{node:'E1',choices:[]},{node:'F0',choices:[],finished:true},{node:'C5P',choices:[],flags:{alive:true,mutualAliveKnown:true}}]){
  assert.deepEqual(restoreNovel(story,corrupt),startNovel(story))
}
const memory=new Map<string,string>()
const storage={getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v)}}
for(const old of [qin,jin,tang]){
  memory.set(novelKeys(old).save,JSON.stringify(startNovel(old)))
  memory.set(novelKeys(old).endings,JSON.stringify([old.nodes.find(n=>n.ending)!.id]))
  memory.set(novelKeys(old).bookmark,JSON.stringify({node:old.start,top:620}))
}
const before=JSON.stringify([...memory])
assert.equal(readNovelCompleted(storage,tang),true,'An older third ending collection unlocks fourth during replay')
assert.equal(readNovelCompleted(storage,story),false)
assert.deepEqual(readEndings(storage,story),[])
assert.deepEqual(readNovel(storage,story),startNovel(story))
assert.equal(JSON.stringify([...memory]),before,'Fourth reads preserve all older saves and bookmarks')
let thirdEnd=startNovel(tang)
while(!novelView(tang,thirdEnd).node.ending){
  const v=novelView(tang,thirdEnd)
  thirdEnd=v.options.length?chooseNovel(tang,thirdEnd,v.options[0].id):advanceNovel(tang,thirdEnd)
}
memory.clear();memory.set(novelKeys(tang).save,JSON.stringify(thirdEnd))
assert.equal(readNovelCompleted(storage,tang),false,'Merely visiting third ending cannot unlock fourth')
memory.set(novelKeys(tang).save,JSON.stringify(finishNovel(tang,thirdEnd)))
assert.equal(readNovelCompleted(storage,tang),true)
memory.set(novelKeys(tang).completed,'true');memory.set(novelKeys(tang).save,'{damaged replay')
assert.equal(readNovelCompleted(storage,tang),true,'Replay damage cannot revoke permanent unlock')
assert.equal(readNovelCompleted(storage,story),false)
const app=readFileSync(new URL('../src/hx/PrologueApp.tsx',import.meta.url),'utf8')
assert.ok(app.includes("reading === 'song' && songUnlocked"))
assert.ok(app.includes('tangUnlocked && tangProgress.completed'))
assert.ok(app.includes("if (songUnlocked) songProgress.setPosition(next)"))
assert.ok(NOVELS.findIndex(story => story.id === 'tang-novel') < NOVELS.findIndex(story => story.id === 'song-novel'), 'Chapter data preserves directory order')
assert.ok(readFileSync(new URL('../src/hx/NovelReader.tsx',import.meta.url),'utf8').includes('src="/art/zero/ledger.webp"'))
console.log('PASS: 47 scenes, 96 complete routes, 6 endings, '+checkpoints+' restore checkpoints; 16 scenes / 6 decisions per run.')
console.log('PASS: actual visible text '+Math.min(...lengths)+'–'+Math.max(...lengths)+' characters; all conditional text reachable; three verified reunion origins; no resurrection.')
console.log('PASS: finish-only third-to-fourth unlock, permanent replay completion, isolated keys, prior progress preserved, corrupted saves and branch rewind.')
