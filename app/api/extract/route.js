import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { base64Data, mediaType } = await request.json();

    const isPdf = mediaType === "application/pdf";
    const contentBlock = isPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64Data } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              contentBlock,
              {
                type: "text",
                text: `Extract the recipe from this cookbook page. Return ONLY valid JSON with no markdown fences:
{"title": "Recipe Title", "ingredients": ["ingredient 1", "ingredient 2", ...]}
List each ingredient as a simple string including quantity and name. If there are multiple recipes on the page, extract the most prominent one. If you cannot identify a recipe, return {"title": "", "ingredients": []}`,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    const text = data.content?.map((b) => b.text || "").join("") || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Extract error:", error);
    return NextResponse.json({ title: "", ingredients: [] }, { status: 500 });
  }
}
