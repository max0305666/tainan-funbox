```javascript
let DATA = null;
let selectedShop = "all";
let running = false;
let queue = [];
let index = 0;
let timer = null;


/* =========================
   載入資料
========================= */

async function loadData() {
  try {
    const r = await fetch("data/shops.json", {
      cache: "no-store"
    });

    if (!r.ok) {
      throw new Error(`HTTP ${r.status}`);
    }

    DATA = await r.json();

    if (!DATA || !Array.isArray(DATA.shops)) {
      throw new Error("shops.json 格式錯誤");
    }

  } catch (e) {
    console.error("資料讀取失敗：", e);

    const lastSync = document.querySelector("#lastSync");

    if (lastSync) {
      lastSync.textContent = "資料讀取失敗";
    }

    return;
  }

  renderPosts();
  renderShops();
  renderItems();

  const lastSync = document.querySelector("#lastSync");

  if (lastSync) {
    lastSync.textContent =
      "同步 " + (DATA.updatedAt || "尚未設定");
  }

  setStatus("資料已載入");
}


/* =========================
   店家公告 / 卡片
========================= */

function renderPosts() {

  const posts = document.querySelector("#posts");

  if (!posts) return;

  posts.innerHTML = DATA.shops.map(s => `
    <article class="post">

      <div class="post-head">
        <strong>${esc(s.name)}</strong>

        <span class="badge">
          ${Array.isArray(s.items) ? s.items.length : 0} 項
        </span>
      </div>

      <div class="post-items">
        ${
          Array.isArray(s.items)
            ? s.items
                .slice(0, 4)
                .map(x => esc(x.name))
                .join("　·　")
            : ""
        }

        ${
          Array.isArray(s.items) && s.items.length > 4
            ? "　…"
            : ""
        }
      </div>

    </article>
  `).join("");
}


/* =========================
   店家選擇
========================= */

function renderShops() {

  const shops = document.querySelector("#shops");

  if (!shops) return;

  const html = [
    `
    <button
      class="shop-btn ${selectedShop === "all" ? "active" : ""}"
      onclick="chooseShop('all')"
    >
      <strong>全部店家</strong>
      <small>顯示全部抽選品</small>
    </button>
    `
  ];

  DATA.shops.forEach((s, i) => {

    html.push(`
      <button
        class="shop-btn ${selectedShop === i ? "active" : ""}"
        onclick="chooseShop(${i})"
      >
        <strong>${esc(s.name)}</strong>

        <small>
          ${Array.isArray(s.items) ? s.items.length : 0} 個品項
        </small>
      </button>
    `);

  });

  shops.innerHTML = html.join("");
}


/* =========================
   選擇店家
========================= */

function chooseShop(i) {

  if (running) {
    alert("目前正在抽選中，請先停止目前的抽選。");
    return;
  }

  selectedShop = i;

  renderShops();
  renderItems();
}


/* =========================
   顯示品項
========================= */

function renderItems() {

  const items = document.querySelector("#items");

  if (!items || !DATA) return;

  let list = [];

  DATA.shops.forEach((s, si) => {

    if (
      selectedShop === "all" ||
      selectedShop === si
    ) {

      if (!Array.isArray(s.items)) return;

      s.items.forEach((x, ii) => {

        list.push({
          ...x,
          si,
          ii,
          shop: s.name
        });

      });

    }

  });


  if (!list.length) {

    items.innerHTML = `
      <p class="muted">
        目前沒有抽選品項。
      </p>
    `;

    return;
  }


  items.innerHTML = list.map((x, k) => `
    <label class="item">

      <input
        type="checkbox"
        class="item-check"
        data-k="${k}"
        checked
      >

      <span class="item-main">

        <span class="item-name">
          ${esc(x.name)}
        </span>

        <span class="item-shop">
          ${esc(x.shop)}
        </span>

      </span>

      <a
        class="line-link"
        href="${escAttr(x.url)}"
        target="_blank"
        rel="noopener noreferrer"
        onclick="event.stopPropagation()"
      >
        LINE
      </a>

    </label>
  `).join("");
}


/* =========================
   全選 / 取消全選
========================= */

const selectAllBtn = document.querySelector("#selectAll");

if (selectAllBtn) {

  selectAllBtn.onclick = () => {

    const checks = [
      ...document.querySelectorAll(".item-check")
    ];

    if (!checks.length) return;

    const allChecked =
      checks.every(x => x.checked);

    checks.forEach(x => {
      x.checked = !allChecked;
    });

    selectAllBtn.textContent =
      allChecked ? "全選" : "取消全選";
  };

}


/* =========================
   開始按鈕
========================= */

const startBtn = document.querySelector("#start");

if (startBtn) {
  startBtn.onclick = start;
}


/* =========================
   停止按鈕
========================= */

const stopBtn = document.querySelector("#stop");

if (stopBtn) {

  stopBtn.onclick = () => {

    if (!running) {
      setStatus("目前沒有正在進行的抽選");
      return;
    }

    stopDrawing();

  };

}


/* =========================
   開始抽選
========================= */

function start() {

  if (!DATA) {
    alert("資料尚未載入完成，請稍候再試。");
    return;
  }


  /* 防止重複開始 */

  if (running) {
    setStatus("目前正在抽選中");
    return;
  }


  /* 建立完整品項清單 */

  const list = [];

  DATA.shops.forEach((s, si) => {

    if (
      selectedShop === "all" ||
      selectedShop === si
    ) {

      if (!Array.isArray(s.items)) return;

      s.items.forEach((x, ii) => {

        list.push({
          ...x,
          shop: s.name,
          si,
          ii
        });

      });

    }

  });


  /* 找 checkbox */

  const checks = [
    ...document.querySelectorAll(".item-check")
  ];


  /* 只加入被勾選的品項 */

  queue = list.filter((_, i) => {
    return checks[i]?.checked;
  });


  /* 沒有選擇 */

  if (!queue.length) {

    alert("請至少選擇一個品項。");

    return;
  }


  /* 開始 */

  running = true;
  index = 0;

  document.body.classList.add("running");

  setStatus(`準備開始，共 ${queue.length} 個品項`);

  updateProgress();

  next();
}


/* =========================
   下一個
========================= */

function next() {

  if (!running) {
    return;
  }


  /* 全部完成 */

  if (index >= queue.length) {

    finishDrawing();

    return;
  }


  const x = queue[index];


  /* 更新畫面 */

  updateProgress();

  const current = document.querySelector("#current");

  if (current) {
    current.textContent = x.name;
  }


  setStatus(
    `正在開啟 ${x.shop}：${x.name}`
  );


  /* 開啟 LINE */

  let popup = null;

  try {

    popup = window.open(
      x.url,
      "_blank",
      "noopener,noreferrer"
    );

  } catch (e) {

    console.error("開啟 LINE 失敗：", e);

  }


  /* Popup 被瀏覽器阻擋 */

  if (!popup) {

    running = false;

    document.body.classList.remove("running");

    setStatus(
      "瀏覽器阻擋了新分頁"
    );

    alert(
      "瀏覽器阻擋了新分頁。\n\n" +
      "請允許這個網站的「彈出式視窗」後，再重新開始抽選。"
    );

    return;
  }


  /* 下一個 */

  index++;


  /*
    目前設定：

    每 8 秒開下一個 LINE
  */

  timer = setTimeout(() => {

    next();

  }, 8000);
}


/* =========================
   停止抽選
========================= */

function stopDrawing() {

  running = false;

  if (timer) {

    clearTimeout(timer);

    timer = null;
  }

  document.body.classList.remove("running");

  setStatus("已停止");

  const current = document.querySelector("#current");

  if (current) {
    current.textContent = "已停止";
  }
}


/* =========================
   完成
========================= */

function finishDrawing() {

  running = false;

  if (timer) {

    clearTimeout(timer);

    timer = null;
  }

  document.body.classList.remove("running");

  setStatus("全部項目已依序開啟");

  const current = document.querySelector("#current");

  if (current) {
    current.textContent = "完成";
  }

  const progress = document.querySelector("#progress");

  if (progress) {
    progress.textContent =
      `${queue.length} / ${queue.length}`;
  }
}


/* =========================
   進度
========================= */

function updateProgress() {

  const progress =
    document.querySelector("#progress");

  if (!progress) return;


  if (!queue.length) {

    progress.textContent = "0 / 0";

    return;
  }


  const currentNumber =
    Math.min(index + 1, queue.length);

  progress.textContent =
    `${currentNumber} / ${queue.length}`;
}


/* =========================
   狀態文字
========================= */

function setStatus(t) {

  const status =
    document.querySelector("#status");

  if (!status) return;

  status.innerHTML =
    `<span class="dot"></span>${esc(t)}`;
}


/* =========================
   HTML Escape
========================= */

function esc(s) {

  return String(s ?? "").replace(
    /[&<>"']/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c])
  );
}


/* =========================
   Attribute Escape
========================= */

function escAttr(s) {

  return esc(s);
}


/* =========================
   頁面載入
========================= */

loadData();
```

### 這份可以直接取代你現在的 JS

你的資料夾結構保持：

```text
你的網站/
│
├─ index.html
│
├─ script.js
│
├─ style.css
│
└─ data/
   └─ shops.json
```

而 `shops.json` 維持你前面使用的格式：

```json
{
  "updatedAt": "2026-10-01",
  "shops": [
    {
      "id": "xinren",
      "name": "來玩聚－新仁店",
      "address": "台南市仁德區...",
      "facebook": "",
      "items": [
        {
          "name": "陀螺 A",
          "url": "https://line.me/..."
        }
      ]
    }
  ]
}
```
