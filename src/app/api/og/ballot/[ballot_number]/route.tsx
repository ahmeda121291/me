import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { SITE_NAME } from "@/lib/constants";
import { rpc } from "@/lib/supabase";
import type { ShareData } from "@/lib/types";

export const runtime = "edge";

// Brand fonts embedded so satori renders the real design system
// (without these it silently falls back to a generic sans).
const serifBold = fetch(
  new URL("../../../../../assets/SourceSerif4-Bold.ttf", import.meta.url),
).then((r) => r.arrayBuffer());
const serifSemi = fetch(
  new URL("../../../../../assets/SourceSerif4-Semibold.ttf", import.meta.url),
).then((r) => r.arrayBuffer());
const plexMono = fetch(
  new URL("../../../../../assets/IBMPlexMono-Medium.ttf", import.meta.url),
).then((r) => r.arrayBuffer());

const ERA_TINT: Record<string, string> = {
  "1950s": "#EDE3C8",
  "1960s": "#EDE3C8",
  "1970s": "#F0DCC4",
  "1980s": "#F0DCC4",
  "1990s": "#E3E4E0",
  "2000s": "#F1EDE3",
  "2010s": "#F1EDE3",
  "2020s": "#F1EDE3",
};

// Share images (spec §8): 1200×630 OG default, 1080×1920 with ?fmt=story.
// ?spoiler=1 hides the player name; ?v= stamps the sharer's verdict; ?s= streak.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ballot_number: string }> },
) {
  const { ballot_number } = await params;
  const data = await rpc<ShareData>("api_ballot_share", {
    p_ballot_number: Number(ballot_number),
  });

  const q = req.nextUrl.searchParams;
  const story = q.get("fmt") === "story";
  const spoiler = q.get("spoiler") === "1";
  const verdict = q.get("v");
  const streak = q.get("s");

  const W = story ? 1080 : 1200;
  const H = story ? 1920 : 630;

  const fonts = [
    { name: "Serif", data: await serifSemi, weight: 600 as const },
    { name: "Serif", data: await serifBold, weight: 700 as const },
    { name: "Plex", data: await plexMono, weight: 500 as const },
  ];

  if (!data) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#F6F1E7",
            color: "#191511",
            fontSize: 64,
            fontFamily: "Serif",
          }}
        >
          {SITE_NAME}
        </div>
      ),
      { width: W, height: H, fonts },
    );
  }

  const era = data.payload.era_band.match(/(\d{4}s)/)?.[1] ?? "2000s";
  const tint = ERA_TINT[era] ?? "#F1EDE3";
  const c = data.payload.career;
  const a = data.payload.accolades;
  const total = Object.values(data.split).reduce((x, y) => x + y, 0);
  const inPct = total
    ? Math.round(((data.split["IN"] ?? 0) / total) * 100)
    : null;
  const isIn = verdict === "IN" || verdict === "YES";

  const stat = (label: string, value: string) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <span style={{ fontSize: story ? 76 : 48, fontFamily: "Plex" }}>{value}</span>
      <span style={{ fontSize: story ? 28 : 20, opacity: 0.6, letterSpacing: 4, fontFamily: "Plex" }}>
        {label}
      </span>
    </div>
  );

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
          padding: story ? "100px 64px" : 48,
          fontFamily: "Serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: story ? 34 : 26,
            letterSpacing: 6,
            opacity: 0.7,
            fontFamily: "Plex",
          }}
        >
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
          <span>BALLOT NO. {data.ballot_number}</span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: tint,
            borderRadius: 32,
            border: "2px solid rgba(25,21,17,0.15)",
            padding: story ? "72px 56px" : 40,
            position: "relative",
            gap: story ? 56 : 24,
            // In story format the stamp gets its own headroom so it never
            // collides with the name. (Conditional spread — satori crashes
            // on style values that are literally `undefined`.)
            ...(story && verdict ? { paddingTop: 200 } : {}),
          }}
        >
          {verdict && (
            <div
              style={{
                position: "absolute",
                top: story ? 48 : 24,
                right: story ? 48 : 32,
                transform: "rotate(-10deg)",
                border: `10px solid ${isIn ? "#9C6B2F" : "#8E2A1F"}`,
                color: isIn ? "#9C6B2F" : "#8E2A1F",
                fontSize: story ? 96 : 72,
                fontWeight: 700,
                letterSpacing: 10,
                padding: "4px 28px",
                borderRadius: 12,
              }}
            >
              {verdict}
            </div>
          )}

          <span style={{ fontSize: story ? 40 : 28, fontStyle: "italic", opacity: 0.75 }}>
            {data.payload.era_band}
          </span>

          <span
            style={{
              fontSize: spoiler ? (story ? 68 : 48) : story ? 88 : 64,
              fontWeight: 700,
              letterSpacing: spoiler ? 12 : 0,
            }}
          >
            {spoiler ? "█████ ██████" : data.player_name}
          </span>

          <div style={{ display: "flex", gap: story ? 56 : 48 }}>
            {stat("PPG", c.ppg.toFixed(1))}
            {stat("RPG", c.rpg.toFixed(1))}
            {stat("APG", c.apg.toFixed(1))}
            {stat("GP", String(c.gp))}
          </div>

          <span style={{ fontSize: story ? 40 : 26, fontWeight: 600 }}>
            {a.allstar}× All-Star · {a.champ}× champion ·{" "}
            {a.mvp > 0 ? `${a.mvp}× MVP` : "0 MVPs"}
          </span>

          {inPct !== null && total >= 10 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  display: "flex",
                  height: story ? 28 : 20,
                  borderRadius: 999,
                  overflow: "hidden",
                  background: "rgba(25,21,17,0.08)",
                }}
              >
                <div style={{ width: `${inPct}%`, background: "#9C6B2F" }} />
                <div style={{ width: `${100 - inPct}%`, background: "#8E2A1F" }} />
              </div>
              <span style={{ fontSize: story ? 32 : 22, opacity: 0.75, fontFamily: "Plex" }}>
                IN {inPct}% · OUT {100 - inPct}% · {total.toLocaleString()} verdicts
              </span>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: story ? 32 : 26,
          }}
        >
          <span style={{ fontStyle: "italic", opacity: 0.7 }}>
            One career a day. No names. Your call.
          </span>
          {streak && (
            <span style={{ fontWeight: 600, color: "#9C6B2F", fontFamily: "Plex" }}>
              ▲ {streak}-day streak
            </span>
          )}
        </div>
      </div>
    ),
    { width: W, height: H, fonts },
  );
}
