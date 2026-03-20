import { npcDefinitions, type NpcDefinition, type NpcId, type NpcPersonality, type NpcTag } from '../data/npcs'
import { createNpcMemory } from './memory'
import { deriveNpcMood, type NpcState } from './npcState'

export type SupplySpread = 'shoreline_cache' | 'wreck_cache' | 'split_cache'
export type DangerousLocation = 'village_lane' | 'wreck_edge' | 'shrine_path'
export type HiddenTruth = 'hoarding' | 'lying' | 'injury_hidden' | null

export type RunSetup = {
  firstAwakeNpcId: NpcId
  injuredNpcId: NpcId
  supplySpread: SupplySpread
  dangerousLocation: DangerousLocation
  hiddenNpcId: NpcId | null
  hiddenTruth: HiddenTruth
}

const pickOne = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]

const createNpcState = (definition: NpcDefinition, personality: NpcPersonality, extraTags: NpcTag[] = []): NpcState => {
  const hiddenTags = Array.from(new Set([...(definition.defaultTags ?? []), ...extraTags]))
  const draft: NpcState = {
    id: definition.id,
    name: definition.name,
    personality,
    currentMood: 'watchful',
    trustTowardPlayer: definition.baseTrust,
    fear: definition.baseFear,
    suspicion: definition.baseSuspicion,
    aggression: definition.baseAggression,
    willingnessToCooperate: definition.baseCooperation,
    hiddenTags,
    memory: createNpcMemory(),
  }

  return {
    ...draft,
    currentMood: deriveNpcMood(draft),
  }
}

export const createRunSetup = (): { setup: RunSetup; npcs: Record<NpcId, NpcState> } => {
  const [firstDefinition, secondDefinition] = npcDefinitions
  const firstAwakeNpcId = pickOne<NpcId>(['shore_figure', 'late_survivor'])
  const injuredNpcId = firstAwakeNpcId === 'shore_figure' ? 'late_survivor' : 'shore_figure'
  const supplySpread = pickOne<SupplySpread>(['shoreline_cache', 'wreck_cache', 'split_cache'])
  const dangerousLocation = pickOne<DangerousLocation>(['village_lane', 'wreck_edge', 'shrine_path'])
  const hiddenTruth = pickOne<HiddenTruth>(['hoarding', 'lying', 'injury_hidden', null])
  const hiddenNpcId = hiddenTruth ? pickOne<NpcId>(['shore_figure', 'late_survivor']) : null

  const personalities = {
    shore_figure: pickOne(firstDefinition.personalityPool),
    late_survivor: pickOne(secondDefinition.personalityPool),
  }

  const shoreTags: NpcTag[] = []
  const lateTags: NpcTag[] = []

  if (injuredNpcId === 'shore_figure') shoreTags.push('injured')
  if (injuredNpcId === 'late_survivor') lateTags.push('injured')
  if (hiddenNpcId === 'shore_figure' && hiddenTruth) shoreTags.push(hiddenTruth === 'lying' ? 'lying' : hiddenTruth === 'hoarding' ? 'hoarding' : 'watchful')
  if (hiddenNpcId === 'late_survivor' && hiddenTruth) lateTags.push(hiddenTruth === 'lying' ? 'lying' : hiddenTruth === 'hoarding' ? 'hoarding' : 'watchful')
  if (personalities.shore_figure === 'unstable') shoreTags.push('unstable')
  if (personalities.late_survivor === 'unstable') lateTags.push('unstable')

  const npcs = {
    shore_figure: createNpcState(firstDefinition, personalities.shore_figure, shoreTags),
    late_survivor: createNpcState(secondDefinition, personalities.late_survivor, lateTags),
  }

  const setup: RunSetup = {
    firstAwakeNpcId,
    injuredNpcId,
    supplySpread,
    dangerousLocation,
    hiddenNpcId,
    hiddenTruth,
  }

  return { setup, npcs }
}
