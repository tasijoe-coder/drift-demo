import { type ReactNode, useEffect, useRef, useState } from 'react'

import dialogues from '../data/dialogues.json'
import { useEncounter } from '../hooks/useEncounter'
import { useMetaVariables } from '../hooks/useMetaVariables'
import { useProjectStore } from '../store/useProjectStore'
import type { NpcIntent } from '../hooks/useEncounter'
import type { BehaviorType } from '../store/useProjectStore'

type DialogueEntry = {
  text: string
  effects?: {
    trust?: number
    stress?: number
    suspicion?: number
    relationship?: number
    otherTrust?: number
    otherStress?: number
  }
}

type DialogueGroups = {
  companionCamp: {
    lowTrust: DialogueEntry[]
    midTrust: DialogueEntry[]
    highTrust: DialogueEntry[]
    highSuspicion: DialogueEntry[]
  }
}

type EndingKey =
  | 'dead'
  | 'mutual_survival'
  | 'fragile_alliance'
  | 'lonely_survivor'
  | 'betrayed_survival'
  | 'killed_companion_survivor'
  | 'mutual_destruction'
  | 'selfless_survivor'
  | 'selfish_survivor'
  | 'broken_mind'
  | 'trusted_partner'
  | 'manipulator'

type NarrativeOption = {
  key?: 'split' | 'take_more' | 'give_choice'
  text: string
  result: string
  hint?: string
  setFlags?: string[]
  behavior?: BehaviorType
  effects: {
    energy?: number
    relationship?: number
    trust?: number
    stress?: number
    suspicion?: number
    hp?: number
    resources?: Partial<Record<'materials' | 'food' | 'water' | 'oddities', number>>
  }
}

type NarrativeEvent = {
  type?: 'resource' | 'danger' | 'companion'
  text?: string
  options?: NarrativeOption[]
  unreliable?: boolean
  misleadLevel?: 1 | 2 | 3
  distortionVariants?: {
    normal?: string
    distorted?: string
  }
  npcSuggestion?: string
  npcIntent?: NpcIntent
}


type OptionCardProps = {
  text: string
  hint?: string
  label?: string
  onClick: () => void
  dangerMode: boolean
  disabled?: boolean
}

type NightAllocation = 'split' | 'give_other' | 'keep_self' | 'hide'

type DistortionLevel = 0 | 1 | 2 | 3

type FloatingNotice = {
  id: number
  text: string
  tone: 'calm' | 'danger' | 'neutral'
}

const getDistortionLevel = (stress: number, suspicion: number, oddities: number): DistortionLevel => {
  if (stress >= 90 || oddities >= 4) {
    return 3
  }

  if (stress >= 75 || suspicion >= 70) {
    return 2
  }

  if (stress >= 60) {
    return 1
  }

  return 0
}

const appendDistortionLine = (text: string, line: string) => {
  if (text.includes(line)) {
    return text
  }

  return `${text}\n${line}`
}

const getDistortedEventText = (
  text: string,
  level: DistortionLevel,
  variants?: NarrativeEvent['distortionVariants'],
) => {
  const baseText = variants?.normal ?? text
  const distortedText = variants?.distorted ?? baseText

  if (level === 0) {
    return baseText
  }

  if (level === 1) {
    return appendDistortionLine(baseText, '你眨了眨眼，遠處的輪廓像是慢了一瞬。')
  }

  if (level === 2) {
    return appendDistortionLine(distortedText, '你說不準自己剛才看見的，和現在眼前的是不是同一件事。')
  }

  return appendDistortionLine(distortedText, '你忽然記得自己好像已經讀過這段情境。')
}

const getDistortedOptionText = (
  text: string,
  level: DistortionLevel,
  optionIndex: number,
  unreliable = false,
) => {
  if (level === 0) {
    return text
  }

  if (level === 1) {
    return unreliable || optionIndex === 0 ? `${text}……大概。` : text
  }

  if (level === 2) {
    if (optionIndex === 0) {
      return `${text}，應該還來得及。`
    }

    if (optionIndex === 1) {
      return `${text}，至少現在看起來是這樣。`
    }

    return `${text}，先別讓事情更糟。`
  }

  if (optionIndex === 0) {
    return `${text}，現在就做。`
  }

  if (optionIndex === 1) {
    return `${text}，不然一切都會滑掉。`
  }

  return `${text}，你得先把它壓住。`
}

const getDistortedNpcText = (text: string, level: DistortionLevel) => {
  if (level === 0) {
    return text
  }

  if (level === 1) {
    return `${text} ……你聽見最後半句像是慢了一拍。`
  }

  if (level === 2) {
    return `${text} 他的語氣有點不自然，像是連自己也不確定。`
  }

  return `${text} 這句話像是你今晚已經聽過一次。`
}

const getDistortedResultText = (text: string, level: DistortionLevel, unreliable = false) => {
  if (level === 0) {
    return text
  }

  if (level === 1) {
    return unreliable
      ? appendDistortionLine(text, '結果和你心裡預想的，沒有完全疊在一起。')
      : text
  }

  if (level === 2) {
    return appendDistortionLine(text, '事情照著某個方向發生了，但細節和你以為的不太相同。')
  }

  return appendDistortionLine(
    text,
    unreliable
      ? '你甚至分不清，究竟是結果偏掉了，還是你一開始就理解錯了。'
      : '你看著眼前的收場，忽然懷疑自己是不是漏掉了什麼。',
  )
}

const getDistortedDialogueText = (text: string, level: DistortionLevel) => {
  if (level === 0) {
    return text
  }

  if (level === 1) {
    return `${text} 你不確定那個停頓原本就存在，還是你自己補上去的。`
  }

  if (level === 2) {
    return appendDistortionLine(text, '同一句話在你耳裡像有兩種意思。')
  }

  return appendDistortionLine(text, '你一瞬間分不清，這句話是剛說出口，還是早就留在腦子裡了。')
}

const companionDialogues = (dialogues as DialogueGroups).companionCamp
const introLines = [
  '海水退下去時，你先聽見的是風。',
  '然後是自己的咳嗽，和不遠處另一個活下來的人。',
  '你們把能拖回來的東西一件件搬上岸。沒有人介紹自己，也沒有人先說謝謝。',
  '島很大。能吃的東西很少。真正麻煩的是，你很快就會需要那個人。',
  '你不知道他是誰。',
  '也不知道，在接下來的日子裡——',
  '他會幫你。',
  '還是殺了你。',
  '你沒有選擇。',
  '至少現在，還沒有。',
]
const randomFrom = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]
const endings: Record<EndingKey, { title: string; text: string }> = {
  dead: {
    title: '未能撐過',
    text: '第三十天沒有真的到來。海風還在，浪也還在，只是你再也撐不起那具早已耗空的身體。',
  },
  mutual_survival: {
    title: '共同活下來',
    text: '你們都活到了最後。不是因為從未動搖，而是因為在最糟的時候，仍然沒有把彼此推下去。',
  },
  fragile_alliance: {
    title: '脆弱同盟',
    text: '你們一起撐過了三十天，但每一步都像踩在裂縫上。活下來是真的，信任卻只剩勉強。',
  },
  lonely_survivor: {
    title: '孤身存活',
    text: '你終究活了下來，卻只剩自己能替這三十天作證。島上安靜了，安靜得讓人不敢回頭。',
  },
  betrayed_survival: {
    title: '背叛後的生還',
    text: '你把命保到了最後，卻也把能一起撐下去的東西一點點換掉了。生還是真的，代價也是真的。',
  },
  killed_companion_survivor: {
    title: '踩著對方活下來',
    text: '你撐到了最後，卻再也不能把這段路說成求生。那個位置空著，而你知道它為什麼會空。',
  },
  mutual_destruction: {
    title: '兩敗俱亡',
    text: '懷疑、飢餓與壓力把一切都拖進去。最後留下的不是勝負，只是誰也沒能真正離開。',
  },
  selfless_survivor: {
    title: '無私生還',
    text: '你一次次把份量讓出去，把風險接過來。到了最後，活下來的不只是一個人，還有你沒有放棄的那部分自己。',
  },
  selfish_survivor: {
    title: '自私生還',
    text: '你把每一次選擇都往自己這邊挪，於是活到了最後。只是當海風吹過來時，沒有人會替你證明這值得。',
  },
  broken_mind: {
    title: '精神崩裂',
    text: '你撐到了終點附近，卻沒能把自己完整帶過去。那些被壓住的懷疑和疲憊，最後全都反過來吞掉了你。',
  },
  trusted_partner: {
    title: '彼此信任',
    text: '三十天沒有讓你們變得輕鬆，卻讓你們學會把脆弱交到彼此手裡。這不是浪漫，只是難得沒有崩壞。',
  },
  manipulator: {
    title: '操控者',
    text: '你學會了怎麼讓對方相信、退讓、遲疑，直到一切都照你的方向滑去。最後活下來的人是你，但那已經不是陪伴。',
  },
}

const generateLog = (
  day: number,
  energy: number,
  stress: number,
  hp: number,
  trust: number,
  suspicion: number,
  weather: 'sunny' | 'rain' | 'cloudy',
  isNight: boolean,
  hungerDays: number,
  thirstDays: number,
  flags: string[],
) => {
  const lines = [`Day ${day}`]

  if (day === 1 && flags.includes('opening_day1_done')) {
    lines.push('我們把從殘骸拖回來的資源分了。')
  } else {
    lines.push('天黑之後，白天做過的每個決定都還留在身上。')
  }

  if (flags.includes('opening_split_evenly') || flags.includes('opening_he_shared_fairly')) {
    lines.push('我看著那份平分，卻還是不知道這能不能算是一個開始。')
  } else if (flags.includes('opening_took_more') || flags.includes('opening_he_took_more')) {
    lines.push('東西最後分完了，但那個沉默像刀一樣留在中間。')
  } else if (trust >= 60) {
    lines.push('我還不能說自己相信他，但至少今晚沒有先把背後收回來。')
  } else if (trust <= 35 || suspicion >= 55) {
    lines.push('我不知道能不能把背後留給他。')
  } else {
    lines.push('他沒有多說，我也沒有。那種安靜比浪聲更難讀。')
  }

  if (hungerDays > 0 || thirstDays > 0) {
    lines.push('身體在提醒我，明天的選擇只會更難。')
  } else if (energy < 40 || hp < 40) {
    lines.push('我很累，可睡意沒有真的把腦子帶走。')
  } else if (stress >= 70) {
    lines.push('我以為自己只是累，後來才發現那更像是在防著什麼。')
  } else {
    lines.push('我應該休息，但心裡還在重播白天那一刻。')
  }

  if (weather === 'rain') {
    lines.push('雨聲讓整座島都像在靠近。')
  } else if (weather === 'cloudy') {
    lines.push('天沒有放晴，像是故意不讓人安心。')
  } else {
    lines.push('風暫時平了一點，但我不敢把它當成好消息。')
  }

  if (isNight && suspicion >= 50) {
    lines.push('他就在不遠處。我聽得見他的呼吸，卻不敢把它當成安心。')
  } else if (isNight) {
    lines.push('他就在不遠處，而我還不知道該不該先相信這件事。')
  }

  return lines.join('\n')
}

const mobileSceneStyles = `@keyframes introFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes noticeRise {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}`

const getPhaseSurface = (dayPhase: string) => {
  switch (dayPhase) {
    case 'phase1':
      return {
        shell:
          'bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_32%),linear-gradient(180deg,rgba(7,15,30,0.98),rgba(2,6,23,1))]',
        panel: 'border-white/10 bg-white/[0.045]',
        main: 'border-cyan-300/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(148,163,184,0.025))]',
      }
    case 'phase2':
      return {
        shell:
          'bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.12),_transparent_30%),linear-gradient(180deg,rgba(7,15,30,0.98),rgba(2,6,23,1))]',
        panel: 'border-white/10 bg-white/[0.04]',
        main: 'border-sky-200/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(125,211,252,0.03))]',
      }
    case 'phase3':
      return {
        shell:
          'bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.12),_transparent_28%),linear-gradient(180deg,rgba(7,15,30,0.985),rgba(2,6,23,1))]',
        panel: 'border-amber-200/10 bg-white/[0.038]',
        main: 'border-amber-200/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(245,158,11,0.04))]',
      }
    case 'phase4':
      return {
        shell:
          'bg-[radial-gradient(circle_at_top,_rgba(251,113,133,0.14),_transparent_28%),linear-gradient(180deg,rgba(6,12,24,0.99),rgba(2,6,23,1))]',
        panel: 'border-rose-200/12 bg-white/[0.032]',
        main: 'border-rose-200/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(244,63,94,0.05))]',
      }
    default:
      return {
        shell:
          'bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.18),_transparent_26%),linear-gradient(180deg,rgba(5,10,20,0.995),rgba(2,6,23,1))]',
        panel: 'border-rose-200/14 bg-white/[0.03]',
        main: 'border-rose-300/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(239,68,68,0.06))]',
      }
  }
}
function OptionCard({ text, hint, label, onClick, dangerMode, disabled = false }: OptionCardProps) {
  const buttonClass = disabled
    ? 'cursor-not-allowed border-white/10 bg-white/[0.03] text-white/35 opacity-45'
    : dangerMode
      ? 'border-rose-300/20 bg-rose-500/10 hover:border-rose-200/45 hover:bg-rose-400/16 hover:shadow-[0_18px_40px_rgba(127,29,29,0.28)]'
      : 'border-white/12 bg-white/[0.06] hover:border-white/25 hover:bg-white/[0.12] hover:shadow-[0_18px_40px_rgba(15,23,42,0.34)]'

  const labelClass = dangerMode ? 'border-rose-200/20 text-rose-100/70' : 'border-white/10 text-slate-300/55'

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group w-full min-h-[56px] rounded-[24px] border px-4 py-4 text-left transition duration-200 active:scale-[0.99] backdrop-blur-xl ${buttonClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-semibold leading-7 text-white">{text}</div>
          {hint && <div className="mt-1.5 text-sm leading-6 text-slate-300/78">{hint}</div>}
        </div>
        {label && (
          <div className={`shrink-0 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.32em] ${labelClass}`}>
            {label}
          </div>
        )}
      </div>
    </button>
  )
}

export function StarterShell() {
  useMetaVariables()

  const [showCover, setShowCover] = useState(true)
  const [showIntro, setShowIntro] = useState(false)
  const [showDayOneCard, setShowDayOneCard] = useState(false)
  const [campMessage, setCampMessage] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [resultText, setResultText] = useState('')
  const [resultUnreliable, setResultUnreliable] = useState(false)
  const [showNightAllocation, setShowNightAllocation] = useState(false)
  const [showLogDrawer, setShowLogDrawer] = useState(false)
  const [introStep, setIntroStep] = useState(0)
  const [floatingNotices, setFloatingNotices] = useState<FloatingNotice[]>([])
  const [logEntries, setLogEntries] = useState<string[]>([])
  const floatingNoticeIdRef = useRef(0)
  const previousVisibleStatsRef = useRef<{ energy: number; trust: number; resources: number; environment: number } | null>(null)

  const { currentEvent, rollEvent } = useEncounter()
  const day = useProjectStore((state) => state.day)
  const dayPhase = useProjectStore((state) => state.dayPhase)
  const energy = useProjectStore((state) => state.energy)
  const hp = useProjectStore((state) => state.hp)
  const relationship = useProjectStore((state) => state.relationship)
  const trust = useProjectStore((state) => state.trust)
  const stress = useProjectStore((state) => state.stress)
  const suspicion = useProjectStore((state) => state.suspicion)
  const otherStress = useProjectStore((state) => state.otherStress)
  const otherTrust = useProjectStore((state) => state.otherTrust)
  const selfishCount = useProjectStore((state) => state.selfishCount)
  const honestCount = useProjectStore((state) => state.honestCount)
  const cooperativeCount = useProjectStore((state) => state.cooperativeCount)
  const aggressiveCount = useProjectStore((state) => state.aggressiveCount)
  const flags = useProjectStore((state) => state.flags)
  const hungerDays = useProjectStore((state) => state.hungerDays)
  const thirstDays = useProjectStore((state) => state.thirstDays)
  const resources = useProjectStore((state) => state.resources)
  const phase = useProjectStore((state) => state.phase)
  const metaVariables = useProjectStore((state) => state.metaVariables)
  const nextDay = useProjectStore((state) => state.nextDay)
  const changePhase = useProjectStore((state) => state.changePhase)
  const modifyEnergy = useProjectStore((state) => state.modifyEnergy)
  const modifyHp = useProjectStore((state) => state.modifyHp)
  const modifyRelationship = useProjectStore((state) => state.modifyRelationship)
  const modifyTrust = useProjectStore((state) => state.modifyTrust)
  const modifyStress = useProjectStore((state) => state.modifyStress)
  const modifySuspicion = useProjectStore((state) => state.modifySuspicion)
  const modifyOtherStress = useProjectStore((state) => state.modifyOtherStress)
  const modifyOtherTrust = useProjectStore((state) => state.modifyOtherTrust)
  const incrementBehavior = useProjectStore((state) => state.incrementBehavior)
  const setHungerDays = useProjectStore((state) => state.setHungerDays)
  const setThirstDays = useProjectStore((state) => state.setThirstDays)
  const addResource = useProjectStore((state) => state.addResource)
  const setFlag = useProjectStore((state) => state.setFlag)

  const logText = generateLog(
    day,
    energy,
    stress,
    hp,
    trust,
    suspicion,
    metaVariables.weather,
    metaVariables.isNight,
    hungerDays,
    thirstDays,
    flags,
  )
  const distortionLevel = getDistortionLevel(stress, suspicion, resources.oddities)
  const displayedResultText = getDistortedResultText(resultText, distortionLevel, resultUnreliable)
  const totalResources = resources.food + resources.water
  const environmentQuality = Math.max(
    0,
    Math.min(
      100,
      48 +
        resources.materials * 8 -
        resources.oddities * 10 +
        (metaVariables.weather === 'sunny' ? 10 : metaVariables.weather === 'cloudy' ? 0 : -8),
    ),
  )

  const pushFloatingNotice = (text: string, tone: FloatingNotice['tone']) => {
    const id = floatingNoticeIdRef.current + 1
    floatingNoticeIdRef.current = id

    setFloatingNotices((current) => [...current, { id, text, tone }])

    window.setTimeout(() => {
      setFloatingNotices((current) => current.filter((notice) => notice.id !== id))
    }, 1900)
  }

  useEffect(() => {
    if (!showIntro) {
      return
    }

    if (introStep >= introLines.length) {
      return
    }

    const timer = window.setTimeout(() => {
      setIntroStep((step) => Math.min(step + 1, introLines.length))
    }, introStep === 0 ? 260 : 1700)

    return () => {
      window.clearTimeout(timer)
    }
  }, [introStep, showIntro])

  useEffect(() => {
    const nextSnapshot = {
      energy,
      trust,
      resources: totalResources,
      environment: environmentQuality,
    }

    if (showCover || showIntro || showDayOneCard) {
      previousVisibleStatsRef.current = nextSnapshot
      return
    }

    const previousSnapshot = previousVisibleStatsRef.current
    if (!previousSnapshot) {
      previousVisibleStatsRef.current = nextSnapshot
      return
    }

    const deltaEnergy = nextSnapshot.energy - previousSnapshot.energy
    const deltaTrust = nextSnapshot.trust - previousSnapshot.trust
    const deltaResources = nextSnapshot.resources - previousSnapshot.resources
    const deltaEnvironment = nextSnapshot.environment - previousSnapshot.environment

    if (deltaEnergy !== 0) {
      pushFloatingNotice(`體力 ${deltaEnergy > 0 ? '+' : ''}${deltaEnergy}`, deltaEnergy > 0 ? 'calm' : 'danger')
    }

    if (deltaTrust !== 0) {
      pushFloatingNotice(`信任 ${deltaTrust > 0 ? '+' : ''}${deltaTrust}`, deltaTrust > 0 ? 'calm' : 'danger')
    }

    if (deltaResources !== 0) {
      pushFloatingNotice(`資源 ${deltaResources > 0 ? '+' : ''}${deltaResources}`, deltaResources > 0 ? 'calm' : 'danger')
    }

    if (deltaEnvironment !== 0) {
      pushFloatingNotice(
        deltaEnvironment > 0 ? '環境稍微穩定了' : '環境變得更差了',
        deltaEnvironment > 0 ? 'neutral' : 'danger',
      )
    }

    previousVisibleStatsRef.current = nextSnapshot
  }, [day, energy, environmentQuality, showCover, showDayOneCard, showIntro, totalResources, trust])

  const openingEncounter: NarrativeEvent & {
    title: string
    options: (NarrativeOption & { key: 'split' | 'take_more' | 'give_choice' })[]
  } = {
    type: 'companion',
    unreliable: false,
    npcSuggestion: undefined,
    title: '沉默的分配',
    text: `你們把從殘骸撿回來的東西，
全部攤在地上。

水、食物、一把刀。

數量不多。

兩個人，不夠分。

他看著你。

沒有說話。

但你知道，他在等你先開口。`,
    options: [
      {
        key: 'split',
        text: '平分資源',
        hint: '信任 +2 / 資源 -1',
        result: '你先把東西分成兩堆，再把那把刀推到中間。他看了你一眼，沒有多說什麼，但最後確實沒再動手多拿。',
        behavior: 'cooperative' as BehaviorType,
        effects: {
          trust: 2,
          resources: {
            food: -1,
          },
        },
      },
      {
        key: 'take_more',
        text: '多拿一點（但不說）',
        hint: '資源 +1 / 信任 -2',
        result: '你把比較完整的那份往自己這邊挪，再假裝那只是順手整理。他看見了，卻什麼也沒說。那份沉默比指責更難受。',
        behavior: 'selfish' as BehaviorType,
        effects: {
          trust: -2,
          resources: {
            food: 1,
          },
        },
      },
      {
        key: 'give_choice',
        text: '把選擇權交給他',
        hint: '信任變動不穩定 / 結果隨機',
        result: '',
        behavior: 'cooperative' as BehaviorType,
        effects: {},
      },
    ],
  } as const
  const isOpeningEncounter = day === 1 && phase === 'encounter' && !flags.includes('opening_day1_done')
  const activeEncounter = isOpeningEncounter ? openingEncounter : currentEvent
  const encounterTitle = isOpeningEncounter ? openingEncounter.title : '遭遇事件'
  const encounterText = isOpeningEncounter
    ? openingEncounter.text
    : currentEvent
      ? getDistortedEventText(currentEvent.text, distortionLevel, (currentEvent as NarrativeEvent).distortionVariants)
      : ''
  const encounterSuggestion = isOpeningEncounter
    ? ''
    : currentEvent?.npcSuggestion
      ? getDistortedNpcText(currentEvent.npcSuggestion, distortionLevel)
      : ''

  const activeDialoguePool =
    suspicion >= 60 || otherTrust <= 25 || otherStress >= 70
      ? companionDialogues.highSuspicion
      : relationship >= 65 && trust >= 60 && otherTrust >= 60 && suspicion <= 35
        ? companionDialogues.highTrust
        : relationship >= 30 || trust >= 45 || otherTrust >= 45
          ? companionDialogues.midTrust
          : companionDialogues.lowTrust

  const getEffectiveNpcIntent = (baseIntent: NpcIntent | undefined): NpcIntent | undefined => {
    if (!baseIntent) {
      return undefined
    }

    if (cooperativeCount >= 4 && honestCount >= 3 && baseIntent === 'uncertain') {
      return 'helpful'
    }

    if (selfishCount >= 4 && baseIntent === 'helpful') {
      return 'uncertain'
    }

    if (aggressiveCount >= 3 && baseIntent !== 'selfish') {
      return 'uncertain'
    }

    if (otherStress >= 75) {
      if (baseIntent === 'helpful') {
        return 'uncertain'
      }

      return 'selfish'
    }

    if (suspicion >= 65) {
      if (baseIntent === 'helpful') {
        return 'uncertain'
      }

      if (baseIntent === 'uncertain') {
        return 'selfish'
      }
    }

    if (trust >= 70 && suspicion < 35 && otherStress < 45) {
      if (baseIntent === 'uncertain') {
        return 'helpful'
      }

      if (baseIntent === 'selfish') {
        return 'uncertain'
      }
    }

    return baseIntent
  }

  const getNpcChoiceType = (text: string) => {
    const followKeywords = ['照他的話', '跟著建議', '聽對方的', '按他的意思', '先照他說的']
    const rejectKeywords = ['拒絕', '不照做', '不聽他的', '別管他的', '反駁']

    if (followKeywords.some((keyword) => text.includes(keyword))) {
      return 'follow'
    }

    if (rejectKeywords.some((keyword) => text.includes(keyword))) {
      return 'reject'
    }

    return 'independent'
  }

  const applyNpcSuggestionOutcome = (
    event: NarrativeEvent,
    option: NarrativeOption,
    resolvedEffects: NarrativeOption['effects'],
    resolvedResult: string,
  ) => {
    if (!event.npcSuggestion || !event.npcIntent) {
      return { resolvedEffects, resolvedResult }
    }

    const choiceType = getNpcChoiceType(option.text)
    const effectiveNpcIntent = getEffectiveNpcIntent(event.npcIntent)
    let nextResult = resolvedResult

    if (choiceType === 'follow') {
      if (effectiveNpcIntent === 'helpful') {
        resolvedEffects.trust = (resolvedEffects.trust ?? 0) + 3
        resolvedEffects.relationship = (resolvedEffects.relationship ?? 0) + 2
        resolvedEffects.stress = (resolvedEffects.stress ?? 0) - 1
        nextResult += ' 這次對方的判斷確實替你們撐住了局面。'
      } else if (effectiveNpcIntent === 'selfish') {
        resolvedEffects.trust = (resolvedEffects.trust ?? 0) + 2
        resolvedEffects.suspicion = (resolvedEffects.suspicion ?? 0) + 2
        const resourceType = resolvedEffects.resources?.food !== undefined
          ? 'food'
          : resolvedEffects.resources?.water !== undefined
            ? 'water'
            : undefined

        if (resourceType && resolvedEffects.resources) {
          resolvedEffects.resources[resourceType] = (resolvedEffects.resources[resourceType] ?? 0) - 1
        } else {
          resolvedEffects.energy = (resolvedEffects.energy ?? 0) - 5
        }

        nextResult += ' 你照做了，但最後多讓出去的那一口，沒有真的回到你這邊。'
      } else if (effectiveNpcIntent === 'uncertain') {
        resolvedEffects.stress = (resolvedEffects.stress ?? 0) + 2
        resolvedEffects.suspicion = (resolvedEffects.suspicion ?? 0) + 2
        nextResult += ' 你順著那句話走下去，卻沒有得到足夠穩的答案。'
      }
    } else if (choiceType === 'reject') {
      if (effectiveNpcIntent === 'helpful') {
        resolvedEffects.trust = (resolvedEffects.trust ?? 0) - 4
        resolvedEffects.relationship = (resolvedEffects.relationship ?? 0) - 2
        nextResult += ' 你把一個本來能穩住局面的選擇親手推開了。'
      } else if (effectiveNpcIntent === 'selfish') {
        resolvedEffects.suspicion = (resolvedEffects.suspicion ?? 0) + 1
        resolvedEffects.trust = (resolvedEffects.trust ?? 0) - 1
        nextResult += ' 你拒絕得很及時，但那份防備也被對方看見了。'
      } else if (effectiveNpcIntent === 'uncertain') {
        resolvedEffects.stress = (resolvedEffects.stress ?? 0) + 1
        nextResult += ' 你躲開了那句話，代價是接下來只能相信自己。'
      }
    } else {
      if (effectiveNpcIntent === 'helpful') {
        resolvedEffects.trust = (resolvedEffects.trust ?? 0) - 1
        nextResult += ' 你沒有完全依靠對方，卻也錯過了一點本來能靠近的空間。'
      } else if (effectiveNpcIntent === 'selfish') {
        resolvedEffects.suspicion = (resolvedEffects.suspicion ?? 0) + 2
        nextResult += ' 你不願被牽著走，但那份自保讓場面更像各自求生。'
      } else if (effectiveNpcIntent === 'uncertain') {
        resolvedEffects.stress = (resolvedEffects.stress ?? 0) + 1
        resolvedEffects.suspicion = (resolvedEffects.suspicion ?? 0) + 1
        nextResult += ' 你把決定留在自己手裡，心裡卻沒有因此更安穩。'
      }
    }

    if (selfishCount >= 3) {
      resolvedEffects.suspicion = (resolvedEffects.suspicion ?? 0) + 1
      resolvedEffects.trust = (resolvedEffects.trust ?? 0) - 1
    }

    if (cooperativeCount >= 3 && effectiveNpcIntent !== 'selfish') {
      resolvedEffects.trust = (resolvedEffects.trust ?? 0) + 1
    }

    if (honestCount >= 3 && event.type === 'companion' && effectiveNpcIntent !== 'selfish') {
      resolvedEffects.trust = (resolvedEffects.trust ?? 0) + 1
      resolvedEffects.suspicion = (resolvedEffects.suspicion ?? 0) - 1
    }

    if (aggressiveCount >= 3) {
      resolvedEffects.stress = (resolvedEffects.stress ?? 0) + 1
    }

    return { resolvedEffects, resolvedResult: nextResult }
  }

  const resolveEncounterOutcome = (event: NarrativeEvent, option: NarrativeOption, driftRoll: number) => {
    const eventUnreliable = event.unreliable
    const misleadLevel = event.misleadLevel ?? 1
    const resolvedEffects: NarrativeOption['effects'] = {
      ...option.effects,
      resources: option.effects.resources ? { ...option.effects.resources } : undefined,
    }
    let resolvedResult = option.result

    if (!eventUnreliable) {
      return { resolvedEffects, resolvedResult }
    }

    const unreliableJudgmentActive = distortionLevel > 0
    const flagPressure = flags.some((flag) => /(lied|hid_|accused|silent|oddity_exposure)/.test(flag)) ? 0.08 : 0
    const oddityPressure = resources.oddities >= 4 ? 0.06 : 0
    const driftChance =
      (unreliableJudgmentActive ? 0.08 : 0.02) +
      misleadLevel * 0.11 +
      flagPressure +
      oddityPressure +
      distortionLevel * 0.04
    if (driftRoll >= driftChance) {
      return { resolvedEffects, resolvedResult }
    }

    const resourceEntry = Object.entries(resolvedEffects.resources ?? {}).find(([, amount]) => (amount ?? 0) > 0)
    if (resourceEntry && resolvedEffects.resources) {
      const [resourceType, amount] = resourceEntry
      const resourceLoss = misleadLevel >= 3 ? 2 : 1
      resolvedEffects.resources[resourceType as 'materials' | 'food' | 'water' | 'oddities'] = Math.max(0, (amount ?? 0) - resourceLoss)
      if (misleadLevel >= 2) {
        resolvedEffects.suspicion = (resolvedEffects.suspicion ?? 0) + 1
      }
      resolvedResult += misleadLevel >= 3
        ? ' 你原本以為自己拿到了確實的收穫，可等回到手邊時，才發現大半只是被緊張與錯覺拼湊出來的影子。'
        : ' 可真正帶回手裡的東西比你原本以為的還少，像是某個關鍵細節在途中被海風悄悄拿走了。'
      return { resolvedEffects, resolvedResult }
    }

    if ((resolvedEffects.trust ?? 0) > 0) {
      resolvedEffects.trust = Math.max(0, (resolvedEffects.trust ?? 0) - (misleadLevel + 1))
      resolvedResult += misleadLevel >= 2
        ? ' 對方的反應和你以為的完全不一樣，像是你從一開始就把那句話聽成了另一個意思。'
        : ' 對方雖然點頭了，但那份信任並沒有如你預期地真正落在地上。'
      return { resolvedEffects, resolvedResult }
    }

    if ((resolvedEffects.relationship ?? 0) > 0) {
      resolvedEffects.relationship = Math.max(0, (resolvedEffects.relationship ?? 0) - (misleadLevel + 1))
      resolvedResult += misleadLevel >= 2
        ? ' 等你回過神來，才發現自己剛才理解錯了對方的表情和停頓，彼此之間其實沒有因此靠近多少。'
        : ' 可等你回過神來，才發現彼此之間其實沒有因此靠近多少。'
      return { resolvedEffects, resolvedResult }
    }

    if ((resolvedEffects.stress ?? 0) < 0) {
      resolvedEffects.stress = Math.min(0, (resolvedEffects.stress ?? 0) + (misleadLevel + 1))
      resolvedResult += misleadLevel >= 2
        ? ' 那份短暫的安心很快就散掉了，你甚至開始懷疑自己是不是把原本就不存在的安全感誤認成了答案。'
        : ' 那份短暫的安心很快就散掉了，像是你只是暫時說服了自己。'
      return { resolvedEffects, resolvedResult }
    }

    resolvedResult += misleadLevel >= 3
      ? ' 事後回想，你幾乎無法確定自己剛才看到、聽到，甚至記得的東西裡，到底有多少是真的。'
      : ' 事後回想，你甚至不確定自己剛才看到或聽到的東西有多少是真的。'
    return { resolvedEffects, resolvedResult }
  }

  const phaseSurface = getPhaseSurface(dayPhase)
  const stressDanger = stress > 70
  const foodDanger = resources.food <= 0
  const waterDanger = resources.water <= 0
  const oddityDanger = resources.oddities >= 4 || flags.includes('oddity_exposure')
  const shellAccent = stressDanger ? 'border-rose-400/20 shadow-[0_0_70px_rgba(248,113,113,0.10)]' : 'border-white/10'
  const mainCardAccent = stressDanger ? 'shadow-[0_0_42px_rgba(248,113,113,0.08)]' : 'shadow-2xl shadow-black/20'
  const narrativeTagTone = stressDanger ? 'text-rose-200/80' : 'text-cyan-300/80'
  const narrativeButtonTone = stressDanger
    ? 'border-rose-400/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20'
    : 'border-cyan-300/25 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20'
  const restartDemo = () => {
    useProjectStore.setState((state) => ({
      day: 1,
      dayPhase: 'phase1',
      energy: 100,
      hp: 100,
      relationship: 0,
      trust: 50,
      stress: 0,
      suspicion: 0,
      otherStress: 0,
      otherTrust: 50,
      selfishCount: 0,
      honestCount: 0,
      cooperativeCount: 0,
      aggressiveCount: 0,
      hungerDays: 0,
      thirstDays: 0,
      flags: [],
      resources: {
        materials: 0,
        food: 3,
        water: 3,
        oddities: 0,
      },
      phase: 'encounter',
      metaVariables: {
        ...state.metaVariables,
      },
    }))
    setShowCover(true)
    setShowIntro(false)
    setShowDayOneCard(false)
    setShowLogDrawer(false)
    setIntroStep(0)
    setCampMessage('')
    setShowResult(false)
    setResultText('')
    setResultUnreliable(false)
    setShowNightAllocation(false)
    setFloatingNotices([])
    setLogEntries([])
    previousVisibleStatsRef.current = null
    rollEvent()
  }

  const getEnding = (): EndingKey => {
    const betrayalMarkers = ['lied', 'stole', 'abandoned', 'hid_', 'kept_more_for_self']
    const betrayalFlags = flags.some((flag) => betrayalMarkers.some((marker) => flag.includes(marker)))
    const otherPersonAlive =
      !flags.includes('killed_companion') &&
      !flags.includes('abandoned_companion') &&
      !flags.includes('left_companion_behind') &&
      otherStress < 100

    if (hp <= 0 || (stress >= 100 && otherStress >= 85) || flags.includes('mutual_destruction')) {
      return 'mutual_destruction'
    }

    if (flags.includes('killed_companion') && hp > 0) {
      return 'killed_companion_survivor'
    }

    if (day >= 30 && hp > 0 && trust >= 75 && cooperativeCount >= 4 && honestCount >= 3 && suspicion < 35 && otherPersonAlive) {
      return 'trusted_partner'
    }

    if (day >= 30 && hp > 0 && selfishCount >= 5 && honestCount <= 1 && suspicion >= 60) {
      return 'manipulator'
    }

    if (day >= 30 && hp > 0 && stress >= 80 && (aggressiveCount >= 3 || selfishCount >= 4)) {
      return 'broken_mind'
    }

    if (day >= 30 && hp > 0 && cooperativeCount >= 5 && selfishCount <= 1) {
      return 'selfless_survivor'
    }

    if (day >= 30 && hp > 0 && selfishCount >= 4 && trust < 35) {
      return 'selfish_survivor'
    }

    if (!otherPersonAlive && hp > 0 && !flags.includes('killed_companion')) {
      return 'lonely_survivor'
    }

    if (hp > 0 && betrayalFlags && suspicion >= 60) {
      return 'betrayed_survival'
    }

    if (hp > 0 && otherPersonAlive && trust >= 60 && suspicion < 40 && stress < 75) {
      return 'mutual_survival'
    }

    if (hp > 0 && otherPersonAlive && trust >= 35 && trust < 60 && suspicion >= 40) {
      return 'fragile_alliance'
    }

    return otherPersonAlive ? 'fragile_alliance' : 'lonely_survivor'
  }

  const resolveSleep = (allocation: NightAllocation) => {
    const nextNotes: string[] = []
    const inEarlyDays = day <= 10
    const inMidDays = day >= 11 && day <= 20

    let playerFed = resources.food > 0
    let playerHydrated = resources.water > 0
    let foodSpent = resources.food > 0 ? 1 : 0
    let waterSpent = resources.water > 0 ? 1 : 0

    switch (allocation) {
      case 'split':
        modifyTrust(4)
        modifyRelationship(4)
        modifyStress(-2)
        modifySuspicion(-5)
        modifyOtherTrust(4)
        modifyOtherStress(-4)
        setFlag('shared_fairly')
        nextNotes.push('今晚你們把剩下的食物和水推到中間，一點一點分開。誰都沒有真正吃飽，卻也暫時沒有讓猜疑先開口。')
        break
      case 'give_other':
        playerFed = resources.food > 1
        playerHydrated = resources.water > 1
        modifyTrust(8)
        modifyRelationship(6)
        modifyStress(2)
        modifySuspicion(-8)
        modifyOtherTrust(6)
        modifyOtherStress(-6)
        setFlag('gave_to_companion')
        nextNotes.push('你把比較完整的份量先讓給對方，自己只留下勉強能撐到天亮的部分。對方接過去時沒有立刻說謝，像是知道這份讓步太重。')
        break
      case 'keep_self':
        modifyTrust(-8)
        modifyRelationship(-6)
        modifyStress(3)
        modifySuspicion(8)
        modifyOtherTrust(-7)
        modifyOtherStress(5)
        setFlag('kept_more_for_self')
        nextNotes.push('你把今晚比較好的份量留在自己手邊。對方沒有立刻爭，可營地裡一下子像少了原本還勉強存在的溫度。')
        break
      case 'hide':
        if (resources.food > foodSpent) {
          foodSpent += 1
        } else if (resources.water > waterSpent) {
          waterSpent += 1
        }
        modifyTrust(-12)
        modifyRelationship(-8)
        modifyStress(4)
        modifySuspicion(16)
        modifyOtherTrust(-10)
        modifyOtherStress(7)
        setFlag('hid_rations')
        nextNotes.push('你在分配前先偷偷藏起一份，表面上誰都沒有少太多，可你知道今晚開始，有些界線已經換了位置。')
        break
    }

    if (foodSpent > 0) {
      addResource('food', -Math.min(foodSpent, resources.food))
    }

    if (waterSpent > 0) {
      addResource('water', -Math.min(waterSpent, resources.water))
    }

    if (playerFed) {
      setHungerDays(0)
    } else {
      const nextHunger = hungerDays + 1
      setHungerDays(nextHunger)

      if (inEarlyDays) {
        modifyStress(8)
        if (nextHunger >= 2) {
          modifyHp(-4)
          modifyStress(4)
          nextNotes.push('你把自己的那份讓掉後，飢餓在夜裡慢慢變硬，像有什麼一直頂在胃裡不肯散去。')
        } else {
          nextNotes.push('今晚你幾乎沒有真正吃到東西，飢餓讓每次翻身都像在提醒你自己做了什麼分配。')
        }
      } else if (inMidDays) {
        modifyStress(14)
        modifyHp(-7)
        nextNotes.push('進入中期後，少吃一晚已經不再只是難受，而是會直接把明天的力氣從身體裡抽掉。')
      } else {
        modifyStress(20)
        modifyHp(-10)
        nextNotes.push('後期的飢餓不再只是折磨，它像在逼你用更糟的方式思考每一口剩下的東西。')
      }
    }

    if (playerHydrated) {
      setThirstDays(0)
    } else {
      const nextThirst = thirstDays + 1
      setThirstDays(nextThirst)

      if (inEarlyDays) {
        modifyStress(10)
        if (nextThirst >= 2) {
          modifyHp(-6)
          modifyStress(5)
          nextNotes.push('你今晚幾乎沒有分到水，喉嚨和頭腦都被乾渴磨得發疼，連睡意都像被一層砂拖住。')
        } else {
          nextNotes.push('那種沒真正喝到水的感覺一路拖到夜裡，讓每一次呼吸都帶著快要起火的躁意。')
        }
      } else if (inMidDays) {
        modifyStress(16)
        modifyHp(-9)
        nextNotes.push('缺水讓每一次呼吸都更乾更沉，身體也比昨天更快見底，像是連明天都被提前削掉了一塊。')
      } else {
        modifyStress(22)
        modifyHp(-13)
        nextNotes.push('後期的缺水像是在直接抽走生命，連躺下來都無法真正放鬆，腦子裡只剩下對下一口水的計算。')
      }
    }

    if (playerFed && playerHydrated) {
      nextNotes.push('至少今晚你自己還分到基本補給，身體暫時不必立刻向你討債。')
    }

    if (flags.includes('camp_reinforced')) {
      modifyStress(-3)
      nextNotes.push('營地先前的加固多少擋住了夜裡最硬的那陣風，讓人總算能短短喘一口氣。')
    }

    if (resources.oddities >= 3 || flags.includes('oddity_exposure')) {
      modifyStress(4)
      nextNotes.push('那些無法解釋的異物仍在營地角落提醒你，有些東西一旦帶回來，就不會只停在物件本身。')
    }

    setShowNightAllocation(false)
    setCampMessage(nextNotes.join(' '))
    modifyEnergy(100)
    changePhase('log')
  }

  const handleResourceSort = () => {
    modifyEnergy(-15)
    const roll = Math.random()

    if (roll < 0.4) {
      addResource('materials', 2)
      setCampMessage('你把營地邊散落的碎材一根根挑開，勉強找出兩份還能派上用場的建材。手上全是木屑，但至少今晚不是空手。')
      return
    }

    addResource('materials', 1)
    setCampMessage('你把混在潮濕碎布和木屑裡的零星材料重新收回來，不多，卻夠讓明天還有點能做的事。')
  }

  const handleFoodSearch = () => {
    modifyEnergy(-20)
    const roll = Math.random()

    if (roll < 0.2) {
      addResource('food', 3)
      setCampMessage('你沿著潮線和林邊來回翻找，最後帶回比預期更多的食物。這點收穫還不足以讓人安心，卻夠讓今晚不必那麼難看。')
      return
    }

    if (roll < 0.8) {
      addResource('food', 2)
      setCampMessage('你繞了很大一圈，總算找到兩份能撐過今晚的食物。真正留下來的不是滿足，而是對明天還得再找一次的預感。')
      return
    }

    modifyStress(4)
    setCampMessage('你幾乎把附近能翻的地方都翻過了，最後仍然只帶回疲憊。回到營地時，飢餓像比出發前更有形狀。')
  }

  const handleWaterSearch = () => {
    modifyEnergy(-15)
    const roll = Math.random()

    if (roll < 0.2) {
      addResource('water', 3)
      setCampMessage('你在石縫深處找到一處還算穩定的取水點，帶回來的水足夠讓今晚和明早都不至於太狼狽。')
      return
    }

    if (roll < 0.85) {
      addResource('water', 2)
      setCampMessage('你沿著低地和石縫慢慢收集，最後勉強帶回兩份淡水。這不算充裕，但至少還能把明天再往後推一點。')
      return
    }

    addResource('water', 1)
    setCampMessage('今天的取水並不順利，你只裝回一點點。那點重量輕得幾乎讓人心裡發空。')
  }

  const handleConversation = () => {
    const dialogue = randomFrom(activeDialoguePool)

    modifyEnergy(-10)
    modifyRelationship(10)

    if (dialogue.effects?.trust) {
      modifyTrust(dialogue.effects.trust)
    }

    if (dialogue.effects?.stress) {
      modifyStress(dialogue.effects.stress)
    }

    if (dialogue.effects?.suspicion) {
      modifySuspicion(dialogue.effects.suspicion)
    }

    if (dialogue.effects?.relationship) {
      modifyRelationship(dialogue.effects.relationship)
    }

    if (dialogue.effects?.otherTrust) {
      modifyOtherTrust(dialogue.effects.otherTrust)
    }

    if (dialogue.effects?.otherStress) {
      modifyOtherStress(dialogue.effects.otherStress)
    }

    setCampMessage(getDistortedDialogueText(dialogue.text, distortionLevel))
  }

  const handleOpeningEncounter = (option: (typeof openingEncounter.options)[number]) => {
    setCampMessage('')
    setResultUnreliable(false)
    setFlag('opening_day1_done')

    if (option.behavior) {
      incrementBehavior(option.behavior)
    }

    if (option.key === 'split') {
      modifyTrust(2)
      addResource('food', -1)
      setFlag('opening_split_evenly')
      setResultText('你先把東西分成兩堆，再把那把刀推到中間。他看了你一眼，沒有多說什麼，但最後確實沒再動手多拿。')
      setShowResult(true)
      return
    }

    if (option.key === 'take_more') {
      modifyTrust(-2)
      addResource('food', 1)
      setFlag('opening_took_more')
      setResultText('你把比較完整的那份往自己這邊挪，再假裝那只是順手整理。他看見了，卻什麼也沒說。那份沉默比指責更難受。')
      setShowResult(true)
      return
    }

    setFlag('opening_handed_choice')

    const openingDecision = randomFrom(['fair', 'selfish'] as const)

    if (openingDecision === 'fair') {
      modifyTrust(2)
      setFlag('opening_he_shared_fairly')
      setResultText('你把選擇權交出去。他沉默了一會，最後還是把東西分得很平均，像是在告訴你這份信任暫時還沒被浪費。')
    } else {
      modifyTrust(-3)
      addResource('food', -1)
      setFlag('opening_he_took_more')
      setResultText('你把選擇權交給他。他沒有客氣，把比較好的那份先留在自己那邊，只留給你一個很難反駁的停頓。')
    }

    setShowResult(true)
  }

    const ending = getEnding()
  const failureEnding = ending === 'mutual_destruction' ? endings[ending] : endings.dead
  const sceneDanger = stressDanger || foodDanger || waterDanger || oddityDanger
  const introComplete = introStep >= introLines.length
  const ambientDescription = `${metaVariables.isNight ? '夜晚' : '白天'} · ${metaVariables.weather === 'rain' ? '雨勢貼得很近' : metaVariables.weather === 'cloudy' ? '天色悶著不散' : '海面暫時放晴'}`
  const currentDiaryEntry = `Day ${day}
${logText}`
  const diaryEntries = phase === 'log'
    ? [currentDiaryEntry, ...logEntries.filter((entry) => entry !== currentDiaryEntry)]
    : logEntries.length > 0
      ? logEntries
      : [currentDiaryEntry]
  const campNarrative = showNightAllocation
    ? `你們都沒有睡。\n\n今晚要怎麼分食物和淡水，會一路影響到明天的眼神、呼吸，還有誰先把話吞回去。\n\n現在剩下的補給只有：食物 ${resources.food} / 淡水 ${resources.water}。`
    : campMessage || [
      '營火壓得很低，火星偶爾才會往上跳一下。',
      energy <= 30 ? '你知道自己還能再動，但每多走一步，判斷都會變鈍。' : '你還有一點力氣能再做一件事，只是不知道值不值得。',
      trust <= 40 || suspicion >= 45 ? '對方坐得不遠，卻沒有先開口。那種沉默比風還難判斷。' : '對方坐在火邊，像是在等你先決定今晚還要不要繼續撐。',
    ].join('\n\n')

  const proceedFromIntro = () => {
    setShowIntro(false)
    setShowDayOneCard(day === 1 && !flags.includes('opening_day1_done'))
  }

  const renderLogDrawer = () => {
    if (!showLogDrawer) {
      return null
    }

    return (
      <>
        <button
          type="button"
          aria-label="關閉日誌"
          onClick={() => {
            setShowLogDrawer(false)
          }}
          className="absolute inset-0 z-30 bg-black/55"
        />
        <aside className="absolute right-0 top-0 z-40 flex h-full w-[86vw] max-w-sm flex-col border-l border-white/10 bg-slate-950/95 px-4 pb-6 pt-5 backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.42em] text-slate-400">Log</div>
              <h2 className="mt-2 text-xl font-semibold text-white">日誌</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowLogDrawer(false)
              }}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs tracking-[0.25em] text-slate-300/72 transition hover:bg-white/[0.08]"
            >
              關閉
            </button>
          </div>
          <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-1">
            {diaryEntries.map((entry, index) => (
              <article key={`${entry}-${index}`} className="rounded-[22px] border border-white/10 bg-white/[0.05] p-4">
                <p className="whitespace-pre-line text-sm leading-7 text-slate-100/88">{entry}</p>
              </article>
            ))}
          </div>
        </aside>
      </>
    )
  }

  const renderScene = ({
    kicker,
    title,
    body,
    actions,
    footer,
  }: {
    kicker: string
    title: string
    body: ReactNode
    actions: ReactNode
    footer?: ReactNode
  }) => (
    <main className={`relative min-h-screen overflow-hidden text-slate-100 ${phaseSurface.shell}`}>
      <style>{mobileSceneStyles}</style>
      <div className="absolute inset-0 bg-[url('/cover.png')] bg-cover bg-center opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-slate-950/72 to-slate-950" />
      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-4 pb-2 pt-4 sm:px-5">
          <div className={`rounded-full border px-3 py-1.5 text-[11px] tracking-[0.32em] text-slate-100/82 backdrop-blur-xl ${phaseSurface.panel} ${shellAccent}`}>
            第 {day} 天 / 30天
          </div>
          <button
            type="button"
            onClick={() => {
              setShowLogDrawer(true)
            }}
            className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-[11px] tracking-[0.32em] text-slate-200/78 backdrop-blur-xl transition hover:bg-white/[0.10]"
          >
            日誌
          </button>
        </div>

        <div className="pointer-events-none absolute inset-x-4 top-16 z-20 space-y-2 sm:inset-x-5">
          {floatingNotices.map((notice) => (
            <div
              key={notice.id}
              className={`rounded-full px-3 py-2 text-center text-xs tracking-[0.24em] backdrop-blur-xl [animation:noticeRise_.45s_ease-out] ${
                notice.tone === 'danger'
                  ? 'border border-rose-200/20 bg-rose-500/18 text-rose-50'
                  : notice.tone === 'calm'
                    ? 'border border-emerald-200/18 bg-emerald-400/16 text-emerald-50'
                    : 'border border-white/10 bg-white/[0.08] text-slate-100'
              }`}
            >
              {notice.text}
            </div>
          ))}
        </div>

        <div className="flex flex-1 flex-col justify-end px-4 pb-4 pt-20 sm:px-5 sm:pb-5">
          <div className="flex-1" />
          <section className={`rounded-[30px] border px-5 py-6 backdrop-blur-2xl ${phaseSurface.main} ${mainCardAccent} ${sceneDanger ? 'border-rose-300/20' : shellAccent}`}>
            <div className="text-[11px] uppercase tracking-[0.38em] text-slate-300/50">{ambientDescription}</div>
            <div className={`mt-4 text-[11px] uppercase tracking-[0.42em] ${narrativeTagTone}`}>{kicker}</div>
            <h2 className="mt-3 text-[clamp(1.8rem,7vw,2.6rem)] font-semibold leading-tight text-white">{title}</h2>
            <div className="mt-4 max-h-[34vh] overflow-y-auto pr-1 text-[1.12rem] leading-[1.95] text-slate-100 sm:max-h-[38vh] sm:text-[1.28rem]">
              {body}
            </div>
            {footer}
          </section>

          <div className="mt-4 space-y-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {actions}
          </div>
        </div>

        {renderLogDrawer()}
      </div>
    </main>
  )

  if (showCover) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
        <style>{mobileSceneStyles}</style>
        <div className="absolute inset-0 bg-[url('/cover.png')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/88 via-black/90 to-black/95" />
        <div className="relative z-10 flex min-h-screen flex-col px-6 pb-6 pt-16 text-center">
          <div className="flex-1" />
          <div className="space-y-5">
            <div className="text-[11px] uppercase tracking-[0.52em] text-slate-300/46">30 Day Survival Narrative</div>
            <h1 className="text-[clamp(2.4rem,10vw,4.2rem)] font-bold tracking-[0.28em] text-white/82 drop-shadow-[0_18px_44px_rgba(0,0,0,0.72)]">
              你能相信他嗎
            </h1>
            <p className="whitespace-pre-line text-base leading-8 text-slate-200/72">
              {'只有兩個人活下來。\n但資源，可能只夠一個人。'}
            </p>
          </div>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => {
              setShowCover(false)
              setShowIntro(true)
              setIntroStep(0)
            }}
            className="min-h-[56px] w-full rounded-[22px] border border-white/16 bg-white/[0.08] px-6 py-4 text-base font-semibold tracking-[0.18em] text-white/88 backdrop-blur-xl transition duration-300 hover:border-white/32 hover:bg-white/[0.16] hover:text-white"
          >
            暫時相信他
          </button>
        </div>
      </main>
    )
  }

  if (showIntro) {
    return (
      <main
        className={`relative min-h-screen overflow-hidden text-slate-100 ${phaseSurface.shell}`}
        onClick={() => {
          if (introComplete) {
            proceedFromIntro()
            return
          }

          setIntroStep(introLines.length)
        }}
      >
        <style>{mobileSceneStyles}</style>
        <div className="absolute inset-0 bg-[url('/cover.png')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/84 via-slate-950/78 to-slate-950" />
        <div className="relative z-10 flex min-h-screen flex-col px-5 pb-6 pt-14">
          <div className="flex-1" />
          <article className={`rounded-[30px] border px-5 py-6 backdrop-blur-2xl ${phaseSurface.main} ${shellAccent}`}>
            <div className="text-[11px] uppercase tracking-[0.42em] text-slate-400">Intro</div>
            <div className="mt-5 space-y-4">
              {introLines.slice(0, introStep).map((line) => (
                <p
                  key={line}
                  className={`leading-[1.95] text-slate-100 [animation:introFadeIn_.6s_ease-out] ${
                    line === '他會幫你。' || line === '還是殺了你。'
                      ? 'text-[1.7rem] font-semibold tracking-[0.14em] text-white'
                      : 'text-[1.08rem]'
                  }`}
                >
                  {line}
                </p>
              ))}
            </div>
          </article>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              if (introComplete) {
                proceedFromIntro()
                return
              }

              setIntroStep(introLines.length)
            }}
            className={`mt-4 min-h-[56px] w-full rounded-[22px] border px-5 py-4 text-base font-semibold transition ${narrativeButtonTone}`}
          >
            {introComplete ? '進入第一天' : '點一下跳過'}
          </button>
        </div>
      </main>
    )
  }

  if (showDayOneCard) {
    return (
      <main className={`relative min-h-screen overflow-hidden text-slate-100 ${phaseSurface.shell}`}>
        <style>{mobileSceneStyles}</style>
        <div className="absolute inset-0 bg-[url('/cover.png')] bg-cover bg-center opacity-18" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/84 via-slate-950/76 to-slate-950" />
        <div className="relative z-10 flex min-h-screen flex-col px-5 pb-6 pt-14 text-center">
          <div className="flex-1" />
          <div className={`rounded-[30px] border px-5 py-8 backdrop-blur-2xl ${phaseSurface.main} ${shellAccent}`}>
            <div className="text-[11px] uppercase tracking-[0.52em] text-slate-400">Day 1</div>
            <h1 className="mt-4 text-[clamp(2rem,9vw,3rem)] font-semibold tracking-[0.14em] text-white">第 1 天</h1>
            <p className="mt-8 whitespace-pre-line text-[1.32rem] leading-[2.2rem] text-slate-100">
              {'你以為自己活下來了。\n\n但真正的問題，\n現在才開始。'}
            </p>
            <div className="mt-8 text-xs tracking-[0.32em] text-slate-300/58">（點擊進入事件）</div>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowDayOneCard(false)
            }}
            className={`mt-4 min-h-[56px] w-full rounded-[22px] border px-5 py-4 text-base font-semibold transition ${narrativeButtonTone}`}
          >
            進入事件
          </button>
        </div>
      </main>
    )
  }

  if (hp <= 0 || stress >= 100) {
    return renderScene({
      kicker: 'Ending State / 終局',
      title: failureEnding.title,
      body: <p className="whitespace-pre-line">{failureEnding.text}</p>,
      footer: <div className="mt-5 text-sm tracking-[0.28em] text-rose-100/70">你撐到了第 {day} 天</div>,
      actions: (
        <OptionCard
          text="重新開始"
          hint="把這三十天重來一次。"
          dangerMode
          onClick={restartDemo}
        />
      ),
    })
  }

  if (phase === 'log' && day >= 30) {
    return renderScene({
      kicker: 'Ending / 結局',
      title: endings[ending].title,
      body: <p className="whitespace-pre-line">{endings[ending].text}</p>,
      footer: <div className="mt-5 text-sm tracking-[0.28em] text-slate-300/62">結局 ID：{ending}</div>,
      actions: (
        <OptionCard
          text="重新開始"
          hint="回到第 1 天，重新決定要相信誰。"
          dangerMode={false}
          onClick={restartDemo}
        />
      ),
    })
  }

  if (phase === 'encounter' && showResult) {
    return renderScene({
      kicker: 'Result / 發生之後',
      title: '事情已經發生了',
      body: <p className="whitespace-pre-line">{displayedResultText}</p>,
      actions: (
        <OptionCard
          text="繼續"
          hint="把剛才那個選擇帶進今晚。"
          dangerMode={stressDanger}
          onClick={() => {
            setShowResult(false)
            changePhase('camp')
          }}
        />
      ),
    })
  }

  if (phase === 'encounter' && !activeEncounter) {
    return renderScene({
      kicker: 'Narrative / 遭遇事件',
      title: '海風裡還沒有答案',
      body: <p>載入遭遇中...</p>,
      actions: (
        <OptionCard
          text="稍等"
          hint="下一個瞬間就會出現。"
          dangerMode={false}
          disabled
          onClick={() => {}}
        />
      ),
    })
  }

  if (phase === 'encounter' && activeEncounter) {
    return renderScene({
      kicker: 'Narrative / 遭遇事件',
      title: encounterTitle,
      body: <p className="whitespace-pre-line">{encounterText}</p>,
      footer: activeEncounter?.npcSuggestion ? (
        <div className="mt-5 rounded-[22px] border border-white/10 bg-black/25 px-4 py-4 text-base leading-8 text-slate-200/88">
          對方低聲說：{encounterSuggestion}
        </div>
      ) : undefined,
      actions: (
        <>
          {activeEncounter.options.map((rawOption, optionIndex) => {
            const option = rawOption as NarrativeOption & { key?: 'split' | 'take_more' | 'give_choice' }

            return (
              <OptionCard
                key={option.text}
                text={getDistortedOptionText(option.text, distortionLevel, optionIndex, !isOpeningEncounter && Boolean((activeEncounter as NarrativeEvent).unreliable))}
                hint={option.hint}
                dangerMode={stressDanger}
                onClick={() => {
                  if (isOpeningEncounter) {
                    handleOpeningEncounter(option as (typeof openingEncounter.options)[number])
                    return
                  }

                  const { setFlags } = option
                  const driftRoll = Math.random()
                  let { resolvedEffects, resolvedResult } = resolveEncounterOutcome(currentEvent as NarrativeEvent, option, driftRoll)
                  ;({ resolvedEffects, resolvedResult } = applyNpcSuggestionOutcome(currentEvent as NarrativeEvent, option, resolvedEffects, resolvedResult))

                  if (option.behavior) {
                    incrementBehavior(option.behavior)

                    if (option.behavior === 'aggressive') {
                      modifyOtherStress(4)
                    }

                    if (option.behavior === 'selfish') {
                      modifyOtherTrust(-2)
                      modifySuspicion(1)
                    }

                    if (option.behavior === 'cooperative') {
                      modifyOtherTrust(2)
                      modifyOtherStress(-1)
                    }

                    if (option.behavior === 'honest') {
                      modifyOtherTrust(2)
                      modifySuspicion(-1)
                    }
                  }

                  if (resolvedEffects.energy !== undefined) {
                    modifyEnergy(resolvedEffects.energy)
                  }

                  if (resolvedEffects.hp !== undefined) {
                    modifyHp(resolvedEffects.hp)
                  }

                  if (resolvedEffects.relationship !== undefined) {
                    modifyRelationship(resolvedEffects.relationship)
                  }

                  if (resolvedEffects.trust !== undefined) {
                    modifyTrust(resolvedEffects.trust)
                  }

                  if (resolvedEffects.stress !== undefined) {
                    modifyStress(resolvedEffects.stress)
                  }

                  if (resolvedEffects.suspicion !== undefined) {
                    modifySuspicion(resolvedEffects.suspicion)
                  }

                  if (resolvedEffects.resources) {
                    Object.entries(resolvedEffects.resources).forEach(([type, amount]) => {
                      if (amount !== undefined) {
                        addResource(type as 'materials' | 'food' | 'water' | 'oddities', amount)
                      }
                    })
                  }

                  setFlags?.forEach((flag) => {
                    setFlag(flag)
                  })

                  setCampMessage('')
                  setResultUnreliable(Boolean((activeEncounter as NarrativeEvent).unreliable))
                  setResultText(resolvedResult)
                  setShowResult(true)
                }}
              />
            )
          })}
        </>
      ),
    })
  }

  if (phase === 'camp' && showNightAllocation) {
    return renderScene({
      kicker: 'Night Allocation / 夜間分配',
      title: '今晚要怎麼分？',
      body: <p className="whitespace-pre-line">{campNarrative}</p>,
      actions: (
        <>
          <OptionCard
            text="平分"
            hint="一起挨餓，也一起保住一點信任。"
            dangerMode={stressDanger}
            onClick={() => resolveSleep('split')}
          />
          <OptionCard
            text="多留給自己"
            hint="你比較穩，但對方不會看不見。"
            dangerMode
            onClick={() => resolveSleep('keep_self')}
          />
          <OptionCard
            text="多留給對方"
            hint="你會更難熬，但今晚的眼神也許會不一樣。"
            dangerMode={false}
            onClick={() => resolveSleep('give_other')}
          />
          <OptionCard
            text="偷藏一份"
            hint="替自己留後手，也替明天留下裂痕。"
            dangerMode
            disabled={resources.food <= 0 && resources.water <= 0}
            onClick={() => resolveSleep('hide')}
          />
          <OptionCard
            text="返回營火旁"
            hint="我還想再想一下。"
            dangerMode={false}
            onClick={() => {
              setShowNightAllocation(false)
            }}
          />
        </>
      ),
    })
  }

  if (phase === 'camp') {
    return renderScene({
      kicker: 'Camp / 營火旁',
      title: '夜還沒結束',
      body: <p className="whitespace-pre-line">{campNarrative}</p>,
      actions: (
        <>
          <OptionCard
            text="整理資源"
            hint="體力 -15 · 可能獲得建材 +1~2。把散掉的東西重新撿回來。"
            dangerMode={stressDanger}
            disabled={energy < 15}
            onClick={handleResourceSort}
          />
          <OptionCard
            text="尋找食物"
            hint="體力 -20 · 常見食物 +2，偶爾更多，也可能空手回來。"
            dangerMode={stressDanger}
            disabled={energy < 20}
            onClick={handleFoodSearch}
          />
          <OptionCard
            text="尋找淡水"
            hint="體力 -15 · 淡水 +1~3。免得明天一早就先被乾渴拖住。"
            dangerMode={stressDanger}
            disabled={energy < 15}
            onClick={handleWaterSearch}
          />
          <OptionCard
            text="與對方交流"
            hint="體力 -10 · 關係 +10，並讓今晚的氣氛往一個方向偏。"
            dangerMode={stressDanger}
            disabled={energy < 10}
            onClick={handleConversation}
          />
          <OptionCard
            text="休息入夜"
            hint="先決定今晚怎麼分食物和水，再替今天收尾。"
            dangerMode={false}
            onClick={() => {
              setShowNightAllocation(true)
            }}
          />
        </>
      ),
    })
  }

  if (phase === 'log') {
    return renderScene({
      kicker: 'Log / 探索日誌',
      title: `Day ${day}`,
      body: <p className="whitespace-pre-line">{logText}</p>,
      footer: campMessage ? (
        <div className="mt-5 rounded-[22px] border border-white/10 bg-black/25 px-4 py-4 text-base leading-8 text-slate-200/88">
          {campMessage}
        </div>
      ) : undefined,
      actions: (
        <OptionCard
          text={day >= 30 ? '查看結局' : `前往第 ${day + 1} 天`}
          hint={day >= 30 ? '看看這三十天最後留下了什麼。' : '把今晚留下的東西帶進明天。'}
          dangerMode={stressDanger}
          onClick={() => {
            setLogEntries((current) => (current[0] === currentDiaryEntry ? current : [currentDiaryEntry, ...current]))

            if (metaVariables.weather === 'rain') {
              modifyStress(5)
            }

            if (day >= 30) {
              changePhase('log')
              return
            }

            nextDay()
            setShowResult(false)
            setResultText('')
            changePhase('encounter')
            setShowNightAllocation(false)
            rollEvent()
          }}
        />
      ),
    })
  }

  return null
}










