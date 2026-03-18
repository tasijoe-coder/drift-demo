const fs = require('fs')
const path = require('path')

const phases = ['phase1', 'phase2', 'phase3', 'phase4', 'phase5']
const phaseTitles = {
  phase1: '最初幾天，任何沉默都像試探。',
  phase2: '你們開始依賴彼此，也開始更怕彼此。',
  phase3: '習慣逐漸變成裂縫，連語氣都帶著重量。',
  phase4: '每一份資源都像審判，連呼吸都變得吝嗇。',
  phase5: '到了最後，活下來和變成什麼樣的人，已經很難分開。',
}
const phaseMoodLines = {
  phase1: '他沒有立刻表態，這讓每個動作都像在替未來留紀錄。',
  phase2: '你開始知道他會怎麼皺眉，也更怕那個表情是衝著自己來的。',
  phase3: '你們之間已經有一些事不必說，但那不代表它們比較輕。',
  phase4: '連善意都得先經過懷疑，才敢靠近一點點。',
  phase5: '你知道再往前走，每一次讓步都可能再也收不回來。',
}
const backgrounds = {
  phase1: 'bg_phase1.jpg',
  phase2: 'bg_phase2.jpg',
  phase3: 'bg_phase3.jpg',
  phase4: 'bg_phase4.jpg',
  phase5: 'bg_phase5.jpg',
  resource: 'event_resource.jpg',
  trust: 'event_split.jpg',
  psychological: 'event_silence.jpg',
  external: 'event_storm.jpg',
  collapse: 'event_paranoia.jpg',
}

const resourceSeeds = [
  { slug: 'driftwood', title: '潮線木料', scene: '退潮後，一排濕透的木料卡在沙灘與礁石的交界處。', object: '木料', gainWord: '能撐幾天的材料', dangerWord: '一個會被記住的偏向', verifyWord: '那份還沒被確認的收穫', selfishFlag: 'took_more_for_self' },
  { slug: 'shell_pool', title: '殼池邊緣', scene: '一個退得太慢的水窪裡，還留著幾個能吃的東西。', object: '那點食物', gainWord: '今晚能撐住的份量', dangerWord: '一個太快的判斷', verifyWord: '那點還不確定值不值得的份量', selfishFlag: 'stole_rations' },
  { slug: 'rain_groove', title: '石面雨痕', scene: '岩面下方有一道還沒完全乾掉的水痕，看起來像昨天的雨替今天留下的喘息。', object: '那條水痕', gainWord: '也許能保命的一點水', dangerWord: '一個太像自保的動作', verifyWord: '這份未必真能留下的補給', selfishFlag: 'hid_water' },
  { slug: 'frayed_tarp', title: '裂開的帆布', scene: '一塊破帆布掛在枝頭，邊角還能用，中央卻爛得一碰就會散。', object: '那塊帆布', gainWord: '可以遮夜風的東西', dangerWord: '一種不肯先讓步的姿態', verifyWord: '那點也許還有用的遮蔽', selfishFlag: 'took_more_for_self' },
  { slug: 'reef_crate', title: '礁邊木箱', scene: '浪打上來時，一個裂口木箱在礁邊晃，像是還沒決定要不要交出裡面的東西。', object: '木箱裡的東西', gainWord: '今晚不至於空手的收穫', dangerWord: '一個會讓對方記帳的瞬間', verifyWord: '那點還不確定是不是陷阱的東西', selfishFlag: 'hid_supply_find' },
  { slug: 'vine_bundle', title: '藤纖束', scene: '樹根邊垂著一大團藤纖，能當繩，也能把人手上割出幾條記號。', object: '藤纖', gainWord: '綁住營地的機會', dangerWord: '一個太急的伸手', verifyWord: '那點可能有用也可能傷人的東西', selfishFlag: 'took_more_for_self' },
  { slug: 'shallow_nest', title: '沙丘鳥巢', scene: '沙丘後有個鳥巢，裡頭只剩幾顆還沒破的蛋，安靜得像不該被看見。', object: '那幾顆蛋', gainWord: '能讓今晚不那麼空的東西', dangerWord: '一個太像偷竊的選擇', verifyWord: '那份可能值也可能不值的收穫', selfishFlag: 'stole_rations' },
  { slug: 'knife_wrapped_pack', title: '纏著刀柄的布包', scene: '你們在殘骸邊找到一個布包，裡面纏著一把刀和幾樣小東西。', object: '布包裡的東西', gainWord: '能讓之後好過一點的工具', dangerWord: '一句之後很難解釋的沉默', verifyWord: '那份看起來太關鍵的補給', selfishFlag: 'kept_knife_closer' },
  { slug: 'cave_drip', title: '洞頂滴水', scene: '石洞裡斷斷續續落著水，一滴一滴地讓時間顯得更吝嗇。', object: '滴落的水', gainWord: '比昨天多一點的明天', dangerWord: '一個讓人看見你先為自己打算的樣子', verifyWord: '這份慢得讓人想失去耐性的希望', selfishFlag: 'hid_water' },
  { slug: 'root_patch', title: '翻出的根莖', scene: '泥地翻開後露出幾段根莖，吃不吃得下還是其次，重點是你們今天真的需要任何一點東西。', object: '那些根莖', gainWord: '可以撐住今天的份量', dangerWord: '一個太像不肯分的偏向', verifyWord: '這點未必值得的收穫', selfishFlag: 'stole_rations' },
  { slug: 'salt_fish_line', title: '鹽漬魚線', scene: '海邊殘留一段被鹽封住的魚線，上面還勾著看不清能不能入口的碎肉。', object: '那段魚線上的東西', gainWord: '勉強能被叫做食物的東西', dangerWord: '一個會讓人懷疑你先算自己的選擇', verifyWord: '這種看起來太像賭局的補給', selfishFlag: 'stole_rations' },
  { slug: 'sunken_canteen', title: '半埋的水壺', scene: '一個半埋在沙裡的水壺露出金屬邊，裡面有沒有東西，得先把它挖出來才知道。', object: '那個水壺', gainWord: '一點幾乎能讓人鬆口氣的水', dangerWord: '一個太快把希望挪向自己的動作', verifyWord: '這種看起來太像奇蹟的東西', selfishFlag: 'hid_water' },
  { slug: 'wreck_planks', title: '殘骸板材', scene: '離岸不遠的殘骸斷面還掛著幾塊完整木板，但浪勢一次比一次更靠近。', object: '那幾塊木板', gainWord: '未來幾晚的安全感', dangerWord: '一個被風浪和對方一起記住的動作', verifyWord: '這份需要運氣才能留下的材料', selfishFlag: 'took_more_for_self' },
  { slug: 'hidden_fruit', title: '陰影果叢', scene: '灌木深處掛著幾顆果實，顏色好得太像陷阱，但你們也沒有太多資格挑剔。', object: '那幾顆果實', gainWord: '能再拖一天的理由', dangerWord: '一個把良心放慢半拍的決定', verifyWord: '這份也許會反咬一口的補給', selfishFlag: 'stole_rations' },
]

const trustSeeds = [
  { slug: 'split_ration', title: '分糧的手', scene: '剩下的食物被放在你們中間，少得沒辦法假裝公平不重要。', issue: '誰先伸手', honestFlag: 'told_the_truth', selfishFlag: 'lied_about_supplies', silentFlag: 'kept_quiet' },
  { slug: 'watch_rotation', title: '守夜次序', scene: '夜晚到來前，你們得決定誰先守著火，誰先閉眼。', issue: '誰先承擔那份不安', honestFlag: 'took_first_watch', selfishFlag: 'left_watch_to_them', silentFlag: 'pretended_not_to_notice' },
  { slug: 'knife_distance', title: '刀放在哪裡', scene: '那把刀被洗乾淨後放在布上，離誰比較近，這件事突然變得很明顯。', issue: '誰比較需要先防著誰', honestFlag: 'offered_the_knife', selfishFlag: 'kept_knife_closer', silentFlag: 'looked_away_from_knife' },
  { slug: 'water_count', title: '剩水的數法', scene: '你們重新數了一次剩下的水，但每個人都像在用不同的方法記住昨天。', issue: '誰的說法更可信', honestFlag: 'counted_out_loud', selfishFlag: 'hid_water', silentFlag: 'let_it_pass' },
  { slug: 'shared_blanket', title: '共用的布', scene: '夜裡只剩一塊還算乾的布，兩個人蓋得下，但都不會舒服。', issue: '誰比較該先暖和一點', honestFlag: 'shared_the_cloth', selfishFlag: 'pulled_the_cloth_closer', silentFlag: 'slept_without_answer' },
  { slug: 'wrong_memory', title: '記錯的一句話', scene: '你很確定對方昨天說過某句話，可他看著你，像在等你自己懷疑自己。', issue: '誰該先承認記憶不可靠', honestFlag: 'admitted_confusion', selfishFlag: 'insisted_on_lie', silentFlag: 'left_it_hanging' },
  { slug: 'dragged_crate', title: '誰拖回來的', scene: '那個木箱是誰先看見的、誰拖回來的，突然變成了今晚最尖的部分。', issue: '誰有資格先分', honestFlag: 'gave_credit', selfishFlag: 'claimed_the_find', silentFlag: 'accepted_the_gap' },
  { slug: 'burned_food', title: '燒焦的晚餐', scene: '火候失手讓食物少了一半，但你們都知道，真正讓氣氛變差的不是焦味。', issue: '誰該承認那是自己的錯', honestFlag: 'owned_the_mistake', selfishFlag: 'shifted_the_blame', silentFlag: 'left_the_fault_unspoken' },
  { slug: 'storm_position', title: '風暴中的位置', scene: '風雨來時只有一個比較不會被吹翻的位置，剩下那塊地方冷得像懲罰。', issue: '誰要讓出比較安全的地方', honestFlag: 'offered_cover', selfishFlag: 'kept_the_dry_spot', silentFlag: 'waited_for_them_to_move' },
  { slug: 'night_murmur', title: '睡前那句話', scene: '對方睡前說了一句很輕的話，你不確定那是示弱、試探，還是最後一次提醒。', issue: '該不該把它當真', honestFlag: 'answered_honestly', selfishFlag: 'used_the_moment', silentFlag: 'did_not_answer' },
  { slug: 'carried_injury', title: '扭傷之後', scene: '對方的腳踝有點撐不住，之後的路會慢很多，除非有人決定別那麼公平。', issue: '誰替這份拖慢買單', honestFlag: 'slowed_down_together', selfishFlag: 'walked_ahead', silentFlag: 'pretended_not_to_notice' },
  { slug: 'distant_light', title: '遠處那點光', scene: '夜裡遠處像有一點光，但走不走過去，意味著誰要先把風險算進來。', issue: '誰比較願意賭這種希望', honestFlag: 'said_they_were_afraid', selfishFlag: 'pushed_them_forward', silentFlag: 'kept_still' },
  { slug: 'dry_shoulder', title: '誰先背包', scene: '背包只剩一個還算乾的角落，能保住一些東西，也會讓一個人先濕透。', issue: '誰該替明天承受比較多', honestFlag: 'shared_the_weight', selfishFlag: 'kept_the_dry_side', silentFlag: 'avoided_the_choice' },
  { slug: 'last_portion', title: '最後一口', scene: '只剩一口能算完整的食物，沒有任何方法能讓這件事看起來不殘忍。', issue: '誰先承認不公平已經到了嘴邊', honestFlag: 'gave_the_last_portion', selfishFlag: 'ate_the_last_portion', silentFlag: 'left_it_between_them' },
]

const psychologicalSeeds = [
  { slug: 'double_footsteps', title: '重複的腳印', scene: '你看見一串腳印往林子裡去，又在下一眼覺得自己像是昨天就看過。', unreliable: true, misleadLevel: 2, tags: ['paranoia'] },
  { slug: 'missing_breath', title: '漏掉的一次呼吸', scene: '你半夜醒來，先聽見自己的呼吸，再意識到另一個人的呼吸好像停過一下。', unreliable: true, misleadLevel: 1, tags: ['paranoia'] },
  { slug: 'wrong_voice', title: '不確定的聲音', scene: '風聲裡混進一句像是對方說的話，但你回頭時，他根本沒有張嘴。', unreliable: true, misleadLevel: 2, tags: ['hallucination'] },
  { slug: 'memory_gap', title: '空掉的片段', scene: '你很確定自己剛做過某件事，可眼前的東西證明那段記憶像是漏了一塊。', unreliable: true, misleadLevel: 3, tags: ['hallucination'] },
  { slug: 'watching_back', title: '背後那道目光', scene: '你總覺得有人一直在看你，但每次回頭，對方都把眼神移開得太剛好。', unreliable: true, misleadLevel: 2, tags: ['paranoia'] },
  { slug: 'shifted_story', title: '故事的偏移', scene: '對方說起昨天的事情時，有幾個細節跟你記得的不一樣，而且你突然沒把握自己比較對。', unreliable: true, misleadLevel: 2, tags: ['paranoia'] },
  { slug: 'repeated_wave', title: '重來的浪聲', scene: '有一瞬間，海浪像是把同一段聲音重播了兩次，讓時間變得很不可信。', unreliable: true, misleadLevel: 3, tags: ['hallucination'] },
  { slug: 'sleep_talk', title: '夢裡的名字', scene: '對方睡著時好像說了什麼，你聽得懂那個情緒，卻聽不清那是不是你的名字。', unreliable: true, misleadLevel: 1, tags: ['paranoia'] },
  { slug: 'misplaced_item', title: '放錯的位置', scene: '某樣東西被放在你不記得的位置上，像是有人動過，也像是你自己忘了。', unreliable: true, misleadLevel: 2, tags: ['paranoia'] },
  { slug: 'staring_fire', title: '火光停住', scene: '你盯著火看了太久，火光卻像盯著你，把你腦子裡最差的猜測都照了出來。', unreliable: true, misleadLevel: 3, tags: ['hallucination'] },
]

const externalSeeds = [
  { slug: 'storm_wall', title: '逼近的風牆', scene: '遠處的雲牆壓得很低，再晚一點，整條岸線都不會剩下安全感。', danger: '風暴', flag: 'storm_braced' },
  { slug: 'tide_cut', title: '潮線截斷', scene: '潮水回來得比你們估得快，把原本的退路切得只剩一條窄邊。', danger: '海水', flag: 'tide_scared' },
  { slug: 'sharp_pass', title: '碎石窄口', scene: '前面只剩一段夾著碎石的窄路，誰先過去，誰就先把身體交給運氣。', danger: '碎石', flag: 'narrow_pass' },
  { slug: 'heat_haze', title: '午後熱浪', scene: '下午的熱氣黏在皮膚上，連講話都像是在浪費水。', danger: '熱', flag: 'heat_pressure' },
  { slug: 'night_wind', title: '夜風翻面', scene: '天一黑，風向就整個反過來，火和布都不再像剛才那樣可靠。', danger: '夜風', flag: 'night_exposure' },
]

const collapseSeeds = [
  { slug: 'knife_shadow', title: '刀影', scene: '那把刀沒有動，可你們都知道今晚誰都看見了它。', edge: '暴力', flag: 'knife_between_us' },
  { slug: 'dry_canteen', title: '空掉的水壺', scene: '水壺一傾下去只剩最後一點聲音，像是在替誰作證。', edge: '乾渴', flag: 'resource_crack' },
  { slug: 'noisy_silence', title: '太吵的沉默', scene: '今晚沒有人真的吵起來，但你幾乎寧願有人先開口。', edge: '冷戰', flag: 'cold_war_started' },
  { slug: 'shared_fear', title: '共用的恐懼', scene: '你們都知道情況變壞了，卻沒有人願意先把那句話說完整。', edge: '崩塌', flag: 'fear_named' },
  { slug: 'one_safe_place', title: '唯一乾的地方', scene: '只剩一個比較不會失溫的位置，而那塊地方小得像故意只容得下一個決定。', edge: '求生', flag: 'single_safe_spot' },
]

const categoryChoiceTemplates = {
  resource: (seed, phaseIndex) => {
    const gain = phaseIndex >= 3 ? 3 : 2
    return [
      {
        text: `你不等他先開口，把${seed.object}先往自己手邊帶`,
        effect: { resource: gain, trust: -6, suspicion: 6, stress: 4, stamina: -8 },
        feeling: '他沒有立刻把話挑明，只是把那份停頓收了起來。那通常不代表事情過去了。',
        hoverHint: '也許你會先撐住今晚，但他會開始替明天記帳。',
        behavior: 'selfish',
        setFlags: [seed.selfishFlag],
      },
      {
        text: `你把${seed.object}放回中間，讓分法看起來至少不像搶`,
        effect: { resource: 1, trust: 5, suspicion: -2, stress: 2, stamina: -9 },
        feeling: '你們沒有因此立刻靠近，但那份明顯的不公平暫時沒有發生。',
        hoverHint: '局面會比較穩，可你今晚也會更難受。',
        behavior: 'cooperative',
        setFlags: ['shared_under_pressure'],
      },
      {
        text: `你先記住${seed.object}的位置，決定別為${seed.verifyWord}把今天賭光`,
        effect: { resource: 0, trust: -1, suspicion: 1, stress: 3, stamina: -3 },
        feeling: '你退開了。風險沒有立刻咬上來，但飢餓和後悔都還在原地等。',
        hoverHint: '你保住了眼前，卻把壓力推給了更晚的時候。',
        behavior: 'honest',
        setFlags: ['left_it_for_later'],
      },
    ]
  },
  trust: (seed, phaseIndex) => [
    {
      text: `你先把話說開，連最難聽的那部分也一起放到中間`,
      effect: { trust: 7, suspicion: -4, stress: 4, resource: -1, stamina: -5 },
      feeling: '他沒有因此原諒你，只是終於不必再猜你是不是還藏著另一層意思。',
      hoverHint: '坦白會留下傷口，但有些傷口至少不會再爛在裡面。',
      behavior: 'honest',
      setFlags: [seed.honestFlag],
    },
    {
      text: `你把責任往旁邊挪，讓${seed.issue}先變成他的問題`,
      effect: { trust: -7, suspicion: 8, stress: 3, resource: 1, stamina: -4 },
      feeling: '那句話讓你暫時站穩了一點，可他看你的方式很明顯變了。',
      hoverHint: '你也許保住這一刻，但下一次他未必還肯相信。',
      behavior: phaseIndex >= 3 ? 'aggressive' : 'selfish',
      setFlags: [seed.selfishFlag, 'argument_started'],
    },
    {
      text: `你沒有回答到最深的那一層，只讓沉默替你頂著`,
      effect: { trust: -2, suspicion: 4, stress: 2, stamina: -3 },
      feeling: '衝突沒有在這裡爆開，卻也沒有真正被處理掉。',
      hoverHint: '今晚可能會比較安靜，但那種安靜通常很貴。',
      behavior: 'cooperative',
      setFlags: [seed.silentFlag],
    },
  ],
  psychological: (seed, phaseIndex) => [
    {
      text: '你照著那一瞬間最強烈的直覺走，哪怕它聽起來已經有點不像直覺',
      effect: { stress: 5, suspicion: 5, resource: 1, stamina: -6, oddities: seed.tags.includes('hallucination') ? 1 : 0 },
      feeling: '你讓那個念頭贏了。之後的一切都還能解釋，只是你不再確定該信哪一個版本。',
      hoverHint: '也許你會找到東西，也可能只是讓腦子更難安靜。',
      behavior: 'aggressive',
      setFlags: ['followed_a_distorted_read'],
    },
    {
      text: '你把這份不對勁攤開，直接去看對方會怎麼反應',
      effect: { trust: 2, suspicion: 1, stress: 3, stamina: -5 },
      feeling: '他回答了你，卻沒有回答得乾淨。事情因此沒有更清楚，只是多了一種新的解讀。',
      hoverHint: '你至少不是一個人扛著，但他也會開始知道你在想什麼。',
      behavior: 'honest',
      setFlags: ['asked_about_the_weirdness'],
    },
    {
      text: '你把那點異樣先壓住，假裝自己還能再分辨得更準一點',
      effect: { stress: 4, suspicion: 3, stamina: -2 },
      feeling: '你沒有讓它在這裡擴大，可它也沒有因此消失。它只是晚一點再回來。',
      hoverHint: '看起來比較穩，但你會開始跟自己的記憶一起過夜。',
      behavior: 'cooperative',
      setFlags: ['buried_the_distortion'],
    },
  ],
  external: (seed, phaseIndex) => [
    {
      text: `你頂著${seed.danger}先往前做決定，賭自己還來得及把事情扛住`,
      effect: { resource: 2, trust: 1, stress: 5, stamina: -10, hp: phaseIndex >= 3 ? -4 : -2 },
      feeling: '你們確實把一些東西帶了回來，可代價也跟著一起進了夜裡。',
      hoverHint: '收穫也許會多一點，但你很難保證代價只落在自己身上。',
      behavior: 'aggressive',
      setFlags: [seed.flag],
    },
    {
      text: '你讓對方先走，自己留在後面看著局面會不會先裂開',
      effect: { resource: 1, trust: -5, suspicion: 4, stress: 3, stamina: -6 },
      feeling: '他先走了。事情沒有立刻失控，但那份先後順序被牢牢記下來了。',
      hoverHint: '你能少冒一點險，但不會只有你記得這件事。',
      behavior: 'selfish',
      setFlags: ['left_them_exposed'],
    },
    {
      text: '你決定先退回來，寧可把今天的份量放掉一點',
      effect: { resource: -1, trust: 1, suspicion: -1, stress: 2, stamina: -4 },
      feeling: '你們空手了一些，可至少不是帶著更糟的傷回去。',
      hoverHint: '你保住了底線，但資源短缺不會因此變得比較溫柔。',
      behavior: 'cooperative',
      setFlags: ['turned_back_before_breaking'],
    },
  ],
  collapse: (seed, phaseIndex) => [
    {
      text: `你先把主導權抓緊，哪怕這會讓${seed.edge}更快進到中間`,
      effect: { trust: -10, suspicion: 9, stress: 6, resource: 1, stamina: -8, hp: -4 },
      feeling: '你先下手把局面按住了，但那不代表局面真的比較安全。只是現在輪到對方記住。',
      hoverHint: '你也許能活得更像自己，或者更不像人。',
      behavior: 'aggressive',
      setFlags: [seed.flag, 'violence_possible'],
    },
    {
      text: '你把聲音壓低，逼自己先說出最難聽也最像實話的那句',
      effect: { trust: 3, suspicion: -1, stress: 5, stamina: -6, resource: -1 },
      feeling: '沒有任何一句話能真正救場，但至少你沒有讓局面只剩下最壞的版本。',
      hoverHint: '誠實不會讓代價消失，只會讓它不那麼骯髒。',
      behavior: 'honest',
      setFlags: ['kept_talking_before_break'],
    },
    {
      text: '你先不說，讓今夜變成一場誰先受不了的比賽',
      effect: { trust: -4, suspicion: 5, stress: 4, stamina: -7 },
      feeling: '沒有人贏。只是那份冷意更完整地坐在你們中間了。',
      hoverHint: '也許今晚不會立刻炸開，但明天的火種會更乾。',
      behavior: 'selfish',
      setFlags: [seed.flag, 'cold_war_started'],
    },
  ],
}

const withIds = []

const makeBaseEvent = ({ id, title, category, phase, dayRange, text, choices, background, weight = 10, requiredFlags, excludedFlags, conditions, tags = [], unreliable = false, misleadLevel = 1 }) => ({
  id,
  title,
  category,
  dayPhase: [phase],
  dayRange,
  text,
  choices,
  background,
  weight,
  requiredFlags,
  excludedFlags,
  conditions,
  tags,
  unreliable,
  misleadLevel,
})

const phaseRange = {
  phase1: { min: 1, max: 5 },
  phase2: { min: 6, max: 12 },
  phase3: { min: 13, max: 20 },
  phase4: { min: 21, max: 27 },
  phase5: { min: 28, max: 30 },
}

const eventList = []

function buildGeneratedEvents(seeds, category) {
  seeds.forEach((seed) => {
    phases.forEach((phase, phaseIndex) => {
      const weight = category === 'resource' || category === 'trust' ? 14 : category === 'psychological' ? 11 : 9
      const text = [
        seed.scene,
        phaseTitles[phase],
        phaseMoodLines[phase],
      ]

      const tags = []
      let conditions
      let unreliable = false
      let misleadLevel = 1

      if (category === 'psychological') {
        unreliable = seed.unreliable
        misleadLevel = seed.misleadLevel
        tags.push(...seed.tags)
        conditions = {
          minStress: seed.tags.includes('hallucination') ? 72 + phaseIndex * 2 : 40 + phaseIndex * 4,
          minSuspicion: seed.tags.includes('paranoia') ? 36 + phaseIndex * 4 : undefined,
          minOddities: seed.tags.includes('hallucination') && phaseIndex >= 2 ? 2 : undefined,
        }
      }

      if (category === 'collapse') {
        conditions = {
          minStress: 52 + phaseIndex * 6,
          minSuspicion: phaseIndex >= 2 ? 40 + phaseIndex * 4 : undefined,
        }
      }

      if (category === 'trust' && phaseIndex >= 2 && ['last_portion', 'storm_position', 'wrong_memory'].includes(seed.slug)) {
        conditions = {
          minSuspicion: 28 + phaseIndex * 5,
        }
      }

      if (category === 'external' && phaseIndex >= 3) {
        tags.push('pressure')
      }

      eventList.push(
        makeBaseEvent({
          id: `${category}_${seed.slug}_${phase}`,
          title: seed.title,
          category,
          phase,
          dayRange: phaseRange[phase],
          text,
          choices: categoryChoiceTemplates[category](seed, phaseIndex),
          background: backgrounds[category],
          weight,
          conditions,
          tags,
          unreliable,
          misleadLevel,
        }),
      )
    })
  })
}

buildGeneratedEvents(resourceSeeds, 'resource')
buildGeneratedEvents(trustSeeds, 'trust')
buildGeneratedEvents(psychologicalSeeds, 'psychological')
buildGeneratedEvents(externalSeeds, 'external')
buildGeneratedEvents(collapseSeeds, 'collapse')

const specials = [
  {
    id: 'opening_silent_allocation',
    title: '沉默的分配',
    category: 'trust',
    days: [1],
    weight: 100,
    background: 'event_split.jpg',
    text: [
      '你們把從殘骸撿回來的東西，全部攤在地上。',
      '水、食物、一把刀。兩個人，不夠分。',
      '他看著你，沒有說話。但你知道，他在等你先開口。',
    ],
    choices: [
      {
        text: '你先把東西推到中間，像在逼自己看起來還算公平。',
        effect: { trust: 2, resource: -1, stress: 1, stamina: -2 },
        feeling: '他看了你一眼，沒有多說什麼，但手最後停在了中線之外。',
        hoverHint: '也許他會把這份公平記成一種試探。',
        behavior: 'cooperative',
        setFlags: ['opening_shared_evenly'],
      },
      {
        text: '你默默把比較完整的那份往自己這邊移，像那只是順手整理。',
        effect: { trust: -2, resource: 1, stress: 3, suspicion: 2 },
        feeling: '他沒有立刻質問你，只是安靜得更深了一點。那通常比爭執更久。',
        hoverHint: '你也許先撐住今晚，但這個動作會被留在他心裡。',
        behavior: 'selfish',
        setFlags: ['opening_took_more', 'took_more_for_self'],
      },
      {
        text: '你退一步，把決定權交給他，想看看他到底會怎麼做。',
        effect: { stress: 2, stamina: -2 },
        feeling: '你把主導權放掉了。之後發生的事，會比任何答案都更像答案。',
        hoverHint: '一旦交出去，你就得接受他心裡真正偏向誰。',
        behavior: 'cooperative',
        setFlags: ['opening_left_it_to_them'],
        randomOutcomes: [
          {
            chance: 0.5,
            feeling: '他最後把東西平分了，像是在替這段關係保留一條還沒斷掉的線。',
            effect: { trust: 2, suspicion: -1 },
            setFlags: ['opening_he_shared_fairly'],
          },
          {
            chance: 0.5,
            feeling: '他先把較好的那份收進自己手裡，動作平靜得像那本來就沒有商量的餘地。',
            effect: { trust: -3, resource: -1, suspicion: 3 },
            setFlags: ['opening_he_took_more'],
          },
        ],
      },
    ],
  },
  {
    id: 'milestone_day5_fracture',
    title: '第五天的裂縫',
    category: 'trust',
    days: [5],
    weight: 90,
    background: 'event_conflict.jpg',
    text: [
      '到了第五天，你們已經能猜到彼此什麼時候會先沉默。',
      '今天那份沉默比之前都更像拒絕。',
      '你知道，如果現在不碰它，它之後只會長成更糟的東西。',
    ],
    choices: [
      {
        text: '你直接把不舒服說開，哪怕這會把今天整個撕破。',
        effect: { trust: 4, suspicion: -2, stress: 5, stamina: -5 },
        feeling: '場面沒有因此好看，但至少它不是靠假裝平靜撐住的。',
        hoverHint: '有些裂縫只能靠承認它真的存在。',
        behavior: 'honest',
        setFlags: ['argument_started', 'milestone_day5_spoken'],
      },
      {
        text: '你把問題壓回去，先讓今天繼續往前走。',
        effect: { trust: -3, suspicion: 4, stress: 2 },
        feeling: '你們沒有吵起來，但那份沒說的東西把整個晚上都拉得更緊。',
        hoverHint: '不吵不代表沒事，只代表事情換一種方式留下來。',
        behavior: 'cooperative',
        setFlags: ['cold_war_started', 'milestone_day5_silent'],
      },
      {
        text: '你先把錯推回他那邊，寧可讓他難堪，也不要自己先退。',
        effect: { trust: -7, suspicion: 6, stress: 4, resource: 1 },
        feeling: '你暫時站穩了一點，但代價是他看你的眼神開始像在防著什麼。',
        hoverHint: '你可能守住這一局，卻讓之後都變成互相提防。',
        behavior: 'aggressive',
        setFlags: ['argument_started', 'accused_companion', 'milestone_day5_attack'],
      },
    ],
  },
  {
    id: 'milestone_day10_watch',
    title: '第十天的守夜',
    category: 'trust',
    days: [10],
    weight: 88,
    background: 'event_silence.jpg',
    text: [
      '第十天的夜裡，誰先閉眼突然變成一件很難裝作不重要的事。',
      '你們都累了，也都知道，只要有一個人先不被信任，今晚就不會真正安靜。',
      '火光很低，低得像是在逼你們說出真正不想說的話。',
    ],
    choices: [
      {
        text: '你說自己先守，哪怕這代表今晚之後你會更難判斷。',
        effect: { trust: 5, stress: 3, stamina: -9, resource: -1 },
        feeling: '他沒有立刻道謝，但肩膀至少慢慢放低了一點。',
        hoverHint: '你也許換到一點信任，但身體會替這個決定記帳。',
        behavior: 'cooperative',
        setFlags: ['took_first_watch'],
      },
      {
        text: '你堅持輪到他先守，反正你也不是沒有理由防著他。',
        effect: { trust: -5, suspicion: 5, stress: 2, stamina: 2 },
        feeling: '他最後還是坐到火邊去了，只是整個晚上都沒再看你。',
        hoverHint: '你能先保住一點力氣，但他會把這份先後順序記很久。',
        behavior: 'selfish',
        setFlags: ['left_watch_to_them'],
      },
      {
        text: '你不真正回答，只把守夜說成一件誰都逃不掉的事。',
        effect: { trust: -1, suspicion: 3, stress: 3, stamina: -4 },
        feeling: '誰都沒有贏。只是今晚之後，再也沒人會把這當成小事。',
        hoverHint: '衝突沒有爆開，但你們都知道它已經在那裡。',
        behavior: 'honest',
        setFlags: ['shared_watch_without_peace'],
      },
    ],
  },
  {
    id: 'milestone_day15_cold_meal',
    title: '第十五天的冷餐',
    category: 'collapse',
    days: [15],
    weight: 88,
    background: 'event_conflict.jpg',
    text: [
      '第十五天，剩下的食物少到只夠讓人更想起公平是怎麼被磨掉的。',
      '你們坐得很近，氣氛卻像中間隔著什麼看不見的東西。',
      '如果今晚再把話吞回去，明天可能就只剩更硬的版本。',
    ],
    choices: [
      {
        text: '你把最後那份切開，承認這樣兩個人都不會舒服。',
        effect: { trust: 3, suspicion: -1, stress: 4, resource: -2 },
        feeling: '沒有人因此好過，但至少那份殘忍沒有變成只落在一個人身上。',
        hoverHint: '公平不會讓人飽，只會讓你比較不像在背叛誰。',
        behavior: 'cooperative',
        setFlags: ['shared_last_portion'],
      },
      {
        text: '你把較大的那份留在自己這邊，假裝只是因為你明天比較有用。',
        effect: { trust: -8, suspicion: 7, stress: 5, resource: 1 },
        feeling: '他沒有和你搶，只是整頓東西時再也沒把背完全交給你。',
        hoverHint: '你可能真的撐得更久，但之後每一步都會更孤單。',
        behavior: 'selfish',
        setFlags: ['ate_more_under_pressure', 'stole_rations'],
      },
      {
        text: '你把刀放遠，逼自己先說出其實你也很怕。',
        effect: { trust: 4, suspicion: -2, stress: 6, stamina: -5 },
        feeling: '那句話沒有讓現況變好，卻讓今晚至少還能被叫做同伴。',
        hoverHint: '示弱很難看，但有時比沉默更能讓人停手。',
        behavior: 'honest',
        setFlags: ['fear_named'],
      },
    ],
  },
  {
    id: 'milestone_day20_blade',
    title: '第二十天的刀',
    category: 'collapse',
    days: [20],
    weight: 90,
    background: 'event_paranoia.jpg',
    text: [
      '第二十天，刀被放在布下面，卻像比平常更清楚。',
      '你不知道是因為刀真的比較近，還是因為你現在已經學會先看到最糟的那部分。',
      '不管哪一種，你都很難再把今晚當成普通的一夜。',
    ],
    choices: [
      {
        text: '你把刀推遠，讓自己和他都看見你不是先往那裡想。',
        effect: { trust: 4, suspicion: -2, stress: 4, stamina: -3 },
        feeling: '他看著你的手停了一瞬，像是不確定自己該不該因此鬆一口氣。',
        hoverHint: '你替今晚降了一點溫，但你也得承認自己剛才真的想到那裡。',
        behavior: 'honest',
        setFlags: ['moved_the_knife_away'],
      },
      {
        text: '你把刀留在自己這邊，至少讓局面別在你沒準備時翻掉。',
        effect: { trust: -9, suspicion: 8, stress: 5, stamina: -2 },
        feeling: '他什麼都沒說，但那份沉默比把刀拔出來還像威脅。',
        hoverHint: '你先保住了主動，可你們之間也少掉了一塊能回去的地方。',
        behavior: 'aggressive',
        setFlags: ['knife_between_us', 'violence_possible'],
      },
      {
        text: '你裝作沒注意那把刀，先看誰會先受不了這種安靜。',
        effect: { trust: -4, suspicion: 5, stress: 5 },
        feeling: '沒有人碰刀，但整晚都像有人在隔著布摸它。',
        hoverHint: '也許今晚不會出事，可你們都會比昨天更知道自己在怕什麼。',
        behavior: 'cooperative',
        setFlags: ['cold_war_started'],
      },
    ],
  },
  {
    id: 'milestone_day25_tide_confession',
    title: '第二十五天的低潮線',
    category: 'trust',
    days: [25],
    weight: 88,
    background: 'event_silence.jpg',
    text: [
      '第二十五天，潮線退下去時，很多之前不想看的東西也一起露出來。',
      '對方今天看起來比平常更累，也更像是在等你先決定要不要把真相說完。',
      '如果這裡還有機會修補，大概不會再比現在更晚。',
    ],
    choices: [
      {
        text: '你把之前沒說完的部分補上，連最難講的那段也不再省略。',
        effect: { trust: 6, suspicion: -4, stress: 5, stamina: -4 },
        feeling: '他沒有立刻原諒你，但那份眼神終於不像只剩防備。',
        hoverHint: '你可能會受傷，但至少不再靠偽裝過夜。',
        behavior: 'honest',
        setFlags: ['full_confession'],
      },
      {
        text: '你只講最安全的那半段，剩下的先繼續壓著。',
        effect: { trust: -1, suspicion: 3, stress: 2 },
        feeling: '對方聽完了，卻像在等後半句。那份等待比責備更沉。',
        hoverHint: '你能先保留一點自己，但也會讓他更確定你還藏著東西。',
        behavior: 'honest',
        setFlags: ['partial_confession'],
      },
      {
        text: '你把這一刻讓過去，假裝現在根本沒有適合說真話的時機。',
        effect: { trust: -6, suspicion: 5, stress: 3, resource: 1 },
        feeling: '你保住了眼前的平靜，卻也親手把它變成了假的。',
        hoverHint: '也許你能少失去一點，但之後他不會再那麼願意等等看。',
        behavior: 'selfish',
        setFlags: ['lied_to_companion'],
      },
    ],
  },
  {
    id: 'chain_argument_aftertaste',
    title: '爭執之後',
    category: 'trust',
    dayRange: { min: 6, max: 18 },
    requiredFlags: ['argument_started'],
    excludedFlags: ['cold_war_locked'],
    weight: 30,
    background: 'event_conflict.jpg',
    text: [
      '那場爭執沒有真的結束，只是被你們一起拖著往後走。',
      '今天再看向對方時，你很難分清自己是在防備，還是在等一個誰都沒有給出的彌補。',
      '如果這裡不處理，下一次就不會再只是語氣。',
    ],
    choices: [
      {
        text: '你先把火壓下來，承認那天你也說得太狠。',
        effect: { trust: 5, suspicion: -3, stress: 3, stamina: -4 },
        feeling: '氣氛沒有立刻恢復，但至少它不再只剩一種會往壞處走的方向。',
        hoverHint: '你得先把刀收回來，哪怕對方還沒準備好。',
        behavior: 'honest',
        setFlags: ['argument_repaired'],
      },
      {
        text: '你乾脆把那場爭執坐實，讓彼此都別再裝。',
        effect: { trust: -6, suspicion: 5, stress: 4, stamina: -3 },
        feeling: '說清楚了，卻也更難回頭了。之後每句話都會帶著這次的痕。',
        hoverHint: '你不再假裝和平，但也把裂縫正式刻深。',
        behavior: 'aggressive',
        setFlags: ['cold_war_started', 'cold_war_locked'],
      },
      {
        text: '你什麼都不補，只讓日子自己把這件事拖成背景。',
        effect: { trust: -3, suspicion: 4, stress: 2 },
        feeling: '它沒有真的離開，只是學會更安靜地跟著你們。',
        hoverHint: '不處理最省力，但也最容易把下一次變得更糟。',
        behavior: 'cooperative',
        setFlags: ['cold_war_started'],
      },
    ],
  },
  {
    id: 'chain_cold_war_night',
    title: '冷戰的夜',
    category: 'collapse',
    dayRange: { min: 12, max: 26 },
    requiredFlags: ['cold_war_started'],
    weight: 28,
    background: 'event_silence.jpg',
    text: [
      '你們已經好幾次在同一個火邊坐著，卻像坐在兩個不同的夜裡。',
      '最麻煩的是，這種冷不是大吵之後的痛快，而是會慢慢把一切都磨鈍。',
      '你知道再拖下去，之後連善意都會變成可疑。',
    ],
    choices: [
      {
        text: '你先打破這份難看，哪怕這次得先低頭。',
        effect: { trust: 4, suspicion: -2, stress: 4 },
        feeling: '話沒有多溫柔，但至少還算是話，不只是彼此的背影。',
        hoverHint: '低頭不會漂亮，但也許比繼續僵著更像活路。',
        behavior: 'honest',
        setFlags: ['cold_war_softened'],
      },
      {
        text: '你讓這份冷繼續坐下去，看看是不是他會先撐不住。',
        effect: { trust: -6, suspicion: 6, stress: 5 },
        feeling: '今晚沒有爆炸，但你幾乎能聽見某些東西正在更裡面斷掉。',
        hoverHint: '你保住了姿態，但很可能把之後全都送進更壞的方向。',
        behavior: 'selfish',
        setFlags: ['cold_war_hardened'],
      },
      {
        text: '你把火添大一點，卻什麼都不說，讓動作代替態度。',
        effect: { trust: 1, suspicion: 1, stress: 2, resource: -1 },
        feeling: '火比較亮了，心卻沒有。只是今晚終於沒那麼像對峙。',
        hoverHint: '你花掉一點東西換回一點喘息，但真正的問題還在。',
        behavior: 'cooperative',
        setFlags: ['cold_war_muted'],
      },
    ],
  },
  {
    id: 'chain_betrayal_edge',
    title: '背叛邊緣',
    category: 'collapse',
    dayRange: { min: 18, max: 29 },
    requiredFlags: ['cold_war_started'],
    conditions: { minSuspicion: 58 },
    weight: 35,
    background: 'event_paranoia.jpg',
    text: [
      '你們都已經累到沒力氣再裝大方。這反而讓每個動作都更像真相。',
      '今晚只要有人先偏一下，另一個人就會把那個偏移記成背叛。',
      '問題只剩：是你先做，還是等他先做。',
    ],
    choices: [
      {
        text: '你先把更穩妥的那份藏到自己這邊，免得輪到你被留下。',
        effect: { trust: -10, suspicion: 9, stress: 6, resource: 2 },
        feeling: '你把最壞的可能先搶到自己這邊，也把最後一點體面一起推遠了。',
        hoverHint: '這或許能讓你多活一天，也可能讓一切從這裡開始不可逆。',
        behavior: 'selfish',
        setFlags: ['betrayed_them', 'stole_rations'],
      },
      {
        text: '你選擇把那份好處留在中間，像是在給彼此最後一次機會。',
        effect: { trust: 5, suspicion: -3, stress: 5, resource: -1 },
        feeling: '沒有人因此完全放下防備，但至少你沒有先把自己變成答案。',
        hoverHint: '你會先更難熬，但也可能讓最後一塊還能回頭的地方留下。',
        behavior: 'cooperative',
        setFlags: ['refused_to_betray'],
      },
      {
        text: '你把事情挑明，逼對方現在就表態，而不是再拖一晚。',
        effect: { trust: -4, suspicion: 4, stress: 7, stamina: -4 },
        feeling: '局面終於被撕開了。這不一定更安全，只是不再模糊。',
        hoverHint: '你會更快知道答案，也可能更快把局面推下去。',
        behavior: 'aggressive',
        setFlags: ['betrayal_named'],
      },
    ],
  },
  {
    id: 'paranoia_hidden_canteen',
    title: '看不見的水壺',
    category: 'psychological',
    dayRange: { min: 9, max: 27 },
    conditions: { minSuspicion: 72 },
    tags: ['paranoia'],
    weight: 34,
    background: 'event_paranoia.jpg',
    unreliable: true,
    misleadLevel: 3,
    text: [
      '你越來越確定對方藏了一個你沒看見的水壺。',
      '問題是，你找不到它，也找不到自己到底從哪一刻開始這麼確信。',
      '有些判斷到了這個程度，已經很難再說是直覺還是恐懼。',
    ],
    choices: [
      {
        text: '你直接翻找他的東西，哪怕這一步走出去就很難收回。',
        effect: { trust: -8, suspicion: 7, stress: 6, stamina: -4 },
        feeling: '你什麼都不一定找得到，但那個界線被你踩過去的事，已經是真的了。',
        hoverHint: '你可能抓到證據，也可能只是先成為更可怕的人。',
        behavior: 'aggressive',
        setFlags: ['searched_their_things'],
      },
      {
        text: '你先盯著他的一舉一動，打算在更確定之前不真正翻臉。',
        effect: { trust: -3, suspicion: 4, stress: 4 },
        feeling: '你沒有把事情挑明，但從這一刻開始，連對方喝水的動作都會刺眼。',
        hoverHint: '你保住了表面，卻把自己鎖進更長的猜疑裡。',
        behavior: 'cooperative',
        setFlags: ['watched_in_secret'],
      },
      {
        text: '你逼自己先退一步，承認現在的確信也許不是事實。',
        effect: { trust: 1, suspicion: -3, stress: 5 },
        feeling: '這不是放下，只是先把刀從腦子裡拿開一點。今晚會比較難睡，但明天或許還有餘地。',
        hoverHint: '你讓自己先慢下來，但也得承認自己剛才差點做了什麼。',
        behavior: 'honest',
        setFlags: ['resisted_paranoia_once'],
      },
    ],
  },
  {
    id: 'hallucination_second_you',
    title: '像是已經做過一次',
    category: 'psychological',
    dayRange: { min: 16, max: 30 },
    conditions: { minStress: 82 },
    tags: ['hallucination'],
    weight: 36,
    background: 'event_paranoia.jpg',
    unreliable: true,
    misleadLevel: 3,
    text: [
      '你忽然非常確定，眼前這一幕自己已經做過一次。',
      '不是想過，不是夢過，而是真的走過、說過、後悔過。',
      '最可怕的是，你開始分不清這份熟悉感是在提醒你，還是在推你犯同樣的錯。',
    ],
    choices: [
      {
        text: '你照著那份既視感走，假設它是在提醒你怎麼避開最壞的結果。',
        effect: { resource: 1, suspicion: 3, stress: 6, oddities: 1 },
        feeling: '事情確實發生了，但你說不準自己避開的是危險，還是只是新的錯。',
        hoverHint: '你也許真的記得什麼，也可能只是把恐懼誤認成經驗。',
        behavior: 'aggressive',
        setFlags: ['trusted_the_distortion'],
      },
      {
        text: '你停下來，把每一步都重新確認，哪怕這會讓對方開始不耐煩。',
        effect: { trust: -2, suspicion: -1, stress: 4, stamina: -5 },
        feeling: '你把自己拉回來了一點，可那份怪異並沒有真的走。它只是暫時站遠。',
        hoverHint: '你比較不容易立刻失控，但會讓今天變得更慢、更笨重。',
        behavior: 'honest',
        setFlags: ['questioned_the_distortion'],
      },
      {
        text: '你不承認那種感覺，把它當成疲憊和風聲一起壓過去。',
        effect: { stress: 5, suspicion: 2, stamina: -3 },
        feeling: '你讓它沒有名字，可它之後會更容易從別的角度回來。',
        hoverHint: '不理會看起來最正常，但也最容易讓它累積成下一次崩掉的理由。',
        behavior: 'cooperative',
        setFlags: ['ignored_the_distortion'],
      },
    ],
  },
]

specials.forEach((event) => {
  eventList.push(event)
})

const output = eventList.map((event) => ({
  weight: 10,
  tags: [],
  ...event,
}))

const target = path.join(process.cwd(), 'src', 'data', 'events.json')
fs.writeFileSync(target, JSON.stringify(output, null, 2) + '\n', 'utf8')
console.log(`Generated ${output.length} events -> ${target}`)
