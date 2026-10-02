let DATA = null;
let selectedShop = "all";
let running = false;
let queue = [];
let index = 0;
let currentOpened = false;

async function loadData() {
  try {
    const r = await fetch("data/shops.json", { cache: "no-store" });
    DATA = await r.json();
  } catch (e) {
    document.querySelector("#lastSync").textContent = "資料讀取失敗";
    return;
  }

  renderPosts();
  renderShops();
  renderItems();

  document.querySelector("#lastSync").textContent =
    "同步 " + (DATA.updatedAt || "尚未設定");

  updateControls();
}


function renderPosts() {
  document.querySelector("#posts").innerHTML =
    DATA.shops.map(s => `
      <article class="post">
        <div class="post-head">
          <strong>${esc(s.name)}</strong>
          <span class="badge">${s.items.length} 項</span>
        </div>

        <div class="post-items">
          ${s.items.slice(0, 4).map(x => esc(x.name)).join("　·　")}
          ${s.items.length > 4 ? "　…" : ""}
        </div>
      </article>
    `).join("");
}


function renderShops() {
  const html = [
    `<button class="shop-btn ${selectedShop === "all" ? "active" : ""}"
      onclick="chooseShop('all')">
      <strong>全部店家</strong>
      <small>顯示全部抽選品</small>
    </button>`
  ]
  .concat(
    DATA.shops.map((s, i) => `
      <button class="shop-btn ${selectedShop === i ? "active" : ""}"
        onclick="chooseShop(${i})">
        <strong>${esc(s.name)}</strong>
        <small>${s.items.length} 個品項</small>
      </button>
    `)
  );

  document.querySelector("#shops").innerHTML = html.join("");
}


function chooseShop(i) {
  if (running) {
    alert("抽選進行中，請先停止目前流程。");
    return;
  }

  selectedShop = i;
  renderShops();
  renderItems();
}


function renderItems() {
  let list = [];

  DATA.shops.forEach((s, si) => {
    if (selectedShop === "all" || selectedShop === si) {
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

  document.querySelector("#items").innerHTML =
    list.length
      ? list.map((x, k) => `
        <label class="item">
          <input
            type="checkbox"
            class="item-check"
            data-k="${k}"
            checked
          >

          <span class="item-main">
            <span class="item-name">${esc(x.name)}</span>
            <span class="item-shop">${esc(x.shop)}</span>
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
      `).join("")
      : `<p class="muted">目前沒有抽選品項。</p>`;
}


document.querySelector("#selectAll").onclick = () => {
  document
    .querySelectorAll(".item-check")
    .forEach(x => x.checked = true);
};


document.querySelector("#start").onclick = start;


document.querySelector("#openCurrent").onclick = openCurrent;


document.querySelector("#next").onclick = next;


document.querySelector("#stop").onclick = stop;


function start() {

  if (!DATA) {
    alert("資料尚未載入完成");
    return;
  }

  const list = [];

  DATA.shops.forEach((s, si) => {

    if (selectedShop === "all" || selectedShop === si) {

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


  const checks = [
    ...document.querySelectorAll(".item-check")
  ];


  queue = list.filter((_, i) => checks[i]?.checked);


  if (!queue.length) {
    alert("請至少選擇一個品項");
    return;
  }


  running = true;
  index = 0;
  currentOpened = false;

  document.body.classList.add("running");

  showCurrent();

  setStatus("準備開始抽選");

  updateControls();
}


function showCurrent() {

  if (!queue.length || index >= queue.length) {
    finish();
    return;
  }


  const x = queue[index];


  document.querySelector("#progress").textContent =
    `${index + 1} / ${queue.length}`;


  document.querySelector("#current").textContent =
    x.name;


  const currentItem =
    document.querySelector("#currentItem");

  const currentName =
    document.querySelector("#currentName");


  if (currentItem) {
    currentItem.hidden = false;
  }


  if (currentName) {
    currentName.textContent = x.name;
  }


  currentOpened = false;

  setStatus(`準備抽選：${x.name}`);

  updateControls();
}


function openCurrent() {

  if (!running) {
    alert("請先按「開始抽選」");
    return;
  }


  if (index >= queue.length) {
    finish();
    return;
  }


  const x = queue[index];


  window.open(
    x.url,
    "_blank"
  );


  currentOpened = true;


  setStatus(
    `已開啟 ${x.name}，完成抽選後回來按「下一個」`
  );


  updateControls();
}


function next() {

  if (!running) {
    return;
  }


  if (!currentOpened) {
    alert("請先開啟目前的 LINE 抽選連結。");
    return;
  }


  index++;


  if (index >= queue.length) {
    finish();
    return;
  }


  showCurrent();
}


function finish() {

  running = false;
  currentOpened = false;

  document.body.classList.remove("running");


  document.querySelector("#progress").textContent =
    `${queue.length} / ${queue.length}`;


  document.querySelector("#current").textContent =
    "全部完成";


  const currentItem =
    document.querySelector("#currentItem");


  if (currentItem) {
    currentItem.hidden = false;
  }


  const currentName =
    document.querySelector("#currentName");


  if (currentName) {
    currentName.textContent =
      "🎉 全部抽選完成";
  }


  setStatus("🎉 全部項目已完成");


  updateControls();
}


function stop() {

  running = false;
  currentOpened = false;

  document.body.classList.remove("running");

  setStatus("已停止");

  document.querySelector("#current").textContent =
    "已停止";

  updateControls();
}


function updateControls() {

  const startBtn =
    document.querySelector("#start");

  const openBtn =
    document.querySelector("#openCurrent");

  const nextBtn =
    document.querySelector("#next");


  if (!startBtn || !openBtn || !nextBtn) {
    return;
  }


  startBtn.disabled = running;


  openBtn.disabled =
    !running ||
    index >= queue.length ||
    currentOpened;


  nextBtn.disabled =
    !running ||
    !currentOpened;
}


function setStatus(t) {

  document.querySelector("#status").innerHTML =
    `<span class="dot"></span>${esc(t)}`;
}


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


function escAttr(s) {
  return esc(s);
}


loadData();
