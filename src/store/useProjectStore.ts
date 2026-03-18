import { create } from 'zustand'

export type GamePhase = 'encounter' | 'camp' | 'log' | 'gameover'

export type ResourceType = 'materials' | 'food' | 'water' | 'oddities'

export type Weather = 'sunny' | 'rain' | 'cloudy'

export type DayPhase = 'phase1' | 'phase2' | 'phase3' | 'phase4' | 'phase5'

export type BehaviorType = 'selfish' | 'honest' | 'cooperative' | 'aggressive'

type Resources = {
  materials: number
  food: number
  water: number
  oddities: number
}

export type MetaVariables = {
  hour: number
  weather: Weather
  isNight: boolean
  batteryLevel: number
  zodiac: string
}

type GameStore = {
  day: number
  dayPhase: DayPhase
  energy: number
  hp: number
  relationship: number
  trust: number
  stress: number
  suspicion: number
  otherStress: number
  otherTrust: number
  selfishCount: number
  honestCount: number
  cooperativeCount: number
  aggressiveCount: number
  hungerDays: number
  thirstDays: number
  flags: string[]
  resources: Resources
  phase: GamePhase
  metaVariables: MetaVariables
  nextDay: () => void
  changePhase: (phase: GamePhase) => void
  modifyEnergy: (value: number) => void
  modifyHp: (value: number) => void
  modifyRelationship: (value: number) => void
  modifyTrust: (value: number) => void
  modifyStress: (value: number) => void
  modifySuspicion: (value: number) => void
  modifyOtherStress: (value: number) => void
  modifyOtherTrust: (value: number) => void
  incrementBehavior: (behavior: BehaviorType) => void
  setHungerDays: (value: number) => void
  setThirstDays: (value: number) => void
  addResource: (type: ResourceType, amount: number) => void
  setFlag: (flag: string) => void
  hasFlag: (flag: string) => boolean
  setMetaVariables: (partialMeta: Partial<MetaVariables>) => void
}

const clampStat = (value: number) => Math.min(100, Math.max(0, value))

const getDayPhase = (day: number): DayPhase => {
  if (day <= 5) {
    return 'phase1'
  }

  if (day <= 12) {
    return 'phase2'
  }

  if (day <= 20) {
    return 'phase3'
  }

  if (day <= 27) {
    return 'phase4'
  }

  return 'phase5'
}

const initialHour = new Date().getHours()

export const useProjectStore = create<GameStore>((set, get) => ({
  day: 1,
  dayPhase: getDayPhase(1),
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
    hour: initialHour,
    weather: 'sunny',
    isNight: initialHour >= 23 || initialHour <= 5,
    batteryLevel: 100,
    zodiac: 'unknown',
  },
  nextDay: () => {
    set((state) => {
      const nextDay = Math.min(30, state.day + 1)

      return {
        day: nextDay,
        dayPhase: getDayPhase(nextDay),
      }
    })
  },
  changePhase: (phase) => {
    set({ phase })
  },
  modifyEnergy: (value) => {
    set((state) => ({ energy: clampStat(state.energy + value) }))
  },
  modifyHp: (value) => {
    set((state) => ({ hp: clampStat(state.hp + value) }))
  },
  modifyRelationship: (value) => {
    set((state) => ({ relationship: clampStat(state.relationship + value) }))
  },
  modifyTrust: (value) => {
    set((state) => ({ trust: clampStat(state.trust + value) }))
  },
  modifyStress: (value) => {
    set((state) => ({ stress: clampStat(state.stress + value) }))
  },
  modifySuspicion: (value) => {
    set((state) => ({ suspicion: clampStat(state.suspicion + value) }))
  },
  modifyOtherStress: (value) => {
    set((state) => ({ otherStress: clampStat(state.otherStress + value) }))
  },
  modifyOtherTrust: (value) => {
    set((state) => ({ otherTrust: clampStat(state.otherTrust + value) }))
  },
  incrementBehavior: (behavior) => {
    set((state) => ({
      selfishCount: behavior === 'selfish' ? state.selfishCount + 1 : state.selfishCount,
      honestCount: behavior === 'honest' ? state.honestCount + 1 : state.honestCount,
      cooperativeCount: behavior === 'cooperative' ? state.cooperativeCount + 1 : state.cooperativeCount,
      aggressiveCount: behavior === 'aggressive' ? state.aggressiveCount + 1 : state.aggressiveCount,
    }))
  },
  setHungerDays: (value) => {
    set({ hungerDays: Math.max(0, value) })
  },
  setThirstDays: (value) => {
    set({ thirstDays: Math.max(0, value) })
  },
  addResource: (type, amount) => {
    set((state) => ({
      resources: {
        ...state.resources,
        [type]: Math.max(0, state.resources[type] + amount),
      },
    }))
  },
  setFlag: (flag) => {
    set((state) => ({
      flags: state.flags.includes(flag) ? state.flags : [...state.flags, flag],
    }))
  },
  hasFlag: (flag) => {
    return get().flags.includes(flag)
  },
  setMetaVariables: (partialMeta) => {
    set((state) => ({
      metaVariables: {
        ...state.metaVariables,
        ...partialMeta,
      },
    }))
  },
}))