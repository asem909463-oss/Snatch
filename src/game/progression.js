export const SAVE_KEY = "snatch.save.v2";
export const DEFAULT_SAVE = {
  xp: 0, bank: 0, best: 0, totalRuns: 0, totalCoins: 0, totalDodges: 0,
  streak: 0, lastPlayed: null, claimedDaily: null, daily: null,
  unlockedSkins: ["volt"], equippedSkin: "volt", achievements: [],
  history: [], sound: true, haptics: true
};
export const SKINS = [
  { id: "volt", name: "Volt", cost: 0, color: "#C8FF55", dark: "#17210B" },
  { id: "ice", name: "Arctic", cost: 250, color: "#75D9FF", dark: "#08202B" },
  { id: "flare", name: "Flare", cost: 500, color: "#FF805E", dark: "#32140D" },
  { id: "ultra", name: "Ultraviolet", cost: 900, color: "#B99AFF", dark: "#21123A" },
  { id: "gold", name: "Gold Rush", cost: 1500, color: "#FFD36B", dark: "#33220A" }
];
export function mergeSave(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SAVE };
  return {
    ...DEFAULT_SAVE, ...raw,
    xp: finite(raw.xp), bank: finite(raw.bank), best: finite(raw.best),
    totalRuns: finite(raw.totalRuns), totalCoins: finite(raw.totalCoins),
    totalDodges: finite(raw.totalDodges), streak: finite(raw.streak),
    unlockedSkins: Array.isArray(raw.unlockedSkins) && raw.unlockedSkins.length ? raw.unlockedSkins : ["volt"],
    achievements: Array.isArray(raw.achievements) ? raw.achievements : [],
    history: Array.isArray(raw.history) ? raw.history.slice(0, 20) : []
  };
}
function finite(v) { return Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0; }
export function dailyStatus(save, dateKey) {
  const d = save.daily?.date === dateKey ? save.daily : { date: dateKey, coins: 0, score: 0, dodges: 0, claimed: false };
  return { ...d, claimed: !!d.claimed };
}
export function updateDaily(save, dateKey, run) {
  const old = dailyStatus(save, dateKey);
  return { ...old, coins: old.coins + run.coins, score: Math.max(old.score, run.score), dodges: Math.max(old.dodges, run.dodges) };
}
export function applyRun(save, run, dateKey) {
  const firstToday = save.lastPlayed !== dateKey;
  const yesterday = (() => { const d = new Date(dateKey + "T12:00:00"); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
  const streak = firstToday ? (save.lastPlayed === yesterday ? save.streak + 1 : 1) : save.streak;
  const xpEarned = Math.max(10, Math.floor(run.score / 12) + run.coins * 2 + run.bestCombo * 3);
  const bankEarned = run.coins;
  const history = [{ date: dateKey, score: run.score, coins: run.coins }, ...save.history].slice(0, 20);
  const next = {
    ...save, xp: save.xp + xpEarned, bank: save.bank + bankEarned,
    best: Math.max(save.best, run.score), totalRuns: save.totalRuns + 1,
    totalCoins: save.totalCoins + run.coins, totalDodges: save.totalDodges + run.dodges,
    streak, lastPlayed: dateKey, history,
    daily: updateDaily(save, dateKey, run)
  };
  const checks = [
    ["first-run", next.totalRuns >= 1], ["score-1000", next.best >= 1000],
    ["coin-100", next.totalCoins >= 100], ["dodge-50", next.totalDodges >= 50],
    ["streak-3", next.streak >= 3], ["combo-15", run.bestCombo >= 15]
  ];
  const newly = checks.filter(([id, ok]) => ok && !save.achievements.includes(id)).map(([id]) => id);
  next.achievements = [...save.achievements, ...newly];
  return { save: next, xpEarned, bankEarned, newly };
}
export function claimDaily(save, dateKey) {
  const d = dailyStatus(save, dateKey);
  if (d.claimed || d.coins < 10 || d.score < 500 || d.dodges < 5) return save;
  return { ...save, bank: save.bank + 75, xp: save.xp + 100, daily: { ...d, claimed: true }, claimedDaily: dateKey };
}
export function buySkin(save, skin) {
  if (!skin || save.unlockedSkins.includes(skin.id) || save.bank < skin.cost) return save;
  return { ...save, bank: save.bank - skin.cost, unlockedSkins: [...save.unlockedSkins, skin.id], equippedSkin: skin.id };
}
