import test from "node:test";
import assert from "node:assert/strict";
import {content} from "../src/data/content.js";
import {validateContent} from "../src/engine/validate.js";
import {createGame,inspect,play,endDay,oddsFor,changeClock,actorFree} from "../src/engine/game.js";

test("every probability row is bounded, sums to 100 and increases monotonically",()=>{
  let previous=-1;
  for(let delta=-10;delta<=10;delta++){
    const p=oddsFor(delta,0);
    assert.equal(p.s+p.n+p.f,100);
    assert.ok(p.s>=previous);previous=p.s;
  }
  assert.deepEqual([oddsFor(-3,0).s,oddsFor(0,0).s,oddsFor(3,0).s],[5,35,80]);
});
test("cards affect probability, suit eligibility and same-day cooldown",()=>{
  const s=createGame(content);
  assert.equal(inspect(s,content,"a_press",["i_rev"]).ok,true);
  assert.equal(inspect(s,content,"a_press",["i_photo"]).ok,false);
  const before=inspect(s,content,"a_press",[]).odds.s;
  const after=inspect(s,content,"a_press",["i_rev"]).odds.s;
  assert.ok(after>before);
  assert.equal(play(s,content,"a_press",["i_rev"],0,()=>0).ok,true);
  assert.equal(s.usedCards.includes("i_rev"),true);
  assert.equal(inspect(s,content,"a_chat",["i_rev"]).ok,false);
  assert.equal(s.facts.length,1);
});
test("actions happen immediately, progress clocks and save facts",()=>{
  const s=createGame(content);
  const r=play(s,content,"a_press",["i_rev"],1,()=>0);
  assert.equal(r.ok,true);
  assert.equal(s.clocks.c_chen.v,2);
  assert.equal(s.facts[0].target,"chen");
  assert.equal(s.ap.cur,4);
});
test("AP overdraw borrows at most two and reduces next morning",()=>{
  const s=createGame(content);
  play(s,content,"a_oddjob",[],0);
  play(s,content,"a_work",[],0);
  play(s,content,"a_press",[],0);
  play(s,content,"a_sort",[],0);
  assert.equal(s.ap.borrowed,1);
  assert.equal(inspect(s,content,"a_chat",[],2).ok,false);
  endDay(s,content);
  assert.equal(s.ap.max,5);
  assert.equal(s.ap.cur,5);
  assert.equal(s.ap.borrowed,0);
});
test("only Friday has a meal; no relationship meter, but records a memory and gives a person",()=>{
  const s=createGame(content);
  assert.equal(inspect(s,content,"a_meal").ok,false);
  endDay(s,content);endDay(s,content);
  assert.equal(s.day,3);
  assert.equal(inspect(s,content,"a_meal").ok,true);
  assert.equal(play(s,content,"a_meal").ok,true);
  assert.equal(s.hand.includes("zhuan"),true);
  assert.equal(s.memories.length,1);
  assert.equal(s.facts.some(f=>f.verb==="a_meal"),true);
  assert.equal(Object.keys(s).includes("relationshipAccount"),false);
});
test("actors have independently occupied time; no bankable trust points",()=>{
  const s=createGame(content);
  s.hand.push("zhuan");
  assert.equal(actorFree(s,"zhuan"),2);
  assert.equal(inspect(s,content,"a_press",["zhuan"]).ok,true);
  play(s,content,"a_press",["zhuan"],0,()=>0);
  assert.equal(actorFree(s,"zhuan"),1);
  changeClock(s,content,"c_zhuan_pressure",3);
  assert.equal(actorFree(s,"zhuan"),0);
});
test("risk clocks produce narrative consequences, not immediate game over",()=>{
  const s=createGame(content);
  changeClock(s,content,"c_heat",8);
  assert.equal(s.clocks.c_heat.done,true);
  assert.equal(s.ended,false);
  assert.equal(s.stress,3);
});
test("world moves without intervention and reaches a distinct seven-day ending",()=>{
  const s=createGame(content);
  for(let d=1;d<=7;d++) endDay(s,content);
  assert.equal(s.ended,true);
  assert.equal(s.flags.zhuan_signed,true);
  assert.ok(s.ending.includes("合同"));
  assert.ok(s.notices.length>0);
});
test("authors can add new actions without editing the engine",()=>{
  const s=createGame(content);
  const custom={...content,actions:{...content.actions,a_test:{
    id:"a_test",node:"office",name:"敲打字机",cost:1,suits:["hand"],diff:0,
    automatic:true,results:{s:{money:3}},lines:{s:"又挣了三块钱"}
  }}};
  assert.equal(play(s,custom,"a_test",[]).ok,true);
  assert.equal(s.money,45);
});

test("author content has valid references and catches broken additions",()=>{
  assert.deepEqual(validateContent(content),[]);
  const broken={...content,actions:{...content.actions,a_broken:{id:"a_broken",node:"missing",cost:0,suits:["other"],diff:4}}};
  const errors=validateContent(broken);
  assert.ok(errors.some(x=>x.includes("a_broken")));
});
