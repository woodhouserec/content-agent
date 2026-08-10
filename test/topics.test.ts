import assert from "node:assert/strict";
import test from "node:test";
import type { CollectedItemRecord } from "../src/storage/collected-items";
import { createTopicFingerprint, normalizeForFingerprint } from "../src/scoring/topic-fingerprint";
import { classifyItem } from "../src/scoring/topic-formation";

test("topic fingerprint normalizes similar title text", async () => {
  const first = await createTopicFingerprint(
    "Why AI changes the role of product designers",
    "Use as a practitioner reflection",
    ["b", "a"]
  );
  const second = await createTopicFingerprint(
    "AI changes role of Product Designers!",
    "Use as practitioner reflection",
    ["a", "b"]
  );

  assert.equal(first, second);
});

test("fingerprint normalization removes filler words and punctuation", () => {
  assert.equal(
    normalizeForFingerprint("Why the Design Systems, and Product Teams!"),
    "design systems product teams"
  );
});

test("topic classification keeps form usability separate from broad AI topics", () => {
  const item = {
    title: "The 6 UX Principles That Reduce User Frustration When Filling Out Forms",
    summary: "Input validation, field labels, checkout friction, and signup form usability patterns.",
    normalized_content: "Teams can reduce form friction by improving input fields and validation.",
    metadata_json: null
  } as CollectedItemRecord;

  assert.equal(classifyItem(item), "forms_usability");
});

test("topic classification recognizes design system governance", () => {
  const item = {
    title: "How variables and tokens change design system governance",
    summary: "A component library needs governance, tokens, patterns, and adoption workflows.",
    normalized_content: "Design system teams need governance for components and variables.",
    metadata_json: null
  } as CollectedItemRecord;

  assert.equal(classifyItem(item), "design_systems_governance");
});
