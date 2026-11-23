import type { Life } from '../../engine/fate'
import qin from './qin.json'
import qinNovel from './qin-novel.json'
import jinNovel from './jin-novel.json'
import tangNovel from './tang-novel.json'
import songNovel from './song-novel.json'
import ming1Novel from './ming1-novel.json'
import ming2Novel from './ming2-novel.json'
import seventhNovel from './seventh-novel.json'
import type { Novel } from '../../engine/novel'

export const NOVELS: Novel[] = [qinNovel as Novel, jinNovel as Novel, tangNovel as Novel, songNovel as Novel, ming1Novel as Novel, ming2Novel as Novel, seventhNovel as Novel]

export const LIVES: Life[] = [qin as unknown as Life]

/** 選單上顯示的所有世（含尚未製作／需購買的） */
export const LIFE_MENU = [
  { id: 'qin', order: 1, era: '秦', lovers: '孟姜女・范喜良', tagline: '新婚之夜，他被抓去修長城。', free: true },
  { id: 'jin', order: 2, era: '東晉', lovers: '祝英台・梁山伯', tagline: '他晚到了三天，她已許配他人。', free: false },
  { id: 'tang', order: 3, era: '唐', lovers: '王月英・郭華', tagline: '土地廟之約，一個沒等到，一個來遲了。', free: false },
  { id: 'song', order: 4, era: '宋', lovers: '錢玉蓮・王十朋', tagline: '一支荊釵，兩個版本的命運。', free: false },
  { id: 'ming1', order: 5, era: '明', lovers: '秦雪梅・商琳', tagline: '一件喜服，能替誰答應一生？', free: false },
  { id: 'ming2', order: 6, era: '明', lovers: '賈玉珍・韋燕春', tagline: '井邊借水，藍橋夜約；一場雨，改變了守信的意思。', free: false },
  { id: 'seventh', order: 7, era: '明末', lovers: '劉瑞蓮・李奎元', tagline: '彩球落下以後，讓兩個人親口說願意。', free: false },
  { id: 'modern', order: 8, era: '現代', lovers: '？？？', tagline: '八點檔篇：失憶、豪門、雙胞胎。這一世，他們連性別都換了。', free: false },
]

export const lifeById = (id: string) => LIVES.find((l) => l.id === id)
