import { NextResponse } from "next/server";
import {
  getCachedLinkPreview,
  LINK_PREVIEW_REVALIDATE_SECONDS,
} from "@/lib/linkPreview";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const url = requestUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "Missing required `url` query parameter." },
      { status: 400 }
    );
  }

  try {
    const preview = await getCachedLinkPreview({ url });

    return NextResponse.json(preview, {
      headers: {
        "Cache-Control": `public, s-maxage=${LINK_PREVIEW_REVALIDATE_SECONDS}, stale-while-revalidate=${LINK_PREVIEW_REVALIDATE_SECONDS}`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch link preview.",
      },
      { status: 400 }
    );
  }
}
