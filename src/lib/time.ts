// All game days roll over at midnight Eastern Time (spec §1).
const ET = "America/New_York";

export function todayET(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ET }).format(new Date());
}

export function displayDateET(iso?: string): string {
  const d = iso ? new Date(`${iso}T12:00:00Z`) : new Date();
  return new Intl.DateTimeFormat("en-US", {
    timeZone: iso ? "UTC" : ET,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

// Milliseconds until the next midnight ET.
export function msUntilMidnightET(): number {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) =>
    parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
  const h = get("hour") % 24;
  const elapsed = (h * 3600 + get("minute") * 60 + get("second")) * 1000;
  return 24 * 3600 * 1000 - elapsed;
}
