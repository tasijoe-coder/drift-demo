# 紅線千年

Vite + React + TypeScript 的手機直式敘事遊戲。目前公開入口只提供 **第〇世・杯中月**，全段沒有劇情選擇。

你是月老，見證金童玉女從七夕宴、殿前受罰到牽線下凡的緣起。三場共 117 個逐句閱讀單位，上方以五張臺灣皮影風格的原創靜態插圖輔助情境，不使用關節動畫、操偶桿或唱戲。

## 本次公開版本

- 首頁只保留第〇世的閱讀、接續與重讀入口，其他世、卡牌與結局卷入口暫時隱藏。
- 每句文字指定一張靜態圖；畫面依句子進度在宴前、碎盞、殿前、渡口、空橋命簿之間切換，不逐句模擬人物動作。
- 可手動下一句、上一句，或自動閱讀；切到其他分頁時暫停自動計時。
- 三場讀完停在「第〇世・完」，不自動進入第一世；結束後仍可回看全部文字。
- 進度自動保存於 `hx.theatre.lifetime-zero.v2`。舊的卡牌、第一折與輪迴紀錄保留，不覆寫或遷移。
- 圖片是新生成的當代皮影風格插圖，不是館藏複製品或經藝師驗證的歷史復原。圖像原始生成提示及來源檔名見 `public/art/zero-spec.json`。

## 文字調整原則

- 先以醒酒湯、讓過裙角、記住小傷等日常建立人物關係，再進入離別。
- 玉女主動承認自己的心意，金童的保護既是優點，也可能替她作了決定。
- 明示仙籍戒律、月老求情及判詞，使殿前衝突有因果；不把破杯直接等同七世重罰。
- 用「先問名字」、空著的雙手與停住的筆留下記憶，收束於月老的關切，不在序章加入選擇。

故事依民間七世輪迴母題作原創改編，並非特定電視劇逐場重現，亦不作史實敘述。

## 檔案

| 檔案 | 用途 |
|---|---|
| `src/App.tsx` | 目前只載入第〇世入口 |
| `src/hx/PrologueApp.tsx`、`prologue.css` | 首頁、逐句閱讀、靜態圖與結束頁 |
| `src/data/lives/lifetime-zero.json` | 第〇世三場文字、說話者、圖片 cue |
| `src/hx/zero_story.ts` | 第〇世存檔鍵、圖像表、前後句與閱讀進度 |
| `src/hx/theatre_story.ts` | 共用的純閱讀進度與存檔還原邏輯 |
| `public/art/zero/*.webp` | 五張 1200×800 靜態插圖，合計約 985 KB |
| `public/art/zero-spec.json` | image_gen 完整提示、參考造型與編碼設定 |

舊版第一折、卡牌引擎與各世 JSON 仍保留在原檔案。`src/hx/App.tsx`、`Theatre.tsx` 和 `CelestialPuppets.tsx` 不再由公開入口載入，後續需明確決定才重新開放。

## 驗證

```bash
npm ci
npm run lint
npm run build
npm run test:zero
npm run test:theatre
npm run sim
```

`test:zero` 檢查完整逐句推進、三場無分歧、每句對應圖片、跨場回讀、結束防溢出、完成存檔還原，以及 WebP 資產大小。`test:theatre` 保留原有八條分歧與舊存檔相容性檢查。`sim` 驗證原卡牌資料的結局可達性。

## 開發

```bash
npm run dev
```

舊版《漂流者：信任臨界》保留在 `drifter-v2` 分支。

## 改編與造型參考

- [國家文化記憶庫：《七世夫妻》](https://tcmb.culture.tw/zh-tw/detail?id=563187&indexCode=Culture_Object)：金童玉女七次輪迴的民間故事框架。
- [高雄市皮影戲館：影偶角色](https://kmsp.khm.org.tw/home02.aspx?ID=$4011&IDK=2&EXEC=D&DATA=11)、[影偶製作](https://kmsp.khm.org.tw/home02.aspx?ID=$4011&IDK=2&EXEC=D&DATA=22)：臺灣影偶的角色、材質、色彩與接合概念；本版轉為靜態視覺輔助。
- 舊第一世資料參考仍為[臺灣音樂館典藏《孟姜女》](https://openmuseum.tw/muse/digi_object/db82a7ba4cbaa6315c3da3720110cb62)與[孟姜女故事傳說](https://whly.hebei.gov.cn/c/2012-12-21/558051.html)，本次沒有修改其劇情或數值。
