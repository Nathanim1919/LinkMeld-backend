import { AIResponse, ProcessingRequest } from "../types";

const GEMINI_CONFIG = {
  SUMMARY_MODEL: "gemini-pro",
  EMBEDDING_MODEL: "models/embedding-001",
  MAX_RETRIES: 2,
  REQUEST_TIMEOUT: 10000, // 10 seconds
  FREE_TIER_LIMIT: 60, // requests per minute
};

const processContent = async (
  userId: string,
  content: string,
  userApiKey: string
): Promise<AIResponse> => {
  try {
    // Input validation
    if (!content || content.trim().length < 100) {
      return {
        success: false,
        error: "Content must be at least 100 characters long.",
      };
    }

    // Clean content
    const cleanText = removeBoilerplate(content);

    // Process content with AI
    const [summary, embedding] = await Promise.all([
      generateSummary(cleanText, userApiKey),
      generateEmbedding(cleanText, userApiKey),
    ]);

    return {
      success: true,
      data: {
        summary,
        embedding,
      },
    };
  } catch (error) {
    return handleGeminiError(error);
  }
};

const generateSummary = async (
  text: string,
  apiKey: string
): Promise<string> => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta2/models/${GEMINI_CONFIG.SUMMARY_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Summarize this in 3 concise sentences and provide key points:\n\n${text.substring(
                  0,
                  30000
                )}`,
              },
            ],
          },
        ],
      }),
      timeout: GEMINI_CONFIG.REQUEST_TIMEOUT,
    }
  );

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
};

const generateEmbedding = async (
  text: string,
  apiKey: string
): Promise<number[]> => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${GEMINI_CONFIG.EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: text.substring(0, 30000), // Limit to 30,000 characters
              },
            ],
          },
        ],
      }),
      timeout: GEMINI_CONFIG.REQUEST_TIMEOUT,
    }
  );

  const data = await response.json();
  return data.embeddings.values;
};

// 5. Utility Functions
const removeBoilerplate = (html: string): string => {
  // Basic implementation - consider using Readability.js for production
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const handleGeminiError = (error: any): AIResponse => {
  console.error("AI Processing Error:", error);

  if (error.response?.status === 429) {
    return {
      success: false,
      error: "API rate limit exceeded",
      retryAfter: 60000, // 1 minute
    };
  }

  if (error.code === "ETIMEDOUT") {
    return {
      success: false,
      error: "Request timed out",
    };
  }

  return {
    success: false,
    error: "AI processing failed",
  };
};

export const aiService = {
  processContent: async (request: ProcessingRequest): Promise<AIResponse> => {
    if (!request.userId || !request.content || !request.userApiKey) {
      throw new Error("Invalid request parameters");
    }

    console.log("Processing content for user:", request.userId);

    // Process content
    return await processContent(
      request.userId,
      request.content,
      request.userApiKey
    );
  },
};
