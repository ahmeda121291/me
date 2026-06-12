import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/constants";

export const runtime = "edge";

const serifBold = fetch(
  new URL("../../../../../assets/SourceSerif4-Bold.ttf", import.meta.url),
).then((r) => r.arrayBuffer());
const plexMono = fetch(
  new URL("../../../../../assets/IBMPlexMono-Medium.ttf", import.meta.url),
).then((r) => r.arrayBuffer());

// Mode-run result card (1200×630). `data` is base64url JSON:
// { q: mode question, r: right, t: total, k: best run, c: crowd-only count }.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ data: string }> },
) {
  const { data } = await params;
  let parsed: { q: string; r: number; t: number; k: number; c: number };
  try {
    parsed = JSON.parse(atob(data.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    parsed = { q: "The Modes", r: 0, t: 0, k: 0, c: 0 };
  }
  const crowdOnly = parsed.t === 0 && parsed.c > 0;

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
          padding: 56,
          fontFamily: "Serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "Plex",
            fontSize: 24,
            letterSpacing: 6,
            opacity: 0.7,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width={30} height={30} viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="21" stroke="#9C6B2F" strokeWidth="3" />
              <path d="M24 3v42" stroke="#9C6B2F" strokeWidth="3" />
              <path d="M3 24h42" stroke="#9C6B2F" strokeWidth="3" />
              <path d="M9 9.5c5 4.5 8 9 8 14.5s-3 10-8 14.5" stroke="#9C6B2F" strokeWidth="3" />
              <path d="M39 9.5c-5 4.5-8 9-8 14.5s3 10 8 14.5" stroke="#9C6B2F" strokeWidth="3" />
            </svg>
            <span>{SITE_NAME.toUpperCase()}</span>
          </div>
          <span>THE MODES</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 700 }}>
            {parsed.q}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 28,
              fontFamily: "Plex",
            }}
          >
            <span style={{ fontSize: 150, fontWeight: 700, color: "#9C6B2F" }}>
              {crowdOnly ? parsed.c : `${parsed.r}/${parsed.t}`}
            </span>
            <span style={{ fontSize: 34, opacity: 0.7 }}>
              {crowdOnly ? "verdicts cast" : "called blind"}
            </span>
            {!crowdOnly && parsed.k >= 2 ? (
              <span style={{ fontSize: 34, color: "#9C6B2F" }}>
                ▲ {parsed.k}-straight run
              </span>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "2px solid rgba(25,21,17,0.15)",
            paddingTop: 22,
            fontSize: 26,
            fontStyle: "italic",
            opacity: 0.75,
          }}
        >
          <span>Can you read a season blind? No names. Your call.</span>
          <span style={{ fontFamily: "Plex", fontStyle: "normal" }}>
            playfirstballot.com/play
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Serif", data: await serifBold, weight: 700 },
        { name: "Plex", data: await plexMono, weight: 500 },
      ],
    },
  );
}
