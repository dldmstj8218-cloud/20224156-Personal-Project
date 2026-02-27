import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/image-proxy?url=<encoded-image-url>
 *
 * 브라우저에서 외부 이미지(Supabase 등)를 직접 fetch하면 CORS가 발생할 수 있습니다.
 * 이 서버사이드 프록시를 경유하면 Same-Origin 요청으로 처리됩니다.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json({ error: "url 파라미터가 필요합니다." }, { status: 400 });
  }

  // Supabase Storage URL만 허용 (보안)
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return NextResponse.json({ error: "유효하지 않은 URL입니다." }, { status: 400 });
  }

  const isSupabase = parsedUrl.hostname.endsWith(".supabase.co");
  if (!isSupabase) {
    return NextResponse.json({ error: "허용되지 않은 도메인입니다." }, { status: 403 });
  }

  const upstream = await fetch(imageUrl);
  if (!upstream.ok) {
    return NextResponse.json(
      { error: `이미지를 가져오지 못했습니다. (${upstream.status})` },
      { status: upstream.status }
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "image/png";
  const buffer = await upstream.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
