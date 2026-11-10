import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeDisplayName, sanitizeAge, isDisplayNameAllowed } from "../src/lib/sanitize.js";

test("display names remove control characters and markup while preserving Unicode", () => {
  assert.equal(sanitizeDisplayName("  <Asem>\nسلام\u0000  "), "Asemسلام");
  assert.equal(sanitizeDisplayName("12345678901234567890"), "123456789012345678");
  assert.equal(sanitizeDisplayName("  "), "");
});

test("age validation accepts only whole ages from 5 through 120", () => {
  assert.equal(sanitizeAge("14"), "14");
  assert.equal(sanitizeAge("4"), "");
  assert.equal(sanitizeAge("121"), "");
  assert.equal(sanitizeAge("14.5"), "");
  assert.equal(sanitizeAge("abc"), "");
});


test("display-name moderation blocks common English and Russian profanity", () => {
  assert.equal(isDisplayNameAllowed("Asem Runner"), true);
  assert.equal(isDisplayNameAllowed("fuck"), false);
  assert.equal(isDisplayNameAllowed("сука"), false);
});
