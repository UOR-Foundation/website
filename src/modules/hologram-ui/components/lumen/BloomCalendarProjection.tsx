/**
 * BloomCalendarProjection — Compact calendar view in the bloom
 * ═══════════════════════════════════════════════════════════════
 *
 * Shows today's events and upcoming schedule in a minimal,
 * timeline-style layout.
 *
 * @module hologram-ui/components/lumen/BloomCalendarProjection
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PP } from "@/modules/hologram-ui/theme/portal-palette";
import { format, isToday, isTomorrow, parseISO, startOfDay, addDays } from "date-fns";

interface CalEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
  color: string | null;
  all_day: boolean;
}

export default function BloomCalendarProjection() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || cancelled) { setLoading(false); return; }

      const now = startOfDay(new Date());
      const weekEnd = addDays(now, 7);

      const { data } = await supabase
        .from("calendar_events")
        .select("id, title, start_time, end_time, location, color, all_day")
        .eq("user_id", session.user.id)
        .gte("start_time", now.toISOString())
        .lte("start_time", weekEnd.toISOString())
        .order("start_time", { ascending: true })
        .limit(20);

      if (!cancelled) {
        setEvents(data ?? []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div
          className="w-6 h-6 rounded-full border-2 animate-spin"
          style={{ borderColor: `${PP.accent}30`, borderTopColor: PP.accent }}
        />
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
        <CalendarDays className="w-10 h-10" strokeWidth={0.8} style={{ color: PP.textWhisper, opacity: 0.3 }} />
        <p
          className="text-center leading-relaxed"
          style={{ fontFamily: PP.fontDisplay, fontSize: "18px", fontWeight: 300, color: PP.textSecondary }}
        >
          Your week is clear
        </p>
        <p
          className="text-center"
          style={{ fontFamily: PP.font, fontSize: "13px", color: PP.textWhisper, maxWidth: 240 }}
        >
          No upcoming events. Use the calendar to schedule meetings and track your commitments.
        </p>
      </div>
    );
  }

  // Group events by day label
  const grouped = events.reduce<Record<string, CalEvent[]>>((acc, ev) => {
    const d = parseISO(ev.start_time);
    const label = isToday(d) ? "Today" : isTomorrow(d) ? "Tomorrow" : format(d, "EEEE, MMM d");
    if (!acc[label]) acc[label] = [];
    acc[label].push(ev);
    return acc;
  }, {});

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
      {Object.entries(grouped).map(([dayLabel, dayEvents]) => (
        <div key={dayLabel}>
          <p
            className="mb-2 px-1"
            style={{
              fontFamily: PP.font,
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: PP.textWhisper,
              opacity: 0.7,
            }}
          >
            {dayLabel}
          </p>
          <div className="space-y-2">
            {dayEvents.map((ev, i) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, ease: [0.23, 1, 0.32, 1] }}
                className="flex gap-3 px-4 py-3 rounded-xl"
                style={{ background: PP.canvasSubtle, border: `1px solid ${PP.bloomCardBorder}` }}
              >
                {/* Time accent bar */}
                <div
                  className="w-[3px] rounded-full self-stretch"
                  style={{ background: ev.color || PP.accent, opacity: 0.6 }}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="truncate"
                    style={{ fontFamily: PP.font, fontSize: "14px", color: PP.text, fontWeight: 400 }}
                  >
                    {ev.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" strokeWidth={1.3} style={{ color: PP.textWhisper, opacity: 0.6 }} />
                      <span style={{ fontFamily: PP.font, fontSize: "11px", color: PP.textWhisper }}>
                        {ev.all_day ? "All day" : `${format(parseISO(ev.start_time), "h:mm a")} – ${format(parseISO(ev.end_time), "h:mm a")}`}
                      </span>
                    </div>
                    {ev.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" strokeWidth={1.3} style={{ color: PP.textWhisper, opacity: 0.6 }} />
                        <span
                          className="truncate max-w-[120px]"
                          style={{ fontFamily: PP.font, fontSize: "11px", color: PP.textWhisper }}
                        >
                          {ev.location}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
