import {content} from "./data/content.js";
import {createGame,inspect,play,endDay,actorFree} from "./engine/game.js";
import {drawBoard,clockSvg,clockModel,nodeById,nodePath,visibleKids} from "./ui/board.js";

const $=s=>document.querySelector(s);
const map=$("#map"),panel=$("#panel"),hand=$("#hand"),veil=$("#veil"),sheet=$("#sheet");
const toastEl=$("#toast");
const STORAGE="black-table-rpg:v1";
let state;
try { state=JSON.parse(localStorage.getItem(STORAGE)||"null")||createGame(content); }
catch { state=createGame(content); }
if(!state?.clocks?.c_zhuan_pressure) state=createGame(content);
let selected=null,armed=null,slots={},extras={},drag=null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sign=n=>(n>0?"+":"−")+Math.abs(n);
const save=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch{}};
const byNode=content.nodes;
const resultName={s:"成功",n:"有代价",f:"失败"};

function toast(message) {
  toastEl.textContent=message;toastEl.hidden=false;
  clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>toastEl.hidden=true,2400);
}
function resetChoice() {slots={};extras={};armed=null;}
function select(id) {selected=id;resetChoice();render();}
function back() {if(selected)select(nodeById[selected].parent||null);}
function inspectSlot(id,ids=slots[id]||[]) {
  return inspect(state,content,id,ids,extras[id]||0);
}
function place(id,card) {
  if(!card||!state.hand.includes(card)) return;
  const ids=slots[id]||[];
  if(ids.includes(card)) return;
  const p=inspectSlot(id,[...ids,card]);
  if(!p.ok){toast(p.reason);return;}
  slots[id]=[...ids,card];armed=null;render();
}
function remove(id,card) {slots[id]=(slots[id]||[]).filter(x=>x!==card);render();}
function probability(p) {
  return '<i class="ps" style="width:'+p.s+'%">'+(p.s>=12?p.s:"")+'</i>'+
    '<i class="pn" style="width:'+p.n+'%">'+(p.n>=12?p.n:"")+'</i>'+
    '<i class="pf" style="width:'+p.f+'%">'+(p.f>=12?p.f:"")+'</i>';
}
function clockRow(id) {
  const c=clockModel(id);
  return '<div class="crow" data-c="'+id+'">'+clockSvg(id,38)+'<div><b>'+c.name+'</b>'+
    '<small>'+c.v+'/'+c.size+(c.done?' · 已完成':'')+'</small><span class="res">'+c.res+'</span></div></div>';
}
function linkClock(id,label) {
  const c=clockModel(id);
  return '<span class="lk">'+clockSvg(id,16)+'<em>'+label+c.name+'</em><small>'+c.v+'/'+c.size+'</small></span>';
}
function actionHTML(id){
  const a=content.actions[id],selectedCards=slots[id]||[],p=inspectSlot(id);
  const chance=p.ok?p.odds:{s:0,n:0,f:0};
  const invalid=p.ok?"":p.reason;
  const cost=a.cost+(extras[id]||0);
  const display=selectedCards.map(card=>{
    const x=content.cards[card];
    return '<button class="chip" data-rm="'+card+'" data-action="'+id+'" title="退回手牌">'+x.name+' ×</button>';
  }).join("")||'<span class="hint">从下方选择或拖入牌；也可以不带牌直接尝试</span>';
  const label=a.automatic?"必定完成":('成功 '+chance.s+'% · 代价 '+chance.n+'% · 失败 '+chance.f+'%');
  return '<section class="act" data-act="'+id+'" data-m="'+(a.main||"")+'" data-r="'+(a.risk||"")+'">'+
    '<header><h4>'+a.name+'</h4><span class="tag">行动力 '+a.cost+'</span></header>'+
    '<p class="d">'+a.desc+'</p>'+
    '<div class="links">'+(a.main?linkClock(a.main,"推进 "):"")+(a.risk?linkClock(a.risk,"风险 "):"")+'</div>'+
    '<div class="slot '+(armed?'ready':'')+'" data-slot="'+id+'">'+display+'</div>'+
    '<div class="action-controls"><span>额外投入 · '+(extras[id]||0)+'/2</span>'+
    '<button data-extra="'+id+'" data-delta="-1" '+((extras[id]||0)===0?'disabled':'')+'>−</button>'+
    '<button data-extra="'+id+'" data-delta="1" '+((extras[id]||0)===2?'disabled':'')+'>＋</button>'+
    '<span>总计 '+cost+' 点</span></div>'+
    '<div class="prob">'+probability(chance)+'</div>'+
    '<div class="pl">'+(invalid||label)+(p.ok&&p.borrow?' · 透支 '+p.borrow+' 点':'')+'</div>'+
    '<div class="action-controls"><span class="days">结果会立刻发生，记录进事实账本</span>'+
    '<button class="play" data-play="'+id+'" '+(!p.ok?'disabled':'')+'>落子</button></div></section>';
}
function renderPanel(cam) {
  map.classList.toggle("has-panel",!!selected);
  const linksvg=$("#linksvg");linksvg.innerHTML="";
  if(!selected){panel.hidden=true;return;}
  const n=nodeById[selected],hidden=state.locked.includes(n.id);
  const cl=n.clocks||[],ac=hidden?[]:(n.actions||[]);
  const keep=panel.scrollTop;
  let html='<button class="x" aria-label="返回上一级">×</button>'+
    '<p class="kind">'+n.kind+(n.parent?' · '+nodeById[n.parent].name:'')+'</p>'+
    '<h3>'+n.name+'</h3><p class="desc">'+n.desc+'</p>';
  if(n.daily) html+='<p class="daily"><b>每夜自动</b>'+clockModel(n.daily.clock).name+' '+sign(n.daily.delta)+'</p>';
  if(hidden) html+='<p class="gonet">这条联系已经暂时中断。</p>';
  if(cl.length) html+='<div class="sec"><h5>时钟</h5>'+cl.map(clockRow).join("")+'</div>';
  if(ac.length) html+='<div class="sec"><h5>行动</h5>'+ac.map(actionHTML).join("")+'</div>';
  if(!cl.length&&!ac.length&&!n.daily) html+='<p class="desc">'+(visibleKids(n.id).length?'点击地图上的人物和物件，继续查看。':'这里暂时没有可做的事。')+'</p>';
  panel.hidden=false;panel.classList.toggle("wide",cam.wide);
  panel.innerHTML=html;panel.scrollTop=keep;
  if(cam.wide){
    const ph=panel.offsetHeight,sx=n.x*cam.s+cam.tx,sy=n.y*cam.s+cam.ty;
    const top=clamp(sy-ph/2,12,Math.max(12,cam.H-ph-12));
    panel.style.top=top+"px";panel.style.bottom="auto";
    const ex=cam.W-12-340,ey=clamp(sy,top+24,top+ph-24);
    linksvg.innerHTML='<path d="M'+sx+' '+sy+'C'+(sx+80)+' '+sy+' '+(ex-80)+' '+ey+' '+ex+' '+ey+'"/><circle cx="'+sx+'" cy="'+sy+'" r="3.5"/>';
  }else{panel.style.top="";panel.style.bottom="";}
}
function renderTop() {
  const date=new Date(Date.UTC(1947,2,11+state.day));
  $("#date").textContent=date.getUTCFullYear()+"年"+(date.getUTCMonth()+1)+"月"+date.getUTCDate()+"日";
  $("#phases").innerHTML='<span class="on">第 '+state.day+' 天</span><span>行动力 '+state.ap.cur+'/'+state.ap.max+'</span>'+
    (state.ap.borrowed?'<span class="warn">已透支 '+state.ap.borrowed+'/2</span>':'');
  $("#money").textContent="$"+state.money;
  $("#stress").innerHTML='压力<span class="sp">'+[0,1,2,3,4,5].map(i=>
    '<i class="'+(i<state.stress?(state.stress>=4?'hi':'on'):'')+'"></i>').join("")+'</span>';
  $("#settle").textContent=state.ended?"七日已终":"收工 · 进入下一天";
  $("#settle").disabled=state.ended;
  map.dataset.ph=state.day%3;
}
function renderHand(){
  const markup=state.hand.map(id=>{
    const c=content.cards[id];
    const used=c.kind==="person"?actorFree(state,c.actor)===0:state.usedCards.includes(id);
    const chosen=Object.values(slots).some(v=>v.includes(id));
    return '<div class="card '+(c.kind==="person"?'person':'item')+(used?' used':'')+(armed===id?' armed':'')+
      (chosen?' lifted':'')+'" data-card="'+id+'" title="'+(c.description||"")+'" tabindex="0" role="button" aria-disabled="'+used+'">'+
      '<span class="k">'+(c.kind==="person"?'人物':'手牌')+'</span><span class="t">'+c.name+'</span>'+
      '<span class="b">'+({fist:"拳",mouth:"嘴",hand:"手",money:"钱"}[c.suit]||c.suit)+' '+c.rank+
      (c.kind==="person"?' · 空闲 '+actorFree(state,c.actor):c.once?' · 一次性':'')+'</span></div>';
  }).join("");
  hand.innerHTML='<div class="grp"><h5>可投入的牌 · '+state.hand.length+' 张</h5><div class="cards">'+
    (markup||'<span class="none">没有可以使用的牌</span>')+'</div></div>';
}
function renderNav(){
  const ids=selected?nodePath(selected):[];
  $("#crumbs").innerHTML='<button data-go="">城市</button>'+ids.map(id=>
    '<span>›</span><button data-go="'+id+'">'+nodeById[id].name+'</button>').join("");
  $("#note").hidden=!!selected;
  const list=[["c_find","office","失踪案"],["c_heat","police","警方"],["c_zhuan_pressure","zhuan","工头"]];
  $("#goals").innerHTML=list.map(([id,node,title])=>{
    const c=clockModel(id);
    return '<button class="goal" data-go="'+node+'">'+clockSvg(id,28)+'<span><small>'+title+
      '</small><b>'+c.name+'</b><em>'+c.v+'/'+c.size+'</em></span></button>';
  }).join("");
}
function render(){const cam=drawBoard(state,selected);renderPanel(cam);renderTop();renderHand();renderNav();}

function modal(title,entries,button="继续") {
  let html='<h3>'+title+'</h3>';
  for(const e of entries) {
    html+='<article class="re"><div class="rh"><b>'+(e.action||"港口来信")+'</b>'+
      (e.result?'<span class="rt">'+resultName[e.result]+'</span>':'')+'</div>'+
      '<p class="story">'+e.text+'</p>'+
      (e.notes||[]).map(t=>'<p class="nt story">'+t+'</p>').join("")+'</article>';
  }
  html+='<button class="go" id="again">'+button+'</button>';
  sheet.innerHTML=html;veil.hidden=false;$("#again").focus();
}
function step(aid) {
  const r=play(state,content,aid,slots[aid]||[],extras[aid]||0);
  if(!r.ok){toast(r.reason);return;}
  resetChoice();save();render();
  modal("第 "+state.day+" 天 · "+content.actions[aid].name,[r.entry]);
}
function finishDay() {
  const day=state.day;
  const notes=endDay(state,content);
  resetChoice();save();render();
  modal("第 "+day+" 天 · 夜里",[{text:notes.join(" ")||"雨继续下。今晚没有发生大事。"}],
    state.ended?"重新开始":"继续");
}
function journal() {
  const entries=state.facts.slice(-20).reverse().map(f=>({
    action:content.actions[f.verb]?.name||f.verb,
    text:"第 "+f.day+" 天 · "+resultName[f.result]+" · "+f.cards.map(id=>content.cards[id]?.name||id).join("、")
  }));
  if(!entries.length) entries.push({text:"今天还没有值得记录的事。"});
  if(state.memories.length) entries.unshift({action:"重要记忆",text:state.memories.slice(-3).map(x=>x.text).join(" / ")});
  modal("事实与记忆 · "+state.facts.length+" 条",entries);
}
map.addEventListener("click",e=>{
  const nav=e.target.closest("[data-go]");
  if(nav){select(nav.dataset.go||null);return;}
  const node=e.target.closest(".node");
  if(node&&!node.classList.contains("off")){select(node.dataset.id);return;}
  if(e.target.closest(".wsvg")) back();
});
$("#nodes").addEventListener("keydown",e=>{
  if(e.key==="Enter"||e.key===" ") {
    const node=e.target.closest(".node");
    if(node){e.preventDefault();select(node.dataset.id);}
  }
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&veil.hidden)back();});
panel.addEventListener("click",e=>{
  const rm=e.target.closest("[data-rm]");
  if(rm){remove(rm.dataset.action,rm.dataset.rm);return;}
  const extra=e.target.closest("[data-extra]");
  if(extra){const id=extra.dataset.extra;extras[id]=clamp((extras[id]||0)+Number(extra.dataset.delta),0,2);render();return;}
  const run=e.target.closest("[data-play]");
  if(run){step(run.dataset.play);return;}
  if(e.target.closest(".x")){back();return;}
  const slot=e.target.closest("[data-slot]");
  if(slot&&armed)place(slot.dataset.slot,armed);
});
panel.addEventListener("mouseover",e=>{
  panel.querySelectorAll(".crow").forEach(x=>x.classList.remove("hp","hr"));
  const a=e.target.closest(".act");if(!a)return;
  const m=panel.querySelector('.crow[data-c="'+a.dataset.m+'"]');
  const r=panel.querySelector('.crow[data-c="'+a.dataset.r+'"]');
  if(m)m.classList.add("hp");if(r)r.classList.add("hr");
});
panel.addEventListener("mouseleave",()=>panel.querySelectorAll(".crow").forEach(x=>x.classList.remove("hp","hr")));
hand.addEventListener("click",e=>{
  if(drag?.moved)return;
  const card=e.target.closest("[data-card]");if(!card||card.classList.contains("used"))return;
  armed=armed===card.dataset.card?null:card.dataset.card;render();
});
hand.addEventListener("keydown",e=>{
  if(e.key!=="Enter"&&e.key!==" ")return;
  const card=e.target.closest("[data-card]");
  if(card&&!card.classList.contains("used")){e.preventDefault();armed=card.dataset.card;render();}
});
hand.addEventListener("pointerdown",e=>{
  const el=e.target.closest("[data-card]");
  if(!el||el.classList.contains("used"))return;
  drag={id:el.dataset.card,el,x:e.clientX,y:e.clientY,pid:e.pointerId,moved:false,ghost:null};
});
window.addEventListener("pointermove",e=>{
  if(!drag||drag.pid!==e.pointerId)return;
  if(!drag.moved){
    if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<7)return;
    drag.moved=true;drag.ghost=drag.el.cloneNode(true);drag.ghost.classList.add("ghost");
    document.body.appendChild(drag.ghost);
  }
  drag.ghost.style.left=e.clientX+"px";drag.ghost.style.top=e.clientY+"px";
});
window.addEventListener("pointerup",e=>{
  if(!drag||drag.pid!==e.pointerId)return;
  const d=drag;drag=null;
  if(d.ghost)d.ghost.remove();
  if(!d.moved)return;
  const under=document.elementFromPoint(e.clientX,e.clientY);
  const slot=under?.closest("[data-slot]");
  if(slot)place(slot.dataset.slot,d.id);
});
window.addEventListener("pointercancel",()=>{if(drag?.ghost)drag.ghost.remove();drag=null;});
veil.addEventListener("click",e=>{
  if(!e.target.closest("#again"))return;
  veil.hidden=true;
  if(state.ended){state=createGame(content);selected=null;resetChoice();save();render();}
});
$("#settle").addEventListener("click",finishDay);
const journalButton=document.createElement("button");
journalButton.className="bt";journalButton.textContent="日记 / 记忆";journalButton.addEventListener("click",journal);
$(".top").insertBefore(journalButton,$("#settle"));
render();
new ResizeObserver(render).observe(map);
requestAnimationFrame(()=>requestAnimationFrame(()=>map.classList.remove("boot")));
