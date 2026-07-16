import { authorWritingProfile } from "./writing-profile";

export const promptVersions = {
  draftBrief: "draft_brief_v1",
  draftGeneration: "draft_generation_v1",
  factualReview: "factual_review_v1",
  rewrite: "rewrite_v1",
  shorten: "shorten_v1",
  expand: "expand_v1",
  opening: "opening_v1",
  tone: "tone_v1",
  custom: "custom_revision_v1"
} as const;

const profileJson = JSON.stringify(authorWritingProfile);

export const draftBriefPrompt = `Create a structured draft brief for a LinkedIn post.
Use only the provided topic and source context.
Author writing profile: ${profileJson}
Return strict JSON with: central_thesis, author_position, supporting_points, source_facts, practical_takeaway, target_audience, desired_length, tone, factual_constraints.`;

export const draftGenerationPrompt = `Write a LinkedIn draft from the provided draft brief and source context.
Use English. Use only grounded facts. Do not invent personal stories, numbers, or unsupported claims.
Return strict JSON with: content.`;

export const factualReviewPrompt = `Review the draft for factual safety against the source context.
Flag unsupported facts, unsupported numbers, attribution problems, exaggerated causality, and speculation stated as fact.
Return strict JSON with: has_serious_conflict, flags, summary.`;

export const rewritePrompt = `Rewrite the draft using the same brief and sources. Preserve factual grounding. Return strict JSON with: content.`;
export const shortenPrompt = `Shorten the draft while preserving the central thesis and factual grounding. Return strict JSON with: content.`;
export const expandPrompt = `Expand the draft with more substantive professional observations without adding unsupported facts. Return strict JSON with: content.`;
export const openingPrompt = `Improve only the opening strength and flow. Avoid clickbait. Return strict JSON with: content.`;
export const tonePrompt = `Make the draft more professional and precise while keeping it human. Return strict JSON with: content.`;
export const customRevisionPrompt = `Revise the draft according to the user's instruction. Preserve factual grounding and do not invent facts. Return strict JSON with: content.`;
