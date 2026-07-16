import assert from "node:assert/strict";
import test from "node:test";

test("topic callback payload stays within Telegram callback_data limit", () => {
  const topicId = "topic_1234567890abcdef1234567890abcdef";
  const payload = `topic:select:${topicId}`;

  assert.ok(payload.length <= 64);
});
