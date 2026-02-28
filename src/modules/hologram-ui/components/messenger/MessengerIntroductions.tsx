/**
 * MessengerIntroductions — One-Action Introduction Flow
 * ═════════════════════════════════════════════════════
 *
 * Creates a group introduction between two contacts with one action.
 * The introducer can choose to stay or leave the group after intro.
 *
 * @module hologram-ui/components/messenger/MessengerIntroductions
 */

import { useState } from "react";
import {
  IconUsers, IconArrowRight, IconSend, IconX,
  IconCheck, IconUserPlus, IconDoorExit,
  IconSparkles,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { sf } from "@/modules/hologram-ui/utils/scaledFontSize";

interface Contact {
  name: string;
  email?: string;
  platform?: string;
}

interface Introduction {
  id: string;
  personA: Contact;
  personB: Contact;
  reason: string;
  status: "draft" | "sent" | "accepted";
  stayInGroup: boolean;
  createdAt: Date;
}

interface MessengerIntroductionsProps {
  P: Record<string, string>;
  font: string;
  serif: string;
  contacts: Contact[];
  introductions: Introduction[];
  onCreateIntro: (intro: Omit<Introduction, "id" | "status" | "createdAt">) => void;
}

export default function MessengerIntroductions({
  P, font, serif, contacts, introductions, onCreateIntro,
}: MessengerIntroductionsProps) {
  const [creating, setCreating] = useState(false);
  const [personA, setPersonA] = useState("");
  const [personB, setPersonB] = useState("");
  const [reason, setReason] = useState("");
  const [stayInGroup, setStayInGroup] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const handleCreate = () => {
    if (!personA.trim() || !personB.trim()) return;
    onCreateIntro({
      personA: { name: personA },
      personB: { name: personB },
      reason: reason || `I thought you two should connect!`,
      stayInGroup,
    });
    setCreating(false);
    setPersonA("");
    setPersonB("");
    setReason("");
    setStep(1);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: P.bg, fontFamily: font }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${P.divider}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${P.green}15` }}>
            <IconUsers size={15} style={{ color: P.green }} />
          </div>
          <div>
            <h3 style={{ fontSize: sf(15), fontWeight: 600, color: P.text }}>Introductions</h3>
            <span style={{ fontSize: sf(10), color: P.dim }}>Connect people in one action</span>
          </div>
        </div>
        <button
          onClick={() => { setCreating(true); setStep(1); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: P.accentSoft, color: P.accent }}
        >
          <IconUserPlus size={13} /> Introduce
        </button>
      </div>

      {/* AI suggestion banner */}
      <div className="px-4 py-3 mx-4 mt-3 rounded-xl" style={{ background: `${P.accent}08`, border: `1px solid ${P.accent}15` }}>
        <div className="flex items-start gap-2.5">
          <IconSparkles size={14} className="mt-0.5" style={{ color: P.accent }} />
          <div>
            <span style={{ fontSize: sf(12), fontWeight: 600, color: P.text }}>AI-Suggested Introductions</span>
            <p style={{ fontSize: sf(11), color: P.muted, marginTop: "3px", lineHeight: 1.5 }}>
              Based on your messaging patterns, Lumen can identify people who might benefit from knowing each other. Open the AI panel to discover opportunities.
            </p>
          </div>
        </div>
      </div>

      {/* Introduction list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {introductions.length === 0 && !creating ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${P.green}10` }}>
              <IconUsers size={24} style={{ color: P.dim }} />
            </div>
            <span style={{ fontSize: sf(14), fontWeight: 500, color: P.textSecondary }}>No introductions yet</span>
            <span style={{ fontSize: sf(12), color: P.dim, textAlign: "center", maxWidth: "240px" }}>
              Connect two people with a single action. They'll be introduced in a group thread.
            </span>
            <button
              onClick={() => { setCreating(true); setStep(1); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium mt-2"
              style={{ background: P.accent, color: "white" }}
            >
              <IconUserPlus size={14} /> Make an introduction
            </button>
          </div>
        ) : (
          introductions.map(intro => (
            <div
              key={intro.id}
              className="rounded-xl px-4 py-3"
              style={{ background: P.surface, border: `1px solid ${P.divider}` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: `${P.accent}20`, color: P.accent }}>
                    {intro.personA.name.charAt(0)}
                  </div>
                  <span style={{ fontSize: sf(13), fontWeight: 500, color: P.text }}>{intro.personA.name}</span>
                </div>
                <IconArrowRight size={12} style={{ color: P.dim }} />
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: `${P.green}20`, color: P.green }}>
                    {intro.personB.name.charAt(0)}
                  </div>
                  <span style={{ fontSize: sf(13), fontWeight: 500, color: P.text }}>{intro.personB.name}</span>
                </div>
              </div>
              <p style={{ fontSize: sf(12), color: P.muted, lineHeight: 1.5 }}>{intro.reason}</p>
              <div className="flex items-center gap-3 mt-2">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold"
                  style={{
                    background: intro.status === "sent" ? `${P.green}15` : intro.status === "accepted" ? `${P.accent}15` : `${P.gold}15`,
                    color: intro.status === "sent" ? P.green : intro.status === "accepted" ? P.accent : P.gold,
                  }}
                >
                  {intro.status === "sent" ? <IconCheck size={10} /> : null}
                  {intro.status}
                </span>
                <span style={{ fontSize: sf(10), color: P.dim }}>
                  {intro.stayInGroup ? "Staying in group" : "Will exit group"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create introduction flow */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden shrink-0"
            style={{ borderTop: `1px solid ${P.divider}` }}
          >
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: sf(13), fontWeight: 600, color: P.text }}>New Introduction</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: P.accentSoft, color: P.accent }}>
                    Step {step}/3
                  </span>
                </div>
                <button onClick={() => setCreating(false)} style={{ color: P.dim }}>
                  <IconX size={14} />
                </button>
              </div>

              {step === 1 && (
                <div className="space-y-2">
                  <input
                    autoFocus
                    value={personA}
                    onChange={e => setPersonA(e.target.value)}
                    placeholder="Person A — who are you introducing?"
                    className="w-full rounded-lg px-3 py-2 outline-none"
                    style={{ background: P.surface, border: `1px solid ${P.divider}`, color: P.text, fontSize: sf(13) }}
                    list="contacts-a"
                  />
                  <datalist id="contacts-a">
                    {contacts.map(c => <option key={c.name} value={c.name} />)}
                  </datalist>
                  <input
                    value={personB}
                    onChange={e => setPersonB(e.target.value)}
                    placeholder="Person B — to whom?"
                    className="w-full rounded-lg px-3 py-2 outline-none"
                    style={{ background: P.surface, border: `1px solid ${P.divider}`, color: P.text, fontSize: sf(13) }}
                    list="contacts-b"
                  />
                  <datalist id="contacts-b">
                    {contacts.filter(c => c.name !== personA).map(c => <option key={c.name} value={c.name} />)}
                  </datalist>
                  <button
                    onClick={() => { if (personA && personB) setStep(2); }}
                    disabled={!personA || !personB}
                    className="w-full py-2 rounded-lg text-sm font-medium"
                    style={{ background: personA && personB ? P.accent : P.surface, color: personA && personB ? "white" : P.dim }}
                  >
                    Next
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder={`Why should ${personA.split(" ")[0]} meet ${personB.split(" ")[0]}? (optional)`}
                    rows={3}
                    className="w-full rounded-lg px-3 py-2 outline-none resize-none"
                    style={{ background: P.surface, border: `1px solid ${P.divider}`, color: P.text, fontSize: sf(13), lineHeight: 1.6 }}
                  />
                  <button
                    onClick={() => setStep(3)}
                    className="w-full py-2 rounded-lg text-sm font-medium"
                    style={{ background: P.accent, color: "white" }}
                  >
                    Next
                  </button>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <div className="rounded-xl px-4 py-3" style={{ background: P.surface, border: `1px solid ${P.divider}` }}>
                    <span style={{ fontSize: sf(11), color: P.dim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Preview</span>
                    <p style={{ fontSize: sf(13), color: P.text, marginTop: "6px", lineHeight: 1.6 }}>
                      "Hey {personA.split(" ")[0]} and {personB.split(" ")[0]}! {reason || `I thought you two should connect — you have a lot in common.`} Introducing you both here."
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setStayInGroup(!stayInGroup)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 transition-colors"
                      style={{
                        background: stayInGroup ? `${P.accent}10` : P.surface,
                        border: `1px solid ${stayInGroup ? P.accent + "30" : P.divider}`,
                      }}
                    >
                      {stayInGroup ? <IconUsers size={14} style={{ color: P.accent }} /> : <IconDoorExit size={14} style={{ color: P.muted }} />}
                      <span style={{ fontSize: sf(12), color: stayInGroup ? P.accent : P.muted, fontWeight: 500 }}>
                        {stayInGroup ? "Stay in group" : "Exit after intro"}
                      </span>
                    </button>
                  </div>

                  <button
                    onClick={handleCreate}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium"
                    style={{ background: P.green, color: "white" }}
                  >
                    <IconSend size={14} /> Send Introduction
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
