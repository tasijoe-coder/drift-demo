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
  'jin-novel@家門內的聲音': { src: '/art/novel/jin_ch2.webp', alt: '祝英台換回女裝，把自己寫的文章遞給坐著的父親，姑母在一旁倒茶。', position: '50% 32%' },
  'jin-novel@離家與自立': { src: '/art/novel/jin_ch3.webp', alt: '離家後租下的小屋裡，祝英台在桌邊寫字，病後的梁山伯坐在床邊，紅線連著兩人。', position: '50% 32%' },
  'jin-novel@等待與往後': { src: '/art/novel/jin_ch4.webp', alt: '夜裡祝英台在燈下寫信，病中的梁山伯躺在床上，梁母替他擦汗，紅線從她的小指連到他的小指。', position: '50% 30%' },
  'jin-novel#E1': { src: '/art/novel/jin_end_E1.webp', alt: '新家裡，祝英台與梁山伯拿著紙相視微笑，窗邊的梁母在學寫字。', position: '50% 30%' },
  'jin-novel#E2': { src: '/art/novel/jin_end_E2.webp', alt: '雨夜的小屋，地上放著接水的盆，祝英台與梁山伯在油燈下一起批同一份稿子。', position: '50% 32%' },
  'jin-novel#E3': { src: '/art/novel/jin_end_E3.webp', alt: '小小的家宴上，祝父替女兒倒茶，祝英台扶穩茶壺，梁山伯坐在一旁。', position: '50% 25%' },
  'jin-novel#E4': { src: '/art/novel/jin_end_E4.webp', alt: '祝英台與梁山伯各自在不同的地方教孩子讀書，一條紅線連起兩間學堂。', position: '50% 25%' },
  'jin-novel#E5': { src: '/art/novel/jin_end_E5.webp', alt: '清晨，祝英台獨自在窗邊寫字，身旁留著一個空坐墊，窗外兩隻蝴蝶飛過。', position: '50% 25%' },
  'qin-novel#EC2': { src: '/art/novel/qin_end_EC2.webp', alt: '黃昏的村口，年邁的父親伸手迎接抱著布包回鄉的孟姜女，遠處山坡上有一座小墳。', position: '50% 25%' },
}

export const novelArt = (storyId: string, chapter?: string, nodeId?: string): NovelArt =>
  (nodeId && SCENES[`${storyId}#${nodeId}`]) || (chapter && SCENES[`${storyId}@${chapter}`]) || ART[storyId] || FALLBACK
export const afterwordArt = (): NovelArt => AFTERWORD
