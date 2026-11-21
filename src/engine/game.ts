import content from '../data/content.json'

// ---------- 型別 ----------
export type Truth = 'hoarder' | 'liar' | 'injured' | 'innocent'
export type LocationId = 'shore' | 'forest' | 'wreck' | 'reef' | 'signal' | 'rest'
export type NightAction = 'sleep' | 'watch' | 'search' | 'talk'
export type SplitChoice = 'fair' | 'take' | 'give' | 'hide'
export type Stage = 'day' | 'event' | 'evening' | 'night' | 'finale' | 'ended'
export type EndingId = keyof typeof content.endings
export type ClueSource = 'watch' | 'search' | 'talk' | 'day'

export type Effect = Partial<Record<'water' | 'food' | 'wood' | 'hp' | 'stamina' | 'stress' | 'trust' | 'signal', number>>

export type EventChoice = {
  text: string
  effect: Effect
  result: string
  risk?: { chance: number; effect: Effect; text: string }
  clue?: 'true' | 'noise'
  special?: string
  hidden?: boolean
}

export type GameEvent = {
  id: string
  location: string
  title: string
  text: string
  bg?: string
  minDay?: number
  together?: boolean
  choices: EventChoice[]
}

export type Clue = { id: string; truth: Truth | 'noise'; source: ClueSource; text: string; note: string }

export type Person = { hp: number; stamina: number; stress: number; water: number; food: number }

export type Him = {
  hp: number
  water: number
  food: number
  trust: number
  present: boolean
  alive: boolean
  stash: number
  treated: boolean
}

export type Haul = { water: number; food: number; mine: number }

export type GameState = {
  seed: number
  rng: number
  day: number
  actionsLeft: number
  stage: Stage
  truth: Truth
  you: Person
  him: Him
  wood: number
  signal: number
  haul: Haul
  hidCount: number
  clues: string[]
  confronted: null | { guess: Truth; correct: boolean }
  tip: { location: LocationId; honest: boolean } | null
  pendingEvent: { id: string; together: boolean } | null
  lastTogether: boolean
  gaveToday: boolean
  log: { title: string; lines: string[]; bg?: string }
  ending: EndingId | null
  causeOfDeath?: string
  stats: { together: number; apart: number; taken: number; given: number; hidden: number; searched: number; caught: number }
}

// ---------- 常數 ----------
export const DAYS = 14
export const ACTIONS_PER_DAY = 2
export const SIGNAL_GOAL = 10
export const MAX = 10

const clues = content.clues as Clue[]
const events = content.events as GameEvent[]
export const clueById = (id: string) => clues.find((c) => c.id === id)
export const eventById = (id: string) => events.find((e) => e.id === id)

// ---------- 亂數（可重現） ----------
const nextRand = (s: GameState) => {
  let t = (s.rng += 0x6d2b79f5)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const chance = (s: GameState, p: number) => nextRand(s) < p
const randInt = (s: GameState, min: number, max: number) => min + Math.floor(nextRand(s) * (max - min + 1))
const pick = <T,>(s: GameState, arr: T[]): T => arr[Math.floor(nextRand(s) * arr.length)]

const clamp = (v: number, lo = 0, hi = MAX) => Math.max(lo, Math.min(hi, v))
const clone = (s: GameState): GameState => JSON.parse(JSON.stringify(s))

// ---------- 建立新的一輪 ----------
export function newGame(seed = Math.floor(Math.random() * 1e9)): GameState {
  const s: GameState = {
    seed,
    rng: seed,
    day: 1,
    actionsLeft: ACTIONS_PER_DAY,
    stage: 'day',
    truth: 'innocent',
    you: { hp: 10, stamina: 8, stress: 2, water: 2, food: 2 },
    him: { hp: 10, water: 2, food: 2, trust: 5, present: true, alive: true, stash: 0, treated: false },
    wood: 0,
    signal: 0,
    haul: { water: 0, food: 0, mine: 0 },
    hidCount: 0,
    clues: [],
    confronted: null,
    tip: null,
    pendingEvent: null,
    lastTogether: false,
    gaveToday: false,
    log: { title: '第 1 天', lines: [] },
    ending: null,
    stats: { together: 0, apart: 0, taken: 0, given: 0, hidden: 0, searched: 0, caught: 0 },
  }
  s.truth = pick(s, ['hoarder', 'liar', 'injured', 'innocent'] as Truth[])
  if (s.truth === 'injured') s.him.hp = 6
  if (s.truth === 'hoarder') s.him.stash = 1
  rollTip(s)
  s.log = { title: '第 1 天', lines: ['你們在殘骸旁邊搭了一個簡陋的營地。火堆還很小。', tipLine(s)], bg: '/bg_phase2.jpg' }
  return s
}

// ---------- 小工具 ----------
export const himCanAct = (s: GameState) => s.him.present && s.him.alive
const resolved = (s: GameState) => !!s.confronted?.correct

const rollTip = (s: GameState) => {
  if (!himCanAct(s)) {
    s.tip = null
    return
  }
  const location = pick(s, ['shore', 'forest', 'wreck', 'reef'] as LocationId[])
  const honest = s.truth !== 'liar' || resolved(s) || chance(s, 0.35)
  s.tip = { location, honest }
}

export const tipLine = (s: GameState) => (s.tip ? (content.tips as Record<string, string>)[s.tip.location] : '')

export const moodLine = (s: GameState) => {
  if (!s.him.alive) return '他已經不在了。'
  if (!s.him.present) return '他離開了營地。'
  return content.mood.find((m) => s.him.trust >= m.min)!.text
}

const addClue = (s: GameState, source: ClueSource | 'any', kind: 'true' | 'noise'): Clue | null => {
  const truthTag = kind === 'noise' ? 'noise' : s.truth
  const pool = clues.filter(
    (c) => c.truth === truthTag && (source === 'any' || c.source === source || (source === 'watch' && c.source === 'day')) && !s.clues.includes(c.id),
  )
  const fallback = clues.filter((c) => c.truth === truthTag && !s.clues.includes(c.id))
  const chosen = pool.length ? pick(s, pool) : fallback.length ? pick(s, fallback) : null
  if (chosen) s.clues.push(chosen.id)
  return chosen
}

const addSpecificClue = (s: GameState, id: string) => {
  if (!s.clues.includes(id)) s.clues.push(id)
  return clueById(id)!
}

const applyEffect = (s: GameState, e: Effect, toHaul: boolean) => {
  if (toHaul) {
    s.haul.water = Math.max(0, s.haul.water + (e.water ?? 0))
    s.haul.food = Math.max(0, s.haul.food + (e.food ?? 0))
  } else {
    s.you.water = Math.max(0, s.you.water + (e.water ?? 0))
    s.you.food = Math.max(0, s.you.food + (e.food ?? 0))
  }
  s.wood = Math.max(0, s.wood + (e.wood ?? 0))
  s.signal = clamp(s.signal + (e.signal ?? 0), 0, SIGNAL_GOAL)
  s.you.hp = clamp(s.you.hp + (e.hp ?? 0))
  s.you.stamina = clamp(s.you.stamina + (e.stamina ?? 0))
  s.you.stress = clamp(s.you.stress + (e.stress ?? 0))
  if (himCanAct(s)) s.him.trust = clamp(s.him.trust + (e.trust ?? 0))
}

// ---------- 白天：地點行動 ----------
export type ActionCheck = { ok: boolean; reason?: string; togetherOk: boolean; togetherReason?: string }

export function checkAction(s: GameState, loc: LocationId): ActionCheck {
  const cost = (content.locations as Record<string, { cost: number }>)[loc].cost
  let ok = true
  let reason: string | undefined
  if (s.actionsLeft <= 0) [ok, reason] = [false, '今天已經沒有力氣再出去了。']
  else if (s.you.stamina < cost) [ok, reason] = [false, '體力不夠。']
  else if (loc === 'signal' && s.wood <= 0) [ok, reason] = [false, '沒有木頭。先去樹林或殘骸找。']
  else if (loc === 'signal' && s.signal >= SIGNAL_GOAL) [ok, reason] = [false, '訊號火堆已經搭好了。']

  let togetherOk = true
  let togetherReason: string | undefined
  if (!himCanAct(s)) [togetherOk, togetherReason] = [false, '只剩你一個人。']
  else if (loc === 'rest') [togetherOk, togetherReason] = [false, '']
  else if (s.him.trust < 3) [togetherOk, togetherReason] = [false, '他不想跟你走。']
  return { ok, reason, togetherOk, togetherReason }
}

export function doAction(prev: GameState, loc: LocationId, wantTogether: boolean): GameState {
  const s = clone(prev)
  const check = checkAction(s, loc)
  if (!check.ok || s.stage !== 'day') return prev
  const locInfo = (content.locations as Record<string, { name: string; cost: number; bg: string }>)[loc]
  let together = wantTogether && check.togetherOk
  const lines: string[] = []

  // 受傷的人拒絕危險地點
  if (together && s.truth === 'injured' && !s.him.treated && (loc === 'reef' || loc === 'wreck')) {
    together = false
    const c = addSpecificClue(s, 'inj_refuse')
    lines.push(c.text)
  }

  s.actionsLeft -= 1
  s.you.stamina = clamp(s.you.stamina - locInfo.cost)
  s.lastTogether = together
  if (loc !== 'rest') {
    if (together) s.stats.together += 1
    else s.stats.apart += 1
  }

  const tipHere = s.tip && s.tip.location === loc
  const tipBonus = tipHere ? (s.tip!.honest ? 1 : -1) : 0
  const helper = together && s.him.hp >= 4 ? 1 : 0
  let riskMult = together ? 0.5 : 1
  if (tipHere && !s.tip!.honest) riskMult += 0.5

  const got: Effect = {}
  const hurt = (p: number, dmg: number, text: string) => {
    if (chance(s, p * riskMult)) {
      s.you.hp = clamp(s.you.hp - dmg)
      s.you.stress = clamp(s.you.stress + 1)
      lines.push(text)
    }
  }

  switch (loc) {
    case 'shore':
      got.water = Math.max(0, randInt(s, 0, 2) + helper + tipBonus)
      got.food = chance(s, 0.2) ? 1 : 0
      lines.push(got.water ? '你在凹石裡找到積下來的雨水。' : '凹石是乾的。')
      break
    case 'forest':
      got.food = Math.max(0, randInt(s, 0, 2) + helper + tipBonus)
      got.wood = 1 + (helper && chance(s, 0.5) ? 1 : 0)
      lines.push('你帶回一些果子和能燒的木頭。')
      hurt(0.1, 1, '你被藤蔓絆倒，膝蓋撞在石頭上。')
      break
    case 'wreck': {
      const r = nextRand(s)
      if (r < 0.45) {
        got.wood = 1 + helper + Math.max(0, tipBonus)
        lines.push('你從機艙拆下幾片還能燒的木板。')
      } else if (r < 0.8) {
        got.water = 1 + Math.max(0, tipBonus)
        got.food = 1 + helper
        got.wood = 1
        lines.push('你在座椅底下翻到一點補給。')
      } else {
        got.wood = 1
        const c = addClue(s, 'any', chance(s, 0.6) ? 'true' : 'noise')
        lines.push('殘骸裡大多是空的。')
        if (c) lines.push('不過你注意到一件事：' + c.text)
      }
      hurt(0.25, 2, '一片翹起的金屬割開了你的小腿。')
      break
    }
    case 'reef':
      got.food = Math.max(0, randInt(s, 1, 3) + helper + tipBonus)
      lines.push(got.food >= 3 ? '退潮的礁岩上滿是貝類。' : '礁岩上能撿的不多。')
      hurt(0.35, 2, '你在濕滑的礁石上摔倒，手掌和膝蓋都破了。')
      break
    case 'signal': {
      const use = Math.min(s.wood, together ? 2 : 1)
      s.wood -= use
      s.signal = clamp(s.signal + use, 0, SIGNAL_GOAL)
      lines.push(together ? '你們一起把木頭往上疊，火堆又高了一截。' : '你一個人把木頭架上去。')
      break
    }
    case 'rest':
      s.you.stamina = clamp(s.you.stamina + 4)
      s.you.stress = clamp(s.you.stress - 2)
      lines.push('你在帆布下躺了一陣子，把呼吸放慢。')
      break
  }

  if (tipHere && loc !== 'signal' && loc !== 'rest') {
    if (s.tip!.honest) lines.push('他說的沒錯。')
    else {
      lines.push('跟他說的完全不一樣。')
      if (s.truth === 'liar') {
        const c = addClue(s, 'any', 'true')
        if (c) lines.push(c.text)
      }
    }
  }

  // 收穫：自己找到的，記錄為可以偷藏的部分
  s.haul.water += got.water ?? 0
  s.haul.food += got.food ?? 0
  s.wood += got.wood ?? 0
  if (!together) s.haul.mine += (got.water ?? 0) + (got.food ?? 0)

  // 分頭行動時，他自己的收穫
  if (!together && himCanAct(s) && loc !== 'signal') {
    const find = s.him.hp >= 5 ? randInt(s, 0, 2) : randInt(s, 0, 1)
    let report = find
    if (s.truth === 'hoarder' && !resolved(s) && find > 0 && chance(s, s.him.trust >= 7 ? 0.25 : 0.6)) {
      report -= 1
      s.him.stash += 1
    }
    const needWater = s.him.water + s.you.water <= s.him.food + s.you.food
    if (needWater) s.haul.water += report
    else s.haul.food += report
    lines.push(report > 0 ? `他自己也帶回了 ${report} 份${needWater ? '水' : '食物'}。` : '他空著手回來。')
    if (s.truth === 'injured' && !s.him.treated && chance(s, 0.3)) s.him.hp = clamp(s.him.hp - 1)
  } else if (together) {
    s.him.trust = clamp(s.him.trust + (chance(s, 0.5) ? 1 : 0))
  }

  if (!together && himCanAct(s) && s.him.trust <= 3) s.you.stress = clamp(s.you.stress + 1)

  s.log = { title: locInfo.name, lines, bg: locInfo.bg }

  // 隨機事件
  const ev = rollEvent(s, loc, together)
  if (ev) {
    s.pendingEvent = { id: ev.id, together }
    s.stage = 'event'
    return checkDeath(s)
  }
  return afterAction(s)
}

const rollEvent = (s: GameState, loc: LocationId, together: boolean): GameEvent | null => {
  if (loc === 'signal') return null
  const p = loc === 'rest' ? 0.3 : 0.4
  if (!chance(s, p)) return null
  const pool = events.filter(
    (e) =>
      (e.location === loc || (e.location === 'any' && himCanAct(s))) &&
      (e.minDay ?? 0) <= s.day &&
      (e.together === undefined || e.together === together) &&
      !s.clues.includes('ev:' + e.id),
  )
  const candidates = loc === 'rest' ? pool.filter((e) => e.location === 'any') : pool
  if (!candidates.length) return null
  const ev = pick(s, candidates)
  s.clues.push('ev:' + ev.id) // 記錄已出現過（不顯示在筆記）
  return ev
}

export function chooseEvent(prev: GameState, index: number): GameState {
  if (prev.stage !== 'event' || !prev.pendingEvent) return prev
  const s = clone(prev)
  const ev = eventById(s.pendingEvent!.id)!
  const choice = ev.choices[index]
  const lines: string[] = []
  applyEffect(s, choice.effect, !choice.hidden)
  if (choice.risk && chance(s, choice.risk.chance)) {
    applyEffect(s, choice.risk.effect, true)
    lines.push(choice.risk.text)
  } else if (choice.result) lines.push(choice.result)
  if (choice.clue && himCanAct(s)) {
    const c = addClue(s, 'any', choice.clue === 'true' && chance(s, 0.75) ? 'true' : 'noise')
    if (c) lines.push(c.text)
  }
  if (choice.special) lines.push(...special(s, choice.special))
  s.pendingEvent = null
  s.log = { title: ev.title, lines, bg: ev.bg }
  s.stage = 'day'
  return afterAction(checkDeath(s))
}

const special = (s: GameState, id: string): string[] => {
  switch (id) {
    case 'stash_hole':
      if (s.truth === 'hoarder' && s.him.stash > 0) {
        const n = s.him.stash
        s.haul.food += n
        s.him.stash = 0
        addSpecificClue(s, 'hoard_stash')
        return [`洞裡塞著 ${n} 份用葉子包好的食物。這不是動物會做的事。`]
      }
      s.you.stress = clamp(s.you.stress + 1)
      return ['裡面只有濕土和蟲。可能只是動物挖的。']
    case 'iron_box':
      if (s.truth === 'liar' && !resolved(s)) {
        if (chance(s, 0.5)) {
          s.signal = clamp(s.signal + 2, 0, SIGNAL_GOAL)
          addSpecificClue(s, 'liar_key')
          return ['鎖終於被砸壞。裡面是兩支信號彈，用油布包得很仔細，像是有人準備好要來拿。', '你想起他脖子上的那把鑰匙。']
        }
        return ['你砸到手都腫了，鎖還是好的。']
      }
      s.haul.water += 1
      s.haul.food += 1
      return ['箱子裡是兩罐飲用水和一包軍用口糧。']
    case 'medkit_share':
      if (s.truth === 'injured' && himCanAct(s)) {
        s.him.treated = true
        s.him.hp = clamp(s.him.hp + 2)
        s.him.trust = clamp(s.him.trust + 2)
        addSpecificClue(s, 'inj_cloth')
        return ['他盯著急救包看了很久，最後說：「……可以給我嗎？」', '那天晚上，他躲到火光照不到的地方換藥。']
      }
      if (himCanAct(s)) s.him.trust = clamp(s.him.trust + 1)
      s.you.hp = clamp(s.you.hp + 2)
      return ['他搖搖頭：「你比較需要。」然後幫你把手上的傷口包好。']
  }
  return []
}

const afterAction = (s: GameState): GameState => {
  if (s.stage === 'ended') return s
  if (s.actionsLeft <= 0) s.stage = 'evening'
  return s
}

// ---------- 傍晚：分配 ----------
export const canHide = (s: GameState) => s.haul.mine > 0 && himCanAct(s)

export function split(prev: GameState, choice: SplitChoice): GameState {
  if (prev.stage !== 'evening') return prev
  const s = clone(prev)
  const lines: string[] = []
  const w = s.haul.water
  const f = s.haul.food
  const total = w + f
  if (!himCanAct(s)) {
    s.you.water += w
    s.you.food += f
    lines.push(total ? `你把今天的 ${total} 份收穫都收進自己的包裡。` : '今天什麼都沒帶回來。')
  } else if (total === 0) {
    lines.push('今天沒有東西可以分。你們對看了一眼，誰都沒說話。')
  } else {
    let myW = 0
    let myF = 0
    let hid = 0
    if (choice === 'hide' && canHide(s)) {
      hid = 1
      s.hidCount += 1
      s.stats.hidden += 1
      if (f > 0) myF += 1
      else myW += 1
    }
    const rw = w - myW
    const rf = f - myF
    const share = (n: number, mine: number) => Math.round(n * mine)
    const ratio = choice === 'take' ? 0.67 : choice === 'give' ? 0.34 : 0.5
    // 平分時，奇數的那份給比較缺的人
    let gw = share(rw, ratio)
    let gf = share(rf, ratio)
    if (choice === 'fair' || choice === 'hide') {
      gw = rw % 2 && s.you.water < s.him.water ? Math.ceil(rw / 2) : Math.floor(rw / 2)
      gf = rf % 2 && s.you.food < s.him.food ? Math.ceil(rf / 2) : Math.floor(rf / 2)
    }
    myW += gw
    myF += gf
    s.you.water += myW
    s.you.food += myF
    s.him.water += w - myW
    s.him.food += f - myF
    const hisFood = f - myF
    const hisTotal = total - myW - myF

    if (choice === 'take') {
      s.him.trust = clamp(s.him.trust - 2)
      s.stats.taken += 1
      lines.push('你把比較多的那份拉到自己面前。他看著，沒有阻止。')
    } else if (choice === 'give') {
      s.him.trust = clamp(s.him.trust + 2)
      s.stats.given += 1
      s.you.stress = clamp(s.you.stress - 1)
      lines.push('你把多的那份推給他。他愣了一下才收下。')
      if (hisFood >= 1) s.gaveToday = true
    } else {
      s.him.trust = clamp(s.him.trust + 1)
      lines.push(hid ? '你先把一份收進衣服裡，剩下的才拿出來平分。他沒有發現。' : '你們把東西分成兩堆，一人一堆。')
      if (s.truth === 'innocent' && !s.clues.includes('inn_return') && chance(s, 0.3)) {
        const c = addSpecificClue(s, 'inn_return')
        lines.push(c.text)
        s.you.food += 1
      }
    }
    lines.push(`你拿到水 ${myW}、食物 ${myF}；他拿到 ${hisTotal} 份。`)
  }
  s.haul = { water: 0, food: 0, mine: 0 }
  s.log = { title: '傍晚・分配', lines, bg: '/event_resource.jpg' }
  s.stage = 'night'
  return s
}

// ---------- 攤牌（每輪一次，傍晚） ----------
export const canConfront = (s: GameState) => s.stage === 'evening' && !s.confronted && himCanAct(s) && s.clues.filter((id) => !id.startsWith('ev:')).length >= 2

export function confront(prev: GameState, guess: Truth): GameState {
  if (!canConfront(prev)) return prev
  const s = clone(prev)
  const correct = guess === s.truth
  s.confronted = { guess, correct }
  const lines: string[] = [(content.confront.options as Record<string, string>)[guess]]
  if (correct) {
    lines.push((content.confront.right as Record<string, string>)[guess])
    switch (guess) {
      case 'hoarder':
        s.haul.food += s.him.stash + 2
        s.him.stash = 0
        s.him.trust = Math.max(s.him.trust, 5)
        break
      case 'liar':
        s.signal = clamp(s.signal + 2, 0, SIGNAL_GOAL)
        s.him.trust = clamp(s.him.trust + 1)
        break
      case 'injured':
        s.him.treated = true
        s.him.hp = clamp(s.him.hp + 2)
        s.him.trust = clamp(s.him.trust + 2)
        break
      case 'innocent':
        s.him.trust = clamp(s.him.trust + 3)
        s.you.stress = clamp(s.you.stress - 3)
        break
    }
  } else if (guess === 'innocent') {
    lines.push(content.confront.wrongInnocent)
    s.him.trust = clamp(s.him.trust + 1)
  } else {
    lines.push(content.confront.wrong)
    s.him.trust = clamp(s.him.trust - (s.truth === 'innocent' ? 5 : 3))
    s.you.stress = clamp(s.you.stress + 1)
  }
  s.log = { title: '攤牌', lines, bg: '/event_conflict.jpg' }
  return s
}

// ---------- 夜晚 ----------
export function night(prev: GameState, action: NightAction): GameState {
  if (prev.stage !== 'night') return prev
  const s = clone(prev)
  const lines: string[] = []
  const n = content.night
  const alone = !himCanAct(s)
  let watched = false

  if (alone && action !== 'sleep') action = 'sleep'
  switch (action) {
    case 'sleep':
      s.you.stamina = clamp(s.you.stamina + 4)
      if (alone || s.him.trust >= 4) {
        s.you.stress = clamp(s.you.stress - (s.him.trust >= 7 && !alone ? 2 : 1))
        lines.push(n.sleep)
      } else {
        s.you.stamina = clamp(s.you.stamina - 1)
        lines.push(n.sleepUneasy)
      }
      break
    case 'watch': {
      watched = true
      s.you.stamina = clamp(s.you.stamina + 1)
      lines.push(n.watch)
      const trueP = s.you.stress >= 7 ? 0.35 : 0.55
      const c = chance(s, 0.85) ? addClue(s, 'watch', chance(s, trueP) ? 'true' : 'noise') : null
      lines.push(c ? c.text : n.watchNothing)
      break
    }
    case 'search': {
      s.stats.searched += 1
      s.you.stamina = clamp(s.you.stamina + 2)
      lines.push(n.search)
      if (chance(s, s.him.trust <= 3 ? 0.45 : 0.25)) {
        s.stats.caught += 1
        s.him.trust = clamp(s.him.trust - 3)
        s.you.stress = clamp(s.you.stress + 1)
        lines.push(n.searchCaught)
      } else {
        const c = addClue(s, 'search', chance(s, 0.8) ? 'true' : 'noise')
        if (c) lines.push(c.text)
        if (s.truth === 'hoarder' && c?.id === 'hoard_stash' && s.him.stash > 0) {
          lines.push(`你可以拿回來，但那會讓他知道你翻過。你沒有動。`)
        }
      }
      break
    }
    case 'talk':
      s.you.stamina = clamp(s.you.stamina + 3)
      lines.push(n.talk)
      if (s.him.trust < 2) {
        lines.push(n.talkRefused)
      } else {
        s.him.trust = clamp(s.him.trust + 1)
        s.you.stress = clamp(s.you.stress - 1)
        const c = addClue(s, 'talk', chance(s, 0.5) ? 'true' : 'noise')
        if (c) lines.push(c.text)
      }
      break
  }

  // 他的夜間行為
  if (himCanAct(s)) {
    if (s.hidCount > 0 && chance(s, Math.min(0.6, 0.12 * s.hidCount + (s.truth === 'hoarder' ? 0.15 : 0)))) {
      s.him.trust = clamp(s.him.trust - 3)
      s.hidCount = 0
      lines.push(n.hideFound)
    }
    if (s.truth === 'hoarder' && !resolved(s) && !watched && s.him.trust <= 4 && chance(s, 0.5)) {
      if (s.you.food > 0) {
        s.you.food -= 1
        s.him.stash += 1
        lines.push(n.theft)
        if (!s.clues.includes('hoard_count')) addSpecificClue(s, 'hoard_count')
      }
    }
  }

  return endDay(s, lines)
}

const consume = (p: { water: number; food: number; hp: number }) => {
  let dmg = 0
  let stress = 0
  if (p.water > 0) p.water -= 1
  else {
    dmg += 2
    stress += 2
  }
  if (p.food > 0) p.food -= 1
  else {
    dmg += 1
    stress += 1
  }
  p.hp = clamp(p.hp - dmg)
  return { dmg, stress }
}

const endDay = (s: GameState, lines: string[]): GameState => {
  // 消耗
  const mine = consume(s.you)
  s.you.stress = clamp(s.you.stress + mine.stress)
  if (mine.dmg) lines.push(s.you.water === 0 && mine.dmg >= 2 ? '你渴得整夜睡不著。' : '空著肚子，胃一直在絞。')

  if (himCanAct(s)) {
    const his = consume(s.him)
    if (his.dmg) s.him.trust = clamp(s.him.trust - 1)
    if (s.truth === 'injured' && !s.him.treated && !s.gaveToday && s.day % 2 === 0) {
      s.him.hp = clamp(s.him.hp - 1)
      if (s.him.hp <= 3) lines.push(content.night.heWorse)
    }
    if (s.him.treated && s.him.hp < 8) s.him.hp = clamp(s.him.hp + 1)
    // 囤積者會偷吃藏起來的東西
    if (s.truth === 'hoarder' && s.him.stash > 0 && s.him.food === 0) {
      s.him.stash -= 1
      s.him.food += 1
    }
    if (s.him.hp <= 0) {
      s.him.alive = false
      lines.push(content.night.heDied)
      s.you.stress = clamp(s.you.stress + 2)
    } else if (s.him.trust <= 0) {
      s.him.present = false
      s.wood = Math.max(0, s.wood - 1)
      lines.push(content.night.heLeft)
      s.you.stress = clamp(s.you.stress + 1)
    }
  }
  if (himCanAct(s) && s.him.trust <= 2) s.you.stress = clamp(s.you.stress + 1)
  if (!himCanAct(s)) s.you.stress = clamp(s.you.stress + 1)

  s.gaveToday = false
  const dead = checkDeath(s)
  if (dead.stage === 'ended') {
    dead.log = { title: '夜晚', lines, bg: '/bg_phase4.jpg' }
    return dead
  }

  if (s.day >= DAYS) {
    s.stage = 'finale'
    lines.push(s.signal >= SIGNAL_GOAL ? content.finale.ship : content.finale.noShip)
    s.log = { title: '第十四天', lines, bg: s.signal >= SIGNAL_GOAL ? '/bg_phase5.jpg' : '/event_silence.jpg' }
    return s
  }

  s.day += 1
  s.actionsLeft = ACTIONS_PER_DAY
  s.stage = 'day'
  rollTip(s)
  if (s.tip) lines.push(tipLine(s))
  s.log = { title: '夜晚 → 第 ' + s.day + ' 天', lines, bg: '/bg_phase4.jpg' }
  return s
}

const checkDeath = (s: GameState): GameState => {
  if (s.you.hp <= 0) {
    s.stage = 'ended'
    s.ending = 'you_died'
  } else if (s.you.stress >= MAX) {
    s.stage = 'ended'
    s.ending = 'breakdown'
  }
  return s
}

// ---------- 結局 ----------
export type FinaleChoice = 'together' | 'alone' | 'wait'

export const finaleOptions = (s: GameState): FinaleChoice[] => {
  if (s.signal < SIGNAL_GOAL) return ['wait']
  return himCanAct(s) ? ['together', 'alone'] : ['alone']
}

export function finale(prev: GameState, choice: FinaleChoice): GameState {
  if (prev.stage !== 'finale') return prev
  const s = clone(prev)
  s.stage = 'ended'
  const ship = s.signal >= SIGNAL_GOAL
  if (!ship) {
    s.ending = himCanAct(s) && s.him.trust >= 6 ? 'day_fifteen' : himCanAct(s) ? 'no_ship' : !s.him.alive ? 'alone_survivor' : 'no_ship'
    return s
  }
  if (!s.him.alive) s.ending = 'alone_survivor'
  else if (!s.him.present) s.ending = 'empty_fire'
  else if (choice === 'alone') s.ending = s.truth === 'innocent' ? 'left_innocent' : 'left_guilty'
  else if (resolved(s) && s.him.trust >= 6) s.ending = 'truth_together'
  else if (s.truth === 'liar' && !resolved(s)) s.ending = 'liar_ship'
  else if (s.truth === 'hoarder' && !resolved(s)) s.ending = 'hoarder_bag'
  else if (s.truth === 'injured' && !s.him.treated) s.ending = 'injured_deck'
  else s.ending = 'together'
  return s
}

export const ENDING_IDS = Object.keys(content.endings) as EndingId[]
export const visibleClues = (s: GameState) => s.clues.filter((id) => !id.startsWith('ev:')).map((id) => clueById(id)!).filter(Boolean)
