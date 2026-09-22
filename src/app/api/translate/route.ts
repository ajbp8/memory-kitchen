import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "No text provided" }, { status: 400 });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 60,
      system:
        "You are a recipe name translator. Translate the recipe name the user gives you into English. Return ONLY the translated recipe name — no quotes, no explanation, nothing else.",
      messages: [{ role: "user", content: text }],
    }),
  });

  if (!response.ok) return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  const data = await response.json();
  const translated = data.content?.[0]?.text?.trim() ?? "";
  return NextResponse.json({ translated });
}
