// 平衡模擬：npm run sim [-- 輪數]
import * as G from '../src/engine/game'
import type { GameState, LocationId, Truth } from '../src/engine/game'

type Policy = 'naive' | 'careful' | 'detective' | 'selfish'
const N = Number(process.argv[2] ?? 3000)
let r = 12345
const rand = () => ((r = (r * 1103515245 + 12345) % 2147483648) / 2147483648)
const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)]

const noiseGuess: Record<string, Truth> = {}
const readClue = (id: string): Truth => {
  const c = G.clueById(id)!
  // 真實玩家不一定讀得懂線索：75% 讀對，其餘當成別的真相；雜訊線索隨機解讀
  if (c.truth !== 'noise' && (noiseGuess['ok:' + id] ??= rand() < 0.75 ? c.truth : 'x') !== 'x') return c.truth
  return (noiseGuess[id] ??= pick(['hoarder', 'liar', 'injured', 'innocent'] as Truth[]))
}

function chooseLoc(s: GameState, p: Policy): [LocationId, boolean] {
  const ok = (l: LocationId) => G.checkAction(s, l).ok
  const tog = (l: LocationId) => G.checkAction(s, l).togetherOk
  if (p === 'naive') {
    const opts = (['shore', 'forest', 'wreck', 'reef', 'signal', 'rest'] as LocationId[]).filter(ok)
    const l = pick(opts)
    return [l, rand() < 0.5]
  }
  let l: LocationId
  const needSignal = G.SIGNAL_GOAL - s.signal
  const daysLeft = G.DAYS - s.day + 1
  if (s.you.stamina <= 2 || s.you.stress >= 7) l = 'rest'
  else if (s.you.water + s.haul.water <= 1) l = 'shore'
  else if (s.you.food + s.haul.food <= 1) l = s.you.hp >= 6 ? 'reef' : 'forest'
  else if (needSignal > 0 && s.wood >= 1 && (daysLeft <= needSignal + 3 || s.wood >= 2)) l = 'signal'
  else if (needSignal > s.wood) l = rand() < 0.5 ? 'forest' : 'wreck'
  else l = pick(['shore', 'forest', 'reef'] as LocationId[])
  if (s.tip && s.tip.location !== 'wreck' && rand() < 0.3 && ok(s.tip.location)) l = s.tip.location
  if (!ok(l)) l = (['shore', 'forest', 'rest'] as LocationId[]).find(ok) ?? 'rest'
  return [l, tog(l)]
}

function play(p: Policy) {
  for (const k of Object.keys(noiseGuess)) delete noiseGuess[k]
  let s = G.newGame(Math.floor(rand() * 1e9))
  for (let guard = 0; guard < 500 && s.stage !== 'ended'; guard++) {
    if (s.stage === 'day') {
      const [l, t] = chooseLoc(s, p)
      const next = G.doAction(s, l, t)
      if (next === s) s = G.doAction(s, 'rest', false)
      else s = next
    } else if (s.stage === 'event') s = G.chooseEvent(s, p === 'naive' ? Math.floor(rand() * 2) : 0)
    else if (s.stage === 'evening') {
      if ((p === 'detective' || (p === 'careful' && s.day >= 9)) && G.canConfront(s)) {
        const counts: Record<string, number> = {}
        G.visibleClues(s).forEach((c) => (counts[readClue(c.id)] = (counts[readClue(c.id)] ?? 0) + 1))
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
        const [top, second] = [sorted[0], sorted[1]]
        if (top && top[1] >= (p === 'careful' ? 2 : 3) && (!second || top[1] - second[1] >= 2)) s = G.confront(s, top[0] as Truth)
        else if (p === 'detective' && s.day >= 11 && top) s = G.confront(s, top[0] as Truth)
      }
      const sp = p === 'naive' ? pick(['fair', 'take', 'give'] as const) : p === 'selfish' ? (G.canHide(s) && rand() < 0.5 ? 'hide' : 'take') : s.him.trust <= 3 ? 'give' : 'fair'
      s = G.split(s, sp)
    } else if (s.stage === 'night') {
      let a: G.NightAction = 'sleep'
      if (p === 'naive') a = pick(['sleep', 'watch', 'search', 'talk'])
      else if (p === 'detective') a = s.you.stamina <= 3 ? 'sleep' : pick(['watch', 'talk', 'search', 'sleep'])
      else if (p === 'selfish') a = rand() < 0.4 ? 'search' : 'sleep'
      else a = s.him.trust <= 4 ? 'talk' : rand() < 0.3 ? 'watch' : 'sleep'
      s = G.night(s, a)
    } else if (s.stage === 'finale') {
      const opts = G.finaleOptions(s)
      s = G.finale(s, p === 'selfish' && opts.includes('alone') ? 'alone' : opts[0])
    }
  }
  return s
}

const policies: Policy[] = ['naive', 'careful', 'detective', 'selfish']
for (const p of policies) {
  const res: Record<string, number> = {}
  let rescued = 0, conf = 0, confRight = 0, clues = 0, day = 0, sig = 0, sup = 0, hp = 0
  for (let i = 0; i < N; i++) {
    const s = play(p)
    res[s.ending!] = (res[s.ending!] ?? 0) + 1
    if (['truth_together', 'together', 'liar_ship', 'hoarder_bag', 'injured_deck', 'left_innocent', 'left_guilty', 'empty_fire'].includes(s.ending!) || (s.ending === 'alone_survivor' && s.signal >= G.SIGNAL_GOAL)) rescued++
    if (s.confronted) { conf++; if (s.confronted.correct) confRight++ }
    clues += G.visibleClues(s).length
    day += s.day
    sig += s.signal; sup += s.you.water + s.you.food; hp += s.you.hp
  }
  const pct = (v: number) => ((v / N) * 100).toFixed(1) + '%'
  console.log(`\n[${p}] 獲救 ${pct(rescued)}  攤牌 ${pct(conf)}（猜對 ${conf ? ((confRight / conf) * 100).toFixed(0) : 0}%）  平均線索 ${(clues / N).toFixed(1)}  平均天數 ${(day / N).toFixed(1)}  訊號 ${(sig / N).toFixed(1)}/${G.SIGNAL_GOAL}  剩餘補給 ${(sup / N).toFixed(1)}  HP ${(hp / N).toFixed(1)}`)
  console.log(Object.entries(res).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v)}`).join(' | '))
}
