import { useEffect, useMemo, useRef, useState } from 'react'

import { useAmbientAudio } from '../hooks/useAmbientAudio'
import { useEncounter } from '../hooks/useEncounter'
import { useMetaVariables } from '../hooks/useMetaVariables'
import { useProjectStore, type AppliedEffectSummary, type DailyGoalKey, type Weather } from '../store/useProjectStore'
import {
  addRiskHints,
  buildDiaryEntry,
  buildEncounterFrame,
  buildShiftNarrative,
  dayActions,
  distortLine,
  endings,
  getAmbientLine,
  getDailyGoal,
  getDistortionLevel,
  getEndingState,
  getGoalCompletionLine,
  getGoalFailureLine,
  getRiskHintLine,
  isGoalCompletedByAction,
  phaseBackgrounds,
  resolveDayAction,
  sceneStyles,
  useRevealBlocks,
  useTypewriterText,
  weatherPool,
} from './storyHelpers'

type EchoTone = 'calm' | 'warning' | 'danger'
type StatKind = 'stamina' | 'water' | 'food' | 'trust' | 'suspicion' | 'stress'

type FloatingEcho = {
  id: number
  text: string
  tone: EchoTone
}

type ChoiceButtonProps = {
  text: string
  subtitle?: string
  hoverHint?: string
  onClick: () => void
  disabled?: boolean
  disabledReason?: string
  delayMs?: number
}

type HudStatProps = {
  label: string
  value: number
  stat: StatKind
}

const formatSignedValue = (value: number) => (value > 0 ? '+' + value : '' + value)

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

function ChoiceButton({ text, subtitle, hoverHint, onClick, disabled = false, disabledReason, delayMs = 0 }: ChoiceButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{ animationDelay: delayMs + 'ms' }}
      className={[
        'group w-full rounded-[24px] border px-5 py-4 text-left [animation:driftFadeUp_.55s_ease-out_both]',
        disabled
          ? 'cursor-not-allowed border-stone-800 bg-black/60 text-stone-500'
          : 'border-stone-700/80 bg-[linear-gradient(180deg,rgba(19,16,15,0.96),rgba(7,6,6,0.98))] text-stone-100 shadow-[0_18px_40px_rgba(0,0,0,0.36)] transition duration-300 hover:border-stone-500/80 hover:bg-[linear-gradient(180deg,rgba(31,26,24,0.97),rgba(10,8,8,0.99))] hover:shadow-[0_26px_52px_rgba(0,0,0,0.42)] hover:scale-[1.01] active:scale-[0.995]',
      ].join(' ')}
    >
      <div className="text-base font-semibold leading-7 tracking-[0.04em] text-stone-50">{text}</div>
      {subtitle && <div className="mt-1 text-sm leading-6 text-stone-300/80">{subtitle}</div>}
      {disabled && disabledReason && <div className="mt-2 text-sm leading-6 text-stone-500">{disabledReason}</div>}
      {hoverHint && !disabled && (
        <div className="mt-3 max-h-0 overflow-hidden rounded-2xl bg-black/35 px-3 text-sm leading-6 text-stone-300/70 opacity-0 transition-all duration-300 group-hover:max-h-28 group-hover:py-3 group-hover:opacity-100 group-focus-visible:max-h-28 group-focus-visible:py-3 group-focus-visible:opacity-100">
          {hoverHint}
        </div>
      )}
    </button>
  )
}

function HudStat({ label, value, stat }: HudStatProps) {
  const tone = getStatTone(stat, value)
  const toneClasses = tone === 'danger'
    ? 'border-rose-500/35 bg-black/50 text-rose-100'
    : tone === 'warning'
      ? 'border-amber-400/35 bg-black/46 text-amber-100'
      : 'border-stone-700/80 bg-black/42 text-stone-100'

  const valueClasses = tone === 'danger'
    ? 'text-rose-200'
    : tone === 'warning'
      ? 'text-amber-100'
      : 'text-stone-50'

  return (
    <div className={'rounded-2xl border px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ' + toneClasses}>
      <div className="text-[10px] uppercase tracking-[0.26em] text-stone-300/85">{label}</div>
      <div className={'mt-1 text-base font-semibold tracking-[0.04em] ' + valueClasses}>{value}</div>
    </div>
  )
}

export function StarterShell() {
  useMetaVariables()

  const { ready: audioReady, unlock, setSeaLevel, setWindLevel, setHeartbeatLevel } = useAmbientAudio()
  const { currentEvent, rollEvent } = useEncounter()

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
  const [endDayAfterResult, setEndDayAfterResult] = useState(false)
  const echoIdRef = useRef(0)

  const typedEllipsis = useTypewriterText('……', coverStage >= 1, 240)
  const typedAlive = useTypewriterText('你還活著。', coverStage >= 2, 72)
  const typedNotAlone = useTypewriterText('但不是只有你一個人。', coverStage >= 3, 68)
  const distortionLevel = getDistortionLevel(stress, suspicion, oddities)

  const dailyGoal = useMemo(
    () => getDailyGoal({ day, water, food, trust, suspicion, stress, resource: water + food }),
    [day, food, stress, suspicion, trust, water],
  )
  const currentGoalKey = dailyGoal.key

  const ambientLine = getAmbientLine(day, metaVariables.weather, metaVariables.isNight, water, food)

  useEffect(() => {
    if (currentGoalKey !== dayGoalKey) {
      setDayGoalKey(currentGoalKey as DailyGoalKey)
    }
  }, [currentGoalKey, dayGoalKey, setDayGoalKey])

  const encounterFrame = useMemo(
    () => buildEncounterFrame({ day, dailyGoal, currentEvent, stamina, water, food, trust, suspicion, stress, oddities }),
    [currentEvent, dailyGoal, day, food, oddities, stamina, stress, suspicion, trust, water],
  )

  const promptLines = useMemo(
    () => addRiskHints(encounterFrame.lines, { stamina, water, food, trust, suspicion, stress }),
    [encounterFrame.lines, food, stamina, stress, suspicion, trust, water],
  )

  const distortedPromptLines = useMemo(
    () => promptLines.map((line, index) => distortLine(line, distortionLevel, currentEvent?.unreliable, index)),
    [currentEvent?.unreliable, distortionLevel, promptLines],
  )

  const distortedResultLines = useMemo(
    () => addRiskHints(resultLines, { stamina, water, food, trust, suspicion, stress }).map((line, index) => distortLine(line, distortionLevel >= 2 ? distortionLevel : 0, false, index)),
    [distortionLevel, food, resultLines, stamina, stress, suspicion, trust, water],
  )

  const { blocks: visiblePromptBlocks, complete: promptReady } = useRevealBlocks(
    distortedPromptLines,
    currentEvent ? day + '-' + currentEvent.id + '-' + phase : day + '-' + phase,
    !showCover && phase === 'encounter',
    240,
    850,
  )

  const { blocks: visibleResultBlocks, complete: resultReady } = useRevealBlocks(
    distortedResultLines,
    day + '-' + resultStamp + '-result',
    !showCover && phase === 'result',
    220,
    740,
  )

  useEffect(() => {
    if (!showCover) return undefined
    if (coverStage === 0) {
      const timer = window.setTimeout(() => setCoverStage(1), 500)
      return () => window.clearTimeout(timer)
    }
    if (coverStage === 1 && typedEllipsis.length === '……'.length) {
      const timer = window.setTimeout(() => setCoverStage(2), 800)
      return () => window.clearTimeout(timer)
    }
    if (coverStage === 2 && typedAlive.length === '你還活著。'.length) {
      const timer = window.setTimeout(() => setCoverStage(3), 1200)
      return () => window.clearTimeout(timer)
    }
    if (coverStage === 3 && typedNotAlone.length === '但不是只有你一個人。'.length) {
      const timer = window.setTimeout(() => setCoverStage(4), 200)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [coverStage, showCover, typedAlive.length, typedEllipsis.length, typedNotAlone.length])

  useEffect(() => {
    if (!audioReady || showCover) return
    setWindLevel(metaVariables.isNight ? 0.08 : 0)
    setHeartbeatLevel(stress >= 80 ? Math.min(1, 0.35 + (stress - 80) / 20) : 0)
  }, [audioReady, metaVariables.isNight, setHeartbeatLevel, setWindLevel, showCover, stress])

  const sceneBackground = useMemo(() => {
    if (showCover) return '/cover_mobile.jpg'
    if (phase === 'ending') return '/bg_phase5.jpg'
    if (currentEvent?.background && phase === 'encounter') return '/' + currentEvent.background
    return phaseBackgrounds[dayPhase]
  }, [currentEvent, dayPhase, phase, showCover])

  useEffect(() => {
    if (sceneBackground === backgroundSrc) return undefined

    const fadeTimer = window.setTimeout(() => setBackgroundVisible(false), 0)
    const swapTimer = window.setTimeout(() => {
      setBackgroundSrc(sceneBackground)
      setBackgroundVisible(true)
    }, 520)

    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(swapTimer)
    }
  }, [backgroundSrc, sceneBackground])

  const pushFloatingEcho = (text: string, tone: EchoTone) => {
    echoIdRef.current += 1
    const id = echoIdRef.current
    setFloatingEchoes((current) => [...current, { id, text, tone }])
    window.setTimeout(() => {
      setFloatingEchoes((current) => current.filter((echo) => echo.id !== id))
    }, 1900)
  }

  const emitEffectSummary = (summary: AppliedEffectSummary['delta']) => {
    const entries: Array<{ label: string; value: number; tone: EchoTone }> = []

    if (summary.stamina !== 0) entries.push({ label: '體力', value: summary.stamina, tone: getEchoTone(summary.stamina) })
    if (summary.water !== 0) entries.push({ label: '淡水', value: summary.water, tone: getEchoTone(summary.water) })
    if (summary.food !== 0) entries.push({ label: '食物', value: summary.food, tone: getEchoTone(summary.food) })
    if (summary.trust !== 0) entries.push({ label: '信任', value: summary.trust, tone: getEchoTone(summary.trust) })
    if (summary.suspicion !== 0) entries.push({ label: '懷疑', value: summary.suspicion, tone: getEchoTone(summary.suspicion, true) })
    if (summary.stress !== 0) entries.push({ label: '壓力', value: summary.stress, tone: getEchoTone(summary.stress, true) })

    entries.slice(0, 4).forEach((entry) => {
      pushFloatingEcho(entry.label + ' ' + formatSignedValue(entry.value), entry.tone)
    })
  }

  const buildStatusSummary = (snapshot = useProjectStore.getState(), extraLines: string[] = []) => {
    const lines = [
      '今天結束時，體力剩 ' + snapshot.stamina + '。',
      '淡水剩 ' + snapshot.water + '，食物剩 ' + snapshot.food + '。',
      snapshot.trust <= 35
        ? '他沒有多說，但你知道他已經開始防著你。'
        : snapshot.suspicion >= 60
          ? '表面還算平靜，可猜疑已經掛在每句話後面。'
          : '你們暫時還站在同一邊，只是沒有誰真的敢放鬆。',
      getRiskHintLine(snapshot),
    ]

    return [...lines, ...extraLines]
  }

  const refreshEnvironment = (night: boolean) => {
    const state = useProjectStore.getState()
    const weather = weatherPool[(state.day + state.suspicion + state.stress + (night ? 1 : 0)) % weatherPool.length] as Weather
    const hour = night ? 23 : 8 + ((state.day + state.trust + state.water + state.food) % 9)
    setMetaVariables({ weather, hour, isNight: night })
  }

  const restartCurrentGame = async () => {
    resetGame()
    setCurrentEnding(null)
    setResultTitle('')
    setResultLines([])
    setResultStamp(0)
    setJournalEntries([])
    setShowJournal(false)
    setEndDayAfterResult(false)
    refreshEnvironment(false)
    rollEvent()
    changePhase('encounter')
    setShowCover(true)
    setCoverStage(0)
    if (audioReady) {
      setSeaLevel(0)
      setWindLevel(0)
      setHeartbeatLevel(0)
    }
  }

  const getActionAvailability = (actionId: string) => {
    if (remainingActions <= 0) {
      return { disabled: true, reason: '今天的行動已經用完了。' }
    }

    if (actionId !== 'rest' && stamina <= 0) {
      return { disabled: true, reason: '你現在做不到。' }
    }

    return { disabled: false, reason: undefined }
  }

  const applyDayAction = (actionId: typeof dayActions[number]['id']) => {
    const availability = getActionAvailability(actionId)
    if (availability.disabled) {
      pushFloatingEcho(availability.reason ?? '你現在做不到。', 'warning')
      return
    }

    const before = useProjectStore.getState()
    const actionResult = resolveDayAction(actionId, before, dailyGoal, currentEvent)

    const summary = applyEffect(actionResult.effect, actionResult.supplyFocus)
    consumeAction(1)
    if (actionResult.behavior) {
      incrementBehavior(actionResult.behavior)
    }
    actionResult.flags?.forEach((flag) => setFlag(flag))
    setOtherAlive(!(actionResult.flags ?? []).some((flag) => ['killed_companion', 'accidental_killing', 'other_left_behind', 'they_walked_away'].includes(flag)))

    const after = useProjectStore.getState()
    const completedGoal = isGoalCompletedByAction(dailyGoal, actionResult)
    if (completedGoal) {
      setGoalCompleted(true)
      pushFloatingEcho('今日目標有進展', 'calm')
    }

    const shiftLines = buildShiftNarrative(
      {
        trust: before.trust,
        suspicion: before.suspicion,
        stress: before.stress,
        stamina: before.stamina,
        hp: before.hp,
        water: before.water,
        food: before.food,
      },
      {
        trust: after.trust,
        suspicion: after.suspicion,
        stress: after.stress,
        stamina: after.stamina,
        hp: after.hp,
        water: after.water,
        food: after.food,
      },
    )

    const narrativeLines = addRiskHints(
      [actionResult.feeling, ...actionResult.lines, ...shiftLines, completedGoal ? getGoalCompletionLine(dailyGoal) : ''],
      after,
    )

    setResultTitle(actionResult.title)
    setResultLines(narrativeLines)
    setResultStamp((stamp) => stamp + 1)
    setEndDayAfterResult(actionResult.endsDay || after.remainingActions <= 0)
    changePhase('result')
    emitEffectSummary(summary.delta)

    if (actionResult.tier === 'failure') {
      pushFloatingEcho('這次行動幾乎白費了。', 'warning')
    }
    if (summary.delta.trust <= -5) pushFloatingEcho('這件事會被記住。', 'warning')
    if (summary.delta.suspicion >= 4) pushFloatingEcho('猜疑在變重。', 'warning')
    if (summary.delta.stress >= 5) pushFloatingEcho('壓力正在往上堆。', 'danger')
  }

  const continueFromResult = () => {
    const stateBefore = useProjectStore.getState()
    const shouldEndNow =
      stateBefore.hp <= 0 ||
      stateBefore.day >= 30 ||
      !stateBefore.otherAlive ||
      stateBefore.flags.includes('killed_companion') ||
      stateBefore.flags.includes('accidental_killing') ||
      stateBefore.flags.includes('mutual_ruin')

    if (shouldEndNow) {
      setJournalEntries((entries) => [
        buildDiaryEntry(stateBefore.day, resultTitle || '今天留下的東西', resultLines, buildStatusSummary(stateBefore)),
        ...entries,
      ].slice(0, 30))
      setCurrentEnding(getEndingState(stateBefore))
      changePhase('ending')
      return
    }

    if (!endDayAfterResult) {
      changePhase('encounter')
      rollEvent()
      return
    }

    const goalMissed = !stateBefore.goalCompleted
    const goalLine = goalMissed ? getGoalFailureLine(dailyGoal) : getGoalCompletionLine(dailyGoal)
    const daySummary = nextDay()
    const stateAfter = useProjectStore.getState()

    setJournalEntries((entries) => [
      buildDiaryEntry(
        daySummary.previousDay,
        '今天留下的東西',
        [...resultLines, goalLine],
        buildStatusSummary(stateAfter, [goalMissed ? '今天的目標沒有完成。' : '今天的目標勉強完成了。']),
      ),
      ...entries,
    ].slice(0, 30))

    emitEffectSummary(daySummary.delta)
    if (goalMissed) {
      pushFloatingEcho('今天沒有把事情收好。', 'danger')
    } else {
      pushFloatingEcho('今天至少先撐過去了。', 'calm')
    }

    if (stateAfter.hp <= 0 || !stateAfter.otherAlive || stateAfter.flags.includes('mutual_ruin')) {
      setCurrentEnding(getEndingState(stateAfter))
      changePhase('ending')
      return
    }

    refreshEnvironment(false)
    setResultTitle('')
    setResultLines([])
    setCurrentEnding(null)
    setEndDayAfterResult(false)
    changePhase('encounter')
    rollEvent()
  }

  if (showCover) {
    return (
      <main className="relative min-h-[100dvh] overflow-hidden bg-black text-stone-100">
        <style>{sceneStyles}</style>
        {coverStage >= 3 && (
          <div
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 opacity-100"
            style={{ backgroundImage: "url('/cover_mobile.jpg')" }}
          />
        )}
        <div className="absolute inset-0 bg-black/72" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/92 to-black/96" />
        <div className="absolute inset-0 opacity-25 [animation:driftPulse_6s_ease-in-out_infinite] [background-image:radial-gradient(rgba(255,255,255,0.08)_0.7px,transparent_0.7px)] [background-size:13px_13px]" />
        <div className="relative z-10 flex min-h-[100dvh] flex-col px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+1.5rem)]">
          <div className="flex-1" />
          <div className="mx-auto w-full max-w-[320px] space-y-5 text-center">
            <div className="min-h-[2rem] text-lg tracking-[0.2em] text-stone-300/84">{typedEllipsis}</div>
            <div className="min-h-[2rem] text-[1.55rem] font-semibold leading-tight tracking-[0.08em] text-stone-50">{typedAlive}</div>
            <div className="min-h-[3rem] text-[1.12rem] leading-8 text-stone-200/80">{typedNotAlone}</div>
          </div>
          <div className="flex-1" />
          {coverStage >= 4 && (
            <button
              type="button"
              onClick={async () => {
                const didUnlock = await unlock()
                if (didUnlock) setSeaLevel(0.4)
                refreshEnvironment(false)
                setShowCover(false)
                changePhase('encounter')
              }}
              className="mx-auto min-h-[56px] w-full max-w-[360px] rounded-[24px] border border-stone-600/80 bg-[linear-gradient(180deg,rgba(30,25,24,0.92),rgba(10,9,9,0.98))] px-6 py-4 text-base font-semibold tracking-[0.16em] text-stone-100 transition duration-300 hover:border-stone-400/85 hover:bg-[linear-gradient(180deg,rgba(42,35,33,0.95),rgba(13,11,11,0.99))]"
            >
              我醒了
            </button>
          )}
        </div>
      </main>
    )
  }

  if (phase === 'ending' && currentEnding) {
    return (
      <main className="relative min-h-[100dvh] overflow-hidden bg-black text-stone-100">
        <style>{sceneStyles}</style>
        <div className={(backgroundVisible ? 'absolute inset-0 bg-cover bg-center transition-opacity duration-1000 opacity-100' : 'absolute inset-0 bg-cover bg-center transition-opacity duration-1000 opacity-0')} style={{ backgroundImage: "url('" + backgroundSrc + "')" }} />
        <div className="absolute inset-0 bg-black/68" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/92 via-black/78 to-black" />
        <div className="relative z-10 flex min-h-[100dvh] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)]">
          <header className="mx-auto w-full max-w-[360px] rounded-[22px] border border-stone-700/70 bg-black/48 px-4 py-3 backdrop-blur-xl">
            <div className="text-[11px] uppercase tracking-[0.42em] text-stone-300/78">Day {day}</div>
          </header>
          <div className="flex-1" />
          <article className="mx-auto w-full max-w-[320px] rounded-[28px] border border-stone-700/75 bg-[linear-gradient(180deg,rgba(18,16,14,0.94),rgba(6,5,5,0.98))] px-5 py-6 shadow-[0_24px_60px_rgba(0,0,0,0.46)] backdrop-blur-xl">
            <div className="text-[11px] uppercase tracking-[0.46em] text-stone-400/68">Ending</div>
            <h1 className="mt-4 text-[2rem] font-semibold leading-tight tracking-[0.08em] text-stone-50">{endings[currentEnding].title}</h1>
            <div className="mt-5 space-y-5 text-[1.05rem] leading-[2.0] text-stone-100/90">
              {endings[currentEnding].text.map((line) => (
                <p key={line} className="[animation:driftFadeUp_.7s_ease-out_both]">{line}</p>
              ))}
            </div>
          </article>
          <div className="mx-auto mt-4 w-full max-w-[360px]">
            <ChoiceButton text="重新開始" subtitle="回到第 1 天，把這些選擇再做一次。" hoverHint="你會記得上一輪發生過什麼，但島不會替你留情。" onClick={() => { void restartCurrentGame() }} />
          </div>
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
      <div className="absolute inset-0 opacity-18 [background-image:radial-gradient(rgba(255,255,255,0.07)_0.7px,transparent_0.7px)] [background-size:13px_13px] mix-blend-soft-light" />

      <div className="relative z-10 flex min-h-[100dvh] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <header className="sticky top-[calc(env(safe-area-inset-top)+0.5rem)] z-20 mx-auto w-full max-w-[360px] rounded-[24px] border border-stone-700/75 bg-black/48 px-3 py-3 shadow-[0_14px_34px_rgba(0,0,0,0.34)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3 rounded-2xl bg-black/40 px-3 py-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.42em] text-stone-300/82">Day {day} / 30</div>
              <div className="mt-2 text-xs leading-6 text-stone-200/80">{ambientLine}</div>
            </div>
            <button type="button" onClick={() => setShowJournal(true)} className="rounded-full border border-stone-600/80 bg-black/45 px-3 py-2 text-[11px] tracking-[0.24em] text-stone-100/80 transition hover:bg-black/60">
              日誌
            </button>
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

        <div className="pointer-events-none absolute inset-x-4 top-[calc(env(safe-area-inset-top)+14.5rem)] z-20 space-y-2">
          {floatingEchoes.map((echo) => (
            <div
              key={echo.id}
              className={[
                'mx-auto max-w-[320px] rounded-full border px-3 py-2 text-center text-[11px] tracking-[0.18em] [animation:driftToast_1.9s_ease-out_both]',
                echo.tone === 'danger'
                  ? 'border-rose-500/28 bg-black/70 text-rose-100'
                  : echo.tone === 'warning'
                    ? 'border-amber-500/28 bg-black/70 text-amber-100'
                    : 'border-emerald-500/24 bg-black/70 text-emerald-100',
              ].join(' ')}
            >
              {echo.text}
            </div>
          ))}
        </div>

        <section className="flex flex-1 flex-col justify-center px-1 py-6">
          <article className={[
            'mx-auto w-full max-w-[320px] rounded-[28px] border px-5 py-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl',
            distortionLevel >= 2
              ? 'border-rose-900/55 bg-[linear-gradient(180deg,rgba(28,14,14,0.94),rgba(8,6,6,0.98))]'
              : 'border-stone-700/75 bg-[linear-gradient(180deg,rgba(18,16,14,0.94),rgba(6,5,5,0.98))]',
          ].join(' ')}>
            <div className="text-[11px] uppercase tracking-[0.46em] text-stone-400/66">{phase === 'encounter' ? 'Today' : 'Aftermath'}</div>
            <h1 className="mt-4 text-[clamp(1.8rem,6.8vw,2.3rem)] font-semibold leading-tight tracking-[0.08em] text-stone-50">
              {phase === 'result' ? resultTitle || '今天留下的東西' : encounterFrame.title}
            </h1>
            <div className="mt-5 space-y-5 text-[1.05rem] leading-[2.0] tracking-[0.01em] text-stone-100/92">
              {phase === 'encounter' && visiblePromptBlocks.map((line) => (
                <p key={line} className="whitespace-pre-line [animation:driftFadeUp_.75s_ease-out_both]">{line}</p>
              ))}
              {phase === 'result' && visibleResultBlocks.map((line) => (
                <p key={line} className="whitespace-pre-line [animation:driftFadeUp_.75s_ease-out_both]">{line}</p>
              ))}
              {phase === 'encounter' && !promptReady && <p className="text-base leading-8 text-stone-300/72">你還在把今天看清楚。可看清楚這件事，本身也要代價。</p>}
            </div>
          </article>
        </section>

        <footer className="mx-auto w-full max-w-[360px] space-y-3">
          {phase === 'encounter' && promptReady && dayActions.map((action, index) => {
            const availability = getActionAvailability(action.id)
            return (
              <ChoiceButton
                key={action.id}
                text={action.title}
                subtitle={action.summary}
                hoverHint={action.hoverHint}
                disabled={availability.disabled}
                disabledReason={availability.reason}
                delayMs={index * 50}
                onClick={() => applyDayAction(action.id)}
              />
            )
          })}

          {phase === 'result' && resultReady && (
            <ChoiceButton
              text={endDayAfterResult ? '讓今天結束' : '再做一次選擇'}
              subtitle={endDayAfterResult ? '進入下一天前，水和食物都會被時間帶走。' : '你還有行動可以用，但每一次都會留下後果。'}
              hoverHint={endDayAfterResult ? '今天會過去，但沒處理完的東西不會。' : '你還能再試一次，只是下一次不一定更容易。'}
              onClick={continueFromResult}
            />
          )}
        </footer>
      </div>

      {showJournal && (
        <>
          <button type="button" aria-label="關閉日誌" onClick={() => setShowJournal(false)} className="absolute inset-0 z-30 bg-black/62" />
          <aside className="absolute right-0 top-0 z-40 flex h-full w-[86vw] max-w-sm flex-col border-l border-stone-700/70 bg-[linear-gradient(180deg,rgba(12,10,9,0.98),rgba(4,3,3,1))] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)] shadow-2xl backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.42em] text-stone-400/68">Journal</div>
                <h2 className="mt-2 text-xl font-semibold tracking-[0.08em] text-stone-50">日誌</h2>
              </div>
              <button type="button" onClick={() => setShowJournal(false)} className="rounded-full border border-stone-700/70 px-3 py-2 text-[11px] tracking-[0.25em] text-stone-200/72">
                關閉
              </button>
            </div>
            <div className="mt-5 flex-1 space-y-4 overflow-y-auto pr-1">
              {(journalEntries.length > 0 ? journalEntries : ['Day 1\n海風還很近。\n但真正會留下來的，是你們怎麼看彼此。']).map((entry) => (
                <article key={entry} className="rounded-[22px] border border-stone-800/75 bg-black/35 px-4 py-4">
                  <p className="whitespace-pre-line text-sm leading-7 text-stone-100/88">{entry}</p>
                </article>
              ))}
            </div>
          </aside>
        </>
      )}
    </main>
  )
}
