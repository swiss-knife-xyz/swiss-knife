import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const explorerType = searchParams.get("explorerType")!;
    const value = searchParams.get("value")!;

    const fontData = await fetch(
      new URL("../../../assets/Poppins-Bold.ttf", import.meta.url)
    ).then((res) => res.arrayBuffer());

    const imgArrayBuffer = await fetch(
      new URL("../../../public/og/base.png", import.meta.url)
    ).then((res) => res.arrayBuffer());
    const buffer = Buffer.from(imgArrayBuffer);
    const imgUrl = `data:image/png;base64,${buffer.toString("base64")}`;

    return new ImageResponse(
      (
        <div
          style={{
            backgroundImage: `url('${imgUrl}')`,
            backgroundSize: "100% 100%",
            height: "100%",
            width: "100%",
            color: "white",
            display: "flex",
            fontFamily: "Poppins",
          }}
        >
          <div
            style={{
              marginTop: 160,
              marginLeft: 150,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontSize: 150,
                fontWeight: "bold",
                lineHeight: 1.8,
                display: "flex",
              }}
            >
              Explorer
            </div>
            <div
              style={{
                fontSize: 70,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex" }}>
                {explorerType === "address" ? "Address" : "Tx"}:
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: explorerType != "address" ? 48 : 70,
                }}
              >
                {value}
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 2144,
        height: 1122,
        fonts: [
          {
            name: "Poppins",
            data: fontData,
            style: "normal",
          },
        ],
      }
    );
  } catch (e: any) {
    return new Response(e.message, { status: 500 });
  }
}
