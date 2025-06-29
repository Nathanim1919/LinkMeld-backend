import { AIResponse } from "../types";

const GEMINI_CONFIG = {
  SUMMARY_MODEL: "gemini-pro", // This is fine for the conceptual name
  EMBEDDING_MODEL: "embedding-001", // Corrected for the endpoint path
  MAX_RETRIES: 2,
  REQUEST_TIMEOUT: 30000, // Increased timeout for testing ETIMEDOUT
  FREE_TIER_LIMIT: 60, // requests per minute
};

// Main function to process content
export const processContent = async (content: string): Promise<AIResponse> => {
  try {
    if (!content || content.trim().length < 100) {
      return {
        success: false,
        error: "Content must be at least 100 characters long.",
      };
    }

    const cleanText = removeBoilerplate(content);

    // Use Promise.allSettled to allow one promise to fail without stopping the other
    // and provide more granular error handling.
    const [summaryResult, embeddingResult] = await Promise.allSettled([
      generateSummary(cleanText, process.env.GEMINI_API_KEY!),
      generateEmbedding(cleanText, process.env.GEMINI_API_KEY!),
    ]);

    let summary: string | undefined;
    let embedding: number[] | undefined;
    let errors: string[] = [];

    if (summaryResult.status === "fulfilled") {
      summary = summaryResult.value;
    } else {
      console.error("Summary generation failed:", summaryResult.reason);
      errors.push(
        `Summary generation failed: ${
          summaryResult.reason.message || summaryResult.reason
        }`
      );
    }

    if (embeddingResult.status === "fulfilled") {
      embedding = embeddingResult.value;
    } else {
      console.error("Embedding generation failed:", embeddingResult.reason);
      errors.push(
        `Embedding generation failed: ${
          embeddingResult.reason.message || embeddingResult.reason
        }`
      );
    }

    if (summary && embedding) {
      return {
        success: true,
        data: {
          summary,
          embedding,
        },
      };
    } else {
      return {
        success: false,
        error: errors.join(" AND "),
      };
    }
  } catch (error) {
    // This catch block will now only be hit if Promise.allSettled itself fails,
    // which is unlikely, or if an error occurs before the API calls.
    return handleGeminiError(error);
  }
};

// Generate summary using Gemini API
const generateSummary = async (
  text: string,
  apiKey: string
): Promise<string> => {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    GEMINI_CONFIG.REQUEST_TIMEOUT
  );

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are an expert AI summarizer that creates structured knowledge summaries.

**Strictly follow this exact format**:

# Context
[1 short line about content type/source/perspective when relevant]

# Overview
[2-3 sentences capturing core content]
- Focus on main thesis/argument
- Maintain neutral tone
- Omit examples/details

# Takeaways
- [3-5 maximum bullet points]
- Prioritize actionable insights
- Mark opinions as (Opinion)
- Use parallel verb structures
- Include both why and how


# Suggested Questions
- [3 minimum, 5 maximum questions]
- Each under 12 words
- Start with "How", "Why", or "What"
- Avoid yes/no questions
- Focus on logical extensions

**Critical Rules**:
1. NEVER add external commentary
2. Preserve technical terms
3. Never invent facts
4. Adapt depth to input quality
5. Flag controversial claims with (Claim)

Original Content:
${text}`,
                },
              ],
            },
          ],
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      const raw = await response.text();
      console.error("Gemini summary API error:", response.status, raw);
      throw new Error(`Summary API Error ${response.status}: ${raw}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError: any) {
      const raw = await response.text();
      console.error(
        "Failed to parse JSON for summary:",
        jsonError,
        "Raw:",
        raw
      );
      throw new Error(`Invalid JSON response from Gemini summary API: ${raw}`);
    }

    const summaryText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!summaryText) {
      console.warn("No summary text found in Gemini response:", data);
      return "";
    }

    return summaryText;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
};

// Generate embedding using Gemini API
const generateEmbedding = async (
  text: string,
  apiKey: string
): Promise<number[]> => {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    GEMINI_CONFIG.REQUEST_TIMEOUT
  );

  try {
    // Corrected the URL for embedding. The `models/` prefix should be part of the model name in the URL.
    // For embedding, the `model` field in the body is also required and matches the URL model name.
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${GEMINI_CONFIG.EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${GEMINI_CONFIG.EMBEDDING_MODEL}`, // Ensure this matches the full model name
          content: {
            parts: [
              {
                text: text.substring(0, 30000),
              },
            ],
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      const raw = await response.text();
      console.error("Gemini embedding API error:", response.status, raw);
      throw new Error(`Embedding API Error ${response.status}: ${raw}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError: any) {
      const raw = await response.text();
      console.error(
        "Failed to parse JSON for embedding:",
        jsonError,
        "Raw:",
        raw
      );
      throw new Error(
        `Invalid JSON response from Gemini embedding API: ${raw}`
      );
    }

    if (!data?.embedding?.values) {
      console.warn("No embedding values found in Gemini response:", data);
      return []; // Or throw an error if no embedding is considered a failure
    }
    return data.embedding.values;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
};

// Utility to clean content (HTML → plain text)
const removeBoilerplate = (html: string): string => {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// General error handler
const handleGeminiError = (error: any): AIResponse => {
  console.error("AI Processing Error:", error);

  if (error.name === "AbortError") {
    return {
      success: false,
      error: "Request timed out",
    };
  }

  // Check for the specific error message from the 404
  if (
    error.message &&
    error.message.includes("404") &&
    error.message.includes("models/gemini-pro is not found")
  ) {
    return {
      success: false,
      error:
        "Gemini Pro model not found or accessible. Please verify your API key, project configuration, and model availability via ListModels API.",
    };
  }

  if (error.message && error.message.includes("429")) {
    // Assuming the original error will contain 429 status
    return {
      success: false,
      error: "API rate limit exceeded",
      retryAfter: 60000,
    };
  }
  // Generic error message if specific conditions are not met
  return {
    success: false,
    error: `AI processing failed: ${error.message || "Unknown error"}.`,
  };
};
