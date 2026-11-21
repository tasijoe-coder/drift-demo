// 紅線千年：通用卡牌引擎（純邏輯，資料驅動）

export type MeterId = string
export type Effect = Partial<Record<MeterId, number>>
export type Pos = 'top' | 'bottom' | 'left' | 'right'

export type Cond = {
  flags?: string[] // 全部都要有
  anyFlags?: string[] // 至少一個
  notFlags?: string[] // 都不能有
  min?: Effect
  max?: Effect
}

export type Outcome = Cond & {
  text: string
  fx?: Effect
  set?: string[]
  unset?: string[]
  next?: string // 強制下一張卡
  karma?: string // 因果簿紀錄
  end?: string // 立即結局
}

export type Card = {
  id: string
  act: number
  fixed?: number // 在該幕第幾張出現（0 起算）
  weight?: number
  req?: Cond
  omen: string // 天意，例如「一陣風」
  text: string
  options: Partial<Record<string, Outcome | Outcome[]>>
}

export type Target = { id: string; name: string; role: string; pos: Pos; glyph: string; color: string }
export type Meter = { id: MeterId; name: string; icon: string; start: number; low?: string; high?: string; color: string }
export type Act = { title: string; draws: number; drift?: Effect; bg?: string }
export type Ending = Cond & { id: string; title: string; rank: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'; text: string[]; legend?: boolean }

export type Life = {
  id: string
  order: number
  era: string
  title: string
  lovers: string
  intro: string[]
  targets: Target[]
  meters: Meter[]
  acts: Act[]
  cards: Card[]
  endings: Ending[]
  finalOrder: string[] // 跑完所有卡後依序檢查的結局
}

export const MAX = 10

export type State = {
  lifeId: string
  rng: number
  act: number
  drawnInAct: number
  meters: Record<MeterId, number>
  flags: string[]
  used: string[]
  queue: string[]
  card: string | null
  karma: string[]
  history: { card: string; target: string }[]
  ending: string | null
  last: { text: string; delta: Effect; target: string } | null
}

// ---------- 亂數 ----------
const rand = (s: State) => {
  let t = (s.rng += 0x6d2b79f5)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const clamp = (v: number) => Math.max(0, Math.min(MAX, v))
const clone = (s: State): State => JSON.parse(JSON.stringify(s))

export const check = (c: Cond | undefined, s: Pick<State, 'flags' | 'meters'>) => {
  if (!c) return true
  if (c.flags && !c.flags.every((f) => s.flags.includes(f))) return false
  if (c.anyFlags && !c.anyFlags.some((f) => s.flags.includes(f))) return false
  if (c.notFlags && c.notFlags.some((f) => s.flags.includes(f))) return false
  if (c.min && Object.entries(c.min).some(([k, v]) => (s.meters[k] ?? 0) < (v ?? 0))) return false
  if (c.max && Object.entries(c.max).some(([k, v]) => (s.meters[k] ?? 0) > (v ?? 0))) return false
  return true
}

// ---------- 開始 ----------
export function start(life: Life, seed = Math.floor(Math.random() * 1e9)): State {
  const s: State = {
    lifeId: life.id,
    rng: seed,
    act: 0,
    drawnInAct: 0,
    meters: Object.fromEntries(life.meters.map((m) => [m.id, m.start])),
    flags: [],
    used: [],
    queue: [],
    card: null,
    karma: [],
    history: [],
    ending: null,
    last: null,
  }
  drawNext(life, s)
  return s
}

// ---------- 抽卡 ----------
const drawNext = (life: Life, s: State) => {
  s.card = null
  while (s.queue.length) {
    const id = s.queue.shift()!
    const c = life.cards.find((x) => x.id === id)
    if (c && check(c.req, s)) {
      s.card = id
      return
    }
  }
  for (;;) {
    const act = life.acts[s.act]
    if (!act) {
      finish(life, s)
      return
    }
    if (s.drawnInAct < act.draws) {
      const fixed = life.cards
        .filter((c) => c.act === s.act && c.fixed !== undefined && c.fixed <= s.drawnInAct && !s.used.includes(c.id) && check(c.req, s))
        .sort((a, b) => a.fixed! - b.fixed!)
      // 同一個 fixed 位置可能有多張依條件分流的卡，取第一張；其餘同位置的視為已處理
      if (fixed.length) {
        const pickC = fixed[0]
        life.cards.filter((c) => c.act === s.act && c.fixed === pickC.fixed && c.id !== pickC.id).forEach((c) => s.used.push(c.id))
        s.card = pickC.id
        return
      }
      const pool = life.cards.filter((c) => c.act === s.act && c.fixed === undefined && !s.used.includes(c.id) && check(c.req, s))
      if (pool.length) {
        const total = pool.reduce((a, c) => a + (c.weight ?? 10), 0)
        let r = rand(s) * total
        for (const c of pool) {
          r -= c.weight ?? 10
          if (r <= 0) {
            s.card = c.id
            return
          }
        }
        s.card = pool[pool.length - 1].id
        return
      }
    }
    s.act += 1
    s.drawnInAct = 0
  }
}

export const currentCard = (life: Life, s: State) => (s.card ? life.cards.find((c) => c.id === s.card) ?? null : null)

export const resolveOutcome = (card: Card, target: string, s: Pick<State, 'flags' | 'meters'>): Outcome | null => {
  const o = card.options[target]
  if (!o) return null
  if (Array.isArray(o)) return o.find((x) => check(x, s)) ?? null
  return o
}

/** 預覽：會影響哪些數值（不透露加減） */
export const preview = (life: Life, s: State, target: string): MeterId[] => {
  const c = currentCard(life, s)
  if (!c) return []
  const o = resolveOutcome(c, target, s)
  if (!o) return []
  return Object.entries(o.fx ?? {}).filter(([, v]) => v).map(([k]) => k)
}

// ---------- 做出選擇 ----------
export function choose(life: Life, prev: State, target: string): State {
  const c = currentCard(life, prev)
  if (!c || prev.ending) return prev
  const o = resolveOutcome(c, target, prev)
  if (!o) return prev
  const s = clone(prev)
  s.used.push(c.id)
  s.drawnInAct += 1
  s.history.push({ card: c.id, target })

  const before = { ...s.meters }
  const fx: Effect = { ...(o.fx ?? {}) }
  const drift = life.acts[s.act]?.drift ?? {}
  for (const [k, v] of Object.entries(drift)) fx[k] = (fx[k] ?? 0) + (v ?? 0)
  for (const [k, v] of Object.entries(fx)) s.meters[k] = clamp((s.meters[k] ?? 0) + (v ?? 0))
  o.set?.forEach((f) => !s.flags.includes(f) && s.flags.push(f))
  if (o.unset) s.flags = s.flags.filter((f) => !o.unset!.includes(f))
  if (o.karma) s.karma.push(o.karma)
  if (o.next) s.queue.unshift(o.next)

  const delta: Effect = {}
  for (const k of Object.keys(s.meters)) if (s.meters[k] !== before[k]) delta[k] = s.meters[k] - before[k]
  s.last = { text: o.text, delta, target }

  if (o.end) {
    s.ending = o.end
    s.card = null
    return s
  }
  // 數值爆表或歸零
  for (const m of life.meters) {
    if (m.low && s.meters[m.id] <= 0) {
      s.ending = m.low
      s.card = null
      return s
    }
    if (m.high && s.meters[m.id] >= MAX) {
      s.ending = m.high
      s.card = null
      return s
    }
  }
  drawNext(life, s)
  return s
}

const finish = (life: Life, s: State) => {
  s.card = null
  for (const id of life.finalOrder) {
    const e = life.endings.find((x) => x.id === id)
    if (e && check(e, s)) {
      s.ending = id
      return
    }
  }
  s.ending = life.finalOrder[life.finalOrder.length - 1]
}

export const progress = (life: Life, s: State) => {
  const total = life.acts.reduce((a, x) => a + x.draws, 0)
  const done = life.acts.slice(0, s.act).reduce((a, x) => a + x.draws, 0) + s.drawnInAct
  return { done: Math.min(done, total), total }
}
