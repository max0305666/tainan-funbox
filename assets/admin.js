const API = {
    get workerUrl() {
        return document.getElementById("workerUrl").value.trim().replace(/\/+$/, "");
    },

    get adminKey() {
        return document.getElementById("adminKey").value.trim();
    }
};

let currentData = null;
let baseData = null;
let analyzedItems = [];
let selectedShopId = null;


// =====================================================
// 共用
// =====================================================

function setStatus(message, type = "normal") {
    const el = document.getElementById("statusText");

    if (!el) return;

    el.textContent = message;

    const box = el.closest(".status");

    if (!box) return;

    if (type === "error") {
        box.style.background = "#fef2f2";
        box.style.color = "#b42318";
    } else if (type === "success") {
        box.style.background = "#f0fdf4";
        box.style.color = "#166534";
    } else {
        box.style.background = "#f5f7fa";
        box.style.color = "#596477";
    }
}


function setAnalyzeStatus(message, type = "normal") {
    const el = document.getElementById("analyzeStatus");

    if (!el) return;

    el.textContent = message;

    const box = el.closest(".status");

    if (!box) return;

    if (type === "error") {
        box.style.background = "#fef2f2";
        box.style.color = "#b42318";
    } else if (type === "success") {
        box.style.background = "#f0fdf4";
        box.style.color = "#166534";
    } else {
        box.style.background = "#f5f7fa";
        box.style.color = "#596477";
    }
}


function setPublishStatus(message, type = "normal") {
    const el = document.getElementById("publishStatus");

    if (!el) return;

    const span = el.querySelector("span:last-child");

    if (span) {
        span.textContent = message;
    }

    if (type === "error") {
        el.style.background = "#fef2f2";
        el.style.color = "#b42318";
    } else if (type === "success") {
        el.style.background = "#f0fdf4";
        el.style.color = "#166534";
    } else {
        el.style.background = "#f5f7fa";
        el.style.color = "#596477";
    }
}


function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function cloneData(data) {
    return JSON.parse(JSON.stringify(data));
}


function getCurrentShop() {
    if (!currentData || !Array.isArray(currentData.shops)) {
        return null;
    }

    const shopId = document.getElementById("shopSelect").value;

    return currentData.shops.find(shop => shop.id === shopId) || null;
}


function getSelectedShopId() {
    return document.getElementById("shopSelect").value;
}


// =====================================================
// Worker API
// =====================================================

async function api(path, options = {}) {

    const workerUrl = API.workerUrl;

    if (!workerUrl) {
        throw new Error("請先輸入 Worker 網址");
    }

    const headers = {
        "Content-Type": "application/json"
    };

    if (API.adminKey) {
        headers["X-Admin-Key"] = API.adminKey;
    }

    const response = await fetch(
        workerUrl + path,
        {
            ...options,
            headers: {
                ...headers,
                ...(options.headers || {})
            }
        }
    );

    // 只讀一次 response body
    const rawText = await response.text();

    let data;

    try {
        data = rawText ? JSON.parse(rawText) : {};
    } catch {
        throw new Error(
            `Worker 回傳非 JSON：\n${rawText.slice(0, 500)}`
        );
    }

    if (!response.ok) {

        const message =
            data?.error ||
            data?.message ||
            `HTTP ${response.status}`;

        throw new Error(message);
    }

    return data;
}


// =====================================================
// 讀取目前資料
// =====================================================

async function loadCurrentData() {

    setStatus("正在讀取 shops.json...", "normal");

    const button = document.getElementById("loadDataBtn");

    if (button) {
        button.disabled = true;
        button.textContent = "⏳ 讀取中...";
    }

    try {

        const result = await api("/data");

        /*
         * Worker 現在回傳：
         *
         * {
         *   ok: true,
         *   data: {
         *      updatedAt: "...",
         *      shops: [...]
         *   }
         * }
         *
         * 同時也支援直接回傳 data。
         */

        const data = result.data || result;

        if (!data || !Array.isArray(data.shops)) {
            console.error("Worker 回傳內容：", result);

            throw new Error(
                "Worker 回傳資料格式錯誤，找不到 shops 陣列"
            );
        }

        currentData = cloneData(data);
        baseData = cloneData(data);

        updateShopSelect();

        renderCurrentSummary();

        setStatus(
            `讀取成功：${data.shops.length} 家店，共 ${getTotalItems(data)} 個品項`,
            "success"
        );

    } catch (error) {

        console.error("讀取資料失敗：", error);

        setStatus(
            "讀取失敗：\n" + error.message,
            "error"
        );

    } finally {

        if (button) {
            button.disabled = false;
            button.textContent = "🔄 讀取目前資料";
        }
    }
}


// =====================================================
// 店家下拉選單
// =====================================================

function updateShopSelect() {

    const select = document.getElementById("shopSelect");

    if (!select || !currentData) return;

    const oldValue = select.value;

    select.innerHTML = "";

    currentData.shops.forEach(shop => {

        const option = document.createElement("option");

        option.value = shop.id;
        option.textContent = shop.name;

        select.appendChild(option);
    });

    const exists = currentData.shops.some(
        shop => shop.id === oldValue
    );

    if (exists) {
        select.value = oldValue;
    }

    renderCurrentSummary();
}


// =====================================================
// 資料統計
// =====================================================

function getTotalItems(data) {

    if (!data || !Array.isArray(data.shops)) {
        return 0;
    }

    return data.shops.reduce(
        (total, shop) =>
            total + (Array.isArray(shop.items) ? shop.items.length : 0),
        0
    );
}


function renderCurrentSummary() {

    if (!currentData) return;

    const shop = getCurrentShop();

    if (!shop) return;

    const preview = document.getElementById("publishPreview");

    if (!preview) return;

    const total = getTotalItems(currentData);

    preview.textContent =
        `目前資料：${currentData.shops.length} 家店\n` +
        `目前總品項：${total} 個\n\n` +
        `目前選擇店家：${shop.name}\n` +
        `本店品項：${Array.isArray(shop.items) ? shop.items.length : 0} 個\n\n` +
        `最後更新：${currentData.updatedAt || "未知"}`;

    updatePublishButton();
}


// =====================================================
// Facebook 公告分析
// =====================================================

async function analyzeFacebook() {

    setAnalyzeStatus("正在分析公告...", "normal");

    const button = document.getElementById("analyzeBtn");

    if (button) {
        button.disabled = true;
        button.textContent = "⏳ 分析中...";
    }

    try {

        const facebookUrl =
            document.getElementById("facebookUrl").value.trim();

        const text =
            document.getElementById("facebookText").value.trim();

        if (!facebookUrl && !text) {
            throw new Error(
                "請貼上 Facebook 公告網址，或直接貼上公告文字"
            );
        }

        const result = await api(
            "/analyze",
            {
                method: "POST",

                body: JSON.stringify({
                    facebookUrl,
                    text
                })
            }
        );

        analyzedItems =
            Array.isArray(result.items)
                ? result.items
                : Array.isArray(result.data?.items)
                    ? result.data.items
                    : [];

        if (analyzedItems.length === 0) {

            renderAnalyzeResult([]);

            setAnalyzeStatus(
                "沒有找到 LINE 抽選連結，請確認公告內容。",
                "error"
            );

            return;
        }

        renderAnalyzeResult(analyzedItems);

        setAnalyzeStatus(
            `分析完成：找到 ${analyzedItems.length} 個 LINE 抽選項目`,
            "success"
        );

    } catch (error) {

        console.error("分析失敗：", error);

        setAnalyzeStatus(
            "分析失敗：\n" + error.message,
            "error"
        );

    } finally {

        if (button) {
            button.disabled = false;
            button.textContent = "🔍 分析公告";
        }
    }
}


// =====================================================
// 顯示分析結果
// =====================================================

function renderAnalyzeResult(items) {

    const section =
        document.getElementById("resultSection");

    const list =
        document.getElementById("resultList");

    const shopName =
        document.getElementById("resultShopName");

    const count =
        document.getElementById("resultCount");

    if (!section || !list) return;

    section.classList.remove("hidden");

    const shop = getCurrentShop();

    shopName.textContent =
        shop ? shop.name : "目前店家";

    count.textContent =
        `找到 ${items.length} 個項目`;

    if (!items.length) {

        list.innerHTML =
            `<div class="empty">目前沒有分析結果。</div>`;

        updatePublishButton();

        return;
    }

    list.innerHTML = items.map((item, index) => {

        return `
            <div class="result-item">

                <input
                    type="checkbox"
                    class="analyzed-check"
                    data-index="${index}"
                    checked
                >

                <div>

                    <input
                        type="text"
                        class="analyzed-name"
                        data-index="${index}"
                        value="${escapeHtml(item.name || "")}"
                        placeholder="品項名稱"
                    >

                    <input
                        type="url"
                        class="analyzed-url"
                        data-index="${index}"
                        value="${escapeHtml(item.url || "")}"
                        placeholder="LINE 抽選網址"
                        style="margin-top:6px"
                    >

                </div>

                <button
                    class="result-remove"
                    type="button"
                    data-remove-index="${index}"
                >
                    移除
                </button>

            </div>
        `;
    }).join("");

    // 移除按鈕
    list.querySelectorAll("[data-remove-index]")
        .forEach(button => {

            button.addEventListener("click", () => {

                const index =
                    Number(button.dataset.removeIndex);

                analyzedItems.splice(index, 1);

                renderAnalyzeResult(analyzedItems);
            });
        });

    updatePublishButton();
}


// =====================================================
// 取得目前勾選的分析結果
// =====================================================

function getSelectedAnalyzedItems() {

    const list =
        document.getElementById("resultList");

    if (!list) return [];

    const result = [];

    const rows =
        list.querySelectorAll(".result-item");

    rows.forEach(row => {

        const checkbox =
            row.querySelector(".analyzed-check");

        if (!checkbox || !checkbox.checked) {
            return;
        }

        const name =
            row.querySelector(".analyzed-name")?.value.trim();

        const url =
            row.querySelector(".analyzed-url")?.value.trim();

        if (!name || !url) {
            return;
        }

        result.push({
            name,
            url
        });
    });

    return result;
}


// =====================================================
// 加入現有品項
// =====================================================

function mergeItems() {

    if (!currentData) {

        setStatus(
            "請先按「讀取目前資料」",
            "error"
        );

        return;
    }

    const items = getSelectedAnalyzedItems();

    if (!items.length) {

        setAnalyzeStatus(
            "請至少勾選一個有效的品項",
            "error"
        );

        return;
    }

    const shop = getCurrentShop();

    if (!shop) {

        setAnalyzeStatus(
            "找不到目前店家",
            "error"
        );

        return;
    }

    if (!Array.isArray(shop.items)) {
        shop.items = [];
    }

    let added = 0;
    let skipped = 0;

    items.forEach(item => {

        const exists =
            shop.items.some(existing =>
                existing.url === item.url
            );

        if (exists) {
            skipped++;
            return;
        }

        shop.items.push({
            name: item.name,
            url: item.url
        });

        added++;
    });

    renderCurrentSummary();

    setAnalyzeStatus(
        `已加入 ${added} 個品項` +
        (skipped ? `，${skipped} 個重複項目已跳過` : ""),
        "success"
    );

    updatePublishButton();
}


// =====================================================
// 取代本店品項
// =====================================================

function replaceItems() {

    if (!currentData) {

        setStatus(
            "請先按「讀取目前資料」",
            "error"
        );

        return;
    }

    const items = getSelectedAnalyzedItems();

    if (!items.length) {

        setAnalyzeStatus(
            "請至少勾選一個有效的品項",
            "error"
        );

        return;
    }

    const shop = getCurrentShop();

    if (!shop) {

        setAnalyzeStatus(
            "找不到目前店家",
            "error"
        );

        return;
    }

    const confirmed =
        confirm(
            `確定要取代「${shop.name}」目前的全部品項嗎？\n\n` +
            `目前：${shop.items?.length || 0} 個\n` +
            `取代後：${items.length} 個`
        );

    if (!confirmed) {
        return;
    }

    shop.items = items.map(item => ({
        name: item.name,
        url: item.url
    }));

    renderCurrentSummary();

    setAnalyzeStatus(
        `已取代本店品項，共 ${items.length} 個`,
        "success"
    );

    updatePublishButton();
}


// =====================================================
// 手動新增
// =====================================================

function addManualItem() {

    if (!currentData) {

        setStatus(
            "請先按「讀取目前資料」",
            "error"
        );

        return;
    }

    const name =
        prompt("請輸入品項名稱：");

    if (!name) {
        return;
    }

    const url =
        prompt("請輸入 LINE 抽選網址：");

    if (!url) {
        return;
    }

    if (
        !url.startsWith("https://lin.ee/") &&
        !url.startsWith("https://line.me/")
    ) {
        alert(
            "這看起來不是 LINE 抽選網址。\n\n" +
            "請確認是否為 lin.ee 或 line.me 網址。"
        );
    }

    const shop = getCurrentShop();

    if (!shop) {
        return;
    }

    if (!Array.isArray(shop.items)) {
        shop.items = [];
    }

    const exists =
        shop.items.some(item => item.url === url);

    if (exists) {

        alert("這個 LINE 連結已經存在。");

        return;
    }

    shop.items.push({
        name: name.trim(),
        url: url.trim()
    });

    renderCurrentSummary();

    setAnalyzeStatus(
        `已手動新增：${name.trim()}`,
        "success"
    );
}


// =====================================================
// 發布
// =====================================================

async function publishData() {

    if (!currentData) {

        setPublishStatus(
            "請先讀取目前資料",
            "error"
        );

        return;
    }

    const confirmed =
        confirm(
            "確定要發布目前資料到 GitHub 嗎？\n\n" +
            "發布後 data/shops.json 會被更新。"
        );

    if (!confirmed) {
        return;
    }

    const button =
        document.getElementById("publishBtn");

    if (button) {
        button.disabled = true;
        button.textContent = "⏳ 發布中...";
    }

    setPublishStatus(
        "正在發布到 GitHub...",
        "normal"
    );

    try {

        const result =
            await api(
                "/publish",
                {
                    method: "POST",

                    body: JSON.stringify({
                        data: currentData
                    })
                }
            );

        const publishedData =
            result.data || result;

        if (
            publishedData &&
            Array.isArray(publishedData.shops)
        ) {
            currentData =
                cloneData(publishedData);

            baseData =
                cloneData(publishedData);
        }

        renderCurrentSummary();

        setPublishStatus(
            "發布成功！GitHub shops.json 已更新。",
            "success"
        );

    } catch (error) {

        console.error("發布失敗：", error);

        setPublishStatus(
            "發布失敗：\n" + error.message,
            "error"
        );

    } finally {

        if (button) {
            button.disabled = false;
            button.textContent = "🚀 發布到 GitHub";
        }
    }
}


// =====================================================
// 發布按鈕狀態
// =====================================================

function updatePublishButton() {

    const button =
        document.getElementById("publishBtn");

    if (!button) return;

    button.disabled =
        !currentData ||
        !Array.isArray(currentData.shops);
}


// =====================================================
// 店家切換
// =====================================================

function handleShopChange() {

    selectedShopId =
        getSelectedShopId();

    renderCurrentSummary();

    const section =
        document.getElementById("resultSection");

    if (section) {
        section.classList.add("hidden");
    }

    analyzedItems = [];

    setAnalyzeStatus(
        "等待分析",
        "normal"
    );
}


// =====================================================
// 初始化
// =====================================================

function init() {

    console.log("Funbox admin.js 啟動");

    const loadButton =
        document.getElementById("loadDataBtn");

    const analyzeButton =
        document.getElementById("analyzeBtn");

    const mergeButton =
        document.getElementById("mergeBtn");

    const replaceButton =
        document.getElementById("replaceBtn");

    const manualButton =
        document.getElementById("addManualBtn");

    const publishButton =
        document.getElementById("publishBtn");

    const shopSelect =
        document.getElementById("shopSelect");


    // 讀取目前資料
    if (loadButton) {

        loadButton.addEventListener(
            "click",
            loadCurrentData
        );

    } else {

        console.error(
            "找不到 loadDataBtn"
        );
    }


    // 分析 Facebook
    if (analyzeButton) {

        analyzeButton.addEventListener(
            "click",
            analyzeFacebook
        );

    }


    // 加入現有
    if (mergeButton) {

        mergeButton.addEventListener(
            "click",
            mergeItems
        );

    }


    // 取代
    if (replaceButton) {

        replaceButton.addEventListener(
            "click",
            replaceItems
        );

    }


    // 手動新增
    if (manualButton) {

        manualButton.addEventListener(
            "click",
            addManualItem
        );

    }


    // 發布
    if (publishButton) {

        publishButton.addEventListener(
            "click",
            publishData
        );

    }


    // 店家切換
    if (shopSelect) {

        shopSelect.addEventListener(
            "change",
            handleShopChange
        );

    }


    setStatus(
        "管理頁面已載入，請輸入 Worker 網址與管理密鑰。",
        "normal"
    );
}


// 確保 HTML 完成後再綁事件
if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        init
    );

} else {

    init();

}
