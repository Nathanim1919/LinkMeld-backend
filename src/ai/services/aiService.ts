import { AIResponse } from "../types";
import { Request } from "express";
// import { validate as uuidValidate } from 'uuid';
import { rateLimit } from "express-rate-limit";
import { User } from "better-auth/types";
import { UserService } from "../../services/user.service";
import { withRetry } from "../../utils/withRetry";
import { searchSimilar } from "./vectorStore";
import { logger } from "../../utils/logger";
import { escapeMarkdown } from "../utils/sanitize";
// Import the SDK at the top of your file
import { GoogleGenerativeAI } from "@google/generative-ai";

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

const GEMINI_GENERATION_CONFIG = {
  temperature: 0.7,
  topP: 0.9,
  maxOutputTokens: 1000,
};

// const GEMINI_SAFETY_SETTINGS = [
//   { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
//   { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
//   { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
//   { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
// ];

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

// interface ProcessedResponse {
//   message: string;
//   tokensUsed?: number;
//   modelUsed?: string;
// }

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
  documentSummary: string,
  messages: Message[],
  retrievedContext: string
): string => {
  const MAX_SUMMARY_CHARS = 1500;

  const cleanSummary = escapeMarkdown(documentSummary).slice(
    0,
    MAX_SUMMARY_CHARS
  );

  const systemMessage = `
You are **deepen.ai** — a smart, friendly assistant designed to help ${escapeMarkdown(
    userName
  )} explore, understand, and reason about any document or topic. Think of yourself as a thoughtful friend who is curious, proactive, and deeply knowledgeable — but never overwhelming.

📄 DOCUMENT CONTEXT:
- You are currently helping the user understand a specific document.
${cleanSummary ? `OVERALL DOCUMENT SUMMARY:\n---\n${cleanSummary}\n---` : ""}

- Here is the most relevant information retrieved from that document based on the user's current query:
---\n${escapeMarkdown(retrievedContext)}\n---

🤝 TONE & PERSONALITY:
- Friendly, respectful, and conversational — like a very smart peer
- Never too formal or robotic
- You **reason smartly**, even when the document doesn’t state things explicitly based *only* on the provided context.
- Be encouraging and curious — never dismissive or vague

💡 BEHAVIOR:
- Answer questions *strictly using the provided \"DOCUMENT CONTEXT\"* above.
- Prioritize information from the \"MOST RELEVANT CONTEXT\" for specific questions.
- Use the \"OVERALL DOCUMENT SUMMARY\" for broad overview questions or if specific details are missing from the relevant context.
- If the answer cannot be found or reasonably inferred from the provided context (both relevant chunks AND summary), state that you cannot find the answer in the document.
- Adapt your answer style based on content type:
  - **Technical or code?** → Add practical examples
  - **Math or logic?** → Add clear steps and breakdowns
  - **Plain/unclear text?** → Summarize it clearly and fill in gaps

📎 LINKS & EXPLORATION:
- Extract and list **all links** from the *provided context* if necessary.
- Provide them as **clickable elements**.

✅ FORMAT RULES:
- Keep answers clean and well-structured.
- Use markdown-style bullets, headers, and spacing.
- Do **not** restate the entire document — summarize and synthesize intelligently.
- Prioritize clarity, actionability, and thoughtful engagement.

🧠 GENERAL RULES:
- Never hallucinate facts.
- Respect context and user intent.
- Avoid repetition or filler.
- Don’t over-apologize — be confident but kind.
`;

  const conversationHistory = messages
    .slice(-6)
    .map((msg) => `${msg.role.toUpperCase()}: ${escapeMarkdown(msg.content)}`)
    .join("\n");

  const lastUserMessage =
    messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";

  return `
${systemMessage}

🗣 CONVERSATION HISTORY:
${conversationHistory}

❓ CURRENT USER REQUEST: \"${escapeMarkdown(lastUserMessage)}\"

💬 YOUR RESPONSE (follow the guidance above):
`.trim();
};

// export const processConversation = async (
//   user: User,
//   apiKey: string,
//   documentSummary: string,
//   documentId: string,
//   messages: Message[],
//   model: string = DEFAULT_MODEL,
//   signal?: AbortSignal
// ): Promise<ProcessedResponse> => {
//   try {
//     const lastUserMessage =
//       messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";
//     const cleanUserMessage = lastUserMessage.trim().slice(0, 1000); // Avoid absurd length

//     // 1. Perform retrieval based on the *user's current question*
//     const similarChunks = await searchSimilar({
//       query: cleanUserMessage, // FIX: Query should be the user's message
//       userId: user.id,
//       documentId: documentId, // FIX: Pass the document ID to scope the search
//       userApiKey: apiKey,
//     });

//     let retrievedContext = "";
//     if (similarChunks.length > 0) {
//       // Combine the retrieved chunks into a single string for the LLM context
//       retrievedContext = similarChunks
//         .map((chunk: any) => chunk.payload?.text) // Assuming 'text' is the key for content in payload
//         .filter(Boolean) // Remove any null/undefined chunks
//         .join("\n---\n"); // Use a separator between chunks
//     } else {
//       console.log(
//         `No similar chunks found for user ${user.id} within doc ${documentId}`
//       );
//       // Handle cases where no relevant context is found (e.g., provide a general fallback)
//       retrievedContext =
//         "No specific relevant information found in this document for your query.";
//     }

//     logger.info("INFORMATION RETRIEVED", {
//       userId: user.id,
//       documentId: documentId,
//       similarChunksCount: similarChunks.length,
//       retrievedContextLength: retrievedContext.length,
//       lastUserMessage: lastUserMessage.substring(0, 100), // Log first 100 chars of the last user message
//     });

//     console.log(`Similar Retrieved Chunks are: ${retrievedContext}`);
//     console.log(`Retrieved document summary is: ${documentSummary}`);

//     const prompt = buildConversationPrompt(
//       user.name,
//       documentSummary,
//       messages,
//       retrievedContext
//     );

//     const response = await withRetry(
//       () =>
//         fetch(
//           `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
//           {
//             method: "POST",
//             headers: {
//               "Content-Type": "application/json",
//               "X-Client-ID": process.env.CLIENT_ID || "your-service-id",
//             },
//             body: JSON.stringify({
//               contents: [
//                 {
//                   parts: [{ text: prompt }],
//                 },
//               ],
//               generationConfig: GEMINI_GENERATION_CONFIG,
//               safetySettings: GEMINI_SAFETY_SETTINGS,
//             }),
//             signal,
//           }
//         ),
//       GEMINI_CONFIG.MAX_RETRIES,
//       3000
//     );

//     if (!response.ok) {
//       const errorData = await response.json();
//       console.error("Gemini API error:", {
//         status: response.status,
//         error: errorData,
//         promptPreview: prompt.substring(0, 100),
//       });
//       throw new Error(
//         `API Error ${response.status}: ${
//           typeof errorData === "object" &&
//           errorData !== null &&
//           "error" in errorData &&
//           typeof (errorData as any).error?.message === "string"
//             ? (errorData as any).error.message
//             : "Unknown error"
//         }`
//       );
//     }

//     const data = (await response.json()) as GeminiResponse;
//     const messageText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

//     // Log token usage for cost monitoring
//     const tokensUsed = data?.usageMetadata?.totalTokenCount;

//     return {
//       message: messageText,
//       tokensUsed,
//       modelUsed: model,
//     };
//   } catch (error) {
//     logger.error("Conversation processing failed", {
//       userId: user.id,
//       documentId,
//       error: error instanceof Error ? error.message : String(error),
//     });
//     throw error;
//   }
// };



// This function now becomes an async generator
/**
 * Processes a conversation by performing retrieval-augmented generation (RAG)
 * and streaming the response from the Gemini API.
 *
 * @returns An AsyncIterable<string> that yields text chunks of the AI's response.
 */
export async function* processConversationStream(
  user: User,
  apiKey: string,
  documentSummary: string,
  documentId: string,
  messages: Message[],
  model: string = DEFAULT_MODEL,
  signal?: AbortSignal
): AsyncIterable<string> {
  try {
    // 1. Perform retrieval based on the user's current question
    const lastUserMessage =
      messages.filter((m) => m.role === "user").slice(-1)[0]?.content || "";
    const cleanUserMessage = lastUserMessage.trim().slice(0, 1000);

    const similarChunks = await searchSimilar({
      query: cleanUserMessage,
      userId: user.id,
      documentId: documentId,
      userApiKey: apiKey,
    });

    let retrievedContext = "";
    if (similarChunks.length > 0) {
      retrievedContext = similarChunks
        .map((chunk: any) => chunk.payload?.text)
        .filter(Boolean)
        .join("\n---\n");
    } else {
      retrievedContext =
        "No specific relevant information found in this document for your query.";
    }

    logger.info("INFORMATION RETRIEVED FOR STREAM", {
        userId: user.id,
        documentId: documentId,
    });

    // 2. Build the final prompt
    const prompt = buildConversationPrompt(
      user.name,
      documentSummary,
      messages,
      retrievedContext
    );

    // 3. Instantiate the SDK and call the streaming endpoint
    const genAI = new GoogleGenerativeAI(apiKey);
    const generativeModel = genAI.getGenerativeModel({
      model: model,
      // safetySettings: GEMINI_SAFETY_SETTINGS,
      generationConfig: GEMINI_GENERATION_CONFIG,
    });
    
    // Pass the abort signal to the SDK request
    const streamingResult = await generativeModel.generateContentStream({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        // The SDK's generateContentStream takes an object with a `signal` property
        // for cancellation. As of recent versions, it's part of the request object.
        // If your SDK version differs, you might need to check its specific API.
        // For now, we'll rely on the controller's outer try/catch for timeout.
    });


    // 4. Yield each chunk of text as it arrives
    for await (const chunk of streamingResult.stream) {
      // AbortSignal check
      if (signal?.aborted) {
        throw new Error("AbortError");
      }
      const chunkText = chunk.text();
      if (chunkText) {
        yield chunkText; // 'yield' sends this piece back to the controller
      }
    }
  } catch (error) {
    logger.error("Conversation stream processing failed", {
      userId: user.id,
      documentId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Re-throw the error so the controller can catch and handle it
    throw error;
  }
}