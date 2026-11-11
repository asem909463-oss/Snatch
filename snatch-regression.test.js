import test from "node:test";
import assert from "node:assert/strict";
import {
  createRun, stepRun, movePlayer, dailySeed
} from "./src/game/engine.js";
import {
  DEFAULT_SAVE, mergeSave, updateDaily, claimDaily, buySkin, applyRun
} from "./src/game/progression.js";

test("same seed produces the same run and obstacle sequence", () => {
  let a = createRun(123456);
  let b = createRun(123456);
  for (let i = 0; i < 500; i++) {
    a = stepRun(a);
    b = stepRun(b);
    assert.deepEqual(a, b);
    if (a.status !== "running") break;
  }
});

test("lane movement stays inside the three lanes", () => {
  const run = createRun(1);
  movePlayer(run, -100);
  assert.equal(run.lane, 0);
  movePlayer(run, 100);
  assert.equal(run.lane, 2);
});

test("daily seeds are stable per date and differ across dates", () => {
  assert.equal(dailySeed("2026-11-11"), dailySeed("2026-11-11"));
  assert.notEqual(dailySeed("2026-11-11"), dailySeed("2026-11-12"));
});

test("save recovery rejects invalid progression values and skin IDs", () => {
  const save = mergeSave({
    xp: -10, bank: Infinity, best: "999", unlockedSkins: ["volt", "not-a-skin"],
    equippedSkin: "not-a-skin", achievements: ["fake-achievement"], history: [{ date: "bad-date" }]
  });
  assert.equal(save.xp, 0);
  assert.equal(save.bank, 0);
  assert.equal(save.best, 0);
  assert.deepEqual(save.unlockedSkins, ["volt"]);
  assert.equal(save.equippedSkin, "volt");
  assert.deepEqual(save.achievements, []);
  assert.deepEqual(save.history, []);
});

test("daily goals accumulate coins but keep the best single-run score and dodges", () => {
  const first = updateDaily(DEFAULT_SAVE, "2026-11-11", { coins: 20, score: 700, dodges: 3 });
  const second = updateDaily({ ...DEFAULT_SAVE, daily: first }, "2026-11-11", { coins: 18, score: 400, dodges: 6 });
  assert.equal(second.coins, 38);
  assert.equal(second.score, 700);
  assert.equal(second.dodges, 6);
});

test("daily reward is gated and can only be claimed once", () => {
  const incomplete = { ...DEFAULT_SAVE, daily: { date: "2026-11-11", coins: 35, score: 500, dodges: 4, claimed: false } };
  assert.equal(claimDaily(incomplete, "2026-11-11"), incomplete);
  const ready = { ...incomplete, daily: { ...incomplete.daily, dodges: 5 } };
  const claimed = claimDaily(ready, "2026-11-11");
  assert.equal(claimed.bank, 75);
  assert.equal(claimed.xp, 100);
  assert.equal(claimDaily(claimed, "2026-11-11"), claimed);
});

test("skin purchases enforce balance and cannot charge twice", () => {
  const skin = { id: "ice", cost: 250 };
  assert.equal(buySkin(DEFAULT_SAVE, skin), DEFAULT_SAVE);
  const funded = { ...DEFAULT_SAVE, bank: 300 };
  const bought = buySkin(funded, skin);
  assert.equal(bought.bank, 50);
  assert.deepEqual(buySkin(bought, skin), bought);
});

test("completed runs update progression without mutating the prior save", () => {
  const original = mergeSave(null);
  const result = applyRun(original, {
    score: 1200, coins: 20, dodges: 5, batteries: 1, bestCombo: 10
  }, "2026-11-11");
  assert.equal(original.totalRuns, 0);
  assert.equal(result.save.totalRuns, 1);
  assert.equal(result.save.best, 1200);
  assert.equal(result.save.totalCoins, 20);
  assert.equal(result.isNewBest, true);
  assert.ok(result.xpEarned > 0);
});
