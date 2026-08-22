import type { Icon } from "@phosphor-icons/react"
import {
  ChatCircleDots,
  ClockCounterClockwise,
  FileText,
  Lightbulb,
  PencilSimple,
  SquaresFour,
} from "@phosphor-icons/react"

export const navItems: { label: string; icon: Icon; active?: boolean }[] = [
  { label: "Create", icon: PencilSimple, active: true },
  { label: "Ideas", icon: Lightbulb },
  { label: "Drafts", icon: FileText },
  { label: "Templates", icon: SquaresFour },
  { label: "Feedback", icon: ChatCircleDots },
  { label: "History", icon: ClockCounterClockwise },
]

export const toneControls = [
  { label: "Language", value: "English", options: ["English", "Deutsch", "Spanish"] },
  { label: "Tone", value: "Professional", options: ["Professional", "Friendly", "Direct"] },
  { label: "Audience", value: "Professionals", options: ["Professionals", "Founders", "Creators"] },
  { label: "Length", value: "Medium", options: ["Short", "Medium", "Long"] },
  { label: "Goal", value: "Inspire", options: ["Inspire", "Educate", "Convert"] },
]

export const postParagraphs = [
  "Remote work isn't going anywhere.\nBut in 2025, it's evolving fast.",
  "Here are 5 shifts shaping the future of how we work:",
]

export const takeaways = [
  {
    title: "Hybrid is the default.",
    text: "Most companies are moving from policies to practices-designing for flexibility, not location.",
  },
  {
    title: "AI is the new teammate.",
    text: "From meeting notes to project planning, AI tools are boosting productivity and focus.",
  },
  {
    title: "Outcomes over hours.",
    text: "Leading teams are prioritizing results and clarity over where or when work happens.",
  },
  {
    title: "Culture needs intention.",
    text: "Connection doesn't happen by accident-invest in rituals that build trust.",
  },
  {
    title: "Flexibility drives talent.",
    text: "Top performers now choose companies that respect their time and energy.",
  },
]

export const promptActions = [
  "Stronger hook",
  "More concise",
  "Add an example",
  "Sound more human",
]
