/* =========================================================
   台南 Funbox 自動抽選
   商品資料直接放在這裡
   不再依賴 data/shops.json
========================================================= */


/* =========================================================
   店家資料
========================================================= */

const DATA = {

  updatedAt: "2026-10-01",

  shops: [

    /* =========================
       新仁店
    ========================= */

    {

      id: "xinren",

      name: "來玩聚－新仁店",

      address: "台南市仁德區大同路三段755號1樓",

      items: [

        {
          name: "UX-17 隕星龍騎士3-70J",
          url: "https://lin.ee/tTAhGT3"
        },

        {
          name: "UX-01 蒼龍爆刃",
          url: "https://lin.ee/nuYlmLH"
        },

        {
          name: "CX-02 魔導至尊",
          url: "https://lin.ee/tq0RqsK"
        },

        {
          name: "CX-13 龍王閃擊",
          url: "https://lin.ee/nl38y5L"
        },

        {
          name: "CX-03 英仙幽冥",
          url: "https://lin.ee/ZE5JUbJ"
        },

        {
          name: "CX-15 邪神狂怒",
          url: "https://lin.ee/UmlFuwJ"
        },

        {
          name: "UX-14 天蠍長矛0-70Z",
          url: "https://lin.ee/n6dqbHP"
        },

        {
          name: "CX-14 騎士堡壘",
          url: "https://lin.ee/qrUV8kv"
        },

        {
          name: "CX-16 極限衝擊對戰組C",
          url: "https://lin.ee/u3FDNal"
        },

        {
          name: "UX-13 魔像奇岩",
          url: "https://lin.ee/yEo1r1E"
        },

        {
          name: "UX-16 時鐘幻象 隨機強化組",
          url: "https://lin.ee/rhLjZmm"
        },

        {
          name: "CX-17 隨機強化組 Vol.10",
          url: "https://lin.ee/5o4Q1jz"
        },

        {
          name: "CX-08 隨機強化組 Vol.7",
          url: "https://lin.ee/sNxPaLF"
        },

        {
          name: "CX-05 隨機強化組 Vol.6",
          url: "https://lin.ee/UoYioG9"
        },

        {
          name: "CX-00福音戰士改造組",
          url: "https://lin.ee/oSniLZu"
        }

      ]

    },


    /* =========================
       三井
    ========================= */

    {

      id: "mitsui",

      name: "Funbox 台南三井",

      address: "",

      items: []

    },


    /* =========================
       遠百
    ========================= */

    {

      id: "far_east",

      name: "台南遠百",

      address: "",

      items: []

    },


    /* =========================
       南紡
    ========================= */

    {

      id: "nanshan",

      name: "台南南紡",

      address: "",

      items: []

    },


    /* =========================
       新天地
    ========================= */

    {

      id: "xintiandi",

      name: "台南新天地",

      address: "",

      items: []

    }

  ]

};


/* =========================================================
   狀態
========================================================= */

let selectedShop = "all";

let running = false;

let queue = [];

let index = 0;

let timer = null;

let countdownTimer = null;


/*
  每一個項目停留幾秒

  如果你之後覺得太快，
  可以改成 10、12、15。
*/

const NEXT_DELAY = 8;


/* =========================================================
   DOM
========================================================= */

const postsEl =
  document.querySelector("#posts");

const shopsEl =
  document.querySelector("#shops");

const itemsEl =
  document.querySelector("#items");

const lastSyncEl =
  document.querySelector("#lastSync");

const progressEl =
  document.querySelector("#progress");

const currentEl =
  document.querySelector("#current");

const statusEl =
  document.querySelector("#status");

const countdownEl =
  document.querySelector("#countdown");

const startBtn =
  document.querySelector("#start");

const stopBtn =
  document.querySelector("#stop");

const selectAllBtn =
  document.querySelector("#selectAll");


/* =========================================================
   初始化
========================================================= */

function init() {

  lastSyncEl.textContent =
    "資料已載入";

  renderPosts();

  renderShops();

  renderItems();

  updateButtons();

}


init();


/* =========================================================
   最新公告
========================================================= */

function renderPosts() {

  postsEl.innerHTML =
    DATA.shops
      .map(shop => {

        return `

          <article class="post">

            <div class="post-head">

              <strong>
                ${esc(shop.name)}
              </strong>

              <span class="badge">
                ${shop.items.length} 項
              </span>

            </div>


            <div class="post-items">

              ${
                shop.items.length

                ? shop.items
                    .slice(0, 4)
                    .map(item => esc(item.name))
                    .join("　·　")

                : "目前沒有抽選品項"
              }

              ${
                shop.items.length > 4
                  ? "　…"
                  : ""
              }

            </div>

          </article>

        `;

      })
      .join("");

}


/* =========================================================
   店家
========================================================= */

function renderShops() {

  let html = `

    <button
      class="shop-btn ${
        selectedShop === "all"
          ? "active"
          : ""
      }"
      data-shop="all"
    >

      <strong>
        全部店家
      </strong>

      <small>
        顯示全部抽選品
      </small>

    </button>

  `;


  DATA.shops.forEach(
    (shop, index) => {

      html += `

        <button
          class="shop-btn ${
            selectedShop === index
              ? "active"
              : ""
          }"
          data-shop="${index}"
        >

          <strong>
            ${esc(shop.name)}
          </strong>

          <small>
            ${shop.items.length} 個品項
          </small>

        </button>

      `;

    }
  );


  shopsEl.innerHTML = html;


  document
    .querySelectorAll(".shop-btn")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          if (running) {

            alert(
              "目前正在自動抽選中，請先按「停止」。"
            );

            return;

          }


          const value =
            button.dataset.shop;


          selectedShop =
            value === "all"
              ? "all"
              : Number(value);


          renderShops();

          renderItems();

        }
      );

    });

}


/* =========================================================
   取得目前商品
========================================================= */

function getVisibleItems() {

  const list = [];


  DATA.shops.forEach(
    (shop, shopIndex) => {

      if (
        selectedShop !== "all" &&
        selectedShop !== shopIndex
      ) {

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


  return list;

}


/* =========================================================
   商品
========================================================= */

function renderItems() {

  const list =
    getVisibleItems();


  if (!list.length) {

    itemsEl.innerHTML = `

      <p class="muted">
        目前沒有抽選品項。
      </p>

    `;

    return;

  }


  itemsEl.innerHTML =

    list
      .map(
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


              <a
                class="line-link"
                href="${escAttr(item.url)}"
                target="_blank"
                rel="noopener"
                onclick="event.stopPropagation()"
              >
                LINE
              </a>

            </label>

          `;

        }
      )
      .join("");

}


/* =========================================================
   全選
========================================================= */

selectAllBtn.addEventListener(
  "click",
  () => {

    document
      .querySelectorAll(".item-check")
      .forEach(
        checkbox => {

          checkbox.checked = true;

        }
      );

  }
);


/* =========================================================
   開始自動抽選
========================================================= */

startBtn.addEventListener(
  "click",
  startAutoDraw
);


function startAutoDraw() {

  if (running) {

    return;

  }


  const list =
    getVisibleItems();


  const checkboxes =
    [
      ...document.querySelectorAll(
        ".item-check"
      )
    ];


  queue =
    list.filter(
      (_, index) =>
        checkboxes[index]?.checked
    );


  if (!queue.length) {

    alert(
      "請至少選擇一個抽選品項。"
    );

    return;

  }


  /*
    清除舊計時器
  */

  clearTimers();


  /*
    開始
  */

  running = true;

  index = 0;


  document.body.classList.add(
    "running"
  );


  updateButtons();


  /*
    立即開始第一項
  */

  openCurrent();

}


/* =========================================================
   開啟目前項目
========================================================= */

function openCurrent() {

  if (!running) {

    return;

  }


  /*
    全部完成
  */

  if (
    index >= queue.length
  ) {

    finish();

    return;

  }


  const item =
    queue[index];


  /*
    顯示進度
  */

  progressEl.textContent =
    `${index + 1} / ${queue.length}`;


  /*
    顯示商品
  */

  currentEl.textContent =
    item.name;


  setStatus(
    `正在處理第 ${
      index + 1
    } 項：${item.name}`
  );


  /*
    開啟 LINE
  */

  openLine(item.url);


  /*
    開始倒數
  */

  startCountdown();

}


/* =========================================================
   開 LINE
========================================================= */

function openLine(url) {

  /*
    第一次開啟時直接開新視窗。

    後續自動切換也會嘗試使用同一個視窗。
  */

  try {

    if (
      !window.lineWindow ||
      window.lineWindow.closed
    ) {

      window.lineWindow =
        window.open(
          url,
          "funbox_line"
        );

    } else {

      window.lineWindow.location.href =
        url;

      window.lineWindow.focus();

    }

  } catch (error) {

    /*
      如果瀏覽器阻擋新視窗，
      就直接在目前頁面開啟。
    */

    window.location.href =
      url;

  }

}


/* =========================================================
   倒數
========================================================= */

function startCountdown() {

  clearCountdown();


  let remaining =
    NEXT_DELAY;


  countdownEl.textContent =
    `下一項將在 ${remaining} 秒後開啟`;


  countdownTimer =
    setInterval(
      () => {

        remaining--;


        if (
          remaining <= 0
        ) {

          clearCountdown();

          return;

        }


        countdownEl.textContent =
          `下一項將在 ${remaining} 秒後開啟`;

      },
      1000
    );


  /*
    8 秒後自動進入下一項
  */

  timer =
    setTimeout(
      () => {

        if (!running) {

          return;

        }


        index++;


        if (
          index >= queue.length
        ) {

          finish();

          return;

        }


        openCurrent();

      },
      NEXT_DELAY * 1000
    );

}


/* =========================================================
   停止
========================================================= */

stopBtn.addEventListener(
  "click",
  stopAutoDraw
);


function stopAutoDraw() {

  running = false;


  clearTimers();


  document.body.classList.remove(
    "running"
  );


  setStatus(
    "已停止"
  );


  currentEl.textContent =
    "已停止";


  countdownEl.textContent =
    "";


  updateButtons();

}


/* =========================================================
   完成
========================================================= */

function finish() {

  running = false;


  clearTimers();


  document.body.classList.remove(
    "running"
  );


  progressEl.textContent =
    `${queue.length} / ${queue.length}`;


  currentEl.textContent =
    "全部完成";


  setStatus(
    "🎉 全部項目已完成"
  );


  countdownEl.textContent =
    "";


  updateButtons();

}


/* =========================================================
   清除計時器
========================================================= */

function clearTimers() {

  if (timer) {

    clearTimeout(timer);

    timer = null;

  }


  clearCountdown();

}


function clearCountdown() {

  if (countdownTimer) {

    clearInterval(
      countdownTimer
    );

    countdownTimer = null;

  }

}


/* =========================================================
   按鈕狀態
========================================================= */

function updateButtons() {

  startBtn.disabled =
    running;


  stopBtn.disabled =
    !running;

}


/* =========================================================
   狀態文字
========================================================= */

function setStatus(text) {

  statusEl.innerHTML = `

    <span class="dot"></span>

    ${esc(text)}

  `;

}


/* =========================================================
   HTML 防護
========================================================= */

function esc(value) {

  return String(
    value ?? ""
  ).replace(
    /[&<>"']/g,
    char => ({

      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"

    }[char])
  );

}


function escAttr(value) {

  return esc(value);

}
