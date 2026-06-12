import type { AvatarLook } from "@/lib/archetypes";

// The archetype character: one basketball-headed mascot, restyled per
// archetype (hat / eyes / mouth / backdrop). Pure SVG with no hooks so the
// same art renders in the client UI and inside the satori OG route.

export const AVATAR_BG: Record<AvatarLook["bg"], string> = {
  paper: "#EFE8D8",
  gold: "#EAD9B0",
  sage: "#DDE3D3",
  clay: "#E8D5C8",
  slate: "#D9DEE3",
};

const INK = "#191511";
const IVORY = "#F6F1E7";
const BRONZE = "#9C6B2F";
const BALL = "#C07F45";
const SEAM = "#74471F";

// Plain functions (not components): satori serializes the <svg> subtree
// directly, so it must contain only host elements by the time it renders.
function eyes(kind: AvatarLook["eyes"]) {
  switch (kind) {
    case "dot":
      return (
        <g>
          <circle cx="98" cy="120" r="5.5" fill={INK} />
          <circle cx="142" cy="120" r="5.5" fill={INK} />
        </g>
      );
    case "line":
      return (
        <g>
          <rect x="89" y="117" width="18" height="5" rx="2.5" fill={INK} />
          <rect x="133" y="117" width="18" height="5" rx="2.5" fill={INK} />
        </g>
      );
    case "wide":
      return (
        <g>
          <circle cx="98" cy="120" r="9" fill={IVORY} stroke={INK} strokeWidth="2.5" />
          <circle cx="142" cy="120" r="9" fill={IVORY} stroke={INK} strokeWidth="2.5" />
          <circle cx="98" cy="120" r="4" fill={INK} />
          <circle cx="142" cy="120" r="4" fill={INK} />
        </g>
      );
    case "sleepy":
      return (
        <g>
          <path d="M89 119 q9 8 18 0" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M133 119 q9 8 18 0" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
      );
    case "star":
      return (
        <g>
          <polygon points="98,111 100.5,117.5 107,120 100.5,122.5 98,129 95.5,122.5 89,120 95.5,117.5" fill={INK} />
          <polygon points="142,111 144.5,117.5 151,120 144.5,122.5 142,129 139.5,122.5 133,120 139.5,117.5" fill={INK} />
        </g>
      );
    case "monocle":
      return (
        <g>
          <circle cx="98" cy="120" r="5.5" fill={INK} />
          <circle cx="142" cy="120" r="5.5" fill={INK} />
          <circle cx="142" cy="120" r="14" stroke={BRONZE} strokeWidth="3" fill="none" />
          <path d="M142 134 v15" stroke={BRONZE} strokeWidth="2.5" fill="none" />
        </g>
      );
    case "glasses":
      return (
        <g>
          <circle cx="98" cy="120" r="12" stroke={INK} strokeWidth="3" fill="none" />
          <circle cx="142" cy="120" r="12" stroke={INK} strokeWidth="3" fill="none" />
          <path d="M110 120 h20" stroke={INK} strokeWidth="3" fill="none" />
          <circle cx="98" cy="120" r="3.5" fill={INK} />
          <circle cx="142" cy="120" r="3.5" fill={INK} />
        </g>
      );
  }
}

function mouth(kind: AvatarLook["mouth"]) {
  switch (kind) {
    case "smile":
      return <path d="M102 154 q18 16 36 0" stroke={INK} strokeWidth="4.5" fill="none" strokeLinecap="round" />;
    case "grin":
      return <path d="M100 152 q20 22 40 0 z" fill={INK} />;
    case "flat":
      return <path d="M104 158 h32" stroke={INK} strokeWidth="4.5" fill="none" strokeLinecap="round" />;
    case "smirk":
      return <path d="M108 158 q14 9 26 -3" stroke={INK} strokeWidth="4.5" fill="none" strokeLinecap="round" />;
    case "frown":
      return <path d="M102 164 q18 -14 36 0" stroke={INK} strokeWidth="4.5" fill="none" strokeLinecap="round" />;
    case "open":
      return <ellipse cx="120" cy="160" rx="9" ry="11" fill={INK} />;
  }
}

function hat(kind: AvatarLook["hat"]) {
  switch (kind) {
    case "none":
      return null;
    case "crown":
      return (
        <g>
          <polygon points="88,64 96,38 110,58 120,32 130,58 144,38 152,64" fill="#D9A441" stroke="#8A5A1D" strokeWidth="3" />
          <rect x="88" y="60" width="64" height="9" rx="3" fill="#D9A441" stroke="#8A5A1D" strokeWidth="2" />
        </g>
      );
    case "laurel":
      return (
        <g>
          <ellipse cx="76" cy="72" rx="9" ry="4.5" fill="#6F7F5A" transform="rotate(-40 76 72)" />
          <ellipse cx="67" cy="88" rx="9" ry="4.5" fill="#6F7F5A" transform="rotate(-65 67 88)" />
          <ellipse cx="62" cy="106" rx="9" ry="4.5" fill="#6F7F5A" transform="rotate(-85 62 106)" />
          <ellipse cx="164" cy="72" rx="9" ry="4.5" fill="#6F7F5A" transform="rotate(40 164 72)" />
          <ellipse cx="173" cy="88" rx="9" ry="4.5" fill="#6F7F5A" transform="rotate(65 173 88)" />
          <ellipse cx="178" cy="106" rx="9" ry="4.5" fill="#6F7F5A" transform="rotate(85 178 106)" />
        </g>
      );
    case "headband":
      return (
        <g>
          <rect x="58" y="86" width="124" height="17" rx="8.5" fill="#8E2A1F" />
          <path d="M60 95 h120" stroke="rgba(246,241,231,0.55)" strokeWidth="3" fill="none" />
        </g>
      );
    case "fedora":
      return (
        <g>
          <ellipse cx="120" cy="66" rx="58" ry="12" fill="#4A3A28" />
          <path d="M84 64 q4 -36 36 -36 q32 0 36 36 z" fill="#4A3A28" />
          <rect x="86" y="52" width="68" height="9" rx="3" fill={BRONZE} />
        </g>
      );
    case "beret":
      return (
        <g>
          <path d="M70 66 q8 -36 54 -32 q38 3 44 24 q-12 14 -50 14 q-36 0 -48 -6 z" fill="#8E2A1F" />
          <circle cx="124" cy="30" r="4.5" fill="#8E2A1F" />
        </g>
      );
    case "visor":
      return (
        <g>
          <path d="M64 72 q56 -24 112 0 l0 -12 q-56 -22 -112 0 z" fill={BRONZE} />
          <ellipse cx="120" cy="74" rx="57" ry="10" fill={BRONZE} />
        </g>
      );
    case "cap":
      return (
        <g>
          <path d="M82 66 q6 -38 38 -38 q32 0 38 38 z" fill="#2E4A6E" />
          <ellipse cx="150" cy="67" rx="28" ry="8" fill="#2E4A6E" />
          <circle cx="120" cy="28" r="4.5" fill="#2E4A6E" />
        </g>
      );
    case "halo":
      return <ellipse cx="120" cy="34" rx="38" ry="10" stroke="#D9A441" strokeWidth="5" fill="none" />;
  }
}

export default function AvatarArt({
  look,
  size = 240,
}: {
  look: AvatarLook;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 240 240" fill="none">
      <circle cx="120" cy="120" r="114" fill={AVATAR_BG[look.bg]} />
      <circle cx="120" cy="120" r="114" stroke={BRONZE} strokeWidth="5" fill="none" />
      <ellipse cx="120" cy="210" rx="54" ry="8" fill={INK} opacity="0.08" />

      {/* the ball head */}
      <circle cx="120" cy="132" r="70" fill={BALL} />
      <path d="M120 62 v140" stroke={SEAM} strokeWidth="3" fill="none" />
      <path d="M50 132 h140" stroke={SEAM} strokeWidth="3" fill="none" />
      <path d="M84 76 q26 56 0 112" stroke={SEAM} strokeWidth="3" fill="none" />
      <path d="M156 76 q-26 56 0 112" stroke={SEAM} strokeWidth="3" fill="none" />
      <circle cx="120" cy="132" r="70" stroke={SEAM} strokeWidth="3" fill="none" />

      {eyes(look.eyes)}
      {mouth(look.mouth)}
      {hat(look.hat)}
    </svg>
  );
}
