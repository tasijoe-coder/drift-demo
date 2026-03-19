export type StartAreaEffect = {
  trust?: number
  suspicion?: number
  stress?: number
  stamina?: number
  water?: number
  food?: number
  sanity?: number
}

export type StartAreaChoice = {
  text: string
  to: string
}

export type StartAreaNode = {
  id: string
  text: string[]
  effect?: StartAreaEffect
  choices?: StartAreaChoice[]
  setFlags?: string[]
}

export type StartAreaEnding = {
  id: 'ending_escape' | 'ending_betrayal' | 'ending_madness' | 'ending_ambiguous'
  title: string
  text: string[]
}

export const startAreaNodes: Record<string, StartAreaNode> = {
  start_beach: {
    id: 'start_beach',
    text: ['你在海灘醒來。', '飛機殘骸散落一地。', '你不是第一個醒來的人。', '遠處，那個人已經站起來了。'],
    choices: [
      { text: '靠近他', to: 'meet_stranger' },
      { text: '先搜尋殘骸', to: 'wreck_search' },
    ],
  },
  meet_stranger: {
    id: 'meet_stranger',
    effect: { trust: 10 },
    text: ['他看著你，沒有先開口。', '那不是冷靜，', '比較像是在等你犯錯。'],
    choices: [
      { text: '主動說話', to: 'talk_start' },
      { text: '保持距離', to: 'distrust_start' },
    ],
  },
  wreck_search: {
    id: 'wreck_search',
    effect: { food: 2, water: 1 },
    text: ['你翻出一些補給。', '但這裡已經被動過。', '你不知道是他，', '還是更早的人。'],
    choices: [
      { text: '收起物資', to: 'took_resources' },
      { text: '假裝沒看到', to: 'leave_trace' },
    ],
  },
  talk_start: {
    id: 'talk_start',
    effect: { trust: 10 },
    text: ['你先開口。', '他回應得很慢，', '像是在衡量每個字值不值得說。'],
    choices: [
      { text: '問他怎麼活下來', to: 'info_exchange' },
      { text: '提議一起行動', to: 'team_up' },
    ],
  },
  distrust_start: {
    id: 'distrust_start',
    effect: { suspicion: 10 },
    text: ['你沒有靠近。', '他也沒有動。', '你們都在觀察對方。'],
    choices: [
      { text: '偷看他的行李', to: 'sneak_check' },
      { text: '直接離開', to: 'solo_route' },
    ],
  },
  took_resources: {
    id: 'took_resources',
    effect: { suspicion: 5 },
    text: ['你把東西收起來。', '他看見了。', '但沒有說。'],
    choices: [
      { text: '分給他一部分', to: 'share_resources' },
      { text: '裝作沒事', to: 'hide_intent' },
    ],
  },
  leave_trace: {
    id: 'leave_trace',
    effect: { trust: 5 },
    text: ['你沒有拿。', '但你知道，', '這不代表你比較好。'],
    choices: [
      { text: '回去找他', to: 'meet_again' },
      { text: '自己離開', to: 'solo_route' },
    ],
  },
  info_exchange: {
    id: 'info_exchange',
    effect: { trust: 5 },
    text: ['你們交換了一些資訊。', '但有些地方，', '對不上。'],
    choices: [
      { text: '繼續追問', to: 'doubt_rise' },
      { text: '停止對話', to: 'uneasy_silence' },
    ],
  },
  team_up: {
    id: 'team_up',
    effect: { trust: 15 },
    text: ['你們決定暫時一起行動。', '但沒有人說「信任」。'],
    choices: [{ text: '前往村落', to: 'village_entry' }],
  },
  sneak_check: {
    id: 'sneak_check',
    effect: { suspicion: 15 },
    text: ['你翻了他的東西。', '有東西不該出現在這裡。'],
    choices: [
      { text: '當面質問', to: 'confrontation' },
      { text: '裝作不知道', to: 'hidden_truth' },
    ],
  },
  solo_route: {
    id: 'solo_route',
    effect: { sanity: -5 },
    text: ['你選擇一個人走。', '但這裡太安靜了。'],
    choices: [{ text: '前往村落', to: 'village_entry' }],
  },
  share_resources: {
    id: 'share_resources',
    effect: { trust: 15 },
    text: ['你分了一部分給他。', '他接下了。', '沒有說謝謝。'],
    choices: [{ text: '一起前進', to: 'village_entry' }],
  },
  hide_intent: {
    id: 'hide_intent',
    effect: { suspicion: 10 },
    text: ['你假裝什麼都沒發生。', '但你開始注意到，', '他也在這樣做。'],
    choices: [{ text: '一起前進', to: 'village_entry' }],
  },
  meet_again: {
    id: 'meet_again',
    effect: { trust: 5 },
    text: ['你回去找他。', '他還在原地。', '像是在等你。'],
    choices: [{ text: '一起走', to: 'village_entry' }],
  },
  doubt_rise: {
    id: 'doubt_rise',
    effect: { suspicion: 10 },
    text: ['你追問得更深。', '他給了答案。', '但每一句都像是先想過要漏掉什麼。'],
    choices: [{ text: '帶著疑問前進', to: 'village_entry' }],
  },
  uneasy_silence: {
    id: 'uneasy_silence',
    effect: { trust: -5, suspicion: 5 },
    text: ['你停下了。', '他也沒有補上後面那句。', '這段對話像是被誰故意留了空白。'],
    choices: [{ text: '一起前進', to: 'village_entry' }],
  },
  village_entry: {
    id: 'village_entry',
    text: ['你們進入村落。', '這裡不像被廢棄，', '比較像是「停止」。', '門是開的，', '但沒有人。'],
    choices: [
      { text: '進入民宅', to: 'house_search' },
      { text: '前往神社', to: 'shrine_path' },
    ],
  },
  house_search: {
    id: 'house_search',
    effect: { food: 2, sanity: -5 },
    text: ['屋內有生活痕跡。', '桌上的碗還沒乾。'],
    choices: [
      { text: '繼續搜索', to: 'deeper_house' },
      { text: '離開', to: 'night_fall' },
    ],
  },
  shrine_path: {
    id: 'shrine_path',
    effect: { sanity: -10 },
    text: ['神社門前有符。', '不是用來保護，', '比較像是在阻止什麼出來。'],
    choices: [
      { text: '進去', to: 'shrine_inside' },
      { text: '轉身離開', to: 'night_fall' },
    ],
  },
  deeper_house: {
    id: 'deeper_house',
    effect: { suspicion: 10 },
    text: ['你發現地下室。', '門是開的。'],
    choices: [
      { text: '下去', to: 'bad_end_trap' },
      { text: '關門離開', to: 'night_fall' },
    ],
  },
  shrine_inside: {
    id: 'shrine_inside',
    effect: { sanity: -15 },
    text: ['裡面沒有神像。', '只有鏡子。'],
    choices: [
      { text: '看鏡子', to: 'madness_end' },
      { text: '打破鏡子', to: 'truth_flag' },
    ],
  },
  confrontation: {
    id: 'confrontation',
    effect: { trust: -30 },
    text: ['你直接問了。', '他沒有否認。'],
    choices: [
      { text: '繼續同行', to: 'bad_end_kill' },
      { text: '分開', to: 'solo_bad_end' },
    ],
  },
  hidden_truth: {
    id: 'hidden_truth',
    effect: { suspicion: 20 },
    text: ['你沒有說。', '但你開始改變行為。'],
    choices: [{ text: '繼續同行', to: 'unstable_route' }],
  },
  truth_flag: {
    id: 'truth_flag',
    setFlags: ['truth_flag'],
    effect: { trust: 5, suspicion: -5, sanity: -5 },
    text: ['鏡子碎開後，後面露出一道刻痕。', '你看不懂那是警告還是指引。', '但你知道，這地方藏的東西不是空的。'],
    choices: [{ text: '帶著這件事離開', to: 'night_fall' }],
  },
  bad_end_trap: {
    id: 'bad_end_trap',
    effect: { sanity: -15, stress: 10 },
    text: ['樓梯在你腳下發出怪聲。', '你幾乎是跌著退回來的。', '黑暗裡像有東西知道你來過。'],
    choices: [{ text: '逃離地下室', to: 'ending_ambiguous' }],
  },
  madness_end: {
    id: 'madness_end',
    effect: { sanity: -40 },
    text: ['鏡子裡的人慢了半拍。', '你本來想移開視線，', '但最後不知道是誰先看著誰。'],
    choices: [{ text: '讓它繼續', to: 'ending_madness' }],
  },
  bad_end_kill: {
    id: 'bad_end_kill',
    effect: { trust: -20, suspicion: 20 },
    text: ['你還是選擇繼續走。', '夜裡，他先動手了。', '你到最後也不知道他是怕你，還是早就準備好了。'],
    choices: [{ text: '倒下', to: 'ending_betrayal' }],
  },
  solo_bad_end: {
    id: 'solo_bad_end',
    effect: { sanity: -10, stress: 10 },
    text: ['你們分開後，村落比想像中更安靜。', '一個人走並沒有比較安全，', '只是沒有第二個人能提醒你哪裡不對。'],
    choices: [{ text: '撐到天黑', to: 'ending_ambiguous' }],
  },
  unstable_route: {
    id: 'unstable_route',
    effect: { suspicion: 10, trust: -5 },
    text: ['你們繼續同行。', '但從這一刻開始，', '你看他的每個動作都像是在藏事。'],
    choices: [{ text: '帶著這種安靜前進', to: 'village_entry' }],
  },
  night_fall: {
    id: 'night_fall',
    text: ['天黑了。', '你們之間，', '沒有比白天更清楚。'],
    choices: [{ text: '結算', to: 'ending_check' }],
  },
}

export const startAreaEndings: Record<StartAreaEnding['id'], StartAreaEnding> = {
  ending_escape: {
    id: 'ending_escape',
    title: '離開',
    text: ['你們離開了這裡。', '但你不確定，', '你們之間留下了什麼。'],
  },
  ending_betrayal: {
    id: 'ending_betrayal',
    title: '背叛',
    text: ['你不是死在這裡。', '你是死在選擇相信的那一刻。'],
  },
  ending_madness: {
    id: 'ending_madness',
    title: '失序',
    text: ['你還在這裡。', '只是你已經不再知道自己在哪裡。'],
  },
  ending_ambiguous: {
    id: 'ending_ambiguous',
    title: '未明',
    text: ['你們還活著。', '但沒有一個人確定，', '這是不是結束。'],
  },
}
