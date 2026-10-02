const STORAGE_WORKER =
    "tainan_funbox_worker_url";

const STORAGE_KEY =
    "tainan_funbox_admin_key";

let currentData = null;
let baseData = null;
let analyzedItems = [];

const $ = (id) =>
    document.getElementById(id);


/* =====================================================
   初始化
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const workerInput =
            $("workerUrl");

        const keyInput =
            $("adminKey");

        if (workerInput) {
            workerInput.value =
                localStorage.getItem(
                    STORAGE_WORKER
                ) || "";
        }

        if (keyInput) {
            keyInput.value =
                localStorage.getItem(
                    STORAGE_KEY
                ) || "";
        }

        bindEvents();

        setStatus(
            "請先設定 Worker URL 與管理金鑰。",
            "info"
        );
    }
);


/* =====================================================
   綁定按鈕
===================================================== */

function bindEvents() {

    $("loadData")?.addEventListener(
        "click",
        loadCurrentData
    );

    $("analyze")?.addEventListener(
        "click",
        analyzePost
    );

    $("publish")?.addEventListener(
        "click",
        publishData
    );

    $("addManual")?.addEventListener(
        "click",
        addManualItem
    );

    $("shopSelect")?.addEventListener(
        "change",
        renderCurrentShop
    );
}


/* =====================================================
   Worker 設定
===================================================== */

function getWorkerUrl() {

    const input =
        $("workerUrl");

    let url =
        input?.value?.trim() || "";

    url =
        url.replace(
            /\/+$/,
            ""
        );

    if (!url) {
        throw new Error(
            "請輸入 Worker URL"
        );
    }

    localStorage.setItem(
        STORAGE_WORKER,
        url
    );

    return url;
}


function getAdminKey() {

    const input =
        $("adminKey");

    const key =
        input?.value?.trim() || "";

    if (!key) {
        throw new Error(
            "請輸入 ADMIN_KEY"
        );
    }

    localStorage.setItem(
        STORAGE_KEY,
        key
    );

    return key;
}


/* =====================================================
   API
===================================================== */

async function api(
    path,
    options = {}
) {

    const url =
        getWorkerUrl() +
        path;

    const headers = {
        "Content-Type":
            "application/json",

        "X-Admin-Key":
            getAdminKey()
    };

    const response =
        await fetch(
            url,
            {
                ...options,

                headers: {
                    ...headers,
                    ...(options.headers || {})
                }
            }
        );

    /*
     * Response body 只能讀一次
     */
    const rawText =
        await response.text();

    let data = {};

    if (rawText) {

        try {

            data =
                JSON.parse(rawText);

        } catch {

            data = {
                error:
                    rawText
            };

        }
    }

    if (!response.ok) {

        throw new Error(
            data.error ||
            data.message ||
            `HTTP ${response.status}`
        );
    }

    return data;
}


/* =====================================================
   讀取目前資料
===================================================== */

async function loadCurrentData() {

    try {

        setStatus(
            "正在讀取 GitHub 資料...",
            "loading"
        );

        const result =
            await api("/data");

        /*
         * Worker 回傳：
         *
         * {
         *   ok: true,
         *   data: {
         *      updatedAt: "...",
         *      shops: [...]
         *   }
         * }
         */

        const data =
            result.data || result;

        if (
            !data ||
            !Array.isArray(
                data.shops
            )
        ) {

            console.error(
                "Worker 回傳資料：",
                result
            );

            throw new Error(
                "Worker 回傳的 shops.json 格式不正確"
            );
        }

        currentData =
            deepClone(data);

        baseData =
            deepClone(data);

        renderShopSelect();

        renderCurrentShop();

        renderSummary();

        setStatus(
            `讀取成功：${data.shops.length} 家店`,
            "success"
        );

    } catch (error) {

        console.error(error);

        setStatus(
            `讀取失敗：${error.message}`,
            "error"
        );
    }
}


/* =====================================================
   店家下拉選單
===================================================== */

function renderShopSelect() {

    const select =
        $("shopSelect");

    if (!select) {
        return;
    }

    select.innerHTML = "";

    const shops =
        Array.isArray(
            currentData?.shops
        )
            ? currentData.shops
            : [];

    shops.forEach(
        (shop, index) => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                shop.id;

            option.textContent =
                `${shop.name} (${Array.isArray(shop.items) ? shop.items.length : 0})`;

            select.appendChild(
                option
            );

            if (index === 0) {
                option.selected = true;
            }
        }
    );
}


/* =====================================================
   顯示目前店家
===================================================== */

function renderCurrentShop() {

    if (!currentData) {
        return;
    }

    const select =
        $("shopSelect");

    const shopId =
        select?.value;

    const shop =
        currentData.shops.find(
            item =>
                item.id === shopId
        );

    if (!shop) {
        return;
    }

    const name =
        $("currentShopName");

    if (name) {
        name.textContent =
            shop.name;
    }

    const address =
        $("currentShopAddress");

    if (address) {
        address.textContent =
            shop.address || "—";
    }

    const facebook =
        $("currentShopFacebook");

    if (facebook) {

        facebook.href =
            shop.facebook || "#";

        facebook.textContent =
            shop.facebook
                ? "Facebook"
                : "—";
    }

    renderCurrentItems(shop);
}


/* =====================================================
   顯示目前品項
===================================================== */

function renderCurrentItems(
    shop
) {

    const container =
        $("currentItems");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const items =
        Array.isArray(shop.items)
            ? shop.items
            : [];

    if (!items.length) {

        container.innerHTML =
            "<p>目前沒有抽選品項。</p>";

        return;
    }

    items.forEach(
        (item, index) => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "current-item";

            row.innerHTML = `
                <div>
                    <strong>
                        ${escapeHTML(
                            item.name ||
                            "未命名品項"
                        )}
                    </strong>

                    <div class="item-url">
                        ${escapeHTML(
                            item.url || ""
                        )}
                    </div>
                </div>

                <button
                    type="button"
                    data-index="${index}"
                    class="remove-current"
                >
                    刪除
                </button>
            `;

            row
                .querySelector(
                    ".remove-current"
                )
                ?.addEventListener(
                    "click",
                    () => {

                        shop.items.splice(
                            index,
                            1
                        );

                        renderCurrentShop();
                        renderSummary();
                    }
                );

            container.appendChild(
                row
            );
        }
    );
}


/* =====================================================
   分析 Facebook
===================================================== */

async function analyzePost() {

    try {

        const facebookUrl =
            $("facebookUrl")
                ?.value
                ?.trim() || "";

        const text =
            $("postText")
                ?.value
                ?.trim() || "";

        if (
            !facebookUrl &&
            !text
        ) {

            throw new Error(
                "請輸入 Facebook 網址或貼上公告內容"
            );
        }

        setStatus(
            "正在分析公告...",
            "loading"
        );

        const result =
            await api(
                "/analyze",
                {
                    method: "POST",

                    body:
                        JSON.stringify({
                            facebookUrl,
                            text
                        })
                }
            );

        analyzedItems =
            Array.isArray(
                result.items
            )
                ? result.items
                : [];

        renderAnalyzedItems();

        setStatus(
            `分析完成：找到 ${analyzedItems.length} 個 LINE 連結`,
            "success"
        );

    } catch (error) {

        console.error(error);

        setStatus(
            `分析失敗：${error.message}`,
            "error"
        );
    }
}


/* =====================================================
   顯示分析結果
===================================================== */

function renderAnalyzedItems() {

    const container =
        $("analyzedItems");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (!analyzedItems.length) {

        container.innerHTML =
            "<p>沒有找到 LINE 抽選連結。</p>";

        return;
    }

    analyzedItems.forEach(
        (item, index) => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "analyzed-item";

            row.innerHTML = `
                <label>
                    <input
                        type="checkbox"
                        class="analyzed-check"
                        data-index="${index}"
                        checked
                    >
                    保留
                </label>

                <input
                    type="text"
                    class="analyzed-name"
                    data-index="${index}"
                    value="${escapeAttribute(
                        item.name ||
                        "待確認品項"
                    )}"
                >

                <input
                    type="url"
                    class="analyzed-url"
                    data-index="${index}"
                    value="${escapeAttribute(
                        item.url || ""
                    )}"
                >
            `;

            container.appendChild(
                row
            );
        }
    );
}


/* =====================================================
   取得使用者確認後的分析結果
===================================================== */

function getSelectedAnalyzedItems() {

    const container =
        $("analyzedItems");

    if (!container) {
        return [];
    }

    const rows =
        container.querySelectorAll(
            ".analyzed-item"
        );

    const result = [];

    rows.forEach(
        row => {

            const check =
                row.querySelector(
                    ".analyzed-check"
                );

            if (
                !check ||
                !check.checked
            ) {
                return;
            }

            const name =
                row.querySelector(
                    ".analyzed-name"
                )?.value
                ?.trim() || "";

            const url =
                row.querySelector(
                    ".analyzed-url"
                )?.value
                ?.trim() || "";

            if (!url) {
                return;
            }

            result.push({
                name:
                    name ||
                    "待確認品項",

                url
            });
        }
    );

    return result;
}


/* =====================================================
   發布
===================================================== */

async function publishData() {

    try {

        if (!currentData) {

            throw new Error(
                "請先讀取目前資料"
            );
        }

        const select =
            $("shopSelect");

        const shopId =
            select?.value;

        if (!shopId) {

            throw new Error(
                "請選擇店家"
            );
        }

        const selectedItems =
            getSelectedAnalyzedItems();

        if (!selectedItems.length) {

            throw new Error(
                "請先分析並選擇至少一個品項"
            );
        }

        const mode =
            document.querySelector(
                'input[name="publishMode"]:checked'
            )?.value ||
            "merge";

        const draft =
            deepClone(baseData);

        const shop =
            draft.shops.find(
                item =>
                    item.id === shopId
            );

        if (!shop) {

            throw new Error(
                "找不到指定店家"
            );
        }

        if (!Array.isArray(shop.items)) {
            shop.items = [];
        }

        if (mode === "replace") {

            shop.items =
                selectedItems;

        } else {

            const existingUrls =
                new Set(
                    shop.items.map(
                        item =>
                            item.url
                    )
                );

            selectedItems.forEach(
                item => {

                    if (
                        !existingUrls.has(
                            item.url
                        )
                    ) {

                        shop.items.push(
                            item
                        );

                    }
                }
            );
        }

        setStatus(
            "正在發布到 GitHub...",
            "loading"
        );

        const result =
            await api(
                "/publish",
                {
                    method: "POST",

                    body:
                        JSON.stringify({
                            data: draft
                        })
                }
            );

        currentData =
            deepClone(draft);

        baseData =
            deepClone(draft);

        renderShopSelect();

        renderCurrentShop();

        renderSummary();

        setStatus(
            result.message ||
            "發布成功",
            "success"
        );

    } catch (error) {

        console.error(error);

        setStatus(
            `發布失敗：${error.message}`,
            "error"
        );
    }
}


/* =====================================================
   手動新增品項
===================================================== */

function addManualItem() {

    if (!currentData) {

        setStatus(
            "請先讀取目前資料",
            "error"
        );

        return;
    }

    const nameInput =
        $("manualName");

    const urlInput =
        $("manualUrl");

    const name =
        nameInput
            ?.value
            ?.trim() || "";

    const url =
        urlInput
            ?.value
            ?.trim() || "";

    if (!name || !url) {

        setStatus(
            "請輸入品項名稱與 LINE URL",
            "error"
        );

        return;
    }

    const shopId =
        $("shopSelect")
            ?.value;

    const shop =
        currentData.shops.find(
            item =>
                item.id === shopId
        );

    if (!shop) {
        return;
    }

    if (!Array.isArray(shop.items)) {
        shop.items = [];
    }

    const exists =
        shop.items.some(
            item =>
                item.url === url
        );

    if (exists) {

        setStatus(
            "這個 LINE 連結已存在",
            "error"
        );

        return;
    }

    shop.items.push({
        name,
        url
    });

    nameInput.value = "";
    urlInput.value = "";

    renderCurrentShop();
    renderSummary();

    setStatus(
        "已加入目前資料，發布後才會寫入 GitHub。",
        "success"
    );
}


/* =====================================================
   Summary
===================================================== */

function renderSummary() {

    const el =
        $("summary");

    if (!el || !currentData) {
        return;
    }

    const shops =
        Array.isArray(
            currentData.shops
        )
            ? currentData.shops
            : [];

    const totalItems =
        shops.reduce(
            (sum, shop) => {

                const items =
                    Array.isArray(
                        shop.items
                    )
                        ? shop.items
                        : [];

                return sum +
                    items.length;

            },
            0
        );

    el.textContent =
        `目前資料：${shops.length} 家店，共 ${totalItems} 個品項`;
}


/* =====================================================
   Status
===================================================== */

function setStatus(
    message,
    type = "info"
) {

    const el =
        $("status");

    if (!el) {
        return;
    }

    el.textContent =
        message;

    el.className =
        `status ${type}`;
}


/* =====================================================
   Deep Clone
===================================================== */

function deepClone(data) {

    return JSON.parse(
        JSON.stringify(data)
    );
}


/* =====================================================
   Escape HTML
===================================================== */

function escapeHTML(value) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


function escapeAttribute(value) {

    return escapeHTML(value);
}
