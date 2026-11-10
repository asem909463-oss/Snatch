import React, { useEffect, useRef, useState } from "react";
import {
  SafeAreaView, View, Text, StyleSheet, Pressable, StatusBar,
  Dimensions, Platform
} from "react-native";

const { width } = Dimensions.get("window");
const LANES = [width * 0.19, width * 0.5, width * 0.81];
const PLAYER_Y = 0.79;
const randomLane = () => Math.floor(Math.random() * 3);

export default function App() {
  const [screen, setScreen] = useState("home");
  const [lane, setLane] = useState(1);
  const [items, setItems] = useState([]);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [lives, setLives] = useState(3);
  const [best, setBest] = useState(0);
  const [muted, setMuted] = useState(false);
  const tickRef = useRef(0);
  const itemId = useRef(0);
  const laneRef = useRef(1);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const itemsRef = useRef([]);

  const startGame = () => {
    laneRef.current = 1;
    scoreRef.current = 0;
    livesRef.current = 3;
    itemsRef.current = [];
    tickRef.current = 0;
    itemId.current = 0;
    setLane(1); setScore(0); setCoins(0); setLives(3);
    setItems([]); setScreen("playing");
  };

  const move = (direction) => {
    const next = Math.max(0, Math.min(2, laneRef.current + direction));
    laneRef.current = next;
    setLane(next);
  };

  useEffect(() => {
    if (screen !== "playing") return;
    const timer = setInterval(() => {
      tickRef.current += 1;
      const speed = Math.min(8.5, 3.8 + scoreRef.current / 170);
      let next = itemsRef.current
        .map((item) => ({ ...item, y: item.y + speed }))
        .filter((item) => item.y < 94);

      if (tickRef.current % Math.max(8, 17 - Math.floor(scoreRef.current / 100)) === 0) {
        const type = Math.random() < 0.67 ? "coin" : "trap";
        next.push({ id: itemId.current++, lane: randomLane(), y: -8, type });
      }

      let gained = 0;
      let hit = false;
      next = next.filter((item) => {
        if (item.y >= PLAYER_Y * 100 - 5 && item.y <= PLAYER_Y * 100 + 4 && item.lane === laneRef.current) {
          if (item.type === "coin") gained += 1;
          else hit = true;
          return false;
        }
        return true;
      });

      if (gained) {
        setCoins((v) => v + gained);
        scoreRef.current += gained * 15;
      }
      scoreRef.current += 1;
      setScore(scoreRef.current);
      if (hit) {
        livesRef.current -= 1;
        setLives(livesRef.current);
        if (livesRef.current <= 0) {
          setBest((v) => Math.max(v, scoreRef.current));
          setScreen("over");
        }
      }
      itemsRef.current = next;
      setItems(next);
    }, 45);
    return () => clearInterval(timer);
  }, [screen]);

  const progress = Math.min(100, (score % 500) / 5);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#090B13" />
      <View style={styles.container}>
        <View style={styles.topbar}>
          <View style={styles.brand}><View style={styles.brandMark}><Text style={styles.brandMarkText}>S</Text></View><Text style={styles.brandName}>SNATCH</Text></View>
          <Pressable onPress={() => setMuted(!muted)} style={styles.sound}><Text style={styles.soundText}>{muted ? "SOUND OFF" : "SOUND ON"}</Text></Pressable>
        </View>

        {screen === "home" && (
          <View style={styles.center}>
            <View style={styles.heroOrb}><Text style={styles.heroEmoji}>✦</Text><View style={styles.orbGlow} /></View>
            <Text style={styles.eyebrow}>ONE MORE RUN</Text>
            <Text style={styles.title}>GRAB THE{ "\n" }GOOD STUFF.</Text>
            <Text style={styles.subtitle}>Snatch the coins. Dodge the traps.{ "\n" }How long can you last?</Text>
            <View style={styles.howCard}>
              <View style={styles.howIcon}><Text style={styles.howEmoji}>← →</Text></View>
              <View style={{ flex: 1 }}><Text style={styles.howTitle}>MOVE LEFT & RIGHT</Text><Text style={styles.howText}>Switch lanes to collect coins and avoid traps.</Text></View>
            </View>
            <Pressable style={styles.primaryButton} onPress={startGame}><Text style={styles.primaryText}>PLAY NOW</Text><Text style={styles.buttonArrow}>↗</Text></Pressable>
            <Text style={styles.footer}>FREE TO PLAY · BUILT FOR THE QUICK REFLEX</Text>
          </View>
        )}

        {screen === "playing" && (
          <View style={styles.gameWrap}>
            <View style={styles.hud}>
              <View><Text style={styles.statLabel}>SCORE</Text><Text style={styles.statValue}>{score.toString().padStart(5, "0")}</Text></View>
              <View style={styles.coinPill}><Text style={styles.coinSymbol}>●</Text><Text style={styles.coinValue}>{coins}</Text></View>
              <View style={{ alignItems: "flex-end" }}><Text style={styles.statLabel}>LIVES</Text><Text style={styles.lives}>{Array.from({length:3},(_,i)=>i<lives?"♥":"♡").join(" ")}</Text></View>
            </View>
            <View style={styles.track}>
              <View style={styles.trackLineLeft} /><View style={styles.trackLineRight} />
              <View style={styles.trackHeader}><Text style={styles.trackLabel}>THE RUN</Text><Text style={styles.trackLabel}>SURVIVE</Text></View>
              {items.map((item) => (
                <View key={item.id} style={[styles.fallingItem, {
                  left: LANES[item.lane] - 17, top: `${item.y}%`,
                  backgroundColor: item.type === "coin" ? "#F9C74F" : "#FF5470",
                  shadowColor: item.type === "coin" ? "#F9C74F" : "#FF5470"
                }]}>
                  <Text style={styles.itemGlyph}>{item.type === "coin" ? "$" : "!"}</Text>
                </View>
              ))}
              <View style={[styles.player, { left: LANES[lane] - 21, top: `${PLAYER_Y * 100}%` }]}>
                <View style={styles.playerInner}><Text style={styles.playerGlyph}>S</Text></View>
              </View>
              <View style={styles.laneLabels}><Text style={styles.laneLabel}>01</Text><Text style={styles.laneLabel}>02</Text><Text style={styles.laneLabel}>03</Text></View>
            </View>
            <View style={styles.controls}>
              <Pressable style={styles.controlButton} onPress={() => move(-1)}><Text style={styles.controlGlyph}>‹</Text></Pressable>
              <Text style={styles.controlHint}>TAP TO MOVE</Text>
              <Pressable style={styles.controlButton} onPress={() => move(1)}><Text style={styles.controlGlyph}>›</Text></Pressable>
            </View>
            <Pressable onPress={() => setScreen("paused")} style={styles.pause}><Text style={styles.pauseText}>Ⅱ  PAUSE</Text></Pressable>
          </View>
        )}

        {screen === "paused" && (
          <View style={styles.center}>
            <Text style={styles.eyebrow}>TAKE A BREATHER</Text><Text style={styles.title}>PAUSED.</Text>
            <Text style={styles.subtitle}>Your run is waiting.</Text>
            <Pressable style={styles.primaryButton} onPress={() => setScreen("playing")}><Text style={styles.primaryText}>RESUME</Text><Text style={styles.buttonArrow}>↗</Text></Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => setScreen("home")}><Text style={styles.secondaryText}>QUIT RUN</Text></Pressable>
          </View>
        )}

        {screen === "over" && (
          <View style={styles.center}>
            <View style={styles.gameOverIcon}><Text style={styles.gameOverGlyph}>✕</Text></View>
            <Text style={styles.eyebrow}>RUN COMPLETE</Text><Text style={styles.title}>NICE TRY.</Text>
            <Text style={styles.subtitle}>Every run makes you sharper.</Text>
            <View style={styles.resultCard}>
              <View><Text style={styles.statLabel}>YOUR SCORE</Text><Text style={styles.resultScore}>{score}</Text></View>
              <View style={styles.resultDivider} />
              <View><Text style={styles.statLabel}>COINS SNATCHED</Text><Text style={styles.resultCoins}>● {coins}</Text></View>
            </View>
            <Pressable style={styles.primaryButton} onPress={startGame}><Text style={styles.primaryText}>RUN IT BACK</Text><Text style={styles.buttonArrow}>↗</Text></Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => setScreen("home")}><Text style={styles.secondaryText}>MAIN MENU</Text></Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:"#090B13"},
  container:{flex:1,backgroundColor:"#090B13",paddingHorizontal:24,paddingTop:Platform.OS==="android"?18:8},
  topbar:{height:52,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  brand:{flexDirection:"row",alignItems:"center",gap:10},
  brandMark:{width:30,height:30,borderRadius:10,backgroundColor:"#B9F45B",alignItems:"center",justifyContent:"center"},
  brandMarkText:{fontSize:20,fontWeight:"900",color:"#10150A"},
  brandName:{color:"#F5F7F2",fontSize:16,fontWeight:"900",letterSpacing:3},
  sound:{paddingVertical:9,paddingHorizontal:12,borderRadius:20,backgroundColor:"#171B27"},
  soundText:{color:"#9299A9",fontSize:9,fontWeight:"800",letterSpacing:1},
  center:{flex:1,alignItems:"center",justifyContent:"center",paddingBottom:22},
  heroOrb:{width:142,height:142,borderRadius:48,backgroundColor:"#B9F45B",alignItems:"center",justifyContent:"center",transform:[{rotate:"-8deg"}],marginBottom:32,shadowColor:"#B9F45B",shadowOpacity:.2,shadowRadius:35,elevation:12},
  heroEmoji:{fontSize:76,color:"#11170C",fontWeight:"900"},
  orbGlow:{position:"absolute",width:14,height:14,borderRadius:7,backgroundColor:"#FFFFFF",top:22,right:24},
  eyebrow:{color:"#B9F45B",fontSize:10,fontWeight:"900",letterSpacing:4,marginBottom:13},
  title:{color:"#F5F7F2",fontSize:46,lineHeight:48,fontWeight:"900",letterSpacing:-2,textAlign:"center"},
  subtitle:{color:"#8F96A7",fontSize:14,lineHeight:22,textAlign:"center",marginTop:14},
  howCard:{width:"100%",backgroundColor:"#151925",borderColor:"#252B3A",borderWidth:1,borderRadius:18,padding:16,flexDirection:"row",alignItems:"center",gap:13,marginTop:30,marginBottom:20},
  howIcon:{width:42,height:42,borderRadius:13,backgroundColor:"#252D20",alignItems:"center",justifyContent:"center"},
  howEmoji:{color:"#B9F45B",fontSize:19,fontWeight:"900"},
  howTitle:{color:"#F2F4EF",fontSize:11,fontWeight:"900",letterSpacing:1},
  howText:{color:"#8F96A7",fontSize:11,lineHeight:17,marginTop:4},
  primaryButton:{width:"100%",height:58,borderRadius:17,backgroundColor:"#B9F45B",alignItems:"center",justifyContent:"center",",flexDirection:"row",marginTop:4},
  primaryText:{color:"#10150A",fontSize:13,fontWeight:"900",letterSpacing:2},
  buttonArrow:{position:"absolute",right:20,color:"#10150A",fontSize:20,fontWeight:"900"},
  footer:{color:"#596071",fontSize:8,fontWeight:"800",letterSpacing:1.4,marginTop:22,textAlign:"center"},
  gameWrap:{flex:1,paddingTop:12,paddingBottom:14},
  hud:{height:70,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  statLabel:{color:"#777F91",fontSize:9,fontWeight:"900",letterSpacing:2},
  statValue:{color:"#F5F7F2",fontSize:24,fontWeight:"900",letterSpacing:1,marginTop:3},
  coinPill:{flexDirection:"row",alignItems:"center",gap:8,backgroundColor:"#242316",paddingHorizontal:14,paddingVertical:9,borderRadius:20},
  coinSymbol:{color:"#F9C74F",fontSize:12},coinValue:{color:"#F9E7A5",fontSize:14,fontWeight:"900"},
  lives:{color:"#FF6680",fontSize:17,marginTop:3,letterSpacing:2},
  track:{flex:1,backgroundColor:"#111622",borderRadius:25,borderWidth:1,borderColor:"#252D3B",marginTop:12,marginBottom:16,overflow:"hidden",position:"relative"},
  trackLineLeft:{position:"absolute",top:0,bottom:0,left:"33.33%",width:1,backgroundColor:"#293142"},
  trackLineRight:{position:"absolute",top:0,bottom:0,left:"66.66%",width:1,backgroundColor:"#293142"},
  trackHeader:{position:"absolute",top:17,left:18,right:18,flexDirection:"row",justifyContent:"space-between"},
  trackLabel:{color:"#5E687B",fontSize:8,fontWeight:"900",letterSpacing:2},
  fallingItem:{position:"absolute",width:34,height:34,borderRadius:12,alignItems:"center",justifyContent:"center",borderWidth:2,borderColor:"rgba(255,255,255,.25)",shadowOpacity:.45,shadowRadius:12,elevation:8},
  itemGlyph:{fontSize:17,fontWeight:"900",color:"#171717"},
  player:{position:"absolute",width:42,height:42,borderRadius:15,backgroundColor:"#B9F45B",alignItems:"center",justifyContent:"center",shadowColor:"#B9F45B",shadowOpacity:.65,shadowRadius:16,elevation:12},
  playerInner:{width:30,height:30,borderRadius:10,backgroundColor:"#19220F",alignItems:"center",justifyContent:"center"},
  playerGlyph:{color:"#B9F45B",fontSize:20,fontWeight:"900"},
  laneLabels:{position:"absolute",bottom:12,left:0,right:0,flexDirection:"row",justifyContent:"space-around"},
  laneLabel:{color:"#4C5669",fontSize:9,fontWeight:"900",letterSpacing:1},
  controls:{height:68,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  controlButton:{width:76,height:58,borderRadius:18,backgroundColor:"#1B2230",borderWidth:1,borderColor:"#30394B",alignItems:"center",justifyContent:"center"},
  controlGlyph:{color:"#B9F45B",fontSize:38,lineHeight:42,fontWeight:"500"},
  controlHint:{color:"#626B7D",fontSize:9,fontWeight:"900",letterSpacing:2},
  pause:{alignSelf:"center",padding:12,marginTop:3},
  pauseText:{color:"#727B8D",fontSize:10,fontWeight:"900",letterSpacing:2},
  secondaryButton:{padding:17,marginTop:8},
  secondaryText:{color:"#8E96A7",fontSize:11,fontWeight:"900",letterSpacing:2},
  gameOverIcon:{width:64,height:64,borderRadius:22,backgroundColor:"#321D29",alignItems:"center",justifyContent:"center",marginBottom:24},
  gameOverGlyph:{color:"#FF6680",fontSize:28,fontWeight:"900"},
  resultCard:{width:"100%",backgroundColor:"#151925",borderWidth:1,borderColor:"#252B3A",borderRadius:18,padding:20,marginTop:28,marginBottom:20,flexDirection:"row",justifyContent:"space-around"},
  resultScore:{color:"#F5F7F2",fontSize:30,fontWeight:"900",marginTop:5},
  resultCoins:{color:"#F9C74F",fontSize:23,fontWeight:"900",marginTop:9},
  resultDivider:{width:1,backgroundColor:"#303747"}
});