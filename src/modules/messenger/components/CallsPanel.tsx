import { ArrowLeft, Phone, Video, PhoneIncoming, PhoneMissed, PhoneOutgoing } from "lucide-react";

interface Props {
  onBack: () => void;
}

const MOCK_CALLS = [
  { id: "1", name: "Alice", type: "outgoing" as const, media: "video" as const, time: "Today, 2:30 PM", duration: "12:34" },
  { id: "2", name: "Bob", type: "missed" as const, media: "audio" as const, time: "Today, 11:15 AM", duration: null },
  { id: "3", name: "Carol", type: "incoming" as const, media: "audio" as const, time: "Yesterday, 9:45 PM", duration: "5:21" },
  { id: "4", name: "Dave", type: "outgoing" as const, media: "video" as const, time: "Yesterday, 3:00 PM", duration: "45:02" },
];

export default function CallsPanel({ onBack }: Props) {
  const getIcon = (type: string) => {
    switch (type) {
      case "incoming": return <PhoneIncoming size={16} className="text-green-400/60" />;
      case "missed": return <PhoneMissed size={16} className="text-red-400/60" />;
      case "outgoing": return <PhoneOutgoing size={16} className="text-teal-400/60" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/80">
      <div className="h-[60px] flex items-center gap-3 px-4 border-b border-white/[0.04] flex-shrink-0">
        <button onClick={onBack} className="text-white/50 hover:text-white/80 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg text-white/90 font-semibold">Calls</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {MOCK_CALLS.map((call) => (
          <div key={call.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors duration-100">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500/25 to-indigo-500/25 border border-white/[0.08] flex items-center justify-center text-sm font-medium text-white/60">
              {call.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[14px] ${call.type === "missed" ? "text-red-400/80" : "text-white/85"}`}>
                {call.name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {getIcon(call.type)}
                <span className="text-[12px] text-white/30">{call.time}</span>
                {call.duration && <span className="text-[12px] text-white/20">· {call.duration}</span>}
              </div>
            </div>
            <button className="text-white/25 hover:text-teal-400/60 transition-colors">
              {call.media === "video" ? <Video size={20} /> : <Phone size={20} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
