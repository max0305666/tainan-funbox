let DATA=null, selectedShop="all", running=false, queue=[], index=0;

async function loadData(){
  try{
    const r=await fetch("data/shops.json",{cache:"no-store"});
    DATA=await r.json();
  }catch(e){
    document.querySelector("#lastSync").textContent="資料讀取失敗";
    return;
  }

  renderPosts();
  renderShops();
  renderItems();
  setupPostModal();

  document.querySelector("#lastSync").textContent=
    "同步 "+(DATA.updatedAt||"尚未設定");
}


/* =========================
   店家公告
========================= */

function renderPosts(){

  const posts = DATA.posts || [];

  if(posts.length){

    document.querySelector("#posts").innerHTML =
      posts
      .slice()
      .reverse()
      .map(p=>`
        <article class="post">

          <div class="post-head">
            <strong>${esc(p.shop||"店家公告")}</strong>
            ${p.date ? `<span class="badge">${esc(p.date)}</span>` : ""}
          </div>

          <div class="post-content">
            ${esc(p.content||"")}
          </div>

          ${p.image ? `
            <img
              class="post-image"
              src="${escAttr(p.image)}"
              alt="${escAttr(p.shop||"店家貼文")}"
              loading="lazy"
            >
          ` : ""}

          ${p.url ? `
            <a
              class="facebook-link"
              href="${escAttr(p.url)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              在 Facebook 查看原文 →
            </a>
          ` : ""}

        </article>
      `)
      .join("");

    return;
  }


  /*
    如果目前還沒有 posts，
    保留原本店家品項公告的顯示方式
  */

  document.querySelector("#posts").innerHTML =
    DATA.shops.map(s=>`
      <article class="post">

        <div class="post-head">
          <strong>${esc(s.name)}</strong>

          <span class="badge">
            ${s.items.length} 項
          </span>
        </div>

        <div class="post-items">
          ${s.items.slice(0,4)
            .map(x=>esc(x.name))
            .join("　·　")}
          ${s.items.length>4?"　…":""}
        </div>

      </article>
    `)
    .join("");
}


/* =========================
   店家
========================= */

function renderShops(){

  const html=[
    `<button
      class="shop-btn ${selectedShop==="all"?"active":""}"
      onclick="chooseShop('all')"
    >
      <strong>全部店家</strong>
      <small>顯示全部抽選品</small>
    </button>`
  ]
  .concat(
    DATA.shops.map((s,i)=>`
      <button
        class="shop-btn ${selectedShop===i?"active":""}"
        onclick="chooseShop(${i})"
      >
        <strong>${esc(s.name)}</strong>
        <small>${s.items.length} 個品項</small>
      </button>
    `)
  );

  document.querySelector("#shops").innerHTML=html.join("");
}


function chooseShop(i){
  selectedShop=i;
  renderShops();
  renderItems();
}


/* =========================
   抽選品項
========================= */

function renderItems(){

  let list=[];

  DATA.shops.forEach((s,si)=>{

    if(selectedShop==="all"||selectedShop===si){

      s.items.forEach((x,ii)=>{

        list.push({
          ...x,
          si,
          ii,
          shop:s.name
        });

      });

    }

  });


  document.querySelector("#items").innerHTML=

    list.length

    ?

    list.map((x,k)=>`

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
        >
          LINE
        </a>

      </label>

    `).join("")

    :

    `<p class="muted">目前沒有抽選品項。</p>`;
}


/* =========================
   全選
========================= */

document.querySelector("#selectAll").onclick=()=>{

  document
    .querySelectorAll(".item-check")
    .forEach(x=>x.checked=true);

};


/* =========================
   自動抽選
========================= */

document.querySelector("#start").onclick=start;

document.querySelector("#stop").onclick=()=>{
  running=false;
  setStatus("已停止");
};


function start(){

  const list=[];

  DATA.shops.forEach((s,si)=>{

    if(selectedShop==="all"||selectedShop===si){

      s.items.forEach((x,ii)=>{

        list.push({
          ...x,
          shop:s.name,
          si,
          ii
        });

      });

    }

  });


  const checks=[
    ...document.querySelectorAll(".item-check")
  ];

  queue=list.filter((_,i)=>checks[i]?.checked);


  if(!queue.length){

    alert("請至少選擇一個品項");
    return;

  }


  running=true;
  index=0;

  document.body.classList.add("running");

  next();

}


function next(){

  if(!running)return;

  if(index>=queue.length){

    running=false;

    setStatus("全部項目已依序開啟");

    document.querySelector("#current").textContent="完成";

    return;

  }


  const x=queue[index];

  document.querySelector("#progress").textContent=
    `${index+1} / ${queue.length}`;

  document.querySelector("#current").textContent=x.name;

  setStatus(`準備開啟 ${x.shop}`);

  window.open(x.url,"_blank");

  index++;

  setTimeout(next,8000);

}


/* =========================
   狀態
========================= */

function setStatus(t){

  document.querySelector("#status").innerHTML=
    `<span class="dot"></span>${esc(t)}`;

}


/* =========================
   新增貼文
========================= */

function setupPostModal(){

  const modal=document.querySelector("#postModal");
  const openBtn=document.querySelector("#addPostBtn");
  const closeBtn=document.querySelector("#closePostModal");
  const cancelBtn=document.querySelector("#cancelPost");
  const backdrop=document.querySelector("#modalBackdrop");
  const form=document.querySelector("#postForm");
  const shopSelect=document.querySelector("#postShop");


  if(!modal||!openBtn||!form)return;


  /*
    把現有店家放進下拉選單
  */

  shopSelect.innerHTML=
    `<option value="">請選擇店家</option>`+
    DATA.shops
      .map((s,i)=>
        `<option value="${i}">
          ${esc(s.name)}
        </option>`
      )
      .join("");


  function openModal(){

    modal.classList.add("show");
    modal.setAttribute("aria-hidden","false");

  }


  function closeModal(){

    modal.classList.remove("show");
    modal.setAttribute("aria-hidden","true");

    form.reset();

  }


  openBtn.onclick=openModal;
  closeBtn.onclick=closeModal;
  cancelBtn.onclick=closeModal;
  backdrop.onclick=closeModal;


  /*
    新增貼文
  */

  form.onsubmit=(e)=>{

    e.preventDefault();


    const shopIndex=Number(shopSelect.value);

    if(!Number.isInteger(shopIndex)||!DATA.shops[shopIndex]){

      alert("請選擇店家");
      return;

    }


    const content=
      document.querySelector("#postContent").value.trim();

    if(!content){

      alert("請輸入貼文內容");
      return;

    }


    const post={

      shop:DATA.shops[shopIndex].name,

      url:
        document.querySelector("#postUrl").value.trim(),

      content:content,

      image:
        document.querySelector("#postImage").value.trim(),

      date:
        new Date().toLocaleDateString("zh-TW")

    };


    /*
      暫時先加入目前頁面資料。
      下一步會接 GitHub API，
      讓資料真正永久保存。
    */

    if(!DATA.posts){
      DATA.posts=[];
    }


    DATA.posts.push(post);

    renderPosts();

    closeModal();

    alert("貼文已新增！");

  };

}


/* =========================
   安全文字處理
========================= */

function esc(s){

  return String(s??"").replace(
    /[&<>"']/g,
    c=>({
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


loadData();
