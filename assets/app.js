let DATA = null;

let selectedShop = "all";

let running = false;
let queue = [];
let currentIndex = 0;


/* =========================================================
   初始化
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  const startBtn = document.getElementById("start");
  const nextBtn = document.getElementById("next");
  const stopBtn = document.getElementById("stop");
  const selectAllBtn = document.getElementById("selectAll");

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
   讀取 JSON
========================================================= */

async function loadData() {

  const lastSync = document.getElementById("lastSync");

  try {

    setStatus("正在讀取店家資料…");

    if (lastSync) {
      lastSync.textContent = "資料讀取中…";
    }

    /*
      使用絕對路徑，避免 GitHub Pages 路徑問題
    */

    const base =
      window.location.origin +
      "/tainan-funbox/";

    const url =
      base +
      "data/shops.json?v=" +
      Date.now();

    console.log("正在讀取：", url);

    const response = await fetch(url, {
      cache: "no-store"
    });

    console.log(
      "shops.json HTTP 狀態：",
      response.status
    );

    if (!response.ok) {
      throw new Error(
        "HTTP " + response.status
      );
    }

    const json = await response.json();

    console.log(
      "shops.json 原始資料：",
      json
    );

    /*
      檢查 shops
    */

    if (
      !json ||
      !Array.isArray(json.shops)
    ) {
      throw new Error(
        "shops.json 沒有正確的 shops 陣列"
      );
    }

    if (json.shops.length === 0) {
      throw new Error(
        "shops.json 的 shops 是空的"
      );
    }

    DATA = json;

    console.log(
      "================================"
    );

    console.log(
      "成功載入店家：",
      DATA.shops.length
    );

    DATA.shops.forEach((shop, index) => {

      console.log(
        index + 1,
        shop.name,
        "items:",
        Array.isArray(shop.items)
          ? shop.items.length
          : "不是陣列"
      );

    });

    console.log(
      "================================"
    );


    /*
      渲染
    */

    renderPosts();

    renderShops();

    renderItems();


    /*
      更新同步時間
    */

    if (lastSync) {

      lastSync.textContent =
        "同步 " +
        (DATA.updatedAt || "未知");

    }


    setStatus(
      "資料已載入，共 " +
      DATA.shops.length +
      " 家店"
    );


    updateButtons();


  } catch (error) {

    console.error(
      "店家資料讀取失敗：",
      error
    );

    if (lastSync) {
      lastSync.textContent =
        "資料讀取失敗";
    }

    setStatus(
      "資料讀取失敗"
    );


    const shops =
      document.getElementById("shops");

    const items =
      document.getElementById("items");

    if (shops) {

      shops.innerHTML = `
        <div class="muted">
          店家資料載入失敗
        </div>
      `;

    }

    if (items) {

      items.innerHTML = `
        <div class="muted">
          無法取得抽選品項
        </div>
      `;

    }


    alert(
      "店家資料載入失敗。\n\n" +
      "錯誤：" +
      error.message +
      "\n\n" +
      "請開啟瀏覽器 F12 → Console 查看詳細錯誤。"
    );

  }

}


/* =========================================================
   最新店家公告
========================================================= */

function renderPosts() {

  const posts =
    document.getElementById("posts");

  if (!posts || !DATA) {
    return;
  }

  posts.innerHTML = "";


  DATA.shops.forEach((shop) => {

    const items =
      Array.isArray(shop.items)
        ? shop.items
        : [];


    const names =
      items
        .slice(0, 4)
        .map(item =>
          escapeHTML(item.name)
        )
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
            ${escapeHTML(shop.name)}
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

  const shopsContainer =
    document.getElementById("shops");

  if (!shopsContainer || !DATA) {
    return;
  }


  let html = "";


  /*
    全部店家
  */

  html += `
    <button
      type="button"
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
        ${getTotalItems()} 個品項
      </small>

    </button>
  `;


  /*
    每一家店
  */

  DATA.shops.forEach(
    (shop, index) => {

      const items =
        Array.isArray(shop.items)
          ? shop.items
          : [];


      html += `
        <button
          type="button"
          class="shop-btn ${
            selectedShop === index
              ? "active"
              : ""
          }"
          onclick="chooseShop(${index})"
        >

          <strong>
            ${escapeHTML(shop.name)}
          </strong>

          <small>
            ${items.length} 個品項
          </small>

        </button>
      `;

    }
  );


  shopsContainer.innerHTML = html;

}


/* =========================================================
   計算全部品項
========================================================= */

function getTotalItems() {

  if (!DATA) {
    return 0;
  }


  return DATA.shops.reduce(
    (total, shop) => {

      if (
        !Array.isArray(shop.items)
      ) {
        return total;
      }

      return total + shop.items.length;

    },
    0
  );

}


/* =========================================================
   選擇店家
========================================================= */

function chooseShop(shopIndex) {

  if (!DATA) {
    return;
  }


  if (running) {

    alert(
      "目前正在抽選中。\n\n" +
      "請先按「停止」再切換店家。"
    );

    return;
  }


  /*
    確認店家索引
  */

  if (
    shopIndex !== "all" &&
    (
      typeof shopIndex !== "number" ||
      !DATA.shops[shopIndex]
    )
  ) {

    console.error(
      "錯誤的店家索引：",
      shopIndex
    );

    return;
  }


  selectedShop = shopIndex;

  queue = [];

  currentIndex = 0;


  renderShops();

  renderItems();


  const progress =
    document.getElementById("progress");

  const current =
    document.getElementById("current");


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
   取得目前顯示品項
========================================================= */

function getCurrentItems() {

  if (!DATA) {
    return [];
  }


  const list = [];


  DATA.shops.forEach(
    (shop, shopIndex) => {

      /*
        如果不是全部店家，
        只取指定店家
      */

      if (
        selectedShop !== "all" &&
        selectedShop !== shopIndex
      ) {
        return;
      }


      if (
        !Array.isArray(shop.items)
      ) {
        console.warn(
          "店家沒有 items：",
          shop.name
        );

        return;
      }


      shop.items.forEach(
        (item, itemIndex) => {

          /*
            即使單一品項資料不完整，
            也不要影響其他品項
          */

          list.push({

            name:
              item &&
              item.name
                ? item.name
                : "未命名品項",

            url:
              item &&
              item.url
                ? item.url
                : "",

            shop:
              shop.name ||
              "未命名店家",

            shopIndex:
              shopIndex,

            itemIndex:
              itemIndex

          });

        }
      );

    }
  );


  return list;

}


/* =========================================================
   顯示品項
========================================================= */

function renderItems() {

  const container =
    document.getElementById("items");

  if (!container || !DATA) {
    return;
  }


  const list =
    getCurrentItems();


  if (!list.length) {

    container.innerHTML = `
      <p class="muted">
        目前沒有抽選品項。
      </p>
    `;

    return;
  }


  container.innerHTML =
    list.map(
      (item, index) => {

        let lineButton = "";


        if (item.url) {

          lineButton = `
            <a
              class="line-link"
              href="${escapeAttribute(item.url)}"
              target="_blank"
              rel="noopener noreferrer"
              onclick="event.stopPropagation()"
            >
              LINE
            </a>
          `;

        } else {

          lineButton = `
            <span class="line-link disabled">
              無連結
            </span>
          `;

        }


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
                ${escapeHTML(item.name)}
              </span>

              <span class="item-shop">
                ${escapeHTML(item.shop)}
              </span>

            </span>

            ${lineButton}

          </label>
        `;

      }
    ).join("");

}


/* =========================================================
   全選
========================================================= */

function toggleSelectAll() {

  const checks = [
    ...document.querySelectorAll(
      ".item-check"
    )
  ];


  const button =
    document.getElementById("selectAll");


  if (!checks.length) {
    return;
  }


  const allChecked =
    checks.every(
      checkbox =>
        checkbox.checked
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
      "店家資料尚未載入完成。"
    );

    return;
  }


  if (running) {
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
        checks[itemIndex] &&
        checks[itemIndex].checked
    );


  if (!queue.length) {

    alert(
      "請至少選擇一個抽選品項。"
    );

    return;
  }


  running = true;

  currentIndex = 0;


  document.body.classList.add(
    "running"
  );


  updateProgress();

  updateButtons();


  setStatus(
    "準備開啟第一個 LINE 抽選"
  );


  openCurrent();

}


/* =========================================================
   開啟目前 LINE
========================================================= */

function openCurrent() {

  if (!running) {
    return;
  }


  if (
    currentIndex >=
    queue.length
  ) {

    finish();

    return;
  }


  const item =
    queue[currentIndex];


  const current =
    document.getElementById("current");


  if (current) {

    current.textContent =
      item.name;

  }


  updateProgress();


  /*
    沒有網址
  */

  if (!item.url) {

    setStatus(
      item.name +
      " 沒有 LINE 連結"
    );

    updateButtons();

    return;
  }


  /*
    直接開啟 LINE
  */

  const popup =
    window.open(
      item.url,
      "_blank"
    );


  if (!popup) {

    setStatus(
      "瀏覽器阻擋了新分頁"
    );


    alert(
      "瀏覽器阻擋了 LINE 新分頁。\n\n" +
      "請允許這個網站的彈出式視窗，" +
      "再重新開始抽選。"
    );


    return;
  }


  setStatus(
    "已開啟 " +
    item.shop +
    "｜" +
    item.name +
    "\n抽完後回來按「下一個」"
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
    如果還有下一項
  */

  if (
    currentIndex <
    queue.length - 1
  ) {

    currentIndex++;

    openCurrent();

    return;
  }


  /*
    已經是最後一項
    再按一次就完成
  */

  finish();

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
    document.getElementById("current");


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
    document.getElementById("progress");


  const current =
    document.getElementById("current");


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
   進度
========================================================= */

function updateProgress() {

  const progress =
    document.getElementById("progress");


  if (!progress) {
    return;
  }


  if (!queue.length) {

    progress.textContent =
      "0 / 0";

    return;
  }


  progress.textContent =
    `${currentIndex + 1} / ${queue.length}`;

}


/* =========================================================
   按鈕狀態
========================================================= */

function updateButtons() {

  const startBtn =
    document.getElementById("start");

  const nextBtn =
    document.getElementById("next");

  const stopBtn =
    document.getElementById("stop");


  /*
    開始
  */

  if (startBtn) {

    startBtn.disabled =
      running;

  }


  /*
    下一個

    最後一個也可以按，
    按下去會完成抽選
  */

  if (nextBtn) {

    nextBtn.disabled =
      !running;

    if (running) {

      if (
        currentIndex >=
        queue.length - 1
      ) {

        nextBtn.textContent =
          "✓ 完成";

      } else {

        nextBtn.textContent =
          "➜ 下一個";

      }

    } else {

      nextBtn.textContent =
        "➜ 下一個";

    }

  }


  /*
    停止
  */

  if (stopBtn) {

    stopBtn.disabled =
      !running;

  }

}


/* =========================================================
   狀態文字
========================================================= */

function setStatus(message) {

  const status =
    document.getElementById("status");


  if (!status) {
    return;
  }


  status.innerHTML =
    `
      <span class="dot"></span>
      ${escapeHTML(message)}
    `;

}


/* =========================================================
   HTML Escape
========================================================= */

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
   Attribute Escape
========================================================= */

function escapeAttribute(value) {

  return escapeHTML(value);

}


/* =========================================================
   提供給 HTML onclick
========================================================= */

window.chooseShop = chooseShop;
