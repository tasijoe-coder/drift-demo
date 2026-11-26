// 小說上方主圖。沒有專屬圖的故事沿用月老案前。
export type NovelArt = { src: string; alt: string; position?: string }

const FALLBACK: NovelArt = { src: '/art/zero/ledger.webp', alt: '月老在渡口的姻緣簿前。' }

const ART: Record<string, NovelArt> = {
  'qin-novel': { src: '/art/novel/qin.webp', alt: '秦代暮春的後院，翻牆而入的書生與杏花樹下拿著團扇的女子初次相望，遠方是長城。', position: '50% 38%' },
  'jin-novel': { src: '/art/novel/jin.webp', alt: '書院燈下，梁山伯與女扮男裝的祝英台對桌讀書，窗邊飛著兩隻蝴蝶。', position: '50% 40%' },
  'tang-novel': { src: '/art/novel/tang.webp', alt: '長安胭脂街，王月英在櫃前量紙，街對面的郭華整理衣襟，中間熱餅冒著蒸氣。', position: '50% 32%' },
  'song-novel': { src: '/art/novel/song.webp', alt: '江南水鄉，王十朋抱著一疊書站在窗邊，錢玉蓮坐著縫補書頁，桌上擺著繫紅線的荊釵。', position: '50% 25%' },
  'ming1-novel': { src: '/art/novel/ming1.webp', alt: '秦雪梅坐在織機前，商琳捧著畫軸，一旁掛著紅色喜服與剪刀。', position: '50% 35%' },
  'ming2-novel': { src: '/art/novel/ming2.webp', alt: '井邊，賈玉珍提著水桶，韋燕春向她借水，身後是一座石橋。', position: '50% 40%' },
  'seventh-novel': { src: '/art/novel/seventh.webp', alt: '彩樓上，劉瑞蓮捧著繡球低頭看著樓下的李奎元，滿月高掛。', position: '50% 50%' },
  'fog-novel': { src: '/art/novel/fog.webp', alt: '雨夜霧港，沈照微在電報行門口拿著電話，陸聞笙捏著一角燒焦的紙，遠處停著汽船。', position: '50% 40%' },
  'matinee-novel': { src: '/art/novel/matinee.webp', alt: '一九八六年的海邊戲院門口，抱著片盤的許懷生與站在褪色舊海報前的江宜寧重逢，紅線從他的小指牽到她的小指。', position: '50% 20%' },
}

const AFTERWORD: NovelArt = { src: '/art/novel/afterword.webp', alt: '天庭，月老坐在攤開的姻緣簿前，金童玉女重逢，土地公端著茶在一旁微笑。', position: '50% 40%' }

/**
 * 章節與結局的專屬圖。key 為 `<故事 id>@<章節名>` 或 `<故事 id>#<段落 id>`。
 * 只登記已經有檔案的圖；沒有登記的章節或結局會沿用該世主圖。
 */
const SCENES: Record<string, NovelArt> = {
  'qin-novel@名冊上的另一戶': { src: '/art/novel/qin_ch2.webp', alt: '孟姜女與范喜良一起讀著一張被風吹來的紙，神情沉重，腳邊放著一碗湯。', position: '50% 35%' },
  'qin-novel@北地與家書': { src: '/art/novel/qin_ch3.webp', alt: '孟姜女在家中縫寒衣，遠在長城邊的范喜良倚著大石，一條紅線連起兩地。', position: '50% 35%' },
  'qin-novel@寒衣與歸途': { src: '/art/novel/qin_ch4.webp', alt: '孟姜女抱著寒衣坐在渡船上，紅線拖在水面上往北方延伸。', position: '50% 35%' },
  'qin-novel#EA1': { src: '/art/novel/qin_end_EA1.webp', alt: '白髮的孟姜女與范喜良坐在花樹下，手中牽著同一條紅線。', position: '50% 35%' },
  'qin-novel#EA2': { src: '/art/novel/qin_end_EA2.webp', alt: '孟姜女在桌邊把信念給王大娘聽，桌上擺著三碗飯和一張空凳。', position: '50% 35%' },
  'qin-novel#EB1': { src: '/art/novel/qin_end_EB1.webp', alt: '長城腳下，范喜良整理竹籃，孟姜女在一旁縫補，紅線連著兩人。', position: '50% 35%' },
  'qin-novel#EB2': { src: '/art/novel/qin_end_EB2.webp', alt: '孟姜女在家鄉曬藥時笑著讀信，遠在北方河邊的范喜良正寫著回信，紅線連起兩封信。', position: '50% 30%' },
  'qin-novel#EC1': { src: '/art/novel/qin_end_EC1.webp', alt: '孟姜女跪在崩塌的長城前落淚，斷掉的紅線落在地上。', position: '50% 35%' },
  'qin-novel#EC2': { src: '/art/novel/qin_end_EC2.webp', alt: '黃昏的村口，年邁的父親伸手迎接抱著布包回鄉的孟姜女，遠處山坡上有一座小墳。', position: '50% 25%' },
}

export const novelArt = (storyId: string, chapter?: string, nodeId?: string): NovelArt =>
  (nodeId && SCENES[`${storyId}#${nodeId}`]) || (chapter && SCENES[`${storyId}@${chapter}`]) || ART[storyId] || FALLBACK
export const afterwordArt = (): NovelArt => AFTERWORD
