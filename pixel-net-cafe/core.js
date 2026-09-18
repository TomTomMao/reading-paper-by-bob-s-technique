"use strict";
function metaLoad(){try{return Object.assign({bestDay:1,wins:0,bestCash:0},JSON.parse(localStorage.getItem(META_KEY)||"{}"))}catch(e){return{bestDay:1,wins:0,bestCash:0}}}
var meta=metaLoad();
function randomDistrict(){var a=Object.keys(districts);return a[Math.floor(Math.random()*a.length)]}
function makeContract(day){var r=Math.random();if(r<.38)return{kind:"revenue",goal:110+day*22,progress:0,reward:65+day*7,done:false};if(r<.7)return{kind:"gamers",goal:Math.max(2,Math.floor(1+day/2)),progress:0,reward:70+day*8,done:false};return{kind:"serve",goal:Math.max(5,6+Math.floor(day*.55)),progress:0,reward:60+day*7,done:false}}
function baseState(){var d=randomDistrict();return{version:3,lang:"zh",day:1,money:700,rep:5,arrivals:0,served:0,target:9,selected:0,seats:Array(12).fill(null),queue:[],logs:[],district:d,perks:{},facilities:{wifi:0,ac:0,snack:0},contract:makeContract(1),dailyRevenue:0,dailyGamers:0,promoUsed:false,promoBoost:false,eventDone:false,eventRisk:0,streamBias:0,gamerBias:0,streak:0,endless:false,paused:false,won:false,over:false}}
function migrateOld(){try{var o=JSON.parse(localStorage.getItem(OLD_KEY)||"null");if(!o)return null;var n=baseState();n.lang=o.lang||"zh";n.day=o.day||1;n.money=Number.isFinite(o.money)?o.money:700;n.rep=Math.max(1,o.rep||5);n.selected=o.selected||0;n.seats=Array.from({length:12},function(_,i){var q=o.seats&&o.seats[i];return q?{pc:q.pc||null,busy:false,condition:q.pc?100:null,customer:null}:null});n.target=Math.max(9,7+n.day);n.contract=makeContract(n.day);return n}catch(e){return null}}
function load(){try{var raw=JSON.parse(localStorage.getItem(SAVE_KEY)||"null");var s=raw||migrateOld()||baseState();s.version=3;s.queue=[];s.paused=false;s.seats=Array.from({length:12},function(_,i){var q=s.seats&&s.seats[i];return q?Object.assign({pc:null,busy:false,condition:q.pc?100:null,customer:null},q,{busy:false,customer:null}):null});s.perks=s.perks||{};s.facilities=Object.assign({wifi:0,ac:0,snack:0},s.facilities||{});s.contract=s.contract||makeContract(s.day||1);s.gamerBias=s.gamerBias||0;s.streak=s.streak||0;return s}catch(e){return baseState()}}
var s=load(), scene=null, timer=null, shopMode=null, eventLock=false;
function tr(k,o){var v=(T[s.lang]&&T[s.lang][k])||k;o=o||{};Object.keys(o).forEach(function(a){v=v.split("{"+a+"}").join(o[a])});return v}
function save(){localStorage.setItem(SAVE_KEY,JSON.stringify(s));meta.bestDay=Math.max(meta.bestDay,s.day);meta.bestCash=Math.max(meta.bestCash,s.money);localStorage.setItem(META_KEY,JSON.stringify(meta))}
function perkCount(id){return s.perks[id]||0}
function district(){return districts[s.district]||districts.campus}
function dName(){var d=district();return s.lang==="zh"?d.nameZh:d.nameEn}
function dDesc(){var d=district();return s.lang==="zh"?d.descZh:d.descEn}
function pcBy(id){return pcs.find(function(p){return p.id===id})}
function seatCount(){return s.seats.filter(Boolean).length}
function seatCost(){var mul=district().seatMul||1;return Math.round((110+seatCount()*25)*mul*(1-.1*perkCount("contacts")))}
function tradeInRate(){return perkCount("secondhand")?0.60:0.35}
function pcPrice(p,q){var price=p.cost*(1-.1*perkCount("contacts"));var trade=q&&q.pc?pcBy(q.pc).cost*tradeInRate():0;return Math.max(20,Math.round(price-trade))}
function basePower(){var n=0;s.seats.forEach(function(q){if(q&&q.pc)n+=pcBy(q.pc).power*5});n*=1+.08*perkCount("rgb");n*=1-.15*perkCount("green");n+=s.facilities.ac*6;return Math.max(0,Math.round(n))}
function rent(){return Math.round(34+s.day*3+seatCount()*3)}
function dailyCost(){return rent()+basePower()}
function wearMul(){var x=(district().wearMul||1)*(1+.35*perkCount("overclock"))*(1-.1*perkCount("warranty"))*(1-.09*s.facilities.ac);if(s.promoBoost)x*=1.2;return Math.max(.35,x)}
function durationMul(){return Math.max(.52,1-.12*perkCount("fast"))}
function customerPatience(c){return Math.max(1,c.patience-perkCount("vip"))}
function revenueFor(type,tier){var c=customers[type],v=c.base[tier]||0;v*=district().incomeMul||1;v*=1+.12*perkCount("vip");v*=1+.22*perkCount("overclock");v*=1-.04*perkCount("fast");if(type==="student")v*=1+.35*perkCount("student");if(type==="gamer"||type==="streamer")v*=1+.18*perkCount("rgb");if(type==="streamer")v*=1+.40*perkCount("stream");if(type==="worker"||type==="streamer")v*=1+.10*s.facilities.wifi;v+=4*perkCount("noodles")+3*s.facilities.snack;if(s.promoBoost)v*=1.15;return Math.max(1,Math.round(v))}
function weightsForDay(){var w=Object.assign({},district().weights);var boss=bossInfo[s.day];if(boss&&!s.endless)w=Object.assign({},boss.weights);w.student+=8*perkCount("student");w.gamer+=s.gamerBias||0;w.streamer+=7*perkCount("stream")+s.streamBias;return w}
function pickCustomer(){var w=weightsForDay(),keys=Object.keys(w),total=keys.reduce(function(a,k){return a+w[k]},0),r=Math.random()*total;for(var i=0;i<keys.length;i++){r-=w[keys[i]];if(r<=0)return keys[i]}return"student"}
function customerName(type){var zh={student:"学生",worker:"白领",gamer:"玩家",streamer:"主播"},en={student:"Student",worker:"Worker",gamer:"Gamer",streamer:"Streamer"};return(s.lang==="zh"?zh:en)[type]}
function log(msg,tone){s.logs.unshift({m:msg,t:tone||""});s.logs=s.logs.slice(0,24);save();renderLog()}
function nextBossDay(){if(s.endless)return null;return s.day<5?5:s.day<10?10:s.day<15?15:null}
function bossToday(){return !s.endless&&!!bossInfo[s.day]}
function targetForDay(day){var b=!s.endless&&bossInfo[day];if(b)return b.target;return Math.max(8,8+Math.floor(day*.75)+2*perkCount("community"))}
function contractProgress(){if(s.contract.kind==="revenue")return s.dailyRevenue;if(s.contract.kind==="gamers")return s.dailyGamers;return s.served}
function contractLabel(){if(s.contract.kind==="revenue")return tr("dailyRevenue",{goal:s.contract.goal});if(s.contract.kind==="gamers")return tr("dailyGamers",{goal:s.contract.goal});return tr("dailyServe",{goal:s.contract.goal})}
function contractProgressText(){var p=Math.min(contractProgress(),s.contract.goal);return s.contract.kind==="revenue"?tr("progressMoney",{a:p,b:s.contract.goal}):tr("progressCount",{a:p,b:s.contract.goal})}