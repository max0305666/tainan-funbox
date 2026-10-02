function start(){
  const list=[];

  DATA.shops.forEach((s,si)=>{
    if(selectedShop==="all"||selectedShop===si){
      s.items.forEach((x,ii)=>{
        list.push({...x,shop:s.name,si,ii});
      });
    }
  });

  const checks=[...document.querySelectorAll(".item-check")];

  queue=list.filter((_,i)=>checks[i]?.checked);

  if(!queue.length){
    alert("請至少選擇一個品項");
    return;
  }

  running=true;
  index=0;

  document.body.classList.add("running");

  openCurrentItem();
}


function openCurrentItem(){

  if(index >= queue.length){
    finish();
    return;
  }

  const x=queue[index];

  document.querySelector("#progress").textContent =
    `${index+1} / ${queue.length}`;

  document.querySelector("#current").textContent =
    x.name;

  setStatus(`正在抽選：${x.name}`);

  // 直接開 LINE
  window.open(x.url,"_blank");
}


function next(){

  if(!running) return;

  index++;

  if(index >= queue.length){
    finish();
    return;
  }

  // 按下一個就直接開下一個 LINE
  openCurrentItem();
}


function finish(){

  running=false;

  setStatus("🎉 全部項目已完成");

  document.querySelector("#progress").textContent =
    `${queue.length} / ${queue.length}`;

  document.querySelector("#current").textContent =
    "全部完成";
}
