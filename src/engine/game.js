// DOM-free and deterministic when the caller injects rng.
// Mutable state is deliberate: UI observes one state, tests can supply a fresh state.
export const ODDS = [
  [5,25,70],[10,30,60],[20,35,45],[35,40,25],
  [50,35,15],[65,28,7],[80,17,3]
];
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const toArray=(x)=>x==null?[]:Array.isArray(x)?x:[x];
const weekday=(day)=>new Date(Date.UTC(1947,2,11+day)).getUTCDay();

export function createGame(content) {
  return {
    day:1, money:content.initial.money,stress:content.initial.stress,
    ap:{cur:content.initial.ap,max:content.initial.ap,borrowed:0,penalty:0},
    hand:[...content.initial.hand],usedCards:[],usedActions:[],
    actors:Object.fromEntries(Object.entries(content.initial.actors||{}).map(([id,x])=>[id,{...x,used:0}])),
    clocks:Object.fromEntries(Object.entries(content.clocks).map(([id,c])=>[id,{v:c.v||0,done:false}])),
    unlocked:[],locked:[],flags:{},facts:[],memories:[],log:[],notices:[],
    ended:false,ending:null
  };
}
export function clockValue(state,id) { return state.clocks[id]?.v ?? 0; }
export function actorFree(state,id) {
  const a=state.actors[id]; if(!a) return 0;
  const pressure=clockValue(state,"c_zhuan_pressure");
  const occupied=a.occupied+(id==="zhuan" && pressure>=3?1:0);
  return Math.max(0,a.max-occupied-a.used);
}
export function oddsFor(strength,difficulty) {
  const delta=clamp(strength-difficulty,-3,3);
  const [s,n,f]=ODDS[delta+3];
  return {s,n,f,delta};
}
export function inspect(state,content,aid,ids=[],extra=0) {
  const a=content.actions[aid];
  if(!a) return {ok:false,reason:"未知行动"};
  const no=(reason)=>({ok:false,reason});
  if(state.ended) return no("这一段生活已经结束");
  if(state.locked.includes(a.node)) return no("这个人或地方已经不可接近");
  if(a.when?.weekday!=null && weekday(state.day)!==a.when.weekday) return no("只有周五才能做这件事");
  if(state.usedActions.includes(aid)) return no("这件事今天已经做过");
  if(!Number.isInteger(extra)||extra<0||extra>2) return no("额外投入必须是 0 到 2 点");
  if(ids.length>3 || new Set(ids).size!==ids.length) return no("每次行动最多三张不同的牌");
  let strength=extra;
  for(const id of ids) {
    const card=content.cards[id];
    if(!card||!state.hand.includes(id)) return no("手里没有这张牌");
    if(!a.suits.includes(card.suit)) return no("花色不匹配");
    if(card.kind==="person") {
      if(actorFree(state,card.actor)<1) return no(card.name+"已经没有空闲时间");
    } else if(state.usedCards.includes(id)) return no(card.name+"今天已经用过");
    strength+=card.rank;
  }
  const cost=a.cost+extra;
  const borrow=Math.max(0,cost-state.ap.cur);
  if(borrow+state.ap.borrowed>2) return no("行动力不足，透支上限为两点");
  if(a.price && state.money<a.price) return no("钱不够");
  const odds=a.automatic ? {s:100,n:0,f:0,delta:0} :
    oddsFor(strength-(state.stress>=4?1:0),a.diff);
  return {ok:true,aid,ids,extra,cost,borrow,strength,odds};
}
function notice(state,t) { state.notices.push(t); }
function applyOp(state,content,op,notes) {
  if(!op) return;
  switch(op.op){
    case "adv": changeClock(state,content,op.id,op.n,notes); break;
    case "clock": changeClock(state,content,op.id,op.n,notes); break;
    case "stress": state.stress=clamp(state.stress+op.n,0,6); break;
    case "money": state.money=Math.max(0,state.money+op.n); break;
    case "give": {
      if(content.cards[op.id]&&!state.hand.includes(op.id)) {
        state.hand.push(op.id); notes.push("获得："+content.cards[op.id].name);
      }
      break;
    }
    case "unlock":
      if(!state.unlocked.includes(op.id)) state.unlocked.push(op.id);
      notes.push("出现新的地点或人物");
      break;
    case "lock":
      if(!state.locked.includes(op.id)) state.locked.push(op.id);
      notes.push("某个联系暂时断了");
      break;
    case "flag": state.flags[op.id]=true; break;
    case "text": notes.push(op.t); break;
    case "win": state.flags.case_closed=true; notes.push(op.t); break;
    case "lose": notes.push(op.t); break; // 旧内容兼容：不再直接 Game Over
    default: throw new Error("Unknown effect operation: "+op.op);
  }
}
export function changeClock(state,content,id,n,notes=[]) {
  const def=content.clocks[id],c=state.clocks[id];
  if(!def||!c) throw new Error("Unknown clock: "+id);
  if(c.done && n>0) return;
  c.v=clamp(c.v+n,0,def.size);
  if(c.v>=def.size && !c.done) {
    c.done=true;notes.push("「"+def.name+"」到达终点");
    for(const op of toArray(def.on)) applyOp(state,content,op,notes);
  }
}
function effectLine(state,content,a,e,notes) {
  if(e.m&&a.main) changeClock(state,content,a.main,e.m,notes);
  if(e.r&&a.risk) changeClock(state,content,a.risk,e.r,notes);
  if(e.stress) state.stress=clamp(state.stress+e.stress,0,6);
  if(e.money) state.money=Math.max(0,state.money+e.money);
  if(e.give) applyOp(state,content,{op:"give",id:e.give},notes);
  for(const op of toArray(e.ops)) applyOp(state,content,op,notes);
}
export function play(state,content,aid,ids=[],extra=0,rng=Math.random) {
  const pre=inspect(state,content,aid,ids,extra);
  if(!pre.ok) return {ok:false,reason:pre.reason};
  const a=content.actions[aid];
  state.ap.cur=Math.max(0,state.ap.cur-pre.cost);
  if(pre.borrow) {
    state.ap.borrowed+=pre.borrow;state.ap.penalty+=pre.borrow;
    state.stress=clamp(state.stress+pre.borrow,0,6);
  }
  for(const id of ids) {
    const c=content.cards[id];
    if(c.kind==="person") state.actors[c.actor].used+=1;
    else {state.usedCards.push(id);if(c.once) state.hand=state.hand.filter(x=>x!==id);}
  }
  state.usedActions.push(aid);
  const r=clamp(rng(),0,0.999999)*100;
  const result=r<pre.odds.s?"s":r<pre.odds.s+pre.odds.n?"n":"f";
  const e=a.results[result]||{};
  const notes=[];
  effectLine(state,content,a,e,notes);
  const people=ids.filter(x=>content.cards[x].kind==="person");
  const props=ids.map(x=>content.cards[x].name).join("、");
  const scene=(a.lines[result]||"事情有了结果。");
  const text=scene+(props?" 你动用了"+props+"。":"");
  const entry={day:state.day,aid,action:a.name,target:a.node,result,cards:[...ids],extra,text,notes};
  state.facts.push({day:state.day,verb:aid,target:a.node,cards:[...ids],result});
  state.log.push(entry);
  if(a.memory) state.memories.push({day:state.day,verb:aid,text:scene});
  if(state.stress>=6) {
    state.stress=4;
    notes.push("压力终于压垮了你。这一晚你丢掉了两点冷静，但还得继续生活。");
    state.flags.broke_down=true;
  }
  return {ok:true,entry,odds:pre.odds,borrow:pre.borrow};
}
export function endDay(state,content) {
  if(state.ended) return [];
  const notes=[],wasDay=state.day;
  for(const node of content.nodes) {
    const daily=node.daily;
    if(!daily||node.hidden&&!state.unlocked.includes(node.id)||state.locked.includes(node.id)) continue;
    if(node.id==="foreman_pull" && state.flags.zhuan_escape_plan) continue;
    changeClock(state,content,daily.clock,daily.delta,notes);
    notes.push(daily.text);
  }
  if(wasDay===4) {
    state.money=Math.max(0,state.money-15);
    notes.push("房租收走了 $15。");
  }
  state.stress=Math.max(0,state.stress-1);
  state.day++;
  state.ap.max=Math.max(1,content.initial.ap-state.ap.penalty);
  state.ap.cur=state.ap.max;
  state.ap.borrowed=0;state.ap.penalty=0;
  state.usedCards=[];state.usedActions=[];
  Object.values(state.actors).forEach(a=>a.used=0);
  state.log=[];
  if(wasDay>=content.initial.duration) {
    state.ended=true;
    const meals=state.facts.filter(f=>f.verb==="a_meal").length;
    const plan=!!state.flags.zhuan_escape_plan;
    const signed=!!state.flags.zhuan_signed;
    const ending=plan&&meals
      ?"阿砖终于离开工头的名单，但船并没有来。你们坐在码头等到天亮，吃了最后一碗面。"
      :plan?"阿砖有了另一条路，却想不起你们什么时候真正坐下吃过饭。"
      :signed?"合同生效。阿砖还会笑，码头却渐渐不再听见他的声音。"
      :"你后来再去码头，没人知道阿砖去了哪里。";
    state.ending=ending;
    notes.push(ending);
  }
  notice(state,"第 "+wasDay+" 天结束");
  return notes;
}
export function visibleNodes(state,content) {
  return content.nodes.filter(n=>!n.hidden||state.unlocked.includes(n.id));
}
