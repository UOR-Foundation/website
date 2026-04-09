import type { GroupMember } from "../lib/types";

interface Props {
  members?: GroupMember[];
  groupName?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { container: "w-10 h-10", text: "text-xs" },
  md: { container: "w-11 h-11", text: "text-sm" },
  lg: { container: "w-20 h-20", text: "text-2xl" },
};

export default function GroupAvatar({ members, groupName, size = "md" }: Props) {
  const s = sizes[size];
  const initials = (groupName ?? "G").slice(0, 2).toUpperCase();

  // If we have 2-4 members, show a composite avatar
  if (members && members.length >= 2 && members.length <= 4 && size !== "sm") {
    const shown = members.slice(0, 4);
    return (
      <div className={`${s.container} rounded-full bg-gradient-to-br from-indigo-500/20 to-teal-500/20 border border-white/[0.08] flex flex-wrap items-center justify-center overflow-hidden relative flex-shrink-0`}>
        {shown.map((m, i) => {
          const letter = (m.displayName ?? m.userId).charAt(0).toUpperCase();
          const pos = shown.length === 2
            ? i === 0 ? "top-0 left-0 w-1/2 h-full" : "top-0 right-0 w-1/2 h-full"
            : shown.length === 3
              ? i === 0 ? "top-0 left-0 w-1/2 h-1/2" : i === 1 ? "top-0 right-0 w-1/2 h-1/2" : "bottom-0 left-1/4 w-1/2 h-1/2"
              : i === 0 ? "top-0 left-0 w-1/2 h-1/2" : i === 1 ? "top-0 right-0 w-1/2 h-1/2" : i === 2 ? "bottom-0 left-0 w-1/2 h-1/2" : "bottom-0 right-0 w-1/2 h-1/2";
          return (
            <div
              key={m.userId}
              className={`absolute ${pos} flex items-center justify-center text-[9px] text-white/60 font-medium`}
            >
              {m.uorGlyph ?? letter}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`${s.container} rounded-full bg-gradient-to-br from-indigo-500/25 to-teal-500/25 border border-white/[0.08] flex items-center justify-center ${s.text} font-medium text-white/60 flex-shrink-0`}>
      {initials}
    </div>
  );
}
