import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { SITE_NAME } from "@/lib/constants";

export const runtime = "edge";

const serifBold = fetch(
  new URL("../../../../../assets/SourceSerif4-Bold.ttf", import.meta.url),
).then((r) => r.arrayBuffer());
const plexMono = fetch(
  new URL("../../../../../assets/IBMPlexMono-Medium.ttf", import.meta.url),
).then((r) => r.arrayBuffer());

// Voter Profile share card (spec §8 artifact 4). `data` is base64url JSON:
// { a: archetype, s: [5 spectrum values -100..100], ha: hall_agreement 0..1,
//   n: verdict count }. 1200×630 default, 1080×1920 with ?fmt=story.
const LABELS = ["Big hall", "Stats", "Longevity", "Era neutral", "Defense"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ data: string }> },
) {
  const { data } = await params;
  const story = req.nextUrl.searchParams.get("fmt") === "story";
  const W = story ? 1080 : 1200;
  const H = story ? 1920 : 630;

  let parsed: { a: string; s: number[]; ha: number; n: number };
  try {
    parsed = JSON.parse(atob(data.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    parsed = { a: "The Voter", s: [0, 0, 0, 0, 0], ha: 0, n: 0 };
  }

  // Voter DNA pentagon.
  const cx = story ? 540 : 320;
  const cy = story ? 760 : 330;
  const r = story ? 260 : 150;
  const pt = (i: number, scale: number) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return `${cx + Math.cos(ang) * r * scale},${cy + Math.sin(ang) * r * scale}`;
  };
  const ring = (s: number) => Array.from({ length: 5 }, (_, i) => pt(i, s)).join(" ");
  const dna = parsed.s
    .map((v, i) => pt(i, Math.max(0.1, (v + 100) / 200)))
    .join(" ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#F6F1E7",
          color: "#191511",
          padding: story ? 64 : 48,
          fontFamily: "Serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: story ? 34 : 24, letterSpacing: 6, opacity: 0.7, fontFamily: "Plex" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width={story ? 38 : 30} height={story ? 38 : 30} viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="21" stroke="#9C6B2F" strokeWidth="3" />
              <path d="M24 3v42" stroke="#9C6B2F" strokeWidth="3" />
              <path d="M3 24h42" stroke="#9C6B2F" strokeWidth="3" />
              <path d="M9 9.5c5 4.5 8 9 8 14.5s-3 10-8 14.5" stroke="#9C6B2F" strokeWidth="3" />
              <path d="M39 9.5c-5 4.5-8 9-8 14.5s3 10 8 14.5" stroke="#9C6B2F" strokeWidth="3" />
            </svg>
            <span>{SITE_NAME.toUpperCase()}</span>
          </div>
          <span>VOTER PROFILE</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: story ? "center" : "flex-start" }}>
          <span style={{ fontSize: story ? 88 : 72, fontWeight: 700, color: "#9C6B2F" }}>
            {parsed.a}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 40, marginTop: 20 }}>
            <svg width={story ? 700 : 460} height={story ? 640 : 360} viewBox={`0 0 ${cx * 2} ${cy + r + 60}`}>
              {[0.33, 0.66, 1].map((s) => (
                <polygon key={s} points={ring(s)} fill="none" stroke="#191511" strokeOpacity={0.15} />
              ))}
              <polygon points={dna} fill="#9C6B2F" fillOpacity={0.35} stroke="#9C6B2F" strokeWidth={4} />
              {LABELS.map((l, i) => {
                const ang = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
                return (
                  <text
                    key={l}
                    x={cx + Math.cos(ang) * (r + 36)}
                    y={cy + Math.sin(ang) * (r + 28)}
                    textAnchor="middle"
                    fontSize={story ? 26 : 18}
                    fill="#191511"
                    opacity={0.7}
                  >
                    {l}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: story ? 34 : 26 }}>
          <span style={{ opacity: 0.75 }}>
            Hall agreement {Math.round(parsed.ha * 100)}% · based on {parsed.n} blind verdicts
          </span>
          <span style={{ fontStyle: "italic", opacity: 0.6 }}>No names. Your call.</span>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [
        { name: "Serif", data: await serifBold, weight: 700 },
        { name: "Plex", data: await plexMono, weight: 500 },
      ],
    },
  );
}
