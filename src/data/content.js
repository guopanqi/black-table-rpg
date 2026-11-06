import { N, C0, I, A } from "./legacy-content.js";

// 旧版的地点和文案仍然是迁移基础；规则改由 engine 读取统一结构。
const suitFor = { talk:"mouth", force:"fist", sneak:"hand", investigate:"hand", bribe:"money" };
const legacySuit = (tags) => [...new Set(tags.map(x => suitFor[x]))];

export const nodes = [
  ...N,
  { id:"zhuan", parent:"dock", name:"阿砖", kind:"人物", x:1090, y:630,
    desc:"二十六岁的码头工人。每周五吃面，攒钱想买一条小船。",
    clocks:["c_zhuan_protect","c_zhuan_pressure"],
    actions:["a_meal","a_help","a_work"] },
  { id:"foreman_pull", parent:"dock", name:"工头的催促", kind:"状态", x:1130, y:500,
    desc:"有人在给阿砖画饼，递来他看不懂的合同。",
    daily:{clock:"c_zhuan_pressure",delta:1,text:"工头又找阿砖谈了一次话。"} }
];

export const clocks = {
  ...Object.fromEntries(Object.entries(C0).map(([id,c]) => [id, {
    ...c,
    on: id === "c_heat"
      ? [{op:"text",t:"警车把你逼进雨里。调查没有结束，但你的生活会更难。"}, {op:"stress",n:2}]
      : id === "c_find"
      ? [{op:"flag",id:"lin_found"}, {op:"text",t:"你找到了林深。真相在手，你还得决定如何使用它。"}]
      : c.on
  }])),
  c_zhuan_pressure:{name:"工头的催促",kind:"r",size:5,v:0,
    res:"满：阿砖签下看不懂的合同",on:[{op:"flag",id:"zhuan_signed"},{op:"text",t:"阿砖在合同上按下指印，甚至没看清上面的字。"}]},
  c_zhuan_protect:{name:"帮阿砖攒船钱",kind:"p",size:4,v:0,
    res:"满：他终于有了另一条路，但港口不会轻易放人",
    on:[{op:"flag",id:"zhuan_escape_plan"},{op:"text",t:"阿砖把零钱倒在桌上，笑得像个孩子。"}]}
};

const cardRanks = { i_rev:["fist",2], i_photo:["hand",1], i_iou:["money",2],
  i_favor:["mouth",2], i_ledger:["hand",2], i_clip:["hand",1] };
export const cards = Object.fromEntries(Object.entries(I).map(([id,it]) => [id,{
  id,name:it.name,kind:"item",suit:cardRanks[id][0],rank:cardRanks[id][1],
  once:!!it.consume,description:it.desc
}]));
cards.zhuan={id:"zhuan",name:"阿砖",kind:"person",suit:"fist",rank:3,
  actor:"zhuan",description:"能一起干活、挡门、搬运货物；他自己的时间有限。" };

const costs={a_chat:1,a_press:1,a_crate:2,a_back:2,a_drink:1,a_bribe:1,
  a_sort:2,a_paper:1,a_widow:1,a_cop:1};
const diffs={a_chat:3,a_press:4,a_crate:4,a_back:3,a_drink:3,
  a_bribe:3,a_sort:3,a_paper:3,a_widow:4,a_cop:4};
export const actions = Object.fromEntries(Object.entries(A).map(([id,a]) => [id,{
  id,node:a.node,name:a.name,desc:a.desc,
  cost:costs[id],suits:legacySuit(a.tags),diff:diffs[id],
  main:a.main,risk:a.risk||null,results:a.eff,lines:a.txt
}]));

actions.a_meal={
  id:"a_meal",node:"zhuan",name:"周五的面",desc:"不做什么正经事，只陪阿砖吃面。他会记得你是否来过。",
  cost:1,price:2,when:{weekday:5},suits:["mouth","money"],diff:0,automatic:true,
  results:{s:{money:-2,stress:-1,give:"zhuan"}},lines:{s:"阿砖给你留了一双筷子。面凉了，他还是觉得今天是好日子。"},
  memory:true
};
actions.a_help={
  id:"a_help",node:"zhuan",name:"替他争一条出路",desc:"去和工头交涉，替他守住存下的船钱。",
  cost:2,suits:["mouth","fist"],diff:4,main:"c_zhuan_protect",risk:"c_zhuan_pressure",
  results:{s:{m:2},n:{m:1,r:1,stress:1},f:{r:1,stress:1}},
  lines:{s:"工头退了一步，阿砖攥着你的袖口不肯松开。",n:"你谈成了一半，代价却落在他肩上。",f:"工头说这里不欢迎外人多事。"},
  memory:true
};
actions.a_work={
  id:"a_work",node:"zhuan",name:"在码头扛一班活",desc:"拿今天的身体换今晚的饭钱，阿砖也在这里讨生活。",
  cost:2,suits:["fist","hand"],diff:2,automatic:true,
  results:{s:{money:12,stress:1}},lines:{s:"货船靠岸时你还在扛麻袋。钱入袋，腰也痛。"}
};
actions.a_oddjob={
  id:"a_oddjob",node:"office",name:"接一份普通委托",
  desc:"找失物、跟拍、替人跑腿。没有传说中的侦探生活，只有账单。",
  cost:2,suits:["hand","mouth"],diff:2,automatic:true,
  results:{s:{money:14,stress:1}},lines:{s:"雇主留下钞票。问题不大，时间却确实被占用了。"}
};
nodes.find(n => n.id === "office").actions.push("a_oddjob");

export const initial = {
  money:42,stress:1,ap:6,hand:["i_rev","i_photo","i_iou","i_favor"],
  actors:{zhuan:{max:4,occupied:2}},
  duration:7
};
export const content = {nodes,clocks,cards,actions,initial};
