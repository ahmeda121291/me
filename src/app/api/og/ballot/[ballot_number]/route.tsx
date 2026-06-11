import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { SITE_NAME } from "@/lib/constants";
import { rpc } from "@/lib/supabase";
import type { ShareData } from "@/lib/types";

export const runtime = "edge";

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
          }}
        >
          {SITE_NAME}
        </div>
      ),
      { width: W, height: H },
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
      <span style={{ fontSize: story ? 64 : 48, fontWeight: 600 }}>{value}</span>
      <span style={{ fontSize: story ? 26 : 20, opacity: 0.6, letterSpacing: 4 }}>
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
          padding: story ? 64 : 48,
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: story ? 34 : 26,
            letterSpacing: 6,
            opacity: 0.7,
          }}
        >
          <span>{SITE_NAME.toUpperCase()}</span>
          <span>BALLOT NO. {data.ballot_number}</span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: tint,
            borderRadius: 32,
            border: "2px solid rgba(25,21,17,0.15)",
            padding: story ? 56 : 40,
            position: "relative",
            gap: story ? 40 : 24,
          }}
        >
          {verdict && (
            <div
              style={{
                position: "absolute",
                top: story ? 40 : 24,
                right: story ? 40 : 32,
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

          <span style={{ fontSize: story ? 38 : 28, fontStyle: "italic", opacity: 0.75 }}>
            {data.payload.era_band}
          </span>

          <span
            style={{
              fontSize: spoiler ? (story ? 64 : 48) : story ? 84 : 64,
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

          <span style={{ fontSize: story ? 36 : 26, fontWeight: 500 }}>
            {a.allstar}× All-Star · {a.champ}× champion ·{" "}
            {a.mvp > 0 ? `${a.mvp}× MVP` : "0 MVPs"}
          </span>

          {inPct !== null && (
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
              <span style={{ fontSize: story ? 30 : 22, opacity: 0.75 }}>
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
            fontSize: story ? 34 : 26,
          }}
        >
          <span style={{ fontStyle: "italic", opacity: 0.7 }}>
            One career a day. No names. Your call.
          </span>
          {streak && (
            <span style={{ fontWeight: 600, color: "#9C6B2F" }}>
              ▲ {streak}-day streak
            </span>
          )}
        </div>
      </div>
    ),
    { width: W, height: H },
  );
}
