/**
 * Shared Open Graph card (rendered by next/og's ImageResponse, i.e. Satori:
 * flexbox only, inline styles, default font).
 */
export const OG_SIZE = { width: 1200, height: 630 };

const C = {
  bg: "#07080b",
  fg: "#f0f3f6",
  muted: "#9aa4b2",
  subtle: "#5f6b7a",
  accent: "#7ee787",
  ink: "#04130a",
  violet: "#a371f7",
  amber: "#ffa657",
  sky: "#79c0ff",
  pink: "#ff7eb6",
};

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export const OG_ACCENTS: Record<string, string> = {
  accent: C.accent,
  violet: C.violet,
  amber: C.amber,
  sky: C.sky,
  pink: C.pink,
};

export function OgCard({
  eyebrow,
  title,
  subtitle,
  chips = [],
  accent = C.accent,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  chips?: string[];
  accent?: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: C.bg,
        color: C.fg,
        position: "relative",
      }}
    >
      {/* grid */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* colour wash */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundImage: `linear-gradient(125deg, ${rgba(C.bg, 0)} 0%, ${rgba(C.bg, 0)} 48%, ${rgba(accent, 0.28)} 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundImage: `linear-gradient(20deg, ${rgba(C.violet, 0.16)} 0%, ${rgba(C.violet, 0)} 38%)`,
        }}
      />
      {/* accent rule */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, display: "flex", background: accent }} />

      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: C.accent,
            color: C.ink,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            letterSpacing: -1,
          }}
        >
          MK
        </div>
        <div style={{ display: "flex", fontSize: 32, letterSpacing: -0.5 }}>mxolisi.dev</div>
      </div>

      {/* body */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: accent, textTransform: "uppercase" }}>
          {eyebrow}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 22,
            fontSize: title.length > 32 ? 72 : 88,
            lineHeight: 1.02,
            letterSpacing: -3,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", marginTop: 26, fontSize: 28, lineHeight: 1.35, color: C.muted, maxWidth: 920 }}>
          {subtitle}
        </div>
      </div>

      {/* footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 12 }}>
          {chips.slice(0, 4).map((c) => (
            <div
              key={c}
              style={{
                display: "flex",
                padding: "8px 16px",
                borderRadius: 9999,
                border: "1px solid rgba(255,255,255,0.16)",
                fontSize: 18,
                color: C.muted,
              }}
            >
              {c}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18, color: C.subtle }}>
          <div style={{ width: 10, height: 10, borderRadius: 9999, background: C.accent, display: "flex" }} />
          Johannesburg · ZA
        </div>
      </div>
    </div>
  );
}
