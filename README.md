# 漂流者：信任臨界

手機直式的心理生存遊戲（Vite + React + TypeScript）。
墜機後你和一個陌生人困在島上 14 天，要撐到搜救船經過，還要搭好訊號火堆。
每一輪，「他」都有不同的真相：囤積、說謊、隱瞞傷勢，或者什麼都沒藏。

## 玩法
- 白天（2 次行動）：選地點，決定跟他一起去或分頭行動
- 傍晚：分配收穫（平分／多拿／讓給他／偷藏），可以攤牌一次
- 夜晚：睡覺、守夜、翻他的東西、跟他聊聊 → 線索記在筆記
- 13 種結局，結局收集存在瀏覽器

## 專案結構
- `src/engine/game.ts`：遊戲規則（純邏輯）
- `src/data/content.json`：所有文字內容（地點、事件、線索、結局）
- `src/game/Game.tsx`：畫面
- `scripts/simulate.ts`：平衡模擬，`npm run sim` 會用四種玩法各跑幾千輪，列出結局分布

## 本機開發

```bash
npm install
npm run dev
```

正式建置：

```bash
npm run build
```

建置成功後，靜態輸出會在 `dist/`。

## 推到 GitHub

1. 在 GitHub 建立新的 repository。
2. 在專案根目錄初始化並提交：

```bash
git init
git add .
git commit -m "Prepare Vercel deployment"
```

3. 連接遠端並推送：

```bash
git remote add origin <你的 GitHub repo URL>
git branch -M main
git push -u origin main
```

## 匯入到 Vercel Hobby

1. 登入 Vercel。
2. 點 `Add New...` -> `Project`。
3. 選擇剛剛推上去的 GitHub repository。
4. Vercel 會自動辨識為 Vite 專案。
5. 建議確認設定如下：
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. 點 `Deploy`。


## iPhone Safari 加到主畫面

1. 部署完成後，用 iPhone Safari 開啟網站。
2. 點下方分享按鈕。
3. 選擇 `加入主畫面`。
4. 確認名稱後按 `加入`。

目前專案已補上：
- `theme-color`
- `apple-touch-icon`
- `site.webmanifest`
- 行動裝置可用的 Web App meta

## 靜態資源路徑

這個專案中的正式圖片與圖示都使用根目錄絕對路徑，例如：
- `/cover.png`
- `/cover_mobile.jpg`
- `/bg_phase1.jpg`
- `/event_resource.jpg`

在 Vercel 根網域部署時，這些路徑可直接從 `public/` 正常提供。

