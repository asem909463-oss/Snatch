import test from "node:test";
import assert from "node:assert/strict";
import { createRun, movePlayer, stepRun, dailySeed, getDateKey } from "../src/game/engine.js";
import { applyRun, claimDaily, buySkin, DEFAULT_SAVE, SKINS } from "../src/game/progression.js";

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
  const save = { ...DEFAULT_SAVE, daily: { date: "2026-11-10", coins: 10, score: 499, dodges: 5 } };
  assert.equal(claimDaily(save, "2026-11-10").bank, 0);
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
