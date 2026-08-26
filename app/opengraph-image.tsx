import { ImageResponse } from "next/og";

import { getPublicInstallationProfile } from "@/config/installation/public";
import {
  getBusinessSegmentLabel,
  getInstallationBrandMark,
  hexToRgba,
} from "@/lib/installation-presentation";

const installation = getPublicInstallationProfile();
const openGraphImage = installation.seo.openGraph.image;
const segmentLabel = getBusinessSegmentLabel(
  installation.identity.businessSegment
);
const brandMark = getInstallationBrandMark(installation);

export const alt = openGraphImage.alt;

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          overflow: "hidden",
          background: installation.theme.primary,
          color: installation.theme.background,
          padding: "64px 76px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 430,
            height: 430,
            borderRadius: 999,
            right: -90,
            top: -150,
            border: `2px solid ${hexToRgba(
              installation.theme.accent,
              0.28
            )}`,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 300,
            height: 300,
            borderRadius: 999,
            right: 60,
            bottom: -190,
            background: hexToRgba(installation.theme.accent, 0.12),
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 76,
              height: 76,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `2px solid ${installation.theme.accent}`,
              borderRadius: 22,
              color: installation.theme.accent,
              fontFamily: "serif",
              fontSize: 39,
              fontWeight: 700,
              letterSpacing: -4,
              paddingRight: 5,
            }}
          >
            {brandMark}
          </div>
          <div
            style={{
              marginLeft: 20,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                color: installation.theme.accent,
                fontFamily: "serif",
                fontSize: 38,
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              {installation.identity.shortName}
            </div>
            <div
              style={{
                marginTop: 3,
                color: hexToRgba(installation.theme.background, 0.72),
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 5,
                textTransform: "uppercase",
              }}
            >
              {segmentLabel}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: installation.theme.accent,
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 6,
              textTransform: "uppercase",
            }}
          >
            {openGraphImage.eyebrow}
          </div>
          <div
            style={{
              maxWidth: 850,
              marginTop: 20,
              fontSize: 66,
              lineHeight: 1.05,
              fontWeight: 800,
              letterSpacing: -2,
            }}
          >
            {installation.identity.slogan ??
              installation.publicContent.hero.title}
          </div>
          <div
            style={{
              marginTop: 28,
              color: hexToRgba(installation.theme.background, 0.78),
              fontSize: 27,
            }}
          >
            {openGraphImage.description}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            color: installation.theme.accent,
            fontSize: 21,
            fontWeight: 700,
          }}
        >
          {openGraphImage.footerItems.join("   •   ")}
        </div>
      </div>
    ),
    size
  );
}
