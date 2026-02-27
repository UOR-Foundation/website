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
  IconLink,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";

import zeroInboxReward from "@/assets/zero-inbox-reward.jpg";
import MessengerCalendar, { type CalendarEvent } from "./messenger/MessengerCalendar";
import MessengerAIPanel from "./messenger/MessengerAIPanel";
import MessengerIntroductions from "./messenger/MessengerIntroductions";
import MessengerScheduling, { type MeetingType, type Booking } from "./messenger/MessengerScheduling";

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
type MessengerView = "inbox" | "calendar" | "ai" | "introductions" | "scheduling";

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
  { id: "1", from: "Elena Vasquez", email: "elena@arcanecapital.com", location: "San Francisco", bio: "Early stage VC focused on infrastructure and developer tools", subject: "We'd like to lead the Hologram round — can we talk terms?", preview: "I showed the Hologram constant-time proof demo to our Monday partners meeting. Three partners stopped checking their phones simultaneously, which in VC years is basically a standing ovation. The idea that you can collapse GPU-bound workloads into O(1) lookups on commodity hardware — our infra thesis has been waiting for exactly this. We'd like to lead. Let's discuss terms before Sequoia figures out what you're doing.", platform: "email", phase: "work", priority: "urgent", time: "FEB 27", unread: true, starred: true, actionable: true, actionLabel: "Reply by EOD", tag: { label: "investment", color: "hsl(265, 55%, 60%)" }, socialLinks: [{ type: "LinkedIn", handle: "elena-vasquez" }, { type: "Twitter", handle: "@elenavc" }], recentThreads: ["Diligence list", "Cap table review", "Re: Hologram benchmarks"] },
  { id: "2", from: "Priya Nair", subject: "Hologram LUT engine just passed the 512-op stress test 🎉", preview: "Believe it or not, the LUT engine maintained flat O(1) throughput across every difficulty level — 512 operations on 20M-element arrays. The sequential baseline took 47 seconds. Ours took 0.003. I've run it eleven times because I keep thinking the benchmark is broken. It is not broken.", platform: "email", phase: "work", priority: "normal", time: "FEB 27", unread: true, starred: false, actionable: false, threadCount: 5 },
  { id: "3", from: "Marcus Holt", email: "marcus@privacylab.org", subject: "Hologram's encrypted memory layer — privacy implications", preview: "I've been reviewing Section 3 of your encrypted content-addressed memory spec. The fact that memory fragments are sealed with SHA-256 before storage and can only be rehydrated by the originating agent — that's not just privacy-preserving, it's privacy-by-construction. Our EU team wants to write this up as a reference architecture. Can you tighten the language around cross-border data residency?", platform: "signal", phase: "work", priority: "normal", time: "FEB 26", unread: true, starred: false, actionable: true, actionLabel: "Review draft" },
  { id: "4", from: "Alex Mercer", subject: "Hologram API hit 10k requests/min — and didn't flinch", preview: "Just ran the load test against the UOR kernel. At 10k requests per minute, the verify and proof endpoints returned in under 3ms. No degradation. No cache tricks. This is what constant-time computation looks like when you're not faking it. We need to update our landing page benchmarks because the current ones undersell us.", platform: "telegram", phase: "work", priority: "urgent", time: "FEB 26", unread: true, starred: false, actionable: true, actionLabel: "Update benchmarks" },
  { id: "5", from: "Dani Okafor", subject: "The Hologram mark is done and I'm unreasonably proud of it", preview: "After 47 iterations (yes I counted), the hologram logomark finally captures the projection concept — one object, many viewing angles, same identity. It works at 16px, it works on dark backgrounds, and it doesn't look like a cryptocurrency. The prismatic refraction is subtle enough that designers will notice and everyone else will just think 'that looks trustworthy.'", platform: "email", phase: "work", priority: "normal", time: "FEB 26", unread: true, starred: true, actionable: false },
  { id: "6", from: "Conrad, Bhavesh", subject: "Q1 OKRs — Hologram adoption metrics before board review", preview: "Team, the board meets Monday. Key metrics: 340 API integrations, 12 enterprise pilots, O(1) proof verified by 3 independent labs. Our 'replace GPUs with math' pitch is landing. If you have concerns about the virtual compute positioning, now is literally the time.", platform: "email", phase: "work", priority: "normal", time: "FEB 25", unread: false, starred: false, actionable: false, threadCount: 3 },
  { id: "7", from: "Angelo Wong", subject: "Client wants on-device inference without GPUs — is Hologram real?", preview: "A Fortune 100 client wants to run a recommendation engine offline, on-device, training on less than 1MB of data. Before I saw the Hologram demo I would have said impossible. After seeing computation collapse into constant-time lookups on a $200 laptop, I'm saying 'when can we start?' Their budget is very real. Let's scope this.", platform: "linkedin", phase: "work", priority: "urgent", time: "FEB 25", unread: false, starred: false, actionable: true, actionLabel: "Review scope", tag: { label: "enterprise", color: "hsl(28, 70%, 55%)" } },
  { id: "8", from: "Suki Tanaka", subject: "User interviews: everyone skips to the Constant-Time Proof demo", preview: "Talked to 12 developers this week. Nobody reads the documentation first. Every single one goes straight to the live benchmark, watches O(1) stay flat while O(N) climbs, and then says 'wait, what?' That moment of disbelief IS our onboarding. We should make the demo the landing page.", platform: "email", phase: "work", priority: "normal", time: "FEB 25", unread: false, starred: false, actionable: false },
  { id: "9", from: "Naveed Ansari", subject: "The staging server is serving stale hologram projections", preview: "I'm not exaggerating. The WebFinger endpoint returns yesterday's projections even after a fresh deploy. I've checked the cache, the CDN, the content-addressing pipeline. The SHA-256 hashes are correct but the gateway CIDs are stale. The system is mathematically right but operationally haunted.", platform: "discord", phase: "work", priority: "normal", time: "FEB 24", unread: false, starred: false, actionable: false },
  { id: "10", from: "Rachel Kim", subject: "Advisory board contracts — Hologram technical council", preview: "Legal finalized the advisor agreements for the Hologram Technical Council. Standard 0.25% vesting over 2 years. We've got interest from two Fields medalists and a Turing Award winner. Apparently 'content-addressed identity derived from prime factorization' is catnip for mathematicians.", platform: "email", phase: "work", priority: "normal", time: "FEB 24", unread: false, starred: false, actionable: true, actionLabel: "Sign contract" },
  { id: "11", from: "Dev Team", subject: "Postmortem: the 47-minute outage was actually a proof of resilience", preview: "Root cause: a database migration ran during peak hours. But here's the good news — the Hologram kernel continued producing valid proofs throughout the outage because it's stateless. Receipts were queued and replayed perfectly. The system literally healed itself. New rule: all migrations at 3am UTC anyway.", platform: "email", phase: "work", priority: "normal", time: "FEB 23", unread: false, starred: false, actionable: false },
  { id: "12", from: "Liam O'Brien", subject: "Pitch deck feedback — 'replaces GPUs' needs more proof, less poetry", preview: "The deck is tight but slide 7 tries to explain UOR, content-addressing, constant-time computation, AND the holographic projection model in one diagram. That's four PhD theses in one slide. Split it. Also, when you say 'we make hardware irrelevant,' VCs who own GPU companies get nervous. Say 'we make hardware optional.'", platform: "email", phase: "work", priority: "normal", time: "FEB 23", unread: false, starred: false, actionable: false },
  { id: "13", from: "Fatima Al-Rashid", subject: "National Digital Heritage Coalition wants Hologram for 4M artifacts", preview: "200+ museums want to use Hologram's content-addressing to create permanent, verifiable digital identities for their collections. One SHA-256 per artifact, projected into DID, IPFS, and IIIF simultaneously. They want a pilot by April. This is the kind of use case that makes the 'one hash, every standard' pitch tangible.", platform: "email", phase: "work", priority: "normal", time: "FEB 22", unread: false, starred: true, actionable: true, actionLabel: "Schedule call", tag: { label: "partnership", color: "hsl(265, 55%, 60%)" } },
  { id: "14", from: "Oscar Reyes", subject: "I automated the Hologram benchmark report — you're welcome", preview: "You know that weekly performance report you manually pull from 3 dashboards? I wrote a script that queries the UOR kernel, generates the O(1) vs O(N) comparison chart, and emails it every Monday at 8am. It takes 11 seconds. The holographic proof of compute efficiency, delivered automatically.", platform: "telegram", phase: "work", priority: "low", time: "FEB 22", unread: false, starred: true, actionable: false },
  { id: "15", from: "Clara Dubois", subject: "Brand guidelines v3 — now with 'holographic' as an actual design principle", preview: "Previous versions treated 'holographic' as a color gradient. This one defines it properly: one identity, multiple projections, each complete. It's a design system that mirrors the architecture. 42 pages. Every projection of the brand guide contains the whole brand guide. I regret nothing.", platform: "email", phase: "work", priority: "low", time: "FEB 21", unread: false, starred: false, actionable: false },
  { id: "16", from: "James Park", subject: "Developer onboarding: 68% drop off before they see the proof", preview: "Current flow makes people read documentation before they see the magic. That's backwards. The constant-time demo should be the FIRST thing. Show them computation collapsing into a single lookup, let the 'wait, how?' moment hit, THEN explain the math. I have three proposals ranging from 'quick fix' to 'rebuild the entire developer portal.'", platform: "email", phase: "work", priority: "urgent", time: "FEB 21", unread: false, starred: false, actionable: true, actionLabel: "Book meeting" },
  { id: "17", from: "Zara Okonkwo", subject: "GPU cloud vendor comparison: who's actually worried about Hologram?", preview: "I contacted 8 GPU cloud vendors pretending to be a customer evaluating alternatives. Three of them mentioned Hologram unprompted. One said 'that's vaporware.' Another said 'if it works as claimed, we're all in trouble.' The third asked if I knew anyone hiring there. Spreadsheet attached.", platform: "email", phase: "work", priority: "normal", time: "FEB 20", unread: false, starred: false, actionable: false },
  { id: "18", from: "Robin Schulz", subject: "The intern built a Hologram lens in 3 days", preview: "Remember the intern we almost didn't hire? She built a complete Prompt Injection Shield lens — 7 stages, content-addressed quarantine, epistemic grading — in 3 days. Our senior team estimated 2 sprints. She said the LensBlueprint API was 'weirdly intuitive.' We should probably promote her.", platform: "email", phase: "work", priority: "low", time: "FEB 19", unread: false, starred: true, actionable: false },
  { id: "19", from: "Accounting", subject: "Expense report reminder — GPU rental receipts need context", preview: "You have 14 unreported expenses totaling $2,847. Three are labeled 'GPU benchmarking for Hologram comparison.' Please clarify: are these the GPUs we're trying to make obsolete? The irony is noted but accounting still needs receipts.", platform: "email", phase: "work", priority: "low", time: "FEB 18", unread: false, starred: false, actionable: true, actionLabel: "Submit expenses" },
  { id: "20", from: "Vera Sokolova", subject: "Competitor raised $40M for 'AI-native compute' — it's a chatbot wrapper", preview: "Our main competitor announced their Series B this morning. Their pitch: 'AI-native infrastructure.' Their product: GPU rental with a chatbot wrapper. They have $40M and no content-addressing, no constant-time proofs, no holographic projections. They have marketing. We have math. Time to discuss positioning.", platform: "email", phase: "work", priority: "normal", time: "FEB 17", unread: false, starred: false, actionable: false },
  { id: "21", from: "Tomás Herrera", subject: "Switching to Hologram Compute saved us $12k/month 🎉", preview: "The migration from GPU clusters to Hologram's virtual compute layer is complete. Same workloads, 34% lower cost, and the inference latency is actually better because O(1) doesn't care about batch size. Also I slept 9 hours last night for the first time in weeks. Causation? Maybe.", platform: "email", phase: "work", priority: "low", time: "FEB 16", unread: false, starred: false, actionable: false },
  { id: "22", from: "Amara Chen", subject: "Fortune 500 CTO: 'Hologram is the most important infra since containers'", preview: "I'm framing this. Direct quote from a review: 'Hologram does for computation what containers did for deployment — makes the underlying hardware irrelevant.' Screenshot attached. We should put this on every surface that accepts text.", platform: "email", phase: "work", priority: "low", time: "FEB 15", unread: false, starred: true, actionable: false },
  { id: "23", from: "Board Notifications", subject: "Board deck due in 5 days — Hologram metrics section", preview: "Quarterly board meeting is March 4th. The narrative: Hologram is on route to become the virtual infrastructure for interpretable, energy-efficient, and scalable AI. Finance needs actuals. Product needs the roadmap. Please don't include another 50-slide appendix about prime factorization.", platform: "email", phase: "work", priority: "normal", time: "FEB 14", unread: false, starred: false, actionable: true, actionLabel: "Prepare deck" },

  // ── LEARN (23) ─────────────────────────────────────────────────────────
  { id: "24", from: "Prof. Chen Wei", email: "chen.wei@mit.edu", location: "Cambridge, MA", bio: "MIT CSAIL — Algebraic Foundations of Computing", subject: "Your constant-time proof paper — reviewer 3 wants more rigor (naturally)", preview: "Two reviewers loved the Hologram paper. Reviewer 3 wants you to 'more rigorously define what you mean by O(1) in the context of pre-computed lookup tables.' This is the same reviewer who once asked Terence Tao to define addition. Resubmission deadline is March 15. I believe in you more than Reviewer 3 does.", platform: "email", phase: "learn", priority: "urgent", time: "FEB 27", unread: true, starred: true, actionable: true, actionLabel: "Read & respond" },
  { id: "25", from: "Arxiv Digest", subject: "7 papers that accidentally validate the Hologram thesis", preview: "This week's picks include a paper from DeepMind connecting algebraic topology to transformer attention — which is basically what Hologram's lens architecture already does. Also: someone proved that GPU memory bandwidth is the actual bottleneck in 80% of inference workloads. We've been saying this for a year.", platform: "email", phase: "learn", priority: "normal", time: "FEB 27", unread: true, starred: false, actionable: false },
  { id: "26", from: "Prof. Anya Petrova", email: "anya@eth.ch", location: "Zürich", bio: "ETH Zürich — Information Geometry & Algebraic Topology", subject: "Your holographic projection math — I found a beautiful generalization", preview: "I've been studying the Hologram projection registry. The insight that every standard is a viewing angle of the same SHA-256 identity — this is a concrete realization of the Whitney embedding theorem. There's a group in Kyoto doing related work on information geometry that basically proves your architecture is optimal. I'm losing sleep. Paper link inside.", platform: "email", phase: "learn", priority: "normal", time: "FEB 26", unread: true, starred: true, actionable: false },
  { id: "27", from: "Coursera", subject: "You're 73% through 'Computational Neuroscience' — relevant to Hologram memory?", preview: "You left off at Week 6: Neural Coding. The next module covers how biological memory systems use content-addressing — which is exactly what Hologram's encrypted memory chain does, except your version has SHA-256 receipts and the brain doesn't. Estimated time to finish: 4 hours.", platform: "email", phase: "learn", priority: "low", time: "FEB 26", unread: false, starred: false, actionable: false },
  { id: "28", from: "Prof. Sebastian Thrun", email: "thrun@stanford.edu", location: "Stanford", bio: "Stanford AI Lab — Robotics & Probabilistic Inference", subject: "Re: Can Hologram's symbolic AI replace neural SLAM?", preview: "Great question. The key insight most people miss is that SLAM isn't about mapping — it's about reducing uncertainty. If Hologram can produce verifiable proofs with epistemic grades (your A/B/C system), then you're not doing SLAM — you're doing something better. You're eliminating uncertainty algebraically instead of probabilistically. I wrote a note explaining why this matters for robotics.", platform: "email", phase: "learn", priority: "normal", time: "FEB 25", unread: false, starred: true, actionable: false },
  { id: "29", from: "Library Hold", subject: "Your hold on 'Gödel, Escher, Bach' is ready (third time this year)", preview: "The book you requested is available for pickup. This is your third checkout this year. We respect the commitment. Also, the librarian wants to know if the 'strange loop' concept is related to that 'holographic identity' thing you keep muttering about in the reading room.", platform: "email", phase: "learn", priority: "low", time: "FEB 25", unread: false, starred: false, actionable: false },
  { id: "30", from: "Dr. Miriam Osei", email: "mosei@oxford.ac.uk", location: "Oxford", bio: "Oxford — Cognitive Architectures & Embodied AI", subject: "Hologram's memory is closer to biological cognition than any neural net", preview: "I watched your talk on content-addressed memory chains. The idea that memories are sealed, content-addressed fragments that can be 'dehydrated' to bytes and 'rehydrated' to live state — that's closer to how biological memory reconsolidation works than anything I've seen in ML. I've spent 48 hours reorganizing my thesis. My advisor is either thrilled or terrified.", platform: "telegram", phase: "learn", priority: "normal", time: "FEB 24", unread: false, starred: false, actionable: false },
  { id: "31", from: "Khan Academy", subject: "New course: The Mathematics of Symmetry — relevant to UOR?", preview: "Why do prime factorizations feel fundamental? Why does content-addressing work? This course explores the deep connections between number theory, group symmetry, and what mathematicians call 'canonical representations.' Sounds like someone we know built an entire compute platform on this.", platform: "email", phase: "learn", priority: "low", time: "FEB 24", unread: false, starred: false, actionable: false },
  { id: "32", from: "Prof. Yuki Tanaka", email: "tanaka@u-tokyo.ac.jp", location: "Tokyo", bio: "University of Tokyo — Category Theory & Formal Verification", subject: "Hologram's lens composition is a free monad — did you know?", preview: "I've been analyzing your LensBlueprint architecture. The composeBlueprints function that chains Shield → Memory? That's a free monad in disguise. Which means your entire lens pipeline has a formal proof of correctness hiding inside it. Come prepared to have your intuitions validated. Also: I brought sake.", platform: "discord", phase: "learn", priority: "normal", time: "FEB 23", unread: false, starred: false, actionable: false },
  { id: "33", from: "Nature Briefing", subject: "Slime mold solves optimization — Hologram does it faster", preview: "Researchers connected slime mold to a railway map and it recreated the Tokyo rail network efficiently. Evolution has been doing compute for millennia. But evolution takes generations. Hologram collapses it to one lookup. Still, the slime mold doesn't need electricity, so maybe it's a draw.", platform: "email", phase: "learn", priority: "low", time: "FEB 23", unread: false, starred: false, actionable: false },
  { id: "34", from: "Raj Patel", subject: "I finally understand Hologram's architecture and I'm furious it took so long", preview: "It took me 3 weeks, 20 re-reads of the whitepaper, and a whiteboard session with someone who thinks in category theory. A Hologram projection is just a functor from canonical identity to protocol-specific encoding. Once you see it, you can't unsee it. Let me explain over coffee before I forget.", platform: "telegram", phase: "learn", priority: "low", time: "FEB 22", unread: false, starred: true, actionable: false },
  { id: "35", from: "MIT OpenCourseWare", subject: "New lecture: Verifiable Computation — basically what Hologram does", preview: "Lecture 12 covers cryptographic receipts, proof-carrying code, and zero-knowledge verification. The professor keeps saying 'imagine if you could verify a computation without re-running it.' Someone in the comments linked to Hologram's API. The professor has not responded, which is either silence or awe.", platform: "email", phase: "learn", priority: "low", time: "FEB 22", unread: false, starred: false, actionable: false },
  { id: "36", from: "Prof. Helena Voss", email: "voss@mpg.de", location: "Berlin", bio: "Max Planck Institute — Topological Data Analysis", subject: "The holographic projection paper has a gap on page 7 — but it's fixable", preview: "I hate to be that person but your proof of Lemma 3.2 assumes compactness of the projection space without establishing it. The result still holds — I checked with three different approaches — but the argument needs tightening. The good news: fixing this actually strengthens the 'one hash, every standard' claim. Whiteboard session this week?", platform: "email", phase: "learn", priority: "normal", time: "FEB 21", unread: false, starred: false, actionable: true, actionLabel: "Schedule discussion" },
  { id: "37", from: "Feynman Bot", subject: "Daily Feynman: 'You must not fool yourself' — Hologram doesn't", preview: "'The first principle is that you must not fool yourself — and you are the easiest person to fool.' Today's context: how the Hologram team avoids fooling themselves by requiring cryptographic receipts for every computation. If you can't verify it, you don't claim it.", platform: "email", phase: "learn", priority: "low", time: "FEB 21", unread: false, starred: false, actionable: false },
  { id: "38", from: "Prof. Kwame Asante", email: "asante@princeton.edu", location: "Princeton", bio: "Princeton — Philosophy of Mathematics & Computation", subject: "Is Hologram's symbolic AI actually more interpretable than neural nets?", preview: "Your system produces epistemic grades (A = algebraically proven, B = empirically verified) for every output. Neural nets produce floating-point numbers and hope. I've been thinking about this for two weeks. If every AI output carried a verifiable proof of its reasoning chain, the alignment problem looks very different. Long email incoming.", platform: "email", phase: "learn", priority: "normal", time: "FEB 20", unread: false, starred: true, actionable: false },
  { id: "39", from: "Santa Fe Institute", subject: "Complexity Explorer: Agent-based modeling meets content-addressed identity", preview: "Model flocking birds, traffic jams, and market crashes — all with the same mathematical framework. If every agent had a Hologram-style canonical identity, you could verify the simulation without re-running it. New course starts March 10. No prerequisites except curiosity.", platform: "email", phase: "learn", priority: "low", time: "FEB 19", unread: false, starred: false, actionable: false },
  { id: "40", from: "Reading Group", subject: "March pick: Kuhn — is Hologram a paradigm shift?", preview: "We'll discuss paradigm shifts, normal science, and whether replacing GPUs with algebraic lookup tables counts as 'revolutionary' or 'so obvious in hindsight that it's embarrassing nobody did it sooner.' Both positions will be defended vigorously. Snacks provided.", platform: "discord", phase: "learn", priority: "low", time: "FEB 18", unread: false, starred: false, actionable: false },
  { id: "41", from: "Wolfram Research", subject: "Your Hologram architecture resembles a new kind of cellular automaton", preview: "Rule 110 was Turing-complete. Your LUT engine does something arguably stranger: it collapses Turing-complete operations into constant-time lookups. Stephen saw the demo and said 'that's either brilliant or wrong.' We're pretty sure it's not wrong. Interactive comparison inside.", platform: "email", phase: "learn", priority: "low", time: "FEB 17", unread: false, starred: false, actionable: false },
  { id: "42", from: "Prof. David Kim", email: "dkim@caltech.edu", location: "Pasadena", bio: "Caltech — Quantum Information & Cryptographic Proofs", subject: "Re: Are Hologram receipts quantum-resistant?", preview: "Short answer: yes, because SHA-256 receipts are hash-based, not factoring-based. Long answer: your content-addressing scheme is naturally post-quantum because it relies on the same one-way function that secures Bitcoin. The real question is whether your epistemic grading system can extend to quantum computations. I think it can. Paper draft attached.", platform: "email", phase: "learn", priority: "normal", time: "FEB 16", unread: false, starred: true, actionable: false },
  { id: "43", from: "Astro Photo Club", subject: "Jupiter at opposition — many angles, one truth 🔭", preview: "Jupiter is the brightest it'll be all year. Bring binoculars — you can see Io, Europa, Ganymede, and Callisto as tiny dots. Each moon is a different 'projection' of the same gravitational system. Someone on the roof will inevitably make a Hologram analogy. It will be tolerated.", platform: "discord", phase: "learn", priority: "normal", time: "FEB 15", unread: false, starred: false, actionable: false },
  { id: "44", from: "Prof. Maria Santos", email: "santos@eth.ch", location: "Zürich", bio: "ETH Zürich — Energy-Efficient Computing", subject: "Hologram's energy numbers are almost too good — can I audit?", preview: "Your claim that Hologram reduces compute energy consumption by 90% versus GPU inference — I want to believe it. The theory checks out (O(1) lookups consume constant energy regardless of model size). But I need to see the methodology before I cite it in my EU grant proposal. Can I visit and audit the benchmarks?", platform: "whatsapp", phase: "learn", priority: "normal", time: "FEB 14", unread: false, starred: false, actionable: false },
  { id: "45", from: "History of Computing", subject: "Ada Lovelace predicted Hologram in 1843 — sort of", preview: "Everyone knows she wrote the first algorithm. Fewer know she described a system where 'the engine might compose elaborate and scientific pieces of music of any degree of complexity.' A computation machine that produces verifiable, composable outputs? That's Hologram. She was 180 years early.", platform: "email", phase: "learn", priority: "low", time: "FEB 13", unread: false, starred: false, actionable: false },
  { id: "46", from: "Open Research", subject: "67% of ML papers fail to replicate — Hologram fixes this", preview: "A team tried to reproduce 100 top ML papers. 43 didn't work at all. The problem: no verifiable proofs of computation. Hologram's approach — where every inference carries a cryptographic receipt — would make irreproducible AI literally impossible. Someone should write a paper about this.", platform: "email", phase: "learn", priority: "normal", time: "FEB 12", unread: false, starred: false, actionable: false },

  // ── PLAY (23) ──────────────────────────────────────────────────────────
  { id: "47", from: "Lena Park", subject: "Surfing Saturday? 🏄 Swells are perfectly consistent", preview: "4-6ft faces, offshore winds, 62°F water. I'm bringing the longboard. If you don't come I'll send you photos from the lineup. Also, waves are the original constant-time system — same energy, different projections. I'll stop making Hologram analogies when you stop working weekends.", platform: "whatsapp", phase: "play", priority: "normal", time: "FEB 27", unread: true, starred: true, actionable: false },
  { id: "48", from: "Marc Andreessen", email: "marc@a16z.com", subject: "Dinner Thursday? Want to hear the Hologram pitch in person", preview: "I've been following the Hologram benchmarks. The claim that you can make GPUs optional by collapsing computation into lookup tables — either you're the most important infrastructure company since AWS, or you're very good at benchmarks. I'd like to figure out which over steak. Thursday at Nobu? Bring the constant-time demo on a laptop.", platform: "email", phase: "play", priority: "normal", time: "FEB 27", unread: true, starred: false, actionable: false },
  { id: "49", from: "Diego Morales", subject: "I explained Hologram to my pasta-making class 🍝", preview: "Fresh pasta is like Hologram: you compress complex ingredients into a simple canonical form (the dough), then project it into infinite shapes (fettuccine, ravioli, tortellini). Same dough, different projections. My instructor said 'that's the first time anyone has compared tagliatelle to SHA-256.' Come over Sunday. Bring wine and your whitepaper.", platform: "telegram", phase: "play", priority: "low", time: "FEB 26", unread: true, starred: false, actionable: false },
  { id: "50", from: "Running Club", subject: "Train like Hologram — constant effort, no degradation 🏃", preview: "12-week plan. The goal: maintain the same pace regardless of distance, like an O(1) lookup that doesn't care about input size. Realistically, you'll slow down. Hologram wouldn't. But we're made of meat, not math, so pace groups from 8:00/mi to 12:00/mi. Nobody gets left behind.", platform: "discord", phase: "play", priority: "normal", time: "FEB 26", unread: false, starred: false, actionable: false },
  { id: "51", from: "Vinod Khosla", email: "vinod@khoslaventures.com", subject: "Re: That Hologram demo at the climate tech summit", preview: "I cornered your CTO at the mixer and made him run the constant-time proof on my phone. On my PHONE. A computation that takes 47 seconds on a GPU cluster, completed in 3 milliseconds on a phone with 2 bars of signal. If this scales to climate modeling, we need to talk. My office, this week?", platform: "whatsapp", phase: "play", priority: "low", time: "FEB 25", unread: false, starred: true, actionable: false },
  { id: "52", from: "Film Society", subject: "'2001: A Space Odyssey' on 70mm — HAL needed Hologram", preview: "If HAL 9000 had used Hologram's interpretable symbolic AI instead of opaque neural nets, he could have explained WHY he wouldn't open the pod bay doors. Verifiable proofs of reasoning > inscrutable neural activations. Also: the Stargate sequence on actual film is a religious experience. 47 seats.", platform: "email", phase: "play", priority: "normal", time: "FEB 25", unread: false, starred: false, actionable: false },
  { id: "53", from: "Sam & Jules", subject: "Game night: bring a game as complex as Hologram's architecture", preview: "The rule: everyone brings a game with the most confusing rulebook they can find. Last time someone brought a German farming simulator from 1997 where the rules formed a directed acyclic graph. Saturday 7pm. BYOB. If anyone brings a game involving 'content-addressed identity,' they're buying pizza.", platform: "telegram", phase: "play", priority: "low", time: "FEB 24", unread: false, starred: false, actionable: false },
  { id: "54", from: "Trail Runners", subject: "11 miles through redwoods — nature's content-addressed system 🌲", preview: "Moderate elevation, mostly shaded, ends at a swimming hole nobody knows about. Fun fact: every redwood's DNA is a canonical representation projected into bark, needles, and cones. One genome, many viewing angles. I'll stop. The trail is beautiful. Zero cell service. Zero Slack notifications.", platform: "whatsapp", phase: "play", priority: "low", time: "FEB 24", unread: false, starred: true, actionable: false },
  { id: "55", from: "Reid Hoffman", email: "reid@greylock.com", subject: "Hologram + professional identity — let's brainstorm", preview: "Every professional identity is stored in 47 different databases with 47 different schemas. Hologram's 'one hash, every standard' approach could give every person a single canonical professional identity that projects into LinkedIn, ORCID, GitHub, and everywhere else. Coffee next week? I promise not to make you update your LinkedIn.", platform: "email", phase: "play", priority: "low", time: "FEB 23", unread: false, starred: false, actionable: false },
  { id: "56", from: "Vinyl Swap", subject: "Kind of Blue — like Hologram, it's all about the canonical source", preview: "1959 Columbia six-eye mono pressing. The analog master tape is the canonical identity; every subsequent pressing is a projection. Kind of Blue is the SHA-256 of jazz — everything else derives from it. They want $400. I'd buy it but I already own two copies. (Don't judge me.)", platform: "discord", phase: "play", priority: "low", time: "FEB 23", unread: false, starred: false, actionable: false },
  { id: "57", from: "Peter Thiel", email: "peter@foundersfund.com", subject: "Hologram is a zero-to-one company — that's analysis, not flattery", preview: "Most 'AI infrastructure' startups are building slightly better GPUs. You're making GPUs irrelevant. That's the difference between a 1-to-N company and a 0-to-1 company. The constant-time proof is either the most important demo in computing since the Turing machine, or I don't understand math. Let's discuss over chess.", platform: "email", phase: "play", priority: "normal", time: "FEB 22", unread: false, starred: false, actionable: false },
  { id: "58", from: "Leo Nakamura", subject: "I beat you at chess — like Hologram beats O(N), inevitably ♟️", preview: "Checked our async game. You left your queen hanging on move 23. I almost didn't take it out of respect. Almost. Your move. Also, I timed both our moves — mine averaged 3 seconds (constant), yours got exponentially slower. You're O(N). I'm Hologram.", platform: "telegram", phase: "play", priority: "low", time: "FEB 22", unread: false, starred: false, actionable: false },
  { id: "59", from: "Sketch Club", subject: "Urban sketching: one scene, many perspectives — holographic art", preview: "Sunday 10am. Everyone draws the same building from different angles. One subject, multiple projections. The holographic principle, but with charcoal. Last time someone did the whole thing with a stick found on the ground and it was genuinely beautiful. Judgment-free zone.", platform: "discord", phase: "play", priority: "low", time: "FEB 21", unread: false, starred: false, actionable: false },
  { id: "60", from: "Satya Nadella", email: "satya@microsoft.com", subject: "Re: Hologram on Azure — our infra team is hyperventilating", preview: "Your proposal to run Hologram's virtual compute layer on Azure without dedicated GPUs — our cloud cost team ran the numbers and started hyperventilating. If enterprises get GPU-class inference on CPU-tier pricing, the margin implications are... significant. Let's get technical teams together. Also, my CTO wants to know if O(1) works on ARM.", platform: "whatsapp", phase: "play", priority: "normal", time: "FEB 20", unread: false, starred: false, actionable: false },
  { id: "61", from: "Mountain Bikers", subject: "Gravity: the original O(1) operation 🚵", preview: "New jump line is open. Bigger tabletops, a hip jump, and a drop called 'the negotiator' because you negotiate with your survival instincts before hitting it. Gravity: same force regardless of how scared you are. Constant-time terror. See you Saturday.", platform: "discord", phase: "play", priority: "low", time: "FEB 19", unread: false, starred: false, actionable: false },
  { id: "62", from: "Kira Johansson", subject: "I found a place with zero SHA-256 hashes — just flowers 🌹", preview: "There's a gate behind the old library on 4th Street. It leads to a courtyard with a fountain, climbing roses, and three benches. No WiFi. No canonical identities. Just silence and flowers. It felt like falling into a Miyazaki film. Meet me there Thursday. Leave your laptop.", platform: "whatsapp", phase: "play", priority: "low", time: "FEB 18", unread: false, starred: true, actionable: false },
  { id: "63", from: "Comedy Night", subject: "Open mic: 5 minutes on explaining Hologram to my grandmother", preview: "She asked what I do. I said 'content-addressed holographic computation.' She said: 'So you make holograms? Like Princess Leia?' I said 'Sort of, but with math.' She said 'That sounds worse.' The punchline involves her calling during a production outage. Come heckle me supportively.", platform: "email", phase: "play", priority: "low", time: "FEB 17", unread: false, starred: false, actionable: false },
  { id: "64", from: "Plant Society", subject: "Propagation swap — cloning is just biological content-addressing 🌱", preview: "My monstera has 14 aerial roots. Every cutting carries the same DNA — one canonical genome, many projections into individual plants. I'm bringing 6 cuttings. Someone last month brought variegated string of hearts and I'm still emotionally processing it.", platform: "discord", phase: "play", priority: "low", time: "FEB 16", unread: false, starred: false, actionable: false },
  { id: "65", from: "Marco Bianchi", subject: "Espresso dialed in — constant parameters, reproducible output ☕", preview: "18g in, 36g out, 28 seconds. The crema is tiger-striped. I've achieved what the Italians call 'God shot' and what Hologram calls 'Grade A: algebraically proven.' Come taste it before I bump the grinder and lose it forever.", platform: "telegram", phase: "play", priority: "low", time: "FEB 15", unread: false, starred: false, actionable: false },
  { id: "66", from: "Jensen Huang", email: "jensen@nvidia.com", subject: "OK fine — tell me about this 'GPUs are optional' thing", preview: "Someone on my board showed me the Hologram demo at dinner. I watched a CPU do in 3 milliseconds what our H100 does in 47 seconds. I spilled my wine. I don't spill wine. I need to understand: is this a threat to NVIDIA or the biggest opportunity we've ever seen? Genuine question. Dinner?", platform: "whatsapp", phase: "play", priority: "low", time: "FEB 14", unread: false, starred: false, actionable: false },
  { id: "67", from: "Escape Room Gang", subject: "Escaped in 47 min — same time a GPU takes to do what Hologram does in 3ms 🔓", preview: "Priya cracked the final cipher by reading it upside down. Staff said we're the 4th group ever to finish. We are insufferable about this. Next challenge: explaining Hologram's architecture to VCs in under 47 minutes. Arguably harder.", platform: "telegram", phase: "play", priority: "low", time: "FEB 13", unread: false, starred: false, actionable: false },
  { id: "68", from: "Rooftop Cinema", subject: "Spirited Away under the stars — the original holographic world ✨", preview: "Blankets, hot chocolate, and Miyazaki. The spirit world is a holographic projection of the real world — same identities, different encodings. Someone will make this comparison. It will be me. Showing at sundown. Come early for good spots.", platform: "email", phase: "play", priority: "low", time: "FEB 12", unread: false, starred: false, actionable: false },
  { id: "69", from: "Ava Williams", subject: "Juggling: 3 objects in constant-time rotation, zero drops 🤹", preview: "Three balls, consistent cascade, zero drops for 30 seconds. The key insight: juggling is a periodic O(1) operation. Each ball follows the same path regardless of how many are in the air. Next goal: 4 balls. Then chainsaws. (Kidding.) (Hologram could probably optimize the trajectory.)", platform: "whatsapp", phase: "play", priority: "low", time: "FEB 11", unread: false, starred: false, actionable: false },

  // ── WORK (continued — 9 more) ─────────────────────────────────────────
  { id: "70", from: "Nina Alvarez", subject: "Hologram SDK downloads crossed 50k this week", preview: "The developer adoption curve is going vertical. 50k downloads, 12k active projects, and the Discord has 400 new members since the benchmark video went viral. Most popular endpoint: the constant-time proof verifier. People can't stop running it.", platform: "email", phase: "work", priority: "normal", time: "FEB 11", unread: false, starred: false, actionable: false },
  { id: "71", from: "Ethan Brooks", subject: "Hologram enterprise tier pricing model — feedback needed", preview: "I've modeled three pricing tiers: Starter (free, 1k proofs/day), Growth ($299/mo, 100k proofs), and Enterprise (custom). The unit economics work because O(1) computation means our marginal cost is essentially zero. We're selling math, not hardware. Spreadsheet attached.", platform: "email", phase: "work", priority: "urgent", time: "FEB 10", unread: false, starred: false, actionable: true, actionLabel: "Review pricing" },
  { id: "72", from: "Security Team", subject: "Hologram kernel passed SOC 2 Type II — zero findings", preview: "The auditors spent three weeks looking for vulnerabilities in the UOR kernel. They found zero. Their report literally says 'the cryptographic receipt system makes tampering mathematically detectable.' We are now officially more audited than most banks.", platform: "email", phase: "work", priority: "normal", time: "FEB 10", unread: false, starred: true, actionable: false },
  { id: "73", from: "Kenji Watanabe", subject: "Hologram edge deployment — 14ms cold start on Raspberry Pi", preview: "I deployed the full Hologram inference engine on a Raspberry Pi 4. Cold start: 14ms. Warm inference: 0.8ms. The look on the DevOps team's face when I showed them GPU-class inference on a $35 computer was worth more than my entire salary.", platform: "telegram", phase: "work", priority: "normal", time: "FEB 9", unread: false, starred: false, actionable: false },
  { id: "74", from: "Sophie Laurent", subject: "Hologram's WebAssembly build is 340KB — smaller than most favicons", preview: "The WASM build compiles to 340KB gzipped. That's smaller than the average hero image. Full constant-time computation, cryptographic verification, and proof generation — in something you can embed in a tweet. The browser demo loads in 80ms on 3G.", platform: "email", phase: "work", priority: "low", time: "FEB 9", unread: false, starred: false, actionable: false },
  { id: "75", from: "Platform Ops", subject: "Hologram uptime: 99.997% — the 0.003% was a DNS typo", preview: "Q4 uptime report is in. We achieved five nines minus a DNS misconfiguration that lasted 47 seconds. The kernel itself never went down. The constant-time proof engine literally cannot crash because there's nothing to crash — it's pure math.", platform: "email", phase: "work", priority: "low", time: "FEB 8", unread: false, starred: false, actionable: false },
  { id: "76", from: "Dalia Restrepo", subject: "Three healthcare companies want Hologram for HIPAA-compliant inference", preview: "Turns out hospitals love the idea of AI inference that produces verifiable proofs. When you can cryptographically prove that a diagnosis recommendation followed a specific reasoning chain, malpractice lawyers get very quiet. Three LOIs on my desk. Need technical scoping by Friday.", platform: "linkedin", phase: "work", priority: "urgent", time: "FEB 8", unread: false, starred: false, actionable: true, actionLabel: "Scope requirements" },
  { id: "77", from: "Release Bot", subject: "Hologram v2.4.0 shipped — 23% faster proof generation", preview: "Changelog: optimized the LUT compilation pipeline, added batch proof verification (up to 10k proofs in one call), and fixed the edge case where proofs generated on leap day had incorrect timestamps. Yes, that was a real bug. Yes, I'm embarrassed.", platform: "discord", phase: "work", priority: "low", time: "FEB 7", unread: false, starred: false, actionable: false },
  { id: "78", from: "Grant Committee", subject: "NSF awarded $2.1M for Hologram's verifiable AI research", preview: "The National Science Foundation approved our grant proposal: 'Towards Universally Verifiable Machine Intelligence via Content-Addressed Computation.' $2.1M over 3 years. The reviewers called it 'a paradigm shift in how we think about computational trust.' Celebration dinner?", platform: "email", phase: "work", priority: "normal", time: "FEB 7", unread: false, starred: true, actionable: false },

  // ── LEARN (continued — 9 more) ────────────────────────────────────────
  { id: "79", from: "Prof. Laura Chen", email: "lchen@berkeley.edu", location: "Berkeley", bio: "UC Berkeley — Formal Methods & Program Synthesis", subject: "Hologram's proof system is Curry-Howard in disguise", preview: "Every Hologram receipt is simultaneously a proof and a program. The Curry-Howard correspondence says proofs ARE programs. Your engineering team accidentally implemented one of the deepest results in mathematical logic. I'm writing a paper about it. Please don't fix this — it's beautiful.", platform: "email", phase: "learn", priority: "normal", time: "FEB 11", unread: false, starred: true, actionable: false },
  { id: "80", from: "Complexity Zoo", subject: "New entry: HOLOGRAM-TIME — the complexity class you invented", preview: "Informal proposal to add HOLOGRAM-TIME to the complexity zoo: the class of problems solvable in O(1) via pre-computed lookup tables with polynomial-time preprocessing. It sits somewhere between P and constant-time, which shouldn't exist but demonstrably does. The taxonomy committee is confused.", platform: "email", phase: "learn", priority: "low", time: "FEB 10", unread: false, starred: false, actionable: false },
  { id: "81", from: "Dr. Felix Hartmann", email: "hartmann@tum.de", location: "Munich", bio: "TU Munich — Applied Cryptography", subject: "Your receipt chain is a Merkle forest — with better properties", preview: "I've been analyzing Hologram's receipt chain structure. It's not a Merkle tree — it's a Merkle forest where each tree is independently verifiable. This gives you parallelizable verification that scales linearly with cores. The blockchain people should be taking notes. 12-page analysis attached.", platform: "email", phase: "learn", priority: "normal", time: "FEB 10", unread: false, starred: false, actionable: false },
  { id: "82", from: "Philosophy Podcast", subject: "Episode 47: Is Hologram's epistemic grading the future of trust?", preview: "We spent 90 minutes discussing whether a machine that grades its own certainty (A = proven, B = verified, C = inferred, D = speculative) is more honest than a human who says 'I'm pretty sure.' Conclusion: yes. The machine knows what it doesn't know. Most humans don't.", platform: "email", phase: "learn", priority: "low", time: "FEB 9", unread: false, starred: false, actionable: false },
  { id: "83", from: "Prof. Ada Okonkwo", email: "aokonkwo@cmu.edu", location: "Pittsburgh", bio: "CMU — Neurosymbolic AI & Knowledge Representation", subject: "Hologram bridges the neural-symbolic divide — here's the proof", preview: "Everyone says 'combine neural and symbolic AI.' Nobody shows how. Your architecture does: neural models generate outputs, symbolic proofs verify them, and the epistemic grade tells you how much to trust the result. I've been looking for this bridge for 15 years. Can I visit your lab?", platform: "email", phase: "learn", priority: "normal", time: "FEB 9", unread: false, starred: true, actionable: true, actionLabel: "Schedule visit" },
  { id: "84", from: "Math Olympiad", subject: "Problem of the week: prove O(1) lookup is possible for any computable function", preview: "Hint: the answer involves pre-computation, content-addressing, and a lookup table that would make your hard drive cry. Extra credit: explain why this is both trivially true and profoundly useful. The Hologram team is not eligible to compete.", platform: "discord", phase: "learn", priority: "low", time: "FEB 8", unread: false, starred: false, actionable: false },
  { id: "85", from: "Prof. James Morrison", email: "jmorrison@imperial.ac.uk", location: "London", bio: "Imperial College — Distributed Systems & Consensus", subject: "Hologram consensus without blockchain — how?", preview: "Your system achieves consensus on computational results without a distributed ledger. The trick: if every node can independently verify a proof via SHA-256 receipt, you don't NEED consensus — you have mathematical agreement. This obsoletes half of what blockchain was designed for. My PhD students are rewriting their theses.", platform: "email", phase: "learn", priority: "normal", time: "FEB 8", unread: false, starred: false, actionable: false },
  { id: "86", from: "Quantum Computing Weekly", subject: "Post-quantum Hologram: why SHA-256 receipts survive Shor's algorithm", preview: "Shor's algorithm breaks RSA and ECC. It does NOT break hash functions. Hologram's entire trust model is built on SHA-256, which means it's naturally post-quantum. While everyone else scrambles to migrate to lattice-based crypto, Hologram just... continues working. Sometimes the simplest choice is the most resilient.", platform: "email", phase: "learn", priority: "low", time: "FEB 7", unread: false, starred: false, actionable: false },
  { id: "87", from: "Prof. Elena Ruiz", email: "eruiz@unam.mx", location: "Mexico City", bio: "UNAM — Philosophy of Information & Digital Ontology", subject: "Hologram's identity model solves the Ship of Theseus", preview: "If you replace every plank, is it the same ship? Hologram's answer: yes, if the SHA-256 hash of the canonical representation is unchanged. Identity isn't in the material — it's in the mathematical structure. I've been teaching this problem for 20 years and your infrastructure company accidentally solved it.", platform: "email", phase: "learn", priority: "low", time: "FEB 7", unread: false, starred: false, actionable: false },

  // ── PLAY (continued — 9 more) ─────────────────────────────────────────
  { id: "88", from: "Sunrise Yoga", subject: "6am flow — find your canonical pose 🧘", preview: "Morning vinyasa on the rooftop. The instructor says 'find your expression of the pose' which is basically projecting a canonical asana into your specific body. Hologram for the spine. Bring a mat and leave your ego at the door.", platform: "whatsapp", phase: "play", priority: "low", time: "FEB 11", unread: false, starred: false, actionable: false },
  { id: "89", from: "Sundar Pichai", email: "sundar@google.com", subject: "Re: Hologram demo at Google Cloud Next — my team has questions", preview: "Your demo at Cloud Next caused a minor incident. Three of my engineers stayed up until 2am trying to figure out how a CPU outperformed a TPU. They couldn't. Now they want to integrate Hologram into Vertex AI. Can we schedule a technical deep-dive? Also, please stop breaking my engineers.", platform: "email", phase: "play", priority: "normal", time: "FEB 10", unread: false, starred: false, actionable: false },
  { id: "90", from: "Pottery Class", subject: "Centering clay: the original constant-time operation 🏺", preview: "Same pressure, same speed, regardless of the clay's initial chaos — it centers. O(1) transformation from disorder to symmetry. This week: mugs. The instructor said 'let the clay teach you.' I said 'the clay doesn't have cryptographic receipts.' I was asked to focus.", platform: "discord", phase: "play", priority: "low", time: "FEB 10", unread: false, starred: false, actionable: false },
  { id: "91", from: "Elon Musk", email: "elon@x.com", subject: "Hologram on Mars — no GPUs, no problem?", preview: "Latency to Earth: 4-24 minutes. GPU resupply: 6 months. If Hologram can run full AI inference on commodity hardware with O(1) lookups, Mars colonies don't need GPU shipments. Just CPUs and math. The payload savings alone justify a conversation. Are you free at 2am? I don't sleep.", platform: "telegram", phase: "play", priority: "low", time: "FEB 9", unread: false, starred: false, actionable: false },
  { id: "92", from: "Jazz Night", subject: "Improvisation is real-time proof generation — come listen 🎷", preview: "The trio plays standards but every solo is a unique proof that the melody can support that particular sequence of notes. Same canonical tune, infinite valid projections. The saxophonist is doing things that shouldn't be legal. $15 cover, two-drink minimum, zero GPU requirements.", platform: "email", phase: "play", priority: "low", time: "FEB 9", unread: false, starred: false, actionable: false },
  { id: "93", from: "Demis Hassabis", email: "demis@deepmind.com", subject: "AlphaFold meets Hologram — protein identity as canonical hash?", preview: "Every protein has a unique 3D structure determined by its amino acid sequence. That's a canonical identity projected into physical space. If Hologram can content-address protein structures the way it addresses computation, drug discovery gets verifiable proofs of molecular identity. Tea at the Crick Institute?", platform: "email", phase: "play", priority: "normal", time: "FEB 8", unread: false, starred: true, actionable: false },
  { id: "94", from: "Stargazing Club", subject: "Andromeda: 2.5M light years away, same physics — universal constants 🌌", preview: "Clear skies forecast. Andromeda is visible with binoculars — a galaxy 2.5 million light years away obeying the same mathematical laws as your laptop. The universe is the original constant-time system: same physics everywhere, regardless of scale. Rooftop at 9pm. Hot cocoa provided.", platform: "discord", phase: "play", priority: "low", time: "FEB 7", unread: false, starred: false, actionable: false },
  { id: "95", from: "Sourdough Exchange", subject: "My starter is 4 years old — a living content-addressed organism 🍞", preview: "Same flour, same water, same temperature — yet every loaf is slightly different. The starter's DNA is the canonical identity; each bake is a projection. I brought extra discard for anyone who wants to fork my repository. Bread puns are mandatory.", platform: "whatsapp", phase: "play", priority: "low", time: "FEB 6", unread: false, starred: false, actionable: false },
  { id: "96", from: "Tim Cook", email: "tim@apple.com", subject: "Hologram on Apple Silicon — the numbers are frankly startling", preview: "Our performance lab ran Hologram on M4 Max. The constant-time proofs complete in 0.4ms. On M4 Ultra: 0.4ms. On M1: 0.4ms. That's the point, isn't it? O(1) doesn't care about your chip. My hardware team finds this both impressive and personally offensive. Lunch in Cupertino?", platform: "email", phase: "play", priority: "normal", time: "FEB 6", unread: false, starred: false, actionable: false },
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

  // Scheduling state (Calendly-like)
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([
    {
      id: "mt-1",
      title: "Quick Chat",
      description: "A brief 15-minute catch-up or introduction call.",
      durationMinutes: 15,
      color: "hsl(220, 80%, 56%)",
      locationType: "video",
      slug: "quick-chat",
      isActive: true,
      maxBookingsPerDay: 8,
      bufferMinutes: 5,
      availabilityWindows: [
        { day: 1, start: "09:00", end: "17:00" },
        { day: 2, start: "09:00", end: "17:00" },
        { day: 3, start: "09:00", end: "17:00" },
        { day: 4, start: "09:00", end: "17:00" },
        { day: 5, start: "09:00", end: "17:00" },
      ],
    },
    {
      id: "mt-2",
      title: "Product Demo",
      description: "Deep dive into the Hologram platform — see constant-time computation in action.",
      durationMinutes: 45,
      color: "hsl(265, 55%, 60%)",
      locationType: "video",
      locationDetail: "Zoom",
      slug: "product-demo",
      isActive: true,
      maxBookingsPerDay: 3,
      bufferMinutes: 15,
      availabilityWindows: [
        { day: 1, start: "10:00", end: "16:00" },
        { day: 3, start: "10:00", end: "16:00" },
        { day: 5, start: "10:00", end: "16:00" },
      ],
    },
    {
      id: "mt-3",
      title: "1:1 Strategy Session",
      description: "In-depth discussion on partnerships, integration, or investment.",
      durationMinutes: 60,
      color: "hsl(38, 70%, 50%)",
      locationType: "video",
      slug: "strategy-session",
      isActive: true,
      maxBookingsPerDay: 2,
      bufferMinutes: 15,
      availabilityWindows: [
        { day: 2, start: "09:00", end: "12:00" },
        { day: 4, start: "14:00", end: "17:00" },
      ],
    },
  ]);
  const [schedulingBookings, setSchedulingBookings] = useState<Booking[]>([
    {
      id: "sb-1",
      meetingTypeId: "mt-1",
      inviteeName: "Elena Vasquez",
      inviteeEmail: "elena@arcanecapital.com",
      startTime: new Date(2026, 2, 2, 10, 0),
      endTime: new Date(2026, 2, 2, 10, 15),
      status: "confirmed",
      createdAt: new Date(2026, 1, 27),
    },
    {
      id: "sb-2",
      meetingTypeId: "mt-2",
      inviteeName: "Sundar Pichai",
      inviteeEmail: "sundar@google.com",
      startTime: new Date(2026, 2, 3, 14, 0),
      endTime: new Date(2026, 2, 3, 14, 45),
      status: "confirmed",
      notes: "Deep-dive on Hologram + Vertex AI integration",
      createdAt: new Date(2026, 1, 26),
    },
  ]);

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

  // Scheduling handlers
  const handleCreateMeetingType = useCallback((mt: Omit<MeetingType, "id">) => {
    setMeetingTypes(prev => [...prev, { ...mt, id: `mt-${Date.now()}` }]);
  }, []);
  const handleUpdateMeetingType = useCallback((id: string, updates: Partial<MeetingType>) => {
    setMeetingTypes(prev => prev.map(mt => mt.id === id ? { ...mt, ...updates } : mt));
  }, []);
  const handleDeleteMeetingType = useCallback((id: string) => {
    setMeetingTypes(prev => prev.filter(mt => mt.id !== id));
  }, []);
  const handleCancelBooking = useCallback((id: string) => {
    setSchedulingBookings(prev => prev.map(b => b.id === id ? { ...b, status: "cancelled" as const } : b));
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
    { key: "scheduling", icon: IconLink, label: "Schedule" },
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

        {activeView === "scheduling" && (
          <div className="flex-1">
            <MessengerScheduling
              P={P}
              font={FONT}
              serif={SERIF}
              meetingTypes={meetingTypes}
              bookings={schedulingBookings}
              events={calendarEvents}
              onCreateMeetingType={handleCreateMeetingType}
              onUpdateMeetingType={handleUpdateMeetingType}
              onDeleteMeetingType={handleDeleteMeetingType}
              onCancelBooking={handleCancelBooking}
              onAskLumen={(prompt) => { setActiveView("ai"); }}
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
              {activeView === "scheduling" && `${meetingTypes.filter(m => m.isActive).length} active · ${schedulingBookings.filter(b => b.status === "confirmed").length} booked`}
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