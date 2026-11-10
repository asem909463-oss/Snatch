import AsyncStorage from "@react-native-async-storage/async-storage";

const SUPABASE_URL = "https://bodothdfkqunumtysdae.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_S0E51oGYmmkOB1A8-CjpOw_KTG_XJV5";
const PLAYER_ID_KEY = "@snatch/player-id";

function headers(extra = {}) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export async function getPlayerId() {
  let id = await AsyncStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.floor(Math.random() * 16);
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
    await AsyncStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export async function submitScore({ name, score, elapsedMs, gameDate }) {
  const displayName = String(name || "Runner").trim().replace(/\s+/g, " ").slice(0, 18);
  const runSeconds = Math.max(1, Math.min(1800, Math.floor((elapsedMs || 1000) / 1000)));
  if (displayName.length < 2 || !Number.isFinite(score) || score < 0) return { skipped: true };
  const playerId = await getPlayerId();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard_scores`, {
    method: "POST",
    headers: headers({ Prefer: "return=minimal" }),
    body: JSON.stringify({
      player_id: playerId,
      display_name: displayName,
      score: Math.floor(score),
      run_seconds: runSeconds,
      game_date: gameDate,
    }),
  });
  if (!response.ok) throw new Error(`Leaderboard submit failed (${response.status})`);
  return { submitted: true };
}

export async function fetchDailyLeaderboard(gameDate) {
  const query = `?select=display_name,score,run_seconds,game_date,created_at&game_date=eq.${encodeURIComponent(gameDate)}&order=score.desc,created_at.asc&limit=25`;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard_scores${query}`, {
    headers: headers(),
  });
  if (!response.ok) throw new Error(`Leaderboard load failed (${response.status})`);
  const rows = await response.json();
  const bestByPlayer = new Map();
  for (const row of rows) {
    const key = row.display_name.toLowerCase();
    if (!bestByPlayer.has(key)) bestByPlayer.set(key, row);
  }
  return [...bestByPlayer.values()].sort((a, b) => b.score - a.score).slice(0, 25);
}

export async function deleteMyLeaderboardData() {
  const playerId = await getPlayerId();
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/leaderboard_scores?player_id=eq.${encodeURIComponent(playerId)}`,
    { method: "DELETE", headers: headers({ "x-snatch-player-id": playerId, Prefer: "return=minimal" }) }
  );
  if (!response.ok) throw new Error(`Leaderboard deletion failed (${response.status})`);
  await AsyncStorage.removeItem(PLAYER_ID_KEY);
}
