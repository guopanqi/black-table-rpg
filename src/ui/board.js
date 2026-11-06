import { content } from "../data/content.js";
const N=content.nodes;
const byId=Object.fromEntries(N.map(n=>[n.id,n]));
const KC={"区域":"zone","地点":"place","人物":"person","物件":"thing","状态":"state"};
const $=selector=>document.querySelector(selector);
const map=$("#map"),nodesEl=$("#nodes"),world=$("#world"),edgesEl=$("#edges");
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sign=n=>(n>0?"+":"−")+Math.abs(n);
let S={sel:null,unlocked:new Set(),locked:new Set()}, C=content.clocks;
let cam={s:1,tx:0,ty:0,W:0,H:0,ref:null,wide:true};
const avail=n=>!n.hidden||S.unlocked.has(n.id);
const kids=id=>N.filter(n=>n.parent===id&&avail(n));
const path=id=>{const p=[];let n=byId[id];while(n){p.unshift(n.id);n=n.parent?byId[n.parent]:null;}return p;};
const descendants=id=>{const o=[];kids(id).forEach(k=>o.push(k,...descendants(k.id)));return o;};

/* ---------- clock svg ---------- */
function clk(c, px){
  const r=px/2-1.5, cx=px/2, cy=px/2, n=c.size;
  let s=`<svg class="clk ${c.kind}" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}" aria-hidden="true"><circle class="bg" cx="${cx}" cy="${cy}" r="${r}"/>`;
  const pt=(i,rr)=>{ const a=(-90+360*i/n)*Math.PI/180; return [cx+rr*Math.cos(a), cy+rr*Math.sin(a)]; };
  for(let i=0;i<n;i++){
    const [x0,y0]=pt(i,r-1), [x1,y1]=pt(i+1,r-1);
    s+=`<path class="w${i<c.v?' f':''}" d="M${cx} ${cy}L${x0.toFixed(2)} ${y0.toFixed(2)}A${r-1} ${r-1} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z"/>`;
  }
  for(let i=0;i<n;i++){ const [x,y]=pt(i,r); s+=`<line class="sep" x1="${cx}" y1="${cy}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}"/>`; }
  return s+'</svg>';
}


/* ---------- static map decoration ---------- */
function decor(){
  let seed=7; const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
  const water=(x,y)=> x>=1080 ? y>540-(x-1080)*1.333 : y>540+(1080-x)*0.684;
  let h='<path d="M700 800L1200 800L1200 380L1080 540C1030 610 900 690 700 800Z" fill="var(--water)" stroke="#16242e" stroke-width="2"/>';
  for(let gx=0;gx<20;gx++) for(let gy=0;gy<14;gy++){
    const x=gx*62+10, y=gy*60+10;
    if(water(x+56,y+50)||water(x,y+50)) continue;
    const lit=rnd()<0.07;
    h+=`<rect x="${x}" y="${y}" width="${48+Math.floor(rnd()*8)}" height="${40+Math.floor(rnd()*8)}" fill="${lit?'#2a2418':'var(--blk)'}" stroke="#1b1f27"/>`;
  }
  const o=byId.old,u=byId.up,d=byId.dock;
  const road=(p)=>`<path d="${p}" fill="none" stroke="var(--road)" stroke-width="14" stroke-linecap="round"/><path d="${p}" fill="none" stroke="#3a3326" stroke-width="1" stroke-dasharray="8 8" vector-effect="non-scaling-stroke"/>`;
  h+=road(`M${o.x} ${o.y}Q${(o.x+u.x)/2-40} ${(o.y+u.y)/2+60} ${u.x} ${u.y}`);
  h+=road(`M${o.x} ${o.y}Q${(o.x+d.x)/2} ${(o.y+d.y)/2+90} ${d.x} ${d.y}`);
  h+=road(`M${u.x} ${u.y}Q${u.x+150} ${(u.y+d.y)/2} ${d.x} ${d.y}`);
  [[1010,640],[960,690],[880,740]].forEach(([x,y])=>{ h+=`<path d="M${x-30} ${y-30}L${x+20} ${y+20}" stroke="#2b2418" stroke-width="6" vector-effect="non-scaling-stroke"/>`; });
  h+='<text x="1030" y="740" fill="#1f2f3b" font-family="var(--f-disp)" font-size="30" letter-spacing="14" transform="rotate(-38 1030 740)">港湾</text>';
  $('#decor').innerHTML=h;
}

/* ---------- camera / layout ---------- */
function refOf(){ if(!S.sel) return null; return kids(S.sel).length ? S.sel : (byId[S.sel].parent||null); }
function layout(){
  const W=map.clientWidth, H=map.clientHeight, wide=W>=820;
  let aw=W, ah=H; if(S.sel){ if(wide) aw=W-372; else ah=Math.round(H*.42); }
  const ref=refOf();
  const set = ref ? [byId[ref],...kids(ref)] : N.filter(n=>!n.parent);
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  set.forEach(n=>{ x0=Math.min(x0,n.x); x1=Math.max(x1,n.x); y0=Math.min(y0,n.y); y1=Math.max(y1,n.y); });
  const px=wide?120:70, py=wide?90:60;
  const s=clamp(Math.min((aw-2*px)/Math.max(x1-x0,60),(ah-2*py)/Math.max(y1-y0,60)),.6,2);
  cam={s,tx:aw/2-(x0+x1)/2*s,ty:ah/2-(y0+y1)/2*s,W,H,ref,wide};
  world.style.transform=`translate(${cam.tx}px,${cam.ty}px) scale(${s})`;
}

/* ---------- nodes ---------- */
const elems={};
N.forEach(n=>{
  const d=document.createElement('div');
  d.className='node'; d.dataset.id=n.id; d.tabIndex=0; d.setAttribute('role','button');
  d.style.setProperty('--rot', (((n.x*7+n.y*3)%5)-2)*0.7+'deg');
  nodesEl.appendChild(d); elems[n.id]=d;
});
function bubble(n){
  if(!N.some(x=>x.parent===n.id)) return '';
  let best=null;
  [n,...descendants(n.id)].forEach(x=>(x.clocks||[]).forEach(id=>{ const c=C[id]; if(c.kind==='r'&&c.v>0&&!c.done){ const q=c.v/c.size; if(!best||q>best.q) best={q,c}; } }));
  if(!best||best.q<0.25) return '';
  return `<span class="bub ${best.q>=.75?'hot':''}" title="${best.c.name}">${best.c.v}/${best.c.size}</span>`;
}
function nodeInner(n){
  const pips=(n.clocks||[]).map(id=>clk(C[id],18)).join('');
  const av=n.kind==='人物'?`<span class="av">${n.name[0]}</span>`:'';
  const dl=n.daily?`<span class="dl">每夜 · ${C[n.daily.clock].name} ${sign(n.daily.delta)}</span>`:'';
  return `<div class="nc"><span class="k">${n.kind}</span><span class="row">${av}<span class="nm">${n.name}</span></span>${pips?`<span class="pips">${pips}</span>`:''}${dl}</div>${bubble(n)}`;
}
function renderNodes(){
  const ref=cam.ref, rp=ref?path(ref):[]; let edges='';
  N.forEach(n=>{
    const d=elems[n.id];
    const ok=avail(n)&&(!n.parent||rp.includes(n.parent));
    const role=(n.parent||null)===ref?'full':rp.includes(n.id)?'path':'dim';
    d.className=`node t-${KC[n.kind]} ${ok?role:'off'}${n.id===S.sel?' sel':''}${S.locked.has(n.id)?' gone':''}`;
    d.style.left=(n.x*cam.s+cam.tx)+'px'; d.style.top=(n.y*cam.s+cam.ty)+'px';
    d.tabIndex=ok?0:-1; d.innerHTML=nodeInner(n);
    if(ok&&n.parent){ const p=byId[n.parent]; edges+=`<line class="edge ${role}" x1="${p.x}" y1="${p.y}" x2="${n.x}" y2="${n.y}"/>`; }
  });
  edgesEl.innerHTML=edges;
}



decor();
export const nodeById=byId;
export const nodePath=path;
export const visibleKids=kids;
export function drawBoard(state,sel){
  S={...state,sel,unlocked:new Set(state.unlocked),locked:new Set(state.locked)};
  C=Object.fromEntries(Object.entries(content.clocks).map(([id,c])=>[id,{...c,...state.clocks[id]}]));
  layout();renderNodes();
  return {...cam};
}
export function clockSvg(id,px=32){return clk(C[id],px);}
export function clockModel(id){return C[id];}
