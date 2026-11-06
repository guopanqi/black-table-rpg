// Author-facing data checks. All reports are plain strings to keep this module reusable.
const SUITS=new Set(["fist","mouth","hand","money"]);
const check=(errors,pass,msg)=>{if(!pass)errors.push(msg);};
export function validateContent(data){
  const errors=[],{nodes=[],clocks={},cards={},actions={},initial={}}=data;
  const ids=new Set(),nodeById=new Map();
  for(const n of nodes){
    check(errors,typeof n.id==="string"&&n.id.length>0,"Node missing id");
    check(errors,!ids.has(n.id),"Duplicate node: "+n.id);
    ids.add(n.id);nodeById.set(n.id,n);
  }
  for(const n of nodes){
    if(n.parent)check(errors,ids.has(n.parent),"Missing parent: "+n.id+" -> "+n.parent);
    for(const id of n.clocks||[])check(errors,!!clocks[id],"Node "+n.id+" refers to missing clock "+id);
    for(const id of n.actions||[])check(errors,!!actions[id],"Node "+n.id+" refers to missing action "+id);
    if(n.daily)check(errors,!!clocks[n.daily.clock],"Daily node "+n.id+" refers to missing clock");
    const visited=new Set([n.id]);let p=n.parent;
    while(p && nodeById.has(p)){
      if(visited.has(p)){errors.push("Node parent cycle at "+n.id);break;}
      visited.add(p);p=nodeById.get(p).parent;
    }
  }
  for(const [id,c] of Object.entries(clocks)){
    check(errors,Number.isInteger(c.size)&&c.size>0,"Clock "+id+" invalid size");
    check(errors,Number.isInteger(c.v||0) && (c.v||0)>=0 && (c.v||0)<=c.size,
      "Clock "+id+" invalid initial value");
    check(errors,["p","r"].includes(c.kind),"Clock "+id+" invalid kind");
    for(const op of c.on||[]){
      if(op.op==="adv"||op.op==="clock") check(errors,!!clocks[op.id],"Clock "+id+" effect missing clock "+op.id);
      if(op.op==="give")check(errors,!!cards[op.id],"Clock "+id+" effect missing card "+op.id);
      if(op.op==="unlock"||op.op==="lock")check(errors,ids.has(op.id),"Clock "+id+" effect missing node "+op.id);
    }
  }
  for(const [id,c] of Object.entries(cards)){
    check(errors,SUITS.has(c.suit),"Card "+id+" invalid suit");
    check(errors,Number.isInteger(c.rank)&&c.rank>0,"Card "+id+" invalid rank");
    if(c.kind==="person") check(errors,!!initial.actors?.[c.actor],"Person card "+id+" missing actor schedule");
  }
  for(const [id,a] of Object.entries(actions)){
    check(errors,ids.has(a.node),"Action "+id+" missing node");
    check(errors,Number.isInteger(a.cost)&&a.cost>=1&&a.cost<=3,"Action "+id+" invalid cost");
    check(errors,Array.isArray(a.suits)&&a.suits.length>0&&a.suits.every(x=>SUITS.has(x)),"Action "+id+" invalid suits");
    if(!a.automatic)check(errors,Number.isInteger(a.diff),"Action "+id+" needs integer difficulty");
    if(a.main)check(errors,!!clocks[a.main],"Action "+id+" invalid main clock");
    if(a.risk)check(errors,!!clocks[a.risk],"Action "+id+" invalid risk clock");
    for(const res of ["s","n","f"]){
      if(!a.automatic||res==="s")
        check(errors,!!a.results?.[res]&&typeof a.lines?.[res]==="string","Action "+id+" missing "+res+" result/text");
    }
  }
  for(const id of initial.hand||[])check(errors,!!cards[id],"Initial hand contains unknown card: "+id);
  check(errors,Number.isInteger(initial.ap)&&initial.ap>=1,"Invalid initial AP");
  check(errors,Number.isInteger(initial.duration)&&initial.duration>=1,"Invalid duration");
  return errors;
}
