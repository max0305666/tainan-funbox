```javascript
let DATA = null;

let selectedShop = "all";

let running = false;

let queue = [];

let index = 0;


/* =========================================================
   頁面初始化
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
   讀取 shops.json
========================================================= */

async function loadData() {

  const lastSync = document.querySelector("#lastSync");

  try {

    if (lastSync) {
      lastSync.textContent = "資料讀取中…";
    }


    const response = await fetch(
      "data/shops.json",
      {
        cache: "no-store"
      }
    );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );

    }


    const json = await response.json();


    /*
      確認 JSON 格式
    */

    if (!json || !Array.isArray(json.shops)) {

      throw new Error(
        "shops.json 找不到 shops 陣列"
      );

    }


    DATA = json;


    console.log(
      "shops.json 載入成功：",
      DATA
    );


    console.log(
      "店家數量：",
      DATA.shops.length
    );


    DATA.shops.forEach((shop, index) => {

      console.log(
        `店家 ${index + 1}：`,
        shop.name,
        "品項：",
        Array.isArray(shop.items)
          ? shop.items.length
          : 0
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
      `資料已載入，共 ${DATA.shops.length} 家店`
    );


  } catch (error) {

    console.error(
      "shops.json 讀取失敗：",
      error
    );


    if (lastSync) {

      lastSync.textContent =
        "資料讀取失敗";

    }


    setStatus(
      "資料讀取失敗"
    );


    alert(
      "無法讀取 data/shops.json\n\n" +
      "請確認：\n" +
      "1. shops.json 是否存在\n" +
      "2. 檔案位置是否為 data/shops.json\n" +
      "3. JSON 格式是否正確\n\n" +
      "錯誤：" +
      error.message
    );

  }

}


/* =========================================================
   最新店家公告
========================================================= */

function renderPosts() {

  const posts =
    document.querySelector("#posts");

  if (!posts || !DATA) {
    return;
  }


  posts.innerHTML = "";


  DATA.shops.forEach(shop => {

    const items =
      Array.isArray(shop.items)
        ? shop.items
        : [];


    const itemNames =
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

          ${itemNames || "目前沒有抽選品項"}

          ${more}

        </div>

      </article>
      `
    );

  });

}


/* =========================================================
   店家按鈕
========================================================= */

function renderShops() {

  const shops =
    document.querySelector("#shops");

  if (!shops || !DATA) {
    return;
  }


  shops.innerHTML = "";


  /*
    全部店家
  */

  shops.insertAdjacentHTML(
    "beforeend",
    `
    <button
      class="shop-btn ${selectedShop === "all" ? "active" : ""}"
      onclick="chooseShop('all')"
    >

      <strong>
        全部店家
      </strong>

      <small>
        顯示全部抽選品
      </small>

    </button>
    `
  );


  /*
    所有店家
  */

  DATA.shops.forEach((shop, index) => {

    const items =
      Array.isArray(shop.items)
        ? shop.items
        : [];


    shops.insertAdjacentHTML(
      "beforeend",
      `
      <button
        class="shop-btn ${selectedShop === index ? "active" : ""}"
        onclick="chooseShop(${index})"
      >

        <strong>
          ${esc(shop.name)}
        </strong>

        <small>
          ${items.length} 個品項
        </small>

      </button>
      `
    );

  });

}


/* =========================================================
   選擇店家
========================================================= */

function chooseShop(shopIndex) {

  /*
    抽選進行中不能切換
  */

  if (running) {

    alert(
      "目前正在抽選中。\n\n" +
      "請先按「停止」再切換店家。"
    );

    return;

  }


  selectedShop = shopIndex;


  renderShops();

  renderItems();


  /*
    重設進度
  */

  queue = [];

  index = 0;


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


  setStatus(
    selectedShop === "all"
      ? "已選擇全部店家"
      : `已選擇 ${DATA.shops[selectedShop].name}`
  );

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


  let list = [];


  /*
    全部店家
  */

  DATA.shops.forEach(
    (shop, shopIndex) => {

      /*
        如果不是全部，只處理指定店家
      */

      if (
        selectedShop !== "all" &&
        selectedShop !== shopIndex
      ) {

        return;

      }


      /*
        防止 items 不存在
      */

      if (!Array.isArray(shop.items)) {

        return;

      }


      shop.items.forEach(
        (item, itemIndex) => {

          list.push({

            ...item,

            shop: shop.name,

            shopIndex,

            itemIndex

          });

        }
      );

    }
  );


  /*
    沒有商品
  */

  if (!list.length) {

    itemsContainer.innerHTML = `
      <p class="muted">
        目前沒有抽選品項。
      </p>
    `;

    return;

  }


  /*
    建立商品
  */

  itemsContainer.innerHTML =
    list.map(
      (item, index) => {

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


            ${
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
                `
            }

          </label>
        `;

      }
    ).join("");

}


/* =========================================================
   全選 / 取消全選
========================================================= */

function toggleSelectAll() {

  const checks =
    [
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
      "目前已經在抽選中"
    );

    return;

  }


  /*
    建立目前店家的商品清單
  */

  let list = [];


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

            ...item,

            shop: shop.name,

            shopIndex,

            itemIndex

          });

        }
      );

    }
  );


  /*
    取得 checkbox
  */

  const checks =
    [
      ...document.querySelectorAll(
        ".item-check"
      )
    ];


  /*
    建立實際抽選隊列
  */

  queue =
    list.filter(
      (_, index) =>
        checks[index]?.checked
    );


  /*
    沒有選任何商品
  */

  if (!queue.length) {

    alert(
      "請至少選擇一個抽選品項。"
    );

    return;

  }


  /*
    開始
  */

  running = true;

  index = 0;


  document.body.classList.add(
    "running"
  );


  /*
    更新按鈕
  */

  updateButtons();


  /*
    顯示狀態
  */

  setStatus(
    `準備開始，共 ${queue.length} 個品項`
  );


  updateProgress();


  /*
    直接開第一個
  */

  openCurrent();

}


/* =========================================================
   開啟目前商品
========================================================= */

function openCurrent() {

  if (!running) {
    return;
  }


  /*
    全部完成
  */

  if (index >= queue.length) {

    finish();

    return;

  }


  const item =
    queue[index];


  /*
    更新畫面
  */

  updateProgress();


  const current =
    document.querySelector("#current");


  if (current) {

    current.textContent =
      item.name;

  }


  setStatus(
    `準備開啟 ${item.shop}：${item.name}`
  );


  /*
    URL 檢查
  */

  if (!item.url) {

    setStatus(
      `${item.name} 沒有 LINE 連結`
    );


    /*
      沒有 URL 就跳過
    */

    index++;

    updateButtons();

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
      "window.open 失敗：",
      error
    );

  }


  /*
    Popup 被阻擋
  */

  if (!popup) {

    setStatus(
      "瀏覽器阻擋了新分頁"
    );


    alert(
      "瀏覽器阻擋了 LINE 新分頁。\n\n" +
      "請允許這個網站的「彈出式視窗」後再試一次。"
    );


    return;

  }


  /*
    開成功
  */

  setStatus(
    `已開啟：${item.shop}｜${item.name}`
  );


  /*
    這裡不自動跳下一個

    使用者抽完後
    回到網站按「下一個」
  */

  updateButtons();

}


/* =========================================================
   下一個
========================================================= */

function next() {

  if (!running) {

    setStatus(
      "目前沒有正在進行的抽選"
    );

    return;

  }


  /*
    前進一項
  */

  index++;


  /*
    全部完成
  */

  if (index >= queue.length) {

    finish();

    return;

  }


  /*
    開下一個
  */

  openCurrent();

}


/* =========================================================
   停止
========================================================= */

function stop() {

  if (!running) {

    setStatus(
      "目前沒有正在進行的抽選"
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
   進度
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


  const number =
    Math.min(
      index + 1,
      queue.length
    );


  progress.textContent =
    `${number} / ${queue.length}`;

}


/* =========================================================
   按鈕狀態
========================================================= */

function updateButtons() {

  const startBtn =
    document.querySelector("#start");


  const nextBtn =
    document.querySelector("#next");


  const stopBtn =
    document.querySelector("#stop");


  if (startBtn) {

    startBtn.disabled =
      running;

  }


  if (nextBtn) {

    /*
      只有：

      正在抽選
      且還有下一個

      才能按
    */

    nextBtn.disabled =
      !running ||
      index >= queue.length - 1;

  }


  if (stopBtn) {

    stopBtn.disabled =
      !running;

  }

}


/* =========================================================
   狀態文字
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
   Attribute Escape
========================================================= */

function escAttr(value) {

  return esc(value);

}


/* =========================================================
   提供給 HTML onclick 使用
========================================================= */

window.chooseShop = chooseShop;
```
