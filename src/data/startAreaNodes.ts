export type StartAreaEffect = {
  trust?: number
  suspicion?: number
  stress?: number
  stamina?: number
  water?: number
  food?: number
  sanity?: number
}

export type StartAreaChoiceRequirement = {
  minTrust?: number
  maxTrust?: number
  minSuspicion?: number
  maxSuspicion?: number
  minStress?: number
  maxStress?: number
  hasFlag?: string
  lacksFlag?: string
}

export type StartAreaChoice = {
  text: string
  description: string
  next: string
  feedback: string[]
  effect?: StartAreaEffect
  setFlags?: string[]
  requires?: StartAreaChoiceRequirement
}

export type StartAreaNode = {
  id: string
  title: string
  description: string[]
  effect?: StartAreaEffect
  choices?: StartAreaChoice[]
  setFlags?: string[]
  background?: string
}

export type StartAreaEnding = {
  id: 'ending_safe' | 'ending_unstable'
  title: string
  text: string[]
}

export const startAreaNodes: Record<string, StartAreaNode> = {
  start_beach: {
    id: 'start_beach',
    title: '海灘',
    background: '/cover_mobile.jpg',
    description: [
      '你在濕冷的沙裡醒來。',
      '海水一下下拍過來，帶著燃油味。',
      '遠處那個人已經站起來了，背對著你。',
      '你還沒看清他的臉，先看見了他沒有回頭。',
    ],
    choices: [
      {
        text: '靠近那個人',
        description: '先確認他是威脅，還是唯一能說話的人。',
        next: 'meet_stranger',
        feedback: ['你踩過燒黑的座椅骨架。', '他聽見聲音，慢慢把臉轉了過來。'],
      },
      {
        text: '先翻殘骸',
        description: '任何能吃能喝的東西，都比一句招呼更實在。',
        next: 'wreck_search',
        feedback: ['你把視線從那個人身上移開。', '殘骸深處傳來一聲金屬摩擦。'],
      },
    ],
  },
  meet_stranger: {
    id: 'meet_stranger',
    title: '第一個醒來的人',
    background: '/cover_mobile.jpg',
    effect: { trust: 4 },
    description: [
      '他衣服半濕，右手垂在身側，像一直沒鬆開什麼。',
      '他先看你的手，再看你的臉。',
      '那不是防備結束的樣子，只是開始。',
    ],
    choices: [
      {
        text: '先開口',
        description: '讓沉默不要變成第一道牆。',
        next: 'name_exchange',
        effect: { trust: 6 },
        feedback: ['你先報了自己的名字。', '他沒有立刻回答，像在判斷值不值得留下。'],
      },
      {
        text: '問他手上拿的是什麼',
        description: '先把最危險的地方挑明。',
        next: 'knife_question',
        effect: { suspicion: 5 },
        feedback: ['你的目光落在他右手。', '他把那隻手往身後收了一下。'],
      },
    ],
  },
  wreck_search: {
    id: 'wreck_search',
    title: '殘骸',
    background: '/cover_mobile.jpg',
    effect: { food: 1, water: 1 },
    description: [
      '座椅骨架翻在沙上，塑膠焦黑發亮。',
      '一個裂開的行李箱卡在殘骸底下，裡面還壓著兩瓶水。',
      '但這裡明顯已經被翻過。',
      '你不知道是那個人，還是更早醒來的誰。',
    ],
    choices: [
      {
        text: '把找到的東西攤開',
        description: '先讓東西見光，再看他怎麼反應。',
        next: 'open_supplies',
        effect: { trust: 3 },
        feedback: ['你把水和餅乾放到沙上。', '背後那道視線很安靜，卻一直沒離開。'],
      },
      {
        text: '先把最好的一瓶收進外套',
        description: '先留一手，至少今晚不會空手。',
        next: 'hidden_bottle',
        effect: { suspicion: 8 },
        setFlags: ['hid_bottle'],
        feedback: ['你把冰冷的瓶身貼到肋側。', '拉鍊合上的聲音，在海風裡依然太清楚。'],
      },
    ],
  },
  name_exchange: {
    id: 'name_exchange',
    title: '名字',
    background: '/cover_mobile.jpg',
    description: [
      '他終於說了名字，聲音啞得像剛吞過海水。',
      '你沒聽過這個名字，也不知道該不該記住。',
      '至少現在，你們看起來像兩個人，不只是兩團還活著的東西。',
    ],
    choices: [
      {
        text: '提議一起往內陸走',
        description: '先找能遮雨的地方，再談別的。',
        next: 'village_road',
        effect: { trust: 5 },
        setFlags: ['walked_inland_together'],
        feedback: ['他沒有答應得很快。', '但他轉過身，和你站到了同一個方向。'],
      },
      {
        text: '問他怎麼比你先醒',
        description: '這個問題現在問，可能太早，也可能剛好。',
        next: 'timing_question',
        effect: { suspicion: 4 },
        feedback: ['你把問題拋出去。', '他眼神短暫地閃了一下，像踩到不願提的地方。'],
      },
    ],
  },
  knife_question: {
    id: 'knife_question',
    title: '刀',
    background: '/cover_mobile.jpg',
    effect: { suspicion: 6 },
    description: [
      '那是一把餐刀，刀尖卷了，柄上沾著濕沙。',
      '他說是在水邊撿到的。',
      '你不知道自己比較在意那把刀，還是他說這句話時沒有看你。',
    ],
    choices: [
      {
        text: '繼續問下去',
        description: '逼他把話說完整。',
        next: 'timing_question',
        effect: { suspicion: 5, stress: 3 },
        feedback: ['你沒把視線移開。', '他呼吸變淺，像在忍住更難聽的回答。'],
      },
      {
        text: '當作沒看到，先往前走',
        description: '先離開這片海灘，再決定要不要翻舊帳。',
        next: 'shoreline_path',
        effect: { stress: 2 },
        feedback: ['你點了點頭，像是真的接受了那個說法。', '他沒有收起刀，只是跟在你側後。'],
      },
    ],
  },
  open_supplies: {
    id: 'open_supplies',
    title: '分配',
    background: '/cover_mobile.jpg',
    effect: { trust: 2 },
    description: [
      '你把東西攤開後，他蹲了下來，沒有伸手。',
      '他只是看。',
      '看你會怎麼分。',
    ],
    choices: [
      {
        text: '分一半給他',
        description: '先讓這件事有個體面的開始。',
        next: 'village_road',
        effect: { trust: 8, suspicion: -2 },
        setFlags: ['shared_supplies'],
        feedback: ['你把其中一瓶推到他那邊。', '他停了一下，才把東西收走。'],
      },
      {
        text: '說先拿著，晚點再算',
        description: '先保住主動，等看清楚再決定。',
        next: 'timing_question',
        effect: { suspicion: 6 },
        feedback: ['你把東西收回自己腳邊。', '他嘴唇動了一下，最後還是什麼都沒說。'],
      },
    ],
  },
  hidden_bottle: {
    id: 'hidden_bottle',
    title: '藏起來的水',
    background: '/cover_mobile.jpg',
    effect: { suspicion: 4 },
    description: [
      '你把那瓶水壓在外套裡時，背脊整片發緊。',
      '也許他沒看見。',
      '也許只是沒拆穿。',
    ],
    choices: [
      {
        text: '若無其事地叫他過來',
        description: '讓節奏照常，別讓心虛先露出來。',
        next: 'village_road',
        effect: { stress: 3, suspicion: 2 },
        feedback: ['你把聲音放平，像剛才什麼都沒發生。', '他走過來時，目光在你外套上停了一瞬。'],
      },
      {
        text: '繞遠一點，先自己看附近',
        description: '先拉開距離，把東西握在自己手裡。',
        next: 'shoreline_path',
        effect: { stress: 5, suspicion: 4 },
        feedback: ['你沒有等他，直接沿著浪邊走開。', '腳印多出一組時，你才發現他還是跟了上來。'],
      },
    ],
  },
  timing_question: {
    id: 'timing_question',
    title: '醒來的時間',
    background: '/cover_mobile.jpg',
    effect: { suspicion: 4, stress: 3 },
    description: [
      '你問他是怎麼醒的。',
      '他說不記得。',
      '可他回答得太快，像早就準備好這三個字。',
    ],
    choices: [
      {
        text: '裝作相信，跟他一起走',
        description: '先把問題吞下去，活過今晚再說。',
        next: 'village_road',
        effect: { trust: 2, suspicion: 2 },
        feedback: ['你沒有再追問。', '他肩膀鬆了一點，但那不是放心。'],
      },
      {
        text: '不再追問，改走海邊',
        description: '換一條路，讓你們都先安靜下來。',
        next: 'shoreline_path',
        effect: { stress: 2 },
        feedback: ['你先轉身往潮線走。', '他跟上來時，刻意和你留了半步的距離。'],
      },
    ],
  },
  village_road: {
    id: 'village_road',
    title: '村路',
    background: '/bg_phase2.jpg',
    description: [
      '通往村落的路被草壓得發亮，像還有人常走。',
      '屋門半開。',
      '窗簾沒有動，卻沒有一扇窗是真正關上的。',
      '這裡不像被廢棄，更像被人匆忙放下。',
    ],
    choices: [
      {
        text: '進便利商店',
        description: '先找能帶走的東西，也找有人來過的痕跡。',
        next: 'shop_interior',
        feedback: ['你推開玻璃門。', '門上的鈴沒響，像很久以前就壞了。'],
      },
      {
        text: '走向神社小路',
        description: '山坡比較高，也許能看清這裡到底有多大。',
        next: 'shrine_lane',
        feedback: ['石階上濕得發黑。', '每走一步，你都覺得有人在更高的地方看著你們。'],
      },
    ],
  },
  shoreline_path: {
    id: 'shoreline_path',
    title: '海邊的路',
    background: '/bg_phase3.jpg',
    description: [
      '海灘往前收成一條窄路。',
      '左邊是白牆剝落的診所，右邊是塌了一半的船屋。',
      '風一直從兩棟建築中間灌出來。',
      '像有人剛從裡面走過。',
    ],
    choices: [
      {
        text: '靠近診所前院',
        description: '那裡也許還有藥，也可能還留著人。',
        next: 'clinic_patio',
        feedback: ['你踩過碎裂的藥瓶。', '玻璃在鞋底下輕輕作響，像不想讓你進去。'],
      },
      {
        text: '去海邊船屋',
        description: '舊繩索、帆布、木板，至少都還能派上用場。',
        next: 'boat_shed',
        feedback: ['你往那間斜掉的船屋走。', '鹽味更重，像有東西在裡面慢慢爛掉。'],
      },
    ],
  },
  shop_interior: {
    id: 'shop_interior',
    title: '商店裡',
    background: '/bg_phase2.jpg',
    description: [
      '架上的東西大多被掃空了。',
      '收銀台抽屜開著，地上有一枚掉進灰裡的硬幣。',
      '這地方不是被拿乾淨的，比較像被人匆忙放下。',
    ],
    choices: [
      {
        text: '繼續往後翻',
        description: '真正有用的東西通常不會放在前面。',
        next: 'store_backroom',
        feedback: ['你跨過倒下的紙箱往裡走。', '他沒有跟太近，卻也沒有離開你聽得見的距離。'],
      },
      {
        text: '抬頭看二樓',
        description: '樓上太安靜了，安靜得不自然。',
        next: 'stairs_landing',
        feedback: ['你把頭抬起來時，天花板落下一點灰。', '樓梯口黑得像有人剛把燈關掉。'],
      },
    ],
  },
  stairs_landing: {
    id: 'stairs_landing',
    title: '二樓轉角',
    background: '/bg_phase2.jpg',
    effect: { stress: 7 },
    description: [
      '樓梯只剩一半扶手。',
      '走到轉角時，你聞到潮濕木頭裡混著一點鐵味。',
      '走道盡頭，有一扇門還在輕輕晃。',
    ],
    choices: [
      {
        text: '去把那扇門推開',
        description: '至少看清楚那裡是不是還有人。',
        next: 'first_night',
        effect: { suspicion: 4 },
        setFlags: ['opened_upstairs_door'],
        feedback: ['你把門推開一道縫。', '裡面沒有人，只有一張被拖得歪掉的床。'],
      },
      {
        text: '立刻回到樓下',
        description: '這裡不值得你把第一天耗在半截樓梯上。',
        next: 'first_night',
        effect: { stress: -1 },
        feedback: ['你轉身下樓時，背後的門還在晃。', '你沒有回頭。'],
      },
    ],
  },
  shrine_lane: {
    id: 'shrine_lane',
    title: '神社小路',
    background: '/bg_phase2.jpg',
    description: [
      '石階盡頭的神社不大，朱紅的漆剝成暗褐色。',
      '門前貼著幾張舊符，紙邊潮得蜷起來。',
      '不像在迎人。',
      '比較像不想讓什麼東西出來。',
    ],
    choices: [
      {
        text: '繞到後面看那口井',
        description: '水比任何東西都實際。',
        next: 'dry_well',
        feedback: ['你從側邊繞過去。', '草擦過小腿時，你聞到一股冷到發酸的土味。'],
      },
      {
        text: '停在門口，不再往前',
        description: '先記住這個地方，別把今天用在看不懂的東西上。',
        next: 'first_night',
        effect: { stress: -2 },
        feedback: ['你沒有踏進去。', '可你知道那道門會留在你腦子裡。'],
      },
      {
        text: '伸手把符撕下來',
        description: '如果它真有用，至少該先知道它在擋什麼。',
        next: 'well_echo',
        effect: { stress: 10, suspicion: 3 },
        setFlags: ['tore_talisman'],
        feedback: ['紙纖維一下就斷了。', '風沒有變大，但你的後頸立刻發緊。'],
        requires: { minStress: 35 },
      },
    ],
  },
  well_echo: {
    id: 'well_echo',
    title: '井裡的回聲',
    background: '/bg_phase2.jpg',
    effect: { stress: 8 },
    description: [
      '符掉在地上後，井裡很快傳來一聲回音。',
      '不是落石。',
      '比較像有人在下面慢慢敲了一下井壁。',
      '那個人看向你，這次沒有掩飾不安。',
    ],
    choices: [
      {
        text: '立刻離開',
        description: '當作沒發生過，至少今晚還能睡。',
        next: 'first_night',
        effect: { suspicion: 2 },
        feedback: ['你往後退時，腳跟踩碎了那張符。', '誰都沒有提剛才那一下聲音。'],
      },
      {
        text: '往井裡再看一眼',
        description: '既然已經撕了，就別裝作自己不好奇。',
        next: 'first_night',
        effect: { stress: 6, suspicion: 4 },
        setFlags: ['looked_into_well'],
        feedback: ['井裡黑得沒有底。', '你什麼都沒看見，卻更希望自己真的看見了什麼。'],
      },
    ],
  },
  clinic_patio: {
    id: 'clinic_patio',
    title: '診所前院',
    background: '/bg_phase3.jpg',
    description: [
      '診所前院長滿半人高的草。',
      '白色看診牌倒在地上，邊角裂開。',
      '窗戶從裡面鎖著，玻璃後面掛著一件還沒完全發霉的白袍。',
    ],
    choices: [
      {
        text: '叫他幫你抬窗',
        description: '兩個人一起動手，也許能換來一點藥和一點默契。',
        next: 'locked_exam_room',
        effect: { trust: 6 },
        setFlags: ['entered_clinic_together'],
        feedback: ['你把手搭上窗框時，他也靠了過來。', '玻璃震了一下，整間屋子像跟著醒了一瞬。'],
        requires: { minTrust: 40 },
      },
      {
        text: '自己翻進去',
        description: '先搶進去，看見什麼算什麼。',
        next: 'locked_exam_room',
        effect: { stress: 5, suspicion: 2 },
        feedback: ['你先踩上窗台。', '他站在外面看你，沒有說要不要幫忙。'],
      },
      {
        text: '不進去，拿外面的布條和空瓶',
        description: '外面能用的東西已經夠多，沒必要把自己塞進黑屋子裡。',
        next: 'first_night',
        effect: { water: 1 },
        feedback: ['你把散落的布條捲好，又撿起牆角的空瓶。', '風從破窗吹出來，帶著一股久關不散的藥味。'],
      },
    ],
  },
  boat_shed: {
    id: 'boat_shed',
    title: '船屋',
    background: '/bg_phase3.jpg',
    description: [
      '船屋裡的木板潮得發黑。',
      '牆上還掛著半截破網，角落堆著一箱泡爛的救生衣。',
      '最裡面那張長桌上，放著一盞空掉的煤油燈。',
    ],
    choices: [
      {
        text: '把還能用的繩子和布拖走',
        description: '夜裡會冷，明天也不會比較輕鬆。',
        next: 'first_night',
        effect: { stamina: -4 },
        setFlags: ['took_rope'],
        feedback: ['你把濕繩從釘子上扯下來。', '他幫了你一把，卻沒有問你準備拿它做什麼。'],
      },
      {
        text: '問他是不是來過這裡',
        description: '這地方像被人挑過，你想知道是不是他。',
        next: 'first_night',
        effect: { suspicion: 4, trust: -2 },
        feedback: ['你把問題丟出去時，海風正好灌進來。', '他沒有立刻回答，先去扶那盞差點掉下來的燈。'],
      },
    ],
  },
  store_backroom: {
    id: 'store_backroom',
    title: '後倉',
    background: '/bg_phase2.jpg',
    effect: { food: 1 },
    description: [
      '後門沒有上鎖。',
      '裡面堆著幾個被水泡過的紙箱，最裡面那排貨架卻還乾著。',
      '有人挑過東西。',
      '而且挑得很仔細。',
    ],
    choices: [
      {
        text: '把剩下的罐頭拿走',
        description: '到夜裡的時候，你不會後悔手裡多一點東西。',
        next: 'first_night',
        effect: { suspicion: 3 },
        feedback: ['你把兩個罐頭塞進包裡。', '鐵皮互相碰了一下，那聲音像在記帳。'],
      },
      {
        text: '叫他一起進來看',
        description: '讓他知道你看見了什麼，也讓他知道你沒有全藏起來。',
        next: 'first_night',
        effect: { trust: 5 },
        setFlags: ['shared_backroom'],
        feedback: ['你回頭叫他。', '他進門前先看了你一眼，像在猜你的意思。'],
      },
      {
        text: '趁他背對時翻他的包',
        description: '如果少掉的東西在他那裡，你現在就會知道。',
        next: 'first_night',
        effect: { suspicion: 8, trust: -6 },
        setFlags: ['searched_his_bag'],
        feedback: ['你的手才伸進去，心口就開始發硬。', '你翻到一條乾毛巾，還有一張折得很小的照片。'],
        requires: { minSuspicion: 25 },
      },
    ],
  },
  dry_well: {
    id: 'dry_well',
    title: '枯井',
    background: '/bg_phase2.jpg',
    effect: { water: 1 },
    description: [
      '井早就乾了。',
      '但井沿內側掛著一只舊鐵勺，底下積著一小片混濁的水。',
      '少得可憐。',
      '又多到不能假裝沒看見。',
    ],
    choices: [
      {
        text: '兩人分著喝',
        description: '這點水救不了誰，但至少今天不用先為它翻臉。',
        next: 'first_night',
        effect: { trust: 6, suspicion: -2 },
        setFlags: ['shared_water'],
        feedback: ['你把鐵勺先遞給他。', '他喝得很慢，像怕你後悔。'],
      },
      {
        text: '自己先喝掉',
        description: '你比他更需要撐到晚上，至少你這麼告訴自己。',
        next: 'first_night',
        effect: { suspicion: 6, stress: 3 },
        setFlags: ['drank_first'],
        feedback: ['冰涼的水一下就滑進喉嚨。', '放下勺子的時候，你沒有去看他的臉。'],
      },
    ],
  },
  locked_exam_room: {
    id: 'locked_exam_room',
    title: '診間',
    background: '/bg_phase3.jpg',
    effect: { stress: 5 },
    description: [
      '裡面比你想的乾淨。',
      '病床上的床單被摺過，角落還整整齊齊壓著一雙室內拖。',
      '抽屜裡只剩一卷繃帶，和半瓶過期止痛藥。',
    ],
    choices: [
      {
        text: '把藥和繃帶都帶走',
        description: '這地方不會自己好起來，你們也不會。',
        next: 'first_night',
        effect: { trust: -2, suspicion: 3 },
        setFlags: ['took_clinic_supplies'],
        feedback: ['你把東西全收進包裡。', '他看見了，但只說了一句：走吧。'],
      },
      {
        text: '留下一半',
        description: '也許這不是善良，只是你不想讓自己看起來太像掠奪者。',
        next: 'first_night',
        effect: { trust: 4 },
        feedback: ['你把那卷繃帶留在原處。', '他沒有稱讚你，只是表情稍微鬆了一點。'],
      },
    ],
  },
  first_night: {
    id: 'first_night',
    title: '第一夜',
    background: '/bg_phase4.jpg',
    description: [
      '天色收得很快。',
      '你們在一間還算完整的屋子裡落腳，門口用桌子頂住。',
      '屋外沒有聲音。',
      '這比有聲音更難受。',
    ],
    choices: [
      {
        text: '輪流守夜',
        description: '至少讓彼此都能閉一會兒眼。',
        next: 'shared_watch',
        effect: { trust: 6, suspicion: -2 },
        setFlags: ['shared_watch'],
        feedback: ['你把守夜的時間先說清楚。', '他沉默了一下，最後還是點了頭。'],
      },
      {
        text: '把刀放在手邊裝睡',
        description: '先讓自己不要死在今晚。',
        next: 'knife_under_blanket',
        effect: { stress: 6, suspicion: 4 },
        setFlags: ['kept_knife_close'],
        feedback: ['你把刀壓進毯子下面。', '布料摩擦的聲音很小，卻像有人在耳邊提醒你別睡。'],
      },
      {
        text: '等他睡著再出去翻一次',
        description: '如果還有東西藏著，現在是最容易看清的時候。',
        next: 'night_search',
        effect: { stress: 8, suspicion: 5 },
        setFlags: ['slipped_out_at_night'],
        feedback: ['你聽著他的呼吸慢下來。', '站起身那一刻，你知道自己已經過了某條線。'],
        requires: { minSuspicion: 22 },
      },
    ],
  },
  shared_watch: {
    id: 'shared_watch',
    title: '守夜',
    background: '/bg_phase4.jpg',
    description: [
      '前半夜是你。',
      '後半夜輪到他時，你還醒著，聽見他起身時盡量放輕動作。',
      '沒有誰說信任。',
      '但桌上的水和食物，直到天亮都還在原位。',
    ],
    choices: [
      {
        text: '天亮前把水推到中間',
        description: '不說什麼，只把界線放得清楚一點。',
        next: 'ending_check',
        effect: { trust: 4 },
        feedback: ['你把瓶子往中間推了一點。', '他看見了，這次沒有把它往自己那邊帶。'],
      },
      {
        text: '什麼都不說，等天亮',
        description: '先把這一夜完整地撐過去，再決定之後。',
        next: 'ending_check',
        effect: { stress: -2 },
        feedback: ['你靠著牆坐到天色變白。', '屋裡依然冷，但那股立著的勁終於鬆了一點。'],
      },
    ],
  },
  knife_under_blanket: {
    id: 'knife_under_blanket',
    title: '沒睡的人',
    background: '/bg_phase4.jpg',
    description: [
      '你整晚都沒真正睡著。',
      '他翻身一次，你的手就收緊一次。',
      '到天快亮時，你已經分不清自己是在防他，還是在等他先動。',
    ],
    choices: [
      {
        text: '在他醒來前把刀收起來',
        description: '讓這一夜到此為止，至少表面上是。',
        next: 'ending_check',
        effect: { stress: -1, suspicion: -1 },
        feedback: ['你把刀慢慢抽出來，塞回桌腳後面。', '手心全是汗，像剛做完一件不能讓人看見的事。'],
      },
      {
        text: '天一亮就盯著他看',
        description: '先讓他知道，你沒有睡，也沒有放鬆。',
        next: 'ending_check',
        effect: { trust: -6, suspicion: 6 },
        feedback: ['他睜眼時先看見的是你的目光。', '誰都沒說話，但早上的空氣一下就變硬了。'],
      },
    ],
  },
  night_search: {
    id: 'night_search',
    title: '半夜再出去',
    background: '/bg_phase4.jpg',
    description: [
      '你摸黑回到白天去過的地方。',
      '每一扇門都比記憶裡更響。',
      '回來時，他已經坐起來了，背靠著牆，像根本沒有睡。',
    ],
    choices: [
      {
        text: '承認自己出去過',
        description: '先把事情說在他開口前。',
        next: 'ending_check',
        effect: { trust: 2, stress: 2, suspicion: -1 },
        feedback: ['你先承認了。', '他沒說原諒，只是把視線從門口移回你臉上。'],
      },
      {
        text: '說自己只是去方便',
        description: '謊說得小一點，也許比較不會碎。',
        next: 'ending_check',
        effect: { trust: -6, suspicion: 8 },
        setFlags: ['lied_at_night'],
        feedback: ['你把話說完，連自己都不太信。', '他點了一下頭，那個動作比質問更讓人難受。'],
      },
      {
        text: '反問他是不是一直沒睡',
        description: '把問題丟回去，看看誰先退。',
        next: 'ending_check',
        effect: { trust: -8, suspicion: 10, stress: 4 },
        setFlags: ['turned_question_back'],
        feedback: ['你一句話頂回去。', '他看了你很久，久到屋裡像只剩你們兩個人的呼吸。'],
      },
    ],
  },
}

export const startAreaEndings: Record<StartAreaEnding['id'], StartAreaEnding> = {
  ending_safe: {
    id: 'ending_safe',
    title: '暫時安全',
    text: [
      '天亮時，屋外還是空的。',
      '你們沒有真的相信彼此，只是都沒有把最後那點壞意推到明面上。',
      '桌上的水還在，門口的桌子也還頂著。',
      '第一天總算過去了。',
      '這座島沒有因此變好，只是還來不及把你們拆開。',
    ],
  },
  ending_unstable: {
    id: 'ending_unstable',
    title: '不穩的開始',
    text: [
      '天還沒亮透，你就知道事情已經壞了。',
      '不是因為外面有什麼動靜。',
      '而是你們都記住了彼此昨晚的每一個停頓、每一次不看、每一句沒說完的話。',
      '第一天結束時，最危險的東西已經不在屋外。',
      '它留在這間屋裡，也留在你看他的方式裡。',
    ],
  },
}
