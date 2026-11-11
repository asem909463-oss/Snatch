// Pure game simulation. No React Native dependencies: deterministic and testable.
export const LANES = 3;
export const TICK_MS = 50;
export const PLAYER_Y = 0.82;
export const DAILY_GOALS = [
  { id: "score", title: "Make your mark", detail: "Score 500 points in one run", target: 500, unit: "pts" },
  { id: "coins", title: "Pocket change", detail: "Collect 35 coins today", target: 35, unit: "coins" },
  { id: "near", title: "Clean getaway", detail: "Dodge 5 hazards in one run", target: 5, unit: "dodges" }
];
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export function createRun(seed = Date.now()) {
  return {
    seed: seed >>> 0, tick: 0, elapsed: 0, score: 0, coins: 0, lane: 1,
    lives: 3, shield: 0, combo: 0, bestCombo: 0, dodges: 0, nearMisses: 0,
    objects: [], nextId: 1, spawnIn: 12, status: "running", lastSpawnLane: -1,
    perfectStreak: 0, bestPerfectStreak: 0, multiplier: 1, level: 1, dashTicks: 0, dashCooldown: 0, dashDodges: 0, batteries: 0
  };
}
function random(state) {
  let x = state.seed || 1;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  state.seed = x >>> 0;
  return state.seed / 4294967296;
}
function chooseLane(state) {
  let lane = Math.floor(random(state) * LANES);
  if (lane === state.lastSpawnLane && random(state) < 0.65) lane = (lane + 1 + Math.floor(random(state) * 2)) % LANES;
  state.lastSpawnLane = lane;
  return lane;
}
export function movePlayer(state, direction) {
  if (state.status !== "running") return state;
  state.lane = clamp(state.lane + direction, 0, LANES - 1);
  return state;
}
export function setPlayerLane(state, lane) {
  if (state.status === "running") state.lane = clamp(lane, 0, LANES - 1);
  return state;
}
export function dashPlayer(state) {
  if (state.status !== "running" || state.dashCooldown > 0) return state;
  state.dashTicks = 8;
  state.dashCooldown = 100;
  return state;
}
export function stepRun(previous) {
  if (previous.status !== "running") return previous;
  const s = { ...previous, objects: previous.objects.map(o => ({ ...o })) };
  s.tick += 1;
  s.elapsed += TICK_MS;
  s.dashCooldown = Math.max(0, s.dashCooldown - 1);
  const seconds = s.elapsed / 1000;
  s.level = 1 + Math.floor(s.score / 450);
  const speed = Math.min(9.5, 3.1 + seconds * 0.045 + s.level * 0.12);
  s.spawnIn -= 1;
  if (s.spawnIn <= 0) {
    const roll = random(s);
    const type = roll < 0.64 ? "coin" : roll < 0.86 ? "hazard" : roll < 0.95 ? "shield" : "battery";
    const lane = chooseLane(s);
    s.objects.push({ id: s.nextId++, lane, y: -7, type, passed: false, bornAt: s.tick });
    const base = Math.max(9, 22 - Math.floor(seconds / 9));
    s.spawnIn = Math.max(8, base + Math.floor(random(s) * 8));
  }
  const kept = [];
  for (const o of s.objects) {
    if (s.status !== "running") break;
    const previousY = o.y;
    o.y += speed;
    const crossedPlayer = previousY <= PLAYER_Y * 100 + 5 && o.y >= PLAYER_Y * 100 - 3;
    if (!o.passed && crossedPlayer && o.lane === s.lane) {
      o.passed = true;
      if (o.type === "coin") {
        s.coins += 1;
        s.combo += 1;
        s.bestCombo = Math.max(s.bestCombo, s.combo);
        s.multiplier = Math.min(5, 1 + Math.floor(s.combo / 5));
        s.score += 35 * s.multiplier;
      } else if (o.type === "shield") {
        s.shield = Math.min(2, s.shield + 1);
        s.score += 50;
      } else if (o.type === "battery") {
        s.batteries += 1;
        s.dashCooldown = 0;
        s.score += 40;
      } else if (s.dashTicks > 0) {
        s.dodges += 1;
        s.dashDodges += 1;
        s.perfectStreak = 0;
        s.score += 80;
        s.combo += 2;
        s.bestCombo = Math.max(s.bestCombo, s.combo);
        s.multiplier = Math.min(5, 1 + Math.floor(s.combo / 5));
      } else if (s.shield > 0) {
        s.shield -= 1;
        s.perfectStreak = 0;
        s.score += 20;
        s.combo = 0;
        s.multiplier = 1;
      } else {
        s.lives -= 1;
        s.perfectStreak = 0;
        s.combo = 0;
        s.multiplier = 1;
        if (s.lives <= 0) s.status = "over";
      }
    } else if (!o.passed && o.y > PLAYER_Y * 100 + 7) {
      o.passed = true;
      if (o.type === "hazard") {
        s.dodges += 1;
        s.nearMisses += 1;
        s.perfectStreak += 1;
        s.bestPerfectStreak = Math.max(s.bestPerfectStreak, s.perfectStreak);
        s.combo += 1;
        s.bestCombo = Math.max(s.bestCombo, s.combo);
        s.multiplier = Math.min(5, 1 + Math.floor(s.combo / 5));
        const streakBonus = s.perfectStreak % 3 === 0 ? 40 * s.multiplier : 0;
        s.score += 15 + streakBonus;
      }
    }
    if (o.y < 108 && !o.passed) kept.push(o);
  }
  s.objects = kept;
  if (s.status === "running") s.score += 1 + Math.floor(s.level / 2);
  s.dashTicks = Math.max(0, s.dashTicks - 1);
  return s;
}
export function dailySeed(dateKey) {
  let h = 2166136261;
  for (let i = 0; i < dateKey.length; i++) h = Math.imul(h ^ dateKey.charCodeAt(i), 16777619);
  return h >>> 0;
}
export function getDateKey(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
export function rankForXp(xp) {
  const ranks = [
    { name: "Rookie", min: 0 }, { name: "Runner", min: 250 },
    { name: "Hustler", min: 700 }, { name: "Pro", min: 1400 },
    { name: "Elite", min: 2500 }, { name: "Legend", min: 4200 }
  ];
  return [...ranks].reverse().find(r => xp >= r.min) || ranks[0];
}
