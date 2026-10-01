# 台南 Funbox 自動抽選 V2

## 目標
手機優先的台南 Funbox 抽選工具：

Facebook/Meta 合法資料來源
→ 正規化抽選資料
→ GitHub Pages 前端
→ LINE 抽選 queue
→ （後續）Android 自動化完成抽選

## GitHub Pages
本專案前端可直接部署 GitHub Pages。
`index.html` 會讀取 `data/shops.json`。

## Facebook 自動更新
`.github/workflows/update-feed.yml` 每 30 分鐘執行一次。
但 Facebook 粉專資料不能靠猜測的 HTML 爬蟲或把 token 放前端。

正式啟用前：
1. 建立 Meta/Facebook 官方允許使用的 API 憑證與權限。
2. 在 GitHub Repository → Settings → Secrets and variables → Actions
   建立 `META_ACCESS_TOKEN`。
3. 在 `scripts/update_feed.py` 接入實際授權的 Graph API。
4. 將 API 回傳的貼文解析成 `data/shops.json`。

解析規則可針對：
- 商品名稱
- `https://lin.ee/...`
- 發文時間
- 店家
建立標準資料。

## LINE 自動抽選
一般 GitHub Pages JavaScript 可以開啟 LINE/LIFF URL，
但不能可靠地操作 LINE App 內部 UI。
完整自動化需要 Android 自動化層或原生 App。

參見 `scripts/LINE_AUTOMATION_ADAPTER.md`。

## 安全
不要把 Meta access token、cookie、登入資訊或其他秘密放入前端或 GitHub 公開檔案。
