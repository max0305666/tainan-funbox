# LINE 抽選自動化 Adapter 規格

前端負責：
1. 產生 queue：店家 / 商品 / lin.ee
2. 開啟下一個 LINE URL
3. 顯示目前進度
4. 接收「完成 / 停止 / 失敗 / timeout」事件

手機端自動化負責：
1. 接收到指定 URL
2. 開啟 LINE
3. 找到抽選頁
4. 執行抽選
5. 偵測結果頁或完成狀態
6. 回傳 done / failed
7. 交給前端進入下一項

不要在 GitHub Pages 前端嘗試控制 LINE App 內部 UI。
