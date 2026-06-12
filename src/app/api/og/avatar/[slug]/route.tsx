import { ImageResponse } from "next/og";
import { archetypeBySlug, ARCHETYPES } from "@/lib/archetypes";
import AvatarArt from "@/components/AvatarArt";

export const runtime = "edge";

const serifBold = fetch(
  new URL("../../../../../assets/SourceSerif4-Bold.ttf", import.meta.url),
).then((r) => r.arrayBuffer());
const plexMono = fetch(
  new URL("../../../../../assets/IBMPlexMono-Medium.ttf", import.meta.url),
).then((r) => r.arrayBuffer());

// The archetype avatar as a 1080×1080 profile picture. The name rides a
// ribbon overlaid on the badge circle so a platform's circular crop keeps it.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const archetype = archetypeBySlug(slug) ?? ARCHETYPES[0];

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
          fontFamily: "Serif",
          position: "relative",
        }}
      >
        <AvatarArt look={archetype.look} size={1000} />

        <div
          style={{
            position: "absolute",
            top: 52,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            fontFamily: "Plex",
            fontSize: 26,
            letterSpacing: 8,
            color: "#191511",
            opacity: 0.55,
          }}
        >
          PLAYFIRSTBALLOT.COM
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 118,
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              background: "#9C6B2F",
              color: "#F6F1E7",
              borderRadius: 999,
              padding: "22px 58px",
              fontSize: 56,
              fontWeight: 700,
            }}
          >
            {archetype.name}
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Plex",
              fontSize: 26,
              color: "#191511",
              opacity: 0.65,
            }}
          >
            {archetype.tagline}
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts: [
        { name: "Serif", data: await serifBold, weight: 700 },
        { name: "Plex", data: await plexMono, weight: 500 },
      ],
    },
  );
}
