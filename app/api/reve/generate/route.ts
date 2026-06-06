import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });

    const apiKey = process.env.REVE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "REVE_API_KEY not configured" }, { status: 500 });

    const res = await fetch("https://api.reve.com/v1/image/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify({ prompt, aspect_ratio: "2:3", version: "latest" }),
    });

    const text = await res.text();
    console.log("[reve/generate] status:", res.status, "body:", text.slice(0, 500));

    let data: Record<string, unknown>;
    try { data = JSON.parse(text); } catch { return NextResponse.json({ error: text }, { status: 500 }); }

    if (!res.ok) {
      return NextResponse.json({ error: data.message ?? data.error ?? data.error_code ?? text }, { status: res.status });
    }

    if (data.content_violation) {
      return NextResponse.json({ error: "content policy violation" }, { status: 400 });
    }

    // Native Reve returns base64 in data.image
    if (data.image) {
      return NextResponse.json({ imageUrl: `data:image/png;base64,${data.image}` });
    }

    // Fallback: try url-based shapes
    const imageUrl =
      (data?.data as { url?: string }[] | undefined)?.[0]?.url ??
      (data?.url as string | undefined) ??
      (data?.output as string | undefined);

    if (!imageUrl) {
      console.error("[reve/generate] unexpected shape:", text);
      return NextResponse.json({ error: "No image in response", raw: text }, { status: 500 });
    }

    return NextResponse.json({ imageUrl });
  } catch (err) {
    console.error("[reve/generate]", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
