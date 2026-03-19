import { useEffect, useState } from 'react'

import type { NarrativeEffect, NarrativeEvent } from '../hooks/useEncounter'
import { useProjectStore, type DailyGoalKey, type SupplyFocus, type Weather } from '../store/useProjectStore'

export type DistortionLevel = 0 | 1 | 2 | 3

export type ActionId = 'beach_search' | 'forest_search' | 'wreck_explore' | 'interact' | 'observe' | 'rest'
export type ActionTier = 'success' | 'normal' | 'failure'

export type DailyGoal = {
  key: DailyGoalKey
  title: string
  summary: string
}

export type DayActionDefinition = {
  id: ActionId
  title: string
  summary: string
  hoverHint: string
}

export type ResolvedAction = {
  title: string
  lines: string[]
  effect: NarrativeEffect
  feeling: string
  tier: ActionTier
  supplyFocus: SupplyFocus
  completedGoal: boolean
  endsDay: boolean
  behavior?: 'selfish' | 'honest' | 'cooperative' | 'aggressive'
  flags?: string[]
}

export type EndingKey =
  | 'mutual_trust'
  | 'murdered'
  | 'murderer'
  | 'starved'
  | 'lone_survivor'
  | 'betrayed'
  | 'mental_break'
  | 'accidental_killing'
  | 'cold_war_death'
  | 'false_peace'
  | 'escape'
  | 'annihilation'

export const sceneStyles = `
@keyframes driftFadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes driftPulse {
  0%, 100% { opacity: 0.18; }
  50% { opacity: 0.32; }
}

@keyframes driftToast {
  0% { opacity: 0; transform: translateY(10px) scale(0.98); }
  12% { opacity: 1; transform: translateY(0) scale(1); }
  88% { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-6px) scale(0.98); }
}
`

export const phaseBackgrounds = {
  phase1: '/bg_phase1.jpg',
  phase2: '/bg_phase2.jpg',
  phase3: '/bg_phase3.jpg',
  phase4: '/bg_phase4.jpg',
  phase5: '/bg_phase5.jpg',
}

export const weatherPool: Weather[] = ['sunny', 'rain', 'cloudy']

export const endings: Record<EndingKey, { title: string; text: string[] }> = {
  mutual_trust: {
    title: '互相信任',
    text: [
      '你們都活下來了。更難得的是，你們沒有把彼此推進最後的深海。',
      '信任沒有變得輕鬆，它只是一次次被留下，直到真的能承重。',
      '離開這座島之後，你也知道，有些沉默終於不再需要防備。 ',
    ],
  },
  murdered: {
    title: '被殺',
    text: [
      '你沒有死在海上，也沒有死在飢餓裡。',
      '你死在最後那一下遲疑，死在你以為對方還會收手。',
      '真正留到最後的，不是信任，而是先下手的人。',
    ],
  },
  murderer: {
    title: '殺人',
    text: [
      '你活了下來。這件事沒有錯，但也沒有乾淨。',
      '你知道自己會把那一刻帶離這座島，比任何傷口都久。',
      '從那之後，活著和回頭看自己，成了兩件不同的事。',
    ],
  },
  starved: {
    title: '餓死',
    text: [
      '最後先垮掉的不是意志，而是身體。',
      '你們把每一天都算得很細，還是沒能把明天留住。',
      '匱乏從來不吵，它只是慢慢把人往下拖。',
    ],
  },
  lone_survivor: {
    title: '獨活',
    text: [
      '你撐到了最後，但不是和他一起。',
      '海風終於變安靜，營火旁卻只剩下一個人的呼吸。',
      '你活著，代價是再也沒有人替你證明發生過什麼。',
    ],
  },
  betrayed: {
    title: '被背叛',
    text: [
      '你早就覺得有什麼在鬆動，只是不願意先承認。',
      '真正發生的時候，背叛並不劇烈，它只是剛好在你最缺的那一天落下。',
      '你記得的不是憤怒，而是自己終於相信了最壞的那個版本。',
    ],
  },
  mental_break: {
    title: '精神崩潰',
    text: [
      '到最後，最先失真的不是海平線，是你的判斷。',
      '你開始記不清誰先說謊、誰先沉默、誰先把東西藏起來。',
      '當你再也分不清危險和想像，這座島就已經把你留下了。',
    ],
  },
  accidental_killing: {
    title: '誤殺',
    text: [
      '你並不是打算走到這一步。',
      '可是在恐懼、飢餓和防備一起湧上來的時候，失手也會像決定。',
      '你知道自己會一直說那不是故意的，直到沒有人能聽見。',
    ],
  },
  cold_war_death: {
    title: '冷戰死亡',
    text: [
      '你們沒有真正爆發。',
      '只是誰都不再主動靠近，誰都不願先把話說完。',
      '最後害死你們的不是爭吵，而是長久不處理的裂縫。',
    ],
  },
  false_peace: {
    title: '偽和平',
    text: [
      '你們活到了最後，也把真正想說的話一起留到了最後。',
      '表面上的平靜讓一切看起來還能維持，但每一步都踩在未說破的事上。',
      '你知道這不是和解，只是暫時沒有人再追問。',
    ],
  },
  escape: {
    title: '逃離成功',
    text: [
      '你們終於離開了這座島。',
      '真正帶你們撐過去的，不是運氣，而是還願意把東西放到對方面前。',
      '海面被拉遠的那一刻，你才第一次覺得今天也許不會再毀掉。',
    ],
  },
  annihilation: {
    title: '全滅',
    text: [
      '沒有誰被真正留下，也沒有誰被真正帶走。',
      '壓力、猜疑和匱乏把最後那一點能回頭的空間一起吞掉了。',
      '這座島沒有選邊，它只是等你們都走不出來。',
    ],
  },
}

export const dayActions: DayActionDefinition[] = [
  {
    id: 'beach_search',
    title: '海邊搜尋',
    summary: '沿潮線找淡水與容器。會掉體力，也可能只是白走一趟。',
    hoverHint: '你可能帶回一點能撐今晚的水，也可能只是把最後的判斷留在鹽味裡。',
  },
  {
    id: 'forest_search',
    title: '林地搜尋',
    summary: '試著找能吃的東西。收穫不穩，失手時只剩更深的餓。',
    hoverHint: '林地會藏住食物，也會藏住方向感。空手回來時，爭執通常會比腳步先到。',
  },
  {
    id: 'wreck_explore',
    title: '殘骸探索',
    summary: '翻找還能用的東西。收益最高，也最容易受傷或失手。',
    hoverHint: '殘骸裡可能還有你們缺的東西，但也可能只剩會割人的邊角。',
  },
  {
    id: 'interact',
    title: '與對方互動',
    summary: '試著說話、交換看法、讓今天不要往更壞的地方滑。',
    hoverHint: '說開不一定能修補，但繼續不說，很多事都只會往最壞的方向想。',
  },
  {
    id: 'observe',
    title: '觀察對方',
    summary: '先不開口，只看他今天到底像不像在隱瞞什麼。',
    hoverHint: '你也許會看出端倪，也可能只是替沉默補上自己最怕的版本。',
  },
  {
    id: 'rest',
    title: '休息',
    summary: '提早收手，讓今天在更糟之前停下來。',
    hoverHint: '休息能保住一些體力，但夜裡照樣會帶走水和食物。',
  },
]

export function useTypewriterText(text: string, enabled: boolean, speed = 70) {
  const [displayedText, setDisplayedText] = useState('')

  useEffect(() => {
    if (!enabled) {
      const timer = window.setTimeout(() => setDisplayedText(''), 0)
      return () => window.clearTimeout(timer)
    }

    if (displayedText.length >= text.length) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      setDisplayedText(text.slice(0, displayedText.length + 1))
    }, speed)

    return () => window.clearTimeout(timer)
  }, [displayedText, enabled, speed, text])

  return displayedText
}

export function useRevealBlocks(blocks: string[], key: string, enabled: boolean, initialDelay = 280, stepDelay = 900) {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisibleCount(0), 0)
    return () => window.clearTimeout(timer)
  }, [key])

  useEffect(() => {
    if (!enabled || visibleCount >= blocks.length) {
      return undefined
    }

    const timer = window.setTimeout(
      () => setVisibleCount((count) => Math.min(count + 1, blocks.length)),
      visibleCount === 0 ? initialDelay : stepDelay,
    )

    return () => window.clearTimeout(timer)
  }, [blocks.length, enabled, initialDelay, key, stepDelay, visibleCount])

  return {
    blocks: blocks.slice(0, visibleCount),
    complete: visibleCount >= blocks.length,
  }
}

export function getDistortionLevel(stress: number, suspicion: number, oddities: number): DistortionLevel {
  if (stress >= 90 || oddities >= 4) return 3
  if (stress >= 75 || suspicion >= 70) return 2
  if (stress >= 60) return 1
  return 0
}

export function getRiskHintLine(state: { stamina: number; water: number; food: number; trust: number; suspicion: number; stress: number }) {
  if (state.water <= 1) return '但如果今天還找不到水，明早先垮掉的會是你。'
  if (state.food <= 1) return '但等到明天，桌上能分的只會剩更難看的那一點。'
  if (state.stamina <= 25) return '但你現在連再摔一次，都未必撐得住。'
  if (state.suspicion >= 60) return '但這份懷疑沒有散，只是還沒被誰先說出口。'
  if (state.trust <= 30) return '但他看你的眼神，已經像在防一個遲早會出手的人。'
  if (state.stress >= 70) return '但你心裡那根線已經繃得很緊，再推一下就會斷。'
  return '但今天留下來的每一步，明天都可能反過來咬你。'
}

export function addRiskHints(
  lines: string[],
  state: { stamina: number; water: number; food: number; trust: number; suspicion: number; stress: number },
) {
  const filtered = lines.filter(Boolean)
  if (filtered.length === 0) {
    return [getRiskHintLine(state)]
  }

  const riskLine = getRiskHintLine(state)
  if (filtered.some((line) => line.includes('但') || line.includes('明天') || line.includes('下一次'))) {
    return filtered
  }

  return [...filtered, riskLine]
}

export function distortLine(line: string, level: DistortionLevel, unreliable = false, index = 0) {
  if (level === 0) return line
  if (level === 1) return index === 0 ? line + ' 你一時分不清這是不是好兆頭。' : line
  if (level === 2) {
    if (unreliable && index === 1) return line + ' 可你很難確定剛才那一幕是不是完全一樣。'
    return line + ' 你忽然覺得這句話剛剛好像已經出現過。'
  }
  if (unreliable) return line + ' 你記得自己似乎已經做過這一步，可海風又像第一次吹到你臉上。'
  return line + ' 那一瞬間，你甚至不敢確定自己是不是看對了人。'
}

export function getAmbientLine(day: number, weather: Weather, isNight: boolean, water: number, food: number) {
  const weatherText = weather === 'rain' ? '雨氣壓得很低。' : weather === 'cloudy' ? '天色灰得沒有邊。' : '太陽把所有痕跡都照得太清楚。'
  const timeText = isNight ? '夜色讓每個人都更像在藏事。' : '白天不會替你把事情講明白。'
  const supplyText = water + food <= 2 ? '補給已經薄到快撐不住下一次誤判。' : '補給還沒見底，但安全感早就先退掉了。'
  return '第 ' + day + ' 天。' + weatherText + timeText + supplyText
}

export function buildEncounterFrame(input: {
  day: number
  dailyGoal: DailyGoal
  currentEvent?: NarrativeEvent | null
  stamina: number
  water: number
  food: number
  trust: number
  suspicion: number
  stress: number
  oddities: number
}) {
  const { day, dailyGoal, currentEvent, stamina, water, food, trust, suspicion, stress } = input
  const category = currentEvent?.category ?? 'resource'

  let title = dailyGoal.title
  const lines: string[] = []

  if (category === 'resource') {
    title = '今天先撐住'
    lines.push('你知道今天的問題很簡單：不去找東西，晚上就會先少掉一點能呼吸的空間。')
    lines.push('海邊、林地和殘骸都像在等你犯錯，但你沒有多餘的行動可以浪費。')
  } else if (category === 'trust') {
    title = '誰先開口'
    lines.push('真正讓人難受的不是匱乏本身，而是你開始分不清他沉默是在防備你，還是在撐住自己。')
    lines.push('今天的每一次接近，都可能把關係往前推一步，也可能讓裂縫直接顯出來。')
  } else if (category === 'psychological') {
    title = '看錯的代價'
    lines.push('你已經不像第一天那樣相信自己看見的每件事。')
    lines.push('可你還是得做決定，而錯一次就可能把下一次也一起拖歪。')
  } else if (category === 'external') {
    title = '外面的東西先來了'
    lines.push('風向和海面都在提醒你，今天不會安靜地過去。')
    lines.push('如果你選錯地方浪費力氣，真正的壞天氣來時就沒有補救空間。')
  } else {
    title = '快要撐不住的地方'
    lines.push('有些事還沒發生，但你已經能感覺到它會留下後果。')
    lines.push('今天若再多一次錯判，明天的問題就不會只剩資源。')
  }

  lines.push('第 ' + day + ' 天的目標是「' + dailyGoal.title + '」。你只有兩次行動，兩次都會被記住。')

  if (water <= 1) {
    lines.push('你喉嚨裡那點乾意一直沒退，任何決定都會先被缺水放大。')
  } else if (food <= 1) {
    lines.push('肚子還沒完全空掉，但你知道餓意最會把人往最短的路推。')
  } else if (stamina <= 25) {
    lines.push('你現在的力氣只夠做少數幾件事，失手一次就很難拉回來。')
  } else if (suspicion >= 55 || trust <= 35) {
    lines.push('他沒有說話，但你知道這份安靜不是過去了，只是暫時沒被拆開。')
  } else if (stress >= 60) {
    lines.push('你還能往前走，但腦子裡那種發緊的感覺已經開始替你下結論。')
  }

  return {
    title,
    lines,
  }
}

export function buildShiftNarrative(
  before: { trust: number; suspicion: number; stress: number; stamina: number; hp: number; water: number; food: number },
  after: { trust: number; suspicion: number; stress: number; stamina: number; hp: number; water: number; food: number },
) {
  const lines: string[] = []
  const trustDelta = after.trust - before.trust
  const suspicionDelta = after.suspicion - before.suspicion
  const stressDelta = after.stress - before.stress
  const staminaDelta = after.stamina - before.stamina
  const hpDelta = after.hp - before.hp
  const waterDelta = after.water - before.water
  const foodDelta = after.food - before.food

  if (trustDelta >= 5) lines.push('他接過你遞出去的東西時沒有再把手縮回去，但這份靠近還很脆。')
  if (trustDelta <= -5) lines.push('他沒有立刻翻臉，但那一下沉默已經把距離拉開了。')

  if (suspicionDelta >= 5) lines.push('你感覺到他開始記住細節了，而被記住的事通常不會自己消失。')
  if (suspicionDelta <= -3) lines.push('至少這一次，空氣裡少了一點立刻會出事的味道。')

  if (waterDelta > 0) lines.push('淡水多了一點，今晚的判斷至少不會先被口渴拖垮。')
  if (waterDelta < 0 && after.water <= 1) lines.push('淡水只剩這麼一點，明天開始每句話都會更刺。')

  if (foodDelta > 0) lines.push('食物讓人勉強能把話吞回去，但它撐不了太多天。')
  if (foodDelta < 0 && after.food <= 1) lines.push('食物見底後，公平會變得比匱乏本身更難維持。')

  if (stressDelta >= 6) lines.push('你知道自己正在往不穩的地方滑，只是還沒有人先說破。')
  if (stressDelta <= -3) lines.push('壓力暫時退了一步，但它沒有真的離開。')

  if (staminaDelta <= -10) lines.push('你今天耗掉的不只是力氣，還有明天可以後悔的空間。')
  if (hpDelta < 0) lines.push('疼痛提醒你，之後的每一次冒險都會變得更貴。')

  return lines.slice(0, 3)
}

export function buildDiaryEntry(day: number, header: string, resultLines: string[], summaryLines: string[] = []) {
  return ['Day ' + day, header, ...resultLines.filter(Boolean), ...summaryLines.filter(Boolean)].join('\n')
}

export function getDailyGoal(state: Pick<ReturnType<typeof useProjectStore.getState>, 'water' | 'food' | 'trust' | 'suspicion' | 'stress' | 'day' | 'resource'>): DailyGoal {
  if (state.water <= 1) {
    return {
      key: 'find_water',
      title: '找到水',
      summary: '今天若還拿不到水，夜裡會先亂掉的不是喉嚨，是判斷。',
    }
  }

  if (state.food <= 1) {
    return {
      key: 'find_food',
      title: '補充食物',
      summary: '空腹不只會耗體力，也會把每句話都逼得更難聽。',
    }
  }

  if (state.trust < 42 || state.suspicion > 55) {
    return {
      key: 'ease_tension',
      title: '緩和關係',
      summary: '今天如果再談崩，之後每一步都會帶著試探。',
    }
  }

  if (state.day <= 8 || state.resource <= 3) {
    return {
      key: 'search_wreck',
      title: '探查殘骸',
      summary: '那裡可能還有能用的東西，但拖太久只會剩下空殼。',
    }
  }

  return {
    key: 'hold_together',
    title: '穩住今天',
    summary: '資源還沒見底，但真正危險的從來不只是一項東西。',
  }
}

export function getGoalCompletionLine(goal: DailyGoal) {
  switch (goal.key) {
    case 'find_water':
      return '今天至少把口渴往後推了一點。'
    case 'find_food':
      return '今天沒有讓飢餓先決定你們怎麼說話。'
    case 'ease_tension':
      return '裂縫沒有消失，但至少沒有在今天裂開。'
    case 'search_wreck':
      return '殘骸還願意吐出一點東西，今天沒有完全白費。'
    case 'hold_together':
      return '你把今天穩住了，但這不代表明天也會一樣。'
  }
}

export function getGoalFailureLine(goal: DailyGoal) {
  switch (goal.key) {
    case 'find_water':
      return '今天還是沒把水帶回來，明天開始每個決定都會更急。'
    case 'find_food':
      return '食物沒有補上，之後連公平都會變得很難維持。'
    case 'ease_tension':
      return '關係沒有緩下來，下一次沉默只會更像指控。'
    case 'search_wreck':
      return '殘骸沒有給你答案，卻先帶走了一點回頭的空間。'
    case 'hold_together':
      return '今天沒有真的穩住，問題只是在等明天繼續。'
  }
}

const rollActionTier = (
  actionId: ActionId,
  state: Pick<ReturnType<typeof useProjectStore.getState>, 'day' | 'stamina' | 'water' | 'food' | 'trust' | 'suspicion' | 'stress'>,
): ActionTier => {
  let successThreshold = 28
  let normalThreshold = 72

  if (actionId === 'beach_search') {
    successThreshold += state.water <= 1 ? 18 : 6
    successThreshold -= state.stress >= 70 ? 6 : 0
  }

  if (actionId === 'forest_search') {
    successThreshold += state.food <= 1 ? 18 : 4
    normalThreshold += 4
  }

  if (actionId === 'wreck_explore') {
    successThreshold += state.day <= 10 ? 10 : 0
    successThreshold -= state.stress >= 65 ? 8 : 0
    normalThreshold -= state.day >= 20 ? 8 : 0
  }

  if (actionId === 'interact') {
    successThreshold += state.trust >= 45 ? 12 : 0
    successThreshold -= state.suspicion >= 55 ? 10 : 0
  }

  if (actionId === 'observe') {
    successThreshold += state.stress < 60 ? 8 : 0
    successThreshold -= state.suspicion >= 65 ? 12 : 0
  }

  if (actionId === 'rest') {
    successThreshold += state.stamina <= 45 ? 14 : 6
    successThreshold += state.stress >= 60 ? 8 : 0
    normalThreshold += 8
  }

  const roll = Math.random() * 100
  if (roll <= successThreshold) return 'success'
  if (roll <= normalThreshold) return 'normal'
  return 'failure'
}

const beachOutcome = (tier: ActionTier): ResolvedAction => {
  if (tier === 'success') {
    return {
      title: '海邊搜尋',
      lines: [
        '你沿著潮痕一路往外找，最後在石縫裡接到還能入口的一點淡水。',
        '他接過容器時沒有說謝謝，但也沒有再把目光移開。',
      ],
      effect: { water: 2, stamina: -10, stress: -1 },
      feeling: '這不是充裕，只是讓今晚沒有立刻變成壞消息。',
      tier,
      supplyFocus: 'water',
      completedGoal: true,
      endsDay: false,
    }
  }

  if (tier === 'normal') {
    return {
      title: '海邊搜尋',
      lines: [
        '你帶回來的只有一點能用的水，剛好夠讓今天不至於太難看。',
        '可你知道，這種剛好通常撐不到第二天晚上。',
      ],
      effect: { water: 1, stamina: -9, stress: 1 },
      feeling: '他看了看那點水，什麼都沒說，像是早就猜到只會這樣。',
      tier,
      supplyFocus: 'water',
      completedGoal: true,
      endsDay: false,
    }
  }

  return {
    title: '海邊搜尋',
    lines: [
      '你繞了一大圈，最後只把鹽味和更重的腿帶回來。',
      '浪聲很大，可你還是覺得空手回去時的沉默更吵。',
    ],
    effect: { stamina: -12, stress: 5, suspicion: 1 },
    feeling: '這次什麼都沒有找到，而這種白費最容易讓人互相記帳。',
    tier,
    supplyFocus: 'water',
    completedGoal: false,
    endsDay: false,
  }
}

const forestOutcome = (tier: ActionTier): ResolvedAction => {
  if (tier === 'success') {
    return {
      title: '林地搜尋',
      lines: [
        '你在樹蔭下找到還沒爛掉的果實和幾片能吃的嫩葉。',
        '東西不多，但足夠讓今晚的對話不先被飢餓帶壞。',
      ],
      effect: { food: 2, stamina: -11, stress: -1 },
      feeling: '他把食物接過去的動作很慢，像是不想讓急切被你看見。',
      tier,
      supplyFocus: 'food',
      completedGoal: true,
      endsDay: false,
    }
  }

  if (tier === 'normal') {
    return {
      title: '林地搜尋',
      lines: [
        '你帶回一點能吃的東西，但份量小得像是在拖延。',
        '這點收穫還不夠讓人放心，只夠讓今天再多撐一會。',
      ],
      effect: { food: 1, stamina: -10, stress: 1 },
      feeling: '他點了點頭，卻沒有露出鬆口氣的樣子，像是在替明天先想。',
      tier,
      supplyFocus: 'food',
      completedGoal: true,
      endsDay: false,
    }
  }

  return {
    title: '林地搜尋',
    lines: [
      '你繞了很久，最後只記得潮濕、枝葉和一點越來越不耐煩的呼吸。',
      '空手回來時，連你自己都不知道該先解釋方向，還是先解釋時間。',
    ],
    effect: { stamina: -13, stress: 5, suspicion: 1 },
    feeling: '什麼都沒帶回來時，連安靜都會像在推責任。',
    tier,
    supplyFocus: 'food',
    completedGoal: false,
    endsDay: false,
  }
}

const wreckOutcome = (tier: ActionTier): ResolvedAction => {
  if (tier === 'success') {
    return {
      title: '殘骸探索',
      lines: [
        '你從斷裂的板材和卡住的箱體裡翻出一些還能用的東西。',
        '那點收穫讓今天看起來沒那麼像純粹的消耗，但你也因此靠得更深。',
      ],
      effect: { water: 1, food: 1, stamina: -13, stress: 1 },
      feeling: '他看著你把東西一樣樣放下，眼神裡第一次有了短暫的確定。',
      tier,
      supplyFocus: 'mixed',
      completedGoal: true,
      endsDay: false,
    }
  }

  if (tier === 'normal') {
    return {
      title: '殘骸探索',
      lines: [
        '殘骸還願意吐出一點能用的東西，但不足以讓你覺得今天賺到了。',
        '你知道再往裡翻一次，代價就不會只有幾道擦傷。',
      ],
      effect: { water: 1, stamina: -12, stress: 2 },
      feeling: '東西是帶回來了，可你也把更急的氣味一起帶回了營地。',
      tier,
      supplyFocus: 'mixed',
      completedGoal: true,
      endsDay: false,
    }
  }

  return {
    title: '殘骸探索',
    lines: [
      '你在鋒利的邊角和濕滑的木板間浪費了太多時間，最後差點把自己也留在裡面。',
      '真正帶回來的只有傷、疲憊，還有對下一次冒險更明確的價碼。',
    ],
    effect: { stamina: -15, stress: 6, suspicion: 2, hp: -3 },
    feeling: '你看得出他想問值不值得，但最後什麼都沒說。',
    tier,
    supplyFocus: 'mixed',
    completedGoal: false,
    endsDay: false,
  }
}

const interactOutcome = (tier: ActionTier): ResolvedAction => {
  if (tier === 'success') {
    return {
      title: '與對方互動',
      lines: [
        '你們終於把今天最難開口的那句話說了出來。',
        '事情沒有變好太多，但至少沒有繼續卡在彼此心裡發酵。',
      ],
      effect: { trust: 8, suspicion: -4, stress: -3, stamina: -5 },
      feeling: '他回話的聲音還是很低，但你知道那不再只是防備。',
      tier,
      supplyFocus: 'mixed',
      completedGoal: true,
      endsDay: false,
      behavior: 'cooperative',
    }
  }

  if (tier === 'normal') {
    return {
      title: '與對方互動',
      lines: [
        '你們交換了幾句話，還不夠靠近，但至少沒有再往反方向退。',
        '這種勉強維持的平衡很脆，只能算今天暫時沒有摔下去。',
      ],
      effect: { trust: 3, suspicion: -1, stress: -1, stamina: -5 },
      feeling: '他聽完之後點了點頭，像是在承認這次至少還能談。',
      tier,
      supplyFocus: 'mixed',
      completedGoal: true,
      endsDay: false,
      behavior: 'honest',
    }
  }

  return {
    title: '與對方互動',
    lines: [
      '話一旦說開，就沒有照你預想的方向走。',
      '你們都沒有真正失控，但那種還沒爆開的東西反而更難處理。',
    ],
    effect: { trust: -6, suspicion: 5, stress: 5, stamina: -6 },
    feeling: '他最後沒有回答你，而這種沒說完的事通常不會自己過去。',
    tier,
    supplyFocus: 'mixed',
    completedGoal: false,
    endsDay: false,
    behavior: 'aggressive',
  }
}

const observeOutcome = (tier: ActionTier): ResolvedAction => {
  if (tier === 'success') {
    return {
      title: '觀察對方',
      lines: [
        '你看出來他今天真正緊的是身體，不是心虛。',
        '這種分辨沒有立刻改變什麼，卻讓你少做了一次最壞的假設。',
      ],
      effect: { suspicion: -4, trust: 2, stress: 1, stamina: -4 },
      feeling: '你沒有拆穿任何事，但你也沒有再憑想像把距離推得更遠。',
      tier,
      supplyFocus: 'mixed',
      completedGoal: false,
      endsDay: false,
      behavior: 'honest',
    }
  }

  if (tier === 'normal') {
    return {
      title: '觀察對方',
      lines: [
        '你看見了很多細節，卻很難保證哪一個才是真正重要的。',
        '有時候觀察不會帶來答案，只會帶來更多你得自己決定的空白。',
      ],
      effect: { suspicion: 1, stress: 2, stamina: -4 },
      feeling: '你記住了他的表情，但還是沒辦法確定那代表什麼。',
      tier,
      supplyFocus: 'mixed',
      completedGoal: false,
      endsDay: false,
    }
  }

  return {
    title: '觀察對方',
    lines: [
      '你盯著他太久，最後連自己都開始替他的沉默補上最壞的版本。',
      '沒有證據的防備最危險，因為它總能替自己找到理由。',
    ],
    effect: { suspicion: 6, trust: -3, stress: 4, stamina: -4 },
    feeling: '你沒有真的抓到什麼，卻已經把彼此推向更難回頭的位置。',
    tier,
    supplyFocus: 'mixed',
    completedGoal: false,
    endsDay: false,
    behavior: 'selfish',
  }
}

const restOutcome = (tier: ActionTier): ResolvedAction => {
  if (tier === 'success') {
    return {
      title: '休息',
      lines: [
        '你決定今天先到這裡，至少不要讓最後一點力氣也拿去犯錯。',
        '營地安靜了下來，可你知道夜裡照樣會把東西一點點帶走。',
      ],
      effect: { stamina: 12, stress: -5 },
      feeling: '身體稍微放鬆了一點，但你沒有真的覺得安全。',
      tier,
      supplyFocus: 'mixed',
      completedGoal: true,
      endsDay: true,
    }
  }

  if (tier === 'normal') {
    return {
      title: '休息',
      lines: [
        '你提早收手，讓今天在更糟之前停下來。',
        '這不是修復，只是避免再多添一筆會留下來的事。',
      ],
      effect: { stamina: 7, stress: -2 },
      feeling: '他沒有反對，只是看了看天色，像是在算你們還剩多少明天。',
      tier,
      supplyFocus: 'mixed',
      completedGoal: true,
      endsDay: true,
    }
  }

  return {
    title: '休息',
    lines: [
      '你明明停下來了，腦子卻沒有跟著停。',
      '有些時候休息不是恢復，只是讓壞念頭有更多地方可以停。',
    ],
    effect: { stamina: 2, stress: 3, suspicion: 1 },
    feeling: '你們都坐了下來，但今天沒有真的結束。',
    tier,
    supplyFocus: 'mixed',
    completedGoal: false,
    endsDay: true,
  }
}

export function resolveDayAction(
  actionId: ActionId,
  state: Pick<ReturnType<typeof useProjectStore.getState>, 'day' | 'stamina' | 'water' | 'food' | 'trust' | 'suspicion' | 'stress'>,
  _goal: DailyGoal,
  _prompt?: NarrativeEvent | null,
): ResolvedAction {
  void _goal
  void _prompt
  const tier = rollActionTier(actionId, state)

  switch (actionId) {
    case 'beach_search':
      return beachOutcome(tier)
    case 'forest_search':
      return forestOutcome(tier)
    case 'wreck_explore':
      return wreckOutcome(tier)
    case 'interact':
      return interactOutcome(tier)
    case 'observe':
      return observeOutcome(tier)
    case 'rest':
      return restOutcome(tier)
  }
}

export function isGoalCompletedByAction(goal: DailyGoal, action: ResolvedAction) {
  if (action.completedGoal) return true

  switch (goal.key) {
    case 'find_water':
      return (action.effect.water ?? 0) > 0
    case 'find_food':
      return (action.effect.food ?? 0) > 0
    case 'ease_tension':
      return (action.effect.trust ?? 0) > 0 && (action.effect.suspicion ?? 0) <= 0
    case 'search_wreck':
      return action.title === '殘骸探索' && action.tier !== 'failure'
    case 'hold_together':
      return (action.effect.stress ?? 0) < 0 || (action.effect.stamina ?? 0) > 0
  }
}

export function getEndingState(state: ReturnType<typeof useProjectStore.getState>): EndingKey {
  const {
    hp,
    trust,
    suspicion,
    stress,
    water,
    food,
    otherAlive,
    visitedNodes,
    flags,
    selfishCount,
    honestCount,
    cooperativeCount,
    aggressiveCount,
  } = state

  const totalSupply = water + food

  const visitedSet = new Set(visitedNodes)

  if (flags.includes('mutual_ruin') || (hp <= 0 && !otherAlive)) return 'annihilation'
  if (flags.includes('killed_by_companion')) return 'murdered'
  if (flags.includes('killed_companion')) return 'murderer'
  if (flags.includes('accidental_killing')) return 'accidental_killing'
  if ((flags.includes('escaped_together_window') || visitedSet.has('endgame_together_on_signal_rock')) && hp > 0 && trust >= 55) return 'escape'
  if (hp <= 0 && (totalSupply <= 0 || flags.includes('resource_crack'))) return 'starved'
  if (hp <= 0 && (flags.includes('cold_war_started') || visitedSet.has('chain_cold_war_night'))) return 'cold_war_death'
  if (stress >= 95 || ((stress >= 88 && (selfishCount >= 3 || aggressiveCount >= 2)) || visitedSet.has('hallucination_second_you'))) return 'mental_break'
  if (!otherAlive || flags.includes('other_left_behind') || flags.includes('they_walked_away') || visitedSet.has('endgame_returned_to_empty_fire')) {
    return flags.includes('betrayed_them') || suspicion >= 75 ? 'betrayed' : 'lone_survivor'
  }
  if (flags.includes('betrayed_them') || flags.includes('escape_window_selfish') || visitedSet.has('chain_betrayal_edge') || (selfishCount >= 4 && trust < 35 && suspicion > 60)) return 'betrayed'
  if (flags.includes('false_peace_chosen') || flags.includes('false_peace_mask') || (trust >= 32 && trust <= 62 && suspicion >= 35 && suspicion <= 72)) return 'false_peace'
  if (trust >= 72 && suspicion < 35 && stress < 60 && cooperativeCount >= 3 && honestCount >= 2) return 'mutual_trust'
  return 'lone_survivor'
}



