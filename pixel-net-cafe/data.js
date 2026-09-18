"use strict";
var SAVE_KEY="pixel-net-cafe-save-v3", OLD_KEY="pixel-net-cafe-save-v2", META_KEY="pixel-net-cafe-meta-v1";
var pcs=[
{id:"office",tier:1,cost:90,power:1,wear:1.0,color:0x8490ad},
{id:"gaming",tier:2,cost:230,power:2,wear:1.5,color:0x4fd0ab},
{id:"pro",tier:3,cost:460,power:4,wear:2.3,color:0xd98dff}
];
var customers={
student:{tier:1,base:[0,15,17,18],duration:1700,patience:4,color:0xffd36b},
worker:{tier:1,base:[0,21,23,23],duration:1500,patience:3,color:0x76d8ff},
gamer:{tier:2,base:[0,0,32,39],duration:2400,patience:4,color:0x6fe29f},
streamer:{tier:3,base:[0,0,0,68],duration:2900,patience:5,color:0xec8dff}
};
var districts={
campus:{nameZh:"大学城",nameEn:"Campus Strip",descZh:"学生和玩家很多，客流旺，但预算敏感。",descEn:"More students and gamers. Busy, price-sensitive traffic.",weights:{student:44,worker:16,gamer:34,streamer:6},seatMul:.92},
office:{nameZh:"商务园",nameEn:"Office Park",descZh:"白领更多，午晚高峰稳定，Wi-Fi 很重要。",descEn:"More office workers. Reliable demand and Wi-Fi matters.",weights:{student:16,worker:52,gamer:25,streamer:7},incomeMul:1.06},
esports:{nameZh:"电竞街",nameEn:"Esports Block",descZh:"玩家和主播多，高配机会大，但机器更容易磨损。",descEn:"More gamers and streamers. Higher upside, faster wear.",weights:{student:15,worker:18,gamer:50,streamer:17},wearMul:1.18}
};
var perks={
contacts:{nameZh:"渠道商熟人",nameEn:"Supplier Contacts",descZh:"采购价 -10%。",descEn:"Purchases cost 10% less.",max:3,rarity:"common"},
green:{nameZh:"节能套餐",nameEn:"Green Power",descZh:"电费 -15%。",descEn:"Power bills -15%.",max:3,rarity:"common"},
noodles:{nameZh:"泡面之神",nameEn:"Noodle Empire",descZh:"每位成功上机顾客额外消费 ¥4。",descEn:"Every seated customer spends +¥4.",max:3,rarity:"common"},
community:{nameZh:"本地社群",nameEn:"Local Community",descZh:"每天基础客流 +2，完成任务额外 +1 口碑。",descEn:"+2 base demand; contracts give +1 extra rep.",max:3,rarity:"common"},
fast:{nameZh:"快速翻台",nameEn:"Fast Turnover",descZh:"上机时长 -12%，但每客收入 -4%。",descEn:"Sessions are 12% shorter, but revenue -4%.",max:3,rarity:"rare"},
rgb:{nameZh:"RGB 溢价",nameEn:"RGB Premium",descZh:"玩家/主播收入 +18%，耗电 +8%。",descEn:"Gamers/streamers pay +18%, power use +8%.",max:3,rarity:"rare"},
student:{nameZh:"学生夜卡",nameEn:"Student Night Pass",descZh:"学生收入 +35%，学生出现率提高。",descEn:"Students pay +35% and appear more often.",max:2,rarity:"rare"},
vip:{nameZh:"会员分层",nameEn:"VIP Tiers",descZh:"所有收入 +12%，但顾客耐心 -1。",descEn:"All revenue +12%, but customers have -1 patience.",max:3,rarity:"rare"},
warranty:{nameZh:"整机延保",nameEn:"Extended Warranty",descZh:"故障损失 -40%，磨损 -10%。",descEn:"Breakdown loss -40%, wear -10%.",max:2,rarity:"rare"},
overclock:{nameZh:"全店超频",nameEn:"Full Overclock",descZh:"电脑收入 +22%，磨损 +35%。",descEn:"PC revenue +22%, wear +35%.",max:2,rarity:"epic"},
stream:{nameZh:"主播合作",nameEn:"Creator Deal",descZh:"主播收入 +40%，主播出现率提高。",descEn:"Streamers pay +40% and appear more often.",max:2,rarity:"epic"},
secondhand:{nameZh:"二手机皇",nameEn:"Refurb King",descZh:"换机折价从 35% 提升到 60%。",descEn:"Trade-in credit rises from 35% to 60%.",max:1,rarity:"epic"},
loyalty:{nameZh:"好评连击",nameEn:"Review Streak",descZh:"每连续接待 5 位且无人离队，会获得更高小费。",descEn:"Every 5-customer no-leave streak pays a larger tip.",max:2,rarity:"rare"}
};
var bossInfo={
5:{titleZh:"校园杯决赛夜",titleEn:"Campus Cup Final",descZh:"大量玩家涌入。没有足够游戏机就会爆队列。",descEn:"A gamer-heavy rush. You need enough Gaming PCs.",target:17,weights:{student:10,worker:5,gamer:78,streamer:7},reward:260},
10:{titleZh:"主播联动夜",titleEn:"Creator Collab Night",descZh:"主播和玩家增加，高配机位价值暴涨。",descEn:"More streamers and gamers. Pro rigs become critical.",target:20,weights:{student:8,worker:8,gamer:48,streamer:36},reward:520},
15:{titleZh:"全城电竞节",titleEn:"City Esports Festival",descZh:"最后一晚：超大客流。撑过去就算通关。",descEn:"Final night: massive mixed traffic. Survive to win.",target:25,weights:{student:18,worker:12,gamer:48,streamer:22},reward:1000}
};
var T={
zh:{title:"像素网吧：夜班经理",sub:"ROGUELITE · 网吧经营",cash:"现金",day:"天数",rep:"口碑",cost:"日成本",sel:"当前选择",empty:"空地",emptyD:"购买座位，然后配置电脑。不同顾客会挑不同档位的机器。",seat:"座位 {n}",noPc:"有桌椅，但还没装电脑。",pcD:"{pc} · 状态 {cond}% · 可服务 {tier} 档顾客",buySeat:"购买座位 ¥{cost}",repair:"维修 ¥{cost}",shop:"电脑商店",facility:"设施升级",promo:"今晚促销 ¥30",promoDone:"促销进行中",log:"营业记录",reset:"重开",help:"玩法",save:"自动保存 · 刷新可继续",office:"办公机",gaming:"游戏机",pro:"电竞旗舰",officeD:"低成本、省电。学生和白领够用。",gamingD:"主力机型。可服务玩家。",proD:"高收入机器。主播只认这个。",buy:"购买 ¥{cost}",upgrade:"换机 ¥{cost}",equipped:"已装备",poor:"现金不够。",bSeat:"买下了一个新座位。",bPc:"{seat} 安装 {pc}。",repaired:"{seat} 维修完成，花费 ¥{cost}。",arrive:"{who} 到店。",served:"{who} 在 {seat} 上机，收入 ¥{money}。",leave:"{who} 等不及走了，口碑 -1。",break:"{seat} 设备故障，损失 ¥{loss}。",end:"第 {day} 天结算：房租+电费 ¥{cost}。",contractDone:"今日任务完成！奖励 ¥{money}，口碑 +{rep}。",contractFail:"今日任务没完成。",bossWin:"Boss 夜撑过去了！额外奖励 ¥{money}。",contract:"今日任务",nextBoss:"下一场 Boss 夜：第 {day} 天",bossNow:"BOSS NIGHT",flow:"客流",record:"最佳 Day {day} · 通关 {wins} 次",facilityWifi:"千兆 Wi-Fi",facilityWifiD:"白领/主播收入 +10%/级。",facilityAc:"中央空调",facilityAcD:"磨损和故障率下降，但每天多耗电。",facilitySnack:"泡面柜台",facilitySnackD:"每位顾客额外消费 +¥3/级。",level:"等级 {n}/3",max:"已满级",promoLog:"今晚开促销：客流 +4，收入 +15%，磨损 +20%。",modalEvent:"随机事件",modalPerk:"每日构筑",pickPerk:"选一张，永久作用于本局",pick:"选择",confirm:"确定清空当前存档并开始新一局？",district:"街区",dailyRevenue:"营业额达到 ¥{goal}",dailyGamers:"服务 {goal} 位玩家/主播",dailyServe:"成功接待 {goal} 位顾客",progressMoney:"¥{a} / ¥{b}",progressCount:"{a} / {b}",bossReward:"Boss 奖励 ¥{n}",gameOver:"破产关门",gameOverD:"现金跌破 -¥250 或口碑归零。你的网吧在第 {day} 天倒下了。",restart:"新一局",win:"你守住了 15 天！",winD:"网吧在全城电竞节后站稳脚跟。你可以进入无尽模式，或带着记录重新开局。",endless:"继续无尽",newRun:"新一局",eventPower:"老线路发热",eventPowerD:"电工说线路快扛不住了。",eventPowerA:"停业检修：付 ¥70，本日故障率大降",eventPowerB:"继续营业：省钱，但今天更容易故障",eventTeam:"校队来谈赞助",eventTeamD:"他们想把你的网吧当训练基地。",eventTeamA:"赞助 ¥60：口碑 +3，今天多来 3 个玩家",eventTeamB:"拒绝：拿他们的设备广告费 ¥35",eventCreator:"小主播求免费包夜",eventCreatorD:"粉丝不多，但很会剪短视频。",eventCreatorA:"免单：口碑 +3，未来主播概率提升",eventCreatorB:"照常收费：立刻收 ¥80，口碑 -1",eventUsed:"本日事件已处理",helpTitle:"怎么玩才爽？",helpBody:"1. 低配机服务学生/白领，游戏机才能接玩家，电竞旗舰才能接主播.
2. 顾客会排队；等太久会走并掉口碑。
3. 每天完成任务拿钱和口碑；第 5/10/15 天是 Boss 夜。
4. 每天结算后选一个 Roguelite 强化，能构筑学生流、电竞流、主播流、低耗能流等。
5. 促销能多赚钱，但会带来更大客流和磨损。
6. 口碑归零或现金低于 -¥250 会关门。",lang:"EN",emptyStatus:"EMPTY",brokenStatus:"BROKEN",readyStatus:"READY",combo:"连击 {n}！顾客小费 ¥{tip}。"},
en:{title:"Pixel Net Cafe: Night Shift",sub:"ROGUELITE · NET CAFE",cash:"Cash",day:"Day",rep:"Rep",cost:"Daily Cost",sel:"Selected",empty:"Empty Spot",emptyD:"Buy a seat, then install a PC. Different customers demand different tiers.",seat:"Seat {n}",noPc:"Furniture ready, but no PC installed.",pcD:"{pc} · condition {cond}% · serves tier {tier}",buySeat:"Buy Seat ¥{cost}",repair:"Repair ¥{cost}",shop:"PC Shop",facility:"Facilities",promo:"Night Promo ¥30",promoDone:"Promo Active",log:"Shift Log",reset:"Restart",help:"How to Play",save:"Autosave · refresh-safe",office:"Office PC",gaming:"Gaming PC",pro:"Esports Rig",officeD:"Cheap and efficient. Enough for students/workers.",gamingD:"Core machine. Unlocks gamers.",proD:"High income. Streamers require this tier.",buy:"Buy ¥{cost}",upgrade:"Replace ¥{cost}",equipped:"Equipped",poor:"Not enough cash.",bSeat:"Bought a new seat.",bPc:"Installed {pc} at {seat}.",repaired:"Repaired {seat} for ¥{cost}.",arrive:"{who} arrived.",served:"{who} took {seat}. Earned ¥{money}.",leave:"{who} left the queue. Rep -1.",break:"{seat} broke down. Lost ¥{loss}.",end:"Day {day} closed. Rent + power: ¥{cost}.",contractDone:"Contract complete! +¥{money}, +{rep} rep.",contractFail:"Daily contract failed.",bossWin:"Boss night cleared! Bonus ¥{money}.",contract:"Daily Contract",nextBoss:"Next Boss Night: Day {day}",bossNow:"BOSS NIGHT",flow:"Traffic",record:"Best Day {day} · {wins} wins",facilityWifi:"Gigabit Wi-Fi",facilityWifiD:"Workers/streamers pay +10% per level.",facilityAc:"Central AC",facilityAcD:"Lower wear/breakdowns, but adds daily power cost.",facilitySnack:"Noodle Counter",facilitySnackD:"Every customer spends +¥3 per level.",level:"Level {n}/3",max:"MAX",promoLog:"Night promo active: +4 traffic, +15% revenue, +20% wear.",modalEvent:"RANDOM EVENT",modalPerk:"DAILY BUILD",pickPerk:"Pick one permanent upgrade for this run",pick:"Pick",confirm:"Delete current save and start a new run?",district:"District",dailyRevenue:"Earn ¥{goal} revenue",dailyGamers:"Serve {goal} gamers/streamers",dailyServe:"Serve {goal} customers",progressMoney:"¥{a} / ¥{b}",progressCount:"{a} / {b}",bossReward:"Boss reward ¥{n}",gameOver:"Cafe Closed",gameOverD:"Cash below -¥250 or reputation hit zero. Your run ended on Day {day}.",restart:"New Run",win:"You survived 15 days!",winD:"Your cafe made it through the city esports festival. Continue endless mode or start a fresh run.",endless:"Endless Mode",newRun:"New Run",eventPower:"Old Wiring Is Hot",eventPowerD:"The electrician says your wiring is near its limit.",eventPowerA:"Repair now: pay ¥70, far fewer breakdowns today",eventPowerB:"Stay open: save money, higher breakdown risk today",eventTeam:"College Team Sponsorship",eventTeamD:"A local team wants your cafe as its training base.",eventTeamA:"Sponsor ¥60: +3 rep, +3 gamers today",eventTeamB:"Decline: take ¥35 in equipment ad money",eventCreator:"Small Creator Wants a Free Night",eventCreatorD:"Not famous yet, but good at short-form videos.",eventCreatorA:"Comp it: +3 rep, more streamers later",eventCreatorB:"Charge full price: +¥80 now, -1 rep",eventUsed:"Event resolved",helpTitle:"How to make it fun",helpBody:"1. Office PCs serve students/workers; Gaming PCs unlock gamers; Pro rigs unlock streamers.
2. Customers queue and leave if patience runs out.
3. Complete daily contracts. Boss nights hit on Days 5/10/15.
4. Pick one permanent roguelite upgrade after every day and build around students, esports, creators, efficiency, etc.
5. Night Promo increases profit and traffic, but also wear.
6. You lose at 0 rep or below -¥250 cash.",lang:"中",emptyStatus:"EMPTY",brokenStatus:"BROKEN",readyStatus:"READY",combo:"{n} streak! Customer tips ¥{tip}."}
};