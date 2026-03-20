import type { NpcId } from '../data/npcs'
import type { NpcMemoryKey } from './memory'
import type { NpcDelta, NpcState } from './npcState'
import type { RunSetup } from './runSetup'
import {
  buildBeachWakeText,
  buildConfrontationFeedback,
  buildContactText,
  buildCooperationFeedback,
  buildNightSplitText,
  buildOutcomeText,
  buildSearchFeedback,
  buildSecondSurvivorText,
  buildShelterText,
  buildWreckText,
} from './textAssembler'

export type DynamicEventType = 'confrontation' | 'search' | 'cooperation' | 'narrative'

export type OpeningSceneId =
  | 'beach_wake'
  | 'first_contact'
  | 'wreck_first'
  | 'together_search'
  | 'knife_tension'
  | 'found_second'
  | 'help_or_leave'
  | 'shelter_choice'
  | 'night_split'

export type OpeningOutcomeId = 'day1_cooperate' | 'day1_fracture'

export type PlayerEffect = {
  trust?: number
  suspicion?: number
  stress?: number
  stamina?: number
  water?: number
  food?: number
  resource?: number
  hp?: number
  oddities?: number
}

export type PlayerSnapshot = {
  day: number
  trust: number
  suspicion: number
  stress: number
  stamina: number
  water: number
  food: number
  flags: string[]
}

export type OpeningContext = {
  player: PlayerSnapshot
  run: RunSetup
  npcs: Record<NpcId, NpcState>
}

export type OpeningChoice = {
  id: string
  text: string
  description: string
  hoverHint: string
  disabled?: boolean
  disabledReason?: string
}

export type OpeningScene = {
  id: OpeningSceneId
  type: DynamicEventType
  title: string
  description: string[]
  background: string
  choices: OpeningChoice[]
}

export type OpeningMemoryWrite = {
  npcId: NpcId
  key: NpcMemoryKey
  amount?: number
}

export type OpeningResolution = {
  feedback: string[]
  playerEffect?: PlayerEffect
  npcDeltas?: Partial<Record<NpcId, NpcDelta>>
  memoryWrites?: OpeningMemoryWrite[]
  flags?: string[]
  nextSceneId?: OpeningSceneId
  outcomeId?: OpeningOutcomeId
}

export type OpeningOutcome = {
  id: OpeningOutcomeId
  title: string
  text: string[]
}

const backgrounds = {
  beach_wake: '/cover_mobile.jpg',
  first_contact: '/cover_mobile.jpg',
  wreck_first: '/cover_mobile.jpg',
  together_search: '/bg_phase2.jpg',
  knife_tension: '/bg_phase2.jpg',
  found_second: '/bg_phase3.jpg',
  help_or_leave: '/bg_phase3.jpg',
  shelter_choice: '/bg_phase4.jpg',
  night_split: '/bg_phase4.jpg',
} as const

const getLeadNpc = (context: OpeningContext) => context.npcs[context.run.firstAwakeNpcId]
const getInjuredNpc = (context: OpeningContext) => context.npcs[context.run.injuredNpcId]

const unstableChoice = (context: OpeningContext) => context.player.stress >= 50
const suspiciousChoice = (context: OpeningContext) => context.player.suspicion >= 28

const clampSceneChoices = (choices: Array<OpeningChoice | null | false>) => choices.filter(Boolean) as OpeningChoice[]

const resolveSearchEvent = (
  context: OpeningContext,
  config: {
    location: 'wreck' | 'shore' | 'village'
    companionId?: NpcId
    takeBestPiece?: boolean
    shareFindings?: boolean
  },
): Pick<OpeningResolution, 'playerEffect' | 'npcDeltas' | 'memoryWrites' | 'flags'> & { grade: 'success' | 'mixed' | 'thin'; feedback: string[] } => {
  const companion = config.companionId ? context.npcs[config.companionId] : null
  let score = 0

  if (config.location === 'wreck') score += context.run.supplySpread === 'wreck_cache' ? 2 : context.run.supplySpread === 'split_cache' ? 1 : 0
  if (config.location === 'shore') score += context.run.supplySpread === 'shoreline_cache' ? 2 : context.run.supplySpread === 'split_cache' ? 1 : 0
  if (companion) score += companion.willingnessToCooperate >= 50 ? 1 : -1
  if (context.player.stress >= 60) score -= 1
  if (context.run.dangerousLocation === 'wreck_edge' && config.location === 'wreck') score -= 1

  const grade = score >= 2 ? 'success' : score >= 0 ? 'mixed' : 'thin'
  const feedback = buildSearchFeedback(config.location, grade)

  if (config.location === 'wreck') {
    if (grade === 'success') {
      return {
        grade,
        feedback,
        playerEffect: { water: 1, food: 1, stamina: -9, stress: -1 },
        npcDeltas: config.shareFindings && companion ? { [companion.id]: { trustTowardPlayer: 5, suspicion: -2 } } : undefined,
        memoryWrites: config.shareFindings && companion ? [{ npcId: companion.id, key: 'sharedResources', amount: 1 }] : undefined,
        flags: config.takeBestPiece ? ['opened_day1_stash', 'hid_day1_piece'] : ['opened_day1_stash'],
      }
    }

    if (grade === 'mixed') {
      return {
        grade,
        feedback,
        playerEffect: { water: 1, stamina: -10, stress: 1 },
        npcDeltas: config.takeBestPiece && companion ? { [companion.id]: { suspicion: 5, trustTowardPlayer: -3 } } : undefined,
        memoryWrites: config.takeBestPiece && companion ? [{ npcId: companion.id, key: 'liedOrWithheld', amount: 1 }] : undefined,
        flags: config.takeBestPiece ? ['hid_day1_piece'] : ['opened_day1_stash'],
      }
    }

    return {
      grade,
      feedback,
      playerEffect: { stamina: -12, stress: 5, suspicion: 1 },
      npcDeltas: companion ? { [companion.id]: { fear: 2, willingnessToCooperate: -2 } } : undefined,
      flags: ['wasted_first_search'],
    }
  }

  if (grade === 'success') {
    return {
      grade,
      feedback,
      playerEffect: { water: 1, stamina: -6, stress: -1 },
      flags: ['caught_a_break'],
    }
  }

  if (grade === 'mixed') {
    return {
      grade,
      feedback,
      playerEffect: { stamina: -7, stress: 1 },
    }
  }

  return {
    grade,
    feedback,
    playerEffect: { stamina: -9, stress: 4, suspicion: 1 },
    flags: ['search_came_up_empty'],
  }
}

const resolveConfrontationEvent = (
  context: OpeningContext,
  npcId: NpcId,
  tone: 'probe' | 'press' | 'back_down',
): Pick<OpeningResolution, 'playerEffect' | 'npcDeltas' | 'memoryWrites' | 'flags'> & { feedback: string[] } => {
  const npc = context.npcs[npcId]
  const baselineHeat = npc.suspicion + npc.aggression - npc.trustTowardPlayer

  if (tone === 'probe') {
    const warmed = baselineHeat < 55
    return {
      feedback: buildConfrontationFeedback(npc, 'probe'),
      playerEffect: warmed ? { trust: 2, suspicion: 1, stress: 1 } : { suspicion: 3, stress: 2 },
      npcDeltas: {
        [npcId]: warmed ? { trustTowardPlayer: 4, suspicion: -1 } : { suspicion: 4, aggression: 2 },
      },
      flags: warmed ? ['asked_without_breaking'] : ['question_left_hanging'],
    }
  }

  if (tone === 'press') {
    const rupture = baselineHeat >= 55 || npc.currentMood === 'volatile'
    return {
      feedback: buildConfrontationFeedback(npc, 'press'),
      playerEffect: rupture ? { trust: -6, suspicion: 7, stress: 5 } : { trust: -2, suspicion: 3, stress: 3 },
      npcDeltas: {
        [npcId]: rupture ? { trustTowardPlayer: -9, suspicion: 10, aggression: 6 } : { trustTowardPlayer: -3, suspicion: 5, aggression: 2 },
      },
      flags: [rupture ? 'day1_confrontation_hardened' : 'day1_confrontation_marked'],
    }
  }

  return {
    feedback: buildConfrontationFeedback(npc, 'back_down'),
    playerEffect: { stress: 1, suspicion: -1 },
    npcDeltas: {
      [npcId]: { aggression: -2, suspicion: 1 },
    },
    memoryWrites: [{ npcId, key: 'backedDownInConfrontation', amount: 1 }],
    flags: ['backed_off_once'],
  }
}

const resolveCooperationEvent = (
  context: OpeningContext,
  primaryNpcId: NpcId,
  intent: 'offer' | 'carry' | 'share' | 'refuse',
  secondaryNpcId?: NpcId,
): Pick<OpeningResolution, 'playerEffect' | 'npcDeltas' | 'memoryWrites' | 'flags'> & { feedback: string[] } => {
  const primaryNpc = context.npcs[primaryNpcId]
  const willingness = primaryNpc.willingnessToCooperate + primaryNpc.trustTowardPlayer - primaryNpc.suspicion

  if (intent === 'offer') {
    const accepted = willingness >= 40 || primaryNpc.personality === 'calm'
    return {
      feedback: buildCooperationFeedback(primaryNpc, 'offer'),
      playerEffect: accepted ? { trust: 4, stress: -1, stamina: -3 } : { stress: 2, suspicion: 1, stamina: -3 },
      npcDeltas: {
        [primaryNpcId]: accepted ? { trustTowardPlayer: 6, willingnessToCooperate: 4 } : { suspicion: 3, fear: 2 },
      },
      memoryWrites: accepted ? [{ npcId: primaryNpcId, key: 'approachedFirst', amount: 1 }] : undefined,
      flags: [accepted ? 'cooperation_offered' : 'offer_met_with_pause'],
    }
  }

  if (intent === 'carry') {
    const targetIds = secondaryNpcId ? [primaryNpcId, secondaryNpcId] : [primaryNpcId]
    return {
      feedback: buildCooperationFeedback(primaryNpc, 'carry'),
      playerEffect: { trust: 3, stress: -1, stamina: -8 },
      npcDeltas: Object.fromEntries(targetIds.map((id) => [id, { trustTowardPlayer: 5, willingnessToCooperate: 4, fear: -2 }])) as Partial<Record<NpcId, NpcDelta>>,
      memoryWrites: targetIds.map((id) => ({ npcId: id, key: 'helpedInDanger', amount: 1 })),
      flags: ['helped_under_pressure'],
    }
  }

  if (intent === 'share') {
    const targetIds = secondaryNpcId ? [primaryNpcId, secondaryNpcId] : [primaryNpcId]
    return {
      feedback: buildCooperationFeedback(primaryNpc, 'share'),
      playerEffect: { trust: 5, suspicion: -2, stress: -2, water: -1 },
      npcDeltas: Object.fromEntries(targetIds.map((id) => [id, { trustTowardPlayer: 7, suspicion: -3, willingnessToCooperate: 5 }])) as Partial<Record<NpcId, NpcDelta>>,
      memoryWrites: targetIds.map((id) => ({ npcId: id, key: 'sharedResources', amount: 1 })),
      flags: ['shared_water_on_day1'],
    }
  }

  return {
    feedback: buildCooperationFeedback(primaryNpc, 'refuse'),
    playerEffect: { stress: 4, suspicion: 4, trust: -4 },
    npcDeltas: {
      [primaryNpcId]: { trustTowardPlayer: -7, suspicion: 8, aggression: 3 },
      ...(secondaryNpcId ? { [secondaryNpcId]: { trustTowardPlayer: -4, fear: 4 } } : {}),
    },
    flags: ['left_someone_exposed'],
  }
}

export const getOpeningScene = (sceneId: OpeningSceneId, context: OpeningContext): OpeningScene => {
  const leadNpc = getLeadNpc(context)
  const injuredNpc = getInjuredNpc(context)

  switch (sceneId) {
    case 'beach_wake':
      return {
        id: sceneId,
        type: 'narrative',
        title: '海灘',
        background: backgrounds[sceneId],
        description: buildBeachWakeText(leadNpc, context.run),
        choices: [
          {
            id: 'approach_lead',
            text: '先走向那個人',
            description: '先把危險看清楚，也許比先搶東西更重要。',
            hoverHint: '你可以先把人看清楚，但也會先把自己放到對方眼裡。',
          },
          {
            id: 'search_wreck_first',
            text: '先翻殘骸',
            description: '補給不會自己留下來。遲一步，今晚可能就少一口水。',
            hoverHint: '你也許能先拿到東西，但對方會記得你第一件事先選了什麼。',
          },
        ],
      }

    case 'first_contact':
      return {
        id: sceneId,
        type: 'confrontation',
        title: '第一句話',
        background: backgrounds[sceneId],
        description: buildContactText(leadNpc, context.run),
        choices: clampSceneChoices([
          {
            id: 'offer_name',
            text: '先報名字，再問他要不要一起找路',
            description: '把話放軟一點，先讓今天不要從對峙開始。',
            hoverHint: '這一步也許能把距離縮短，但如果對方不買帳，難堪會直接留在原地。',
          },
          {
            id: 'ask_about_hand',
            text: '先問他手上那把刀從哪裡來',
            description: '不先問清楚，之後每一步都會像踩在刀尖旁邊。',
            hoverHint: '你可能先把危險挑明，也可能把今天最難處理的那道裂口立刻打開。',
          },
          unstableChoice(context) && {
            id: 'keep_distance',
            text: '停在原地，不讓他先知道你在想什麼',
            description: '先把距離留住，讓自己有時間看清他到底像不像會出手的人。',
            hoverHint: '你可以先不靠近，但沉默也可能先把最壞的猜測養大。',
          },
        ]),
      }

    case 'wreck_first':
      return {
        id: sceneId,
        type: 'search',
        title: '殘骸',
        background: backgrounds[sceneId],
        description: buildWreckText(leadNpc, context.run),
        choices: clampSceneChoices([
          {
            id: 'call_over',
            text: '叫那個人一起過來看',
            description: '至少別讓第一份找到的東西就變成心照不宣的帳。',
            hoverHint: '你能先把東西攤開，但也等於把主導權放到兩個人中間。',
          },
          {
            id: 'pocket_best_piece',
            text: '先把最好的那份收起來',
            description: '手上先有一點底氣，到了夜裡才不會完全靠別人的好心。',
            hoverHint: '你也許能先保住自己，但有些人只要看過一次，就不會再忘。',
          },
          suspiciousChoice(context) && {
            id: 'follow_drag_marks',
            text: '順著拖痕往更裡面找',
            description: '這裡像不只被翻過，還像有人把什麼拖進去過。',
            hoverHint: '你可能找到比補給更麻煩的東西，但不看清楚，今晚也不會安穩。',
          },
        ]),
      }

    case 'together_search': {
      return {
        id: sceneId,
        type: 'search',
        title: '一起翻找',
        background: backgrounds[sceneId],
        description: [
          '你們第一次靠得這麼近，近到能聽見對方翻動濕行李時的呼吸。',
          buildWreckText(leadNpc, context.run)[1],
          leadNpc.willingnessToCooperate >= 50 ? '他沒有搶在你前面伸手，卻也一直在看你會把找到的東西放去哪。' : '他看起來像願意幫忙，但手總會在最關鍵的時候慢半拍。',
        ],
        choices: [
          {
            id: 'search_and_split',
            text: '翻到什麼都先放到中間',
            description: '先把界線放明，至少今晚比較不容易為了同一瓶水翻臉。',
            hoverHint: '公平會讓今天好過一點，但也意味著你得先放掉手裡那一小點安全感。',
          },
          {
            id: 'search_but_hold_back',
            text: '嘴上說一起找，手上先替自己留一點',
            description: '現在就全部攤開太冒險，先留一手才不會明天先被人掐住。',
            hoverHint: '這一步不一定會立刻出事，但它很可能會在更糟的時候被翻出來。',
          },
        ],
      }
    }

    case 'knife_tension':
      return {
        id: sceneId,
        type: 'confrontation',
        title: '沒有說完的話',
        background: backgrounds[sceneId],
        description: [
          '你把問題壓近之後，他沒有退開。',
          leadNpc.hiddenTags.includes('lying') ? '他回答得太順，順得讓你更難相信。' : '他沒有否認，只是把目光移向海邊，像不打算把真正的答案留在這裡。',
          '這不是吵架。這只是你們都知道，真正的爭執還沒開始。',
        ],
        choices: clampSceneChoices([
          {
            id: 'press_harder',
            text: '追著那句話問到底',
            description: '要嘛現在挖出真相，要嘛現在就知道他會把你帶到哪種地方。',
            hoverHint: '你可能先把謊拆開，也可能把今天剩下的合作空間直接燒掉。',
          },
          {
            id: 'back_off',
            text: '先把問題收回去，留到晚上再說',
            description: '先讓路走下去，不在海灘上把事情做絕。',
            hoverHint: '你保住了眼前的平衡，但那句話不會因此真的消失。',
          },
          suspiciousChoice(context) && {
            id: 'watch_without_answer',
            text: '不再問，只記住他剛才那一下停頓',
            description: '先把細節收起來。對方一旦鬆懈，往往會自己把更多東西露出來。',
            hoverHint: '你沒有把話說破，但猜疑會比質問活得更久。',
          },
        ]),
      }

    case 'found_second':
      return {
        id: sceneId,
        type: 'search',
        title: '第三個人',
        background: backgrounds[sceneId],
        description: buildSecondSurvivorText(injuredNpc, leadNpc, context.run),
        choices: clampSceneChoices([
          {
            id: 'help_now',
            text: '先把人扶起來再說',
            description: '傷口和失血不會等你把話問完。',
            hoverHint: '這一步會耗掉體力和水，但如果不伸手，之後很多話都會變得更難說。',
          },
          {
            id: 'make_lead_choose',
            text: '先看那個先醒來的人願不願意一起幫',
            description: '這不是推責任，是先看清楚他到底把人命放在哪個位置。',
            hoverHint: '你能更快看出對方站在哪邊，但也會把壓力立刻推到彼此中間。',
          },
          suspiciousChoice(context) && {
            id: 'check_bag_first',
            text: '先摸一下那人的包裡還剩什麼',
            description: '傷是真的，還是被藏起來的東西更真，你得先知道。',
            hoverHint: '你也許能先抓到線索，但那只會讓接下來的每個決定更不乾淨。',
          },
        ]),
      }

    case 'help_or_leave': {
      return {
        id: sceneId,
        type: 'cooperation',
        title: '要不要一起扛',
        background: backgrounds[sceneId],
        description: [
          '你們已經沒有辦法假裝沒看見那個人。',
          getInjuredNpc(context).trustTowardPlayer >= 40 ? '他勉強站穩時，把重量短暫地交到了你手上。' : '那個受傷的人沒有完全信你，卻也沒有力氣再拒絕。',
          leadNpc.trustTowardPlayer < 35 ? '站在旁邊的那個人看起來不像要先伸手。' : '另一個人還在猶豫，但至少沒再往後退。',
        ],
        choices: clampSceneChoices([
          {
            id: 'carry_together',
            text: '三個人一起先找能擋風的地方',
            description: '今天先把人和補給一起帶過去，其他的帳之後再算。',
            hoverHint: '你會先失掉一些體力，但也可能把今晚最危險的裂口先壓住。',
            disabled: leadNpc.trustTowardPlayer < 24,
            disabledReason: leadNpc.name + '現在不肯靠你這麼近。',
          },
          {
            id: 'give_water_first',
            text: '先把一口水遞給受傷的人',
            description: '先讓對方能撐著走，至少路上不會立刻倒下。',
            hoverHint: '你會先失去手上的水，但有人會記住你把那一口先讓給了誰。',
            disabled: context.player.water <= 0,
            disabledReason: '你手上已經沒有能先遞出去的水。',
          },
          {
            id: 'leave_them_for_moment',
            text: '先離開這裡，等天黑前再回來',
            description: '現在把自己卡在這裡，可能三個人都會先倒在路上。',
            hoverHint: '你也許是在保全今天，也可能只是讓某件事變成沒法再解釋的開始。',
          },
        ]),
      }
    }

    case 'shelter_choice':
      return {
        id: sceneId,
        type: 'cooperation',
        title: '今晚在哪裡停下來',
        background: backgrounds[sceneId],
        description: buildShelterText(leadNpc, context.run),
        choices: clampSceneChoices([
          {
            id: 'follow_lead',
            text: '先照那個人選的地方走',
            description: '把主導權暫時讓出去，看看他會不會先把人帶進更糟的地方。',
            hoverHint: '你能換到一點表面上的合作，但也把今晚的風險一起交給了對方。',
          },
          {
            id: 'choose_other_way',
            text: '直接改走另一個地方',
            description: '現在最怕的不是沒地方睡，是被人帶進你根本不敢睡的地方。',
            hoverHint: '你保住了決定權，但這種否決很容易被記一整夜。',
          },
          suspiciousChoice(context) && {
            id: 'make_them_go_first',
            text: '讓那個先醒來的人先走在前面',
            description: '你不打算把背先交出去，至少今天不打算。',
            hoverHint: '這會讓你安心一點，但也會把不信任直接放到所有人面前。',
          },
        ]),
      }

    case 'night_split':
      return {
        id: sceneId,
        type: 'confrontation',
        title: '第一夜',
        background: backgrounds[sceneId],
        description: buildNightSplitText(leadNpc, context.run.injuredNpcId ? injuredNpc : null, context.run),
        choices: clampSceneChoices([
          {
            id: 'put_it_in_the_middle',
            text: '把水和食物都放到中間',
            description: '先讓東西離每個人都一樣近，不讓第一夜就變成誰手更快。',
            hoverHint: '你會失掉一點可抓的安全感，但這也是今晚最接近信任的做法。',
          },
          {
            id: 'keep_one_close',
            text: '把最好拿的一份留在自己手邊',
            description: '你不想半夜醒來時，連最後那口水都得看別人的臉色。',
            hoverHint: '這一步也許救得了你一次，但只要被看見，就會留下很久。',
          },
          {
            id: 'ask_who_touched_the_bag',
            text: '先把最難聽的問題問掉',
            description: '與其等到夜裡誰都睡不著，不如現在就看看有沒有人先露餡。',
            hoverHint: '你可能把藏著的事逼出來，也可能讓今晚直接沒有地方可退。',
          },
        ]),
      }
  }
}

export const resolveOpeningChoice = (sceneId: OpeningSceneId, choiceId: string, context: OpeningContext): OpeningResolution => {
  const leadNpc = getLeadNpc(context)
  const injuredNpc = getInjuredNpc(context)

  switch (sceneId) {
    case 'beach_wake':
      if (choiceId === 'approach_lead') {
        return {
          feedback: ['你踩過燒黑的椅架往前走。', '那個人沒有退，只是先把你的手看了一遍。'],
          memoryWrites: [{ npcId: leadNpc.id, key: 'approachedFirst', amount: 1 }],
          npcDeltas: { [leadNpc.id]: { trustTowardPlayer: 3, suspicion: -1 } },
          nextSceneId: 'first_contact',
        }
      }

      return {
        feedback: ['你先把視線從人身上移開。', '殘骸裡那一下金屬摩擦，讓時間像忽然變得更急。'],
        memoryWrites: [{ npcId: leadNpc.id, key: 'searchedSuppliesFirst', amount: 1 }],
        npcDeltas: { [leadNpc.id]: { suspicion: 3 } },
        nextSceneId: 'wreck_first',
      }

    case 'first_contact':
      if (choiceId === 'offer_name') {
        const cooperation = resolveCooperationEvent(context, leadNpc.id, 'offer')
        return {
          ...cooperation,
          nextSceneId: 'together_search',
        }
      }

      if (choiceId === 'ask_about_hand') {
        const confrontation = resolveConfrontationEvent(context, leadNpc.id, 'probe')
        return {
          ...confrontation,
          nextSceneId: 'knife_tension',
        }
      }

      return {
        feedback: ['你沒有再靠近。', '那個人也沒動，可你知道這份距離已經被彼此記下來了。'],
        playerEffect: { stress: 3, suspicion: 2 },
        npcDeltas: { [leadNpc.id]: { suspicion: 4, trustTowardPlayer: -2 } },
        flags: ['opened_with_distance'],
        nextSceneId: 'shelter_choice',
      }

    case 'wreck_first':
      if (choiceId === 'call_over') {
        const search = resolveSearchEvent(context, {
          location: 'wreck',
          companionId: leadNpc.id,
          shareFindings: true,
        })
        return {
          ...search,
          nextSceneId: 'found_second',
        }
      }

      if (choiceId === 'pocket_best_piece') {
        const search = resolveSearchEvent(context, {
          location: 'wreck',
          companionId: leadNpc.id,
          takeBestPiece: true,
        })
        return {
          ...search,
          memoryWrites: [...(search.memoryWrites ?? []), { npcId: leadNpc.id, key: 'liedOrWithheld', amount: 1 }],
          nextSceneId: 'knife_tension',
        }
      }

      return {
        feedback: ['你順著拖痕往更裡面走。', '翻開那塊板子的時候，你先看到的不是補給，是一隻發抖的手。'],
        playerEffect: { stamina: -5, stress: 2 },
        nextSceneId: 'found_second',
      }

    case 'together_search': {
      if (choiceId === 'search_and_split') {
        const search = resolveSearchEvent(context, {
          location: 'wreck',
          companionId: leadNpc.id,
          shareFindings: true,
        })
        return {
          ...search,
          nextSceneId: 'found_second',
        }
      }

      const heldBack = resolveSearchEvent(context, {
        location: 'wreck',
        companionId: leadNpc.id,
        takeBestPiece: true,
      })
      return {
        ...heldBack,
        memoryWrites: [...(heldBack.memoryWrites ?? []), { npcId: leadNpc.id, key: 'liedOrWithheld', amount: 1 }],
        nextSceneId: 'found_second',
      }
    }

    case 'knife_tension':
      if (choiceId === 'press_harder') {
        const confrontation = resolveConfrontationEvent(context, leadNpc.id, 'press')
        return {
          ...confrontation,
          nextSceneId: 'found_second',
        }
      }

      if (choiceId === 'back_off') {
        const confrontation = resolveConfrontationEvent(context, leadNpc.id, 'back_down')
        return {
          ...confrontation,
          nextSceneId: 'shelter_choice',
        }
      }

      return {
        feedback: ['你把那一下停頓記進心裡，沒有再追。', '他沒有道謝，可你看得出他也在防你之後會怎麼用這件事。'],
        playerEffect: { suspicion: 4, stress: 2 },
        npcDeltas: { [leadNpc.id]: { suspicion: 3, trustTowardPlayer: -2 } },
        flags: ['stored_away_the_pause'],
        nextSceneId: 'found_second',
      }

    case 'found_second':
      if (choiceId === 'help_now') {
        const cooperation = resolveCooperationEvent(context, leadNpc.id, 'carry', injuredNpc.id)
        return {
          ...cooperation,
          nextSceneId: 'shelter_choice',
        }
      }

      if (choiceId === 'make_lead_choose') {
        const confrontation = resolveConfrontationEvent(context, leadNpc.id, 'probe')
        return {
          feedback: [...confrontation.feedback, '他的反應比答案更快，快到像這件事本來就該由你先說破。'],
          playerEffect: mergeEffects(confrontation.playerEffect, { stress: 1 }),
          npcDeltas: mergeNpcDeltas(confrontation.npcDeltas, { [leadNpc.id]: { fear: 2 } }),
          nextSceneId: 'help_or_leave',
        }
      }

      return {
        feedback: ['你的手先碰到的是包，不是人。', '拉鍊一響，旁邊那道目光立刻沉了下來。'],
        playerEffect: { suspicion: 6, trust: -4, stress: 3 },
        npcDeltas: {
          [leadNpc.id]: { suspicion: 8, aggression: 4, trustTowardPlayer: -5 },
          [injuredNpc.id]: { suspicion: 6, fear: 4, trustTowardPlayer: -6 },
        },
        memoryWrites: [
          { npcId: leadNpc.id, key: 'liedOrWithheld', amount: 1 },
          { npcId: injuredNpc.id, key: 'liedOrWithheld', amount: 1 },
        ],
        flags: ['checked_bag_before_help'],
        nextSceneId: 'help_or_leave',
      }

    case 'help_or_leave': {
      if (choiceId === 'carry_together') {
        const cooperation = resolveCooperationEvent(context, leadNpc.id, 'carry', injuredNpc.id)
        return {
          ...cooperation,
          nextSceneId: 'shelter_choice',
        }
      }

      if (choiceId === 'give_water_first') {
        const cooperation = resolveCooperationEvent(context, injuredNpc.id, 'share', leadNpc.id)
        return {
          ...cooperation,
          nextSceneId: 'shelter_choice',
        }
      }
      const refusal = resolveCooperationEvent(context, leadNpc.id, 'refuse', injuredNpc.id)
      return {
        ...refusal,
        nextSceneId: 'shelter_choice',
      }
    }

    case 'shelter_choice':
      if (choiceId === 'follow_lead') {
        const acceptedRisk = context.run.dangerousLocation === 'shrine_path'
          ? { stress: 4, suspicion: 1 }
          : { trust: 2, stress: 1 }
        return {
          feedback: ['你讓那個先醒來的人帶路。', context.run.dangerousLocation === 'shrine_path' ? '你越走越覺得這不是今晚該走的方向。' : '至少表面上，你們像是暫時願意照一個順序往前。'],
          playerEffect: acceptedRisk,
          npcDeltas: { [leadNpc.id]: { trustTowardPlayer: 3, willingnessToCooperate: 2 } },
          nextSceneId: 'night_split',
        }
      }

      if (choiceId === 'choose_other_way') {
        return {
          feedback: ['你直接改了路。', '那個人沒有拉住你，只是那一下沉默立刻變得很硬。'],
          playerEffect: context.run.dangerousLocation === 'village_lane' ? { trust: -2, stress: -1 } : { trust: -4, suspicion: 3, stress: 2 },
          npcDeltas: { [leadNpc.id]: { trustTowardPlayer: -5, suspicion: 4 } },
          nextSceneId: 'night_split',
        }
      }

      return {
        feedback: ['你讓他先走在前面。', '他什麼都沒說，但從那之後每一步都踩得更重。'],
        playerEffect: { suspicion: 4, trust: -3, stress: 2 },
        npcDeltas: { [leadNpc.id]: { suspicion: 7, aggression: 3, trustTowardPlayer: -4 } },
        flags: ['made_them_walk_first'],
        nextSceneId: 'night_split',
      }

    case 'night_split': {
      if (choiceId === 'put_it_in_the_middle') {
        const cooperation = resolveCooperationEvent(context, leadNpc.id, 'share', injuredNpc.id)
        const outcome = pickOutcomeId(context, 'share')
        return {
          ...cooperation,
          outcomeId: outcome,
        }
      }

      if (choiceId === 'keep_one_close') {
        return {
          feedback: ['你把最好拿到手的那份留在自己碰得到的地方。', '屋裡沒有誰立刻開口，但每個人都看見了那個位置。'],
          playerEffect: { suspicion: 7, trust: -6, stress: 3 },
          npcDeltas: {
            [leadNpc.id]: { suspicion: 8, trustTowardPlayer: -7, aggression: 4 },
            [injuredNpc.id]: { suspicion: 6, trustTowardPlayer: -5, fear: 4 },
          },
          memoryWrites: [
            { npcId: leadNpc.id, key: 'liedOrWithheld', amount: 1 },
            { npcId: injuredNpc.id, key: 'liedOrWithheld', amount: 1 },
          ],
          flags: ['kept_supply_close'],
          outcomeId: 'day1_fracture',
        }
      }

      const confrontation = resolveConfrontationEvent(context, leadNpc.id, 'press')
      const outcome = pickOutcomeId(context, 'accuse')
      return {
        feedback: [...confrontation.feedback, '你把那個問題直接放到了桌面上。這一次，沒有人能假裝自己沒聽見。'],
        playerEffect: mergeEffects(confrontation.playerEffect, { stress: 2 }),
        npcDeltas: mergeNpcDeltas(confrontation.npcDeltas, { [injuredNpc.id]: { fear: 3, suspicion: 2 } }),
        flags: [...(confrontation.flags ?? []), 'opened_the_night_question'],
        outcomeId: outcome,
      }
    }
  }
}

const mergeEffects = (left?: PlayerEffect, right?: PlayerEffect): PlayerEffect | undefined => {
  if (!left && !right) return undefined
  return {
    trust: (left?.trust ?? 0) + (right?.trust ?? 0),
    suspicion: (left?.suspicion ?? 0) + (right?.suspicion ?? 0),
    stress: (left?.stress ?? 0) + (right?.stress ?? 0),
    stamina: (left?.stamina ?? 0) + (right?.stamina ?? 0),
    water: (left?.water ?? 0) + (right?.water ?? 0),
    food: (left?.food ?? 0) + (right?.food ?? 0),
    resource: (left?.resource ?? 0) + (right?.resource ?? 0),
    hp: (left?.hp ?? 0) + (right?.hp ?? 0),
    oddities: (left?.oddities ?? 0) + (right?.oddities ?? 0),
  }
}

const mergeNpcDeltas = (
  left?: Partial<Record<NpcId, NpcDelta>>,
  right?: Partial<Record<NpcId, NpcDelta>>,
): Partial<Record<NpcId, NpcDelta>> | undefined => {
  if (!left && !right) return undefined
  const ids = new Set<NpcId>([...Object.keys(left ?? {}), ...Object.keys(right ?? {})] as NpcId[])
  const merged: Partial<Record<NpcId, NpcDelta>> = {}

  ids.forEach((id) => {
    const leftDelta = left?.[id]
    const rightDelta = right?.[id]
    if (!leftDelta && !rightDelta) return

    merged[id] = {
      trustTowardPlayer: (leftDelta?.trustTowardPlayer ?? 0) + (rightDelta?.trustTowardPlayer ?? 0),
      fear: (leftDelta?.fear ?? 0) + (rightDelta?.fear ?? 0),
      suspicion: (leftDelta?.suspicion ?? 0) + (rightDelta?.suspicion ?? 0),
      aggression: (leftDelta?.aggression ?? 0) + (rightDelta?.aggression ?? 0),
      willingnessToCooperate: (leftDelta?.willingnessToCooperate ?? 0) + (rightDelta?.willingnessToCooperate ?? 0),
      addTags: [...(leftDelta?.addTags ?? []), ...(rightDelta?.addTags ?? [])],
      removeTags: [...(leftDelta?.removeTags ?? []), ...(rightDelta?.removeTags ?? [])],
    }
  })

  return merged
}

const pickOutcomeId = (context: OpeningContext, trigger: 'share' | 'accuse'): OpeningOutcomeId => {
  const leadNpc = getLeadNpc(context)
  const injuredNpc = getInjuredNpc(context)
  const cooperationScore =
    context.player.trust +
    leadNpc.trustTowardPlayer +
    injuredNpc.trustTowardPlayer +
    leadNpc.willingnessToCooperate -
    context.player.suspicion -
    leadNpc.suspicion

  if (trigger === 'share' && cooperationScore >= 120) {
    return 'day1_cooperate'
  }

  if (trigger === 'accuse' && (context.player.suspicion >= 35 || leadNpc.suspicion >= 55 || leadNpc.aggression >= 45)) {
    return 'day1_fracture'
  }

  return cooperationScore >= 108 ? 'day1_cooperate' : 'day1_fracture'
}

export const getOpeningOutcome = (outcomeId: OpeningOutcomeId, context: OpeningContext): OpeningOutcome => {
  const leadNpc = getLeadNpc(context)
  const injuredNpc = getInjuredNpc(context)

  if (outcomeId === 'day1_cooperate') {
    return {
      id: outcomeId,
      title: '暫時合作',
      text: buildOutcomeText('cooperate', leadNpc, injuredNpc),
    }
  }

  return {
    id: outcomeId,
    title: '裂痕留下來了',
    text: buildOutcomeText('fracture', leadNpc, injuredNpc),
  }
}





