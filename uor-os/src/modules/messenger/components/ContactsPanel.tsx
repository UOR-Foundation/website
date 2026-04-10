import { ArrowLeft, Search, UserRound } from "lucide-react";
import { useState, useMemo } from "react";
import type { Conversation } from "../lib/types";

interface Props {
  conversations: Conversation[];
  onBack: () => void;
  onSelectConversation: (id: string) => void;
}

export default function ContactsPanel({ conversations, onBack, onSelectConversation }: Props) {
  const [search, setSearch] = useState("");

  const contacts = useMemo(() => {
    const map = new Map<string, { name: string; handle?: string; glyph?: string; convoId: string; online?: boolean }>();
    for (const c of conversations) {
      if (c.sessionType === "group") continue;
      map.set(c.peer.userId, {
        name: c.peer.displayName,
        handle: c.peer.handle,
        glyph: c.peer.uorGlyph,
        convoId: c.id,
      });
    }
    return Array.from(map.values())
      .filter(ct => !search || ct.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [conversations, search]);

  // Group by first letter
  const grouped = useMemo(() => {
    const groups = new Map<string, typeof contacts>();
    for (const c of contacts) {
      const letter = c.name.charAt(0).toUpperCase();
      if (!groups.has(letter)) groups.set(letter, []);
      groups.get(letter)!.push(c);
    }
    return groups;
  }, [contacts]);

  return (
    <div className="flex flex-col h-full bg-slate-950/80">
      {/* Header */}
      <div className="h-[60px] flex items-center gap-3 px-4 border-b border-white/[0.04] flex-shrink-0">
        <button onClick={onBack} className="text-white/50 hover:text-white/80 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg text-white/90 font-semibold">Contacts</h2>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts…"
            className="w-full h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/80 text-[13px] pl-8 pr-3 outline-none placeholder:text-white/20 focus:border-teal-500/30 transition-colors"
          />
        </div>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {Array.from(grouped.entries()).map(([letter, contacts]) => (
          <div key={letter}>
            <div className="px-4 py-1.5 text-[11px] font-semibold text-teal-400/50 uppercase">{letter}</div>
            {contacts.map((contact) => (
              <button
                key={contact.convoId}
                onClick={() => onSelectConversation(contact.convoId)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors duration-100"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500/25 to-indigo-500/25 border border-white/[0.08] flex items-center justify-center text-sm font-medium text-white/60 flex-shrink-0">
                  {contact.glyph ?? contact.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[14px] text-white/85 truncate">{contact.name}</p>
                  {contact.handle && (
                    <p className="text-[12px] text-white/30 truncate">@{contact.handle}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        ))}
        {contacts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-white/20">
            <UserRound size={32} className="mb-2" />
            <p className="text-sm">No contacts found</p>
          </div>
        )}
      </div>
    </div>
  );
}
