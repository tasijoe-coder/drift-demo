import { useEffect, useMemo, useState } from 'react'

import { useAmbientAudio } from '../hooks/useAmbientAudio'
import { startAreaEndings, startAreaNodes, type StartAreaChoice, type StartAreaEffect, type StartAreaEnding } from '../data/startAreaNodes'
import { useEncounter, type NarrativeChoice, type NarrativeEffect, type RandomOutcome, type RouteOption } from '../hooks/useEncounter'
import { useMetaVariables } from '../hooks/useMetaVariables'
import { useProjectStore, type AppliedEffectSummary, type DailyGoalKey, type SupplyFocus, type Weather } from '../store/useProjectStore'
import {
  buildDiaryEntry,
  buildEncounterFrame,
  buildShiftNarrative,
  distortLine,
  endings,
  getDailyGoal,
  getDistortionLevel,
  getEndingState,
  getGoalCompletionLine,
  getGoalFailureLine,
  phaseBackgrounds,
  sceneStyles,
  useRevealBlocks,
  useTypewriterText,
  weatherPool,
} from './storyHelpers'

type ButtonProps = { text: string; subtitle?: string; hoverHint?: string; onClick: () => void; disabled?: boolean; disabledReason?: string }

type ChoiceResult = {
  effect: NarrativeEffect
  feeling: string
  flags: string[]
  behavior?: 'selfish' | 'honest' | 'cooperative' | 'aggressive'
  supplyFocus: SupplyFocus
}

type TransitionFeedback =
  | {
      title: string
      lines: string[]
      action:
        | { kind: 'start-node'; nodeId: string }
        | { kind: 'start-ending-check' }
        | { kind: 'start-ending'; endingId: StartAreaEnding['id'] }
        | { kind: 'route'; eventId: string }
    }
  | null

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
  const fallbackHint = choice.feedback[choice.feedback.length - 1] ?? '這一步會把今天推向另一個不好收拾的地方。'

  if (choice.next === 'ending_check') {
    return {
      subtitle: choice.description,
      hoverHint: fallbackHint,
    }
  }

  if (choice.next in startAreaEndings) {
    const ending = startAreaEndings[choice.next as StartAreaEnding['id']]
    return {
      subtitle: choice.description,
      hoverHint: ending.text[0] ?? fallbackHint,
    }
  }

  const targetNode = startAreaNodes[choice.next]
  return {
    subtitle: choice.description,
    hoverHint: targetNode?.description[targetNode.description.length - 1] ?? fallbackHint,
  }
}

const getStartAreaFeedback = (currentNodeId: string, choice: StartAreaChoice) => ({
  title: choice.text,
  lines: choice.feedback.length ? choice.feedback : [startAreaNodes[currentNodeId]?.description[0] ?? '你沒有真的退路。'],
})

const isStartAreaChoiceVisible = (
  choice: StartAreaChoice,
  snapshot: { trust: number; suspicion: number; stress: number; flags: string[] },
) => {
  const requires = choice.requires
  if (!requires) return true
  if (requires.minTrust !== undefined && snapshot.trust < requires.minTrust) return false
  if (requires.maxTrust !== undefined && snapshot.trust > requires.maxTrust) return false
  if (requires.minSuspicion !== undefined && snapshot.suspicion < requires.minSuspicion) return false
  if (requires.maxSuspicion !== undefined && snapshot.suspicion > requires.maxSuspicion) return false
  if (requires.minStress !== undefined && snapshot.stress < requires.minStress) return false
  if (requires.maxStress !== undefined && snapshot.stress > requires.maxStress) return false
  if (requires.hasFlag && !snapshot.flags.includes(requires.hasFlag)) return false
  if (requires.lacksFlag && snapshot.flags.includes(requires.lacksFlag)) return false
  return true
}

const getStartAreaEndingId = (snapshot: { trust: number; suspicion: number; stress: number; flags: string[] }): StartAreaEnding['id'] => {
  const steadyFlags = ['shared_supplies', 'shared_water', 'shared_backroom', 'entered_clinic_together', 'shared_watch']
  const fractureFlags = ['hid_bottle', 'searched_his_bag', 'lied_at_night', 'turned_question_back', 'drank_first', 'kept_knife_close']
  const steadyCount = steadyFlags.filter((flag) => snapshot.flags.includes(flag)).length
  const fractureCount = fractureFlags.filter((flag) => snapshot.flags.includes(flag)).length

  if (snapshot.trust >= 50 && snapshot.suspicion <= 35 && snapshot.stress < 68 && steadyCount >= 2 && fractureCount === 0) {
    return 'ending_safe'
  }

  return 'ending_unstable'
}

const getStartAreaBackground = (nodeId: string | null) => {
  if (!nodeId) return null
  return startAreaNodes[nodeId]?.background ?? '/cover_mobile.jpg'
}

const getRouteFeedback = (option: RouteOption) => ({
  title: option.event.title,
  lines: [
    option.event.text[0] ?? '你往那條路看了一眼。',
    option.event.text[1] ?? '一旦踏進去，今天就會少一條能回頭的路。',
  ],
})


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
  const flags = useProjectStore((state) => state.flags)
  const remainingActions = useProjectStore((state) => state.remainingActions)
  const dayGoalKey = useProjectStore((state) => state.dayGoalKey)
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
  const [, setJournalEntries] = useState<string[]>([])
  const [backgroundSrc, setBackgroundSrc] = useState(phaseBackgrounds.phase1)
  const [backgroundVisible, setBackgroundVisible] = useState(true)
  const [currentEnding, setCurrentEnding] = useState<keyof typeof endings | null>(null)
  const [activeStartNodeId, setActiveStartNodeId] = useState<string | null>(null)
  const [appliedStartNodeIds, setAppliedStartNodeIds] = useState<string[]>([])
  const [startAreaEndingId, setStartAreaEndingId] = useState<StartAreaEnding['id'] | null>(null)
  const [endDayAfterResult, setEndDayAfterResult] = useState(false)
  const [transitionFeedback, setTransitionFeedback] = useState<TransitionFeedback>(null)

  const typedEllipsis = useTypewriterText('……', coverStage >= 1, 240)
  const typedAlive = useTypewriterText('你還活著。', coverStage >= 2, 72)
  const typedNotAlone = useTypewriterText('但不是只有你一個人。', coverStage >= 3, 68)
  const activeStartNode = useMemo(() => (activeStartNodeId ? startAreaNodes[activeStartNodeId] ?? null : null), [activeStartNodeId])
  const startAreaBackground = useMemo(() => getStartAreaBackground(activeStartNodeId), [activeStartNodeId])
  const resolvedEnding = startAreaEndingId ? startAreaEndings[startAreaEndingId] : currentEnding ? endings[currentEnding] : null
  const distortionLevel = getDistortionLevel(stress, suspicion, oddities)
  const dailyGoal = useMemo(() => getDailyGoal({ day, water, food, trust, suspicion, stress, resource: water + food }), [day, food, stress, suspicion, trust, water])

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
  const promptSourceLines = activeStartNode ? activeStartNode.description : currentEvent ? currentEvent.text : encounterFrame.lines
  const promptLines = useMemo(() => promptSourceLines.filter(Boolean), [promptSourceLines])
  const resultDisplayLines = useMemo(() => resultLines.filter(Boolean).map((line, index) => distortLine(line, distortionLevel >= 2 ? distortionLevel : 0, false, index)), [distortionLevel, resultLines])
  const transitionDisplayLines = useMemo(() => {
    const softenedLevel: 0 | 1 | 2 = distortionLevel <= 1 ? 0 : distortionLevel === 2 ? 1 : 2
    return transitionFeedback ? transitionFeedback.lines.map((line, index) => distortLine(line, softenedLevel, false, index)) : []
  }, [distortionLevel, transitionFeedback])
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

  useEffect(() => {
    if (!transitionFeedback) return undefined

    const timer = window.setTimeout(() => {
      const action = transitionFeedback.action
      setTransitionFeedback(null)

      if (action.kind === 'start-node') {
        const node = startAreaNodes[action.nodeId]
        if (!node) return

        visitNode(action.nodeId)
        setActiveStartNodeId(action.nodeId)

        if (!appliedStartNodeIds.includes(action.nodeId)) {
          const normalizedEffect = normalizeStartAreaEffect(node.effect)
          if (normalizedEffect) {
            applyEffect(normalizedEffect, getStartAreaSupplyFocus(node.effect))
          }
          node.setFlags?.forEach((flag) => setFlag(flag))
          setAppliedStartNodeIds((current) => [...current, action.nodeId])
        }

        changePhase('encounter')
        return
      }

      if (action.kind === 'start-ending-check') {
        setStartAreaEndingId(getStartAreaEndingId(useProjectStore.getState()))
        changePhase('ending')
        return
      }

      if (action.kind === 'start-ending') {
        setStartAreaEndingId(action.endingId)
        changePhase('ending')
        return
      }

      enterRoute(action.eventId)
    }, 980)

    return () => window.clearTimeout(timer)
  }, [appliedStartNodeIds, applyEffect, changePhase, enterRoute, setFlag, transitionFeedback, visitNode])

  const pushEcho = (...args: [string, ('calm' | 'warning' | 'danger')?]) => { void args }

  const emitSummary = (...args: [AppliedEffectSummary['delta']]) => { void args }

  const buildStatusSummary = (snapshot = useProjectStore.getState(), extra: string[] = []) => [
    '今天結束時，體力剩 ' + snapshot.stamina + '。',
    '淡水剩 ' + snapshot.water + '，食物剩 ' + snapshot.food + '。',
    snapshot.trust <= 35 ? '他看你的方式更像在防備。' : snapshot.suspicion >= 60 ? '猜疑沒有消失，只是暫時沒說出口。' : '你們暫時還站在同一邊。',
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
    setTransitionFeedback(null)
    setResultTitle('')
    setResultLines([])
    setResultStamp(0)
    setJournalEntries([])
    setEndDayAfterResult(false)
    refreshEnvironment(false)
    rollRoutes()
    changePhase('encounter')
    setShowCover(true)
    setCoverStage(0)
    if (audioReady) { setSeaLevel(0); setWindLevel(0); setHeartbeatLevel(0) }
  }

  function enterStartAreaNode(nodeId: string) {
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
    if (!activeStartNodeId) return

    const normalizedEffect = normalizeStartAreaEffect(choice.effect)
    if (normalizedEffect) {
      const summary = applyEffect(normalizedEffect, getStartAreaSupplyFocus(choice.effect))
      emitSummary(summary.delta)
    }
    choice.setFlags?.forEach((flag) => setFlag(flag))

    const feedback = getStartAreaFeedback(activeStartNodeId, choice)

    if (choice.next === 'ending_check') {
      setTransitionFeedback({
        ...feedback,
        action: { kind: 'start-ending-check' },
      })
      return
    }

    if (choice.next in startAreaEndings) {
      setTransitionFeedback({
        ...feedback,
        action: { kind: 'start-ending', endingId: choice.next as StartAreaEnding['id'] },
      })
      return
    }

    setTransitionFeedback({
      ...feedback,
      action: { kind: 'start-node', nodeId: choice.next },
    })
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
    if (remainingActions <= 0) return pushEcho('\u4eca\u5929\u7684\u884c\u52d5\u5df2\u7d93\u7528\u5b8c\u4e86\u3002', 'warning')
    if (option.locked) return pushEcho(option.reason ?? '\u73fe\u5728\u9084\u53bb\u4e0d\u4e86\u3002', 'warning')
    const feedback = getRouteFeedback(option)
    setTransitionFeedback({
      ...feedback,
      action: { kind: 'route', eventId: option.event.id },
    })
  }

  const handleNoRoutes = () => {
    setResultTitle('今天沒有別的路了')
    setResultLines(['能走的地方不是關著，就是代價比今天還重。', '收手不是安全，只是暫時不再往壞的地方多走一步。'])
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
    setResultLines([resolved.feeling, nodeAftermath, ...shift].filter(Boolean))
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
      <main className="relative h-[100dvh] overflow-hidden bg-black text-stone-100">
        <style>{sceneStyles}</style>
        {coverStage >= 3 && <div className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 opacity-100" style={{ backgroundImage: "url('/cover_mobile.jpg')" }} />}
        <div className="absolute inset-0 bg-black/74" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/92 to-black/96" />
        <div className="relative z-10 flex h-[100dvh] flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+1.2rem)]">
          <div className="flex-1" />
          <div className="mx-auto flex w-full max-w-[340px] flex-col items-center justify-center text-center">
            <div className="min-h-[2rem] text-lg tracking-[0.2em] text-stone-300/84">{typedEllipsis}</div>
            <div className="mt-3 min-h-[2rem] text-[1.55rem] font-semibold leading-tight tracking-[0.08em] text-stone-50">{typedAlive}</div>
            <div className="mt-4 min-h-[3rem] text-[1.08rem] leading-8 text-stone-200/80">{typedNotAlone}</div>
          </div>
          <div className="flex-1" />
          {coverStage >= 4 && (
            <button
              type="button"
              onClick={async () => {
                const ok = await unlock()
                if (ok) {
                  setSeaLevel(0.4)
                  refreshEnvironment(false)
                  setCurrentEnding(null)
                  setStartAreaEndingId(null)
                  setActiveStartNodeId(null)
                  setAppliedStartNodeIds([])
                  setShowCover(false)
                  enterStartAreaNode('start_beach')
                }
              }}
              className="mx-auto min-h-[56px] w-full max-w-[360px] rounded-[24px] border border-stone-600/80 bg-[linear-gradient(180deg,rgba(30,25,24,0.92),rgba(10,9,9,0.98))] px-6 py-4 text-base font-semibold tracking-[0.16em] text-stone-100 transition duration-300 hover:border-stone-400/85 hover:bg-[linear-gradient(180deg,rgba(42,35,33,0.95),rgba(13,11,11,0.99))]"
            >{'我醒了'}</button>
          )}
        </div>
      </main>
    )
  }

  if (phase === 'ending' && resolvedEnding) {
    return (
      <main className="relative h-[100dvh] overflow-hidden bg-black text-stone-100">
        <style>{sceneStyles}</style>
        <div className={(backgroundVisible ? 'absolute inset-0 bg-cover bg-center transition-opacity duration-1000 opacity-100' : 'absolute inset-0 bg-cover bg-center transition-opacity duration-1000 opacity-0')} style={{ backgroundImage: "url('" + backgroundSrc + "')" }} />
        <div className="absolute inset-0 bg-black/72" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/92 via-black/78 to-black" />
        <div className="relative z-10 flex h-[100dvh] flex-col overflow-hidden px-4 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-[calc(env(safe-area-inset-top)+0.6rem)]">
          <header className="mx-auto flex w-full max-w-[380px] flex-none items-center justify-between gap-3 px-1 py-2">
            <div className="rounded-full border border-stone-700/70 bg-black/46 px-3 py-2 text-[11px] uppercase tracking-[0.34em] text-stone-200/82 backdrop-blur-md">Day {day} / 30</div>
            <div className="rounded-full border border-stone-800/80 bg-black/42 px-3 py-2 text-[11px] tracking-[0.2em] text-stone-300/78 backdrop-blur-md">Ending</div>
          </header>
          <section className="flex min-h-0 flex-1 flex-col justify-end pb-3 pt-2">
            <article className="mx-auto flex w-full max-w-[380px] min-h-[34dvh] max-h-[48dvh] flex-col overflow-hidden rounded-[28px] border border-stone-700/75 bg-[linear-gradient(180deg,rgba(18,16,14,0.94),rgba(6,5,5,0.98))] px-5 py-5 shadow-[0_24px_60px_rgba(0,0,0,0.46)] backdrop-blur-xl">
              <div className="text-[10px] uppercase tracking-[0.42em] text-stone-400/64">Ending</div>
              <h1 className="mt-3 text-[clamp(1.5rem,6vw,2rem)] font-semibold leading-[1.18] tracking-[0.08em] text-stone-50">{resolvedEnding.title}</h1>
              <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 text-[1rem] leading-[1.95] tracking-[0.01em] text-stone-100/92 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {resolvedEnding.text.map((line) => <p key={line}>{line}</p>)}
              </div>
            </article>
          </section>
          <footer className="mx-auto flex w-full max-w-[380px] flex-none flex-col gap-2 pb-[calc(env(safe-area-inset-bottom)+0.65rem)]">
            <ChoiceButton text="重新開始" subtitle="回到第 1 天，走另一條路。" hoverHint="這次你會記得哪些地方曾經出事，但島不會因此變得寬容。" onClick={() => { void restartCurrentGame() }} />
          </footer>
        </div>
      </main>
    )
  }

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-black text-stone-100">
      <style>{sceneStyles}</style>
      <div className={(backgroundVisible ? 'absolute inset-0 bg-cover bg-center transition-opacity duration-1000 opacity-100' : 'absolute inset-0 bg-cover bg-center transition-opacity duration-1000 opacity-0')} style={{ backgroundImage: "url('" + sceneBackground + "')" }} />
      <div className="absolute inset-0 bg-black/68" />
      <div className={distortionLevel >= 2 ? 'absolute inset-0 bg-gradient-to-b from-black/92 via-rose-950/28 to-black' : 'absolute inset-0 bg-gradient-to-b from-black/90 via-black/70 to-black'} />
      <div className="relative z-10 flex h-[100dvh] flex-col overflow-hidden px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <header className="mx-auto flex w-full max-w-[380px] flex-none items-center justify-between gap-3 px-1 py-2">
          <div className="rounded-full border border-stone-700/70 bg-black/46 px-3 py-2 text-[11px] uppercase tracking-[0.34em] text-stone-200/82 backdrop-blur-md">Day {day} / 30</div>
          <div className="rounded-full border border-stone-800/80 bg-black/42 px-3 py-2 text-[11px] tracking-[0.2em] text-stone-300/78 backdrop-blur-md">剩餘行動 {remainingActions}</div>
        </header>

        <section className="flex min-h-0 flex-1 flex-col justify-end pb-3 pt-2">
          <article className={distortionLevel >= 2 ? 'mx-auto flex w-full max-w-[380px] min-h-[34dvh] max-h-[45dvh] flex-col overflow-hidden rounded-[28px] border border-rose-900/55 bg-[linear-gradient(180deg,rgba(24,12,12,0.9),rgba(6,5,5,0.97))] px-5 py-5 shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl' : 'mx-auto flex w-full max-w-[380px] min-h-[34dvh] max-h-[45dvh] flex-col overflow-hidden rounded-[28px] border border-stone-700/75 bg-[linear-gradient(180deg,rgba(16,14,13,0.9),rgba(5,4,4,0.97))] px-5 py-5 shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl'}>
            <div className="text-[10px] uppercase tracking-[0.42em] text-stone-400/64">{transitionFeedback ? 'Reaction' : phase === 'result' ? 'Aftermath' : activeStartNode ? 'Day 1' : currentEvent ? 'Node' : 'Route'}</div>
            <h1 className="mt-3 text-[clamp(1.5rem,6vw,2rem)] font-semibold leading-[1.18] tracking-[0.08em] text-stone-50">{transitionFeedback ? transitionFeedback.title : phase === 'result' ? resultTitle || '今天留下的東西' : activeStartNode ? activeStartNode.title : currentEvent ? currentEvent.title : encounterFrame.title}</h1>
            <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 text-[1rem] leading-[1.95] tracking-[0.01em] text-stone-100/92 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {transitionFeedback && transitionDisplayLines.map((line) => <p key={line} className="whitespace-pre-line">{line}</p>)}
              {!transitionFeedback && phase === 'encounter' && visiblePromptBlocks.map((line) => <p key={line} className="whitespace-pre-line">{line}</p>)}
              {!transitionFeedback && phase === 'result' && visibleResultBlocks.map((line) => <p key={line} className="whitespace-pre-line">{line}</p>)}
              {!transitionFeedback && phase === 'encounter' && !promptReady && <p className="whitespace-pre-line text-base leading-8 text-stone-300/72">你還在判斷今天能往哪裡走。很多路，一旦走進去就不會再回來。</p>}
            </div>
          </article>
        </section>

        <footer className="mx-auto flex w-full max-w-[380px] flex-none flex-col gap-2 pb-[calc(env(safe-area-inset-bottom)+0.65rem)]">
          {!transitionFeedback && phase === 'encounter' && promptReady && activeStartNode && (activeStartNode.choices ?? []).filter((choice) => isStartAreaChoiceVisible(choice, { trust, suspicion, stress, flags })).map((choice) => {
            const copy = getStartAreaChoiceCopy(choice)
            return <ChoiceButton key={activeStartNode.id + '-' + choice.text} text={choice.text} subtitle={copy.subtitle} hoverHint={copy.hoverHint} onClick={() => resolveStartAreaChoice(choice)} />
          })}
          {!transitionFeedback && phase === 'encounter' && promptReady && !activeStartNode && !currentEvent && routeOptions.map((option) => <ChoiceButton key={option.event.id} text={option.event.title} subtitle={option.event.text[0]} hoverHint={option.locked ? option.reason ?? '這條路暫時走不通。' : '進去之後就不能回頭重選。 ' + (option.event.text[1] || '')} disabled={option.locked || remainingActions <= 0} disabledReason={remainingActions <= 0 ? '今天的行動已經用完了。' : option.reason} onClick={() => handleRouteEnter(option)} />)}
          {!transitionFeedback && phase === 'encounter' && promptReady && !activeStartNode && !currentEvent && routeOptions.length === 0 && <ChoiceButton text="今天沒有別的路了" subtitle="能走的地方不是關著，就是代價比今天還重。" hoverHint="把今天收掉，也是一種選擇。只是明天不會因此變輕。" onClick={handleNoRoutes} />}
          {!transitionFeedback && phase === 'encounter' && promptReady && !activeStartNode && currentEvent && currentEvent.choices.map((choice) => {
            const availability = getChoiceAvailability(choice, { stamina, water, food, resource })
            return <ChoiceButton key={currentEvent.id + '-' + choice.text} text={choice.text} subtitle={choice.feeling} hoverHint={choice.hoverHint || '這一步不會只留在這裡，它會在之後的話和沉默裡再出現。'} disabled={availability.disabled} disabledReason={availability.reason} onClick={() => resolveNodeChoice(choice)} />
          })}
          {!transitionFeedback && phase === 'result' && resultReady && <ChoiceButton text={endDayAfterResult ? '讓今天結束' : '回到分岔口'} subtitle={endDayAfterResult ? '進入下一天前，時間會先拿走一點補給。' : '你還有一次行動，但下一條路不一定比較好走。'} hoverHint={endDayAfterResult ? '今天會過去，但沒處理完的事不會。' : '你還能再做一次選擇，只是錯過的節點已經回不去了。'} onClick={continueFromResult} />}
        </footer>
      </div>
    </main>
  )
}






