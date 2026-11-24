import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { NOVELS } from '../src/data/lives'
import { advanceNovel, chooseNovel, novelView, startNovel, type NovelPosition } from '../src/engine/novel'

const destination=resolve(process.argv[2] ?? 'story-exports')
mkdirSync(destination,{recursive:true})
const titles=['第一世_孟姜女與范喜良','第二世_梁山伯與祝英台','第三世_王月英與郭華','第四世_錢玉蓮與王十朋','第五世_秦雪梅與商琳','第六世_賈玉珍與韋燕春','第七世_劉瑞蓮與李奎元']
for(const [index,story] of NOVELS.entries()){
  const routes:{position:NovelPosition;nodes:string[];chars:number}[]=[]
  const activeBeats=new Map<string,Set<number>>(),activeOptions=new Map<string,Set<number>>()
  function walk(position:NovelPosition,chars=0){
    const view=novelView(story,position)
    chars+=view.beats.reduce((sum,b)=>sum+b.text.length,0)
    if(view.node.ending){routes.push({position,nodes:view.route.map(p=>p.node),chars});return}
    if(view.options.length)for(const option of view.options)walk(chooseNovel(story,position,option.id),chars)
    else walk(advanceNovel(story,position),chars)
  }
  walk(startNovel(story))
  for(const [i,route] of routes.entries()){
    let position=startNovel(story)
    for(const id of route.nodes){
      if(position.node!==id)throw new Error('Export route mismatch')
      const view=novelView(story,position)
      for(const beat of view.beats){
        const key=id+':'+view.node.beats.indexOf(beat)
        if(!activeBeats.has(key))activeBeats.set(key,new Set())
        activeBeats.get(key)!.add(i+1)
      }
      for(const option of view.options){
        const key=id+':'+option.id
        if(!activeOptions.has(key))activeOptions.set(key,new Set())
        activeOptions.get(key)!.add(i+1)
      }
      const decision=route.position.choices.find(c=>c.node===id)
      position=decision?chooseNovel(story,position,decision.option):advanceNovel(story,position)
    }
  }
  const code=(i:number)=>'R'+String(i).padStart(3,'0')
  function membership(set:Set<number>|undefined){
    if(!set?.size)return '無（匯出檢查失敗）'
    const nums=[...set].sort((a,b)=>a-b),parts:string[]=[]
    for(let i=0;i<nums.length;){
      const from=nums[i];let to=from
      while(i+1<nums.length&&nums[i+1]===to+1)to=nums[++i]
      parts.push(to===from?code(from):code(from)+'–'+code(to));i++
    }
    return parts.join('、')
  }
  const nodeLabel=(id:string)=>{const n=story.nodes.find(n=>n.id===id)!;return id+'〈'+n.title+'〉'}
  const text:string[]=[
    story.title+'｜完整正文、選擇與分支架構',
    '本文件包含所有結局劇透，取自目前遊戲的完整主線資料。',
    '閱讀方式：先看分支總覽，再挑一條完整路線依節點編號跳讀正文。各分支是不同可能，不是同時發生。',
    '玩家身分：月老。選項是月老留下機會的方式；角色的反應與後續正文列在選項所指向的節點。',
    '規模：'+story.nodes.length+'個節點、'+routes.length+'條完整走法、'+story.nodes.filter(n=>n.ending).length+'個結局；每輪'+story.pageCount+'段、'+routes[0].position.choices.length+'次選擇。',
    '每輪正文約'+Math.min(...routes.map(r=>r.chars))+'–'+Math.max(...routes.map(r=>r.chars))+'字元（含標點，不含選項與角色標示）。',
    '【條件補文】以實際可見的路線編號標記；只有列出的路線才讀該段。其餘正文為抵達該節點時共通出現。',
    '此處的完整路線是遊戲選擇組合，不表示有同樣數量的互不重複長篇；部分情節會合流，但保留前情補文。',
    '',
    '一、分支架構總覽',
    '故事起點：'+nodeLabel(story.start),
    ...story.nodes.map(n=>n.id+'〈'+n.title+'〉'+(n.ending?' →【結局】':n.choice?'\n'+n.choice.options.map((o,i)=>'  '+(i+1)+'. '+o.label+' → '+nodeLabel(o.next)+(o.when?'（有前情限制，見正文）':'')).join('\n'):' → '+nodeLabel(n.next!))),
    '',
    '二、結局索引',
    ...story.nodes.filter(n=>n.ending).map(n=>n.id+'〈'+n.title+'〉｜抵達方式：'+membership(new Set(routes.flatMap((r,i)=>r.position.node===n.id?[i+1]:[])))+(n.perfect?'｜遊戲標示：相伴至白首':'')),
    '',
    '三、完整路線索引',
    '以下按每個選點的選項順序列出。R001可作為第一條試讀路線，不代表唯一正解或傳說原始版本。',
  ]
  for(const [i,route] of routes.entries()){
    text.push('',code(i+1)+' → '+nodeLabel(route.position.node),'節點順序：'+route.nodes.join(' → '))
    for(const [j,choice] of route.position.choices.entries()){
      const n=story.nodes.find(n=>n.id===choice.node)!,o=n.choice!.options.find(o=>o.id===choice.option)!
      text.push('  選擇'+(j+1)+'｜'+nodeLabel(n.id)+'：'+o.label+' → '+nodeLabel(o.next))
    }
  }
  text.push('','四、全部正文與逐點選擇','')
  for(const n of story.nodes){
    text.push('════════════════════════════════','【'+n.id+'】'+n.chapter+'｜'+n.title,'可到達此段：'+membership(new Set(routes.flatMap((r,i)=>r.nodes.includes(n.id)?[i+1]:[]))),'')
    for(const [i,beat] of n.beats.entries()){
      const visible=activeBeats.get(n.id+':'+i)
      if(!visible?.size)throw new Error('Unreachable paragraph '+n.id+':'+i)
      if(beat.when)text.push('【條件補文：只讀於 '+membership(visible)+'】')
      text.push('['+beat.speaker+']',beat.text,'')
    }
    if(n.choice){
      text.push('【選擇點】'+n.choice.prompt,'')
      for(const [i,option] of n.choice.options.entries()){
        text.push('選項'+(i+1)+'｜'+option.label,option.detail)
        if(option.when)text.push('可選前情：'+membership(activeOptions.get(n.id+':'+option.id)))
        text.push('選擇後：接 '+nodeLabel(option.next),'')
      }
    }else if(n.next)text.push('【接續】→ '+nodeLabel(n.next),'')
    else text.push('【本路線結局】'+n.title,'可回到前述完整路線索引，比較其他選擇。','')
  }
  const output=text.join('\r\n')
  for(const n of story.nodes){
    if(!output.includes(n.title))throw new Error('Missing node')
    for(const o of n.choice?.options??[])if(!output.includes(o.label)||!output.includes(o.detail))throw new Error('Missing choice')
  }
  const path=resolve(destination,titles[index]+'_正文與分支.txt')
  writeFileSync(path,'\ufeff'+output,'utf8')
  console.log(JSON.stringify({file:path,nodes:story.nodes.length,routes:routes.length,endings:story.nodes.filter(n=>n.ending).length}))
}
