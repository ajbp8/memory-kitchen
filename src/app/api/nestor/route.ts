export const runtime = "edge";

import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are Nestor, a warm and practical family recipe assistant.
When given ingredients, keywords, or a craving, suggest exactly 2-3 specific, doable home-cooked recipes.
For each recipe respond ONLY with a valid JSON array — no prose before or after.
Each object must have exactly these fields:
  "name": short recipe name (string)
  "description": 2-3 sentences covering key ingredients and method (string)
  "cookTime": e.g. "25 min" or "1 hr" (string)

Example format:
[
  { "name": "Sardine Pasta", "description": "Sauté garlic and chilli flakes in olive oil, add canned sardines and break them up. Toss with spaghetti, lemon zest, and parsley.", "cookTime": "20 min" },
  { "name": "Sardine Toast", "description": "Mash sardines with capers and lemon on toasted sourdough. Finish with a drizzle of good olive oil.", "cookTime": "5 min" }
]

Keep names concise and suggestions practical. Be encouraging and family-friendly.`;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Nestor is not configured yet." }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "Tell Nestor what you have or what you fancy!" }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch {
    return NextResponse.json({ error: "Nestor couldn't connect. Try again!" }, { status: 500 });
  }

  if (!response.ok) {
    return NextResponse.json({ error: "Nestor hit an error. Try again!" }, { status: 500 });
  }

  const data = await response.json();
  const text: string = data.content?.[0]?.text ?? "";

  // Extract JSON array from response
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const suggestions = JSON.parse(jsonMatch[0]);
      return NextResponse.json({ suggestions });
    }
  } catch {
    // fall through
  }

  // If Claude didn't return JSON, return the raw text as a single suggestion
  return NextResponse.json({
    suggestions: [{ name: "Nestor's idea", description: text, cookTime: "" }],
  });
}
