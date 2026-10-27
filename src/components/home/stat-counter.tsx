/**
 * A headline number. Server-rendered with its real value: it used to count up
 * from 0 on the client, so the HTML — and anything reading it without
 * JavaScript, crawlers included — said "0+ Skills".
 */
export function StatCounter({
  value,
  label,
  suffix = "",
}: {
  value: number;
  label: string;
  suffix?: string;
}) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold tracking-tight sm:text-4xl">
        <span className="text-gradient">{value.toLocaleString("en-US")}</span>
        <span className="text-brand-2">{suffix}</span>
      </div>
      <p className="mt-1 text-xs uppercase tracking-widest text-muted">{label}</p>
    </div>
  );
}
