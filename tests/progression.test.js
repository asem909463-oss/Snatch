import test from "node:test";
import assert from "node:assert/strict";
import { createRun, movePlayer, stepRun, dailySeed, getDateKey } from "../src/game/engine.js";
import { applyRun, claimDaily, buySkin, DEFAULT_SAVE, SKINS, mergeSave } from "../src/game/progression.js";

test("player movement stays inside three lanes", () => {
  const s = createRun(1);
  movePlayer(s, -1); movePlayer(s, -1); movePlayer(s, -1);
  assert.equal(s.lane, 0);
  movePlayer(s, 1); movePlayer(s, 1); movePlayer(s, 1); movePlayer(s, 1);
  assert.equal(s.lane, 2);
});
test("daily seed is repeatable", () => {
  assert.equal(dailySeed("2026-11-10"), dailySeed("2026-11-10"));
  assert.notEqual(dailySeed("2026-11-10"), dailySeed("2026-11-11"));
});
test("date key uses local calendar date", () => {
  assert.equal(getDateKey(new Date(2026, 10, 10, 23, 0)), "2026-11-10");
});
test("run rewards update progression and personal best", () => {
  const result = applyRun({ ...DEFAULT_SAVE }, { score: 1400, coins: 20, dodges: 8, bestCombo: 6 }, "2026-11-10");
  assert.equal(result.save.best, 1400);
  assert.equal(result.save.totalRuns, 1);
  assert.ok(result.xpEarned > 0);
  assert.ok(result.save.achievements.includes("first-run"));
});
test("daily reward cannot be claimed before all goals", () => {
  const save = { ...DEFAULT_SAVE, daily: { date: "2026-11-10", coins: 35, score: 499, dodges: 5 } };
  assert.equal(claimDaily(save, "2026-11-10").bank, 0);
});

test("daily reward requires all 35 coins, 500 points and 5 dodges", () => {
  const almost = { ...DEFAULT_SAVE, daily: { date: "2026-11-10", coins: 34, score: 500, dodges: 5 } };
  assert.equal(claimDaily(almost, "2026-11-10").bank, 0);
  const ready = { ...DEFAULT_SAVE, daily: { date: "2026-11-10", coins: 35, score: 500, dodges: 5 } };
  const claimed = claimDaily(ready, "2026-11-10");
  assert.equal(claimed.bank, 75);
  assert.equal(claimed.xp, 100);
  assert.equal(claimDaily(claimed, "2026-11-10").bank, 75);
});
test("skin purchase deducts coins and unlocks exactly once", () => {
  const save = { ...DEFAULT_SAVE, bank: 500 };
  const next = buySkin(save, SKINS.find(s => s.id === "ice"));
  assert.equal(next.bank, 250);
  assert.ok(next.unlockedSkins.includes("ice"));
  assert.equal(buySkin(next, SKINS.find(s => s.id === "ice")).bank, 250);
});

import { setPlayerLane, dashPlayer } from "../src/game/engine.js";

test("collision detection catches a fast object crossing the player", () => {
  const s = createRun(7);
  s.spawnIn = 9999;
  s.objects = [{ id: 1, lane: 1, y: 77, type: "hazard", passed: false, bornAt: 0 }];
  const next = stepRun(s);
  assert.equal(next.lives, 2);
  assert.equal(next.objects.length, 0);
});
test("daily runs are deterministic for the same seed", () => {
  let a = createRun(dailySeed("2026-11-10"));
  let b = createRun(dailySeed("2026-11-10"));
  for (let i = 0; i < 400; i++) {
    a = stepRun(a);
    b = stepRun(b);
  }
  assert.equal(a.score, b.score);
  assert.equal(a.coins, b.coins);
  assert.deepEqual(a.objects, b.objects);
});
test("finished runs cannot continue scoring", () => {
  const s = createRun(3);
  s.status = "over";
  const next = stepRun(s);
  assert.equal(next.score, 0);
  assert.equal(next.tick, 0);
});
test("player lane setter clamps invalid lane values", () => {
  const s = createRun(2);
  setPlayerLane(s, 99);
  assert.equal(s.lane, 2);
  setPlayerLane(s, -5);
  assert.equal(s.lane, 0);
});

test("dash is available, scores a hazard dodge and enters cooldown", () => {
  const s = createRun(9);
  s.spawnIn = 9999;
  s.objects = [{ id: 1, lane: 1, y: 77, type: "hazard", passed: false, bornAt: 0 }];
  dashPlayer(s);
  assert.ok(s.dashTicks > 0);
  const next = stepRun(s);
  assert.equal(next.lives, 3);
  assert.equal(next.dashDodges, 1);
  assert.ok(next.score >= 80);
  assert.ok(next.dashCooldown > 0);
});
test("dash cannot be activated during cooldown", () => {
  const s = createRun(4);
  dashPlayer(s);
  const initial = s.dashTicks;
  s.dashTicks = 0;
  dashPlayer(s);
  assert.equal(s.dashTicks, 0);
  assert.equal(s.dashCooldown, 100);
  assert.ok(initial > 0);
});


test("battery pickup instantly recharges dash and awards points", () => {
  const s = createRun(10);
  s.spawnIn = 9999;
  s.dashCooldown = 40;
  s.objects = [{ id: 1, lane: 1, y: 77, type: "battery", passed: false, bornAt: 0 }];
  const next = stepRun(s);
  assert.equal(next.lives, 3);
  assert.equal(next.batteries, 1);
  assert.equal(next.dashCooldown, 0);
  assert.ok(next.score >= 40);
});


test("battery pickups contribute to lifetime stats and unlock achievement", () => {
  const result = applyRun({ ...DEFAULT_SAVE, totalBatteries: 8 }, { score: 100, coins: 0, dodges: 0, bestCombo: 0, batteries: 2 }, "2026-11-10");
  assert.equal(result.save.totalBatteries, 10);
  assert.ok(result.save.achievements.includes("battery-10"));
});


test("new personal best is reported only when a run beats the saved record", () => {
  const first = applyRun({ ...DEFAULT_SAVE, best: 500 }, { score: 700, coins: 0, dodges: 0, bestCombo: 0 }, "2026-11-10");
  const tied = applyRun({ ...DEFAULT_SAVE, best: 700 }, { score: 700, coins: 0, dodges: 0, bestCombo: 0 }, "2026-11-10");
  const lower = applyRun({ ...DEFAULT_SAVE, best: 900 }, { score: 700, coins: 0, dodges: 0, bestCombo: 0 }, "2026-11-10");
  assert.equal(first.isNewBest, true);
  assert.equal(tied.isNewBest, false);
  assert.equal(lower.isNewBest, false);
});

test("daily contract keeps coins cumulative but score and dodges as best single run", () => {
  const a = applyRun({ ...DEFAULT_SAVE }, { score: 300, coins: 20, dodges: 3, bestCombo: 0 }, "2026-11-10").save;
  const b = applyRun(a, { score: 250, coins: 20, dodges: 2, bestCombo: 0 }, "2026-11-10").save;
  assert.equal(b.daily.coins, 40);
  assert.equal(b.daily.score, 300);
  assert.equal(b.daily.dodges, 3);
});


test("collision detection catches hazards crossing the player at maximum speed", () => {
  const s = createRun(11);
  s.score = 100000;
  s.spawnIn = 9999;
  s.objects = [{ id: 1, lane: 1, y: 78, type: "hazard", passed: false, bornAt: 0 }];
  const next = stepRun(s);
  assert.equal(next.lives, 2);
  assert.equal(next.objects.length, 0);
});


test("the final dash tick still protects the player", () => {
  const s = createRun(12);
  s.spawnIn = 9999;
  s.dashTicks = 1;
  s.objects = [{ id: 1, lane: 1, y: 78, type: "hazard", passed: false, bornAt: 0 }];
  const next = stepRun(s);
  assert.equal(next.lives, 3);
  assert.equal(next.dodges, 1);
  assert.equal(next.dashTicks, 0);
});

test("simulation stops processing objects after the final life is lost", () => {
  const s = createRun(13);
  s.lives = 1;
  s.spawnIn = 9999;
  s.objects = [
    { id: 1, lane: 1, y: 77, type: "hazard", passed: false, bornAt: 0 },
    { id: 2, lane: 1, y: 77, type: "coin", passed: false, bornAt: 0 }
  ];
  const next = stepRun(s);
  assert.equal(next.status, "over");
  assert.equal(next.lives, 0);
  assert.equal(next.coins, 0);
});


test("corrupted local saves are sanitized safely", () => {
  const save = mergeSave({
    bank: -50,
    xp: Number.NaN,
    unlockedSkins: ["unknown", "carbon", "carbon"],
    equippedSkin: "unknown",
    achievements: ["made-up", "first-run", "first-run"],
    history: [null, { date: "not-a-date", score: 99, coins: 2 }, { date: "2026-11-10", score: -3, coins: 4 }],
    daily: { date: "2026-11-10", coins: -4, score: 500, dodges: 5, claimed: false },
    haptics: "yes"
  });
  assert.equal(save.bank, 0);
  assert.equal(save.xp, 0);
  assert.deepEqual(save.unlockedSkins, ["volt", "carbon"]);
  assert.equal(save.equippedSkin, "volt");
  assert.deepEqual(save.achievements, ["first-run"]);
  assert.deepEqual(save.history, [{ date: "2026-11-10", score: 0, coins: 4 }]);
  assert.equal(save.daily.coins, 0);
  assert.equal(save.haptics, true);
});
