const TOOLS = [
  "Claude Code",
  "Cursor",
  "Codex CLI",
  "Windsurf",
  "Cline",
  "VS Code",
  "Claude Desktop",
  "Zed",
  "Continue",
  "Cody",
];

export function ToolMarquee() {
  return (
    <div
      className="relative flex overflow-hidden py-2"
      style={{ maskImage: "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)" }}
    >
      <div className="flex shrink-0 animate-marquee items-center gap-8 pr-8">
        {[...TOOLS, ...TOOLS].map((t, i) => (
          <span key={i} className="whitespace-nowrap text-sm font-medium text-muted-2">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
