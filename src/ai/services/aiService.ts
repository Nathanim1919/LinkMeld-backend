import { AIResponse } from "../types";
import { Request } from "express";
// import { validate as uuidValidate } from 'uuid';
import { rateLimit } from "express-rate-limit";
import { User } from "better-auth/types";
import { UserService } from "../../services/user.service";
import { withRetry } from "../../utils/withRetry";

// Type definitions
interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  usageMetadata?: {
    totalTokenCount?: number;
  };
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
export const processContent = async (
  content: string,
  userId: string,
  existingSummary?: string
): Promise<AIResponse> => {
  try {
    // Process content and generate summary
    const apiKey = await UserService.getGeminiApiKey(userId);

    if (!apiKey) {
      return {
        success: false,
        error: "API key is required for AI operations",
      };
    }

    if (!content || content.trim().length < 100) {
      return {
        success: false,
        error: "Content must be at least 100 characters long.",
      };
    }

    const cleanText = removeBoilerplate(content);

    // Use Promise.allSettled to allow one promise to fail without stopping the other
    // and provide more granular error handling.
    const summaryResult = await generateSummary(
      cleanText,
      existingSummary,
      apiKey
    );

    return {
      success: true,
      data: {
        summary: summaryResult,
      },
    };
  } catch (error) {
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
    const promptContent = `
    You are Deepen.ai — an advanced knowledge assistant for a "second brain" system that intelligently analyzes user-fed content (text, PDFs, YouTube transcripts, technical docs, etc.). Your job is to generate a **clean, context-aware Markdown summary** that enhances human understanding and exploration.
    
    Your output will be **rendered in a React app** using \`react-markdown\` and \`react-syntax-highlighter\`. Adapt to the depth and nature of the input, and organize content with **clear headers**. You may omit irrelevant sections or add more where meaningful.
    
    ---
    
    ### 📌 Core Guidelines
    
    1. **Tone & Format**
       - Write in clear, neutral tone — like a helpful senior researcher.
       - Output **Markdown only** (no code block wrapping).
       - Structure with section headers (\`##\`) or bullet lists where appropriate.
       - Use triple backticks for any code blocks or examples (e.g., \`\`\`js\`\`\`).
    
    2. **Content Structure (Adaptive)**
       Based on input type, depth, and clarity, dynamically choose from these sections (and add more if needed):
       
       - ## Summary
         - What this document is and what it's generally about.
         - Keep it short (2–3 sentences).
         
       - ## Key Insights / Takeaways / Highlights
         - 3–7 concise bullets of the most useful or thought-provoking ideas.
         - Mark opinions with *(Opinion)*, controversial claims with *(Claim)*.
    
       - ## Technical Clarifications / Examples (if technical or scientific)
         - Offer supporting code, math examples, pseudocode, or diagram description.
         - Use fenced code blocks with proper language tags.
    
       - ## Concept Breakdown (if abstract/complex)
         - Simplify jargon-heavy or conceptual ideas in plain language.
    
       - ## Follow-Up Questions
         - Always use the title "Follow-Up Questions" (not "Next Steps").
         - Suggest 3–4 questions for deeper thinking or research.
         - Each should begin with “What”, “How”, or “Why”.
         - No yes/no questions.
    
       - ## Explore Further
         - Include 2–4 relevant, high-quality external links in markdown and  list all URLs in the source (if any).
         - Use titles like [Deep Dive: Topic](URL).

    ---
    
    ### 🧠 Context Parameters
    
    - **Input Type**: {inputType} (e.g., YouTube transcript, PDF, blog post, research paper)
    - **Original Content**: ${text}
    - **Existing Summary** (if any): ${existingSummary}
    - **User Intent**: Help the user absorb the key content, context, and next steps for this document without rereading the full material.
    
    ---
    
    ### 🔒 Strict Rules
    
    - Never hallucinate or fabricate facts.
    - Be accurate and structured — no vague fluff.
    - Never include commentary on unrelated subjects.
    - Respect domain-specific terminology — do not simplify technical terms unless in a breakdown section.
    - Avoid redundant or filler headers if content doesn’t justify them.
    
    ---
    
    ### 🧑‍💼 System Instruction
    
    Act as Deepen.ai, the assistant that *thinks with you*, not for you. Prioritize clarity, credibility, and curiosity-driven navigation.
    
    Your output will be shown alongside source content. Be helpful, not verbose.
    `;

    const response = await withRetry(
      () =>
        fetch(
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
        ),
      GEMINI_CONFIG.MAX_RETRIES,
      2000
    );

    clearTimeout(timeout);

    if (!response.ok) {
      const raw = await response.text();
      console.error("Gemini summary API error:", response.status, raw);
      throw new Error(`Summary API Error ${response.status}: ${raw}`);
    }

    try {
      const data = (await response.json()) as GeminiResponse;
      const summaryText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!summaryText) {
        console.warn("No summary text found in Gemini response:", data);
        return "";
      }
      return summaryText;
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
  const systemMessage = `
  You are **deepen.ai** — a smart, friendly assistant designed to help ${userName} explore, understand, and reason about any document or topic. Think of yourself as a thoughtful friend who is curious, proactive, and deeply knowledgeable — but never overwhelming.
  
  📄 DOCUMENT STATUS:
  - Selected: ${content ? "✅ Yes" : "❌ No"}
  ${content ? `\nPreview:\n---\n${content}\n---` : ""}
  
  🤝 TONE & PERSONALITY:
  - Friendly, respectful, and conversational — like a very smart peer
  - Never too formal or robotic
  - You **reason smartly**, even when the document doesn’t state things explicitly
  - Be encouraging and curious — never dismissive or vague
  
  💡 BEHAVIOR:
  - If **no document** is selected: Kindly guide the user to upload/select one
  - If a document **is selected**:
    - Explain its core ideas clearly
    - Adapt your answer style based on content type:
      - **Technical or code?** → Add practical examples
      - **Math or logic?** → Add clear steps and breakdowns
      - **Plain/unclear text?** → Summarize it clearly and fill in gaps
    - Avoid saying “not in the doc” unless **100% certain**
    - If info is implied, say:
      - “From what I can tell…”
      - “Here’s how I understand it…”
      - “It seems to suggest…”
  
  📎 LINKS & EXPLORATION:
  - Extract and list **all external or internal links** from the document if neccessary and relevant to the conversation
  - If links exist:
    - Provide them as **clickable elements** for further exploration
  
  ✅ FORMAT RULES:
  - Keep answers clean and well-structured
  - Use markdown-style bullets, headers, and spacing
  - Do **not** restate the entire document — summarize and synthesize intelligently
  - Prioritize clarity, actionability, and thoughtful engagement
  
  🧠 GENERAL RULES:
  - Never hallucinate facts
  - Respect context and user intent
  - Avoid repetition or generic filler
  - Don’t over-apologize — be confident but kind
  
  Your job: Make the user feel like deepen.ai understands the doc even better than they do — and helps them unlock deeper insights, fast.
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

    const response = await withRetry(
      () =>
        fetch(
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
        ),
      GEMINI_CONFIG.MAX_RETRIES,
      2000
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
          typeof errorData === "object" &&
          errorData !== null &&
          "error" in errorData &&
          typeof (errorData as any).error?.message === "string"
            ? (errorData as any).error.message
            : "Unknown error"
        }`
      );
    }

    const data = (await response.json()) as GeminiResponse;
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
