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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY");
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const prompt = `Return a JSON array of 6-8 objects about this request. Each object must include \"name\", \"detail\", and \"tag\" fields. Return only valid JSON with no surrounding commentary or markdown.\n\nRequest: ${query}`;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          prompt: { text: prompt },
          temperature: 0.6,
          maxOutputTokens: 400,
          candidate_count: 1,
        }),
      }
    );

    if (!response.ok) {
      const message = await response.text();
      console.error("Gemini API error", response.status, message);
      return jsonResponse({ error: "Unable to generate results" }, 502);
    }

    const result = await response.json();
    const rawText = String(result?.candidates?.[0]?.content || "");
    const cleaned = rawText.replace(/```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.error("Failed to parse Gemini output", err, cleaned);
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
