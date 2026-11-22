export type Point = [number, number]
export type Frame = {
  jx: number; jy: number; jl: number; jh: number
  jfx: number; jfy: number; jbx: number; jby: number; jug: number
  yx: number; yy: number; yl: number; yh: number
  yfx: number; yfy: number; ybx: number; yby: number; cup: number
  drop: number; spill: number; blood: number; light: number; fade: number
}
export const rest: Frame = {
  jx:190,jy:110,jl:-2,jh:1,jfx:308,jfy:232,jbx:331,jby:202,jug:0,
  yx:510,yy:110,yl:2,yh:-2,yfx:354,yfy:225,ybx:422,yby:269,cup:0,
  drop:0,spill:0,blood:0,light:1,fade:1,
}
type Key = { at: number; state: Frame }
export type Performance = { duration: number; keys: Key[]; label: string }
const frame = (changes: Partial<Frame>): Frame => ({ ...rest, ...changes })
const key = (at: number, changes: Partial<Frame>): Key => ({ at, state: frame(changes) })

// Each beat has a small performance, including anticipation and a held final pose.
// These are presentation cues only; no game rules, RNG or save-state changes.
export function performance(node: string, beat: number, pose: string): Performance {
  if (node === 'heaven-banquet') {
    const scenes: Performance[] = [
      { duration:2300,label:'捧壺奉盞，入席站定',keys:[key(0,{jx:164,yx:540}),key(.35,{jx:179,jy:108,yx:524,yy:112}),key(.7,{}),key(1,{})] },
      { duration:2200,label:'金童上前奉酒，玉女接住酒盞',keys:[key(0,{}),key(.5,{jh:7,yh:-7,jug:8,jbx:340,jby:195}),key(1,{jh:3,yh:-4,jug:8,jbx:340,jby:195})] },
      { duration:2400,label:'玉女示意杯沿缺口，轉腕，金童低頭看杯',keys:[key(0,{}),key(.4,{yh:-12,cup:-22,yfx:350,yfy:218,jh:12,jfx:336,jfy:221}),key(.72,{yh:-8,cup:21,yfx:352,yfy:220,jh:14,jfx:336,jfy:221}),key(1,{yh:-8,cup:21,yfx:352,yfy:220,jh:14,jfx:336,jfy:221})] },
      { duration:2500,label:'金童傾壺，照顧她受傷的手，玉女低頭',keys:[key(0,{cup:15,jfx:336,jfy:221}),key(.35,{jug:24,jbx:340,jby:196,spill:.8,yh:-7,jh:5,cup:10}),key(.65,{jug:18,jbx:340,jby:196,spill:.5,yh:-12,jh:7}),key(1,{jug:10,jbx:337,jby:202,yh:-8,jh:4})] },
      { duration:2400,label:'察覺殿上目光，急退碰杯，杯墜地碎裂',keys:[key(0,{jug:10}),key(.22,{jx:180,jl:5,jh:-10,jfx:350,jfy:218,light:.83}),key(.43,{jx:176,jl:7,jh:-13,jfx:350,jfy:221,drop:.02,yh:-3,light:.83}),key(.79,{jx:176,jl:10,jfx:350,jfy:266,drop:1,yfx:389,yfy:228,light:.83}),key(1,{jx:176,jl:10,jfx:350,jfy:266,drop:1,yfx:389,yfy:228,light:.83})] },
      { duration:2100,label:'金童俯身擋碎片，玉女驚退再回身',keys:[key(0,{jx:176,jl:10,jfx:350,jfy:266,drop:1,yfx:389,yfy:228}),key(.35,{jx:184,jl:23,jh:14,jfx:346,jfy:302,drop:1,yx:522,yh:-10,yfx:395,yfy:223}),key(.78,{jx:184,jl:15,jh:10,jfx:342,jfy:270,drop:1,yx:484,yl:-5,yh:8,yfx:347,yfy:270,blood:1}),key(1,{jx:184,jl:15,jh:10,jfx:342,jfy:270,drop:1,yx:484,yl:-5,yh:8,yfx:347,yfy:270,blood:1})] },
      { duration:2400,label:'玉女伸手按傷，金童想收手，兩手再次相握',keys:[key(0,{jx:184,jl:15,jh:10,jfx:342,jfy:270,drop:1,yx:484,yl:-5,yh:8,yfx:347,yfy:270,blood:1}),key(.32,{jx:184,jl:10,jh:8,jfx:329,jfy:265,drop:1,yx:480,yl:-7,yh:3,yfx:335,yfy:265,blood:1}),key(.7,{jx:184,jl:8,jh:4,jfx:338,jfy:265,drop:1,yx:480,yl:-7,yh:2,yfx:339,yfy:265,blood:1}),key(1,{jx:184,jl:8,jh:4,jfx:338,jfy:265,drop:1,yx:480,yl:-7,yh:2,yfx:339,yfy:265,blood:1})] },
      { duration:1700,label:'玉帝畫外責問，燈色轉冷，二人僵住',keys:[key(0,{jx:184,jl:8,jfx:338,jfy:265,drop:1,yx:480,yl:-7,yfx:339,yfy:265,blood:1}),key(.4,{jx:184,jl:7,jh:-13,jfx:338,jfy:265,drop:1,yx:480,yl:-3,yh:-12,yfx:339,yfy:265,blood:1,light:.65}),key(1,{jx:184,jl:7,jh:-13,jfx:338,jfy:265,drop:1,yx:480,yl:-3,yh:-12,yfx:339,yfy:265,blood:1,light:.65})] },
    ]
    return scenes[Math.min(beat,scenes.length-1)]
  }
  const hidden = pose === 'book' || pose === 'vanish'
  return {duration:1500,label:hidden?'人物退場，姻緣簿展開':'二人在殿前聽判',keys:[key(0,{drop:1}),key(1,{
    drop:1,fade:hidden?0:1,jx:pose==='parting'?166:190,yx:pose==='parting'?538:510,
    jh:pose==='face'?-10:9,yh:pose==='parting'?4:-8,jl:pose==='kneel'?20:5,
    light:pose==='throne'?.7:1,jfx:316,jfy:258,yfx:385,yfy:258,
  })]}
}

export function samplePerformance(p: Performance, progress: number): Frame {
  const t=Math.max(0,Math.min(1,progress))
  const index=p.keys.findIndex((item)=>item.at>=t)
  if(index<1) return {...p.keys[Math.max(0,index)].state}
  const a=p.keys[index-1],b=p.keys[index]
  const raw=(t-a.at)/(b.at-a.at)
  const eased=raw*raw*(3-2*raw)
  const result={...rest}
  for(const name of Object.keys(rest) as (keyof Frame)[]) result[name]=a.state[name]+(b.state[name]-a.state[name])*eased
  return result
}

export function solveArm(target: Point, root: Point, flip: number, lean: number): { upper: number; lower: number } {
  const r=-lean*Math.PI/180
  const x=(target[0]-root[0])*flip-66,y=target[1]-root[1]-180
  const localX=x*Math.cos(r)-y*Math.sin(r)+66
  const localY=x*Math.sin(r)+y*Math.cos(r)+180
  const dx=localX-66,dy=localY-88
  const a=52,b=50,d=Math.max(3,Math.min(a+b-.01,Math.hypot(dx,dy)))
  const elbow=Math.acos(Math.max(-1,Math.min(1,(d*d-a*a-b*b)/(2*a*b))))
  const shoulder=Math.atan2(dy,dx)-Math.atan2(b*Math.sin(elbow),a+b*Math.cos(elbow))
  return {upper:shoulder*180/Math.PI,lower:elbow*180/Math.PI}
}
