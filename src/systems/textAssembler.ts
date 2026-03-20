import type { NpcPersonality } from '../data/npcs'
import type { NpcState } from './npcState'
import type { RunSetup } from './runSetup'

const personalityFragments: Record<NpcPersonality, { contact: string; reply: string; pressure: string; cooperation: string }> = {
  guarded: {
    contact: '他先看你的手，再看你的臉，像在算你什麼時候會伸得太近。',
    reply: '他答得很慢，每個字都像先在嘴裡放過一遍。',
    pressure: '他沒有提高聲音，只把下巴收緊了一點，那比發火更像警告。',
    cooperation: '他不會直接拒絕，但每一步都像還留著後悔的空間。',
  },
  calm: {
    contact: '他沒有立刻開口，先掃了一眼四周，才把視線放回你身上。',
    reply: '他說話不快，像在替每句話找能落地的地方。',
    pressure: '他越安靜，越像已經把最壞的版本先想過一輪。',
    cooperation: '他願意配合，但那不像信任，更像先把今天撐過去。',
  },
  opportunistic: {
    contact: '他看你的時候，連你手邊能拿走什麼也一起看進去了。',
    reply: '他回得很順，順得像早就知道哪句話最能讓人暫時放下戒心。',
    pressure: '他不是在生氣，只是在衡量哪一邊比較划算。',
    cooperation: '他願意幫忙，只要看起來不會先讓自己吃虧。',
  },
  unstable: {
    contact: '他像晚了一拍才聽見你，眼神一度飄到你身後的空地方。',
    reply: '他說話時偶爾會斷掉，像注意力被別的聲音拉走。',
    pressure: '他情緒起得快，也退得快，反而讓人更難抓住下一步會去哪。',
    cooperation: '他不是不願意，只是你永遠不知道哪一句話會讓他突然改變主意。',
  },
}

const moodFragments = {
  watchful: '他還在看你會先做哪一件事。',
  measured: '他像是勉強把警戒壓住了。',
  tense: '他肩膀一直沒有真正放下來。',
  cornered: '他看起來已經準備好把每句話都當成試探。',
  volatile: '你幾乎能感覺到他的神經正貼著表面跳。',
} as const

const supplySpreadText = {
  shoreline_cache: '潮線附近被翻得更乾淨，像有人醒來後第一件事就是先找能入口的東西。',
  wreck_cache: '真正能用的物資多半還卡在殘骸深處，只是要拿就得先冒險。',
  split_cache: '東西沒有集中在一處，這讓每一趟搜尋都像在賭會不會空手。',
} as const

const dangerText = {
  village_lane: '往村落的那條路太安靜了，安靜得像在等人先走進去。',
  wreck_edge: '殘骸邊緣一直傳來金屬互擦的細響，像有東西還卡在裡面。',
  shrine_path: '通往神社的石階濕得發黑，風一吹就像有人踩過上面的落葉。',
} as const

export const describeNpc = (npc: NpcState, mode: 'contact' | 'reply' | 'pressure' | 'cooperation') => personalityFragments[npc.personality][mode]

export const describeMood = (npc: NpcState) => moodFragments[npc.currentMood]

export const describeRunTension = (setup: RunSetup) => [supplySpreadText[setup.supplySpread], dangerText[setup.dangerousLocation]]

export const buildBeachWakeText = (leadNpc: NpcState, setup: RunSetup) => {
  const [supplyLine] = describeRunTension(setup)

  return [
    '你在濕沙裡醒來時，嘴裡全是海水和灰。',
    supplyLine,
    '遠處那個先站起來的人沒有靠近，只是隔著殘骸看著你。',
    describeNpc(leadNpc, 'contact'),
  ]
}

export const buildContactText = (leadNpc: NpcState, setup: RunSetup) => {
  const hiddenLine = setup.hiddenNpcId === leadNpc.id && setup.hiddenTruth === 'lying'
    ? '他回話以前先停了一下，像在挑最不會留下痕跡的說法。'
    : describeNpc(leadNpc, 'reply')

  return [
    '你們第一次真正站到能看清彼此表情的距離。',
    hiddenLine,
    describeMood(leadNpc),
  ]
}

export const buildWreckText = (leadNpc: NpcState, setup: RunSetup) => {
  const dangerLine = setup.dangerousLocation === 'wreck_edge'
    ? '每翻開一塊板子，底下都像還壓著什麼沒斷乾淨的聲音。'
    : '焦黑的座椅底下還卡著東西，只是沒有一樣看起來像會輕鬆拿到手。'

  return [
    '你先往殘骸深處鑽，手背很快就沾上了濕灰。',
    dangerLine,
    setup.hiddenNpcId === leadNpc.id && setup.hiddenTruth === 'hoarding'
      ? '那個人沒有阻止你，只是一直盯著你翻到的每一樣東西。'
      : '背後那道視線沒有消失，讓你連拿起瓶水都像在被記錄。',
  ]
}

export const buildSecondSurvivorText = (injuredNpc: NpcState, leadNpc: NpcState, setup: RunSetup) => {
  const injuryLine = setup.hiddenTruth === 'injury_hidden' && setup.hiddenNpcId === leadNpc.id
    ? '先醒來的人明顯早就知道這裡還有人，只是直到現在才帶你看見。'
    : '角落裡那個人靠著破牆坐著，褲腳已經被血和泥黏成一片。'

  return [
    injuryLine,
    describeNpc(injuredNpc, 'contact'),
    leadNpc.trustTowardPlayer < 42 ? '站在你身後的那個人沒有先表態，像在看你會把這件事往哪邊推。' : '你還沒開口，站在旁邊的人已經先把步子放慢了。',
  ]
}

export const buildShelterText = (leadNpc: NpcState, setup: RunSetup) => {
  const [, dangerLine] = describeRunTension(setup)
  return [
    '日光往下沉得很快，現在不先決定今晚在哪裡停下來，等一下只會更糟。',
    dangerLine,
    describeNpc(leadNpc, 'cooperation'),
  ]
}

export const buildNightSplitText = (leadNpc: NpcState, injuredNpc: NpcState | null, setup: RunSetup) => {
  const hiddenLine = setup.hiddenTruth === 'hoarding'
    ? '你很難不去想：如果有人手裡還藏著一點東西，現在正是最容易裝作沒有的時候。'
    : '所有能喝能吃的東西一放到中間，屋裡的安靜立刻變重了。'

  return [
    '天黑後，屋裡只剩呼吸和布料摩擦的聲音。',
    hiddenLine,
    injuredNpc ? describeMood(injuredNpc) : describeMood(leadNpc),
  ]
}

export const buildOutcomeText = (kind: 'cooperate' | 'fracture', leadNpc: NpcState, injuredNpc: NpcState | null) => {
  if (kind === 'cooperate') {
    return [
      '這一夜沒有真的變輕，只是沒有人先把它推向最壞的地方。',
      injuredNpc && injuredNpc.trustTowardPlayer > 45
        ? '天亮以前，至少有一個人不再用那種準備隨時奪門而出的眼神看你。'
        : '你知道這不算信任，但至少今晚還能勉強把東西留在桌上。',
      leadNpc.currentMood === 'measured'
        ? '那個先醒來的人沒有多說話，只在換班守夜時把刀放遠了一點。'
        : '你們都沒有放下戒心，只是暫時願意讓它不要先開口。',
    ]
  }

  return [
    '天還沒亮，你就知道今天留下來的東西不會自己過去。',
    injuredNpc && injuredNpc.hiddenTags.includes('injured')
      ? '有人開始把痛藏起來，有人開始把話藏起來，屋裡每一下呼吸都在互相提防。'
      : '誰都沒有真正翻臉，但每個人都已經在替明天預留最壞的位置。',
    leadNpc.currentMood === 'volatile'
      ? '那個先醒來的人整夜都沒真的睡，像只要你再動一次就會把事情做絕。'
      : '你們還待在同一間屋子裡，可那已經不像一起撐過夜，更像暫時困在一起。',
  ]
}

export const buildConfrontationFeedback = (npc: NpcState, tone: 'probe' | 'press' | 'back_down') => {
  if (tone === 'probe') {
    return [
      '你把問題丟出去後，空氣像立刻收緊了一圈。',
      describeNpc(npc, 'reply'),
    ]
  }

  if (tone === 'press') {
    return [
      '你沒有把視線讓開。',
      describeNpc(npc, 'pressure'),
    ]
  }

  return [
    '你先把那句更重的話吞了回去。',
    '他看著你，像明白你退了一步，也像已經把這一步記住。',
  ]
}

export const buildSearchFeedback = (location: 'wreck' | 'shore' | 'village', successLevel: 'success' | 'mixed' | 'thin') => {
  if (location === 'wreck') {
    if (successLevel === 'success') return ['你從扭曲的鋁板底下拖出能用的東西。', '可那一下手感讓你知道，下次不一定還能這麼幸運。']
    if (successLevel === 'mixed') return ['你帶回來的東西不多。', '真正留下來的反而是手臂上那一道慢慢發熱的擦傷。']
    return ['你在殘骸裡耗掉了太多時間。', '空手回頭時，連浪聲都像在提醒你剛才的白費。']
  }

  if (location === 'shore') {
    if (successLevel === 'success') return ['你在潮線後面找到還沒被海水完全毀掉的補給。', '那點收穫讓今晚至少不會先從口渴開始。']
    if (successLevel === 'mixed') return ['你撿回來的東西只夠勉強遮一下今天的難看。', '但你知道這種剛好通常撐不了太久。']
    return ['你繞了一圈，只把濕氣和更重的疲倦帶回來。', '回頭的那段路比出去時更長。']
  }

  if (successLevel === 'success') return ['你在屋裡翻到還能用的東西。', '可越往裡走，越有一種自己正在踩進別人剛離開的生活裡。']
  if (successLevel === 'mixed') return ['你沒有白跑，但帶回來的不足以讓人真正安心。', '這地方看起來像還會再吐出更多事，只是不是今天。']
  return ['你找到的只有空盒、潮味和更多不想解釋的痕跡。', '這一趟最糟的不是沒拿到東西，而是你開始懷疑自己漏掉了什麼。']
}

export const buildCooperationFeedback = (npc: NpcState, intent: 'offer' | 'carry' | 'share' | 'refuse') => {
  if (intent === 'offer') {
    return ['你把合作這件事先說出口。', describeNpc(npc, 'cooperation')]
  }

  if (intent === 'carry') {
    return ['你伸手去扶的時候，對方沒有立刻甩開。', '那不是接受，只是暫時不想一個人倒下。']
  }

  if (intent === 'share') {
    return ['你把東西放到中間，像在逼自己不要先往回收。', '對方的手停了一下，才慢慢靠近。']
  }

  return ['你沒有把手伸出去。', '沉默比拒絕更容易留下來，因為誰都知道自己看見了。']
}
