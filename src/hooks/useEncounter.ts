import { useEffect, useMemo, useReducer, useRef } from 'react'

import events from '../data/events.json'
import {
  useProjectStore,
  type BehaviorType,
  type DayPhase,
  type ResourceType,
} from '../store/useProjectStore'

export type EventTag = 'day' | 'night'
export type EventType = 'resource' | 'danger' | 'companion'
export type EventRarity = 'common' | 'uncommon' | 'rare'
export type NpcIntent = 'helpful' | 'selfish' | 'uncertain'

type WeightedEncounterEvent = EncounterEvent & {
  adjustedWeight: number
}

export type EncounterConditions = {
  minDay?: number
  maxDay?: number
  minEnergy?: number
  maxEnergy?: number
  minRelationship?: number
  maxRelationship?: number
  minSuspicion?: number
  maxSuspicion?: number
  minFood?: number
  maxFood?: number
  minWater?: number
  maxWater?: number
}

export type EncounterBehaviorRequirements = Partial<Record<BehaviorType, number>>

export type EncounterEffects = {
  energy?: number
  relationship?: number
  trust?: number
  stress?: number
  suspicion?: number
  hp?: number
  resources?: Partial<Record<ResourceType, number>>
}

export type EncounterOption = {
  text: string
  result: string
  hint?: string
  setFlags?: string[]
  behavior?: BehaviorType
  effects: EncounterEffects
}

export type EncounterEvent = {
  id: string
  type: EventType
  rarity: EventRarity
  weight: number
  text: string
  distortionVariants?: {
    normal?: string
    distorted?: string
  }
  tags: EventTag[]
  phase?: DayPhase[]
  requires?: string[]
  excludes?: string[]
  conditions?: EncounterConditions
  requiresBehavior?: EncounterBehaviorRequirements
  unreliable?: boolean
  misleadLevel?: 1 | 2 | 3
  npcSuggestion?: string
  npcIntent?: NpcIntent
  options: EncounterOption[]
}

type BehaviorCounts = {
  selfishCount: number
  honestCount: number
  cooperativeCount: number
  aggressiveCount: number
}

type EncounterAction = {
  pool: WeightedEncounterEvent[]
  excludeIds?: string[]
}

const encounterEvents = events as EncounterEvent[]
const RECENT_EVENT_LIMIT = 3

const isNightHour = (hour: number) => hour >= 23 || hour <= 5

const matchesConditions = (
  conditions: EncounterConditions | undefined,
  day: number,
  energy: number,
  relationship: number,
  suspicion: number,
  food: number,
  water: number,
) => {
  if (!conditions) {
    return true
  }

  if (conditions.minDay !== undefined && day < conditions.minDay) {
    return false
  }

  if (conditions.maxDay !== undefined && day > conditions.maxDay) {
    return false
  }

  if (conditions.minEnergy !== undefined && energy < conditions.minEnergy) {
    return false
  }

  if (conditions.maxEnergy !== undefined && energy > conditions.maxEnergy) {
    return false
  }

  if (conditions.minRelationship !== undefined && relationship < conditions.minRelationship) {
    return false
  }

  if (conditions.maxRelationship !== undefined && relationship > conditions.maxRelationship) {
    return false
  }

  if (conditions.minSuspicion !== undefined && suspicion < conditions.minSuspicion) {
    return false
  }

  if (conditions.maxSuspicion !== undefined && suspicion > conditions.maxSuspicion) {
    return false
  }

  if (conditions.minFood !== undefined && food < conditions.minFood) {
    return false
  }

  if (conditions.maxFood !== undefined && food > conditions.maxFood) {
    return false
  }

  if (conditions.minWater !== undefined && water < conditions.minWater) {
    return false
  }

  if (conditions.maxWater !== undefined && water > conditions.maxWater) {
    return false
  }

  return true
}

const matchesBehaviorRequirements = (
  requirements: EncounterBehaviorRequirements | undefined,
  behaviorCounts: BehaviorCounts,
) => {
  if (!requirements) {
    return true
  }

  if ((requirements.selfish ?? 0) > behaviorCounts.selfishCount) {
    return false
  }

  if ((requirements.honest ?? 0) > behaviorCounts.honestCount) {
    return false
  }

  if ((requirements.cooperative ?? 0) > behaviorCounts.cooperativeCount) {
    return false
  }

  if ((requirements.aggressive ?? 0) > behaviorCounts.aggressiveCount) {
    return false
  }

  return true
}

const isNegativeEvent = (event: EncounterEvent) => {
  return event.options.some((option) => {
    const { effects } = option
    const hasNegativeResourceChange = Object.values(effects.resources ?? {}).some(
      (amount) => (amount ?? 0) < 0,
    )

    return (
      (effects.energy ?? 0) < 0 ||
      (effects.hp ?? 0) < 0 ||
      (effects.relationship ?? 0) < 0 ||
      (effects.trust ?? 0) < 0 ||
      (effects.stress ?? 0) > 0 ||
      (effects.suspicion ?? 0) > 0 ||
      hasNegativeResourceChange
    )
  })
}

const isSuspicionDrivenEvent = (event: EncounterEvent) => {
  const requiresSuspicion = event.conditions?.minSuspicion !== undefined
  const hasSuspicionEffect = event.options.some((option) => (option.effects.suspicion ?? 0) !== 0)
  const negativeTrustEvent = event.options.some(
    (option) => (option.effects.trust ?? 0) < 0 || (option.effects.relationship ?? 0) < 0,
  )

  return requiresSuspicion || hasSuspicionEffect || negativeTrustEvent || event.type === 'companion'
}

const getAdjustedPool = (
  pool: EncounterEvent[],
  stress: number,
  suspicion: number,
  food: number,
  water: number,
  behaviorCounts: BehaviorCounts,
): WeightedEncounterEvent[] => {
  const resourceCrisis = food <= 0 || water <= 0
  const unreliableJudgment = stress > 60 || suspicion > 50
  const prioritizedPool = resourceCrisis ? pool.filter((event) => event.type === 'danger') : pool
  const basePool = prioritizedPool.length > 0 ? prioritizedPool : pool

  return basePool.map((event) => {
    let adjustedWeight = event.weight

    if (stress > 70) {
      if (event.type === 'danger') {
        adjustedWeight *= 2
      }

      if (isNegativeEvent(event)) {
        adjustedWeight *= 1.5
      }
    }

    if (event.unreliable) {
      const misleadLevel = event.misleadLevel ?? 1
      adjustedWeight *= unreliableJudgment ? 1 + misleadLevel * 0.35 : 1 + misleadLevel * 0.08
    }

    if (suspicion > 55 && isSuspicionDrivenEvent(event)) {
      adjustedWeight *= 1.6
    }

    if (behaviorCounts.selfishCount >= 3 && event.type === 'companion' && isNegativeEvent(event)) {
      adjustedWeight *= 1.2
    }

    if (behaviorCounts.cooperativeCount >= 3 && event.type === 'companion' && !isNegativeEvent(event)) {
      adjustedWeight *= 1.15
    }

    if (behaviorCounts.honestCount >= 2 && event.npcIntent === 'helpful') {
      adjustedWeight *= 1.12
    }

    if (behaviorCounts.aggressiveCount >= 3 && (event.type === 'danger' || isNegativeEvent(event))) {
      adjustedWeight *= 1.25
    }

    if (suspicion < 20 && event.type === 'companion' && !isNegativeEvent(event)) {
      adjustedWeight *= 1.2
    }

    return {
      ...event,
      adjustedWeight,
    }
  })
}

const getEventPool = (
  hour: number,
  day: number,
  dayPhase: DayPhase,
  flags: string[],
  energy: number,
  relationship: number,
  suspicion: number,
  food: number,
  water: number,
  stress: number,
  behaviorCounts: BehaviorCounts,
) => {
  const timeFiltered = isNightHour(hour)
    ? encounterEvents
    : encounterEvents.filter((event) => !event.tags.includes('night'))

  const filteredPool = timeFiltered.filter((event) => {
    const requires = event.requires ?? []
    const excludes = event.excludes ?? []
    const hasRequirements = requires.every((flag) => flags.includes(flag))
    const passesExcludes = excludes.every((flag) => !flags.includes(flag))
    const matchesDayPhase = !event.phase || event.phase.includes(dayPhase)

    return (
      hasRequirements &&
      passesExcludes &&
      matchesDayPhase &&
      matchesConditions(event.conditions, day, energy, relationship, suspicion, food, water) &&
      matchesBehaviorRequirements(event.requiresBehavior, behaviorCounts)
    )
  })

  const exactDayMilestones = filteredPool.filter(
    (event) => event.conditions?.minDay === day && event.conditions?.maxDay === day,
  )
  const basePool = exactDayMilestones.length > 0 ? exactDayMilestones : filteredPool

  return getAdjustedPool(basePool, stress, suspicion, food, water, behaviorCounts)
}

const pickWeightedEvent = (
  pool: WeightedEncounterEvent[],
  excludeIds: string[] = [],
): EncounterEvent | null => {
  if (pool.length === 0) {
    return null
  }

  const uniqueExcludeIds = Array.from(new Set(excludeIds))
  const filteredCandidates =
    pool.length > uniqueExcludeIds.length
      ? pool.filter((event) => !uniqueExcludeIds.includes(event.id))
      : pool

  const candidatePool = filteredCandidates.length > 0 ? filteredCandidates : pool
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

const encounterReducer = (_currentEvent: EncounterEvent | null, action: EncounterAction) => {
  return pickWeightedEvent(action.pool, action.excludeIds)
}

export function useEncounter() {
  const hour = useProjectStore((state) => state.metaVariables.hour)
  const day = useProjectStore((state) => state.day)
  const dayPhase = useProjectStore((state) => state.dayPhase)
  const flags = useProjectStore((state) => state.flags)
  const energy = useProjectStore((state) => state.energy)
  const relationship = useProjectStore((state) => state.relationship)
  const suspicion = useProjectStore((state) => state.suspicion)
  const stress = useProjectStore((state) => state.stress)
  const food = useProjectStore((state) => state.resources.food)
  const water = useProjectStore((state) => state.resources.water)
  const selfishCount = useProjectStore((state) => state.selfishCount)
  const honestCount = useProjectStore((state) => state.honestCount)
  const cooperativeCount = useProjectStore((state) => state.cooperativeCount)
  const aggressiveCount = useProjectStore((state) => state.aggressiveCount)
  const recentEventIdsRef = useRef<string[]>([])

  const behaviorCounts = useMemo(
    () => ({ selfishCount, honestCount, cooperativeCount, aggressiveCount }),
    [selfishCount, honestCount, cooperativeCount, aggressiveCount],
  )

  const pool = useMemo(
    () =>
      getEventPool(
        hour,
        day,
        dayPhase,
        flags,
        energy,
        relationship,
        suspicion,
        food,
        water,
        stress,
        behaviorCounts,
      ),
    [hour, day, dayPhase, flags, energy, relationship, suspicion, food, water, stress, behaviorCounts],
  )

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