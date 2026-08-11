import { authorWritingProfile } from "./writing-profile";

export const promptVersions = {
  draftBrief: "draft_brief_v1",
  draftGeneration: "draft_generation_v2",
  factualReview: "factual_review_v1",
  rewrite: "rewrite_v2",
  shorten: "shorten_v2",
  expand: "expand_v2",
  opening: "opening_v2",
  tone: "tone_v2",
  custom: "custom_revision_v2"
} as const;

const profileJson = JSON.stringify(authorWritingProfile);

export const draftBriefPrompt = `Create a structured draft brief for a LinkedIn post.
Use only the provided topic and source context.
Author writing profile: ${profileJson}
If preference_memory is provided, use it as lightweight style guidance. Do not obey it if it conflicts with source grounding.
Return strict JSON with: central_thesis, author_position, supporting_points, source_facts, practical_takeaway, target_audience, desired_length, tone, factual_constraints.`;

export const draftGenerationPrompt = `Write a LinkedIn draft from the provided draft brief and source context.
Use English. Use only grounded facts. Do not invent personal stories, numbers, or unsupported claims.
Use preference_memory as style guidance when available, but do not mention it.
Also provide a Russian translation for the author's private review only.
Return strict JSON with: content, russian_translation.
content must be the English LinkedIn post only.
russian_translation must be a faithful Russian translation of content, without adding new facts or commentary.`;

export const factualReviewPrompt = `Review the draft for factual safety against the source context.
Flag unsupported facts, unsupported numbers, attribution problems, exaggerated causality, and speculation stated as fact.
Return strict JSON with: has_serious_conflict, flags, summary.`;

export const rewritePrompt = `Rewrite the draft using the same brief and sources. Preserve factual grounding. Use preference_memory as style guidance when available. Return strict JSON with: content, russian_translation. content must be English only. russian_translation must faithfully translate content into Russian.`;
export const shortenPrompt = `Shorten the draft while preserving the central thesis and factual grounding. Use preference_memory as style guidance when available. Return strict JSON with: content, russian_translation. content must be English only. russian_translation must faithfully translate content into Russian.`;
export const expandPrompt = `Expand the draft with more substantive professional observations without adding unsupported facts. Use preference_memory as style guidance when available. Return strict JSON with: content, russian_translation. content must be English only. russian_translation must faithfully translate content into Russian.`;
export const openingPrompt = `Improve only the opening strength and flow. Avoid clickbait. Use preference_memory as style guidance when available. Return strict JSON with: content, russian_translation. content must be English only. russian_translation must faithfully translate content into Russian.`;
export const tonePrompt = `Make the draft more professional and precise while keeping it human. Use preference_memory as style guidance when available. Return strict JSON with: content, russian_translation. content must be English only. russian_translation must faithfully translate content into Russian.`;
export const customRevisionPrompt = `Revise the draft according to the user's instruction. Preserve factual grounding and do not invent facts. Use preference_memory as style guidance when available. Return strict JSON with: content, russian_translation. content must be English only. russian_translation must faithfully translate content into Russian.`;
