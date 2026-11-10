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
