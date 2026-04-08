import { Phone, Video, Search, MoreVertical } from "lucide-react";
import type { Contact } from "../lib/mock-data";

interface Props {
  contact: Contact;
  onBack?: () => void;
}

export default function ContactHeader({ contact, onBack }: Props) {
  const statusText = contact.status === "online"
    ? "online"
    : contact.status === "typing"
      ? "typing…"
      : contact.lastSeen
        ? `last seen ${contact.lastSeen}`
        : "offline";

  return (
    <div className="h-[60px] bg-[#202c33] flex items-center px-4 gap-3 border-b border-[#2a3942] flex-shrink-0">
      {/* Mobile back button */}
      {onBack && (
        <button onClick={onBack} className="md:hidden text-[#aebac1] mr-1">
          ←
        </button>
      )}

      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
        style={{ backgroundColor: contact.avatarColor }}
      >
        {contact.initials}
      </div>

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <div className="text-[16px] text-[#e9edef] font-normal leading-tight truncate">
          {contact.name}
        </div>
        <div className={`text-[13px] leading-tight truncate ${
          contact.status === "typing" ? "text-[#00a884]" : "text-[#8696a0]"
        }`}>
          {statusText}
        </div>
      </div>

      {/* Action icons */}
      <div className="flex items-center gap-5 text-[#aebac1]">
        <button className="hover:text-[#e9edef] transition-colors hidden sm:block"><Video size={20} /></button>
        <button className="hover:text-[#e9edef] transition-colors hidden sm:block"><Phone size={20} /></button>
        <button className="hover:text-[#e9edef] transition-colors"><Search size={20} /></button>
        <button className="hover:text-[#e9edef] transition-colors"><MoreVertical size={20} /></button>
      </div>
    </div>
  );
}
