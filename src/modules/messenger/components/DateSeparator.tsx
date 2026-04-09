interface Props {
  date: string;
}

export default function DateSeparator({ date }: Props) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  let label: string;
  if (d.toDateString() === today.toDateString()) {
    label = "Today";
  } else if (d.toDateString() === yesterday.toDateString()) {
    label = "Yesterday";
  } else {
    label = d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  }

  return (
    <div className="flex justify-center my-3">
      <span className="bg-white/[0.04] border border-white/[0.06] text-white/30 text-[11px] rounded-lg px-3 py-1">
        {label}
      </span>
    </div>
  );
}
