const N = [
 {id:'dock',name:'码头区',kind:'区域',x:930,y:600,desc:'潮湿的木栈道,和比木栈道更潮湿的人。'},
 {id:'wh',parent:'dock',name:'仓库13号',kind:'地点',x:900,y:450,desc:'林深最后一次被人看见的地方。夜里有人守着。',clocks:['c_alert']},
 {id:'chen',parent:'wh',name:'老陈',kind:'人物',x:800,y:400,desc:'守了二十年仓库。嘴比锁紧,但爱喝两杯。',clocks:['c_chen','c_sus'],actions:['a_chat','a_press']},
 {id:'crate',parent:'wh',name:'货箱',kind:'物件',x:990,y:400,desc:'堆在角落的木箱,封条是新的。',clocks:['c_crate'],actions:['a_crate']},
 {id:'back',parent:'wh',name:'后门',kind:'物件',x:900,y:530,hidden:true,desc:'生锈的铁门,门缝里漏出一线灯。',clocks:['c_back'],actions:['a_back']},
 {id:'bar',parent:'dock',name:'蓝鹦鹉酒馆',kind:'地点',x:790,y:680,desc:'蓝色的霓虹鹦鹉,从来没亮全过。'},
 {id:'lian',parent:'bar',name:'小莲',kind:'人物',x:690,y:700,desc:'酒保。手上永远有一块擦不完的抹布。',clocks:['c_lian'],actions:['a_drink','a_bribe']},
 {id:'s_lian',parent:'bar',name:'小莲的耳目',kind:'状态',x:650,y:630,hidden:true,desc:'她替你在码头放风,谁在打听你,她都听得到。',daily:{clock:'c_sus',delta:-1,text:'小莲在码头替你说了几句好话。'}},
 {id:'patrol',parent:'dock',name:'夜巡的警车',kind:'状态',x:1010,y:520,desc:'它每晚来一次,从不下车。',daily:{clock:'c_heat',delta:1,text:'警车沿着码头慢慢开了一圈。'}},
 {id:'old',name:'旧城',kind:'区域',x:320,y:470,desc:'窄巷,骑楼,没有人记得名字的小店。'},
 {id:'office',parent:'old',name:'你的事务所',kind:'地点',x:220,y:400,desc:'毛玻璃上的字掉了一半。墙上钉满了林深的剪影。',clocks:['c_find'],actions:['a_sort']},
 {id:'news',parent:'old',name:'晚报编辑部',kind:'地点',x:400,y:360,desc:'打字机昼夜不停,没人在意你是谁。'},
 {id:'zhou',parent:'news',name:'老周',kind:'人物',x:480,y:290,desc:'报馆资料员。欠你一个人情,也不介意再欠一个。',clocks:['c_news'],actions:['a_paper']},
 {id:'up',name:'上城',kind:'区域',x:800,y:190,desc:'干净的街道和不干净的钱。'},
 {id:'police',parent:'up',name:'第九分局',kind:'地点',x:700,y:120,desc:'灯光很亮,问题很多。你的名字已经在某张桌子上了。',clocks:['c_heat'],actions:['a_cop']},
 {id:'mansion',parent:'up',name:'林家',kind:'地点',x:900,y:130,desc:'铜门铃响得很有礼貌。'},
 {id:'widow',parent:'mansion',name:'林太太',kind:'人物',x:990,y:190,desc:'林深的妻子。从来不先开口。',clocks:['c_widow'],actions:['a_widow']}
];
const C0 = {
 c_chen:{name:'撬开他的嘴',size:6,v:0,kind:'p',res:'满:老陈松口,后门的钥匙浮出水面',on:[{op:'unlock',id:'back'},{op:'text',t:'老陈压低声音:“后门的钥匙在货箱底下,你没听我说过。”'}]},
 c_sus:{name:'他起疑了',size:4,v:1,kind:'r',res:'满:他按下警铃。警方追查 +2,他不再见你',on:[{op:'lock',id:'chen'},{op:'adv',id:'c_heat',n:2}]},
 c_alert:{name:'守夜人察觉',size:4,v:0,kind:'r',res:'满:手电扫过来。压力 +2,警方追查 +1',on:[{op:'stress',n:2},{op:'adv',id:'c_heat',n:1},{op:'text',t:'手电的光扫过货箱,你贴着墙滑出去,膝盖还在发抖。'}]},
 c_crate:{name:'撬开货箱',size:3,v:0,kind:'p',res:'满:拿到账本残页,案情 +2',on:[{op:'give',id:'i_ledger'},{op:'adv',id:'c_find',n:2},{op:'text',t:'账页上有林深的签名,最后一行被人用墨水涂掉了。'}]},
 c_back:{name:'摸进后门',size:2,v:0,kind:'p',res:'满:暗格里有林深的笔迹,案情 +2',on:[{op:'adv',id:'c_find',n:2},{op:'text',t:'暗格里是半包受潮的烟,和一张写着船期的纸条。'}]},
 c_lian:{name:'酒保的口风',size:4,v:0,kind:'p',res:'满:小莲答应替你放风(新节点)',on:[{op:'unlock',id:'s_lian'},{op:'text',t:'小莲擦着杯子说:“码头上有人打听你,我替你听着。”'}]},
 c_news:{name:'翻出旧报',size:3,v:0,kind:'p',res:'满:拿到旧剪报,案情 +1',on:[{op:'give',id:'i_clip'},{op:'adv',id:'c_find',n:1}]},
 c_widow:{name:'林太太的信任',size:3,v:0,kind:'p',res:'满:她交出一封信,案情 +2',on:[{op:'adv',id:'c_find',n:2},{op:'text',t:'信封里没有信,只有一把仓库的钥匙。'}]},
 c_find:{name:'找到林深',size:8,v:0,kind:'p',res:'满:你找到了林深',on:[{op:'win',t:'雨在天亮前停了。你在十三号仓库的最后一格货架后面,找到了活着的林深,和他藏起来的另一本账。城市还是那座城市,但今晚有人要睡不着了。'}]},
 c_heat:{name:'警方追查',size:8,v:1,kind:'r',res:'满:警笛亮起,你被通缉',on:[{op:'lose',t:'警笛在码头尽头亮起来。你把帽檐压低,却发现所有出口都有人在等。案子,到这儿就算结了。'}]}
};
const I = {
 i_rev:{name:'左轮',k:'物品',for:['force'],b:15,consume:false,desc:'六发子弹,少了两发。'},
 i_photo:{name:'林深的照片',k:'线索',for:['talk','investigate'],b:12,consume:false,desc:'边角卷了,背面有个地址。'},
 i_iou:{name:'赌场欠条',k:'关系',for:['bribe','talk'],b:20,consume:true,desc:'有人欠你一个面子。用掉就没了。'},
 i_favor:{name:'老周的人情',k:'关系',for:['investigate','talk'],b:16,consume:true,desc:'报馆里的人情。用掉就没了。'},
 i_ledger:{name:'账本残页',k:'线索',for:['investigate'],b:20,consume:false,desc:'被涂掉的最后一行。'},
 i_clip:{name:'旧剪报',k:'线索',for:['investigate','talk'],b:14,consume:false,desc:'林深失踪前一周的社会版。'}
};
const A = {
 a_chat:{node:'chen',name:'套近乎',tags:['talk'],base:[55,30,15],main:'c_chen',risk:'c_sus',phases:[0,1,2],desc:'递根烟,聊聊潮水和他的腰。',eff:{s:{m:1},n:{m:1,money:-5},f:{r:1}},
  txt:{s:'他靠着木桩把烟抽完,话比烟长。',n:'他收了你的酒钱,话只肯说一半。',f:'你问得太直。他眯起眼,不再看你。'}},
 a_press:{node:'chen',name:'施压',tags:['force'],base:[30,30,40],main:'c_chen',risk:'c_sus',phases:[0,1,2],desc:'把话挑明,让他知道不开口的后果。',eff:{s:{m:2},n:{m:1,r:1},f:{r:1,stress:1}},
  txt:{s:'你把手按在他肩上,他的声音先软了。',n:'他开口了,但手在发抖,眼睛盯着远处的电话亭。',f:'他推开你的手:“我认得你的脸了。”'}},
 a_crate:{node:'crate',name:'撬开货箱',tags:['sneak','force'],base:[40,35,25],main:'c_crate',risk:'c_alert',phases:[2],desc:'封条是新的,里面的东西不是。',eff:{s:{m:2},n:{m:1,r:1},f:{r:1,stress:1}},
  txt:{s:'封条下面是旧账页,纸边还带着潮气。',n:'箱盖掀开了,你也踩响了一块松动的木板。',f:'撬棍滑了一下,金属声在仓库里转了三圈。'}},
 a_back:{node:'back',name:'摸进后门',tags:['sneak'],base:[55,30,15],main:'c_back',risk:'c_alert',phases:[2],desc:'钥匙在手,脚步要轻。',eff:{s:{m:1},n:{m:1,r:1},f:{r:1}},
  txt:{s:'钥匙转得很轻,门后的黑暗里有墨水味。',n:'门开了,铰链叫了一声。远处有人咳嗽。',f:'锁芯卡住了。你站在雨里,听着自己的心跳。'}},
 a_drink:{node:'lian',name:'点一杯酒套话',tags:['talk'],base:[50,35,15],main:'c_lian',phases:[1,2],desc:'一杯威士忌的价钱,换一点口风。',eff:{s:{m:1,money:-6},n:{m:1,money:-6},f:{money:-6,stress:1}},
  txt:{s:'第三杯下去,小莲开始往你这边倾身。',n:'她听着你的故事,顺手多收了两块钱。',f:'一杯酒喝到底,什么也没问出来。'}},
 a_bribe:{node:'lian',name:'塞钱收买',tags:['bribe'],base:[60,25,15],main:'c_lian',phases:[1,2],desc:'钞票比酒更直接。',eff:{s:{m:2,money:-10},n:{m:1,money:-10},f:{stress:1}},
  txt:{s:'钞票消失得很干净,她的笑容也是。',n:'她收了钱,笑得很勉强,像在算利息。',f:'她把钱推了回来,又多看了你一眼。'}},
 a_sort:{node:'office',name:'整理线索',tags:['investigate'],base:[50,35,15],main:'c_find',phases:[0,1,2],desc:'把线索钉在墙上,盯着它们看。',eff:{s:{m:1},n:{m:1,stress:1},f:{stress:1}},
  txt:{s:'图钉连成一条线,你看见了线的尽头。',n:'线索对上了两条,但你整晚没合眼。',f:'烟灰缸满了,线索还是一团乱麻。'}},
 a_paper:{node:'zhou',name:'请老周翻旧报',tags:['investigate','talk'],base:[55,30,15],main:'c_news',phases:[0,1],desc:'老周欠你一个人情,也不介意再多一个。',eff:{s:{m:1},n:{m:1,stress:1},f:{stress:1}},
  txt:{s:'老周翻出一叠发黄的晚报,日期正卡在林深失踪前。',n:'老周帮了忙,顺口说你最近脸色不好。',f:'资料室锁着,老周也不见人影。'}},
 a_widow:{node:'widow',name:'登门拜访',tags:['talk'],base:[40,35,25],main:'c_widow',phases:[0,1],desc:'带上帽子,放低声音。',eff:{s:{m:1},n:{m:1,stress:1},f:{stress:1}},
  txt:{s:'她把茶杯放下,说起了那封没寄出的信。',n:'她开口了,但眼睛一直盯着你的帽檐。',f:'管家把你送到门口,门在你身后合上。'}},
 a_cop:{node:'police',name:'给巡警塞红包',tags:['bribe'],base:[45,35,20],main:'c_heat',phases:[0,1],desc:'一个信封,让这片街区少一双眼睛。',eff:{s:{m:-2,money:-8},n:{m:-1,money:-8},f:{m:1,stress:1}},
  txt:{s:'红包进了口袋,巡警的目光转向别处。',n:'他收下了,但只肯担保一半。',f:'他把信封推了回来,并记下了你的车牌。'}}
};


export { N, C0, I, A };
