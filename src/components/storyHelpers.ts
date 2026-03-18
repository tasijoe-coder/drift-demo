import { useEffect, useState } from 'react'

import { useProjectStore, type Weather } from '../store/useProjectStore'
import type { NarrativeEffect, RandomOutcome } from '../hooks/useEncounter'

export type DistortionLevel = 0 | 1 | 2 | 3

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
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes driftPulse {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.38; }
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
      '三十天後，你們都還站著。',
      '這不是因為從沒猜疑過，而是因為每一次最難看的選擇前，還是有人先把手縮了回去。',
      '你終究沒有把對方變成最後的代價。',
    ],
  },
  murdered: {
    title: '被殺',
    text: [
      '你撐過了風、鹽、飢餓，最後卻倒在另一個人面前。',
      '真正可怕的不是死亡，而是你其實早就知道事情可能會走到這裡。',
      '你只是不願意承認。',
    ],
  },
  murderer: {
    title: '殺人',
    text: [
      '你活到了最後。',
      '只是這段路再也不能被叫做共同求生。',
      '那個位置空著，而你知道它為什麼空著。',
    ],
  },
  starved: {
    title: '餓死',
    text: [
      '不是某一件事殺了你。',
      '是每天都少一點、每天都不夠、每天都覺得也許還能再撐一晚。',
      '最後，身體比任何承諾都先倒下。',
    ],
  },
  lone_survivor: {
    title: '獨活',
    text: [
      '你留到了最後，身邊卻已經沒有人能替這三十天作證。',
      '海還在，風也還在。',
      '只剩你得自己決定，這算不算活下來。',
    ],
  },
  betrayed: {
    title: '被背叛',
    text: [
      '你一直知道對方未必值得信。',
      '真正讓人難受的，是你後來也分不清自己是早就看見了，還是故意裝沒看見。',
      '背叛從來不是那一下才開始。',
    ],
  },
  mental_break: {
    title: '精神崩潰',
    text: [
      '到了最後，最大的敵人已經不是島，也不是另一個人。',
      '是你腦子裡那個不斷重播、改寫、放大一切的聲音。',
      '你還活著，但已經回不到原來的自己。',
    ],
  },
  accidental_killing: {
    title: '誤殺',
    text: [
      '你不是故意的。',
      '可這句話沒有任何辦法把人再帶回來，也沒有辦法讓你重新相信自己的手。',
      '有些意外，比蓄意更難活著背下去。',
    ],
  },
  cold_war_death: {
    title: '冷戰死亡',
    text: [
      '沒有誰真的先動手。',
      '你們只是把每一句該說的話都留給了更晚，最後讓那份更晚直接變成了結局。',
      '有些死亡不是爆炸，是長期的放棄。',
    ],
  },
  false_peace: {
    title: '偽和平',
    text: [
      '你們看起來像撐到了最後。',
      '只是那份和平更像停戰，不像信任。',
      '也許你們都知道，自己只是累到再也吵不動了。',
    ],
  },
  escape: {
    title: '逃離成功',
    text: [
      '最後真的有船看見了你們留下的訊號。',
      '離開這座島時，海風沒有替任何人洗掉這三十天。',
      '你們只是終於有機會帶著這些事，活到島外去。',
    ],
  },
  annihilation: {
    title: '全滅',
    text: [
      '到了最後，懷疑、恐懼和疲憊把一切一起拖了下去。',
      '沒有贏家，也沒有誰真的比誰更正確。',
      '只剩下誰也沒能離開。',
    ],
  },
}

export function clampZeroToHundred(value: number) {
  return Math.max(0, Math.min(100, value))
}

export function clampResource(value: number) {
  return Math.max(0, Math.min(12, value))
}

export function clampOddities(value: number) {
  return Math.max(0, Math.min(8, value))
}

export function useTypewriterText(text: string, enabled: boolean, speed = 70) {
  const [displayedText, setDisplayedText] = useState('')

  useEffect(() => {
    if (!enabled) {
      const timer = window.setTimeout(() => {
        setDisplayedText('')
      }, 0)

      return () => {
        window.clearTimeout(timer)
      }
    }

    if (displayedText.length >= text.length) {
      return
    }

    const timer = window.setTimeout(() => {
      setDisplayedText(text.slice(0, displayedText.length + 1))
    }, speed)

    return () => {
      window.clearTimeout(timer)
    }
  }, [displayedText, enabled, speed, text])

  return displayedText
}

export function useRevealBlocks(blocks: string[], key: string, enabled: boolean, initialDelay = 280, stepDelay = 920) {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisibleCount(0)
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [key])

  useEffect(() => {
    if (!enabled || visibleCount >= blocks.length) {
      return
    }

    const delay = visibleCount === 0 ? initialDelay : stepDelay
    const timer = window.setTimeout(() => {
      setVisibleCount((count) => Math.min(count + 1, blocks.length))
    }, delay)

    return () => {
      window.clearTimeout(timer)
    }
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

export function distortLine(line: string, level: DistortionLevel, unreliable = false, index = 0) {
  if (level === 0) return line
  if (level === 1) return index === 0 ? `${line} 你不確定自己是不是比剛才更快下了判斷。` : line
  if (level === 2) {
    if (unreliable && index === 1) return `${line} 可你腦子裡有一個部分一直覺得，事情剛才不是這樣。`
    return `${line} 你聽著自己的判斷，卻有點像在聽另一個人說話。`
  }
  if (unreliable) return `${line} 你忽然記不清，這一幕究竟是現在發生，還是你已經在腦子裡走過一次。`
  return `${line} 你甚至懷疑，剛才那個念頭是不是本來就不是你的。`
}

export function distortChoiceText(text: string, level: DistortionLevel, index: number) {
  if (level === 0) return text
  if (level === 1) return index === 0 ? `${text}。大概。` : text
  if (level === 2) return index === 1 ? `${text}。至少現在看起來還算合理。` : `${text}。你希望這次不是誤判。`
  return index === 0 ? `${text}。現在就做。` : `${text}。不然事情只會更糟。`
}

export function distortFeeling(feeling: string, level: DistortionLevel, unreliable = false) {
  if (level === 0) return feeling
  if (level === 1) return unreliable ? `${feeling} 只是你說不準哪一部分是你自己先想出來的。` : feeling
  if (level === 2) return `${feeling} 結果沒有完全偏離，但也沒有完整落在你以為的位置。`
  return `${feeling} 你甚至分不清，是事情真的這樣發生，還是你已經把它記成了另一個版本。`
}

export function pickRandomOutcome(outcomes: RandomOutcome[] | undefined) {
  if (!outcomes || outcomes.length === 0) return null
  const roll = Math.random()
  let cursor = 0
  for (const outcome of outcomes) {
    cursor += outcome.chance
    if (roll <= cursor) return outcome
  }
  return outcomes[outcomes.length - 1]
}

export function mergeEffect(base: NarrativeEffect, extra?: NarrativeEffect) {
  return {
    trust: (base.trust ?? 0) + (extra?.trust ?? 0),
    resource: (base.resource ?? 0) + (extra?.resource ?? 0),
    stress: (base.stress ?? 0) + (extra?.stress ?? 0),
    suspicion: (base.suspicion ?? 0) + (extra?.suspicion ?? 0),
    stamina: (base.stamina ?? 0) + (extra?.stamina ?? 0),
    hp: (base.hp ?? 0) + (extra?.hp ?? 0),
    oddities: (base.oddities ?? 0) + (extra?.oddities ?? 0),
  }
}

export function getTrustDescriptor(trust: number) {
  if (trust >= 62) return '不穩'
  if (trust >= 35) return '緊張'
  return '破裂'
}

export function getStressDescriptor(stress: number) {
  if (stress < 35) return '低'
  if (stress < 72) return '上升'
  return '崩潰'
}

export function getStaminaDescriptor(stamina: number) {
  if (stamina >= 62) return '尚可'
  if (stamina >= 30) return '疲憊'
  return '極限'
}

export function getResourceDescriptor(resource: number) {
  if (resource >= 7) return '暫時夠撐'
  if (resource >= 4) return '正在變薄'
  if (resource >= 2) return '快見底了'
  return '幾乎空了'
}

export function getAmbientLine(day: number, weather: Weather, isNight: boolean, resource: number) {
  const dayText = day >= 28 ? '最後幾天，連風都像在催你們下判斷。' : day >= 18 ? '日子拖長之後，連沉默都像一種立場。' : '島上還沒有答案，但每一天都在把答案逼近。'
  const weatherText = weather === 'rain' ? '雨還貼在空氣裡。' : weather === 'cloudy' ? '天色悶著不散。' : '海面暫時亮了一點。'
  const timeText = isNight ? '夜裡的聲音比白天更像人。' : '白天總讓每個動作更難裝作沒被看見。'
  const resourceText = resource <= 2 ? '你們都知道，剩下的東西不夠再浪費。' : '補給還沒完全空掉，這反而讓每次分配更刺眼。'
  return `${dayText} ${weatherText} ${timeText} ${resourceText}`
}

export function getDailyConsequence(day: number, weather: Weather, current: { resource: number; stamina: number; stress: number; hp: number }) {
  const phasePressure = day <= 5 ? 1 : day <= 12 ? 2 : day <= 20 ? 3 : day <= 27 ? 4 : 5
  const effect: NarrativeEffect = {
    resource: -1,
    stamina: -(5 + phasePressure * 2),
    stress: 1 + Math.floor(phasePressure / 2),
  }

  if (weather === 'rain') effect.stress = (effect.stress ?? 0) + 1

  const projectedResource = current.resource + (effect.resource ?? 0)
  const projectedStamina = current.stamina + (effect.stamina ?? 0)

  if (projectedResource <= 0) {
    effect.hp = (effect.hp ?? 0) - (day <= 10 ? 8 : day <= 20 ? 12 : 16)
    effect.stress = (effect.stress ?? 0) + (day <= 10 ? 6 : day <= 20 ? 8 : 10)
    effect.suspicion = (effect.suspicion ?? 0) + 2
  }

  if (projectedStamina <= 14) {
    effect.hp = (effect.hp ?? 0) - 4
    effect.stress = (effect.stress ?? 0) + 3
  }

  return effect
}

export function buildShiftNarrative(
  before: { trust: number; suspicion: number; stress: number; resource: number; stamina: number; hp: number },
  after: { trust: number; suspicion: number; stress: number; resource: number; stamina: number; hp: number },
) {
  const lines: string[] = []
  const trustDelta = after.trust - before.trust
  const suspicionDelta = after.suspicion - before.suspicion
  const stressDelta = after.stress - before.stress
  const resourceDelta = after.resource - before.resource
  const staminaDelta = after.stamina - before.stamina
  const hpDelta = after.hp - before.hp

  if (trustDelta >= 5) lines.push('對方沒有完全放下防備，但看你的眼神短暫地鬆了一點。')
  else if (trustDelta <= -5) lines.push('他沒有立刻翻臉，只是把那份不舒服記得更牢。')

  if (suspicionDelta >= 5) lines.push('有什麼東西在你們中間變得更容易被往壞處想。')
  else if (suspicionDelta <= -3) lines.push('至少這一次，懷疑沒有繼續往更深的地方走。')

  if (resourceDelta > 0) lines.push('你知道今晚不會立刻見底，但這種喘息通常不會太久。')
  else if (resourceDelta < -1) lines.push('補給又薄了一層，明天的每句話都會更難說得漂亮。')

  if (stressDelta >= 6) lines.push('你幾乎能感覺到腦子裡某個地方正在變得更吵。')
  else if (stressDelta <= -3) lines.push('氣氛沒有真的輕鬆，只是那股一直頂著胸口的東西稍微退了一點。')

  if (staminaDelta <= -10) lines.push('身體先把代價收下了。你很快就會在判斷裡看見它。')
  if (hpDelta < 0) lines.push('這次的代價不只留在心裡，還留在了身上。')

  return lines.slice(0, 2)
}

export function buildDiaryEntry(day: number, eventTitle: string, resultLines: string[]) {
  return [`Day ${day}`, eventTitle, ...resultLines].join('\n')
}

export function getEndingState(state: ReturnType<typeof useProjectStore.getState>): EndingKey {
  const { hp, trust, suspicion, stress, resource, otherAlive, flags, selfishCount, honestCount, cooperativeCount, aggressiveCount } = state

  if (flags.includes('mutual_ruin') || (hp <= 0 && !otherAlive)) return 'annihilation'
  if (flags.includes('killed_by_companion')) return 'murdered'
  if (flags.includes('killed_companion')) return 'murderer'
  if (flags.includes('accidental_killing')) return 'accidental_killing'
  if (flags.includes('escaped_together_window') && hp > 0 && trust >= 55) return 'escape'
  if (hp <= 0 && (resource <= 0 || flags.includes('resource_crack'))) return 'starved'
  if (hp <= 0 && flags.includes('cold_war_started')) return 'cold_war_death'
  if (stress >= 95 || (stress >= 88 && (selfishCount >= 3 || aggressiveCount >= 2))) return 'mental_break'
  if (!otherAlive || flags.includes('other_left_behind') || flags.includes('they_walked_away')) return flags.includes('betrayed_them') || suspicion >= 75 ? 'betrayed' : 'lone_survivor'
  if (flags.includes('betrayed_them') || flags.includes('escape_window_selfish') || (selfishCount >= 4 && trust < 35 && suspicion > 60)) return 'betrayed'
  if (flags.includes('false_peace_chosen') || flags.includes('false_peace_mask') || (trust >= 32 && trust <= 62 && suspicion >= 35 && suspicion <= 72)) return 'false_peace'
  if (trust >= 72 && suspicion < 35 && stress < 60 && cooperativeCount >= 3 && honestCount >= 2) return 'mutual_trust'
  return 'lone_survivor'
}

