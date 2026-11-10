import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { OG_PALETTE as C } from "@/lib/ogPalette";
import { HERO_MACROS, HERO_REMAINING } from "@/lib/landingDemo";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const alt = "Fit Coach: macro tracking with an AI coach that remembers.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BAR_COLOR = { protein: C.brand, carbs: C.macroCarbs, fat: C.macroFat };

export default async function OpengraphImage() {
  const icon = await readFile(join(process.cwd(), "public/icon.svg"));
  const iconSrc = `data:image/svg+xml;base64,${icon.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 72,
        background: C.background,
        color: C.foreground,
      }}
    >
      <div
        style={{
          width: 620,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <img src={iconSrc} width={64} height={64} alt="" />
          <div style={{ display: "flex", fontSize: 36 }}>{SITE_NAME}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              fontSize: 60,
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
            }}
          >
            Macro tracking with an AI coach that remembers.
          </div>
          <div
            style={{ display: "flex", fontSize: 26, color: C.mutedForeground }}
          >
            Meals, training and body composition.
          </div>
        </div>
        <div
          style={{ display: "flex", fontSize: 22, color: C.mutedForeground }}
        >
          {new URL(SITE_URL).host}
        </div>
      </div>
      <div
        style={{
          width: 420,
          display: "flex",
          flexDirection: "column",
          padding: 36,
          borderRadius: 28,
          background: C.card,
          border: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 16,
            letterSpacing: "0.09em",
            color: C.mutedForeground,
          }}
        >
          REMAINING TODAY
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            marginTop: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 120,
              lineHeight: 1,
              letterSpacing: "-0.04em",
            }}
          >
            {HERO_REMAINING}
          </div>
          <div
            style={{ display: "flex",
                whiteSpace: "nowrap", fontSize: 22, color: C.mutedForeground }}
          >{`of ${HERO_MACROS.kcalTarget} kcal`}</div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            marginTop: 32,
          }}
        >
          {HERO_MACROS.bars.map((bar) => (
            <div
              key={bar.label}
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 16,
                  color: C.mutedForeground,
                }}
              >
                {bar.label}
              </div>
              <div
                style={{
                  display: "flex",
                  height: 6,
                  borderRadius: 3,
                  background: C.well,
                }}
              >
                <div
                  style={{
                    width: `${bar.pct}%`,
                    height: 6,
                    borderRadius: 3,
                    background: BAR_COLOR[bar.key],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    size,
  );
}
