/**
 * MessengerCalendar — Built-in Calendar with Event Creation from Messages
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Monthly grid view with availability checking and message-to-event flow.
 * Schema designed for future Google/Outlook sync.
 *
 * @module hologram-ui/components/messenger/MessengerCalendar
 */

import { useState, useMemo, useCallback } from "react";
import {
  IconChevronLeft, IconChevronRight, IconPlus, IconX,
  IconClock, IconMapPin, IconCalendarEvent, IconCheck,
  IconUsers,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { sf } from "@/modules/hologram-ui/utils/scaledFontSize";

// ── Types ──

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  allDay?: boolean;
  location?: string;
  color: string;
  sourceMessageId?: string;
  sourcePlatform?: string;
  attendees?: string[];
  status: "confirmed" | "tentative" | "cancelled";
}

interface MessengerCalendarProps {
  P: Record<string, string>;
  font: string;
  serif: string;
  events: CalendarEvent[];
  onCreateEvent: (event: Omit<CalendarEvent, "id">) => void;
  onDeleteEvent?: (id: string) => void;
  suggestedEvent?: Partial<CalendarEvent> | null;
  onClearSuggestion?: () => void;
}

// ── Helpers ──

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday-based
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

// ── Event colors ──

const EVENT_COLORS = [
  "hsl(220, 80%, 56%)",
  "hsl(152, 55%, 42%)",
  "hsl(38, 70%, 50%)",
  "hsl(0, 65%, 52%)",
  "hsl(265, 55%, 60%)",
  "hsl(180, 50%, 45%)",
];

// ── Component ──

export default function MessengerCalendar({
  P, font, serif, events, onCreateEvent, onDeleteEvent,
  suggestedEvent, onClearSuggestion,
}: MessengerCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  // New event form state
  const [newTitle, setNewTitle] = useState("");
  const [newStartHour, setNewStartHour] = useState("10");
  const [newStartMin, setNewStartMin] = useState("00");
  const [newEndHour, setNewEndHour] = useState("11");
  const [newEndMin, setNewEndMin] = useState("00");
  const [newLocation, setNewLocation] = useState("");
  const [newColor, setNewColor] = useState(EVENT_COLORS[0]);
  const [newAllDay, setNewAllDay] = useState(false);

  // Apply suggestion if present
  useMemo(() => {
    if (suggestedEvent) {
      if (suggestedEvent.title) setNewTitle(suggestedEvent.title);
      if (suggestedEvent.location) setNewLocation(suggestedEvent.location);
      if (suggestedEvent.startTime) {
        setSelectedDay(suggestedEvent.startTime.getDate());
        setViewMonth(suggestedEvent.startTime.getMonth());
        setViewYear(suggestedEvent.startTime.getFullYear());
        setNewStartHour(String(suggestedEvent.startTime.getHours()).padStart(2, "0"));
        setNewStartMin(String(suggestedEvent.startTime.getMinutes()).padStart(2, "0"));
      }
      if (suggestedEvent.endTime) {
        setNewEndHour(String(suggestedEvent.endTime.getHours()).padStart(2, "0"));
        setNewEndMin(String(suggestedEvent.endTime.getMinutes()).padStart(2, "0"));
      }
      setCreating(true);
    }
  }, [suggestedEvent]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  const eventsThisMonth = useMemo(() =>
    events.filter(e => {
      const d = e.startTime;
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
    }),
    [events, viewYear, viewMonth]
  );

  const eventsOnDay = useCallback((day: number) =>
    eventsThisMonth.filter(e => e.startTime.getDate() === day),
    [eventsThisMonth]
  );

  const selectedDayEvents = selectedDay !== null ? eventsOnDay(selectedDay) : [];

  const navigate = (dir: -1 | 1) => {
    let m = viewMonth + dir;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m);
    setViewYear(y);
    setSelectedDay(null);
  };

  const handleCreate = () => {
    if (!newTitle.trim() || selectedDay === null) return;
    const start = new Date(viewYear, viewMonth, selectedDay, parseInt(newStartHour), parseInt(newStartMin));
    const end = new Date(viewYear, viewMonth, selectedDay, parseInt(newEndHour), parseInt(newEndMin));
    onCreateEvent({
      title: newTitle.trim(),
      startTime: start,
      endTime: end,
      allDay: newAllDay,
      location: newLocation || undefined,
      color: newColor,
      status: "confirmed",
      sourceMessageId: suggestedEvent?.sourceMessageId,
      sourcePlatform: suggestedEvent?.sourcePlatform,
    });
    setNewTitle("");
    setNewLocation("");
    setCreating(false);
    onClearSuggestion?.();
  };

  // Check if a time slot is busy
  const isBusy = useCallback((day: number, hour: number) => {
    return eventsOnDay(day).some(e => {
      const sh = e.startTime.getHours();
      const eh = e.endTime.getHours();
      return hour >= sh && hour < eh;
    });
  }, [eventsOnDay]);

  return (
    <div className="flex flex-col h-full" style={{ background: P.bg, fontFamily: font }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${P.divider}` }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-7 h-7 rounded-md flex items-center justify-center" style={{ color: P.muted }}>
            <IconChevronLeft size={16} />
          </button>
          <h3 style={{ fontSize: sf(17), fontWeight: 600, color: P.text, fontFamily: serif }}>
            {MONTHS[viewMonth]} {viewYear}
          </h3>
          <button onClick={() => navigate(1)} className="w-7 h-7 rounded-md flex items-center justify-center" style={{ color: P.muted }}>
            <IconChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelectedDay(today.getDate()); }}
            className="px-3 py-1.5 rounded-md text-xs font-medium"
            style={{ color: P.accent, background: P.accentSoft }}
          >
            Today
          </button>
          {selectedDay !== null && (
            <button
              onClick={() => setCreating(true)}
              className="w-7 h-7 rounded-md flex items-center justify-center"
              style={{ color: P.accent, background: P.accentSoft }}
            >
              <IconPlus size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Day headers */}
        <div className="grid grid-cols-7 px-3 pt-3 pb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center" style={{ fontSize: sf(11), fontWeight: 600, color: P.dim, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-px px-3 pb-2 flex-1">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = isSameDay(new Date(viewYear, viewMonth, day), today);
            const isSelected = selectedDay === day;
            const dayEvents = eventsOnDay(day);
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className="flex flex-col items-center rounded-lg py-1 transition-colors relative"
                style={{
                  background: isSelected ? P.accentSoft : "transparent",
                  minHeight: "44px",
                }}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                  style={{
                    background: isToday ? P.accent : "transparent",
                    color: isToday ? "white" : isSelected ? P.accent : P.text,
                    fontWeight: isToday ? 700 : 400,
                  }}
                >
                  {day}
                </span>
                {/* Event dots */}
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((e, j) => (
                      <div key={j} className="w-[4px] h-[4px] rounded-full" style={{ background: e.color }} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day detail / Event list */}
        {selectedDay !== null && (
          <div className="shrink-0 px-4 pb-3 overflow-y-auto" style={{ borderTop: `1px solid ${P.divider}`, maxHeight: "220px" }}>
            <div className="flex items-center justify-between py-3">
              <span style={{ fontSize: sf(13), fontWeight: 600, color: P.text }}>
                {MONTHS[viewMonth]} {selectedDay}
              </span>
              <span style={{ fontSize: sf(11), color: P.dim }}>
                {selectedDayEvents.length === 0 ? "No events" : `${selectedDayEvents.length} event${selectedDayEvents.length > 1 ? "s" : ""}`}
              </span>
            </div>
            {selectedDayEvents.length === 0 ? (
              <div className="flex flex-col items-center py-4 gap-2">
                <IconCalendarEvent size={20} style={{ color: P.dim }} />
                <span style={{ fontSize: sf(12), color: P.dim }}>Open day — you're available</span>
                <button
                  onClick={() => setCreating(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium mt-1"
                  style={{ color: P.accent, background: P.accentSoft }}
                >
                  <IconPlus size={12} /> Create event
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map(e => (
                  <div
                    key={e.id}
                    className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg"
                    style={{ background: `${e.color}10`, border: `1px solid ${e.color}20` }}
                  >
                    <div className="w-[3px] h-8 rounded-full shrink-0 mt-0.5" style={{ background: e.color }} />
                    <div className="min-w-0 flex-1">
                      <div style={{ fontSize: sf(13), fontWeight: 500, color: P.text }}>{e.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <IconClock size={11} style={{ color: P.dim }} />
                        <span style={{ fontSize: sf(11), color: P.muted }}>
                          {e.allDay ? "All day" : `${formatTime(e.startTime)} – ${formatTime(e.endTime)}`}
                        </span>
                      </div>
                      {e.location && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <IconMapPin size={11} style={{ color: P.dim }} />
                          <span style={{ fontSize: sf(11), color: P.muted }}>{e.location}</span>
                        </div>
                      )}
                    </div>
                    {onDeleteEvent && (
                      <button onClick={() => onDeleteEvent(e.id)} className="shrink-0" style={{ color: P.dim }}>
                        <IconX size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Availability heatmap for selected day */}
            <div className="mt-3">
              <span style={{ fontSize: sf(10), fontWeight: 600, color: P.dim, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Availability
              </span>
              <div className="flex gap-0.5 mt-1.5">
                {Array.from({ length: 12 }).map((_, i) => {
                  const hour = i + 8; // 8am - 8pm
                  const busy = isBusy(selectedDay, hour);
                  return (
                    <div
                      key={hour}
                      className="flex-1 h-3 rounded-sm relative group cursor-default"
                      style={{ background: busy ? `${P.red}30` : `${P.green}20` }}
                      title={`${hour}:00 — ${busy ? "Busy" : "Free"}`}
                    >
                      {i % 3 === 0 && (
                        <span className="absolute -bottom-3.5 left-0 text-[8px]" style={{ color: P.dim }}>{hour}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="h-4" />
            </div>
          </div>
        )}
      </div>

      {/* ── Create event drawer ── */}
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
                <span style={{ fontSize: sf(13), fontWeight: 600, color: P.text }}>New Event</span>
                <button onClick={() => { setCreating(false); onClearSuggestion?.(); }} style={{ color: P.dim }}>
                  <IconX size={14} />
                </button>
              </div>

              <input
                autoFocus
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Event title"
                className="w-full rounded-lg px-3 py-2 outline-none mb-2"
                style={{ background: P.surface, border: `1px solid ${P.divider}`, color: P.text, fontSize: sf(14), fontFamily: font }}
              />

              {!newAllDay && (
                <div className="flex items-center gap-2 mb-2">
                  <IconClock size={13} style={{ color: P.dim }} />
                  <input value={newStartHour} onChange={e => setNewStartHour(e.target.value)} className="w-10 rounded px-1.5 py-1 text-center outline-none" style={{ background: P.surface, border: `1px solid ${P.divider}`, color: P.text, fontSize: sf(13) }} />
                  <span style={{ color: P.dim }}>:</span>
                  <input value={newStartMin} onChange={e => setNewStartMin(e.target.value)} className="w-10 rounded px-1.5 py-1 text-center outline-none" style={{ background: P.surface, border: `1px solid ${P.divider}`, color: P.text, fontSize: sf(13) }} />
                  <span style={{ fontSize: sf(12), color: P.dim }}>→</span>
                  <input value={newEndHour} onChange={e => setNewEndHour(e.target.value)} className="w-10 rounded px-1.5 py-1 text-center outline-none" style={{ background: P.surface, border: `1px solid ${P.divider}`, color: P.text, fontSize: sf(13) }} />
                  <span style={{ color: P.dim }}>:</span>
                  <input value={newEndMin} onChange={e => setNewEndMin(e.target.value)} className="w-10 rounded px-1.5 py-1 text-center outline-none" style={{ background: P.surface, border: `1px solid ${P.divider}`, color: P.text, fontSize: sf(13) }} />
                </div>
              )}

              <div className="flex items-center gap-3 mb-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={newAllDay} onChange={e => setNewAllDay(e.target.checked)} className="rounded" />
                  <span style={{ fontSize: sf(12), color: P.muted }}>All day</span>
                </label>
              </div>

              <input
                value={newLocation}
                onChange={e => setNewLocation(e.target.value)}
                placeholder="Location (optional)"
                className="w-full rounded-lg px-3 py-2 outline-none mb-3"
                style={{ background: P.surface, border: `1px solid ${P.divider}`, color: P.text, fontSize: sf(13), fontFamily: font }}
              />

              {/* Color picker */}
              <div className="flex items-center gap-1.5 mb-3">
                {EVENT_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: c, border: newColor === c ? "2px solid white" : "none", boxShadow: newColor === c ? `0 0 0 1px ${c}` : "none" }}
                  >
                    {newColor === c && <IconCheck size={10} style={{ color: "white" }} />}
                  </button>
                ))}
              </div>

              <button
                onClick={handleCreate}
                disabled={!newTitle.trim()}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: newTitle.trim() ? P.accent : P.surface,
                  color: newTitle.trim() ? "white" : P.dim,
                }}
              >
                <IconCalendarEvent size={14} />
                Create Event
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
