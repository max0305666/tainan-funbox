let currentData = null;

let pendingItems = [];

let pendingMode = null;


/* =========================================================
   DOM
========================================================= */

const workerUrlInput =
    document.getElementById("workerUrl");

const adminKeyInput =
    document.getElementById("adminKey");

const shopSelect =
    document.getElementById("shopSelect");

const facebookUrlInput =
    document.getElementById("facebookUrl");

const facebookTextInput =
    document.getElementById("facebookText");

const analyzeBtn =
    document.getElementById("analyzeBtn");

const resultSection =
    document.getElementById("resultSection");

const resultList =
    document.getElementById("resultList");

const resultShopName =
    document.getElementById("resultShopName");

const resultCount =
    document.getElementById("resultCount");

const publishBtn =
    document.getElementById("publishBtn");

const publishPreview =
    document.getElementById("publishPreview");

const statusText =
    document.getElementById("statusText");

const analyzeStatus =
    document.getElementById("analyzeStatus");

const publishStatus =
    document.getElementById("publishStatus");


/* =========================================================
   設定記憶
========================================================= */

workerUrlInput.value =
    localStorage.getItem(
        "funbox_worker_url"
    ) || "";

adminKeyInput.value =
    localStorage.getItem(
        "funbox_admin_key"
    ) || "";


workerUrlInput.addEventListener(
    "change",
    saveSettings
);

adminKeyInput.addEventListener(
    "change",
    saveSettings
);


function saveSettings() {

    localStorage.setItem(
        "funbox_worker_url",
        workerUrlInput.value.trim()
    );

    localStorage.setItem(
        "funbox_admin_key",
        adminKeyInput.value
    );

}


/* =========================================================
   工具
========================================================= */

function getWorkerUrl() {

    const value =
        workerUrlInput.value.trim()
            .replace(/\/+$/, "");

    if (!value) {

        throw new Error(
            "請先輸入 Worker 網址"
        );

    }

    return value;

}


function getAdminKey() {

    const value =
        adminKeyInput.value.trim();

    if (!value) {

        throw new Error(
            "請先輸入管理密鑰"
        );

    }

    return value;

}


function escapeHTML(value) {

    return String(
        value ?? ""
    ).replace(
        /[&<>"']/g,
        character => {

            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[character];

        }
    );

}


/* =========================================================
   API
========================================================= */

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


    let data = null;

    try {

        data =
            await response.json();

    } catch {

        data = {
            error:
                await response.text()
        };

    }


    if (!response.ok) {

        throw new Error(
            data.error ||
            `HTTP ${response.status}`
        );

    }


    return data;

}


/* =========================================================
   讀取目前資料
========================================================= */

document
    .getElementById("loadDataBtn")
    .addEventListener(
        "click",
        loadCurrentData
    );


async function loadCurrentData() {

    try {

        setStatus(
            statusText,
            "正在讀取 GitHub 資料…"
        );


        const data =
            await api(
                "/data"
            );


        currentData =
            data;


        setStatus(
            statusText,
            `目前資料：${data.shops.length} 家店，共 ${getTotalItems(data)} 個品項`
        );


        updatePreview();

    } catch (error) {

        setStatus(
            statusText,
            "讀取失敗：" +
            error.message
        );

    }

}


/* =========================================================
   分析 Facebook
========================================================= */

analyzeBtn.addEventListener(
    "click",
    analyze
);


async function analyze() {

    try {

        saveSettings();


        analyzeBtn.disabled =
            true;


        setStatus(
            analyzeStatus,
            "正在分析 Facebook 公告…"
        );


        const shopId =
            shopSelect.value;


        const facebookUrl =
            facebookUrlInput.value.trim();


        const facebookText =
            facebookTextInput.value.trim();


        if (
            !facebookUrl &&
            !facebookText
        ) {

            throw new Error(
                "請輸入 Facebook 公告網址或貼文文字"
            );

        }


        const data =
            await api(
                "/analyze",
                {
                    method: "POST",

                    body:
                        JSON.stringify({

                            shopId,

                            facebookUrl,

                            facebookText

                        })
                }
            );


        pendingItems =
            Array.isArray(data.items)
                ? data.items
                : [];


        renderResults();


        resultSection.classList.remove(
            "hidden"
        );


        setStatus(
            analyzeStatus,
            `分析完成，找到 ${pendingItems.length} 個可能的抽選項目`
        );


    } catch (error) {

        setStatus(
            analyzeStatus,
            "分析失敗：" +
            error.message
        );

        alert(
            "分析失敗：\n\n" +
            error.message
        );

    } finally {

        analyzeBtn.disabled =
            false;

    }

}


/* =========================================================
   顯示結果
========================================================= */

function renderResults() {

    const shop =
        currentData &&
        currentData.shops
            ? currentData.shops.find(
                item =>
                    item.id === shopSelect.value
            )
            : null;


    resultShopName.textContent =
        shop
            ? shop.name
            : shopSelect.options[
                shopSelect.selectedIndex
            ].text;


    resultCount.textContent =
        `找到 ${pendingItems.length} 個項目`;


    if (!pendingItems.length) {

        resultList.innerHTML = `
            <div class="empty">
                沒有找到 LINE 抽選連結。
                <br>
                請把 Facebook 貼文文字貼到上方文字框再分析。
            </div>
        `;

        return;
    }


    resultList.innerHTML =
        pendingItems
            .map(
                (item, index) => {

                    return `
                        <div
                            class="result-item"
                            data-index="${index}"
                        >

                            <input
                                type="checkbox"
                                class="result-check"
                                checked
                            >

                            <div>

                                <input
                                    class="result-name-input"
                                    value="${escapeHTML(item.name)}"
                                >

                                <div class="result-url">
                                    ${escapeHTML(item.url)}
                                </div>

                            </div>

                            <button
                                type="button"
                                class="result-remove"
                                onclick="removeResult(${index})"
                            >
                                移除
                            </button>

                        </div>
                    `;

                }
            )
            .join("");

}


/* =========================================================
   移除分析結果
========================================================= */

window.removeResult =
    function(index) {

        pendingItems.splice(
            index,
            1
        );

        renderResults();

    };


/* =========================================================
   取得確認後的項目
========================================================= */

function getConfirmedItems() {

    const rows = [
        ...document.querySelectorAll(
            ".result-item"
        )
    ];


    return rows
        .filter(
            row => {

                const checkbox =
                    row.querySelector(
                        ".result-check"
                    );

                return checkbox &&
                    checkbox.checked;

            }
        )
        .map(
            row => {

                const index =
                    Number(
                        row.dataset.index
                    );


                const nameInput =
                    row.querySelector(
                        ".result-name-input"
                    );


                return {

                    name:
                        nameInput
                            ? nameInput.value.trim()
                            : pendingItems[index].name,

                    url:
                        pendingItems[index].url

                };

            }
        )
        .filter(
            item =>
                item.name &&
                item.url
        );

}


/* =========================================================
   加入現有
========================================================= */

document
    .getElementById("mergeBtn")
    .addEventListener(
        "click",
        () => preparePublish("merge")
    );


/* =========================================================
   取代本店
========================================================= */

document
    .getElementById("replaceBtn")
    .addEventListener(
        "click",
        () => preparePublish("replace")
    );


/* =========================================================
   準備發布
========================================================= */

function preparePublish(mode) {

    if (!currentData) {

        alert(
            "請先按「讀取目前資料」。"
        );

        return;
    }


    const items =
        getConfirmedItems();


    if (!items.length) {

        alert(
            "請至少保留一個項目。"
        );

        return;
    }


    const shop =
        currentData.shops.find(
            item =>
                item.id ===
                shopSelect.value
        );


    if (!shop) {

        alert(
            "找不到指定店家。"
        );

        return;
    }


    if (mode === "merge") {

        const existing =
            Array.isArray(shop.items)
                ? shop.items
                : [];


        const combined = [
            ...existing
        ];


        items.forEach(
            newItem => {

                const duplicate =
                    combined.some(
                        oldItem =>
                            oldItem.url ===
                            newItem.url
                    );


                if (!duplicate) {

                    combined.push(
                        newItem
                    );

                }

            }
        );


        shop.items =
            combined;

    } else {

        shop.items =
            items;

    }


    currentData.updatedAt =
        getToday();


    pendingMode =
        mode;


    publishBtn.disabled =
        false;


    updatePreview();


    setStatus(
        publishStatus,
        mode === "merge"
            ? "已加入目前資料，請確認後發布。"
            : "已準備取代本店資料，請確認後發布。"
    );

}


/* =========================================================
   預覽
========================================================= */

function updatePreview() {

    if (!currentData) {

        publishPreview.textContent =
            "尚未準備發布資料。";

        return;
    }


    const lines = [];


    lines.push(
        `更新日期：${currentData.updatedAt}`
    );


    lines.push(
        `店家數量：${currentData.shops.length}`
    );


    lines.push(
        `總品項：${getTotalItems(currentData)}`
    );


    lines.push("");


    currentData.shops.forEach(
        shop => {

            lines.push(
                `${shop.name}：${shop.items.length} 項`
            );

        }
    );


    publishPreview.textContent =
        lines.join("\n");

}


/* =========================================================
   發布 GitHub
========================================================= */

publishBtn.addEventListener(
    "click",
    publish
);


async function publish() {

    if (!currentData) {

        alert(
            "沒有可以發布的資料。"
        );

        return;
    }


    const confirmed =
        confirm(
            "確定要把目前資料發布到 GitHub 嗎？\n\n" +
            "這會更新 data/shops.json。"
        );


    if (!confirmed) {
        return;
    }


    try {

        publishBtn.disabled =
            true;


        setStatus(
            publishStatus,
            "正在更新 GitHub shops.json…"
        );


        const result =
            await api(
                "/publish",
                {
                    method: "POST",

                    body:
                        JSON.stringify({
                            data:
                                currentData
                        })
                }
            );


        setStatus(
            publishStatus,
            "發布成功！\n" +
            "GitHub shops.json 已更新。"
        );


        publishPreview.innerHTML = `
            <div class="success">
                ✅ 發布成功！

                <br><br>

                ${escapeHTML(
                    result.message ||
                    "shops.json 已更新"
                )}

                ${
                    result.commitUrl
                        ? `
                            <div class="source-links">
                                <a
                                    href="${escapeHTML(result.commitUrl)}"
                                    target="_blank"
                                >
                                    查看 GitHub Commit ↗
                                </a>
                            </div>
                        `
                        : ""
                }
            </div>
        `;


        pendingItems = [];

        pendingMode = null;


    } catch (error) {

        setStatus(
            publishStatus,
            "發布失敗：" +
            error.message
        );


        alert(
            "發布失敗：\n\n" +
            error.message
        );

    } finally {

        publishBtn.disabled =
            false;

    }

}


/* =========================================================
   手動新增
========================================================= */

document
    .getElementById("addManualBtn")
    .addEventListener(
        "click",
        addManual
    );


function addManual() {

    const name =
        prompt(
            "請輸入抽選品項名稱："
        );


    if (!name) {
        return;
    }


    const url =
        prompt(
            "請輸入 LINE 抽選網址："
        );


    if (!url) {
        return;
    }


    pendingItems.push({

        name:
            name.trim(),

        url:
            url.trim()

    });


    renderResults();

}


/* =========================================================
   工具
========================================================= */

function getTotalItems(data) {

    return data.shops.reduce(
        (
            total,
            shop
        ) => {

            return total +
                (
                    Array.isArray(shop.items)
                        ? shop.items.length
                        : 0
                );

        },
        0
    );

}


function getToday() {

    const date =
        new Date();


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            date.getDate()
        ).padStart(2, "0");


    return (
        `${year}-${month}-${day}`
    );

}


function setStatus(
    element,
    message
) {

    if (!element) {
        return;
    }


    if (
        element.id ===
        "statusText"
    ) {

        element.textContent =
            message;

        return;
    }


    element.textContent =
        message;

}
