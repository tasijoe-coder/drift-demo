import { useMemo, useState } from 'react'

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

export type RouteOption = {
  event: NarrativeEvent
  locked: boolean
  reason?: string
}

type WeightedEvent = NarrativeEvent & {
  adjustedWeight: number
}

type BehaviorSnapshot = {
  selfishCount: number
  honestCount: number
  cooperativeCount: number
  aggressiveCount: number
}

const narrativeEvents = events as NarrativeEvent[]
const RECENT_NODE_LIMIT = 6
const DAILY_ROUTE_COUNT = 2

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

const matchesBehaviorRequirements = (requirements: BehaviorRequirements | undefined, snapshot: BehaviorSnapshot) => {
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

const eventFeelsHostile = (event: NarrativeEvent) => event.category === 'collapse' || event.choices.some(isNegativeChoice)

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

    if (event.days?.length) adjustedWeight *= 2.4
    if (suspicion > 70 && (event.tags?.includes('paranoia') || event.category === 'trust')) adjustedWeight *= 1.9
    if (stress > 80 && (event.tags?.includes('hallucination') || event.category === 'collapse')) adjustedWeight *= 1.95
    if ((resource <= 2 || water <= 1 || food <= 1) && event.category === 'resource') adjustedWeight *= 1.4
    if (memoryOfStealing && (event.category === 'trust' || event.category === 'collapse')) adjustedWeight *= 1.35
    if (coldWar && event.category === 'collapse') adjustedWeight *= 1.5
    if (behavior.selfishCount >= 3 && (event.category === 'trust' || event.category === 'collapse')) adjustedWeight *= 1.18
    if (behavior.cooperativeCount >= 3 && event.category === 'resource') adjustedWeight *= 1.12
    if (behavior.aggressiveCount >= 2 && eventFeelsHostile(event)) adjustedWeight *= 1.16
    if (event.unreliable) adjustedWeight *= stress > 65 || suspicion > 55 ? 1.28 : 1.08

    return {
      ...event,
      adjustedWeight,
    }
  })
}

const pickWeightedEvent = (pool: WeightedEvent[], excludeIds: string[] = []): NarrativeEvent | null => {
  if (pool.length === 0) return null

  const filteredPool = pool.length > excludeIds.length ? pool.filter((event) => !excludeIds.includes(event.id)) : pool
  const candidatePool = filteredPool.length > 0 ? filteredPool : pool
  const totalWeight = candidatePool.reduce((sum, event) => sum + event.adjustedWeight, 0)
  let roll = Math.random() * totalWeight

  for (const event of candidatePool) {
    roll -= event.adjustedWeight
    if (roll <= 0) return event
  }

  return candidatePool[candidatePool.length - 1]
}

const determineLockReason = (
  event: NarrativeEvent,
  snapshot: {
    trust: number
    suspicion: number
    stress: number
    stamina: number
    water: number
    food: number
    resource: number
    oddities: number
    flags: string[]
  },
) => {
  const conditions = event.conditions

  if (conditions?.maxStress !== undefined && snapshot.stress > conditions.maxStress) {
    return '壓力太高，你現在看不清那裡到底是什麼。'
  }
  if (conditions?.minTrust !== undefined && snapshot.trust < conditions.minTrust) {
    return '他不願意跟你一起進去。'
  }
  if (conditions?.maxSuspicion !== undefined && snapshot.suspicion > conditions.maxSuspicion) {
    return '你現在只會把那裡看成陷阱。'
  }
  if (conditions?.minStamina !== undefined && snapshot.stamina < conditions.minStamina) {
    return '你現在沒有力氣走進去。'
  }
  if (conditions?.minWater !== undefined && snapshot.water < conditions.minWater) {
    return '你得先處理眼前的缺水。'
  }
  if (conditions?.minFood !== undefined && snapshot.food < conditions.minFood) {
    return '空腹讓你沒辦法賭這一步。'
  }
  if (conditions?.minResource !== undefined && snapshot.resource < conditions.minResource) {
    return '你現在拿不出這一步需要的東西。'
  }
  if (conditions?.maxOddities !== undefined && snapshot.oddities > conditions.maxOddities) {
    return '你一靠近就覺得不對，暫時進不去。'
  }
  if ((event.requiredFlags ?? []).some((flag) => !snapshot.flags.includes(flag))) {
    return '現在還缺一個前提，這條路暫時打不開。'
  }

  return '現在還去不了。'
}

const pickLockedOptions = (lockedPool: NarrativeEvent[], count: number) => {
  if (count <= 0) return []
  const sorted = [...lockedPool].sort((a, b) => (b.weight ?? 10) - (a.weight ?? 10))
  return sorted.slice(0, count)
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
  const visitedNodes = useProjectStore((state) => state.visitedNodes)
  const selfishCount = useProjectStore((state) => state.selfishCount)
  const honestCount = useProjectStore((state) => state.honestCount)
  const cooperativeCount = useProjectStore((state) => state.cooperativeCount)
  const aggressiveCount = useProjectStore((state) => state.aggressiveCount)
  const visitNode = useProjectStore((state) => state.visitNode)

  const [currentEvent, setCurrentEvent] = useState<NarrativeEvent | null>(null)
  const [routeNonce, setRouteNonce] = useState(0)
  const [recentRouteIds, setRecentRouteIds] = useState<string[]>([])

  const behavior = useMemo(
    () => ({ selfishCount, honestCount, cooperativeCount, aggressiveCount }),
    [selfishCount, honestCount, cooperativeCount, aggressiveCount],
  )

  const routeSnapshot = useMemo(
    () => ({ day, trust, suspicion, stress, stamina, water, food, resource, oddities, flags }),
    [day, trust, suspicion, stress, stamina, water, food, resource, oddities, flags],
  )

  const baseCandidates = useMemo(() => {
    const phaseFiltered = narrativeEvents.filter((event) => !event.dayPhase || event.dayPhase.includes(dayPhase))

    const filtered = phaseFiltered.filter((event) => {
      const requiredFlags = event.requiredFlags ?? []
      const excludedFlags = event.excludedFlags ?? []

      return (
        matchesDay(event, day) &&
        requiredFlags.every((flag) => flags.includes(flag)) &&
        excludedFlags.every((flag) => !flags.includes(flag)) &&
        matchesBehaviorRequirements(event.requiresBehavior, behavior) &&
        !visitedNodes.includes(event.id)
      )
    })

    const exactDayEvents = filtered.filter((event) => event.days?.includes(day))
    return exactDayEvents.length > 0 ? exactDayEvents : filtered
  }, [behavior, day, dayPhase, flags, visitedNodes])

  const availablePool = useMemo(
    () => getAdjustedPool(baseCandidates.filter((event) => matchesConditions(event.conditions, routeSnapshot)), {
      suspicion,
      stress,
      flags,
      behavior,
      resource,
      water,
      food,
    }),
    [baseCandidates, behavior, flags, food, resource, routeSnapshot, stress, suspicion, water],
  )

  const lockedPool = useMemo(
    () => baseCandidates.filter((event) => !matchesConditions(event.conditions, routeSnapshot)),
    [baseCandidates, routeSnapshot],
  )

  const routeOptions = useMemo(() => {
    const nextOptions: RouteOption[] = []
    const usedIds = new Set<string>()
    const recentSeed = routeNonce % 2 === 0 ? recentRouteIds : [...recentRouteIds].reverse()

    while (nextOptions.length < DAILY_ROUTE_COUNT) {
      const nextEvent = pickWeightedEvent(availablePool, [...recentSeed, ...Array.from(usedIds)])
      if (!nextEvent) break
      usedIds.add(nextEvent.id)
      nextOptions.push({ event: nextEvent, locked: false })
      if (usedIds.size >= availablePool.length) break
    }

    if (nextOptions.length < DAILY_ROUTE_COUNT) {
      const fillers = pickLockedOptions(
        lockedPool.filter((event) => !usedIds.has(event.id)),
        DAILY_ROUTE_COUNT - nextOptions.length,
      )
      fillers.forEach((event) => {
        nextOptions.push({
          event,
          locked: true,
          reason: determineLockReason(event, routeSnapshot),
        })
      })
    }

    return nextOptions
  }, [availablePool, lockedPool, recentRouteIds, routeNonce, routeSnapshot])

  const rollRoutes = () => {
    setCurrentEvent(null)
    setRouteNonce((value) => value + 1)
  }

  const enterRoute = (eventId: string) => {
    const selected = routeOptions.find((option) => option.event.id === eventId)
    if (!selected || selected.locked) {
      return selected ?? null
    }

    visitNode(selected.event.id)
    setRecentRouteIds((current) => [selected.event.id, ...current.filter((id) => id !== selected.event.id)].slice(0, RECENT_NODE_LIMIT))
    setCurrentEvent(selected.event)
    return selected
  }

  const leaveRoute = () => {
    setCurrentEvent(null)
  }


  return {
    currentEvent,
    routeOptions,
    rollRoutes,
    enterRoute,
    leaveRoute,
  }
}





