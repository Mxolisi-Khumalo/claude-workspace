/**
 * Shared Open Graph card (rendered by next/og's ImageResponse, i.e. Satori:
 * flexbox only, inline styles, default font).
 *
 * Social cards are rendered on the server without a theme, so they use the
 * default light theme's look (GitHub Universe 2026): a pale green-grey paper
 * canvas, black type at regular weight, GitHub green, a black utility strip
 * with neon text, and the page ruled into cells by 1px lines.
 */
export const OG_SIZE = { width: 1200, height: 630 };

const C = {
  bg: "#e9edec",
  surface: "#f9fbf9",
  line: "#c6cec8",
  lineStrong: "#b6bfb8",
  fg: "#000000",
  muted: "#58635b",
  accent: "#077a28",
  green: "#08872b",
  neon: "#5fed83",
  violet: "#583af7",
  amber: "#6e5d00",
  sky: "#0055d5",
  pink: "#a8226a",
};

/** Per-service accents, as in the light theme (all ≥ 4.5:1 on the paper). */
export const OG_ACCENTS: Record<string, string> = {
  accent: C.accent,
  violet: C.violet,
  amber: C.amber,
  sky: C.sky,
  pink: C.pink,
};

const RAIL = 40;

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
        background: C.bg,
        color: C.fg,
        position: "relative",
      }}
    >
      {/* black utility strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 64,
          padding: `0 ${RAIL}px`,
          background: "#000",
          color: "#fff",
          fontSize: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: C.green,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              letterSpacing: -0.5,
            }}
          >
            MK
          </div>
          <div style={{ display: "flex", letterSpacing: -0.3 }}>mxolisi.dev</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18, color: C.neon }}>
          <div style={{ width: 10, height: 10, background: C.neon, display: "flex" }} />
          Johannesburg · ZA
        </div>
      </div>

      {/* ruled body: rails left and right, a cell per row */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          margin: `0 ${RAIL}px`,
          borderLeft: `1px solid ${C.lineStrong}`,
          borderRight: `1px solid ${C.lineStrong}`,
        }}
      >
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          {/* a graph-paper cell in the top-right corner */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 312,
              height: 96,
              display: "flex",
              backgroundImage:
                "linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              borderLeft: `1px solid ${C.line}`,
              borderBottom: `1px solid ${C.line}`,
            }}
          />
          {/* accent bar */}
          <div style={{ width: 12, display: "flex", background: accent }} />
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: "40px 56px 44px 44px",
            }}
          >
            <div style={{ display: "flex", fontSize: 22, color: accent }}>{eyebrow}</div>
            <div
              style={{
                display: "flex",
                marginTop: 18,
                fontSize: title.length > 32 ? 68 : 84,
                lineHeight: 1.04,
                letterSpacing: -2.5,
                maxWidth: 900,
              }}
            >
              {title}
            </div>
            <div style={{ display: "flex", marginTop: 22, fontSize: 26, lineHeight: 1.35, color: C.muted, maxWidth: 820 }}>
              {subtitle}
            </div>
          </div>
        </div>

        {/* footer row of cells */}
        <div style={{ display: "flex", height: 72, borderTop: `1px solid ${C.lineStrong}`, background: C.surface }}>
          {chips.slice(0, 4).map((c) => (
            <div
              key={c}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0 28px",
                borderRight: `1px solid ${C.line}`,
                fontSize: 20,
                color: C.fg,
              }}
            >
              {c}
            </div>
          ))}
          <div style={{ flex: 1, display: "flex" }} />
          {/* decorative green key, like Universe's primary cell */}
          <div
            style={{
              width: 72,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: C.green,
              color: "#fff",
              fontSize: 26,
            }}
          >
            ↗
          </div>
        </div>
      </div>
    </div>
  );
}
