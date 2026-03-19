import { useEffect, useMemo, useRef, useState } from 'react'

import { useAmbientAudio } from '../hooks/useAmbientAudio'
import { startAreaEndings, startAreaNodes, type StartAreaChoice, type StartAreaEffect, type StartAreaEnding } from '../data/startAreaNodes'
import { useEncounter, type NarrativeChoice, type NarrativeEffect, type RandomOutcome, type RouteOption } from '../hooks/useEncounter'
import { useMetaVariables } from '../hooks/useMetaVariables'
import { useProjectStore, type AppliedEffectSummary, type DailyGoalKey, type SupplyFocus, type Weather } from '../store/useProjectStore'
import {
  addRiskHints,
  buildDiaryEntry,
  buildEncounterFrame,
  buildShiftNarrative,
  distortLine,
  endings,
  getAmbientLine,
  getDailyGoal,
  getDistortionLevel,
  getEndingState,
  getGoalCompletionLine,
  getGoalFailureLine,
  getRiskHintLine,
  phaseBackgrounds,
  sceneStyles,
  useRevealBlocks,
  useTypewriterText,
  weatherPool,
} from './storyHelpers'

type EchoTone = 'calm' | 'warning' | 'danger'
type StatKind = 'stamina' | 'water' | 'food' | 'trust' | 'suspicion' | 'stress'

type FloatingEcho = { id: number; text: string; tone: EchoTone }
type ButtonProps = { text: string; subtitle?: string; hoverHint?: string; onClick: () => void; disabled?: boolean; disabledReason?: string }

type ChoiceResult = {
  effect: NarrativeEffect
  feeling: string
  flags: string[]
  behavior?: 'selfish' | 'honest' | 'cooperative' | 'aggressive'
  supplyFocus: SupplyFocus
}

const formatSigned = (value: number) => (value > 0 ? '+' + value : '' + value)

const getEchoTone = (value: number, inverted = false): EchoTone => {
  if (value === 0) return 'calm'
  if (inverted) return value > 0 ? 'danger' : 'calm'
  return value > 0 ? 'calm' : 'warning'
}

const getStatTone = (stat: StatKind, value: number): EchoTone => {
  if (stat === 'suspicion' || stat === 'stress') {
    if (value >= 85) return 'danger'
    if (value >= 70) return 'warning'
    return 'calm'
  }
  const ratio = (stat === 'water' || stat === 'food') ? Math.min(value / 5, 1) : Math.min(value / 100, 1)
  if (ratio <= 0.15) return 'danger'
  if (ratio <= 0.3) return 'warning'
  return 'calm'
}

const pickRandomOutcome = (outcomes?: RandomOutcome[]) => {
  if (!outcomes?.length) return null
  const roll = Math.random()
  let cursor = 0
  for (const outcome of outcomes) {
    cursor += outcome.chance
    if (roll <= cursor) return outcome
  }
  return outcomes[outcomes.length - 1]
}

const mergeEffect = (base: NarrativeEffect = {}, extra?: NarrativeEffect): NarrativeEffect => ({
  trust: (base.trust ?? 0) + (extra?.trust ?? 0),
  resource: (base.resource ?? 0) + (extra?.resource ?? 0),
  water: (base.water ?? 0) + (extra?.water ?? 0),
  food: (base.food ?? 0) + (extra?.food ?? 0),
  stress: (base.stress ?? 0) + (extra?.stress ?? 0),
  suspicion: (base.suspicion ?? 0) + (extra?.suspicion ?? 0),
  stamina: (base.stamina ?? 0) + (extra?.stamina ?? 0),
  hp: (base.hp ?? 0) + (extra?.hp ?? 0),
  oddities: (base.oddities ?? 0) + (extra?.oddities ?? 0),
})

const getSupplyFocus = (choice: NarrativeChoice, title: string): SupplyFocus => {
  const source = choice.text + ' ' + title
  if ((choice.effect.water ?? 0) !== 0 || /水|泉|雨|池/.test(source)) return 'water'
  if ((choice.effect.food ?? 0) !== 0 || /食|果|魚|蟹|肉/.test(source)) return 'food'
  return 'mixed'
}

const completedGoalByEffect = (goalKey: DailyGoalKey, effect: NarrativeEffect, routeId: string, category: string) => {
  switch (goalKey) {
    case 'find_water':
      return (effect.water ?? 0) > 0 || ((effect.resource ?? 0) > 0 && /水|泉|雨|池/.test(routeId))
    case 'find_food':
      return (effect.food ?? 0) > 0 || ((effect.resource ?? 0) > 0 && /食|果|魚|蟹|肉/.test(routeId))
    case 'ease_tension':
      return (effect.trust ?? 0) > 0 && (effect.suspicion ?? 0) <= 0
    case 'search_wreck':
      return category === 'external' || /wreck|crate|signal|殘骸/.test(routeId)
    case 'hold_together':
      return (effect.stress ?? 0) < 0 || (effect.trust ?? 0) > 0 || (effect.stamina ?? 0) > 0
  }
}

const getChoiceAvailability = (choice: NarrativeChoice, snapshot: { stamina: number; water: number; food: number; resource: number }) => {
  if ((choice.effect.stamina ?? 0) < 0 && snapshot.stamina < Math.abs(choice.effect.stamina ?? 0)) return { disabled: true, reason: '你現在沒有這個力氣。' }
  if ((choice.effect.water ?? 0) < 0 && snapshot.water < Math.abs(choice.effect.water ?? 0)) return { disabled: true, reason: '你拿不出這份水。' }
  if ((choice.effect.food ?? 0) < 0 && snapshot.food < Math.abs(choice.effect.food ?? 0)) return { disabled: true, reason: '你拿不出這份食物。' }
  if ((choice.effect.resource ?? 0) < 0 && snapshot.resource < Math.abs(choice.effect.resource ?? 0)) return { disabled: true, reason: '你沒有足夠的補給。' }
  return { disabled: false, reason: undefined }
}

const startAreaTitles: Record<string, string> = {
  start_beach: '海灘',
  meet_stranger: '第一個醒來的人',
  wreck_search: '殘骸',
  talk_start: '第一句話',
  distrust_start: '距離',
  took_resources: '收起來的東西',
  leave_trace: '留下的痕跡',
  info_exchange: '對不上的地方',
  team_up: '暫時同行',
  sneak_check: '偷看的行李',
  solo_route: '單獨前進',
  share_resources: '分出的那一份',
  hide_intent: '裝作沒事',
  meet_again: '回去找他',
  doubt_rise: '追問',
  uneasy_silence: '留白',
  village_entry: '村落入口',
  house_search: '民宅',
  shrine_path: '神社入口',
  deeper_house: '地下室',
  shrine_inside: '鏡子',
  confrontation: '質問',
  hidden_truth: '沒說出口的事',
  truth_flag: '碎掉的鏡面',
  bad_end_trap: '地下室',
  madness_end: '映照',
  bad_end_kill: '夜裡',
  solo_bad_end: '分開之後',
  unstable_route: '不穩的同行',
  night_fall: '天黑了',
}

const getStartAreaSupplyFocus = (effect?: StartAreaEffect): SupplyFocus => {
  if (!effect) return 'mixed'
  if ((effect.water ?? 0) !== 0 && (effect.food ?? 0) === 0) return 'water'
  if ((effect.food ?? 0) !== 0 && (effect.water ?? 0) === 0) return 'food'
  return 'mixed'
}

const normalizeStartAreaEffect = (effect?: StartAreaEffect): NarrativeEffect | undefined => {
  if (!effect) return undefined

  return {
    trust: effect.trust ?? 0,
    suspicion: effect.suspicion ?? 0,
    stress: (effect.stress ?? 0) + (effect.sanity ? -effect.sanity : 0),
    stamina: effect.stamina ?? 0,
    water: effect.water ?? 0,
    food: effect.food ?? 0,
  }
}

const getStartAreaChoiceCopy = (choice: StartAreaChoice) => {
  if (choice.to === 'ending_check') {
    return {
      subtitle: '天黑之後，今天做過的事會自己排出輕重。',
      hoverHint: '走到這裡就不能再補一句解釋，今天留下的東西會直接變成答案。',
    }
  }

  if (choice.to in startAreaEndings) {
    const ending = startAreaEndings[choice.to as StartAreaEnding['id']]
    return {
      subtitle: ending.text[0],
      hoverHint: ending.text[ending.text.length - 1] ?? '有些路走到這裡，就只剩下一種說法。',
    }
  }

  const targetNode = startAreaNodes[choice.to]
  if (!targetNode) {
    return {
      subtitle: '這一步會把你帶到別的地方。',
      hoverHint: '你還不知道那裡等著的是什麼，只知道已經不能回頭。',
    }
  }

  return {
    subtitle: targetNode.text[0],
    hoverHint: targetNode.text[targetNode.text.length - 1] ?? '這一步一旦走下去，就會留下痕跡。',
  }
}

const getStartAreaEndingId = (snapshot: { trust: number; suspicion: number; stress: number }): StartAreaEnding['id'] => {
  const sanity = Math.max(0, 100 - snapshot.stress)
  if (snapshot.trust > 60 && sanity > 30) return 'ending_escape'
  if (snapshot.suspicion > 40) return 'ending_betrayal'
  if (sanity <= 0) return 'ending_madness'
  return 'ending_ambiguous'
}

const getStartAreaBackground = (nodeId: string | null) => {
  if (!nodeId) return null
  if (['village_entry', 'house_search', 'deeper_house', 'bad_end_trap', 'night_fall', 'solo_bad_end', 'unstable_route'].includes(nodeId)) return '/bg_phase2.jpg'
  if (['shrine_path', 'shrine_inside', 'truth_flag', 'madness_end'].includes(nodeId)) return '/bg_phase3.jpg'
  if (['confrontation', 'bad_end_kill', 'hidden_truth'].includes(nodeId)) return '/bg_phase4.jpg'
  return '/cover_mobile.jpg'
}

function ChoiceButton({ text, subtitle, hoverHint, onClick, disabled, disabledReason }: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        'group w-full rounded-[24px] border px-5 py-4 text-left transition duration-300',
        disabled
          ? 'cursor-not-allowed border-stone-800 bg-black/60 text-stone-500'
          : 'border-stone-700/80 bg-[linear-gradient(180deg,rgba(19,16,15,0.96),rgba(7,6,6,0.98))] text-stone-100 shadow-[0_18px_40px_rgba(0,0,0,0.36)] hover:border-stone-500/80 hover:bg-[linear-gradient(180deg,rgba(31,26,24,0.97),rgba(10,8,8,0.99))] hover:shadow-[0_26px_52px_rgba(0,0,0,0.42)] hover:scale-[1.01] active:scale-[0.995]',
      ].join(' ')}
    >
      <div className="text-base font-semibold leading-7 tracking-[0.04em] text-stone-50">{text}</div>
      {subtitle && <div className="mt-1 text-sm leading-6 text-stone-300/80">{subtitle}</div>}
      {disabled && disabledReason && <div className="mt-2 text-sm leading-6 text-stone-500">{disabledReason}</div>}
      {!disabled && hoverHint && <div className="mt-3 max-h-0 overflow-hidden rounded-2xl bg-black/35 px-3 text-sm leading-6 text-stone-300/70 opacity-0 transition-all duration-300 group-hover:max-h-28 group-hover:py-3 group-hover:opacity-100">{hoverHint}</div>}
    </button>
  )
}

function HudStat({ label, value, stat }: { label: string; value: number; stat: StatKind }) {
  const tone = getStatTone(stat, value)
  const classes = tone === 'danger' ? 'border-rose-500/35 bg-black/50 text-rose-200' : tone === 'warning' ? 'border-amber-400/35 bg-black/46 text-amber-100' : 'border-stone-700/80 bg-black/42 text-stone-50'
  return (
    <div className={'rounded-2xl border px-3 py-2.5 ' + classes}>
      <div className="text-[10px] uppercase tracking-[0.26em] text-stone-300/85">{label}</div>
      <div className="mt-1 text-base font-semibold tracking-[0.04em]">{value}</div>
    </div>
  )
}

export function StarterShell() {
  useMetaVariables()

  const { ready: audioReady, unlock, setSeaLevel, setWindLevel, setHeartbeatLevel } = useAmbientAudio()
  const { currentEvent, routeOptions, rollRoutes, enterRoute, leaveRoute } = useEncounter()

  const day = useProjectStore((state) => state.day)
  const dayPhase = useProjectStore((state) => state.dayPhase)
  const phase = useProjectStore((state) => state.phase)
  const stamina = useProjectStore((state) => state.stamina)
  const water = useProjectStore((state) => state.water)
  const food = useProjectStore((state) => state.food)
  const trust = useProjectStore((state) => state.trust)
  const suspicion = useProjectStore((state) => state.suspicion)
  const stress = useProjectStore((state) => state.stress)
  const oddities = useProjectStore((state) => state.oddities)
  const resource = useProjectStore((state) => state.resource)
  const remainingActions = useProjectStore((state) => state.remainingActions)
  const dayGoalKey = useProjectStore((state) => state.dayGoalKey)
  const goalCompleted = useProjectStore((state) => state.goalCompleted)
  const metaVariables = useProjectStore((state) => state.metaVariables)
  const nextDay = useProjectStore((state) => state.nextDay)
  const changePhase = useProjectStore((state) => state.changePhase)
  const setMetaVariables = useProjectStore((state) => state.setMetaVariables)
  const resetGame = useProjectStore((state) => state.resetGame)
  const applyEffect = useProjectStore((state) => state.applyEffect)
  const setFlag = useProjectStore((state) => state.setFlag)
  const incrementBehavior = useProjectStore((state) => state.incrementBehavior)
  const setOtherAlive = useProjectStore((state) => state.setOtherAlive)
  const visitNode = useProjectStore((state) => state.visitNode)
  const consumeAction = useProjectStore((state) => state.consumeAction)
  const setGoalCompleted = useProjectStore((state) => state.setGoalCompleted)
  const setDayGoalKey = useProjectStore((state) => state.setDayGoalKey)

  const [showCover, setShowCover] = useState(true)
  const [coverStage, setCoverStage] = useState(0)
  const [resultTitle, setResultTitle] = useState('')
  const [resultLines, setResultLines] = useState<string[]>([])
  const [resultStamp, setResultStamp] = useState(0)
  const [journalEntries, setJournalEntries] = useState<string[]>([])
  const [showJournal, setShowJournal] = useState(false)
  const [floatingEchoes, setFloatingEchoes] = useState<FloatingEcho[]>([])
  const [backgroundSrc, setBackgroundSrc] = useState(phaseBackgrounds.phase1)
  const [backgroundVisible, setBackgroundVisible] = useState(true)
  const [currentEnding, setCurrentEnding] = useState<keyof typeof endings | null>(null)
  const [activeStartNodeId, setActiveStartNodeId] = useState<string | null>(null)
  const [appliedStartNodeIds, setAppliedStartNodeIds] = useState<string[]>([])
  const [startAreaEndingId, setStartAreaEndingId] = useState<StartAreaEnding['id'] | null>(null)
  const [endDayAfterResult, setEndDayAfterResult] = useState(false)
  const echoIdRef = useRef(0)

  const typedEllipsis = useTypewriterText('……', coverStage >= 1, 240)
  const typedAlive = useTypewriterText('你還活著。', coverStage >= 2, 72)
  const typedNotAlone = useTypewriterText('但不是只有你一個人。', coverStage >= 3, 68)
  const activeStartNode = useMemo(() => (activeStartNodeId ? startAreaNodes[activeStartNodeId] ?? null : null), [activeStartNodeId])
  const startAreaBackground = useMemo(() => getStartAreaBackground(activeStartNodeId), [activeStartNodeId])
  const resolvedEnding = startAreaEndingId ? startAreaEndings[startAreaEndingId] : currentEnding ? endings[currentEnding] : null
  const distortionLevel = getDistortionLevel(stress, suspicion, oddities)
  const dailyGoal = useMemo(() => getDailyGoal({ day, water, food, trust, suspicion, stress, resource: water + food }), [day, food, stress, suspicion, trust, water])
  const ambientLine = getAmbientLine(day, metaVariables.weather, metaVariables.isNight, water, food)

  useEffect(() => {
    if (dailyGoal.key !== dayGoalKey) setDayGoalKey(dailyGoal.key as DailyGoalKey)
  }, [dailyGoal.key, dayGoalKey, setDayGoalKey])

  useEffect(() => {
    if (!showCover) return undefined

    let delay: number | null = null

    if (coverStage === 0) delay = 500
    if (coverStage === 1 && typedEllipsis.length === 2) delay = 800
    if (coverStage === 2 && typedAlive.length === 5) delay = 1200
    if (coverStage === 3 && typedNotAlone.length === 10) delay = 200

    if (delay === null) return undefined

    const timer = window.setTimeout(() => setCoverStage((stage) => Math.min(stage + 1, 4)), delay)
    return () => window.clearTimeout(timer)
  }, [coverStage, showCover, typedAlive.length, typedEllipsis.length, typedNotAlone.length])

  useEffect(() => {
    if (!audioReady || showCover) return
    setWindLevel(metaVariables.isNight ? 0.08 : 0)
    setHeartbeatLevel(stress >= 80 ? Math.min(1, 0.35 + (stress - 80) / 20) : 0)
  }, [audioReady, metaVariables.isNight, setHeartbeatLevel, setWindLevel, showCover, stress])

  const encounterFrame = useMemo(() => buildEncounterFrame({ day, dailyGoal, currentEvent, stamina, water, food, trust, suspicion, stress, oddities }), [currentEvent, dailyGoal, day, food, oddities, stamina, stress, suspicion, trust, water])
  const promptSourceLines = activeStartNode ? activeStartNode.text : currentEvent ? currentEvent.text : encounterFrame.lines
  const promptLines = useMemo(() => addRiskHints(promptSourceLines, { stamina, water, food, trust, suspicion, stress }), [food, promptSourceLines, stamina, stress, suspicion, trust, water])
  const resultDisplayLines = useMemo(() => addRiskHints(resultLines, { stamina, water, food, trust, suspicion, stress }).map((line, index) => distortLine(line, distortionLevel >= 2 ? distortionLevel : 0, false, index)), [distortionLevel, food, resultLines, stamina, stress, suspicion, trust, water])
  const promptDisplayLines = useMemo(() => promptLines.map((line, index) => distortLine(line, distortionLevel, activeStartNode ? false : currentEvent?.unreliable, index)), [activeStartNode, currentEvent?.unreliable, distortionLevel, promptLines])
  const promptKey = activeStartNode ? day + '-start-' + activeStartNode.id : currentEvent ? day + '-' + currentEvent.id : day + '-routes-' + remainingActions
  const { blocks: visiblePromptBlocks, complete: promptReady } = useRevealBlocks(promptDisplayLines, promptKey, !showCover && phase === 'encounter', 240, 850)
  const { blocks: visibleResultBlocks, complete: resultReady } = useRevealBlocks(resultDisplayLines, day + '-' + resultStamp, !showCover && phase === 'result', 220, 740)

  const sceneBackground = useMemo(() => {
    if (showCover) return '/cover_mobile.jpg'
    if (phase === 'ending' && startAreaEndingId) return startAreaBackground ?? '/bg_phase5.jpg'
    if (activeStartNode) return startAreaBackground ?? phaseBackgrounds[dayPhase]
    if (phase === 'ending') return '/bg_phase5.jpg'
    if (currentEvent?.background && phase === 'encounter') return '/' + currentEvent.background
    return phaseBackgrounds[dayPhase]
  }, [activeStartNode, currentEvent, dayPhase, phase, showCover, startAreaBackground, startAreaEndingId])

  useEffect(() => {
    if (sceneBackground === backgroundSrc) return
    const fadeTimer = window.setTimeout(() => setBackgroundVisible(false), 0)
    const swapTimer = window.setTimeout(() => { setBackgroundSrc(sceneBackground); setBackgroundVisible(true) }, 520)
    return () => { window.clearTimeout(fadeTimer); window.clearTimeout(swapTimer) }
  }, [backgroundSrc, sceneBackground])

  const pushEcho = (text: string, tone: EchoTone) => {
    echoIdRef.current += 1
    const id = echoIdRef.current
    setFloatingEchoes((current) => [...current, { id, text, tone }])
    window.setTimeout(() => setFloatingEchoes((current) => current.filter((echo) => echo.id !== id)), 1900)
  }

  const emitSummary = (summary: AppliedEffectSummary['delta']) => {
    const entries: Array<{ label: string; value: number; tone: EchoTone }> = []
    if (summary.stamina) entries.push({ label: '體力', value: summary.stamina, tone: getEchoTone(summary.stamina) })
    if (summary.water) entries.push({ label: '淡水', value: summary.water, tone: getEchoTone(summary.water) })
    if (summary.food) entries.push({ label: '食物', value: summary.food, tone: getEchoTone(summary.food) })
    if (summary.trust) entries.push({ label: '信任', value: summary.trust, tone: getEchoTone(summary.trust) })
    if (summary.suspicion) entries.push({ label: '懷疑', value: summary.suspicion, tone: getEchoTone(summary.suspicion, true) })
    if (summary.stress) entries.push({ label: '壓力', value: summary.stress, tone: getEchoTone(summary.stress, true) })
    entries.slice(0, 4).forEach((entry) => pushEcho(entry.label + ' ' + formatSigned(entry.value), entry.tone))
  }

  const buildStatusSummary = (snapshot = useProjectStore.getState(), extra: string[] = []) => [
    '今天結束時，體力剩 ' + snapshot.stamina + '。',
    '淡水剩 ' + snapshot.water + '，食物剩 ' + snapshot.food + '。',
    snapshot.trust <= 35 ? '他看你的方式更像在防備。' : snapshot.suspicion >= 60 ? '猜疑沒有消失，只是暫時沒說出口。' : '你們暫時還站在同一邊。',
    getRiskHintLine(snapshot),
    ...extra,
  ]

  const refreshEnvironment = (night: boolean) => {
    const state = useProjectStore.getState()
    const weather = weatherPool[(state.day + state.suspicion + state.stress + (night ? 1 : 0)) % weatherPool.length] as Weather
    const hour = night ? 23 : 8 + ((state.day + state.trust + state.water + state.food) % 9)
    setMetaVariables({ weather, hour, isNight: night })
  }

  const restartCurrentGame = async () => {
    resetGame()
    leaveRoute()
    setCurrentEnding(null)
    setStartAreaEndingId(null)
    setActiveStartNodeId(null)
    setAppliedStartNodeIds([])
    setResultTitle('')
    setResultLines([])
    setResultStamp(0)
    setJournalEntries([])
    setShowJournal(false)
    setEndDayAfterResult(false)
    refreshEnvironment(false)
    rollRoutes()
    changePhase('encounter')
    setShowCover(true)
    setCoverStage(0)
    if (audioReady) { setSeaLevel(0); setWindLevel(0); setHeartbeatLevel(0) }
  }

  const enterStartAreaNode = (nodeId: string) => {
    const node = startAreaNodes[nodeId]
    if (!node) return

    visitNode(nodeId)
    setActiveStartNodeId(nodeId)

    if (!appliedStartNodeIds.includes(nodeId)) {
      const normalizedEffect = normalizeStartAreaEffect(node.effect)
      if (normalizedEffect) {
        const summary = applyEffect(normalizedEffect, getStartAreaSupplyFocus(node.effect))
        emitSummary(summary.delta)
      }
      node.setFlags?.forEach((flag) => setFlag(flag))
      setAppliedStartNodeIds((current) => [...current, nodeId])
    }

    changePhase('encounter')
  }

  const resolveStartAreaChoice = (choice: StartAreaChoice) => {
    if (choice.to === 'ending_check') {
      setStartAreaEndingId(getStartAreaEndingId(useProjectStore.getState()))
      changePhase('ending')
      return
    }

    if (choice.to in startAreaEndings) {
      setStartAreaEndingId(choice.to as StartAreaEnding['id'])
      changePhase('ending')
      return
    }

    enterStartAreaNode(choice.to)
  }

  const makeChoiceResult = (choice: NarrativeChoice): ChoiceResult => {
    const outcome = pickRandomOutcome(choice.randomOutcomes)
    return {
      effect: mergeEffect(choice.effect, outcome?.effect),
      feeling: outcome?.feeling || choice.feeling,
      flags: [...(choice.setFlags ?? []), ...(outcome?.setFlags ?? [])],
      behavior: choice.behavior,
      supplyFocus: getSupplyFocus(choice, currentEvent?.title ?? ''),
    }
  }

  const handleRouteEnter = (option: RouteOption) => {
    if (remainingActions <= 0) return pushEcho('今天的行動已經用完了。', 'warning')
    if (option.locked) return pushEcho(option.reason ?? '現在還去不了。', 'warning')
    enterRoute(option.event.id)
  }

  const handleNoRoutes = () => {
    setResultTitle('今天沒有別的路了')
    setResultLines(addRiskHints(['能走的地方不是關著，就是代價比今天還重。', '收手不是安全，只是暫時不再往壞的地方多走一步。'], useProjectStore.getState()))
    setResultStamp((stamp) => stamp + 1)
    setEndDayAfterResult(true)
    changePhase('result')
  }

  const resolveNodeChoice = (choice: NarrativeChoice) => {
    if (!currentEvent) return
    const availability = getChoiceAvailability(choice, { stamina, water, food, resource })
    if (availability.disabled) return pushEcho(availability.reason ?? '你現在做不到。', 'warning')

    const before = useProjectStore.getState()
    const resolved = makeChoiceResult(choice)
    const summary = applyEffect(resolved.effect, resolved.supplyFocus)
    consumeAction(1)
    if (resolved.behavior) incrementBehavior(resolved.behavior)
    resolved.flags.forEach((flag) => setFlag(flag))
    setOtherAlive(!resolved.flags.some((flag) => ['killed_companion', 'accidental_killing', 'other_left_behind', 'they_walked_away'].includes(flag)))

    const after = useProjectStore.getState()
    if (completedGoalByEffect(dailyGoal.key, resolved.effect, currentEvent.id, currentEvent.category)) {
      setGoalCompleted(true)
      pushEcho('今日目標有進展', 'calm')
    }

    const shift = buildShiftNarrative(
      { trust: before.trust, suspicion: before.suspicion, stress: before.stress, stamina: before.stamina, hp: before.hp, water: before.water, food: before.food },
      { trust: after.trust, suspicion: after.suspicion, stress: after.stress, stamina: after.stamina, hp: after.hp, water: after.water, food: after.food },
    )

    const nodeAftermath = currentEvent.category === 'collapse'
      ? '你知道這一步不會只留在這個地方，它會在後面變成新的代價。'
      : currentEvent.category === 'trust'
        ? '這件事沒有真正過去，它只是在等下一次被提起。'
        : currentEvent.category === 'psychological'
          ? '你現在甚至不確定剛才改變的是結果，還是你看人的方式。'
          : currentEvent.category === 'external'
            ? '外面的東西沒有停下來，這一步只是先把後果往前拉近。'
            : '你帶回來的不是答案，只是今晚暫時能撐的東西。'

    setResultTitle(currentEvent.title)
    setResultLines(addRiskHints([resolved.feeling, nodeAftermath, ...shift, getRiskHintLine(after)], after))
    setResultStamp((stamp) => stamp + 1)
    setEndDayAfterResult(after.remainingActions <= 0)
    changePhase('result')
    emitSummary(summary.delta)
  }

  const continueFromResult = () => {
    const stateBefore = useProjectStore.getState()
    const shouldEndNow = stateBefore.hp <= 0 || stateBefore.day >= 30 || !stateBefore.otherAlive || stateBefore.flags.includes('killed_companion') || stateBefore.flags.includes('accidental_killing') || stateBefore.flags.includes('mutual_ruin')

    if (shouldEndNow) {
      setJournalEntries((entries) => [buildDiaryEntry(stateBefore.day, resultTitle || '今天留下的東西', resultLines, buildStatusSummary(stateBefore)), ...entries].slice(0, 30))
      setCurrentEnding(getEndingState(stateBefore))
      changePhase('ending')
      return
    }

    if (!endDayAfterResult) {
      leaveRoute()
      changePhase('encounter')
      rollRoutes()
      return
    }

    const goalMissed = !stateBefore.goalCompleted
    const goalLine = goalMissed ? getGoalFailureLine(dailyGoal) : getGoalCompletionLine(dailyGoal)
    const daySummary = nextDay()
    const stateAfter = useProjectStore.getState()

    setJournalEntries((entries) => [
      buildDiaryEntry(daySummary.previousDay, '今天留下的東西', [...resultLines, goalLine], buildStatusSummary(stateAfter, [goalMissed ? '今天的目標沒有完成。' : '今天的目標勉強完成了。'])),
      ...entries,
    ].slice(0, 30))

    emitSummary(daySummary.delta)
    pushEcho(goalMissed ? '今天沒有把事情收好。' : '今天至少先撐過去了。', goalMissed ? 'danger' : 'calm')

    if (stateAfter.hp <= 0 || !stateAfter.otherAlive || stateAfter.flags.includes('mutual_ruin')) {
      setCurrentEnding(getEndingState(stateAfter))
      changePhase('ending')
      return
    }

    leaveRoute()
    refreshEnvironment(false)
    setResultTitle('')
    setResultLines([])
    setCurrentEnding(null)
    setEndDayAfterResult(false)
    changePhase('encounter')
    rollRoutes()
  }

  if (showCover) {
    return (
      <main className="relative min-h-[100dvh] overflow-hidden bg-black text-stone-100">
        <style>{sceneStyles}</style>
        {coverStage >= 3 && <div className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 opacity-100" style={{ backgroundImage: "url('/cover_mobile.jpg')" }} />}
        <div className="absolute inset-0 bg-black/72" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/92 to-black/96" />
        <div className="relative z-10 flex min-h-[100dvh] flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+1.5rem)]">
          <div className="flex-1" />
          <div className="mx-auto w-full max-w-[320px] space-y-5 text-center">
            <div className="min-h-[2rem] text-lg tracking-[0.2em] text-stone-300/84">{typedEllipsis}</div>
            <div className="min-h-[2rem] text-[1.55rem] font-semibold leading-tight tracking-[0.08em] text-stone-50">{typedAlive}</div>
            <div className="min-h-[3rem] text-[1.12rem] leading-8 text-stone-200/80">{typedNotAlone}</div>
          </div>
          <div className="flex-1" />
          {coverStage >= 4 && <button type="button" onClick={async () => { const ok = await unlock(); if (ok) { setSeaLevel(0.4); refreshEnvironment(false); setCurrentEnding(null); setStartAreaEndingId(null); setActiveStartNodeId(null); setAppliedStartNodeIds([]); setShowCover(false); enterStartAreaNode('start_beach') } }} className="mx-auto min-h-[56px] w-full max-w-[360px] rounded-[24px] border border-stone-600/80 bg-[linear-gradient(180deg,rgba(30,25,24,0.92),rgba(10,9,9,0.98))] px-6 py-4 text-base font-semibold tracking-[0.16em] text-stone-100 transition duration-300 hover:border-stone-400/85 hover:bg-[linear-gradient(180deg,rgba(42,35,33,0.95),rgba(13,11,11,0.99))]">我醒了</button>}
        </div>
      </main>
    )
  }

  if (phase === 'ending' && resolvedEnding) {
    return (
      <main className="relative min-h-[100dvh] overflow-hidden bg-black text-stone-100">
        <style>{sceneStyles}</style>
        <div className={(backgroundVisible ? 'absolute inset-0 bg-cover bg-center transition-opacity duration-1000 opacity-100' : 'absolute inset-0 bg-cover bg-center transition-opacity duration-1000 opacity-0')} style={{ backgroundImage: "url('" + backgroundSrc + "')" }} />
        <div className="absolute inset-0 bg-black/68" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/92 via-black/78 to-black" />
        <div className="relative z-10 flex min-h-[100dvh] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)]">
          <header className="mx-auto w-full max-w-[360px] rounded-[22px] border border-stone-700/70 bg-black/48 px-4 py-3 backdrop-blur-xl"><div className="text-[11px] uppercase tracking-[0.42em] text-stone-300/78">Day {day}</div></header>
          <div className="flex-1" />
          <article className="mx-auto w-full max-w-[320px] rounded-[28px] border border-stone-700/75 bg-[linear-gradient(180deg,rgba(18,16,14,0.94),rgba(6,5,5,0.98))] px-5 py-6 shadow-[0_24px_60px_rgba(0,0,0,0.46)] backdrop-blur-xl">
            <div className="text-[11px] uppercase tracking-[0.46em] text-stone-400/68">Ending</div>
            <h1 className="mt-4 text-[2rem] font-semibold leading-tight tracking-[0.08em] text-stone-50">{resolvedEnding.title}</h1>
            <div className="mt-5 space-y-5 text-[1.05rem] leading-[2.0] text-stone-100/90">{resolvedEnding.text.map((line) => <p key={line}>{line}</p>)}</div>
          </article>
          <div className="mx-auto mt-4 w-full max-w-[360px]"><ChoiceButton text="重新開始" subtitle="回到第 1 天，走另一條路。" hoverHint="這次你會記得哪些地方曾經出事，但島不會因此變得寬容。" onClick={() => { void restartCurrentGame() }} /></div>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-black text-stone-100">
      <style>{sceneStyles}</style>
      <div className={(backgroundVisible ? 'absolute inset-0 bg-cover bg-center transition-opacity duration-1000 opacity-100' : 'absolute inset-0 bg-cover bg-center transition-opacity duration-1000 opacity-0')} style={{ backgroundImage: "url('" + sceneBackground + "')" }} />
      <div className="absolute inset-0 bg-black/66" />
      <div className={distortionLevel >= 2 ? 'absolute inset-0 bg-gradient-to-b from-black/90 via-rose-950/30 to-black' : 'absolute inset-0 bg-gradient-to-b from-black/88 via-black/72 to-black'} />
      <div className="relative z-10 flex min-h-[100dvh] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <header className="sticky top-[calc(env(safe-area-inset-top)+0.5rem)] z-20 mx-auto w-full max-w-[360px] rounded-[24px] border border-stone-700/75 bg-black/48 px-3 py-3 shadow-[0_14px_34px_rgba(0,0,0,0.34)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3 rounded-2xl bg-black/40 px-3 py-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.42em] text-stone-300/82">Day {day} / 30</div>
              <div className="mt-2 text-xs leading-6 text-stone-200/80">{ambientLine}</div>
            </div>
            <button type="button" onClick={() => setShowJournal(true)} className="rounded-full border border-stone-600/80 bg-black/45 px-3 py-2 text-[11px] tracking-[0.24em] text-stone-100/80 transition hover:bg-black/60">日誌</button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <HudStat label="體力" value={stamina} stat="stamina" />
            <HudStat label="淡水" value={water} stat="water" />
            <HudStat label="食物" value={food} stat="food" />
            <HudStat label="信任" value={trust} stat="trust" />
            <HudStat label="懷疑" value={suspicion} stat="suspicion" />
            <HudStat label="壓力" value={stress} stat="stress" />
          </div>
          <div className="mt-3 grid grid-cols-[1fr_auto] gap-3 rounded-2xl bg-black/40 px-3 py-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.26em] text-stone-300/76">今日目標</div>
              <div className="mt-1 text-sm font-semibold tracking-[0.03em] text-stone-50">{dailyGoal.title}</div>
              <div className="mt-1 text-xs leading-6 text-stone-200/75">{dailyGoal.summary}</div>
            </div>
            <div className="rounded-2xl bg-black/45 px-3 py-2 text-right">
              <div className="text-[10px] uppercase tracking-[0.26em] text-stone-300/76">剩餘行動</div>
              <div className="mt-1 text-xl font-semibold text-stone-50">{remainingActions}</div>
              <div className="mt-1 text-[11px] text-stone-300/70">{goalCompleted ? '目標已有進展' : '還沒做完今天'}</div>
            </div>
          </div>
        </header>

        <div className="pointer-events-none absolute inset-x-4 top-[calc(env(safe-area-inset-top)+14.5rem)] z-20 space-y-2">{floatingEchoes.map((echo) => <div key={echo.id} className={(echo.tone === 'danger' ? 'mx-auto max-w-[320px] rounded-full border border-rose-500/28 bg-black/70 px-3 py-2 text-center text-[11px] tracking-[0.18em] text-rose-100' : echo.tone === 'warning' ? 'mx-auto max-w-[320px] rounded-full border border-amber-500/28 bg-black/70 px-3 py-2 text-center text-[11px] tracking-[0.18em] text-amber-100' : 'mx-auto max-w-[320px] rounded-full border border-emerald-500/24 bg-black/70 px-3 py-2 text-center text-[11px] tracking-[0.18em] text-emerald-100')}>{echo.text}</div>)}</div>

        <section className="flex flex-1 flex-col justify-center px-1 py-6">
          <article className={distortionLevel >= 2 ? 'mx-auto w-full max-w-[320px] rounded-[28px] border border-rose-900/55 bg-[linear-gradient(180deg,rgba(28,14,14,0.94),rgba(8,6,6,0.98))] px-5 py-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl' : 'mx-auto w-full max-w-[320px] rounded-[28px] border border-stone-700/75 bg-[linear-gradient(180deg,rgba(18,16,14,0.94),rgba(6,5,5,0.98))] px-5 py-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl'}>
            <div className="text-[11px] uppercase tracking-[0.46em] text-stone-400/66">{phase === 'result' ? 'Aftermath' : activeStartNode ? 'Origin Node' : currentEvent ? 'Node' : 'Route'}</div>
            <h1 className="mt-4 text-[clamp(1.8rem,6.8vw,2.3rem)] font-semibold leading-tight tracking-[0.08em] text-stone-50">{phase === 'result' ? resultTitle || '今天留下的東西' : activeStartNode ? (startAreaTitles[activeStartNode.id] ?? '起始區') : currentEvent ? currentEvent.title : encounterFrame.title}</h1>
            <div className="mt-5 space-y-5 text-[1.05rem] leading-[2.0] tracking-[0.01em] text-stone-100/92">
              {phase === 'encounter' && visiblePromptBlocks.map((line) => <p key={line} className="whitespace-pre-line">{line}</p>)}
              {phase === 'result' && visibleResultBlocks.map((line) => <p key={line} className="whitespace-pre-line">{line}</p>)}
              {phase === 'encounter' && !promptReady && <p className="text-base leading-8 text-stone-300/72">你還在判斷今天能往哪裡走。可很多路，一旦走進去就不會再回來。</p>}
            </div>
          </article>
        </section>

        <footer className="mx-auto w-full max-w-[360px] space-y-3">
          {phase === 'encounter' && promptReady && activeStartNode && (activeStartNode.choices ?? []).map((choice) => {
            const copy = getStartAreaChoiceCopy(choice)
            return <ChoiceButton key={activeStartNode.id + '-' + choice.text} text={choice.text} subtitle={copy.subtitle} hoverHint={copy.hoverHint} onClick={() => resolveStartAreaChoice(choice)} />
          })}
          {phase === 'encounter' && promptReady && !activeStartNode && !currentEvent && routeOptions.map((option) => <ChoiceButton key={option.event.id} text={option.event.title} subtitle={option.event.text[0]} hoverHint={option.locked ? option.reason ?? '這條路暫時走不通。' : '進去之後就不能回頭重選。 ' + (option.event.text[1] || '')} disabled={option.locked || remainingActions <= 0} disabledReason={remainingActions <= 0 ? '今天的行動已經用完了。' : option.reason} onClick={() => handleRouteEnter(option)} />)}
          {phase === 'encounter' && promptReady && !activeStartNode && !currentEvent && routeOptions.length === 0 && <ChoiceButton text="今天沒有別的路了" subtitle="能走的地方不是關著，就是代價比今天還重。" hoverHint="把今天收掉，也是一種選擇。只是明天不會因此變輕。" onClick={handleNoRoutes} />}
          {phase === 'encounter' && promptReady && !activeStartNode && currentEvent && currentEvent.choices.map((choice) => {
            const availability = getChoiceAvailability(choice, { stamina, water, food, resource })
            return <ChoiceButton key={currentEvent.id + '-' + choice.text} text={choice.text} subtitle={choice.feeling} hoverHint={choice.hoverHint || '這一步不會只留在這裡，它會在之後的話和沉默裡再出現。'} disabled={availability.disabled} disabledReason={availability.reason} onClick={() => resolveNodeChoice(choice)} />
          })}
          {phase === 'result' && resultReady && <ChoiceButton text={endDayAfterResult ? '讓今天結束' : '回到分岔口'} subtitle={endDayAfterResult ? '進入下一天前，時間會先拿走一點補給。' : '你還有一次行動，但下一條路不一定比較好走。'} hoverHint={endDayAfterResult ? '今天會過去，但沒處理完的事不會。' : '你還能再做一次選擇，只是錯過的節點已經回不去了。'} onClick={continueFromResult} />}
        </footer>
      </div>

      {showJournal && (
        <>
          <button type="button" aria-label="關閉日誌" onClick={() => setShowJournal(false)} className="absolute inset-0 z-30 bg-black/62" />
          <aside className="absolute right-0 top-0 z-40 flex h-full w-[86vw] max-w-sm flex-col border-l border-stone-700/70 bg-[linear-gradient(180deg,rgba(12,10,9,0.98),rgba(4,3,3,1))] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)] shadow-2xl backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3"><div><div className="text-[11px] uppercase tracking-[0.42em] text-stone-400/68">Journal</div><h2 className="mt-2 text-xl font-semibold tracking-[0.08em] text-stone-50">日誌</h2></div><button type="button" onClick={() => setShowJournal(false)} className="rounded-full border border-stone-700/70 px-3 py-2 text-[11px] tracking-[0.25em] text-stone-200/72">關閉</button></div>
            <div className="mt-5 flex-1 space-y-4 overflow-y-auto pr-1">{(journalEntries.length > 0 ? journalEntries : ['Day 1\n今天還沒有走到真正危險的地方。\n但那不代表危險不存在。']).map((entry) => <article key={entry} className="rounded-[22px] border border-stone-800/75 bg-black/35 px-4 py-4"><p className="whitespace-pre-line text-sm leading-7 text-stone-100/88">{entry}</p></article>)}</div>
          </aside>
        </>
      )}
    </main>
  )
}
