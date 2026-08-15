import { ImageResponse } from "next/og";

export const alt =
  "La'Bel Confeitaria — doces, bolos e encomendas artesanais em Palhoça";

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
          background: "#8B0000",
          color: "#FFFDF9",
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
            border: "2px solid rgba(210,180,140,0.28)",
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
            background: "rgba(210,180,140,0.12)",
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
              border: "2px solid #D2B48C",
              borderRadius: 22,
              color: "#D2B48C",
              fontFamily: "serif",
              fontSize: 39,
              fontWeight: 700,
              letterSpacing: -4,
              paddingRight: 5,
            }}
          >
            L&apos;
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
                color: "#D2B48C",
                fontFamily: "serif",
                fontSize: 38,
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              La&apos;Bel
            </div>
            <div
              style={{
                marginTop: 3,
                color: "rgba(255,253,249,0.72)",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 5,
                textTransform: "uppercase",
              }}
            >
              Confeitaria
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: "#D2B48C",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 6,
              textTransform: "uppercase",
            }}
          >
            Cardápio digital
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
            Um doce momento começa por aqui.
          </div>
          <div
            style={{
              marginTop: 28,
              color: "rgba(255,253,249,0.78)",
              fontSize: 27,
            }}
          >
            Doces, bolos e encomendas artesanais em Palhoça.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            color: "#D2B48C",
            fontSize: 21,
            fontWeight: 700,
          }}
        >
          Cardápio do dia&nbsp;&nbsp;•&nbsp;&nbsp;Encomendas&nbsp;&nbsp;•&nbsp;&nbsp;Palhoça/SC
        </div>
      </div>
    ),
    size
  );
}
