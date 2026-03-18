# 你能相信他嗎

這是一個用 Vite + React + TypeScript 製作的手機優先生存敘事原型。
主題是兩個陌生人在荒島上撐過 30 天，重點放在信任、懷疑、資源分配與長期後果。

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

## SPA 重新整理設定

專案根目錄已包含 `vercel.json`。
這份設定會把沒有副檔名的路徑 rewrite 到 `index.html`，避免 SPA 在 Vercel 上重新整理時出現 404。

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
