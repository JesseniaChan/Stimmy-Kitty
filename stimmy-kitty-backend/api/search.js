const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const config = {
  runtime: "edge",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

function parseJsonArray(text) {
  const cleaned = String(text || "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw err;
  }
}

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body;
  try {
    body = await req.json();
  } catch (err) {
    console.error("Invalid JSON body", err);
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    return jsonResponse({ error: "Query is required" }, 400);
  }

  if (query.length > 500) {
    return jsonResponse({ error: "Query must be 500 characters or less" }, 400);
  }

  const count = Number.isInteger(body.count)
    ? Math.min(Math.max(body.count, 1), 6)
    : 6;
  const excludeNames = Array.isArray(body.excludeNames)
    ? body.excludeNames
        .filter((name) => typeof name === "string")
        .map((name) => name.trim())
        .filter(Boolean)
        .slice(0, 40)
    : [];

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY");
    return jsonResponse({ error: "Missing GEMINI_API_KEY on the backend" }, 500);
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const excludeText = excludeNames.length
    ? `Do not include any of these already shown places: ${excludeNames.join(", ")}.\n`
    : "";
  const prompt = `Return a JSON array of exactly ${count} objects about this request. Each object must include \"name\", \"detail\", and \"tag\" fields. Use specific place/location names when the request asks for restaurants, cafes, shops, venues, or places. Keep each detail under 120 characters and each tag under 32 characters. ${excludeText}Return only valid JSON with no surrounding commentary or markdown.\n\nRequest: ${query}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
            responseSchema: {
              type: "ARRAY",
              minItems: count,
              maxItems: count,
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  detail: { type: "STRING" },
                  tag: { type: "STRING" },
                },
                required: ["name", "detail", "tag"],
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const message = await response.text();
      console.error("Gemini API error", response.status, message);
      return jsonResponse({ error: "Unable to generate results" }, 502);
    }

    const result = await response.json();
    const rawText = result?.candidates?.[0]?.content?.parts
      ?.map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("");
    let parsed;
    try {
      parsed = parseJsonArray(rawText);
    } catch (err) {
      console.error("Failed to parse Gemini output", err, rawText);
      return jsonResponse({ error: "Received malformed response from AI" }, 502);
    }

    if (!Array.isArray(parsed)) {
      console.error("Gemini output was not an array", parsed);
      return jsonResponse({ error: "Received unexpected AI response format" }, 502);
    }

    const results = parsed.slice(0, 8).map((item) => ({
      name: typeof item?.name === "string" ? item.name : "Untitled",
      detail: typeof item?.detail === "string" ? item.detail : "",
      tag: typeof item?.tag === "string" ? item.tag : "",
    }));

    return jsonResponse({ results });
  } catch (err) {
    console.error("Search handler error", err);
    return jsonResponse({ error: "An unexpected error occurred" }, 500);
  }
}
