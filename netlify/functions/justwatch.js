const JUSTWATCH_GRAPHQL_URL = "https://apis.justwatch.com/graphql";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  let payload;

  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  if (typeof payload.query !== "string" || payload.query.trim() === "") {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing GraphQL query" }),
    };
  }

  try {
    const response = await fetch(JUSTWATCH_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "App-Version": "3.8.0-web-web",
        "DEVICE-ID": "XFpiKlykEe6wTkKWjpYncw",
        Origin: "https://www.justwatch.com",
        Referer: "https://www.justwatch.com/",
      },
      body: JSON.stringify({
        query: payload.query,
        variables: payload.variables || {},
      }),
    });

    const responseText = await response.text();

    return {
      statusCode: response.status,
      headers: { "Content-Type": "application/json" },
      body: responseText,
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to reach upstream service",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
}
