import { AIResponse } from "../types";
import { Request, Response } from "express";
import { Capture } from "../../models/Capture";
// import { validate as uuidValidate } from 'uuid';
import { rateLimit } from 'express-rate-limit';


// Type definitions
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

// Constants and configuration
const DEFAULT_MODEL = 'gemini-2.0-flash';
const MAX_CONVERSATION_LENGTH = 30; // Max messages in conversation
const MAX_INPUT_LENGTH = 10000; // Characters
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 100;

interface ConversationRequest {
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


// Rate limiter middleware
export const conversationRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.',
});

const validateRequest = (req: Request): { isValid: boolean; error?: string } => {
  if (!req.body) return { isValid: false, error: 'Request body is missing' };
  
  const { captureId, messages } = req.body as ConversationRequest;
  // || !uuidValidate(captureId
  if (!captureId) {
    return { isValid: false, error: 'Invalid or missing captureId' };
  }
  
  if (!Array.isArray(messages) || messages.length === 0) {
    return { isValid: false, error: 'Messages must be a non-empty array' };
  }
  
  if (messages.length > MAX_CONVERSATION_LENGTH) {
    return { isValid: false, error: `Conversation too long. Max ${MAX_CONVERSATION_LENGTH} messages allowed.` };
  }
  
  for (const msg of messages) {
    if (!msg.role || !['user', 'assistant', 'system'].includes(msg.role)) {
      return { isValid: false, error: 'Invalid message role' };
    }
    if (!msg.content || typeof msg.content !== 'string' || msg.content.length > MAX_INPUT_LENGTH) {
      return { isValid: false, error: 'Invalid message content' };
    }
  }
  
  return { isValid: true };
};

const buildConversationPrompt = (content: string, messages: Message[]): string => {
  // System message with clear document awareness
  const systemMessage = `You are an AI document analysis assistant. Follow these rules STRICTLY:

1. DOCUMENT STATUS:
   - Document Content: ${content ? "AVAILABLE (see below)" : "NOT UPLOADED"}
   ${content ? `\nDOCUMENT CONTENT PREVIEW:\n${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}` : ''}

2. RESPONSE RULES:
   - If NO document content: Guide user to upload one politely
   - If document EXISTS: Answer questions using it directly
   - For general questions (no doc needed): Answer helpfully
   - For follow-ups: Maintain context strictly
   - For examples: Provide 2-3 specific ones from context

3. FORMATTING:
   - Be concise but complete
   - Use bullet points for examples/lists
   - Never ask for clarification unless absolutely necessary`;

  // Filter out unhelpful messages and get last 3 exchanges
  const conversationHistory = messages
    .filter(msg => !msg.content.includes("I can't answer that"))
    .slice(-6) // Last 3 exchanges (user + assistant pairs)
    .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n');

  // Current user's last message
  const lastUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';

  return `
${systemMessage}

CONVERSATION HISTORY:
${conversationHistory}

CURRENT USER REQUEST: "${lastUserMessage}"

ASSISTANT'S RESPONSE (follow all rules above):
`.trim();
};

const processConversation = async (
  content: string,
  messages: Message[],
  model: string = DEFAULT_MODEL,
  signal?: AbortSignal
): Promise<ProcessedResponse> => {
  try {
    const prompt = buildConversationPrompt(content, messages);
    
    const startTime = Date.now();
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-ID': process.env.CLIENT_ID || 'your-service-id',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }],
          }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 1000, // Limit response length
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          ],
        }),
        signal,
      }
    );

    const latency = Date.now() - startTime;
    console.log(`API call latency: ${latency}ms`);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', {
        status: response.status,
        error: errorData,
        promptPreview: prompt.substring(0, 100),
      });
      throw new Error(`API Error ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const messageText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Log token usage for cost monitoring
    const tokensUsed = data?.usageMetadata?.totalTokenCount;
    if (tokensUsed) {
      console.log(`Tokens used: ${tokensUsed}`);
    }

    return { 
      message: messageText,
      tokensUsed,
      modelUsed: model,
    };
  } catch (error) {
    console.error('Conversation processing failed:', error);
    throw error;
  }
};

export const converseWithAI = async (req: Request, res: Response): Promise<void> => {
  // Validate request
  console.log('Request Body:', req.body);
  const { isValid, error } = validateRequest(req);
  if (!isValid) {
    res.status(400).json({ success: false, error });
    return;
  }
  const { captureId, messages, model } = req.body as ConversationRequest;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    // In a real implementation, you would fetch the content associated with captureId
    const content = await Capture.findById(captureId)
      .select('content') // Assuming content is stored in the Capture model
      .lean()
      .exec();
    

    if (!content) {
      res.status(404).json({ success: false, error: 'Content not found' });
      return;
    }

    // Process conversation
    const { message, tokensUsed, modelUsed } = await processConversation(
      content.content.raw,
      messages,
      model,
      controller.signal
    );


    // console.log(`Conversation processed for captureId and content of: ${content.content.raw}`);

    // In production, you might want to:
    // 1. Store the conversation in a database
    // 2. Update usage analytics
    // 3. Cache frequent queries
    // 4. Implement cost tracking per user/organization

    res.status(200).json({
      success: true,
      data: {
        response: message,
        modelUsed,
        tokensUsed,
        captureId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      res.status(504).json({ success: false, error: 'Request timeout' });
    } else {
      console.error('Conversation error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  } finally {
    clearTimeout(timeout);
  }
};
