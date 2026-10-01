let DATA = null;
let selectedShop = "all";
let running = false;
let queue = [];
let index = 0;


/* =========================
   讀取資料
========================= */

async function loadData(){

  try{

    const r = await fetch("data/shops.json", {
      cache: "no-store"
    });

    if(!r.ok){
      throw new Error("shops.json 讀取失敗");
    }

    DATA = await r.json();

  }catch(e){

    console.error(e);

    const sync = document.querySelector("#lastSync");

    if(sync){
      sync.textContent = "資料讀取失敗";
    }

    const posts = document.querySelector("#posts");

    if(posts){
      posts.innerHTML = `
        <p class="muted">
          無法讀取店家資料，請稍後重新整理。
        </p>
      `;
    }

    return;
  }


  /* 防止 posts 不存在造成錯誤 */

  if(!Array.isArray(DATA.posts)){
    DATA.posts = [];
  }


  renderPosts();
  renderShops();
  renderItems();


  const sync = document.querySelector("#lastSync");

  if(sync){
    sync.textContent =
      "同步 " + (DATA.updatedAt || "尚未設定");
  }


  setupPostModal();
}


/* =========================
   Facebook / 最新貼文
========================= */

function renderPosts(){

  const container = document.querySelector("#posts");

  if(!container) return;


  /* 如果目前沒有手動貼文 */

  if(!DATA.posts.length){

    container.innerHTML = DATA.shops.map(s => `

      <article class="post">

        <div class="post-head">
          <strong>${esc(s.name)}</strong>

          <span class="badge">
            ${s.items.length} 項
          </span>
        </div>

        <div class="post-items">
          ${
            s.items
              .slice(0,4)
              .map(x => esc(x.name))
              .join("　·　")
          }

          ${s.items.length > 4 ? "　…" : ""}
        </div>

      </article>

    `).join("");

    return;
  }


  /* 顯示真正的 Facebook 貼文 */

  container.innerHTML = DATA.posts
    .slice()
    .reverse()
    .map(post => `

      <article class="post">

        <div class="post-head">

          <strong>
            ${esc(post.shop || "店家")}
          </strong>

          <span class="badge">
            ${esc(post.date || "")}
          </span>

        </div>


        ${
          post.content
            ? `
              <div class="post-content">
                ${esc(post.content)}
              </div>
            `
            : ""
        }


        ${
          post.image
            ? `
              <img
                class="post-image"
                src="${escAttr(post.image)}"
                alt="Facebook 貼文圖片"
                loading="lazy"
              >
            `
            : ""
        }


        ${
          post.url
            ? `
              <a
                class="facebook-link"
                href="${escAttr(post.url)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                查看 Facebook 原文 →
              </a>
            `
            : ""
        }

      </article>

    `).join("");
}


/* =========================
   店家
========================= */

function renderShops(){

  const container = document.querySelector("#shops");

  if(!container) return;


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

  ].concat(

    DATA.shops.map((s,i) => `

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

    `)

  );


  container.innerHTML = html.join("");
}


/* =========================
   選擇店家
========================= */

function chooseShop(i){

  selectedShop = i;

  renderShops();
  renderItems();
}


/* =========================
   品項
========================= */

function renderItems(){

  const container = document.querySelector("#items");

  if(!container) return;


  let list = [];


  DATA.shops.forEach((s,si) => {

    if(
      selectedShop === "all" ||
      selectedShop === si
    ){

      s.items.forEach((x,ii) => {

        list.push({
          ...x,
          si,
          ii,
          shop: s.name
        });

      });

    }

  });


  if(!list.length){

    container.innerHTML = `
      <p class="muted">
        目前沒有抽選品項。
      </p>
    `;

    return;
  }


  container.innerHTML = list.map((x,k) => `

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
      >
        LINE
      </a>

    </label>

  `).join("");
}


/* =========================
   全選
========================= */

const selectAll =
  document.querySelector("#selectAll");

if(selectAll){

  selectAll.onclick = () => {

    document
      .querySelectorAll(".item-check")
      .forEach(x => {
        x.checked = true;
      });

  };

}


/* =========================
   開始 / 停止
========================= */

const startBtn =
  document.querySelector("#start");

if(startBtn){
  startBtn.onclick = start;
}


const stopBtn =
  document.querySelector("#stop");

if(stopBtn){

  stopBtn.onclick = () => {

    running = false;

    setStatus("已停止");

  };

}


/* =========================
   開始抽選
========================= */

function start(){

  const list = [];


  DATA.shops.forEach((s,si) => {

    if(
      selectedShop === "all" ||
      selectedShop === si
    ){

      s.items.forEach((x,ii) => {

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


  queue = list.filter(
    (_,i) => checks[i]?.checked
  );


  if(!queue.length){

    alert("請至少選擇一個品項");

    return;
  }


  running = true;
  index = 0;

  document.body.classList.add("running");

  next();
}


/* =========================
   下一個
========================= */

function next(){

  if(!running) return;


  if(index >= queue.length){

    running = false;

    setStatus("全部項目已依序開啟");

    const current =
      document.querySelector("#current");

    if(current){
      current.textContent = "完成";
    }

    return;
  }


  const x = queue[index];


  const progress =
    document.querySelector("#progress");

  if(progress){

    progress.textContent =
      `${index + 1} / ${queue.length}`;

  }


  const current =
    document.querySelector("#current");

  if(current){

    current.textContent = x.name;

  }


  setStatus(`準備開啟 ${x.shop}`);


  window.open(
    x.url,
    "_blank"
  );


  index++;


  setTimeout(
    next,
    8000
  );
}


/* =========================
   狀態
========================= */

function setStatus(t){

  const status =
    document.querySelector("#status");

  if(!status) return;


  status.innerHTML =
    `<span class="dot"></span>${esc(t)}`;
}


/* =========================
   新增貼文視窗
========================= */

function setupPostModal(){

  const modal =
    document.querySelector("#postModal");

  const openBtn =
    document.querySelector("#addPostBtn");

  const closeBtn =
    document.querySelector("#closePostModal");

  const cancelBtn =
    document.querySelector("#cancelPost");

  const backdrop =
    document.querySelector("#modalBackdrop");

  const form =
    document.querySelector("#postForm");

  const shopSelect =
    document.querySelector("#postShop");


  if(!modal || !openBtn || !form){

    console.warn(
      "找不到新增貼文視窗元件"
    );

    return;
  }


  /* 填入店家 */

  if(shopSelect){

    shopSelect.innerHTML = `

      <option value="">
        請選擇店家
      </option>

      ${
        DATA.shops.map((shop,index) => `
          <option value="${index}">
            ${esc(shop.name)}
          </option>
        `).join("")
      }

    `;

  }


  /* 開啟 */

  openBtn.onclick = () => {

    modal.classList.add("show");

  };


  /* 關閉 */

  function closeModal(){

    modal.classList.remove("show");

  }


  if(closeBtn){
    closeBtn.onclick = closeModal;
  }


  if(cancelBtn){
    cancelBtn.onclick = closeModal;
  }


  if(backdrop){
    backdrop.onclick = closeModal;
  }


  /* ESC 關閉 */

  document.addEventListener(
    "keydown",
    e => {

      if(
        e.key === "Escape" &&
        modal.classList.contains("show")
      ){

        closeModal();

      }

    }
  );


  /* 提交 */

  form.onsubmit = e => {

    e.preventDefault();


    const shopIndex =
      shopSelect.value;


    const url =
      document
        .querySelector("#postUrl")
        .value
        .trim();


    const content =
      document
        .querySelector("#postContent")
        .value
        .trim();


    const image =
      document
        .querySelector("#postImage")
        .value
        .trim();


    if(shopIndex === ""){

      alert("請選擇店家");

      return;
    }


    if(!url){

      alert("請輸入 Facebook 貼文網址");

      return;
    }


    if(!content){

      alert("請輸入貼文內容");

      return;
    }


    const newPost = {

      shop:
        DATA.shops[
          Number(shopIndex)
        ].name,

      url: url,

      content: content,

      image: image,

      date:
        new Date()
          .toLocaleDateString("zh-TW")

    };


    DATA.posts.push(newPost);


    renderPosts();


    form.reset();


    closeModal();


    alert(
      "貼文已新增！\n\n目前只是暫存在這個瀏覽器頁面，重新整理後會消失。"
    );

  };

}


/* =========================
   HTML 安全處理
========================= */

function esc(s){

  return String(s ?? "")
    .replace(
      /[&<>"']/g,
      c => ({
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        '"':"&quot;",
        "'":"&#39;"
      }[c])
    );

}


function escAttr(s){

  return esc(s);

}


/* =========================
   啟動
========================= */

loadData();
