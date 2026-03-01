/**
 * MessengerScheduling — Calendly-like Scheduling Hub
 * ══════════════════════════════════════════════════
 *
 * Create shareable booking links, manage meeting types,
 * view upcoming bookings, and let Lumen handle scheduling.
 *
 * @module hologram-ui/components/messenger/MessengerScheduling
 */

import { useState, useMemo, useCallback } from "react";
import {
  IconPlus, IconX, IconCopy, IconCheck, IconLink,
  IconClock, IconVideo, IconPhone, IconMapPin, IconWorld,
  IconCalendarEvent, IconChevronRight, IconChevronLeft,
  IconDots, IconTrash, IconEdit, IconToggleLeft, IconToggleRight,
  IconSparkles, IconExternalLink, IconShare, IconUsers,
  IconClockHour4, IconShieldCheck, IconBrain,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CalendarEvent } from "./MessengerCalendar";
import { sf } from "@/modules/hologram-ui/utils/scaledFontSize";

// ── Types ──

export interface MeetingType {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  color: string;
  locationType: "video" | "phone" | "in_person" | "custom";
  locationDetail?: string;
  slug: string;
  isActive: boolean;
  maxBookingsPerDay: number;
  bufferMinutes: number;
  availabilityWindows: AvailabilityWindow[];
}

export interface AvailabilityWindow {
  day: number; // 0=Sun, 1=Mon, ...
  start: string; // "09:00"
  end: string;   // "17:00"
}

export interface Booking {
  id: string;
  meetingTypeId: string;
  inviteeName: string;
  inviteeEmail: string;
  startTime: Date;
  endTime: Date;
  status: "confirmed" | "cancelled" | "completed";
  notes?: string;
  createdAt: Date;
}

interface MessengerSchedulingProps {
  P: Record<string, string>;
  font: string;
  serif: string;
  meetingTypes: MeetingType[];
  bookings: Booking[];
  events: CalendarEvent[];
  onCreateMeetingType: (mt: Omit<MeetingType, "id">) => void;
  onUpdateMeetingType: (id: string, updates: Partial<MeetingType>) => void;
  onDeleteMeetingType: (id: string) => void;
  onCancelBooking: (id: string) => void;
  onAskLumen?: (prompt: string) => void;
}

// ── Constants ──

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];
const LOCATION_TYPES: { key: MeetingType["locationType"]; icon: typeof IconVideo; label: string }[] = [
  { key: "video", icon: IconVideo, label: "Video call" },
  { key: "phone", icon: IconPhone, label: "Phone call" },
  { key: "in_person", icon: IconMapPin, label: "In person" },
  { key: "custom", icon: IconWorld, label: "Custom" },
];
const COLORS = [
  "hsl(220, 80%, 56%)",
  "hsl(152, 55%, 42%)",
  "hsl(38, 70%, 50%)",
  "hsl(265, 55%, 60%)",
  "hsl(0, 65%, 52%)",
  "hsl(180, 50%, 45%)",
  "hsl(330, 60%, 55%)",
  "hsl(28, 80%, 52%)",
];
const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type ScheduleView = "types" | "create" | "edit" | "bookings" | "preview";

// ── Component ──

export default function MessengerScheduling({
  P, font, serif, meetingTypes, bookings, events,
  onCreateMeetingType, onUpdateMeetingType, onDeleteMeetingType,
  onCancelBooking, onAskLumen,
}: MessengerSchedulingProps) {
  const [view, setView] = useState<ScheduleView>("types");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── Create/Edit form state ──
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDuration, setFormDuration] = useState(30);
  const [formColor, setFormColor] = useState(COLORS[0]);
  const [formLocationType, setFormLocationType] = useState<MeetingType["locationType"]>("video");
  const [formLocationDetail, setFormLocationDetail] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formBuffer, setFormBuffer] = useState(10);
  const [formMaxPerDay, setFormMaxPerDay] = useState(5);
  const [formAvailability, setFormAvailability] = useState<AvailabilityWindow[]>([
    { day: 1, start: "09:00", end: "17:00" },
    { day: 2, start: "09:00", end: "17:00" },
    { day: 3, start: "09:00", end: "17:00" },
    { day: 4, start: "09:00", end: "17:00" },
    { day: 5, start: "09:00", end: "17:00" },
  ]);

  const editingMeetingType = useMemo(
    () => meetingTypes.find(mt => mt.id === editingId),
    [meetingTypes, editingId]
  );
  const previewMeetingType = useMemo(
    () => meetingTypes.find(mt => mt.id === previewId),
    [meetingTypes, previewId]
  );

  const upcomingBookings = useMemo(
    () => bookings
      .filter(b => b.status === "confirmed" && b.startTime > new Date())
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
    [bookings]
  );

  const resetForm = useCallback(() => {
    setFormTitle(""); setFormDesc(""); setFormDuration(30);
    setFormColor(COLORS[0]); setFormLocationType("video");
    setFormLocationDetail(""); setFormSlug(""); setFormBuffer(10);
    setFormMaxPerDay(5);
    setFormAvailability([
      { day: 1, start: "09:00", end: "17:00" },
      { day: 2, start: "09:00", end: "17:00" },
      { day: 3, start: "09:00", end: "17:00" },
      { day: 4, start: "09:00", end: "17:00" },
      { day: 5, start: "09:00", end: "17:00" },
    ]);
  }, []);

  const populateFormFromType = useCallback((mt: MeetingType) => {
    setFormTitle(mt.title); setFormDesc(mt.description || "");
    setFormDuration(mt.durationMinutes); setFormColor(mt.color);
    setFormLocationType(mt.locationType);
    setFormLocationDetail(mt.locationDetail || "");
    setFormSlug(mt.slug); setFormBuffer(mt.bufferMinutes);
    setFormMaxPerDay(mt.maxBookingsPerDay);
    setFormAvailability(mt.availabilityWindows);
  }, []);

  const handleCreate = () => {
    if (!formTitle.trim()) return;
    const slug = formSlug.trim() || formTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
    onCreateMeetingType({
      title: formTitle.trim(),
      description: formDesc.trim() || undefined,
      durationMinutes: formDuration,
      color: formColor,
      locationType: formLocationType,
      locationDetail: formLocationDetail.trim() || undefined,
      slug,
      isActive: true,
      maxBookingsPerDay: formMaxPerDay,
      bufferMinutes: formBuffer,
      availabilityWindows: formAvailability,
    });
    resetForm();
    setView("types");
  };

  const handleUpdate = () => {
    if (!editingId || !formTitle.trim()) return;
    const slug = formSlug.trim() || formTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
    onUpdateMeetingType(editingId, {
      title: formTitle.trim(),
      description: formDesc.trim() || undefined,
      durationMinutes: formDuration,
      color: formColor,
      locationType: formLocationType,
      locationDetail: formLocationDetail.trim() || undefined,
      slug,
      bufferMinutes: formBuffer,
      maxBookingsPerDay: formMaxPerDay,
      availabilityWindows: formAvailability,
    });
    setEditingId(null);
    setView("types");
  };

  const copyLink = (mt: MeetingType) => {
    const link = `${window.location.origin}/book/${mt.slug}`;
    navigator.clipboard.writeText(link);
    setCopiedId(mt.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleAvailDay = (day: number) => {
    setFormAvailability(prev => {
      const exists = prev.find(w => w.day === day);
      if (exists) return prev.filter(w => w.day !== day);
      return [...prev, { day, start: "09:00", end: "17:00" }].sort((a, b) => a.day - b.day);
    });
  };

  const updateAvailTime = (day: number, field: "start" | "end", value: string) => {
    setFormAvailability(prev =>
      prev.map(w => w.day === day ? { ...w, [field]: value } : w)
    );
  };

  // ── Render by view ──

  return (
    <div className="flex flex-col h-full" style={{ background: P.bg, fontFamily: font }}>
      <AnimatePresence mode="wait">
        {view === "types" && (
          <motion.div
            key="types"
            className="flex flex-col h-full"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            <MeetingTypesView
              P={P} font={font} serif={serif}
              meetingTypes={meetingTypes}
              upcomingBookings={upcomingBookings}
              copiedId={copiedId}
              onCreateNew={() => { resetForm(); setView("create"); }}
              onEdit={(mt) => { setEditingId(mt.id); populateFormFromType(mt); setView("edit"); }}
              onCopyLink={copyLink}
              onToggleActive={(mt) => onUpdateMeetingType(mt.id, { isActive: !mt.isActive })}
              onDelete={onDeleteMeetingType}
              onViewBookings={() => setView("bookings")}
              onPreview={(mt) => { setPreviewId(mt.id); setView("preview"); }}
              onAskLumen={onAskLumen}
            />
          </motion.div>
        )}

        {(view === "create" || view === "edit") && (
          <motion.div
            key="form"
            className="flex flex-col h-full"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <MeetingTypeForm
              P={P} font={font} serif={serif}
              isEdit={view === "edit"}
              title={formTitle} setTitle={setFormTitle}
              desc={formDesc} setDesc={setFormDesc}
              duration={formDuration} setDuration={setFormDuration}
              color={formColor} setColor={setFormColor}
              locationType={formLocationType} setLocationType={setFormLocationType}
              locationDetail={formLocationDetail} setLocationDetail={setFormLocationDetail}
              slug={formSlug} setSlug={setFormSlug}
              buffer={formBuffer} setBuffer={setFormBuffer}
              maxPerDay={formMaxPerDay} setMaxPerDay={setFormMaxPerDay}
              availability={formAvailability}
              onToggleDay={toggleAvailDay}
              onUpdateTime={updateAvailTime}
              onSave={view === "edit" ? handleUpdate : handleCreate}
              onBack={() => { setView("types"); setEditingId(null); }}
            />
          </motion.div>
        )}

        {view === "bookings" && (
          <motion.div
            key="bookings"
            className="flex flex-col h-full"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <BookingsView
              P={P} font={font} serif={serif}
              bookings={bookings}
              meetingTypes={meetingTypes}
              onCancel={onCancelBooking}
              onBack={() => setView("types")}
            />
          </motion.div>
        )}

        {view === "preview" && previewMeetingType && (
          <motion.div
            key="preview"
            className="flex flex-col h-full"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
          >
            <BookingPreview
              P={P} font={font} serif={serif}
              meetingType={previewMeetingType}
              events={events}
              onBack={() => { setView("types"); setPreviewId(null); }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// ── Meeting Types List View ──
// ═══════════════════════════════════════════════════════════════════

function MeetingTypesView({
  P, font, serif, meetingTypes, upcomingBookings, copiedId,
  onCreateNew, onEdit, onCopyLink, onToggleActive, onDelete,
  onViewBookings, onPreview, onAskLumen,
}: {
  P: Record<string, string>;
  font: string;
  serif: string;
  meetingTypes: MeetingType[];
  upcomingBookings: Booking[];
  copiedId: string | null;
  onCreateNew: () => void;
  onEdit: (mt: MeetingType) => void;
  onCopyLink: (mt: MeetingType) => void;
  onToggleActive: (mt: MeetingType) => void;
  onDelete: (id: string) => void;
  onViewBookings: () => void;
  onPreview: (mt: MeetingType) => void;
  onAskLumen?: (prompt: string) => void;
}) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${P.divider}` }}>
        <div>
          <h3 style={{ fontSize: sf(17), fontWeight: 600, color: P.text, fontFamily: serif }}>
            Scheduling
          </h3>
          <span style={{ fontSize: sf(11), color: P.dim }}>
            {meetingTypes.length} meeting type{meetingTypes.length !== 1 ? "s" : ""} · {upcomingBookings.length} upcoming
          </span>
        </div>
        <div className="flex items-center gap-2">
          {upcomingBookings.length > 0 && (
            <button
              onClick={onViewBookings}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ color: P.accent, background: P.accentSoft }}
            >
              <IconCalendarEvent size={13} />
              {upcomingBookings.length} booked
            </button>
          )}
          <button
            onClick={onCreateNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ color: "white", background: P.accent }}
          >
            <IconPlus size={13} />
            New
          </button>
        </div>
      </div>

      {/* Lumen suggestion bar */}
      {onAskLumen && (
        <button
          onClick={() => onAskLumen("Analyze my calendar and messaging patterns to suggest optimal meeting types, availability windows, and buffer times. Consider my busiest days, preferred meeting lengths, and current schedule density.")}
          className="flex items-center gap-2.5 mx-4 mt-3 px-4 py-2.5 rounded-xl transition-all duration-200 group"
          style={{ background: `${P.accent}08`, border: `1px solid ${P.accent}15` }}
        >
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${P.accent}15` }}>
            <IconBrain size={13} style={{ color: P.accent }} />
          </div>
          <span style={{ fontSize: sf(12), color: P.textSecondary, flex: 1, textAlign: "left" }}>
            Let Lumen optimize your availability based on messaging patterns
          </span>
          <IconChevronRight size={13} style={{ color: P.dim }} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Meeting type cards */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {meetingTypes.length === 0 ? (
          <EmptyState P={P} font={font} serif={serif} onCreateNew={onCreateNew} />
        ) : (
          meetingTypes.map(mt => (
            <motion.div
              key={mt.id}
              layout
              className="rounded-xl overflow-hidden transition-all duration-200"
              style={{
                background: P.surface,
                border: `1px solid ${P.divider}`,
                opacity: mt.isActive ? 1 : 0.55,
              }}
            >
              {/* Color strip + content */}
              <div className="flex">
                <div className="w-[4px] shrink-0" style={{ background: mt.color }} />
                <div className="flex-1 px-4 py-3.5 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ fontSize: sf(15), fontWeight: 600, color: P.text }}>{mt.title}</span>
                        {!mt.isActive && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: `${P.dim}20`, color: P.dim }}>
                            Off
                          </span>
                        )}
                      </div>
                      {mt.description && (
                        <p className="truncate" style={{ fontSize: sf(12), color: P.muted, marginBottom: "6px" }}>
                          {mt.description}
                        </p>
                      )}

                      {/* Metadata chips */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: P.textSecondary }}>
                          <IconClock size={11} /> {mt.durationMinutes} min
                        </span>
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: P.textSecondary }}>
                          {LOCATION_TYPES.find(l => l.key === mt.locationType)?.icon &&
                            (() => {
                              const Icon = LOCATION_TYPES.find(l => l.key === mt.locationType)!.icon;
                              return <Icon size={11} />;
                            })()
                          }
                          {LOCATION_TYPES.find(l => l.key === mt.locationType)?.label}
                        </span>
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: P.dim }}>
                          <IconClockHour4 size={10} /> {mt.bufferMinutes}m buffer
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                      onClick={() => onCopyLink(mt)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                        style={{ color: copiedId === mt.id ? P.green : P.muted, background: copiedId === mt.id ? `${P.green}12` : "transparent" }}
                        title="Copy link"
                      >
                        {copiedId === mt.id ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      </button>
                      <button
                        onClick={() => onPreview(mt)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                        style={{ color: P.muted }}
                        title="Preview booking page"
                      >
                        <IconExternalLink size={14} />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpenId(menuOpenId === mt.id ? null : mt.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                          style={{ color: P.muted }}
                        >
                          <IconDots size={14} />
                        </button>
                        <AnimatePresence>
                          {menuOpenId === mt.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -4 }}
                              transition={{ duration: 0.12 }}
                              className="absolute right-0 top-9 z-20 rounded-xl overflow-hidden shadow-xl"
                              style={{ background: P.surface, border: `1px solid ${P.divider}`, minWidth: "160px" }}
                            >
                              <button
                                onClick={() => { onEdit(mt); setMenuOpenId(null); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors"
                                style={{ fontSize: sf(13), color: P.text }}
                              >
                                <IconEdit size={13} /> Edit
                              </button>
                              <button
                                onClick={() => { onToggleActive(mt); setMenuOpenId(null); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors"
                                style={{ fontSize: sf(13), color: P.text }}
                              >
                                {mt.isActive ? <IconToggleRight size={13} /> : <IconToggleLeft size={13} />}
                                {mt.isActive ? "Disable" : "Enable"}
                              </button>
                              <button
                                onClick={() => { onCopyLink(mt); setMenuOpenId(null); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors"
                                style={{ fontSize: sf(13), color: P.text }}
                              >
                                <IconShare size={13} /> Share link
                              </button>
                              <div className="mx-3 h-px" style={{ background: P.divider }} />
                              <button
                                onClick={() => { onDelete(mt.id); setMenuOpenId(null); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors"
                                style={{ fontSize: sf(13), color: P.red }}
                              >
                                <IconTrash size={13} /> Delete
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Shareable link preview */}
                  {mt.isActive && (
                    <div
                      className="flex items-center gap-2 mt-2.5 px-3 py-2 rounded-lg cursor-pointer group"
                      style={{ background: `${P.accent}06`, border: `1px dashed ${P.accent}20` }}
                      onClick={() => onCopyLink(mt)}
                    >
                      <IconLink size={12} style={{ color: P.accent }} />
                      <span className="text-[11px] font-mono truncate" style={{ color: P.accent, opacity: 0.8 }}>
                        {window.location.host}/book/{mt.slug}
                      </span>
                      <span className="text-[10px] font-medium ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: P.accent }}>
                        {copiedId === mt.id ? "Copied!" : "Click to copy"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Footer stats */}
      <div className="shrink-0 px-5 py-2.5 flex items-center justify-between" style={{ borderTop: `1px solid ${P.divider}` }}>
        <div className="flex items-center gap-1.5">
          <IconShieldCheck size={12} style={{ color: P.green }} />
          <span style={{ fontSize: sf(10), color: P.dim }}>Links are private · Only your availability is shared</span>
        </div>
      </div>
    </>
  );
}


// ═══════════════════════════════════════════════════════════════════
// ── Empty State ──
// ═══════════════════════════════════════════════════════════════════

function EmptyState({ P, font, serif, onCreateNew }: {
  P: Record<string, string>; font: string; serif: string; onCreateNew: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-16 gap-5">
      <motion.div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: `${P.accent}10`, border: `1px solid ${P.accent}15` }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <IconCalendarEvent size={28} style={{ color: P.accent }} strokeWidth={1.3} />
      </motion.div>
      <div className="text-center">
        <h4 style={{ fontSize: sf(18), fontWeight: 600, color: P.text, fontFamily: serif, marginBottom: "6px" }}>
          Share your availability
        </h4>
        <p style={{ fontSize: sf(13), color: P.muted, lineHeight: 1.6, maxWidth: "280px" }}>
          Create meeting types and share booking links — like Calendly, but built into your messenger.
        </p>
      </div>
      <button
        onClick={onCreateNew}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
        style={{ background: P.accent, color: "white" }}
      >
        <IconPlus size={15} /> Create your first meeting type
      </button>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// ── Meeting Type Form (Create / Edit) ──
// ═══════════════════════════════════════════════════════════════════

function MeetingTypeForm({
  P, font, serif, isEdit,
  title, setTitle, desc, setDesc,
  duration, setDuration, color, setColor,
  locationType, setLocationType,
  locationDetail, setLocationDetail,
  slug, setSlug, buffer, setBuffer,
  maxPerDay, setMaxPerDay,
  availability, onToggleDay, onUpdateTime,
  onSave, onBack,
}: {
  P: Record<string, string>; font: string; serif: string; isEdit: boolean;
  title: string; setTitle: (v: string) => void;
  desc: string; setDesc: (v: string) => void;
  duration: number; setDuration: (v: number) => void;
  color: string; setColor: (v: string) => void;
  locationType: MeetingType["locationType"]; setLocationType: (v: MeetingType["locationType"]) => void;
  locationDetail: string; setLocationDetail: (v: string) => void;
  slug: string; setSlug: (v: string) => void;
  buffer: number; setBuffer: (v: number) => void;
  maxPerDay: number; setMaxPerDay: (v: number) => void;
  availability: AvailabilityWindow[];
  onToggleDay: (day: number) => void;
  onUpdateTime: (day: number, field: "start" | "end", value: string) => void;
  onSave: () => void; onBack: () => void;
}) {
  const inputStyle = {
    background: P.surface,
    border: `1px solid ${P.divider}`,
    color: P.text,
    fontSize: sf(14),
    fontFamily: font,
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${P.divider}` }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} style={{ color: P.muted }}>
            <IconChevronLeft size={18} />
          </button>
          <h3 style={{ fontSize: sf(15), fontWeight: 600, color: P.text }}>
            {isEdit ? "Edit Meeting Type" : "New Meeting Type"}
          </h3>
        </div>
        <button
          onClick={onSave}
          disabled={!title.trim()}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: title.trim() ? P.accent : P.dim,
            color: "white",
            opacity: title.trim() ? 1 : 0.5,
          }}
        >
          <IconCheck size={14} />
          {isEdit ? "Save" : "Create"}
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Title */}
        <div>
          <label className="block mb-1.5" style={{ fontSize: sf(12), fontWeight: 600, color: P.textSecondary }}>Event name</label>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Quick Chat, Product Demo, 1:1 Sync"
            className="w-full rounded-xl px-4 py-2.5 outline-none"
            style={inputStyle}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block mb-1.5" style={{ fontSize: sf(12), fontWeight: 600, color: P.textSecondary }}>Description (optional)</label>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="What is this meeting about?"
            rows={2}
            className="w-full rounded-xl px-4 py-2.5 outline-none resize-none"
            style={inputStyle}
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block mb-2" style={{ fontSize: sf(12), fontWeight: 600, color: P.textSecondary }}>Duration</label>
          <div className="flex gap-2 flex-wrap">
            {DURATION_OPTIONS.map(d => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className="px-3.5 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: duration === d ? P.accent : P.surface,
                  color: duration === d ? "white" : P.textSecondary,
                  border: `1px solid ${duration === d ? P.accent : P.divider}`,
                }}
              >
                {d} min
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div>
          <label className="block mb-2" style={{ fontSize: sf(12), fontWeight: 600, color: P.textSecondary }}>Color</label>
          <div className="flex gap-2">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full transition-all flex items-center justify-center"
                style={{
                  background: c,
                  boxShadow: color === c ? `0 0 0 2px ${P.bg}, 0 0 0 4px ${c}` : "none",
                  transform: color === c ? "scale(1.15)" : "scale(1)",
                }}
              >
                {color === c && <IconCheck size={13} color="white" />}
              </button>
            ))}
          </div>
        </div>

        {/* Location type */}
        <div>
          <label className="block mb-2" style={{ fontSize: sf(12), fontWeight: 600, color: P.textSecondary }}>Location</label>
          <div className="grid grid-cols-2 gap-2">
            {LOCATION_TYPES.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setLocationType(key)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm transition-all"
                style={{
                  background: locationType === key ? `${P.accent}12` : P.surface,
                  color: locationType === key ? P.accent : P.textSecondary,
                  border: `1px solid ${locationType === key ? `${P.accent}30` : P.divider}`,
                  fontWeight: locationType === key ? 600 : 400,
                }}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
          {(locationType === "custom" || locationType === "in_person") && (
            <input
              value={locationDetail}
              onChange={e => setLocationDetail(e.target.value)}
              placeholder={locationType === "in_person" ? "Address" : "Meeting link or details"}
              className="w-full rounded-xl px-4 py-2.5 outline-none mt-2"
              style={inputStyle}
            />
          )}
        </div>

        {/* Custom slug */}
        <div>
          <label className="block mb-1.5" style={{ fontSize: sf(12), fontWeight: 600, color: P.textSecondary }}>Custom URL slug</label>
          <div className="flex items-center rounded-xl overflow-hidden" style={{ border: `1px solid ${P.divider}` }}>
            <span className="px-3 py-2.5 shrink-0" style={{ background: `${P.dim}10`, fontSize: sf(13), color: P.dim }}>
              /book/
            </span>
            <input
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder={title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "") || "meeting-slug"}
              className="flex-1 px-3 py-2.5 outline-none bg-transparent"
              style={{ color: P.text, fontSize: sf(13), fontFamily: "monospace" }}
            />
          </div>
        </div>

        {/* Buffer & max per day */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block mb-1.5" style={{ fontSize: sf(12), fontWeight: 600, color: P.textSecondary }}>Buffer (min)</label>
            <input
              type="number"
              value={buffer}
              onChange={e => setBuffer(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full rounded-xl px-4 py-2.5 outline-none"
              style={inputStyle}
            />
          </div>
          <div className="flex-1">
            <label className="block mb-1.5" style={{ fontSize: sf(12), fontWeight: 600, color: P.textSecondary }}>Max/day</label>
            <input
              type="number"
              value={maxPerDay}
              onChange={e => setMaxPerDay(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded-xl px-4 py-2.5 outline-none"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Availability */}
        <div>
          <label className="block mb-2" style={{ fontSize: sf(12), fontWeight: 600, color: P.textSecondary }}>Weekly availability</label>
          <div className="space-y-1.5">
            {[0, 1, 2, 3, 4, 5, 6].map(day => {
              const window = availability.find(w => w.day === day);
              const active = !!window;
              return (
                <div
                  key={day}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
                  style={{ background: active ? `${P.accent}06` : "transparent" }}
                >
                  <button
                    onClick={() => onToggleDay(day)}
                    className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors"
                    style={{
                      background: active ? P.accent : P.surface,
                      border: `1px solid ${active ? P.accent : P.divider}`,
                    }}
                  >
                    {active && <IconCheck size={12} color="white" />}
                  </button>
                  <span style={{ fontSize: sf(13), fontWeight: 500, color: active ? P.text : P.dim, width: "80px" }}>
                    {DAYS_FULL[day]}
                  </span>
                  {active && window && (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <input
                        type="time"
                        value={window.start}
                        onChange={e => onUpdateTime(day, "start", e.target.value)}
                        className="rounded px-2 py-1 outline-none text-xs"
                        style={{ background: P.surface, border: `1px solid ${P.divider}`, color: P.text }}
                      />
                      <span style={{ fontSize: sf(11), color: P.dim }}>→</span>
                      <input
                        type="time"
                        value={window.end}
                        onChange={e => onUpdateTime(day, "end", e.target.value)}
                        className="rounded px-2 py-1 outline-none text-xs"
                        style={{ background: P.surface, border: `1px solid ${P.divider}`, color: P.text }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}


// ═══════════════════════════════════════════════════════════════════
// ── Bookings View ──
// ═══════════════════════════════════════════════════════════════════

function BookingsView({
  P, font, serif, bookings, meetingTypes, onCancel, onBack,
}: {
  P: Record<string, string>; font: string; serif: string;
  bookings: Booking[]; meetingTypes: MeetingType[];
  onCancel: (id: string) => void; onBack: () => void;
}) {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const now = new Date();
  const upcoming = bookings.filter(b => b.status === "confirmed" && b.startTime > now).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  const past = bookings.filter(b => b.status !== "confirmed" || b.startTime <= now).sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: `1px solid ${P.divider}` }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} style={{ color: P.muted }}>
            <IconChevronLeft size={18} />
          </button>
          <h3 style={{ fontSize: sf(15), fontWeight: 600, color: P.text }}>Bookings</h3>
        </div>
        <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: P.surface }}>
          {(["upcoming", "past"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors"
              style={{
                background: tab === t ? P.bg : "transparent",
                color: tab === t ? P.text : P.dim,
                boxShadow: tab === t ? `0 1px 3px ${P.divider}` : "none",
              }}
            >
              {t} ({t === "upcoming" ? upcoming.length : past.length})
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <IconCalendarEvent size={24} style={{ color: P.dim }} />
            <span style={{ fontSize: sf(13), color: P.dim }}>No {tab} bookings</span>
          </div>
        ) : (
          list.map(b => {
            const mt = meetingTypes.find(m => m.id === b.meetingTypeId);
            return (
              <div
                key={b.id}
                className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
                style={{ background: P.surface, border: `1px solid ${P.divider}` }}
              >
                <div className="w-[4px] h-10 rounded-full shrink-0 mt-0.5" style={{ background: mt?.color || P.accent }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span style={{ fontSize: sf(14), fontWeight: 600, color: P.text }}>{b.inviteeName}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{
                      background: b.status === "confirmed" ? `${P.green}15` : `${P.red}15`,
                      color: b.status === "confirmed" ? P.green : P.red,
                    }}>
                      {b.status}
                    </span>
                  </div>
                  <span style={{ fontSize: sf(12), color: P.muted }}>{b.inviteeEmail}</span>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: P.textSecondary }}>
                      <IconCalendarEvent size={11} />
                      {b.startTime.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: P.textSecondary }}>
                      <IconClock size={11} />
                      {b.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {b.endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {mt && (
                      <span className="text-[11px]" style={{ color: P.dim }}>{mt.title}</span>
                    )}
                  </div>
                </div>
                {b.status === "confirmed" && tab === "upcoming" && (
                  <button
                    onClick={() => onCancel(b.id)}
                    className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ color: P.dim }}
                    title="Cancel booking"
                  >
                    <IconX size={13} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}


// ═══════════════════════════════════════════════════════════════════
// ── Booking Preview (what invitees see) ──
// ═══════════════════════════════════════════════════════════════════

function BookingPreview({
  P, font, serif, meetingType: mt, events, onBack,
}: {
  P: Record<string, string>; font: string; serif: string;
  meetingType: MeetingType; events: CalendarEvent[]; onBack: () => void;
}) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [step, setStep] = useState<"date" | "confirm">("date");
  const [invName, setInvName] = useState("");
  const [invEmail, setInvEmail] = useState("");

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAYS_H = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (y: number, m: number) => {
    const d = new Date(y, m, 1).getDay();
    return d === 0 ? 6 : d - 1;
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDay(viewYear, viewMonth);

  // Generate available slots for selected day
  const availableSlots = useMemo(() => {
    if (selectedDay === null) return [];
    const date = new Date(viewYear, viewMonth, selectedDay);
    const dayOfWeek = date.getDay();
    const window = mt.availabilityWindows.find(w => w.day === dayOfWeek);
    if (!window) return [];

    const [startH, startM] = window.start.split(":").map(Number);
    const [endH, endM] = window.end.split(":").map(Number);
    const slots: string[] = [];
    let h = startH, m = startM;

    while (h * 60 + m + mt.durationMinutes <= endH * 60 + endM) {
      const slotStart = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      // Check if this slot conflicts with existing events
      const slotStartTime = new Date(viewYear, viewMonth, selectedDay, h, m);
      const slotEndTime = new Date(slotStartTime.getTime() + mt.durationMinutes * 60000);
      const conflicting = events.some(e => {
        return e.startTime < slotEndTime && e.endTime > slotStartTime;
      });
      if (!conflicting && slotStartTime > new Date()) {
        slots.push(slotStart);
      }
      m += mt.durationMinutes + mt.bufferMinutes;
      while (m >= 60) { m -= 60; h++; }
    }
    return slots;
  }, [selectedDay, viewYear, viewMonth, mt, events]);

  const isDayAvailable = useCallback((day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return false;
    const dayOfWeek = date.getDay();
    return mt.availabilityWindows.some(w => w.day === dayOfWeek);
  }, [viewYear, viewMonth, mt, today]);

  const navMonth = (dir: -1 | 1) => {
    let m = viewMonth + dir, y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m); setViewYear(y); setSelectedDay(null); setSelectedSlot(null);
  };

  const LocIcon = LOCATION_TYPES.find(l => l.key === mt.locationType)?.icon || IconVideo;

  return (
    <>
      {/* Header with back */}
      <div className="flex items-center gap-3 px-5 py-3 shrink-0" style={{ borderBottom: `1px solid ${P.divider}` }}>
        <button onClick={onBack} style={{ color: P.muted }}>
          <IconChevronLeft size={18} />
        </button>
        <span style={{ fontSize: sf(13), fontWeight: 500, color: P.muted }}>Booking page preview</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {step === "date" ? (
          <div className="flex flex-col lg:flex-row min-h-full">
            {/* Left: Meeting info */}
            <div className="lg:w-[220px] shrink-0 px-6 py-6 flex flex-col gap-4" style={{ borderRight: `1px solid ${P.divider}` }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${mt.color}15` }}>
                <span style={{ fontSize: sf(16), fontWeight: 600, color: mt.color }}>H</span>
              </div>
              <div>
                <span style={{ fontSize: sf(12), color: P.dim }}>Hologram</span>
                <h2 style={{ fontSize: sf(20), fontWeight: 700, color: P.text, fontFamily: serif, marginTop: "2px" }}>
                  {mt.title}
                </h2>
              </div>
              {mt.description && (
                <p style={{ fontSize: sf(13), color: P.muted, lineHeight: 1.5 }}>{mt.description}</p>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <IconClock size={14} style={{ color: P.dim }} />
                  <span style={{ fontSize: sf(13), color: P.textSecondary }}>{mt.durationMinutes} min</span>
                </div>
                <div className="flex items-center gap-2">
                  <LocIcon size={14} style={{ color: P.dim }} />
                  <span style={{ fontSize: sf(13), color: P.textSecondary }}>
                    {LOCATION_TYPES.find(l => l.key === mt.locationType)?.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Calendar + time slots */}
            <div className="flex-1 px-5 py-5">
              <h3 style={{ fontSize: sf(15), fontWeight: 600, color: P.text, marginBottom: "12px" }}>
                Select a Date & Time
              </h3>

              <div className="flex gap-5">
                {/* Calendar grid */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={() => navMonth(-1)} style={{ color: P.muted }}><IconChevronLeft size={16} /></button>
                    <span style={{ fontSize: sf(14), fontWeight: 600, color: P.text }}>{MONTHS[viewMonth]} {viewYear}</span>
                    <button onClick={() => navMonth(1)} style={{ color: P.muted }}><IconChevronRight size={16} /></button>
                  </div>

                  <div className="grid grid-cols-7 gap-px mb-1">
                    {DAYS_H.map(d => (
                      <div key={d} className="text-center py-1" style={{ fontSize: sf(11), fontWeight: 600, color: P.dim }}>
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-px">
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const available = isDayAvailable(day);
                      const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                      const isSelected = selectedDay === day;
                      return (
                        <button
                          key={day}
                          onClick={() => { if (available) { setSelectedDay(day); setSelectedSlot(null); } }}
                          disabled={!available}
                          className="w-full aspect-square rounded-full flex items-center justify-center text-sm transition-all"
                          style={{
                            color: isSelected ? "white" : available ? P.text : P.dim,
                            background: isSelected ? mt.color : "transparent",
                            fontWeight: isToday || isSelected ? 700 : 400,
                            cursor: available ? "pointer" : "default",
                            opacity: available ? 1 : 0.35,
                          }}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>

                  {/* Timezone note */}
                  <div className="flex items-center gap-1.5 mt-3">
                    <IconWorld size={12} style={{ color: P.dim }} />
                    <span style={{ fontSize: sf(11), color: P.dim }}>
                      {Intl.DateTimeFormat().resolvedOptions().timeZone}
                    </span>
                  </div>
                </div>

                {/* Time slots */}
                {selectedDay !== null && (
                  <motion.div
                    className="w-[130px] shrink-0"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div style={{ fontSize: sf(13), fontWeight: 600, color: P.text, marginBottom: "8px" }}>
                      {DAYS_FULL[new Date(viewYear, viewMonth, selectedDay).getDay()]}, {MONTHS[viewMonth]} {selectedDay}
                    </div>
                    <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                      {availableSlots.length === 0 ? (
                        <span style={{ fontSize: sf(12), color: P.dim }}>No slots available</span>
                      ) : (
                        availableSlots.map(slot => (
                          <button
                            key={slot}
                            onClick={() => {
                              if (selectedSlot === slot) {
                                setStep("confirm");
                              } else {
                                setSelectedSlot(slot);
                              }
                            }}
                            className="w-full py-2 rounded-lg text-sm font-medium transition-all"
                            style={{
                              background: selectedSlot === slot ? mt.color : "transparent",
                              color: selectedSlot === slot ? "white" : mt.color,
                              border: `1px solid ${selectedSlot === slot ? mt.color : `${mt.color}40`}`,
                            }}
                          >
                            {selectedSlot === slot ? "Confirm →" : slot}
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Confirm step */
          <motion.div
            className="max-w-md mx-auto px-6 py-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <button
              onClick={() => setStep("date")}
              className="flex items-center gap-1 mb-5"
              style={{ fontSize: sf(13), color: P.muted }}
            >
              <IconChevronLeft size={14} /> Back
            </button>

            <h3 style={{ fontSize: sf(18), fontWeight: 700, color: P.text, fontFamily: serif, marginBottom: "4px" }}>
              Confirm your booking
            </h3>
            <p style={{ fontSize: sf(13), color: P.muted, marginBottom: "20px" }}>
              {mt.title} · {mt.durationMinutes} min
            </p>

            {/* Selected time display */}
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5"
              style={{ background: `${mt.color}08`, border: `1px solid ${mt.color}20` }}
            >
              <IconCalendarEvent size={16} style={{ color: mt.color }} />
              <div>
                <div style={{ fontSize: sf(14), fontWeight: 600, color: P.text }}>
                  {selectedDay && `${DAYS_FULL[new Date(viewYear, viewMonth, selectedDay).getDay()]}, ${MONTHS[viewMonth]} ${selectedDay}, ${viewYear}`}
                </div>
                <div style={{ fontSize: sf(13), color: P.muted }}>
                  {selectedSlot} · {mt.durationMinutes} minutes
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block mb-1" style={{ fontSize: sf(12), fontWeight: 600, color: P.textSecondary }}>Your name</label>
                <input
                  value={invName}
                  onChange={e => setInvName(e.target.value)}
                  placeholder="Full name"
                  className="w-full rounded-xl px-4 py-2.5 outline-none"
                  style={{ background: P.surface, border: `1px solid ${P.divider}`, color: P.text, fontSize: sf(14) }}
                />
              </div>
              <div>
                <label className="block mb-1" style={{ fontSize: sf(12), fontWeight: 600, color: P.textSecondary }}>Email address</label>
                <input
                  type="email"
                  value={invEmail}
                  onChange={e => setInvEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl px-4 py-2.5 outline-none"
                  style={{ background: P.surface, border: `1px solid ${P.divider}`, color: P.text, fontSize: sf(14) }}
                />
              </div>
            </div>

            <button
              disabled={!invName.trim() || !invEmail.trim()}
              className="w-full flex items-center justify-center gap-2 mt-5 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: invName.trim() && invEmail.trim() ? mt.color : P.dim,
                color: "white",
                opacity: invName.trim() && invEmail.trim() ? 1 : 0.5,
              }}
            >
              <IconCheck size={15} /> Schedule Event
            </button>

            <p className="text-center mt-3" style={{ fontSize: "11px", color: P.dim }}>
              By confirming, you agree to share your name and email with the host.
            </p>
          </motion.div>
        )}
      </div>
    </>
  );
}
