import { useEffect, useMemo, useReducer, useRef } from 'react'

import events from '../data/events.json'
import { useProjectStore, type BehaviorType, type DayPhase } from '../store/useProjectStore'

export type EventCategory = 'resource' | 'trust' | 'psychological' | 'external' | 'collapse'

export type NarrativeEventConditions = {
  minDay?: number
  maxDay?: number
  minTrust?: number
  maxTrust?: number
  minSuspicion?: number
  maxSuspicion?: number
  minStress?: number
  maxStress?: number
  minStamina?: number
  maxStamina?: number
  minWater?: number
  maxWater?: number
  minFood?: number
  maxFood?: number
  minResource?: number
  maxResource?: number
  minOddities?: number
  maxOddities?: number
}

export type BehaviorRequirements = Partial<Record<BehaviorType, number>>

export type NarrativeEffect = {
  trust?: number
  resource?: number
  water?: number
  food?: number
  stress?: number
  suspicion?: number
  stamina?: number
  hp?: number
  oddities?: number
}

export type RandomOutcome = {
  chance: number
  effect?: NarrativeEffect
  feeling?: string
  setFlags?: string[]
}

export type NarrativeChoice = {
  text: string
  effect: NarrativeEffect
  feeling: string
  hoverHint?: string
  behavior?: BehaviorType
  setFlags?: string[]
  randomOutcomes?: RandomOutcome[]
}

export type NarrativeEvent = {
  id: string
  title: string
  category: EventCategory
  text: string[]
  choices: NarrativeChoice[]
  background?: string
  weight?: number
  tags?: string[]
  unreliable?: boolean
  misleadLevel?: 1 | 2 | 3
  days?: number[]
  dayRange?: {
    min: number
    max: number
  }
  dayPhase?: DayPhase[]
  requiredFlags?: string[]
  excludedFlags?: string[]
  conditions?: NarrativeEventConditions
  requiresBehavior?: BehaviorRequirements
}

type WeightedEvent = NarrativeEvent & {
  adjustedWeight: number
}

type EncounterAction = {
  pool: WeightedEvent[]
  excludeIds?: string[]
}

type BehaviorSnapshot = {
  selfishCount: number
  honestCount: number
  cooperativeCount: number
  aggressiveCount: number
}

const narrativeEvents = events as NarrativeEvent[]
const RECENT_EVENT_LIMIT = 5

const matchesDay = (event: NarrativeEvent, day: number) => {
  if (event.days?.length) {
    return event.days.includes(day)
  }

  if (event.dayRange) {
    return day >= event.dayRange.min && day <= event.dayRange.max
  }

  return true
}

const matchesConditions = (
  conditions: NarrativeEventConditions | undefined,
  {
    day,
    trust,
    suspicion,
    stress,
    stamina,
    water,
    food,
    resource,
    oddities,
  }: {
    day: number
    trust: number
    suspicion: number
    stress: number
    stamina: number
    water: number
    food: number
    resource: number
    oddities: number
  },
) => {
  if (!conditions) {
    return true
  }

  if (conditions.minDay !== undefined && day < conditions.minDay) return false
  if (conditions.maxDay !== undefined && day > conditions.maxDay) return false
  if (conditions.minTrust !== undefined && trust < conditions.minTrust) return false
  if (conditions.maxTrust !== undefined && trust > conditions.maxTrust) return false
  if (conditions.minSuspicion !== undefined && suspicion < conditions.minSuspicion) return false
  if (conditions.maxSuspicion !== undefined && suspicion > conditions.maxSuspicion) return false
  if (conditions.minStress !== undefined && stress < conditions.minStress) return false
  if (conditions.maxStress !== undefined && stress > conditions.maxStress) return false
  if (conditions.minStamina !== undefined && stamina < conditions.minStamina) return false
  if (conditions.maxStamina !== undefined && stamina > conditions.maxStamina) return false
  if (conditions.minWater !== undefined && water < conditions.minWater) return false
  if (conditions.maxWater !== undefined && water > conditions.maxWater) return false
  if (conditions.minFood !== undefined && food < conditions.minFood) return false
  if (conditions.maxFood !== undefined && food > conditions.maxFood) return false
  if (conditions.minResource !== undefined && resource < conditions.minResource) return false
  if (conditions.maxResource !== undefined && resource > conditions.maxResource) return false
  if (conditions.minOddities !== undefined && oddities < conditions.minOddities) return false
  if (conditions.maxOddities !== undefined && oddities > conditions.maxOddities) return false

  return true
}

const matchesBehaviorRequirements = (
  requirements: BehaviorRequirements | undefined,
  snapshot: BehaviorSnapshot,
) => {
  if (!requirements) {
    return true
  }

  return (
    (requirements.selfish ?? 0) <= snapshot.selfishCount &&
    (requirements.honest ?? 0) <= snapshot.honestCount &&
    (requirements.cooperative ?? 0) <= snapshot.cooperativeCount &&
    (requirements.aggressive ?? 0) <= snapshot.aggressiveCount
  )
}

const isNegativeChoice = (choice: NarrativeChoice) => {
  const effect = choice.effect

  return (
    (effect.trust ?? 0) < 0 ||
    (effect.resource ?? 0) < 0 ||
    (effect.water ?? 0) < 0 ||
    (effect.food ?? 0) < 0 ||
    (effect.stress ?? 0) > 0 ||
    (effect.suspicion ?? 0) > 0 ||
    (effect.stamina ?? 0) < 0 ||
    (effect.hp ?? 0) < 0
  )
}

const eventFeelsHostile = (event: NarrativeEvent) => {
  return event.category === 'collapse' || event.choices.some(isNegativeChoice)
}

const getAdjustedPool = (
  pool: NarrativeEvent[],
  {
    suspicion,
    stress,
    flags,
    behavior,
    resource,
    water,
    food,
  }: {
    suspicion: number
    stress: number
    flags: string[]
    behavior: BehaviorSnapshot
    resource: number
    water: number
    food: number
  },
): WeightedEvent[] => {
  const memoryOfStealing = flags.some((flag) => ['took_more_for_self', 'stole_rations', 'hid_water', 'lied_about_supplies', 'betrayed_them'].includes(flag))
  const coldWar = flags.includes('cold_war_started') || flags.includes('cold_war_hardened')

  return pool.map((event) => {
    let adjustedWeight = event.weight ?? 10

    if (event.days?.length) {
      adjustedWeight *= 2.4
    }

    if (suspicion > 70 && (event.tags?.includes('paranoia') || event.category === 'trust')) {
      adjustedWeight *= 1.9
    }

    if (stress > 80 && (event.tags?.includes('hallucination') || event.category === 'collapse')) {
      adjustedWeight *= 1.95
    }

    if ((resource <= 2 || water <= 1 || food <= 1) && event.category === 'resource') {
      adjustedWeight *= 1.4
    }

    if (memoryOfStealing && (event.category === 'trust' || event.category === 'collapse')) {
      adjustedWeight *= 1.35
    }

    if (coldWar && event.category === 'collapse') {
      adjustedWeight *= 1.5
    }

    if (behavior.selfishCount >= 3 && (event.category === 'trust' || event.category === 'collapse')) {
      adjustedWeight *= 1.18
    }

    if (behavior.cooperativeCount >= 3 && event.category === 'resource') {
      adjustedWeight *= 1.12
    }

    if (behavior.aggressiveCount >= 2 && eventFeelsHostile(event)) {
      adjustedWeight *= 1.16
    }

    if (event.unreliable) {
      adjustedWeight *= stress > 65 || suspicion > 55 ? 1.28 : 1.08
    }

    return {
      ...event,
      adjustedWeight,
    }
  })
}

const pickWeightedEvent = (pool: WeightedEvent[], excludeIds: string[] = []): NarrativeEvent | null => {
  if (pool.length === 0) {
    return null
  }

  const filteredPool = pool.length > excludeIds.length
    ? pool.filter((event) => !excludeIds.includes(event.id))
    : pool

  const candidatePool = filteredPool.length > 0 ? filteredPool : pool
  const totalWeight = candidatePool.reduce((sum, event) => sum + event.adjustedWeight, 0)
  let roll = Math.random() * totalWeight

  for (const event of candidatePool) {
    roll -= event.adjustedWeight
    if (roll <= 0) {
      return event
    }
  }

  return candidatePool[candidatePool.length - 1]
}

const encounterReducer = (_currentEvent: NarrativeEvent | null, action: EncounterAction) => {
  return pickWeightedEvent(action.pool, action.excludeIds)
}

export function useEncounter() {
  const day = useProjectStore((state) => state.day)
  const dayPhase = useProjectStore((state) => state.dayPhase)
  const trust = useProjectStore((state) => state.trust)
  const suspicion = useProjectStore((state) => state.suspicion)
  const stress = useProjectStore((state) => state.stress)
  const stamina = useProjectStore((state) => state.stamina)
  const water = useProjectStore((state) => state.water)
  const food = useProjectStore((state) => state.food)
  const resource = useProjectStore((state) => state.resource)
  const oddities = useProjectStore((state) => state.oddities)
  const flags = useProjectStore((state) => state.flags)
  const selfishCount = useProjectStore((state) => state.selfishCount)
  const honestCount = useProjectStore((state) => state.honestCount)
  const cooperativeCount = useProjectStore((state) => state.cooperativeCount)
  const aggressiveCount = useProjectStore((state) => state.aggressiveCount)
  const recentEventIdsRef = useRef<string[]>([])

  const behavior = useMemo(
    () => ({ selfishCount, honestCount, cooperativeCount, aggressiveCount }),
    [selfishCount, honestCount, cooperativeCount, aggressiveCount],
  )

  const pool = useMemo(() => {
    const phaseFiltered = narrativeEvents.filter((event) => !event.dayPhase || event.dayPhase.includes(dayPhase))

    const basePool = phaseFiltered.filter((event) => {
      const requiredFlags = event.requiredFlags ?? []
      const excludedFlags = event.excludedFlags ?? []

      return (
        matchesDay(event, day) &&
        requiredFlags.every((flag) => flags.includes(flag)) &&
        excludedFlags.every((flag) => !flags.includes(flag)) &&
        matchesConditions(event.conditions, { day, trust, suspicion, stress, stamina, water, food, resource, oddities }) &&
        matchesBehaviorRequirements(event.requiresBehavior, behavior)
      )
    })

    const exactDayEvents = basePool.filter((event) => event.days?.includes(day))
    const priorityPool = exactDayEvents.length > 0 ? exactDayEvents : basePool

    return getAdjustedPool(priorityPool, { suspicion, stress, flags, behavior, resource, water, food })
  }, [behavior, day, dayPhase, flags, food, oddities, resource, stamina, stress, suspicion, trust, water])

  const [currentEvent, dispatchEvent] = useReducer(
    encounterReducer,
    pool,
    (initialPool) => pickWeightedEvent(initialPool),
  )

  const rollEvent = () => {
    dispatchEvent({
      pool,
      excludeIds: recentEventIdsRef.current,
    })
  }

  useEffect(() => {
    dispatchEvent({
      pool,
      excludeIds: recentEventIdsRef.current,
    })
  }, [pool])

  useEffect(() => {
    if (!currentEvent) {
      return
    }

    recentEventIdsRef.current = [
      currentEvent.id,
      ...recentEventIdsRef.current.filter((id) => id !== currentEvent.id),
    ].slice(0, RECENT_EVENT_LIMIT)
  }, [currentEvent])

  return {
    currentEvent,
    rollEvent,
  }
}
