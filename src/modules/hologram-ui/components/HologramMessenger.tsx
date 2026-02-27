/**
 * HologramMessenger — Unified Messaging Hub
 * ══════════════════════════════════════════
 *
 * Focus-first unified inbox. Click an email → full immersive reading view.
 * No split panels, no distractions. Just you and the message.
 *
 * North star: Focus · Signal · Peace → Inbox Zero every day.
 * Triadic: Learn · Work · Play as thematic filters.
 *
 * @module hologram-ui/components/HologramMessenger
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useScreenTheme } from "@/modules/hologram-ui/hooks/useScreenTheme";
import {
  IconX, IconStar, IconClock, IconCheck,
  IconChevronRight, IconArchive, IconSearch,
  IconSparkles, IconTrophy, IconCircleCheck,
  IconMail, IconBrandTelegram, IconBrandWhatsapp,
  IconBrandLinkedin, IconBrandDiscord, IconShieldCheck,
  IconSend, IconFlame, IconCornerUpLeft,
  IconDotsVertical, IconPencil, IconSettings,
  IconCalendarEvent, IconBrain, IconUsers, IconUserPlus,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";

import zeroInboxReward from "@/assets/zero-inbox-reward.jpg";
import MessengerCalendar, { type CalendarEvent } from "./messenger/MessengerCalendar";
import MessengerAIPanel from "./messenger/MessengerAIPanel";
import MessengerIntroductions from "./messenger/MessengerIntroductions";

// ── Palette by mode ─────────────────────────────────────────────────────────

type ThemeMode = "light" | "dark";

function palette(mode: ThemeMode) {
  if (mode === "light") return {
    bg:            "hsl(0, 0%, 100%)",
    surface:       "hsl(0, 0%, 98%)",
    surfaceHover:  "hsl(0, 0%, 96%)",
    surfaceActive: "hsl(220, 20%, 95%)",
    border:        "hsl(0, 0%, 91%)",
    text:          "hsl(0, 0%, 12%)",
    textSecondary: "hsl(0, 0%, 35%)",
    muted:         "hsl(0, 0%, 55%)",
    dim:           "hsl(0, 0%, 72%)",
    accent:        "hsl(220, 80%, 56%)",
    accentSoft:    "hsla(220, 80%, 56%, 0.08)",
    gold:          "hsl(38, 70%, 50%)",
    green:         "hsl(152, 55%, 42%)",
    red:           "hsl(0, 65%, 52%)",
    orange:        "hsl(28, 80%, 52%)",
    rowSelected:   "hsl(220, 25%, 96%)",
    divider:       "hsl(0, 0%, 93%)",
  };
  return {
    bg:            "hsl(228, 14%, 14%)",
    surface:       "hsl(228, 12%, 17%)",
    surfaceHover:  "hsl(228, 12%, 20%)",
    surfaceActive: "hsl(228, 15%, 22%)",
    border:        "hsla(220, 15%, 40%, 0.2)",
    text:          "hsl(220, 10%, 92%)",
    textSecondary: "hsl(220, 8%, 65%)",
    muted:         "hsl(220, 8%, 50%)",
    dim:           "hsl(220, 8%, 38%)",
    accent:        "hsl(220, 80%, 65%)",
    accentSoft:    "hsla(220, 80%, 65%, 0.1)",
    gold:          "hsl(38, 55%, 60%)",
    green:         "hsl(152, 44%, 50%)",
    red:           "hsl(0, 55%, 55%)",
    orange:        "hsl(28, 70%, 55%)",
    rowSelected:   "hsl(228, 15%, 20%)",
    divider:       "hsla(220, 15%, 40%, 0.15)",
  };
}

const FONT = "'DM Sans', system-ui, sans-serif";
const SERIF = "'Playfair Display', serif";

// ── Types ───────────────────────────────────────────────────────────────────

type TriadicPhase = "all" | "learn" | "work" | "play";
type Platform = "email" | "telegram" | "whatsapp" | "linkedin" | "discord" | "signal";
type MessengerView = "inbox" | "calendar" | "ai" | "introductions";

interface Message {
  id: string;
  from: string;
  email?: string;
  location?: string;
  bio?: string;
  subject: string;
  preview: string;
  platform: Platform;
  phase: "learn" | "work" | "play";
  priority: "urgent" | "normal" | "low";
  time: string;
  unread: boolean;
  starred: boolean;
  actionable: boolean;
  actionLabel?: string;
  tag?: { label: string; color: string };
  threadCount?: number;
  socialLinks?: { type: string; handle: string }[];
  recentThreads?: string[];
}

// ── Platform config ─────────────────────────────────────────────────────────

const PLATFORM_CFG: Record<Platform, { icon: typeof IconMail; color: string; label: string }> = {
  email:     { icon: IconMail,           color: "hsl(38, 40%, 55%)",   label: "Mail" },
  telegram:  { icon: IconBrandTelegram,  color: "hsl(200, 70%, 55%)", label: "Telegram" },
  whatsapp:  { icon: IconBrandWhatsapp,  color: "hsl(142, 60%, 48%)", label: "WhatsApp" },
  linkedin:  { icon: IconBrandLinkedin,  color: "hsl(210, 70%, 52%)", label: "LinkedIn" },
  discord:   { icon: IconBrandDiscord,   color: "hsl(235, 60%, 65%)", label: "Discord" },
  signal:    { icon: IconShieldCheck,    color: "hsl(210, 50%, 60%)", label: "Signal" },
};

// ── Mock data ───────────────────────────────────────────────────────────────

const MOCK_MESSAGES: Message[] = [
  // ── WORK (23) ──────────────────────────────────────────────────────────
  { id: "1", from: "Elena Vasquez", email: "elena@arcanecapital.com", location: "San Francisco", bio: "Early stage VC focused on infrastructure and developer tools", subject: "Term sheet is ready — let's close this", preview: "We've finalized the terms. Everything looks clean on our side. I need your signature by Thursday so we can wire before the quarter ends. Let me know if you want to do a final walkthrough call.", platform: "email", phase: "work", priority: "urgent", time: "FEB 27", unread: true, starred: true, actionable: true, actionLabel: "Reply by EOD", tag: { label: "partnership", color: "hsl(265, 55%, 60%)" }, socialLinks: [{ type: "LinkedIn", handle: "elena-vasquez" }, { type: "Twitter", handle: "@elenavc" }], recentThreads: ["Diligence list", "Cap table review", "Re: messaging & bots"] },
  { id: "2", from: "Priya Nair", subject: "Sprint retro notes — things that actually went well", preview: "Believe it or not, we shipped everything we committed to this sprint. Attaching the retro doc. The only flag: our deploy pipeline added 4 minutes of latency. DevOps is looking into it.", platform: "email", phase: "work", priority: "normal", time: "FEB 27", unread: true, starred: false, actionable: false, threadCount: 5 },
  { id: "3", from: "Marcus Holt", email: "marcus@privacylab.org", subject: "Privacy framework v2 — your section needs work", preview: "Hey, Section 3 on data residency is too vague. The EU team flagged it. Can you tighten the language around cross-border transfers? I rewrote the intro to give you a template.", platform: "signal", phase: "work", priority: "normal", time: "FEB 26", unread: true, starred: false, actionable: true, actionLabel: "Review draft" },
  { id: "4", from: "Alex Mercer", subject: "API rate limits are going to bite us", preview: "Just ran the load test. At current growth, we'll hit the 10k/min ceiling in about 3 weeks. We either need to negotiate a higher tier or implement request batching. Thoughts?", platform: "telegram", phase: "work", priority: "urgent", time: "FEB 26", unread: true, starred: false, actionable: true, actionLabel: "Confirm approach" },
  { id: "5", from: "Dani Okafor", subject: "The logo is done and I'm unreasonably proud of it", preview: "After 47 iterations (yes I counted), the mark finally feels right. It works at 16px, it works on dark backgrounds, and it doesn't look like a cryptocurrency. Attaching the full asset kit.", platform: "email", phase: "work", priority: "normal", time: "FEB 26", unread: true, starred: true, actionable: false },
  { id: "6", from: "Conrad, Bhavesh", subject: "Q1 OKRs — final draft before board review", preview: "Team, please review the attached OKR doc. We've aligned on 4 objectives with 12 key results. The board meeting is Monday. If you have concerns, now is literally the time.", platform: "email", phase: "work", priority: "normal", time: "FEB 25", unread: false, starred: false, actionable: false, threadCount: 3 },
  { id: "7", from: "Angelo Wong", subject: "I need you to scope something wild", preview: "A client wants us to build a recommendation engine that works offline, runs on-device, and trains on less than 1MB of data. Before you say no — the budget is very real. Let's talk.", platform: "linkedin", phase: "work", priority: "urgent", time: "FEB 25", unread: false, starred: false, actionable: true, actionLabel: "Review scope", tag: { label: "contract", color: "hsl(28, 70%, 55%)" } },
  { id: "8", from: "Suki Tanaka", subject: "User interviews summary — they don't use the feature we spent 3 months on", preview: "Talked to 12 users this week. Nobody uses the advanced filter panel. Not one person. They all just use the search bar. I have feelings about this but also data. Deck attached.", platform: "email", phase: "work", priority: "normal", time: "FEB 25", unread: false, starred: false, actionable: false },
  { id: "9", from: "Naveed Ansari", subject: "The staging server is haunted", preview: "I'm not exaggerating. Deployments succeed, tests pass, then the app serves yesterday's build. I've checked the cache, the CDN, the build artifacts. Everything looks correct. It simply does not care.", platform: "discord", phase: "work", priority: "normal", time: "FEB 24", unread: false, starred: false, actionable: false },
  { id: "10", from: "Rachel Kim", subject: "Contracts for the advisory board — please sign", preview: "Legal finalized the advisor agreements. Standard 0.25% vesting over 2 years with a 1-year cliff. Nothing unusual. DocuSign link inside.", platform: "email", phase: "work", priority: "normal", time: "FEB 24", unread: false, starred: false, actionable: true, actionLabel: "Sign contract" },
  { id: "11", from: "Dev Team", subject: "Incident postmortem: the 47-minute outage", preview: "Root cause: a database migration ran during peak hours because someone (me) forgot to check the cron schedule. No data loss. New rule: all migrations run at 3am UTC. Document attached.", platform: "email", phase: "work", priority: "normal", time: "FEB 23", unread: false, starred: false, actionable: false },
  { id: "12", from: "Liam O'Brien", subject: "Pitch deck feedback — slide 7 is doing too much", preview: "The rest of the deck is tight but slide 7 tries to explain your entire technical architecture in one diagram. Split it into two slides. Also, your TAM calculation needs a source.", platform: "email", phase: "work", priority: "normal", time: "FEB 23", unread: false, starred: false, actionable: false },
  { id: "13", from: "Fatima Al-Rashid", subject: "Partnership proposal from the museum network", preview: "The National Digital Heritage Coalition wants to use our platform for archiving. 200+ museums, 4M artifacts. This could be massive for credibility. They want a pilot by April.", platform: "email", phase: "work", priority: "normal", time: "FEB 22", unread: false, starred: true, actionable: true, actionLabel: "Schedule call", tag: { label: "partnership", color: "hsl(265, 55%, 60%)" } },
  { id: "14", from: "Oscar Reyes", subject: "I automated the thing you hate doing", preview: "You know that weekly report you manually pull from 3 dashboards? I wrote a script that does it in 11 seconds and emails it to you every Monday at 8am. You're welcome.", platform: "telegram", phase: "work", priority: "low", time: "FEB 22", unread: false, starred: true, actionable: false },
  { id: "15", from: "Clara Dubois", subject: "Brand guidelines v3 — now with actual guidelines", preview: "Previous versions were more like 'brand suggestions.' This one has do's, don'ts, spacing rules, and a color system that makes sense. 42 pages. I regret nothing.", platform: "email", phase: "work", priority: "low", time: "FEB 21", unread: false, starred: false, actionable: false },
  { id: "16", from: "James Park", subject: "We need to talk about the onboarding flow", preview: "Current drop-off rate after signup: 68%. That's not a funnel, that's a cliff. I have three proposals ranging from 'quick fix' to 'burn it down and rebuild.' When can we meet?", platform: "email", phase: "work", priority: "urgent", time: "FEB 21", unread: false, starred: false, actionable: true, actionLabel: "Book meeting" },
  { id: "17", from: "Zara Okonkwo", subject: "Vendor comparison: who actually responds to support tickets", preview: "I tested 8 vendors by submitting identical support tickets. Response times ranged from 4 minutes to 'still waiting.' Spreadsheet attached. The winner surprised me.", platform: "email", phase: "work", priority: "normal", time: "FEB 20", unread: false, starred: false, actionable: false },
  { id: "18", from: "Robin Schulz", subject: "The intern built something incredible", preview: "Remember the intern we almost didn't hire? She built a real-time collaboration feature in 3 days that our senior team estimated would take 2 sprints. We should probably promote her.", platform: "email", phase: "work", priority: "low", time: "FEB 19", unread: false, starred: true, actionable: false },
  { id: "19", from: "Accounting", subject: "Expense report reminder — your receipts are overdue", preview: "You have 14 unreported expenses totaling $2,847. Please submit by end of month. Yes, coffee counts. No, the office plants do not count as 'team morale infrastructure.'", platform: "email", phase: "work", priority: "low", time: "FEB 18", unread: false, starred: false, actionable: true, actionLabel: "Submit expenses" },
  { id: "20", from: "Vera Sokolova", subject: "Competitive intel: they just raised $40M", preview: "Our main competitor announced their Series B this morning. Their pitch: 'AI-native everything.' Their product: mostly a chatbot wrapper. But $40M buys a lot of marketing. We should discuss positioning.", platform: "email", phase: "work", priority: "normal", time: "FEB 17", unread: false, starred: false, actionable: false },
  { id: "21", from: "Tomás Herrera", subject: "Infrastructure costs are down 34% 🎉", preview: "The migration to the new cloud provider is complete. We're saving $12k/month. Also the deploys are faster. Also I slept 9 hours last night for the first time in weeks. All related.", platform: "email", phase: "work", priority: "low", time: "FEB 16", unread: false, starred: false, actionable: false },
  { id: "22", from: "Amara Chen", subject: "Customer just called us 'delightful' in a review", preview: "I'm framing this. A Fortune 500 CTO wrote: 'The product is delightful and the team actually listens.' Screenshot attached. We should use this everywhere.", platform: "email", phase: "work", priority: "low", time: "FEB 15", unread: false, starred: true, actionable: false },
  { id: "23", from: "Board Notifications", subject: "Board deck due in 5 days", preview: "Quarterly board meeting is March 4th. Please finalize your section of the deck. Finance needs actuals by Wednesday. Product needs the roadmap slide. No one needs another 50-slide appendix.", platform: "email", phase: "work", priority: "normal", time: "FEB 14", unread: false, starred: false, actionable: true, actionLabel: "Prepare deck" },

  // ── LEARN (23) ─────────────────────────────────────────────────────────
  { id: "24", from: "Prof. Chen Wei", subject: "Your paper on emergent symmetries — reviewer comments", preview: "Two reviewers loved it. The third wants you to 'more rigorously define what you mean by emergence.' I've attached their full comments. Resubmission deadline is March 15.", platform: "email", phase: "learn", priority: "urgent", time: "FEB 27", unread: true, starred: true, actionable: true, actionLabel: "Read & respond" },
  { id: "25", from: "Arxiv Digest", subject: "7 papers that made me rethink category theory", preview: "This week's picks include a wild paper connecting topological data analysis to transformer attention patterns. Also: someone proved that a conjecture from 1987 was wrong. Beautifully wrong.", platform: "email", phase: "learn", priority: "normal", time: "FEB 27", unread: true, starred: false, actionable: false },
  { id: "26", from: "Anya Petrova", email: "anya@eth.ch", subject: "Have you seen the new results on information geometry?", preview: "There's a group in Kyoto publishing work that basically unifies Fisher information with Riemannian curvature in a way that's actually useful. I'm losing sleep over this. Paper link inside.", platform: "email", phase: "learn", priority: "normal", time: "FEB 26", unread: true, starred: true, actionable: false },
  { id: "27", from: "Coursera", subject: "You're 73% through 'Computational Neuroscience'", preview: "You left off at Week 6: Neural Coding. The next module covers population coding and Bayesian inference in neural circuits. Estimated time to finish: 4 hours. You've got this.", platform: "email", phase: "learn", priority: "low", time: "FEB 26", unread: false, starred: false, actionable: false },
  { id: "28", from: "Sebastian Thrun", subject: "Re: Your question about SLAM algorithms", preview: "Great question. The key insight most people miss is that SLAM isn't really about mapping — it's about reducing uncertainty. The map is a side effect. I wrote a short note explaining this.", platform: "email", phase: "learn", priority: "normal", time: "FEB 25", unread: false, starred: true, actionable: false },
  { id: "29", from: "Library Hold Notification", subject: "Your hold on 'Gödel, Escher, Bach' is ready", preview: "The book you requested is available for pickup at the downtown branch. You have 7 days before it goes back into circulation. This is your third time checking out this book. We respect the commitment.", platform: "email", phase: "learn", priority: "low", time: "FEB 25", unread: false, starred: false, actionable: false },
  { id: "30", from: "Dr. Miriam Osei", subject: "That cognitive science lecture changed my entire research direction", preview: "I watched the talk you recommended on embodied cognition. I've spent the last 48 hours reorganizing my thesis outline. My advisor is either going to love this or ask me to leave the program.", platform: "telegram", phase: "learn", priority: "normal", time: "FEB 24", unread: false, starred: false, actionable: false },
  { id: "31", from: "Khan Academy", subject: "New course: The Mathematics of Music", preview: "Why do some chords feel resolved and others feel tense? It's not just culture — it's physics. This course explores the deep connections between harmonic series, symmetry groups, and what your ear calls 'beautiful.'", platform: "email", phase: "learn", priority: "low", time: "FEB 24", unread: false, starred: false, actionable: false },
  { id: "32", from: "Philosophy Reading Group", subject: "Next week: Wittgenstein's private language argument", preview: "Come prepared to have your intuitions about consciousness thoroughly dismantled. Readings: Philosophical Investigations §243-315. Snacks will be provided. Existential crises will not be catered.", platform: "discord", phase: "learn", priority: "normal", time: "FEB 23", unread: false, starred: false, actionable: false },
  { id: "33", from: "Nature Briefing", subject: "A fungal network that solves optimization problems", preview: "Researchers in Tokyo connected slime mold to a map of railway stations. It independently recreated the Tokyo rail network — and found a more efficient layout. Evolution has been doing compute for a while.", platform: "email", phase: "learn", priority: "low", time: "FEB 23", unread: false, starred: false, actionable: false },
  { id: "34", from: "Raj Patel", subject: "I finally understand monads and I'm furious", preview: "It took me 3 years, 20 blog posts, and a whiteboard session with a Haskell developer who speaks in types. A monad is just a burrito. I'm kidding. But also not really. Let me explain over coffee.", platform: "telegram", phase: "learn", priority: "low", time: "FEB 22", unread: false, starred: true, actionable: false },
  { id: "35", from: "MIT OpenCourseWare", subject: "New lecture: Quantum Error Correction", preview: "Lecture 12 in the Quantum Computing series is now available. Topics: stabilizer codes, Shor's 9-qubit code, and the threshold theorem. Prerequisite: comfort with tensor products and a tolerance for bra-ket notation.", platform: "email", phase: "learn", priority: "low", time: "FEB 22", unread: false, starred: false, actionable: false },
  { id: "36", from: "Dr. Helena Voss", subject: "The topology paper you sent me has a gap on page 7", preview: "I hate to be that person but the proof of Lemma 3.2 assumes compactness without establishing it. The result might still hold but the argument needs work. Happy to discuss over the whiteboard this week.", platform: "email", phase: "learn", priority: "normal", time: "FEB 21", unread: false, starred: false, actionable: true, actionLabel: "Schedule discussion" },
  { id: "37", from: "Feynman Bot", subject: "Daily Feynman: On not fooling yourself", preview: "'The first principle is that you must not fool yourself — and you are the easiest person to fool.' Today's context: how confirmation bias shows up in peer review, hiring, and debugging.", platform: "email", phase: "learn", priority: "low", time: "FEB 21", unread: false, starred: false, actionable: false },
  { id: "38", from: "Language Exchange", subject: "Your Japanese study partner left you a voice message", preview: "Yuki recorded a 2-minute conversation about her weekend in natural-speed Japanese. She says your particle usage is improving but you still use です when you should use だ. Casual speech practice time.", platform: "whatsapp", phase: "learn", priority: "normal", time: "FEB 20", unread: false, starred: false, actionable: false },
  { id: "39", from: "Santa Fe Institute", subject: "Complexity Explorer: New course on agent-based modeling", preview: "Model flocking birds, traffic jams, and market crashes — all with the same mathematical framework. Starts March 10. No prerequisites except curiosity and a willingness to question equilibrium assumptions.", platform: "email", phase: "learn", priority: "low", time: "FEB 19", unread: false, starred: false, actionable: false },
  { id: "40", from: "Book Club", subject: "March pick: 'The Structure of Scientific Revolutions'", preview: "Kuhn's masterpiece. We'll discuss paradigm shifts, normal science, and whether 'incommensurability' is a real thing or just a word Thomas Kuhn made up to sound important. (It's both.)", platform: "discord", phase: "learn", priority: "low", time: "FEB 18", unread: false, starred: false, actionable: false },
  { id: "41", from: "Wolfram Research", subject: "A new kind of cellular automaton that simulates fluid dynamics", preview: "Rule 110 was Turing-complete. This new 2D automaton does something arguably weirder: it spontaneously produces vortex shedding. We wrote a paper about it. Interactive demo inside.", platform: "email", phase: "learn", priority: "low", time: "FEB 17", unread: false, starred: false, actionable: false },
  { id: "42", from: "Dr. Kwame Asante", subject: "Re: Is consciousness computable?", preview: "I've been thinking about your question for two weeks. My honest answer: I don't know, but I suspect the question itself is malformed. What if consciousness isn't a computation but a geometry? Long email incoming.", platform: "email", phase: "learn", priority: "normal", time: "FEB 16", unread: false, starred: true, actionable: false },
  { id: "43", from: "Astro Photo Club", subject: "Tonight: Jupiter and 4 Galilean moons visible at 9pm", preview: "Clear skies forecast. Jupiter is at opposition, meaning it's the brightest it'll be all year. Bring binoculars — you can actually see Io, Europa, Ganymede, and Callisto as tiny dots. Rooftop meetup at 8:45.", platform: "discord", phase: "learn", priority: "normal", time: "FEB 15", unread: false, starred: false, actionable: false },
  { id: "44", from: "Maria Gonzalez", subject: "This podcast episode on memory reconsolidation blew my mind", preview: "Every time you recall a memory, your brain rewrites it. That means your most vivid memories are probably your least accurate ones. The implications for eyewitness testimony are terrifying.", platform: "whatsapp", phase: "learn", priority: "low", time: "FEB 14", unread: false, starred: false, actionable: false },
  { id: "45", from: "History of Computing", subject: "Ada Lovelace's notes were more radical than we teach", preview: "Everyone knows she wrote the first algorithm. Fewer people know she predicted artificial intelligence in 1843 — and then argued against it. Her reasoning is surprisingly modern. Thread inside.", platform: "email", phase: "learn", priority: "low", time: "FEB 13", unread: false, starred: false, actionable: false },
  { id: "46", from: "Open Research", subject: "Reproducibility crisis update: 67% of top ML papers fail to replicate", preview: "A team tried to reproduce results from 100 highly-cited ML papers. 33 reproduced cleanly, 24 partially, and 43 didn't work at all. The authors' reactions were... illuminating. Full report attached.", platform: "email", phase: "learn", priority: "normal", time: "FEB 12", unread: false, starred: false, actionable: false },

  // ── PLAY (23) ──────────────────────────────────────────────────────────
  { id: "47", from: "Lena Park", subject: "Surfing Saturday? 🏄 Swells look perfect", preview: "4-6ft faces, offshore winds, water temp at 62°F. I'm bringing the longboard. If you don't come I'll send you photos from the lineup just to make you regret it.", platform: "whatsapp", phase: "play", priority: "normal", time: "FEB 27", unread: true, starred: true, actionable: false },
  { id: "48", from: "Jazz Night Collective", subject: "This Friday: Coltrane tribute at The Blue Room", preview: "A Love Supreme performed live by a 7-piece ensemble. Doors at 8, music at 9. Last time they played here, the saxophone solo in 'Resolution' made someone cry. Fair warning.", platform: "email", phase: "play", priority: "normal", time: "FEB 27", unread: true, starred: false, actionable: false },
  { id: "49", from: "Diego Morales", subject: "I made pasta from scratch and it changed me as a person", preview: "I'm not being dramatic. The texture, the sauce adhesion, the way it holds heat differently. I'll never go back to dried pasta. Come over Sunday and I'll teach you. Bring wine and humility.", platform: "telegram", phase: "play", priority: "low", time: "FEB 26", unread: true, starred: false, actionable: false },
  { id: "50", from: "Running Club", subject: "Spring half-marathon training starts Monday 🏃", preview: "12-week plan. We run together on Tuesdays and Saturdays. Pace groups from 8:00/mi to 12:00/mi — no one gets left behind. Goal: finish smiling. Secondary goal: don't walk the last mile.", platform: "discord", phase: "play", priority: "normal", time: "FEB 26", unread: false, starred: false, actionable: false },
  { id: "51", from: "Maya Chen", subject: "The pottery class was a disaster and I loved every second", preview: "My 'bowl' looks like a haunted ashtray. The instructor said 'that's... very organic.' But honestly, getting my hands in clay for 2 hours with no screens was the most present I've felt in months.", platform: "whatsapp", phase: "play", priority: "low", time: "FEB 25", unread: false, starred: true, actionable: false },
  { id: "52", from: "Film Society", subject: "March screening: '2001: A Space Odyssey' on 70mm", preview: "The real IMAX print. Not a digital projection pretending to be IMAX. The Stargate sequence on actual film is a religious experience. 47 seats. Reserve now or forever hold your peace.", platform: "email", phase: "play", priority: "normal", time: "FEB 25", unread: false, starred: false, actionable: false },
  { id: "53", from: "Sam & Jules", subject: "Game night is back — bring your worst board game", preview: "The rule: everyone brings a terrible board game they love. Last time, someone brought a German farming simulator from 1997 and it was the best 3 hours of my year. Saturday 7pm. BYOB.", platform: "telegram", phase: "play", priority: "low", time: "FEB 24", unread: false, starred: false, actionable: false },
  { id: "54", from: "Trail Runners", subject: "New trail discovered: 11 miles through redwoods 🌲", preview: "Moderate elevation, mostly shaded, ends at a swimming hole that nobody seems to know about. I ran it last weekend and saw exactly zero other humans. Map link inside.", platform: "whatsapp", phase: "play", priority: "low", time: "FEB 24", unread: false, starred: true, actionable: false },
  { id: "55", from: "Isabella Torres", subject: "I signed us up for the cooking competition", preview: "Before you panic: it's a 'worst cooks' competition. Our lack of skill is literally the qualification. First round is March 8th. Theme: 'deconstructed classics.' I'm deconstructing a PB&J.", platform: "email", phase: "play", priority: "low", time: "FEB 23", unread: false, starred: false, actionable: false },
  { id: "56", from: "Vinyl Swap", subject: "Someone is selling the original pressing of Kind of Blue", preview: "1959 Columbia six-eye mono pressing. Jacket has some ring wear but the vinyl is VG+. They want $400 which is honestly a steal. I'd buy it myself but I already own two copies. (Don't judge me.)", platform: "discord", phase: "play", priority: "low", time: "FEB 23", unread: false, starred: false, actionable: false },
  { id: "57", from: "Adventure Club", subject: "Kayaking the coast next month — who's in?", preview: "3-day paddle from Point Reyes to Stinson Beach. We camp on the shore both nights. Last year we saw whales. And one very confused sea otter who tried to climb into Raj's kayak.", platform: "email", phase: "play", priority: "normal", time: "FEB 22", unread: false, starred: false, actionable: false },
  { id: "58", from: "Leo Nakamura", subject: "I beat you at chess while you were sleeping", preview: "Checked our async game this morning. You left your queen hanging on move 23. I almost didn't take it because I felt bad. Almost. Your move. Also, rematch?", platform: "telegram", phase: "play", priority: "low", time: "FEB 22", unread: false, starred: false, actionable: false },
  { id: "59", from: "Sketch Club", subject: "Urban sketching session: the old train station", preview: "Sunday 10am, bring whatever you draw with. Last time we did the waterfront, someone did the entire thing with a stick they found on the ground. The vibes are immaculate and judgment-free.", platform: "discord", phase: "play", priority: "low", time: "FEB 21", unread: false, starred: false, actionable: false },
  { id: "60", from: "Nora & Elias", subject: "Dinner party! Theme: food from your childhood 🍲", preview: "March 1st, our place, 7pm. Cook something your parents or grandparents made. Doesn't have to be fancy — boxed mac and cheese with cut-up hot dogs absolutely counts. Stories are mandatory.", platform: "whatsapp", phase: "play", priority: "normal", time: "FEB 20", unread: false, starred: false, actionable: false },
  { id: "61", from: "Mountain Bikers", subject: "New jump line at the bike park is open", preview: "They rebuilt the entire flow section. Bigger tabletops, a proper hip jump, and a drop that they're calling 'the negotiator' because you have to have a conversation with yourself before hitting it.", platform: "discord", phase: "play", priority: "low", time: "FEB 19", unread: false, starred: false, actionable: false },
  { id: "62", from: "Kira Johansson", subject: "I found a secret garden. Literally.", preview: "There's a gate behind the old library on 4th street. It leads to a courtyard with a fountain, climbing roses, and three benches. No one was there. It felt like falling into a Miyazaki film. Meet me there Thursday.", platform: "whatsapp", phase: "play", priority: "low", time: "FEB 18", unread: false, starred: true, actionable: false },
  { id: "63", from: "Comedy Night", subject: "Open mic this Thursday — I'm doing 5 minutes and I'm terrified", preview: "I wrote a bit about trying to explain my job to my grandmother. She thinks I 'fix the internet.' The punch line involves her calling me during a production outage. Come heckle me supportively.", platform: "email", phase: "play", priority: "low", time: "FEB 17", unread: false, starred: false, actionable: false },
  { id: "64", from: "Plant Society", subject: "Propagation swap: bring your cuttings, take someone else's", preview: "My monstera has 14 aerial roots and is attempting to leave my apartment. I'm bringing 6 cuttings. Someone last month brought a variegated string of hearts and I'm still thinking about it.", platform: "discord", phase: "play", priority: "low", time: "FEB 16", unread: false, starred: false, actionable: false },
  { id: "65", from: "Marco Bianchi", subject: "The espresso machine is finally dialed in ☕", preview: "18g in, 36g out, 28 seconds. The crema is tiger-striped. I've achieved what the Italians call 'God shot.' Come taste it before I inevitably bump the grinder and lose it forever.", platform: "telegram", phase: "play", priority: "low", time: "FEB 15", unread: false, starred: false, actionable: false },
  { id: "66", from: "Sunset Chasers", subject: "Golden hour photography walk this evening", preview: "Meeting at the overlook at 5:30pm. Bring whatever camera you have — phone is perfect. Last week someone shot the entire session on a disposable camera and the photos were genuinely beautiful.", platform: "whatsapp", phase: "play", priority: "low", time: "FEB 14", unread: false, starred: false, actionable: false },
  { id: "67", from: "Escape Room Gang", subject: "We finally beat the impossible room 🔓", preview: "47 minutes. We had 3 minutes left and Priya figured out the cipher by literally reading it upside down. The staff said we were the 4th group ever to finish. We are insufferable about this now.", platform: "telegram", phase: "play", priority: "low", time: "FEB 13", unread: false, starred: false, actionable: false },
  { id: "68", from: "Rooftop Cinema", subject: "Outdoor screening: Spirited Away under the stars ✨", preview: "Blankets, hot chocolate, and Miyazaki. Showing starts at sundown. Come early for good spots. Someone always cries during the train scene. It's a safe space for that.", platform: "email", phase: "play", priority: "low", time: "FEB 12", unread: false, starred: false, actionable: false },
  { id: "69", from: "Ava Williams", subject: "I learned to juggle this week and my life has meaning now", preview: "Three balls, consistent cascade, no drops for 30 seconds. It took 4 days of dropping things on my face. Next goal: four balls. Then chainsaws. (Kidding.) (Maybe not.) Want to learn together?", platform: "whatsapp", phase: "play", priority: "low", time: "FEB 11", unread: false, starred: false, actionable: false },
];

// ── Component ───────────────────────────────────────────────────────────────

interface HologramMessengerProps {
  onClose: () => void;
}

export default function HologramMessenger({ onClose }: HologramMessengerProps) {
  // Cascading theme: follows portal in white/dark mode, independent in image mode
  const { mode, toggle: toggleMode, canToggle: canToggleTheme } = useScreenTheme({ screenId: "messenger" });

  const P = palette(mode);
  const [phase, setPhase] = useState<TriadicPhase>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [activeView, setActiveView] = useState<MessengerView>("inbox");

  // Calendar state
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([
    { id: "ev1", title: "Team standup", startTime: new Date(2026, 1, 27, 9, 0), endTime: new Date(2026, 1, 27, 9, 30), color: "hsl(220, 80%, 56%)", status: "confirmed" },
    { id: "ev2", title: "Hologram launch review", startTime: new Date(2026, 1, 27, 14, 0), endTime: new Date(2026, 1, 27, 15, 30), color: "hsl(265, 55%, 60%)", status: "confirmed", location: "Zoom" },
    { id: "ev3", title: "Deep work block", startTime: new Date(2026, 1, 28, 10, 0), endTime: new Date(2026, 1, 28, 12, 0), color: "hsl(152, 55%, 42%)", status: "confirmed" },
  ]);
  const [suggestedEvent, setSuggestedEvent] = useState<Partial<CalendarEvent> | null>(null);

  // Introduction state
  const [introductions, setIntroductions] = useState<any[]>([]);

  const filtered = useMemo(() => {
    let list = messages;
    if (phase !== "all") list = list.filter(m => m.phase === phase);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m =>
        m.from.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.preview.toLowerCase().includes(q)
      );
    }
    return list;
  }, [messages, phase, searchQuery]);

  const selected = useMemo(() => messages.find(m => m.id === selectedId), [messages, selectedId]);

  const stats = useMemo(() => ({
    total: messages.length,
    unread: messages.filter(m => m.unread).length,
  }), [messages]);

  const archiveMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const markRead = useCallback((id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, unread: false } : m));
  }, []);

  const toggleStar = useCallback((id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, starred: !m.starred } : m));
  }, []);

  const isZeroInbox = stats.unread === 0;
  const [replyOpen, setReplyOpen] = useState(false);

  // Create event from message
  const createEventFromMessage = useCallback((msg: Message) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const end = new Date(tomorrow);
    end.setHours(11, 0, 0, 0);
    setSuggestedEvent({
      title: `Re: ${msg.subject}`,
      startTime: tomorrow,
      endTime: end,
      sourceMessageId: msg.id,
      sourcePlatform: msg.platform,
    });
    setActiveView("calendar");
  }, []);

  // Calendar handlers
  const handleCreateEvent = useCallback((event: Omit<CalendarEvent, "id">) => {
    setCalendarEvents(prev => [...prev, { ...event, id: `ev-${Date.now()}` } as CalendarEvent]);
  }, []);

  const handleDeleteEvent = useCallback((id: string) => {
    setCalendarEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  // Introduction handlers
  const handleCreateIntro = useCallback((intro: any) => {
    setIntroductions(prev => [...prev, { ...intro, id: `intro-${Date.now()}`, status: "sent", createdAt: new Date() }]);
  }, []);

  // Contacts derived from messages
  const contacts = useMemo(() =>
    [...new Set(messages.map(m => m.from))].map(name => ({
      name,
      email: messages.find(m => m.from === name)?.email,
      platform: messages.find(m => m.from === name)?.platform,
    })),
    [messages]
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      // Escape: close reply → close reading pane → close messenger
      if (e.key === "Escape") {
        if (replyOpen) { setReplyOpen(false); return; }
        if (selectedId) { setSelectedId(null); return; }
        onClose();
        return;
      }

      // Arrow keys: navigate list
      if (e.key === "ArrowDown" || e.key === "j" || e.key === "J") {
        e.preventDefault();
        const idx = selectedId ? filtered.findIndex(m => m.id === selectedId) : -1;
        const next = filtered[idx + 1];
        if (next) { setSelectedId(next.id); markRead(next.id); }
        else if (!selectedId && filtered.length > 0) { setSelectedId(filtered[0].id); markRead(filtered[0].id); }
        return;
      }
      if (e.key === "ArrowUp" || e.key === "k" || e.key === "K") {
        e.preventDefault();
        const idx = selectedId ? filtered.findIndex(m => m.id === selectedId) : filtered.length;
        const prev = filtered[idx - 1];
        if (prev) { setSelectedId(prev.id); markRead(prev.id); }
        return;
      }

      if (!selectedId) return;

      // E — archive / done
      if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        const idx = filtered.findIndex(m => m.id === selectedId);
        archiveMessage(selectedId);
        // Auto-advance to next message
        const nextAfterArchive = filtered[idx + 1] ?? filtered[idx - 1];
        if (nextAfterArchive && nextAfterArchive.id !== selectedId) setSelectedId(nextAfterArchive.id);
        return;
      }
      // S — star
      if (e.key === "s" || e.key === "S") { e.preventDefault(); toggleStar(selectedId); return; }
      // R — reply
      if (e.key === "r" || e.key === "R") { e.preventDefault(); setReplyOpen(true); return; }
      // Enter — open reading pane (same as select)
      if (e.key === "Enter") { e.preventDefault(); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, filtered, archiveMessage, toggleStar, markRead, onClose, replyOpen]);

  // Phase tab config
  const tabs: { key: TriadicPhase; label: string; count: number }[] = [
    { key: "all", label: "Inbox", count: stats.unread },
    { key: "learn", label: "Learn", count: messages.filter(m => m.phase === "learn").length },
    { key: "work", label: "Work", count: messages.filter(m => m.phase === "work").length },
    { key: "play", label: "Play", count: messages.filter(m => m.phase === "play").length },
  ];

  // View switcher config
  const viewTabs: { key: MessengerView; icon: typeof IconMail; label: string }[] = [
    { key: "inbox", icon: IconMail, label: "Inbox" },
    { key: "calendar", icon: IconCalendarEvent, label: "Calendar" },
    { key: "ai", icon: IconBrain, label: "Lumen" },
    { key: "introductions", icon: IconUsers, label: "Intros" },
  ];

  return (
    <div
      className="flex flex-col h-full w-full select-none"
      style={{ background: P.bg, fontFamily: FONT, color: P.text }}
    >
      {/* ── Header bar ── */}
      <header
        className="flex items-center justify-between px-5 h-[56px] shrink-0"
        style={{ borderBottom: `1px solid ${P.divider}` }}
      >
        <div className="flex items-center gap-6">
          {/* View switcher icons */}
          <nav className="flex items-center gap-0.5">
            {viewTabs.map(({ key, icon: Icon, label }) => {
              const active = activeView === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveView(key)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all duration-150"
                  style={{
                    color: active ? P.accent : P.muted,
                    fontWeight: active ? 600 : 400,
                    fontSize: "13px",
                    background: active ? P.accentSoft : "transparent",
                  }}
                  title={label}
                >
                  <Icon size={15} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </nav>

          {/* Phase tabs — only in inbox view */}
          {activeView === "inbox" && (
            <>
              <div className="w-px h-5" style={{ background: P.divider }} />
              <nav className="flex items-center gap-1">
                {tabs.map(({ key, label, count }) => {
                  const active = phase === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setPhase(key)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all duration-150"
                      style={{
                        color: active ? P.text : P.muted,
                        fontWeight: active ? 600 : 400,
                        fontSize: "14px",
                        background: active ? "transparent" : "transparent",
                      }}
                    >
                      {label}
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 400,
                          color: active ? P.textSecondary : P.dim,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Zero inbox indicator */}
          {isZeroInbox && activeView === "inbox" && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md mr-2" style={{ background: `${P.green}15` }}>
              <IconTrophy size={15} style={{ color: P.green }} />
              <span style={{ fontSize: "12px", fontWeight: 600, color: P.green }}>Zero Inbox</span>
            </div>
          )}

          {/* Compose */}
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: P.muted }}
            title="Compose"
          >
            <IconPencil size={18} strokeWidth={1.5} />
          </button>

          {/* Search */}
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: P.muted }}
            title="Search"
          >
            <IconSearch size={18} strokeWidth={1.5} />
          </button>

          {/* Theme toggle — only shown when portal is in image mode */}
          {canToggleTheme && (
          <button
            onClick={toggleMode}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: P.muted }}
            title={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
          >
            {mode === "light" ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            )}
          </button>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: P.muted }}
          >
            <IconX size={18} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {activeView === "inbox" && (
          <AnimatePresence mode="wait">
            {selectedId && selected ? (
              /* ── Full-focus reading view ── */
              <motion.div
                key="reading-view"
                className="absolute inset-0 flex flex-col overflow-hidden"
                style={{ background: P.bg, zIndex: 10 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <FocusReadingView
                  message={selected}
                  P={P}
                  onBack={() => setSelectedId(null)}
                  onArchive={() => { archiveMessage(selected.id); setSelectedId(null); }}
                  onToggleStar={() => toggleStar(selected.id)}
                  onCreateEvent={() => createEventFromMessage(selected)}
                  onIntroduce={() => setActiveView("introductions")}
                  replyOpen={replyOpen}
                  onOpenReply={() => setReplyOpen(true)}
                  onCloseReply={() => setReplyOpen(false)}
                />
              </motion.div>
            ) : (
              /* ── Inbox list ── */
              <motion.div
                key="inbox-list"
                className="flex-1 flex flex-col min-w-0 overflow-y-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {filtered.length === 0 ? (
                  <ZeroInboxView P={P} />
                ) : (
                  filtered.map((m, i) => (
                    <MessageRow
                      key={m.id}
                      message={m}
                      P={P}
                      selected={false}
                      isFirst={i === 0}
                      onSelect={() => { setSelectedId(m.id); markRead(m.id); }}
                      onArchive={() => archiveMessage(m.id)}
                      onToggleStar={() => toggleStar(m.id)}
                      onCreateEvent={() => createEventFromMessage(m)}
                    />
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {activeView === "calendar" && (
          <div className="flex-1">
            <MessengerCalendar
              P={P}
              font={FONT}
              serif={SERIF}
              events={calendarEvents}
              onCreateEvent={handleCreateEvent}
              onDeleteEvent={handleDeleteEvent}
              suggestedEvent={suggestedEvent}
              onClearSuggestion={() => setSuggestedEvent(null)}
            />
          </div>
        )}

        {activeView === "ai" && (
          <div className="flex-1">
            <MessengerAIPanel
              P={P}
              font={FONT}
              serif={SERIF}
              messages={messages}
              events={calendarEvents}
              onCreateEvent={(e) => {
                setSuggestedEvent(e);
                setActiveView("calendar");
              }}
              onInitiateIntroduction={(a, b, reason) => {
                setActiveView("introductions");
              }}
            />
          </div>
        )}

        {activeView === "introductions" && (
          <div className="flex-1">
            <MessengerIntroductions
              P={P}
              font={FONT}
              serif={SERIF}
              contacts={contacts}
              introductions={introductions}
              onCreateIntro={handleCreateIntro}
            />
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div
        className="flex items-center justify-between px-5 h-[44px] shrink-0"
        style={{ borderTop: `1px solid ${P.divider}` }}
      >
        <div className="flex items-center gap-4">
          {(Object.keys(PLATFORM_CFG) as Platform[]).map(p => {
            const cfg = PLATFORM_CFG[p];
            return (
              <cfg.icon key={p} size={16} style={{ color: P.dim, opacity: 0.8 }} />
            );
          })}
        </div>
        <div className="flex items-center gap-1.5">
          {activeView === "inbox" ? (
            [
              { key: "↑↓", label: "navigate" },
              { key: "E", label: "done" },
              { key: "S", label: "star" },
              { key: "R", label: "reply" },
              { key: "C", label: "calendar" },
              { key: "esc", label: "back" },
            ].map(h => (
              <div key={h.key} className="flex items-center gap-1 mr-2">
                <kbd
                  className="inline-flex items-center justify-center rounded px-1.5 h-[22px]"
                  style={{
                    fontSize: "11px",
                    fontFamily: "monospace",
                    fontWeight: 600,
                    color: P.dim,
                    background: P.surfaceHover,
                    border: `1px solid ${P.divider}`,
                    minWidth: "22px",
                  }}
                >
                  {h.key}
                </kbd>
                <span style={{ fontSize: "11px", color: P.dim }}>{h.label}</span>
              </div>
            ))
          ) : (
            <span style={{ fontSize: "11px", color: P.dim }}>
              {activeView === "calendar" && `${calendarEvents.length} events`}
              {activeView === "ai" && "Private context · Encrypted graph"}
              {activeView === "introductions" && `${introductions.length} introductions`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Message Row — clean single-line inbox entry ─────────────────────────────

function MessageRow({
  message: m,
  P,
  selected,
  isFirst,
  onSelect,
  onArchive,
  onToggleStar,
  onCreateEvent,
}: {
  message: Message;
  P: ReturnType<typeof palette>;
  selected: boolean;
  isFirst: boolean;
  onSelect: () => void;
  onArchive: () => void;
  onToggleStar: () => void;
  onCreateEvent?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const cfg = PLATFORM_CFG[m.platform];

  return (
    <div
      className="group flex items-center gap-0 cursor-pointer transition-colors duration-100"
      style={{
        background: selected ? P.rowSelected : hovered ? P.surfaceHover : "transparent",
        borderBottom: `1px solid ${P.divider}`,
        minHeight: "50px",
        paddingLeft: "16px",
        paddingRight: "16px",
      }}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Unread dot */}
      <div className="w-4 shrink-0 flex items-center justify-center">
        {m.unread && (
          <div className="w-[8px] h-[8px] rounded-full" style={{ background: P.accent }} />
        )}
      </div>

      {/* Platform icon (subtle) */}
      {m.platform !== "email" && (
        <div className="w-6 shrink-0 flex items-center justify-center mr-1.5">
          <cfg.icon size={15} style={{ color: cfg.color, opacity: 0.7 }} />
        </div>
      )}

      {/* Sender */}
      <div
        className="shrink-0 truncate"
        style={{
          width: "175px",
          fontSize: "15px",
          fontWeight: m.unread ? 600 : 400,
          color: m.unread ? P.text : P.textSecondary,
          paddingRight: "12px",
        }}
      >
        {m.from}
      </div>

      {/* Tag */}
      {m.tag && (
        <span
          className="shrink-0 px-[7px] py-[2px] rounded text-[11px] font-semibold mr-2"
          style={{
            background: `${m.tag.color}20`,
            color: m.tag.color,
            border: `1px solid ${m.tag.color}30`,
          }}
        >
          {m.tag.label}
        </span>
      )}

      {/* Subject + preview */}
      <div className="flex-1 min-w-0 flex items-center gap-2 truncate">
        <span
          className="truncate"
          style={{
            fontSize: "14.5px",
            fontWeight: m.unread ? 600 : 400,
            color: m.unread ? P.text : P.textSecondary,
          }}
        >
          {m.subject}
        </span>
        <span
          className="truncate flex-1"
          style={{
            fontSize: "14px",
            fontWeight: 300,
            color: P.muted,
          }}
        >
          {m.preview}
        </span>
      </div>

      {/* Hover actions OR thread count + date */}
      <div className="shrink-0 flex items-center gap-1 ml-3">
        {hovered ? (
          <div className="flex items-center gap-0.5">
            <button
              onClick={e => { e.stopPropagation(); onArchive(); }}
              className="w-8 h-8 rounded flex items-center justify-center transition-opacity"
              style={{ color: P.muted }}
              title="Done (E)"
            >
              <IconCheck size={17} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); }}
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ color: P.muted }}
              title="Remind me"
            >
              <IconClock size={17} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onToggleStar(); }}
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ color: m.starred ? P.gold : P.muted }}
              title="Star (S)"
            >
              <IconStar size={17} fill={m.starred ? P.gold : "none"} />
            </button>
          </div>
        ) : (
          <>
            {m.threadCount && m.threadCount > 1 && (
              <span
                className="w-6 h-6 rounded flex items-center justify-center mr-1"
                style={{ background: P.accentSoft, fontSize: "11px", fontWeight: 600, color: P.accent }}
              >
                {m.threadCount}
              </span>
            )}
            <span
              style={{
                fontSize: "13px",
                color: P.dim,
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
                minWidth: "50px",
                textAlign: "right",
              }}
            >
              {m.time}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Focus Reading View — full-screen immersive email experience ──────────────

function FocusReadingView({
  message: m, P, onBack, onArchive, onToggleStar, onCreateEvent, onIntroduce,
  replyOpen, onOpenReply, onCloseReply,
}: {
  message: Message;
  P: ReturnType<typeof palette>;
  onBack: () => void;
  onArchive: () => void;
  onToggleStar: () => void;
  onCreateEvent?: () => void;
  onIntroduce?: () => void;
  replyOpen: boolean;
  onOpenReply: () => void;
  onCloseReply: () => void;
}) {
  const cfg = PLATFORM_CFG[m.platform];
  const [replyText, setReplyText] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  const [readProgress, setReadProgress] = useState(0);

  // Reading progress indicator
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      setReadProgress(scrollHeight <= clientHeight ? 1 : scrollTop / (scrollHeight - clientHeight));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Keyboard: Escape to go back, R to reply
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "Escape") { onBack(); e.preventDefault(); }
      if (e.key === "r" || e.key === "R") { onOpenReply(); e.preventDefault(); }
      if (e.key === "e" || e.key === "E") { onArchive(); e.preventDefault(); }
      if (e.key === "s" || e.key === "S") { onToggleStar(); e.preventDefault(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onBack, onOpenReply, onArchive, onToggleStar]);

  return (
    <div className="flex flex-col h-full">
      {/* Reading progress bar — thin golden line at the top */}
      <div className="h-[2px] w-full shrink-0" style={{ background: P.divider }}>
        <motion.div
          className="h-full"
          style={{ background: `linear-gradient(90deg, ${P.gold}, hsla(38, 60%, 70%, 0.6))`, transformOrigin: "left" }}
          animate={{ scaleX: readProgress }}
          transition={{ duration: 0.15, ease: "linear" }}
        />
      </div>

      {/* Top bar — minimal: back, actions */}
      <div
        className="flex items-center justify-between px-6 h-[52px] shrink-0"
        style={{ borderBottom: `1px solid ${P.divider}` }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 transition-colors duration-200"
          style={{ color: P.muted, fontSize: "13px", fontFamily: FONT }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          <span className="tracking-wide uppercase" style={{ fontWeight: 500, letterSpacing: "0.1em" }}>Inbox</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleStar}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: m.starred ? P.gold : P.muted }}
            title="Star (S)"
          >
            <IconStar size={17} fill={m.starred ? P.gold : "none"} />
          </button>
          <button
            onClick={onArchive}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: P.muted }}
            title="Done (E)"
          >
            <IconArchive size={17} />
          </button>
          <button
            onClick={onOpenReply}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: P.accent }}
            title="Reply (R)"
          >
            <IconCornerUpLeft size={17} />
          </button>
        </div>
      </div>

      {/* Scrollable reading area */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-10">
          {/* Sender & metadata */}
          <motion.div
            className="mb-8"
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-4 mb-5">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${cfg.color}20, ${cfg.color}08)`,
                  border: `1px solid ${cfg.color}25`,
                }}
              >
                <span style={{ fontSize: "16px", fontWeight: 500, color: cfg.color }}>
                  {m.from.charAt(0)}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "16px", fontWeight: 500, color: P.text, fontFamily: FONT }}>
                    {m.from.split(",")[0]}
                  </span>
                  {m.platform !== "email" && (
                    <cfg.icon size={14} style={{ color: cfg.color, opacity: 0.7 }} />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {m.email && <span style={{ fontSize: "13px", color: P.muted }}>{m.email}</span>}
                  <span style={{ fontSize: "12px", color: P.dim }}>{m.time}</span>
                </div>
              </div>
            </div>

            {/* Tag */}
            {m.tag && (
              <span
                className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium mb-4"
                style={{
                  background: `${m.tag.color}15`,
                  color: m.tag.color,
                  border: `1px solid ${m.tag.color}25`,
                }}
              >
                {m.tag.label}
              </span>
            )}
          </motion.div>

          {/* Subject */}
          <motion.h2
            style={{
              fontFamily: SERIF,
              fontSize: "26px",
              fontWeight: 400,
              color: P.text,
              lineHeight: 1.35,
              letterSpacing: "-0.01em",
              marginBottom: "24px",
            }}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            {m.subject}
          </motion.h2>

          {/* Email body */}
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <p style={{
              fontSize: "16px",
              lineHeight: 1.85,
              color: P.textSecondary,
              fontWeight: 300,
              fontFamily: FONT,
            }}>
              {m.preview}
            </p>
          </motion.div>

          {/* Action hint */}
          {m.actionLabel && (
            <motion.div
              className="flex items-center gap-2.5 mt-8 px-4 py-3 rounded-xl"
              style={{
                background: P.accentSoft,
                border: `1px solid ${P.accent}18`,
              }}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <IconSparkles size={15} style={{ color: P.accent }} />
              <span style={{ fontSize: "14px", fontWeight: 500, color: P.accent }}>{m.actionLabel}</span>
            </motion.div>
          )}

          {/* Quick actions */}
          <motion.div
            className="flex items-center gap-3 mt-6"
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            {onCreateEvent && (
              <button
                onClick={onCreateEvent}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200"
                style={{ background: P.surface, border: `1px solid ${P.divider}`, color: P.textSecondary }}
              >
                <IconCalendarEvent size={14} /> Schedule
              </button>
            )}
            {onIntroduce && (
              <button
                onClick={onIntroduce}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200"
                style={{ background: P.surface, border: `1px solid ${P.divider}`, color: P.textSecondary }}
              >
                <IconUserPlus size={14} /> Introduce
              </button>
            )}
            <button
              onClick={onOpenReply}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200"
              style={{ background: P.accent, color: "white" }}
            >
              <IconCornerUpLeft size={14} /> Reply
            </button>
          </motion.div>

          {/* Contact info — subtle, at the end */}
          {(m.bio || m.location || m.socialLinks) && (
            <motion.div
              className="mt-12 pt-8"
              style={{ borderTop: `1px solid ${P.divider}` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <span
                className="tracking-[0.15em] uppercase mb-4 block"
                style={{ fontSize: "11px", color: P.dim, fontWeight: 500 }}
              >
                About {m.from.split(",")[0]}
              </span>
              {m.bio && (
                <p style={{ fontSize: "14px", lineHeight: 1.7, color: P.muted, fontWeight: 300, marginBottom: "12px" }}>
                  {m.bio}
                </p>
              )}
              {m.location && (
                <p style={{ fontSize: "13px", color: P.dim, marginBottom: "8px" }}>📍 {m.location}</p>
              )}
              {m.socialLinks && m.socialLinks.length > 0 && (
                <div className="flex items-center gap-4 mt-3">
                  {m.socialLinks.map((s, i) => (
                    <span key={i} style={{ fontSize: "13px", color: P.muted }}>
                      {s.type}: {s.handle}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Reply composer — slides up from bottom */}
      <AnimatePresence>
        {replyOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden shrink-0"
            style={{ borderTop: `1px solid ${P.divider}` }}
          >
            <div className="max-w-2xl mx-auto px-8 py-5">
              <div className="flex items-center gap-2 mb-3">
                <IconCornerUpLeft size={13} style={{ color: P.accent }} />
                <span style={{ fontSize: "12px", color: P.accent, fontWeight: 500 }}>
                  Reply to {m.from.split(",")[0]}
                </span>
                <button onClick={onCloseReply} className="ml-auto" style={{ color: P.dim }}>
                  <IconX size={13} />
                </button>
              </div>
              <textarea
                autoFocus
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Write your reply…"
                rows={4}
                className="w-full resize-none rounded-xl px-4 py-3 outline-none"
                style={{
                  background: P.surface,
                  border: `1px solid ${P.divider}`,
                  color: P.text,
                  fontSize: "15px",
                  fontFamily: FONT,
                  lineHeight: 1.7,
                }}
                onKeyDown={e => {
                  if (e.key === "Escape") { e.stopPropagation(); onCloseReply(); }
                }}
              />
              <div className="flex items-center justify-between mt-3">
                <span style={{ fontSize: "11px", color: P.dim }}>⌘ Enter to send · Esc to close</span>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                  style={{ background: P.accent, color: "white", fontSize: "13px", fontWeight: 500 }}
                >
                  <IconSend size={13} />
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Zero Inbox ──────────────────────────────────────────────────────────────

const QUOTES = [
  { text: "Clarity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "Simplicity is the final achievement.", author: "Frédéric Chopin" },
  { text: "The ability to simplify means to eliminate the unnecessary.", author: "Hans Hofmann" },
  { text: "In the midst of movement and chaos, keep stillness inside of you.", author: "Deepak Chopra" },
  { text: "Almost everything will work again if you unplug it for a few minutes — including you.", author: "Anne Lamott" },
];

function ZeroInboxView({ P }: { P: ReturnType<typeof palette> }) {
  const quote = useRef(QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  return (
    <div className="relative flex flex-col items-center justify-center h-full overflow-hidden">
      {/* Background landscape */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.08, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          src={zeroInboxReward}
          alt="Serene landscape — zero inbox achieved"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Golden glow overlay */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 50% 40%, hsla(38, 60%, 70%, 0.25) 0%, transparent 65%)",
          }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Breathing light rays */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, hsla(38, 50%, 85%, 0.12) 0%, transparent 40%, transparent 70%, hsla(38, 40%, 60%, 0.08) 100%)",
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Vignette */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 50%, hsla(0, 0%, 0%, 0.35) 100%)" }} />
      </motion.div>

      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-6 max-w-md text-center px-8"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Trophy with glow */}
        <motion.div
          className="relative"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(circle, hsla(38, 55%, 65%, 0.4) 0%, transparent 70%)", transform: "scale(4)" }}
            animate={{ scale: [4, 4.5, 4], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <div
            className="relative w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-sm"
            style={{
              background: "hsla(38, 50%, 70%, 0.2)",
              border: "1px solid hsla(38, 50%, 75%, 0.3)",
              boxShadow: "0 0 40px hsla(38, 55%, 65%, 0.25)",
            }}
          >
            <IconTrophy size={28} style={{ color: "hsla(38, 55%, 80%, 1)" }} strokeWidth={1.3} />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <h2 style={{
            fontFamily: SERIF,
            fontSize: "28px",
            fontWeight: 400,
            color: "hsla(0, 0%, 100%, 0.95)",
            marginBottom: "6px",
            textShadow: "0 2px 20px hsla(0, 0%, 0%, 0.3)",
            letterSpacing: "0.01em",
          }}>
            Zero Inbox
          </h2>
          <p style={{
            fontSize: "15px",
            lineHeight: 1.7,
            color: "hsla(0, 0%, 100%, 0.7)",
            fontWeight: 300,
            textShadow: "0 1px 10px hsla(0, 0%, 0%, 0.3)",
          }}>
            Every message handled. Every thread resolved.
          </p>
        </motion.div>

        {/* All channels clear badge */}
        <motion.div
          className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md"
          style={{
            background: "hsla(152, 50%, 50%, 0.15)",
            border: "1px solid hsla(152, 50%, 60%, 0.25)",
          }}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <IconCircleCheck size={14} style={{ color: "hsla(152, 55%, 65%, 1)" }} />
          <span style={{ fontSize: "12px", color: "hsla(152, 55%, 70%, 1)", fontWeight: 500 }}>All channels clear</span>
        </motion.div>

        {/* Inspirational quote */}
        <motion.div
          className="mt-2"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          <p style={{
            fontSize: "14px",
            fontStyle: "italic",
            color: "hsla(0, 0%, 100%, 0.6)",
            fontWeight: 300,
            lineHeight: 1.7,
            textShadow: "0 1px 8px hsla(0, 0%, 0%, 0.2)",
          }}>
            "{quote.current.text}"
          </p>
          <p style={{
            fontSize: "11px",
            color: "hsla(38, 40%, 75%, 0.7)",
            marginTop: "6px",
            fontWeight: 400,
            letterSpacing: "0.05em",
          }}>
            — {quote.current.author}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}