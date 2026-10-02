let DATA = null;

let selectedShop = "all";

let running = false;

let queue = [];

let index = 0;


/* =========================
   讀取資料
========================= */

async function loadData() {

  try {

    const r = await fetch(
      "data/shops.json",
      {
        cache: "no-store"
      }
    );

    DATA = await r.json();

  } catch (e) {

    document.querySelector("#lastSync").textContent =
      "資料讀取失敗";

    return;
  }


  renderPosts();

  renderShops();

  renderItems();


  document.querySelector("#lastSync").textContent =
    "同步 " + (DATA.updatedAt || "尚未設定");


  updateButtons();
}



/* =========================
   最新公告
========================= */

function renderPosts() {

  document.querySelector("#posts").innerHTML =
    DATA.shops.map(s => `

      <article class="post">

        <div class="post-head">

          <strong>
            ${esc(s.name)}
          </strong>

          <span class="badge">
            ${s.items.length} 項
          </span>

        </div>


        <div class="post-items">

          ${
            s.items
              .slice(0, 4)
              .map(x => esc(x.name))
              .join("　·　")
          }

          ${
            s.items.length > 4
              ? "　…"
              : ""
          }

        </div>

      </article>

    `).join("");

}



/* =========================
   店家
========================= */

function renderShops() {

  const html = [

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

  ];


  DATA.shops.forEach((s, i) => {

    html.push(`

      <button
        class="shop-btn ${selectedShop === i ? "active" : ""}"
        onclick="chooseShop(${i})"
      >

        <strong>
          ${esc(s.name)}
        </strong>

        <small>
          ${s.items.length} 個品項
        </small>

      </button>

    `);

  });


  document.querySelector("#shops").innerHTML =
    html.join("");

}



/* =========================
   選擇店家
========================= */

function chooseShop(i) {

  /*
    抽選進行中時不允許切換店家，
    避免抽選順序跑掉。
  */

  if (running) {

    alert(
      "目前正在抽選中，請先按「停止」。"
    );

    return;
  }


  selectedShop = i;

  renderShops();

  renderItems();

}



/* =========================
   商品列表
========================= */

function renderItems() {

  let list = [];


  DATA.shops.forEach((s, si) => {

    if (
      selectedShop === "all" ||
      selectedShop === si
    ) {

      s.items.forEach((x, ii) => {

        list.push({

          ...x,

          si: si,

          ii: ii,

          shop: s.name

        });

      });

    }

  });


  if (!list.length) {

    document.querySelector("#items").innerHTML = `

      <p class="muted">
        目前沒有抽選品項。
      </p>

    `;

    return;
  }


  document.querySelector("#items").innerHTML =

    list.map((x, k) => `

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
          rel="noopener"
          onclick="event.stopPropagation()"
        >
          LINE
        </a>

      </label>

    `).join("");

}



/* =========================
   全選
========================= */

document.querySelector("#selectAll").onclick = () => {

  document
    .querySelectorAll(".item-check")
    .forEach(x => {

      x.checked = true;

    });

};



/* =========================
   開始抽選
========================= */

document.querySelector("#start").onclick = start;


function start() {

  if (!DATA) {

    alert(
      "資料尚未載入完成，請稍候再試。"
    );

    return;
  }


  /*
    建立目前店家 / 全部店家的商品清單
  */

  const list = [];


  DATA.shops.forEach((s, si) => {

    if (
      selectedShop === "all" ||
      selectedShop === si
    ) {

      s.items.forEach((x, ii) => {

        list.push({

          ...x,

          shop: s.name,

          si: si,

          ii: ii

        });

      });

    }

  });


  /*
    取得使用者勾選的商品
  */

  const checks = [

    ...document.querySelectorAll(
      ".item-check"
    )

  ];


  queue = list.filter(
    (_, i) => checks[i]?.checked
  );


  /*
    沒有選商品
  */

  if (!queue.length) {

    alert(
      "請至少選擇一個品項。"
    );

    return;
  }


  /*
    開始流程
  */

  running = true;

  index = 0;


  document.body.classList.add(
    "running"
  );


  /*
    直接開第一個 LINE
  */

  openCurrent();


  updateButtons();

}



/* =========================
   開啟目前商品
========================= */

function openCurrent() {

  if (!running) {

    return;
  }


  /*
    所有商品都完成
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
    更新進度
  */

  document.querySelector(
    "#progress"
  ).textContent =

    `${index + 1} / ${queue.length}`;


  /*
    更新目前商品
  */

  document.querySelector(
    "#current"
  ).textContent =

    item.name;


  /*
    更新狀態
  */

  setStatus(
    `正在抽選：${item.name}`
  );


  /*
    直接開 LINE
  */

  window.open(
    item.url,
    "_blank"
  );


  updateButtons();

}



/* =========================
   下一個
========================= */

document.querySelector("#next").onclick = next;


function next() {

  if (!running) {

    return;
  }


  /*
    下一個商品
  */

  index++;


  /*
    如果已經沒有下一個
  */

  if (
    index >= queue.length
  ) {

    finish();

    return;
  }


  /*
    直接開下一個 LINE
  */

  openCurrent();

}



/* =========================
   停止
========================= */

document.querySelector("#stop").onclick = stop;


function stop() {

  running = false;


  document.body.classList.remove(
    "running"
  );


  setStatus(
    "已停止"
  );


  document.querySelector(
    "#current"
  ).textContent =

    "已停止";


  updateButtons();

}



/* =========================
   全部完成
========================= */

function finish() {

  running = false;


  document.body.classList.remove(
    "running"
  );


  document.querySelector(
    "#progress"
  ).textContent =

    `${queue.length} / ${queue.length}`;


  document.querySelector(
    "#current"
  ).textContent =

    "全部完成";


  setStatus(
    "🎉 全部項目已完成"
  );


  updateButtons();

}



/* =========================
   按鈕狀態
========================= */

function updateButtons() {

  const startButton =
    document.querySelector("#start");


  const nextButton =
    document.querySelector("#next");


  /*
    開始按鈕
  */

  startButton.disabled =
    running;


  /*
    下一個按鈕

    抽選進行中才可以按
  */

  nextButton.disabled =
    !running;

}



/* =========================
   狀態文字
========================= */

function setStatus(text) {

  document.querySelector(
    "#status"
  ).innerHTML = `

    <span class="dot"></span>

    ${esc(text)}

  `;

}



/* =========================
   HTML 安全處理
========================= */

function esc(s) {

  return String(
    s ?? ""
  ).replace(
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


function escAttr(s) {

  return esc(s);

}



/* =========================
   啟動
========================= */

loadData();
