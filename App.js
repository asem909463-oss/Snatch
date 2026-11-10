import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaView, View, Text, StyleSheet, Pressable, StatusBar,
  Dimensions, ScrollView, Platform, AppState
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { createRun, stepRun, movePlayer, dashPlayer, dailySeed, getDateKey, rankForXp, DAILY_GOALS } from "./src/game/engine";
import { SAVE_KEY, DEFAULT_SAVE, SKINS, mergeSave, applyRun, claimDaily, buySkin, dailyStatus } from "./src/game/progression";

const { width: SCREEN_W } = Dimensions.get("window");
const C = { bg:"#090C12", panel:"#121823", panel2:"#192231", line:"#273345", text:"#F3F5F7", muted:"#8793A5", dim:"#596579", lime:"#C8FF55", red:"#FF647C", gold:"#FFD36B", cyan:"#75D9FF" };
const fmt = n => Math.floor(n || 0).toLocaleString();
const today = () => getDateKey(new Date());
const SKIN = id => SKINS.find(s => s.id === id) || SKINS[0];

function Label({children, style}) { return <Text style={[styles.label, style]}>{children}</Text>; }
function Button({title, onPress, secondary=false, disabled=false, style}) {
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} onPress={onPress} disabled={disabled}
    style={({pressed})=>[styles.button, secondary && styles.buttonSecondary, disabled && {opacity:.4}, pressed && {opacity:.78, transform:[{scale:.985}]}, style]}>
    <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{title}</Text>
  </Pressable>;
}
function Panel({children, style}) { return <View style={[styles.panel,style]}>{children}</View>; }
function Top({title, back, right}) {
  return <View style={styles.top}><Pressable onPress={back} style={styles.topSide}><Text style={styles.backText}>{back ? "‹ BACK" : "SNATCH"}</Text></Pressable><Text style={styles.topTitle}>{title}</Text><View style={[styles.topSide,{alignItems:"flex-end"}]}>{right || <Text style={styles.topMark}>●</Text>}</View></View>;
}
function Stat({label,value,accent}) { return <View style={styles.stat}><Label>{label}</Label><Text style={[styles.statValue,accent && {color:accent}]}>{value}</Text></View>; }

export default function App() {
  const [save,setSave] = useState(DEFAULT_SAVE);
  const [loaded,setLoaded] = useState(false);
  const [screen,setScreen] = useState("home");
  const [run,setRun] = useState(null);
  const [lastResult,setLastResult] = useState(null);
  const [dailyClaimed,setDailyClaimed] = useState(false);
  const runRef = useRef(null);\n  const swipeResponder = useMemo(()=>PanResponder.create({\n    onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)>12 && Math.abs(g.dx)>Math.abs(g.dy),\n    onPanResponderRelease:(_,g)=>{ if(Math.abs(g.dx)>24) changeLane(g.dx<0?1:-1); }\n  }),[]);
  const saveRef = useRef(save);
  const saveTimer = useRef(null);
  const alive = useRef(true);
  const skin = useMemo(()=>SKIN(save.equippedSkin),[save.equippedSkin]);
  const dateKey = today();
  const daily = dailyStatus(save,dateKey);
  const rank = rankForXp(save.xp);
  const xpNext = ({Rookie:250,Runner:700,Hustler:1400,Pro:2500,Elite:4200,Legend:4200})[rank.name];
  const xpPrev = ({Rookie:0,Runner:250,Hustler:700,Pro:1400,Elite:2500,Legend:4200})[rank.name];

  useEffect(()=>{
    alive.current=true;
    AsyncStorage.getItem(SAVE_KEY).then(raw=>{
      if (!alive.current) return;
      const parsed=mergeSave(raw ? JSON.parse(raw) : null);
      setSave(parsed); saveRef.current=parsed; setLoaded(true);
    }).catch(()=>{ if(alive.current) setLoaded(true); });
    return ()=>{ alive.current=false; if(saveTimer.current) clearTimeout(saveTimer.current); };
  },[]);
  const persist = useCallback((next)=>{
    saveRef.current=next; setSave(next);
    if(saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(()=>AsyncStorage.setItem(SAVE_KEY,JSON.stringify(next)).catch(()=>{}),250);
  },[]);
  useEffect(()=>{ const sub=AppState.addEventListener("change",state=>{ if(state!=="active") AsyncStorage.setItem(SAVE_KEY,JSON.stringify(saveRef.current)).catch(()=>{}); }); return ()=>sub.remove(); },[]);
  const haptic = useCallback((kind="light")=>{
    if(!saveRef.current.haptics) return;
    const fn=kind==="hit"?Haptics.notificationAsync:kind==="success"?Haptics.notificationAsync:Haptics.impactAsync;
    const arg=kind==="hit"||kind==="success" ? (kind==="hit"?Haptics.NotificationFeedbackType.Error:Haptics.NotificationFeedbackType.Success) : (kind==="heavy"?Haptics.ImpactFeedbackStyle.Medium:Haptics.ImpactFeedbackStyle.Light);
    Promise.resolve(fn(arg)).catch(()=>{});
  },[]);
  const start = useCallback((mode="standard")=>{
    const seed=mode==="daily"?dailySeed(dateKey):((Date.now() ^ Math.floor(Math.random()*0xffffffff))>>>0);
    const fresh=createRun(seed); runRef.current={...fresh,mode};
    setRun(runRef.current); setScreen("game"); haptic("success");
  },[dateKey,haptic]);
  useEffect(()=>{
    if(screen!=="game" || !runRef.current || runRef.current.status!=="running") return;
    let previous=Date.now(), accumulator=0, raf=null, mounted=true;
    const frame=()=>{
      if(!mounted) return;
      const now=Date.now(); accumulator+=Math.min(100,now-previous); previous=now;
      let current=runRef.current, changed=false, hit=false;
      while(accumulator>=50 && current?.status==="running"){
        const before=current.lives; current=stepRun(current); accumulator-=50; changed=true;
        if(current.lives<before) hit=true;
      }
      if(changed){ runRef.current=current; setRun({...current}); if(hit) haptic("hit"); if(current.status==="over") finish(current); }
      raf=setTimeout(frame,16);
    };
    const finish=(completed)=>{
      if(runRef.current?.status!=="over") return;
      setScreen("results");
      const result=applyRun(saveRef.current,completed,dateKey);
      persist(result.save); setLastResult({...completed,...result});
      haptic("success");
    };
    raf=setTimeout(frame,16);
    return ()=>{ mounted=false; if(raf) clearTimeout(raf); };
  },[screen,dateKey,haptic,persist]);
  const changeLane = direction => { if(!runRef.current) return; movePlayer(runRef.current,direction); setRun({...runRef.current}); haptic(); };
  const dash = () => { if(!runRef.current || runRef.current.dashCooldown>0) return; dashPlayer(runRef.current); setRun({...runRef.current}); haptic("heavy"); };\n  const pause = () => setScreen("pause");
  const resume = () => setScreen("game");
  const dailyProgress = [
    {id:"coins",title:"Pocket change",detail:"Collect 35 coins",value:daily.coins,target:35},
    {id:"score",title:"Make your mark",detail:"Score 500 in a run",value:daily.score,target:500},
    {id:"dodges",title:"Clean getaway",detail:"Dodge 5 hazards in a run",value:daily.dodges,target:5}
  ];
  const canClaim = dailyProgress.every(g=>g.value>=g.target) && !daily.claimed;
  const claim = () => { const next=claimDaily(saveRef.current,dateKey); persist(next); haptic("success"); };
  const equip = id => { const next={...saveRef.current,equippedSkin:id}; persist(next); haptic(); };
  const purchase = item => { const next=buySkin(saveRef.current,item); if(next!==saveRef.current){persist(next);haptic("success");} };
  const go = s => { setScreen(s); haptic(); };
  const nav = (s,label) => <Pressable onPress={()=>go(s)} style={styles.navItem}><Text style={[styles.navIcon,screen===s&&{color:C.lime}]}>{label}</Text><Text style={[styles.navLabel,screen===s&&{color:C.text}]}>{s.toUpperCase()}</Text></Pressable>;

  if(!loaded) return <SafeAreaView style={styles.safe}><StatusBar barStyle="light-content"/><View style={styles.loading}><Text style={styles.brand}>SNATCH</Text><Text style={styles.muted}>LOADING YOUR RUN...</Text></View></SafeAreaView>;

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="light-content" backgroundColor={C.bg}/>
    {screen==="home" && <View style={styles.screen}>
      <Top title="HOME" right={<Text style={styles.topMark}>◈ {fmt(save.bank)}</Text>}/>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.heroTop}><Label>SEASON 01  /  THE FIRST RUN</Label><View style={styles.liveDot}/></View>
          <Text style={styles.heroTitle}>ONE MORE{ "\n" }RUN.</Text>
          <Text style={styles.heroCopy}>Read the pattern. Take the risk. Own the run.</Text>
          <View style={styles.heroStats}><View><Label>PERSONAL BEST</Label><Text style={styles.heroBest}>{fmt(save.best)}</Text></View><View style={styles.heroDivider}/><View><Label>YOUR RANK</Label><Text style={styles.heroRank}>{rank.name.toUpperCase()}</Text></View></View>
          <Button title="START RUN   →" onPress={()=>start("standard")} style={{marginTop:22}}/>
        </View>
        <View style={styles.sectionHead}><Text style={styles.sectionTitle}>TODAY'S CHALLENGE</Text><Text style={styles.sectionMeta}>{dateKey}</Text></View>
        <Panel>
          <View style={styles.rowBetween}><View><Label>DAILY CONTRACT</Label><Text style={styles.panelTitle}>Three tasks. One reward.</Text></View><Text style={styles.reward}>+75 ◈</Text></View>
          {dailyProgress.map(g=><View key={g.id} style={styles.goalRow}>
            <View style={[styles.goalCheck,g.value>=g.target&&styles.goalDone]}><Text style={styles.goalCheckText}>{g.value>=g.target?"✓":"·"}</Text></View>
            <View style={{flex:1}}><Text style={styles.goalTitle}>{g.title}</Text><Text style={styles.goalDetail}>{g.detail}</Text><View style={styles.progressTrack}><View style={[styles.progressFill,{width:`${Math.min(100,g.value/g.target*100)}%`}]} /></View></View>
            <Text style={styles.goalCount}>{Math.min(g.value,g.target)}/{g.target}</Text>
          </View>)}
          <Button title={daily.claimed?"REWARD CLAIMED ✓":canClaim?"CLAIM DAILY REWARD":"PLAY TO COMPLETE"} onPress={canClaim?claim:()=>start("daily")} disabled={daily.claimed} secondary={!canClaim} style={{marginTop:16}}/>
        </Panel>
        <View style={styles.sectionHead}><Text style={styles.sectionTitle}>YOUR PROGRESSION</Text><Pressable onPress={()=>go("stats")}><Text style={styles.link}>VIEW STATS →</Text></Pressable></View>
        <Panel>
          <View style={styles.rowBetween}><View><Label>PLAYER LEVEL</Label><Text style={styles.panelTitle}>{rank.name}</Text></View><Text style={styles.xpText}>{fmt(save.xp)} XP</Text></View>
          <View style={styles.progressTrack}><View style={[styles.progressFill,{width:`${Math.min(100,(save.xp-xpPrev)/Math.max(1,xpNext-xpPrev)*100)}%`}]} /></View>
          <Text style={styles.goalDetail}>{rank.name==="Legend"?"Top rank reached. Keep setting records.":`${fmt(Math.max(0,xpNext-save.xp))} XP to next rank`}</Text>
          <View style={styles.threeStats}><Stat label="TOTAL RUNS" value={fmt(save.totalRuns)}/><Stat label="COINS BANKED" value={fmt(save.bank)} accent={C.gold}/><Stat label="DAY STREAK" value={save.streak}/></View>
        </Panel>
        <View style={styles.sectionHead}><Text style={styles.sectionTitle}>QUICK ACCESS</Text></View>
        <View style={styles.quickGrid}><Pressable onPress={()=>go("locker")} style={styles.quick}><Text style={styles.quickGlyph}>◈</Text><Text style={styles.quickTitle}>THE LOCKER</Text><Text style={styles.quickCopy}>Unlock your look</Text></Pressable><Pressable onPress={()=>go("stats")} style={styles.quick}><Text style={styles.quickGlyph}>↗</Text><Text style={styles.quickTitle}>RECORD BOOK</Text><Text style={styles.quickCopy}>Track your climb</Text></Pressable></View>
      </ScrollView>
      <View style={styles.nav}>{nav("home","⌂")}{nav("missions","◎")}{nav("locker","◈")}{nav("stats","▤")}</View>
    </View>}

    {screen==="game" && run && <View style={styles.gameScreen}>
      <View style={styles.gameHeader}><View><Label>RUN SCORE</Label><Text style={styles.gameScore}>{fmt(run.score)}</Text></View><View style={styles.gameHeaderRight}><Text style={styles.combo}>{run.multiplier>1?`×${run.multiplier} MULTIPLIER`:"BUILD YOUR STREAK"}</Text><Text style={styles.lives}>{ "♥ ".repeat(run.lives)}<Text style={{color:C.dim}}>{"♡ ".repeat(3-run.lives)}</Text></Text></View><Pressable onPress={pause} style={styles.pauseButton}><Text style={styles.pauseGlyph}>Ⅱ</Text></Pressable></View>
      <View style={styles.arena} {...swipeResponder.panHandlers}>
        <View style={styles.arenaHeader}><Text style={styles.arenaTag}>{run.mode==="daily"?"DAILY SEED":"ENDLESS RUN"}  ·  LVL {run.level}</Text><Text style={styles.arenaTag}>{Math.floor(run.elapsed/1000)}s</Text></View>
        {[1,2].map(n=><View key={n} style={[styles.laneLine,{left:`${n*33.333}%`}]} />)}
        {run.objects.map(o=><View key={o.id} style={[styles.object,{left:`${(o.lane+.5)*33.333}%`,top:`${o.y}%`,backgroundColor:o.type==="coin"?C.gold:o.type==="shield"?C.cyan:C.red,borderColor:o.type==="coin"?"#FFF0B9":o.type==="shield"?"#D9F5FF":"#FFC0CB"}]}><Text style={styles.objectGlyph}>{o.type==="coin"?"◆":o.type==="shield"?"✚":"!"}</Text></View>)}
        <View style={[styles.runner,{left:`${(run.lane+.5)*33.333}%`,backgroundColor:skin.color,shadowColor:skin.color}]}><Text style={[styles.runnerGlyph,{color:skin.dark}]}>S</Text></View>
        <View style={styles.arenaFooter}><Text style={styles.arenaHint}>MOVE BETWEEN LANES</Text><Text style={styles.arenaHint}>{run.shield>0?`SHIELD ×${run.shield}`:"WATCH THE RED"}</Text></View>
      </View>
      <View style={styles.controls}><Pressable onPress={()=>changeLane(-1)} style={styles.control}><Text style={styles.controlGlyph}>‹</Text></Pressable><Pressable onPress={dash} disabled={run.dashCooldown>0} style={[styles.dashButton,run.dashCooldown>0&&styles.dashDisabled]}><Text style={styles.dashTitle}>{run.dashCooldown>0?"RECHARGING":"DASH"}</Text><Text style={styles.dashSub}>{run.dashCooldown>0?`${Math.ceil(run.dashCooldown*0.05)}s`:"8 TICKS"}</Text></Pressable><Pressable onPress={()=>changeLane(1)} style={styles.control}><Text style={styles.controlGlyph}>›</Text></Pressable></View>
      <View style={styles.touchLanes}>{[0,1,2].map(n=><Pressable key={n} onPress={()=>{if(runRef.current){setPlayerLane(runRef.current,n);setRun({...runRef.current});}}} style={styles.touchLane} accessibilityLabel={`Move to lane ${n+1}`} />)}</View>
    </View>}

    {screen==="pause" && <View style={styles.screen}><Top title="PAUSED" back={()=>go("game")}/><View style={styles.center}><Label>TAKE YOUR TIME</Label><Text style={styles.bigTitle}>RUN ON{ "\n" }YOUR TERMS.</Text><Text style={styles.muted}>Your run is safely paused.</Text><Button title="RESUME RUN" onPress={resume}/><Button title="END RUN" secondary onPress={()=>{setRun(null);go("home");}} style={{marginTop:10}}/></View></View>}

    {screen==="results" && lastResult && <View style={styles.screen}><Top title="RUN COMPLETE"/><View style={styles.center}>
      <Label>THAT'S A WRAP</Label><Text style={styles.bigTitle}>GOOD RUN.</Text>
      <Text style={styles.resultScore}>{fmt(lastResult.score)}</Text><Text style={styles.resultCaption}>FINAL SCORE</Text>
      {lastResult.isNewBest && <Text style={styles.newRecord}>✦ NEW PERSONAL BEST ✦</Text>}
      <View style={styles.resultGrid}><Stat label="COINS" value={lastResult.coins} accent={C.gold}/><Stat label="DODGES" value={lastResult.dodges}/><Stat label="BEST COMBO" value={lastResult.bestCombo}/></View>
      <Panel style={styles.earnPanel}><View style={styles.rowBetween}><Text style={styles.panelTitle}>RUN REWARDS</Text><Text style={styles.reward}>+{lastResult.xpEarned} XP</Text></View><Text style={styles.goalDetail}>+{lastResult.bankEarned} coins added to your locker</Text>{lastResult.newly.length>0&&<Text style={styles.newRecord}>ACHIEVEMENT UNLOCKED</Text>}</Panel>
      <Button title="RUN IT BACK  →" onPress={()=>start("standard")}/><Button title="BACK TO HOME" secondary onPress={()=>go("home")} style={{marginTop:10}}/>
    </View></View>}

    {screen==="missions" && <View style={styles.screen}><Top title="MISSIONS" back={()=>go("home")}/><ScrollView contentContainerStyle={styles.scroll}>
      <Label>DAILY CONTRACT · {dateKey}</Label><Text style={styles.pageTitle}>MAKE TODAY{ "\n" }COUNT.</Text><Text style={styles.muted}>Complete all three objectives to claim 75 coins and 100 XP. Progress carries across runs today.</Text>
      {dailyProgress.map(g=><Panel key={g.id} style={{marginTop:12}}><View style={styles.rowBetween}><Text style={styles.panelTitle}>{g.title}</Text><Text style={styles.goalCount}>{Math.min(g.value,g.target)}/{g.target}</Text></View><Text style={styles.goalDetail}>{g.detail}</Text><View style={styles.progressTrack}><View style={[styles.progressFill,{width:`${Math.min(100,g.value/g.target*100)}%`}]} /></View></Panel>)}
      <Button title={daily.claimed?"CLAIMED ✓":canClaim?"CLAIM REWARD":"START DAILY RUN"} onPress={canClaim?claim:()=>start("daily")} disabled={daily.claimed} style={{marginTop:20}}/>
      <Panel style={{marginTop:24}}><Label>ACHIEVEMENTS</Label><Text style={styles.panelTitle}>Proof of progress.</Text>
        {[["first-run","First steps","Finish your first run"],["score-1000","Four digits","Score 1,000 in a run"],["coin-100","Pocket full","Collect 100 coins total"],["dodge-50","Untouchable","Dodge 50 hazards total"],["streak-3","Regular","Build a 3-day streak"],["combo-15","In the zone","Reach a 15 combo"]].map(([id,name,desc])=><View key={id} style={styles.achievement}><Text style={[styles.achievementIcon,{color:save.achievements.includes(id)?C.lime:C.dim}]}>{save.achievements.includes(id)?"◆":"◇"}</Text><View style={{flex:1}}><Text style={styles.goalTitle}>{name}</Text><Text style={styles.goalDetail}>{desc}</Text></View><Text style={styles.achievementState}>{save.achievements.includes(id)?"UNLOCKED":"LOCKED"}</Text></View>)}
      </Panel>
    </ScrollView><View style={styles.nav}>{nav("home","⌂")}{nav("missions","◎")}{nav("locker","◈")}{nav("stats","▤")}</View></View>}

    {screen==="locker" && <View style={styles.screen}><Top title="THE LOCKER" back={()=>go("home")} right={<Text style={styles.topMark}>◈ {fmt(save.bank)}</Text>}/><ScrollView contentContainerStyle={styles.scroll}><Label>MAKE IT YOURS</Label><Text style={styles.pageTitle}>YOUR RUN.{ "\n" }YOUR STYLE.</Text><Text style={styles.muted}>Earn coins in runs. Unlock a look that feels like yours.</Text>
      {SKINS.map(item=>{const unlocked=save.unlockedSkins.includes(item.id),equipped=save.equippedSkin===item.id;return <View key={item.id} style={styles.skinRow}><View style={[styles.skinPreview,{backgroundColor:item.color}]}><Text style={[styles.skinPreviewText,{color:item.dark}]}>S</Text></View><View style={{flex:1}}><Text style={styles.panelTitle}>{item.name}</Text><Text style={styles.goalDetail}>{unlocked?"Owned":`Unlock for ${fmt(item.cost)} coins`}</Text></View><Pressable onPress={()=>unlocked?equip(item.id):purchase(item)} disabled={!unlocked&&save.bank<item.cost} style={[styles.skinAction,equipped&&styles.skinEquipped]}><Text style={[styles.skinActionText,equipped&&{color:C.lime}]}>{equipped?"EQUIPPED":unlocked?"EQUIP":`◈ ${item.cost}`}</Text></Pressable></View>})}
    </ScrollView><View style={styles.nav}>{nav("home","⌂")}{nav("missions","◎")}{nav("locker","◈")}{nav("stats","▤")}</View></View>}

    {screen==="stats" && <View style={styles.screen}><Top title="RECORD BOOK" back={()=>go("home")}/><ScrollView contentContainerStyle={styles.scroll}><Label>YOUR STORY SO FAR</Label><Text style={styles.pageTitle}>THE NUMBERS{ "\n" }DON'T LIE.</Text><Panel style={{marginTop:18}}><View style={styles.statRows}><Stat label="PERSONAL BEST" value={fmt(save.best)} accent={C.lime}/><Stat label="PLAYER XP" value={fmt(save.xp)}/></View><View style={styles.statRows}><Stat label="TOTAL RUNS" value={fmt(save.totalRuns)}/><Stat label="TOTAL COINS" value={fmt(save.totalCoins)} accent={C.gold}/></View><View style={styles.statRows}><Stat label="HAZARDS DODGED" value={fmt(save.totalDodges)}/><Stat label="DAY STREAK" value={save.streak}/></View></Panel><View style={styles.sectionHead}><Text style={styles.sectionTitle}>RECENT RUNS</Text></View>{save.history.length===0?<Panel><Text style={styles.muted}>Your record book is empty. Go make history.</Text></Panel>:save.history.map((r,i)=><View key={i} style={styles.historyRow}><Text style={styles.historyDate}>{r.date}</Text><Text style={styles.historyScore}>{fmt(r.score)}</Text><Text style={styles.historyCoins}>◈ {r.coins}</Text></View>)}<Panel style={{marginTop:20}}><Label>COMPETITIVE STATUS</Label><Text style={styles.panelTitle}>Your personal leaderboard.</Text><Text style={styles.goalDetail}>Global and friends leaderboards require a secure online service. Your personal best, daily seeded challenge and achievements work offline right now. No fake rankings.</Text></Panel></ScrollView><View style={styles.nav}>{nav("home","⌂")}{nav("missions","◎")}{nav("locker","◈")}{nav("stats","▤")}</View></View>}
  </SafeAreaView>;
}

const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.bg},screen:{flex:1,backgroundColor:C.bg,paddingHorizontal:20},loading:{flex:1,alignItems:"center",justifyContent:"center",gap:12},
 top:{height:54,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:"#18212E"},
 topSide:{width:82},backText:{fontSize:10,color:C.lime,fontWeight:"900",letterSpacing:1.4},topTitle:{color:C.text,fontSize:11,fontWeight:"900",letterSpacing:2},topMark:{color:C.gold,fontWeight:"900",fontSize:13,textAlign:"right"},
 brand:{fontSize:30,fontWeight:"900",letterSpacing:6,color:C.lime},muted:{fontSize:13,color:C.muted,lineHeight:20},label:{fontSize:9,fontWeight:"900",letterSpacing:1.7,color:C.dim},
 scroll:{paddingTop:20,paddingBottom:28},hero:{backgroundColor:"#151F2A",borderRadius:24,borderWidth:1,borderColor:"#31402D",padding:22,overflow:"hidden"},
 heroTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},liveDot:{width:7,height:7,borderRadius:4,backgroundColor:C.lime},
 heroTitle:{fontSize:56,lineHeight:55,fontWeight:"900",letterSpacing:-3,color:C.text,marginTop:25},heroCopy:{color:"#A6B0BF",fontSize:13,marginTop:9},
 heroStats:{flexDirection:"row",alignItems:"center",gap:24,marginTop:25},heroBest:{fontSize:27,fontWeight:"900",color:C.lime,marginTop:5},heroRank:{fontSize:19,fontWeight:"900",color:C.text,marginTop:10},heroDivider:{width:1,height:40,backgroundColor:"#3A4654"},
 button:{height:54,borderRadius:14,backgroundColor:C.lime,alignItems:"center",justifyContent:"center"},buttonText:{fontSize:12,fontWeight:"900",letterSpacing:1.5,color:"#11170A"},buttonSecondary:{backgroundColor:"#202B3A",borderWidth:1,borderColor:"#344153"},buttonSecondaryText:{color:C.text},
 sectionHead:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginTop:26,marginBottom:12},sectionTitle:{color:C.text,fontSize:10,fontWeight:"900",letterSpacing:1.5},sectionMeta:{color:C.dim,fontSize:10},link:{color:C.lime,fontSize:9,fontWeight:"900",letterSpacing:1},
 panel:{backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:18,padding:17},rowBetween:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},panelTitle:{color:C.text,fontSize:15,fontWeight:"800",marginTop:5},reward:{color:C.gold,fontSize:13,fontWeight:"900"},goalRow:{flexDirection:"row",alignItems:"center",gap:11,marginTop:18},
 goalCheck:{width:23,height:23,borderRadius:8,borderWidth:1,borderColor:"#3B4859",alignItems:"center",justifyContent:"center"},goalDone:{backgroundColor:C.lime,borderColor:C.lime},goalCheckText:{color:C.bg,fontWeight:"900"},goalTitle:{fontSize:12,fontWeight:"800",color:C.text},goalDetail:{fontSize:10,color:C.muted,marginTop:4,lineHeight:15},goalCount:{fontSize:10,color:C.muted,fontWeight:"800"},
 progressTrack:{height:5,borderRadius:4,backgroundColor:"#293342",marginTop:9,overflow:"hidden"},progressFill:{height:5,borderRadius:4,backgroundColor:C.lime},
 xpText:{color:C.lime,fontSize:12,fontWeight:"900"},threeStats:{flexDirection:"row",justifyContent:"space-between",marginTop:20,paddingTop:17,borderTopWidth:1,borderTopColor:C.line},
 stat:{flex:1},statValue:{color:C.text,fontSize:19,fontWeight:"900",marginTop:6},quickGrid:{flexDirection:"row",gap:12},quick:{flex:1,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:16,padding:16},quickGlyph:{fontSize:23,color:C.lime},quickTitle:{fontSize:10,color:C.text,fontWeight:"900",letterSpacing:1,marginTop:13},quickCopy:{fontSize:10,color:C.muted,marginTop:5},
 nav:{height:66,borderTopWidth:1,borderTopColor:"#202A38",flexDirection:"row",justifyContent:"space-around",alignItems:"center",marginHorizontal:-20,backgroundColor:C.bg},navItem:{flex:1,alignItems:"center",gap:4},navIcon:{fontSize:19,color:C.dim},navLabel:{fontSize:8,color:C.dim,fontWeight:"900",letterSpacing:1},
 gameScreen:{flex:1,paddingHorizontal:17,paddingTop:10,paddingBottom:12},gameHeader:{height:75,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},gameScore:{color:C.text,fontSize:28,fontWeight:"900",marginTop:2},gameHeaderRight:{alignItems:"flex-end",flex:1,marginRight:12},combo:{fontSize:9,color:C.lime,fontWeight:"900",letterSpacing:1},lives:{fontSize:14,color:C.red,marginTop:7},pauseButton:{width:42,height:42,borderRadius:13,backgroundColor:C.panel2,alignItems:"center",justifyContent:"center"},pauseGlyph:{color:C.text,fontSize:19},
 arena:{flex:1,backgroundColor:"#101722",borderRadius:22,borderWidth:1,borderColor:"#2A3545",overflow:"hidden",position:"relative",marginTop:10,marginBottom:14},arenaHeader:{position:"absolute",top:14,left:15,right:15,flexDirection:"row",justifyContent:"space-between"},arenaTag:{fontSize:8,color:"#647187",fontWeight:"900",letterSpacing:1.2},laneLine:{position:"absolute",top:0,bottom:0,width:1,backgroundColor:"#253143"},object:{position:"absolute",width:29,height:29,marginLeft:-14.5,marginTop:-14.5,borderRadius:10,borderWidth:2,alignItems:"center",justifyContent:"center"},objectGlyph:{fontSize:13,color:"#1B1B1B",fontWeight:"900"},runner:{position:"absolute",top:"82%",width:39,height:39,marginLeft:-19.5,marginTop:-19.5,borderRadius:13,alignItems:"center",justifyContent:"center",shadowOpacity:.6,shadowRadius:12,elevation:10},runnerGlyph:{fontSize:19,fontWeight:"900"},arenaFooter:{position:"absolute",bottom:12,left:14,right:14,flexDirection:"row",justifyContent:"space-between"},arenaHint:{fontSize:7,color:"#596579",fontWeight:"900",letterSpacing:1},controls:{height:74,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},control:{width:76,height:62,borderRadius:17,backgroundColor:C.panel2,borderWidth:1,borderColor:"#344153",alignItems:"center",justifyContent:"center"},controlGlyph:{color:C.lime,fontSize:40,lineHeight:44},dashButton:{minWidth:88,height:58,borderRadius:16,backgroundColor:"#2A3421",borderWidth:1,borderColor:"#657C3C",alignItems:"center",justifyContent:"center",gap:3},dashDisabled:{opacity:.5,backgroundColor:C.panel2,borderColor:C.line},dashTitle:{fontSize:11,color:C.lime,fontWeight:"900",letterSpacing:1.5},dashSub:{fontSize:8,color:C.muted,fontWeight:"800",letterSpacing:1},
 center:{flex:1,alignItems:"center",justifyContent:"center",paddingBottom:35},bigTitle:{fontSize:40,lineHeight:43,fontWeight:"900",letterSpacing:-2,color:C.text,textAlign:"center",marginTop:16,marginBottom:12},resultScore:{fontSize:68,color:C.lime,fontWeight:"900",letterSpacing:-3,marginTop:30},resultCaption:{fontSize:9,color:C.dim,fontWeight:"900",letterSpacing:2},newRecord:{fontSize:10,color:C.gold,fontWeight:"900",letterSpacing:1.5,marginTop:15},resultGrid:{flexDirection:"row",gap:12,width:"100%",marginTop:25,marginBottom:18},resultGridPanel:{flex:1},earnPanel:{width:"100%",marginBottom:20,marginTop:12},statRows:{flexDirection:"row",paddingVertical:14,borderBottomWidth:1,borderBottomColor:C.line,gap:12},achievement:{flexDirection:"row",alignItems:"center",gap:12,paddingVertical:13,borderBottomWidth:1,borderBottomColor:C.line},achievementIcon:{fontSize:19},achievementState:{fontSize:8,color:C.dim,fontWeight:"900",letterSpacing:1},pageTitle:{fontSize:38,lineHeight:40,color:C.text,fontWeight:"900",letterSpacing:-2,marginTop:12,marginBottom:10},
 skinRow:{flexDirection:"row",alignItems:"center",gap:13,paddingVertical:15,borderBottomWidth:1,borderBottomColor:C.line},skinPreview:{width:48,height:48,borderRadius:15,alignItems:"center",justifyContent:"center"},skinPreviewText:{fontSize:22,fontWeight:"900"},skinAction:{minWidth:82,paddingHorizontal:12,paddingVertical:10,borderRadius:10,backgroundColor:C.panel2,alignItems:"center"},skinEquipped:{borderWidth:1,borderColor:C.lime},skinActionText:{fontSize:9,color:C.text,fontWeight:"900",letterSpacing:.8},
 historyRow:{flexDirection:"row",alignItems:"center",paddingVertical:14,borderBottomWidth:1,borderBottomColor:C.line},historyDate:{flex:1,color:C.muted,fontSize:11},historyScore:{color:C.text,fontWeight:"900",fontSize:14},historyCoins:{width:65,textAlign:"right",color:C.gold,fontSize:10,fontWeight:"800"}
});