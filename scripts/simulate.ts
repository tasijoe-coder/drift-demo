// 平衡模擬：npm run sim [-- 輪數]
import * as F from '../src/engine/fate'
import { LIVES } from '../src/data/lives'

const N = Number(process.argv[2] ?? 3000)
let r = 987654
const rand = () => ((r = (r * 1103515245 + 12345) % 2147483648) / 2147483648)

type Policy = 'random' | 'cautious' | 'reader' | 'veteran'

// cautious：只看得到「會影響哪些數值」（跟玩家介面一樣），避開會動到危險數值的選項
// veteran：有前世記憶，看得到結果，選最安全的
function pickTarget(life: F.Life, s: F.State, p: Policy): string {
  const card = F.currentCard(life, s)!
  const opts = life.targets.map((t) => t.id).filter((id) => F.resolveOutcome(card, id, s))
  if (p === 'random') return opts[Math.floor(rand() * opts.length)]
  if (p === 'cautious') {
    const danger = (id: string) => {
      const m = F.preview(life, s, id)
      let d = rand() * 0.8
      for (const k of m) {
        const v = s.meters[k]
        if (k === 'bond' && (v <= 2 || v >= 8)) d += 1
        if (k !== 'bond' && v >= 7) d += 1
      }
      return d
    }
    return opts.sort((a, b) => danger(a) - danger(b))[0]
  }
  const reader = p === 'reader'
  const score = (id: string) => {
    const o = F.resolveOutcome(card, id, s)!
    const m = { ...s.meters }
    for (const [k, v] of Object.entries(o.fx ?? {})) m[k] = Math.max(0, Math.min(10, m[k] + (v ?? 0)))
    let sc = 0
    sc -= Math.abs(m.bond - 6) * 1.2
    sc -= m.rule * 0.6 + (m.rule >= 9 ? 50 : 0)
    sc -= m.jie * 0.8 + (m.jie >= 9 ? 50 : 0)
    if (m.bond <= 0 || m.bond >= 10) sc -= 100
    if (reader) return sc + rand() * 3 // 讀文字能猜到加減，但看不出伏筆
    if (o.set?.some((f) => ['home', 'safe', 'sent_home', 'escaped', 'unlisted', 'alive', 'repaid', 'li_soft', 'bribed', 'early', 'hide_plan'].includes(f))) sc += 6
    if (o.set?.includes('substitute')) sc -= 3
    if (o.set?.includes('zhang_claim') || o.set?.includes('self_sacrifice')) sc -= 8
    return sc + rand() * 0.5
  }
  return opts.sort((a, b) => score(b) - score(a))[0]
}

for (const life of LIVES) {
  console.log(`\n=== ${life.title}（${life.lovers}）`)
  for (const p of ['random', 'cautious', 'reader', 'veteran'] as Policy[]) {
    const res: Record<string, number> = {}
    let cards = 0
    for (let i = 0; i < N; i++) {
      let s = F.start(life, Math.floor(rand() * 1e9))
      for (let g = 0; g < 100 && !s.ending; g++) s = F.choose(life, s, pickTarget(life, s, p))
      res[s.ending!] = (res[s.ending!] ?? 0) + 1
      cards += s.history.length
    }
    const pct = (v: number) => ((v / N) * 100).toFixed(1) + '%'
    console.log(`[${p}] 平均卡數 ${(cards / N).toFixed(1)}  ` + Object.entries(res).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v)}`).join(' | '))
  }
  const reach = new Set<string>()
  for (let i = 0; i < 20000; i++) {
    let s = F.start(life, i)
    for (let g = 0; g < 100 && !s.ending; g++) s = F.choose(life, s, pickTarget(life, s, i % 2 ? 'random' : 'veteran'))
    reach.add(s.ending!)
  }
  const missing = life.endings.map((e) => e.id).filter((id) => !reach.has(id))
  console.log('到不了的結局：', missing.length ? missing.join(', ') : '無')
}
