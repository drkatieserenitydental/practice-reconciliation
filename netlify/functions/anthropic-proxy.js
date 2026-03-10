exports.handler = async function(event, context) {
  // Extend timeout as much as possible
  context.callbackWaitsForEmptyEventLoop = false;

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ error: { message: "ANTHROPIC_API_KEY not configured" } }),
    };
  }

  try {
    // Parse the incoming body to reduce payload size
    const body = JSON.parse(event.body);
    
    // Extract just the text content from PDF if it's too large
    // by limiting max_tokens and being more specific in the prompt
    if (body.messages && body.messages[0] && body.messages[0].content) {
      const content = body.messages[0].content;
      for (let item of content) {
        if (item.type === 'document' && item.source && item.source.data) {
          // Truncate very large PDFs to first 500KB of base64
          if (item.source.data.length > 500000) {
            item.source.data = item.source.data.substring(0, 500000);
          }
        }
      }
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ error: { message: err.message } }),
    };
  }
};
