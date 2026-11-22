import { useEffect, useRef } from 'react'
import { performance, rest, samplePerformance, solveArm, type Frame } from './celestial_rig'
import './celestial-puppets.css'

type Piece = { crop: [number,number,number,number]; box: [number,number,number,number] }
const artwork = {
  jin:{url:'/art/jintong-rig-v1.png',
    body:{crop:[145,24,243,484],box:[24,61,93,185]},
    head:{crop:[633,123,241,302],box:[40,-3,53,67]},
    upper:{crop:[1091,213,374,167],box:[-7,-11,64,29]},
    rear:{crop:[576,714,378,171],box:[-7,-11,64,29]},
    fore:{crop:[103,745,319,79],box:[-7,-7,61,15]},
    prop:{crop:[1163,618,244,317],box:[-12,-36,30,39]}},
  yu:{url:'/art/yunv-rig-v1.png',
    body:{crop:[130,14,274,498],box:[19,61,102,185]},
    head:{crop:[684,142,186,248],box:[40,-5,50,67]},
    upper:{crop:[1141,204,287,163],box:[-7,-11,64,36]},
    rear:{crop:[631,713,288,164],box:[-7,-11,64,36]},
    fore:{crop:[126,735,283,95],box:[-7,-8,61,20]},
    prop:{crop:[1192,720,167,120],box:[-14,-18,28,20]}},
} satisfies Record<string,{url:string;body:Piece;head:Piece;upper:Piece;rear:Piece;fore:Piece;prop:Piece}>

function Art({who,piece}:{who:'jin'|'yu';piece:'body'|'head'|'upper'|'rear'|'fore'|'prop'}) {
  const rig=artwork[who],part=rig[piece]
  return <svg x={part.box[0]} y={part.box[1]} width={part.box[2]} height={part.box[3]} viewBox={part.crop.join(' ')} overflow="hidden"><image href={rig.url} width="1536" height="1024" /></svg>
}

function Arm({who,rear=false}:{who:'jin'|'yu';rear?:boolean}) {
  const name=`${who}-${rear?'back':'front'}`
  const prop=(who==='jin'&&rear)||(who==='yu'&&!rear)
  return <g transform="translate(66 88)">
    <g data-joint={`${name}-upper`}>
      <Art who={who} piece={rear?'rear':'upper'} />
      <circle cx="0" cy="0" r="2.2" fill="#bd985f" />
      <g transform="translate(52 0)"><g data-joint={`${name}-lower`}>
        <Art who={who} piece="fore" /><circle cx="0" cy="0" r="1.8" fill="#bd985f" />
        <g transform="translate(50 0)">
          {prop&&<g data-joint={`${who}-prop`}><Art who={who} piece="prop" /></g>}
          <line className="rig-control-rod" x1="-3" y1="0" x2="-16" y2="183" />
        </g>
      </g></g>
    </g>
  </g>
}

function Figure({who}:{who:'jin'|'yu'}) {
  return <g data-joint={`${who}-root`}>
    <Arm who={who} rear />
    <path d="M62 55 72 55 74 88 64 88Z" fill="#16130c" />
    <Art who={who} piece="body" />
    <g data-joint={`${who}-head`}><Art who={who} piece="head" /></g>
    <Arm who={who} />
  </g>
}

export function CelestialPuppets({node,beat,pose,paused}:{node:string;beat:number;pose:string;paused:boolean}) {
  const svg=useRef<SVGSVGElement>(null)
  const last=useRef<Frame>({...rest})

  useEffect(()=>{
    const root=svg.current
    if(!root)return
    const p=performance(node,beat,pose)
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const joints=new Map([...root.querySelectorAll<SVGGElement>('[data-joint]')].map(el=>[el.dataset.joint!,el]))
    const transform=(name:string,value:string)=>joints.get(name)?.setAttribute('transform',value)
    const opacity=(name:string,value:number)=>joints.get(name)?.setAttribute('opacity',String(value))
    const apply=(s:Frame)=>{
      last.current=s
      root.style.setProperty('--rig-light',String(s.light))
      for(const who of ['jin','yu'] as const){
        const j=who==='jin',x=j?s.jx:s.yx,y=j?s.jy:s.yy,lean=j?s.jl:s.yl,flip=j?1:-1
        transform(`${who}-root`,`translate(${x} ${y}) scale(${flip} 1) rotate(${lean} 66 180)`)
        transform(`${who}-head`,`rotate(${j?s.jh:s.yh} 66 61)`)
        opacity(`${who}-root`,s.fade)
        for(const arm of ['front','back'] as const){
          const front=arm==='front'
          const target:[number,number]=j?(front?[s.jfx,s.jfy]:[s.jbx,s.jby]):(front?[s.yfx,s.yfy]:[s.ybx,s.yby])
          const angles=solveArm(target,[x,y],flip,lean)
          transform(`${who}-${arm}-upper`,`rotate(${angles.upper})`)
          transform(`${who}-${arm}-lower`,`rotate(${angles.lower})`)
        }
      }
      transform('jin-prop',`rotate(${s.jug})`)
      transform('yu-prop',`rotate(${s.cup})`)
      opacity('yu-prop',s.drop>0?0:s.fade)
      opacity('jin-prop',node==='heaven-thread'?0:s.fade)
      const drop=Math.max(0,Math.min(1,s.drop)),hit=drop>.97
      transform('falling-cup',`translate(${354-27*drop} ${225+133*drop*drop}) rotate(${drop*155})`)
      opacity('falling-cup',drop>0&&!hit?s.fade:0)
      opacity('shards',hit&&node!=='heaven-thread'?s.fade:0)
      opacity('spill',s.spill*s.fade)
      transform('blood',`translate(${s.jfx} ${s.jfy+5})`)
      opacity('blood',s.blood*s.fade)
    }
    if(reduce){apply(samplePerformance(p,1));return}
    if(paused)return
    let request=0,start:number|undefined
    const from={...last.current}
    const draw=(now:number)=>{
      start??=now
      const progress=Math.min(1,(now-start)/p.duration)
      const s=samplePerformance(p,progress)
      // Blend into a new cue so manual advances do not teleport the puppet.
      const enter=Math.min(1,progress/.15)
      const blended={...s}
      for(const name of Object.keys(rest) as (keyof Frame)[])blended[name]=from[name]+(s[name]-from[name])*enter
      apply(blended)
      if(progress<1)request=requestAnimationFrame(draw)
    }
    request=requestAnimationFrame(draw)
    return()=>cancelAnimationFrame(request)
  },[node,beat,pose,paused])

  return <svg ref={svg} className="celestial-rig" viewBox="80 40 560 350" aria-hidden="true" data-performance={performance(node,beat,pose).label}>
    <defs>
      <clipPath id="cup-shard-a"><path d="M-16-20 0-20-1 3-16 3Z" /></clipPath>
      <clipPath id="cup-shard-b"><path d="M0-20 16-20 16 3 0-2Z" /></clipPath>
      <clipPath id="cup-shard-c"><path d="M-14-6 14-6 14 6-14 6Z" /></clipPath>
    </defs>
    <g className="rig-ink"><Figure who="jin" /><Figure who="yu" />
      <g data-joint="falling-cup" opacity="0"><Art who="yu" piece="prop" /></g>
      <g data-joint="shards" opacity="0">
        <g transform="translate(308 364) rotate(-43)" clipPath="url(#cup-shard-a)"><Art who="yu" piece="prop" /></g>
        <g transform="translate(340 363) rotate(61)" clipPath="url(#cup-shard-b)"><Art who="yu" piece="prop" /></g>
        <g transform="translate(327 367) rotate(7)" clipPath="url(#cup-shard-c)"><Art who="yu" piece="prop" /></g>
      </g>
    </g>
    <g data-joint="spill" opacity="0"><path d="M359 175 Q363 196 354 212" fill="none" stroke="#aa793b" strokeWidth="1.2" /></g>
    <g data-joint="blood" opacity="0"><ellipse rx="2.4" ry="3.8" fill="#9c3329" /></g>
  </svg>
}
