import assert from "node:assert/strict";
import test from "node:test";
import { formatPreferenceMemoryForPrompt } from "../src/preferences/memory";
import { emptyPreferenceMemory, parsePreferenceMemory } from "../src/storage/relevance-profiles";

test("preference memory parser falls back to empty memory", () => {
  assert.deepEqual(parsePreferenceMemory("not json"), emptyPreferenceMemory());
});

test("preference memory keeps thesis limit above ten", () => {
  const memory = parsePreferenceMemory(JSON.stringify({
    writing_preferences: [],
    visual_preferences: [],
    topic_preferences: [],
    avoid: [],
    thesis_filter: {
      max_topics_per_run: 15
    },
    updated_at: null
  }));

  assert.equal(memory.thesis_filter?.max_topics_per_run, 15);
});

test("preference memory prompt stays compact and structured", () => {
  const text = formatPreferenceMemoryForPrompt({
    writing_preferences: ["Prefer more authorial practitioner framing."],
    visual_preferences: ["Prefer clean editorial vector metaphors."],
    topic_preferences: ["Selected topic direction: AI and product judgment."],
    avoid: ["Avoid generic AI replacement framing."],
    updated_at: "2026-08-11T10:00:00.000Z"
  });

  assert.match(text, /Writing preferences/);
  assert.match(text, /Visual preferences/);
  assert.match(text, /Avoid/);
  assert.equal(text.includes("2026-08-11"), false);
});
