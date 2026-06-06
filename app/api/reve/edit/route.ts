import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, prompt } = await req.json();
    if (!prompt)    return NextResponse.json({ error: "prompt required" },   { status: 400 });
    if (!imageUrl)  return NextResponse.json({ error: "imageUrl required" }, { status: 400 });

    const apiKey = process.env.REVE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "REVE_API_KEY not configured" }, { status: 500 });

    const isDataUri = imageUrl.startsWith("data:");
    let res: Response;

    if (isDataUri) {
      // Reve doesn't accept a base64 `image` field in JSON — send as multipart instead
      const base64 = imageUrl.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64, "base64");
      const blob = new Blob([buffer], { type: "image/png" });

      const form = new FormData();
      form.append("image", blob, "image.png");
      form.append("edit_instruction", prompt);

      res = await fetch("https://api.reve.com/v1/image/edit", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
    } else {
      // Regular https:// URL — use JSON
      res = await fetch("https://api.reve.com/v1/image/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
        body: JSON.stringify({ edit_instruction: prompt, image_url: imageUrl }),
      });
    }

    const text = await res.text();
    console.log("[reve/edit] status:", res.status, "body:", text.slice(0, 500));

    let data: Record<string, unknown>;
    try { data = JSON.parse(text); } catch { return NextResponse.json({ error: text }, { status: 500 }); }

    if (!res.ok) {
      return NextResponse.json({ error: data.message ?? data.error ?? data.error_code ?? text }, { status: res.status });
    }

    if (data.content_violation) {
      return NextResponse.json({ error: "content policy violation" }, { status: 400 });
    }

    // Reve returns base64 in data.image
    if (data.image) {
      return NextResponse.json({ imageUrl: `data:image/png;base64,${data.image}` });
    }

    const resultUrl =
      (data?.data as { url?: string }[] | undefined)?.[0]?.url ??
      (data?.url as string | undefined) ??
      (data?.output as string | undefined);

    if (!resultUrl) {
      console.error("[reve/edit] unexpected shape:", text);
      return NextResponse.json({ error: "No image in response", raw: text }, { status: 500 });
    }

    return NextResponse.json({ imageUrl: resultUrl });
  } catch (err) {
    console.error("[reve/edit]", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
