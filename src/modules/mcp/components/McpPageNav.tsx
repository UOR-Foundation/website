const SECTIONS = [
  { id: "connect", label: "Connect to UOR's MCP server" },
  { id: "tools", label: "Tools" },
  { id: "resources", label: "Resources" },
  { id: "see-also", label: "See also" },
];

const McpPageNav = () => (
  <nav className="sticky top-20 space-y-1">
    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 font-body">
      On this page
    </p>
    {SECTIONS.map((s) => (
      <a
        key={s.id}
        href={`#${s.id}`}
        className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-1 font-body"
      >
        {s.label}
      </a>
    ))}
  </nav>
);

export default McpPageNav;
