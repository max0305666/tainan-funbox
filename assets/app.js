let DATA=null, selectedShop="all", running=false, queue=[], index=0;

async function loadData(){
  try{
    const r=await fetch("data/shops.json",{cache:"no-store"});
    DATA=await r.json();
  }catch(e){
    document.querySelector("#lastSync").textContent="資料讀取失敗";
    return;
  }
  renderPosts(); renderShops(); renderItems();
  document.querySelector("#lastSync").textContent="同步 "+(DATA.updatedAt||"尚未設定");
}
function renderPosts(){
  document.querySelector("#posts").innerHTML=DATA.shops.map(s=>`
    <article class="post">
      <div class="post-head"><strong>${esc(s.name)}</strong><span class="badge">${s.items.length} 項</span></div>
      <div class="post-items">${s.items.slice(0,4).map(x=>esc(x.name)).join("　·　")}${s.items.length>4?"　…":""}</div>
    </article>`).join("");
}
function renderShops(){
  const html=[`<button class="shop-btn ${selectedShop==="all"?"active":""}" onclick="chooseShop('all')"><strong>全部店家</strong><small>顯示全部抽選品</small></button>`]
  .concat(DATA.shops.map((s,i)=>`<button class="shop-btn ${selectedShop===i?"active":""}" onclick="chooseShop(${i})"><strong>${esc(s.name)}</strong><small>${s.items.length} 個品項</small></button>`));
  document.querySelector("#shops").innerHTML=html.join("");
}
function chooseShop(i){selectedShop=i;renderShops();renderItems()}
function renderItems(){
  let list=[];
  DATA.shops.forEach((s,si)=>{if(selectedShop==="all"||selectedShop===si)s.items.forEach((x,ii)=>list.push({...x,si,ii,shop:s.name}))});
  document.querySelector("#items").innerHTML=list.length?list.map((x,k)=>`
    <label class="item"><input type="checkbox" class="item-check" data-k="${k}" checked>
      <span class="item-main"><span class="item-name">${esc(x.name)}</span><span class="item-shop">${esc(x.shop)}</span></span>
      <a class="line-link" href="${escAttr(x.url)}" target="_blank" rel="noopener">LINE</a>
    </label>`).join(""):`<p class="muted">目前沒有抽選品項。</p>`;
}
document.querySelector("#selectAll").onclick=()=>document.querySelectorAll(".item-check").forEach(x=>x.checked=true);
document.querySelector("#start").onclick=start;
document.querySelector("#stop").onclick=()=>{running=false;setStatus("已停止");};
function start(){
  const list=[];
  DATA.shops.forEach((s,si)=>{if(selectedShop==="all"||selectedShop===si)s.items.forEach((x,ii)=>list.push({...x,shop:s.name,si,ii}))});
  const checks=[...document.querySelectorAll(".item-check")];
  queue=list.filter((_,i)=>checks[i]?.checked);
  if(!queue.length){alert("請至少選擇一個品項");return}
  running=true;index=0;document.body.classList.add("running");next();
}
function next(){
  if(!running)return;
  if(index>=queue.length){running=false;setStatus("全部項目已依序開啟");document.querySelector("#current").textContent="完成";return}
  const x=queue[index];
  document.querySelector("#progress").textContent=`${index+1} / ${queue.length}`;
  document.querySelector("#current").textContent=x.name;
  setStatus(`準備開啟 ${x.shop}`);
  window.open(x.url,"_blank");
  index++;
  setTimeout(next,8000);
}
function setStatus(t){document.querySelector("#status").innerHTML=`<span class="dot"></span>${esc(t)}`}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function escAttr(s){return esc(s)}
loadData();
