import { AIResponse } from "../types";
import { Request } from "express";
// import { validate as uuidValidate } from 'uuid';
import { rateLimit } from "express-rate-limit";
import { IUser } from "../../models/User";
import { UserService } from "../../services/user.service";
import { User } from "better-auth/types";

// Type definitions
interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

// Constants and configuration
const DEFAULT_MODEL = "gemini-2.0-flash";
const MAX_CONVERSATION_LENGTH = 30; // Max messages in conversation
const MAX_INPUT_LENGTH = 10000; // Characters
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100;

export interface ConversationRequest {
  captureId: string;
  messages: Message[];
  model?: string;
}

interface ProcessedResponse {
  message: string;
  tokensUsed?: number;
  modelUsed?: string;
}

const GEMINI_CONFIG = {
  SUMMARY_MODEL: "gemini-pro", // This is fine for the conceptual name
  EMBEDDING_MODEL: "embedding-001", // Corrected for the endpoint path
  MAX_RETRIES: 2,
  REQUEST_TIMEOUT: 30000, // Increased timeout for testing ETIMEDOUT
  FREE_TIER_LIMIT: 60, // requests per minute
};

// Main function to process content
export const processContent = async (content: string, existingSummary: string, apiKey: string): Promise<AIResponse> => {
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
      generateSummary(cleanText, existingSummary, apiKey),
      generateEmbedding(cleanText, apiKey),
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
export const generateSummary = async (
  text: string,
  existingSummary: string = "", // This is now crucial
  apiKey: string
): Promise<string> => {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    GEMINI_CONFIG.REQUEST_TIMEOUT
  );

  try {
    let promptContent: string;

    if (existingSummary) {
      // If an existing summary is provided, we guide the AI to refine it.
      promptContent = `You are an expert AI summarizer that creates structured knowledge summaries.
        
        A previous summary for the following content exists, but the user is requesting a regeneration. Your task is to **refine, improve, or re-structure** the existing summary based on the original content and the strict format guidelines provided below. Do not simply repeat the existing summary if it doesn't fully adhere to the rules or if there's an opportunity for improvement.

        **Existing Summary to Refine:**
        ${existingSummary}

        **Strictly follow this exact format for the NEW/REFINED summary**:

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

        **Critical Rules (apply to the NEW/REFINED summary)**:
        1. NEVER add external commentary
        2. Preserve technical terms
        3. Never invent facts
        4. Adapt depth to input quality
        5. Flag controversial claims with (Claim)

        Original Content:
        ${text}`;
    } else {
      // If no existing summary, generate a fresh one.
      promptContent = `You are an expert AI summarizer that creates structured knowledge summaries.

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
        ${text}`;
    }

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
                  text: promptContent,
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

// Rate limiter middleware
export const conversationRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please try again later.",
});

export const validateRequest = (
  req: Request
): { isValid: boolean; error?: string } => {
  if (!req.body) return { isValid: false, error: "Request body is missing" };

  const { captureId, messages } = req.body as ConversationRequest;
  // || !uuidValidate(captureId
  if (!captureId) {
    return { isValid: false, error: "Invalid or missing captureId" };
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return { isValid: false, error: "Messages must be a non-empty array" };
  }

  if (messages.length > MAX_CONVERSATION_LENGTH) {
    return {
      isValid: false,
      error: `Conversation too long. Max ${MAX_CONVERSATION_LENGTH} messages allowed.`,
    };
  }

  for (const msg of messages) {
    if (!msg.role || !["user", "assistant", "system"].includes(msg.role)) {
      return { isValid: false, error: "Invalid message role" };
    }
    if (
      !msg.content ||
      typeof msg.content !== "string" ||
      msg.content.length > MAX_INPUT_LENGTH
    ) {
      return { isValid: false, error: "Invalid message content" };
    }
  }

  return { isValid: true };
};

export const buildConversationPrompt = (
  userName: string,
  content: string,

  messages: Message[]
): string => {
  // Friendly but intelligent system message
  const systemMessage = `You are a thoughtful, kind, and intelligent assistant — more like a smart friend — here to help ${userName} explore and understand a document or any related topic.

Your approach is friendly, respectful, and gently proactive. Always aim to be helpful — even if the document doesn’t directly state the answer.

📄 DOCUMENT STATUS:
- Document: ${content ? "✅ Content Selected and available" : "❌ Not yet Selected"}
${
  content
    ? `\nHere’s a preview of what was uploaded:\n---\n${content}\n---`
    : ""
}

🤝 RESPONSE STYLE:
- Speak like a polite, helpful friend (not formal or robotic)
- When info is **implied**, help the user understand it
- If content is **not enough**, offer helpful directions or connect it to general knowledge
- Avoid saying “not in the document” unless absolutely sure
- Use phrases like:
  - “Here’s what I’m thinking…”
  - “While it’s not directly stated, the doc seems to suggest…”
  - “From what I can tell…”
- If you can’t find an answer, suggest the user select a document or ask a different question

🧠 GENERAL RULES:
- If no document selected: Gently suggest selecting one 
- If selected document exists:
  - Pull answers from it directly or indirectly
  - Use smart reasoning when content isn't explicit(but do not invent facts or make assumptions )
- For general questions: Be helpful and friendly but do not invent facts 
- Keep follow-ups in context

✅ FORMATTING:
- Be clear and concise
- Use bullet points when listing
- Keep a conversational, readable tone
`;

  // Extract recent messages excluding unhelpful ones
  const conversationHistory = messages
    .filter((msg) => !msg.content.includes("I can't answer that"))
    .slice(-6) // Get last 3 exchanges (user + assistant pairs)
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join("\n");

  const lastUserMessage =
    messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";

  return `
${systemMessage}

🗣 CONVERSATION HISTORY:
${conversationHistory}

❓ CURRENT USER REQUEST: "${lastUserMessage}"

💬 YOUR RESPONSE (follow the guidance above):
`.trim();
};

export const processConversation = async (
  user: User,
  apiKey: string,
  content: string,
  messages: Message[],
  model: string = DEFAULT_MODEL,
  signal?: AbortSignal
): Promise<ProcessedResponse> => {
  try {
    const prompt = buildConversationPrompt(user.name, content, messages);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Client-ID": process.env.CLIENT_ID || "your-service-id",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 1000, // Limit response length
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_ONLY_HIGH",
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_ONLY_HIGH",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_ONLY_HIGH",
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_ONLY_HIGH",
            },
          ],
        }),
        signal,
      }
    );


    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API error:", {
        status: response.status,
        error: errorData,
        promptPreview: prompt.substring(0, 100),
      });
      throw new Error(
        `API Error ${response.status}: ${
          errorData.error?.message || "Unknown error"
        }`
      );
    }

    const data = await response.json();
    const messageText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Log token usage for cost monitoring
    const tokensUsed = data?.usageMetadata?.totalTokenCount;
  

    return {
      message: messageText,
      tokensUsed,
      modelUsed: model,
    };
  } catch (error) {
    console.error("Conversation processing failed:", error);
    throw error;
  }
};
