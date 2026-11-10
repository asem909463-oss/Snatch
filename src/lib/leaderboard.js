import AsyncStorage from "@react-native-async-storage/async-storage";
const API_URL="https://bodothdfkqunumtysdae.supabase.co";
const API_KEY="sb_publishable_S0E51oGYmmkOB1A8-CjpOw_KTG_XJV5";
const PLAYER_KEY="snatch.player.v1";
function localDate(){const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")}
async function getPlayerId(){let id=await AsyncStorage.getItem(PLAYER_KEY);if(!id){id="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==="x"?r:(r&3|8)).toString(16)});await AsyncStorage.setItem(PLAYER_KEY,id)}return id}
export async function submitScore({name,score,runSeconds}){const displayName=String(name||"").trim().replace(/[<>]/g,"").slice(0,18);if(displayName.length<2||!Number.isFinite(score)||!Number.isFinite(runSeconds))throw new Error("Enter a name with at least 2 characters.");const playerId=await getPlayerId();const response=await fetch(API_URL+"/rest/v1/leaderboard_scores",{method:"POST",headers:{apikey:API_KEY,Authorization:"Bearer "+API_KEY,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({player_id:playerId,display_name:displayName,score:Math.max(0,Math.floor(score)),run_seconds:Math.max(1,Math.floor(runSeconds)),game_date:localDate()})});if(!response.ok)throw new Error("Score could not be submitted. Try again later.");return true}
export async function getLeaderboard(period="today"){
 const params=new URLSearchParams({select:"display_name,score,run_seconds,game_date,created_at",order:"score.desc,created_at.asc",limit:"50"});
 const now=new Date();
 const localDate=[now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-");
 if(period==="today") params.set("game_date","eq."+localDate);
 if(period==="week"){
  const monday=new Date(now); monday.setHours(0,0,0,0); monday.setDate(monday.getDate()-((monday.getDay()+6)%7));
  const weekStart=[monday.getFullYear(),String(monday.getMonth()+1).padStart(2,"0"),String(monday.getDate()).padStart(2,"0")].join("-");
  params.set("and",`(game_date.gte.${weekStart},game_date.lte.${localDate})`);
 }
 const response=await fetch(API_URL+"/rest/v1/leaderboard_scores?"+params,{headers:{apikey:API_KEY,Authorization:"Bearer "+API_KEY}});
 if(!response.ok) throw new Error("Leaderboard is temporarily unavailable.");
 return response.json();
}
