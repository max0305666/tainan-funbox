let DATA = null;
let selectedShop = "all";

let running = false;
let queue = [];
let index = 0;


/* =========================================================
   初始化
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  const startBtn = document.querySelector("#start");
  const nextBtn = document.querySelector("#next");
  const stopBtn = document.querySelector("#stop");
  const selectAllBtn = document.querySelector("#selectAll");

  if (startBtn) {
    startBtn.addEventListener("click", start);
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", next);
  }

  if (stopBtn) {
    stopBtn.addEventListener("click", stop);
  }

  if (selectAllBtn) {
    selectAllBtn.addEventListener("click", toggleSelectAll);
  }

  loadData();
});


/* =========================================================
   讀取店家資料
========================================================= */

async function loadData() {

  const lastSync = document.querySelector("#lastSync");

  try {

    if (lastSync) {
      lastSync.textContent = "資料讀取中…";
    }

    const response = await fetch(
      "data/shops.json?time=" + Date.now(),
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        "HTTP " + response.status
      );
    }

    const json = await response.json();

    if (!json || !Array.isArray(json.shops)) {
      throw new Error(
        "shops.json 格式錯誤：找不到 shops"
      );
    }

    DATA = json;

    console.log("Funbox 資料載入成功");
    console.log("店家數量：", DATA.shops.length);

    DATA.shops.forEach((shop, index) => {

      console.log(
        index + 1,
        shop.name,
        "→",
        Array.isArray(shop.items)
          ? shop.items.length
          : 0,
        "項"
      );

    });

    renderPosts();
    renderShops();
    renderItems();

    if (lastSync) {
      lastSync.textContent =
        "同步 " +
        (DATA.updatedAt || "尚未設定");
    }

    setStatus(
      "資料已載入，共 " +
      DATA.shops.length +
      " 家店"
    );

    updateButtons();

  } catch (error) {

    console.error(
      "shops.json 讀取失敗：",
      error
    );

    if (lastSync) {
      lastSync.textContent = "資料讀取失敗";
    }

    setStatus("資料讀取失敗");

    alert(
      "無法讀取店家資料。\n\n" +
      "請確認 data/shops.json 是否存在，" +
      "以及 JSON 格式是否正確。\n\n" +
      "錯誤：" +
      error.message
    );
  }
}


/* =========================================================
   最新店家公告
========================================================= */

function renderPosts() {

  const posts = document.querySelector("#posts");

  if (!posts || !DATA) {
    return;
  }

  posts.innerHTML = "";

  DATA.shops.forEach(shop => {

    const items =
      Array.isArray(shop.items)
        ? shop.items
        : [];

    const names =
      items
        .slice(0, 4)
        .map(item => esc(item.name))
        .join("　·　");

    const more =
      items.length > 4
        ? "　…"
        : "";

    posts.insertAdjacentHTML(
      "beforeend",
      `
      <article class="post">

        <div class="post-head">

          <strong>
            ${esc(shop.name)}
          </strong>

          <span class="badge">
            ${items.length} 項
          </span>

        </div>

        <div class="post-items">
          ${
            names ||
            "目前沒有抽選品項"
          }
          ${more}
        </div>

      </article>
      `
    );

  });
}


/* =========================================================
   店家列表
========================================================= */

function renderShops() {

  const shops = document.querySelector("#shops");

  if (!shops || !DATA) {
    return;
  }

  let html = "";

  html += `
    <button
      class="shop-btn ${
        selectedShop === "all"
          ? "active"
          : ""
      }"
      onclick="chooseShop('all')"
    >

      <strong>
        全部店家
      </strong>

      <small>
        顯示全部抽選品
      </small>

    </button>
  `;


  DATA.shops.forEach((shop, index) => {

    const items =
      Array.isArray(shop.items)
        ? shop.items
        : [];

    html += `
      <button
        class="shop-btn ${
          selectedShop === index
            ? "active"
            : ""
        }"
        onclick="chooseShop(${index})"
      >

        <strong>
          ${esc(shop.name)}
        </strong>

        <small>
          ${items.length} 個品項
        </small>

      </button>
    `;

  });

  shops.innerHTML = html;
}


/* =========================================================
   選擇店家
========================================================= */

function chooseShop(shopIndex) {

  if (running) {

    alert(
      "目前正在抽選中。\n\n" +
      "請先按「停止」再切換店家。"
    );

    return;
  }

  selectedShop = shopIndex;

  queue = [];
  index = 0;

  renderShops();
  renderItems();

  const progress =
    document.querySelector("#progress");

  const current =
    document.querySelector("#current");

  if (progress) {
    progress.textContent = "0 / 0";
  }

  if (current) {
    current.textContent = "尚未開始";
  }

  if (selectedShop === "all") {

    setStatus(
      "已選擇全部店家"
    );

  } else {

    setStatus(
      "已選擇 " +
      DATA.shops[selectedShop].name
    );

  }

  updateButtons();
}


/* =========================================================
   取得目前顯示中的品項
========================================================= */

function getCurrentItems() {

  if (!DATA) {
    return [];
  }

  const list = [];

  DATA.shops.forEach(
    (shop, shopIndex) => {

      if (
        selectedShop !== "all" &&
        selectedShop !== shopIndex
      ) {
        return;
      }

      if (!Array.isArray(shop.items)) {
        return;
      }

      shop.items.forEach(
        (item, itemIndex) => {

          list.push({

            name: item.name || "未命名品項",

            url: item.url || "",

            shop: shop.name || "未命名店家",

            shopIndex: shopIndex,

            itemIndex: itemIndex

          });

        }
      );

    }
  );

  return list;
}


/* =========================================================
   顯示抽選品項
========================================================= */

function renderItems() {

  const itemsContainer =
    document.querySelector("#items");

  if (!itemsContainer || !DATA) {
    return;
  }

  const list = getCurrentItems();


  if (!list.length) {

    itemsContainer.innerHTML = `
      <p class="muted">
        目前沒有抽選品項。
      </p>
    `;

    return;
  }


  itemsContainer.innerHTML =
    list.map((item, index) => {

      const lineButton =
        item.url
          ? `
            <a
              class="line-link"
              href="${escAttr(item.url)}"
              target="_blank"
              rel="noopener noreferrer"
              onclick="event.stopPropagation()"
            >
              LINE
            </a>
          `
          : `
            <span class="line-link disabled">
              無連結
            </span>
          `;


      return `
        <label class="item">

          <input
            type="checkbox"
            class="item-check"
            data-index="${index}"
            checked
          >

          <span class="item-main">

            <span class="item-name">
              ${esc(item.name)}
            </span>

            <span class="item-shop">
              ${esc(item.shop)}
            </span>

          </span>

          ${lineButton}

        </label>
      `;

    }).join("");
}


/* =========================================================
   全選 / 取消全選
========================================================= */

function toggleSelectAll() {

  const checks = [
    ...document.querySelectorAll(
      ".item-check"
    )
  ];

  const button =
    document.querySelector("#selectAll");


  if (!checks.length) {
    return;
  }


  const allChecked =
    checks.every(
      checkbox => checkbox.checked
    );


  checks.forEach(
    checkbox => {

      checkbox.checked =
        !allChecked;

    }
  );


  if (button) {

    button.textContent =
      allChecked
        ? "全選"
        : "取消全選";

  }
}


/* =========================================================
   開始抽選
========================================================= */

function start() {

  if (!DATA) {

    alert(
      "資料尚未載入完成，請稍候再試。"
    );

    return;
  }


  if (running) {

    setStatus(
      "目前正在抽選中"
    );

    return;
  }


  const list =
    getCurrentItems();


  const checks = [
    ...document.querySelectorAll(
      ".item-check"
    )
  ];


  queue =
    list.filter(
      (_, itemIndex) =>
        checks[itemIndex]?.checked
    );


  if (!queue.length) {

    alert(
      "請至少選擇一個抽選品項。"
    );

    return;
  }


  running = true;

  index = 0;

  document.body.classList.add(
    "running"
  );


  updateButtons();

  updateProgress();


  setStatus(
    "準備開啟第一個 LINE 抽選"
  );


  openCurrent();
}


/* =========================================================
   開啟目前品項
========================================================= */

function openCurrent() {

  if (!running) {
    return;
  }


  if (index >= queue.length) {

    finish();

    return;
  }


  const item =
    queue[index];


  const current =
    document.querySelector("#current");


  if (current) {

    current.textContent =
      item.name;

  }


  updateProgress();


  setStatus(
    "正在開啟 " +
    item.shop +
    "｜" +
    item.name
  );


  /*
    沒有 LINE URL
  */

  if (!item.url) {

    setStatus(
      item.name +
      " 沒有 LINE 連結"
    );

    return;
  }


  /*
    開啟 LINE
  */

  let popup = null;


  try {

    popup =
      window.open(
        item.url,
        "_blank"
      );

  } catch (error) {

    console.error(
      "LINE 開啟失敗：",
      error
    );

  }


  /*
    Popup 被瀏覽器阻擋
  */

  if (!popup) {

    setStatus(
      "瀏覽器阻擋了 LINE 新分頁"
    );

    alert(
      "瀏覽器阻擋了 LINE 新分頁。\n\n" +
      "請允許此網站的彈出式視窗，" +
      "再重新按一次「開始抽選」。"
    );

    return;
  }


  setStatus(
    "已開啟 " +
    item.shop +
    "｜" +
    item.name +
    "，抽完後回來按「下一個」"
  );


  updateButtons();
}


/* =========================================================
   下一個
========================================================= */

function next() {

  if (!running) {

    setStatus(
      "目前沒有進行中的抽選"
    );

    return;
  }


  /*
    前進到下一個
  */

  index++;


  /*
    已經全部完成
  */

  if (index >= queue.length) {

    finish();

    return;
  }


  /*
    開啟下一個
  */

  openCurrent();
}


/* =========================================================
   停止
========================================================= */

function stop() {

  if (!running) {

    setStatus(
      "目前沒有進行中的抽選"
    );

    return;
  }


  running = false;

  document.body.classList.remove(
    "running"
  );


  setStatus(
    "已停止"
  );


  const current =
    document.querySelector("#current");


  if (current) {

    current.textContent =
      "已停止";

  }


  updateButtons();
}


/* =========================================================
   完成
========================================================= */

function finish() {

  running = false;

  document.body.classList.remove(
    "running"
  );


  const progress =
    document.querySelector("#progress");


  const current =
    document.querySelector("#current");


  if (progress) {

    progress.textContent =
      `${queue.length} / ${queue.length}`;

  }


  if (current) {

    current.textContent =
      "完成";

  }


  setStatus(
    "全部項目已完成"
  );


  updateButtons();
}


/* =========================================================
   更新進度
========================================================= */

function updateProgress() {

  const progress =
    document.querySelector("#progress");


  if (!progress) {
    return;
  }


  if (!queue.length) {

    progress.textContent =
      "0 / 0";

    return;
  }


  progress.textContent =
    `${index + 1} / ${queue.length}`;
}


/* =========================================================
   更新按鈕
========================================================= */

function updateButtons() {

  const startBtn =
    document.querySelector("#start");

  const nextBtn =
    document.querySelector("#next");

  const stopBtn =
    document.querySelector("#stop");


  /*
    開始：

    抽選中不能重新開始
  */

  if (startBtn) {

    startBtn.disabled =
      running;

  }


  /*
    下一個：

    抽選中
    且目前還有下一項
  */

  if (nextBtn) {

    nextBtn.disabled =
      !running ||
      index >= queue.length - 1;

  }


  /*
    停止：

    沒有抽選時不能按
  */

  if (stopBtn) {

    stopBtn.disabled =
      !running;

  }
}


/* =========================================================
   狀態
========================================================= */

function setStatus(text) {

  const status =
    document.querySelector("#status");


  if (!status) {
    return;
  }


  status.innerHTML =
    `
      <span class="dot"></span>
      ${esc(text)}
    `;
}


/* =========================================================
   HTML Escape
========================================================= */

function esc(value) {

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
   URL / Attribute Escape
========================================================= */

function escAttr(value) {

  return esc(value);
}


/* =========================================================
   給 HTML onclick 使用
========================================================= */

window.chooseShop = chooseShop;
