"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildConversationPrompt = exports.validateRequest = exports.conversationRateLimiter = exports.generateSummary = exports.processContent = void 0;
exports.processConversationStream = processConversationStream;
const express_rate_limit_1 = require("express-rate-limit");
const user_service_1 = require("../../services/user.service");
const withRetry_1 = require("../../common/utils/withRetry");
const vectorStore_1 = require("./vectorStore");
const logger_1 = require("../../common/utils/logger");
const sanitization_1 = require("../../common/utils/sanitization");
const generative_ai_1 = require("@google/generative-ai");
const GEMINI_GENERATION_CONFIG = {
    temperature: 0.7,
    topP: 0.9,
    maxOutputTokens: 1000,
};
const DEFAULT_MODEL = "gemini-2.0-flash";
const MAX_CONVERSATION_LENGTH = 30;
const MAX_INPUT_LENGTH = 10000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 100;
const GEMINI_CONFIG = {
    SUMMARY_MODEL: "gemini-pro",
    EMBEDDING_MODEL: "embedding-001",
    MAX_RETRIES: 2,
    REQUEST_TIMEOUT: 30000,
    FREE_TIER_LIMIT: 60,
};
const processContent = async (content, userId, existingSummary) => {
    try {
        const apiKey = await user_service_1.UserService.getGeminiApiKey(userId);
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
        const summaryResult = await (0, exports.generateSummary)(cleanText, existingSummary, apiKey);
        return {
            success: true,
            data: {
                summary: summaryResult,
            },
        };
    }
    catch (error) {
        return handleGeminiError(error);
    }
};
exports.processContent = processContent;
const generateSummary = async (text, existingSummary = "", apiKey) => {
    var _a, _b, _c, _d, _e;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEMINI_CONFIG.REQUEST_TIMEOUT);
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
        const response = await (0, withRetry_1.withRetry)(() => fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
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
        }), GEMINI_CONFIG.MAX_RETRIES, 2000);
        clearTimeout(timeout);
        if (!response.ok) {
            const raw = await response.text();
            console.error("Gemini summary API error:", response.status, raw);
            throw new Error(`Summary API Error ${response.status}: ${raw}`);
        }
        try {
            const data = (await response.json());
            const summaryText = (_e = (_d = (_c = (_b = (_a = data === null || data === void 0 ? void 0 : data.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
            if (!summaryText) {
                console.warn("No summary text found in Gemini response:", data);
                return "";
            }
            return summaryText;
        }
        catch (jsonError) {
            const raw = await response.text();
            console.error("Failed to parse JSON for summary:", jsonError, "Raw:", raw);
            throw new Error(`Invalid JSON response from Gemini summary API: ${raw}`);
        }
    }
    catch (err) {
        clearTimeout(timeout);
        throw err;
    }
};
exports.generateSummary = generateSummary;
const removeBoilerplate = (html) => {
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
};
const handleGeminiError = (error) => {
    console.error("AI Processing Error:", error);
    if (error.name === "AbortError") {
        return {
            success: false,
            error: "Request timed out",
        };
    }
    if (error.message &&
        error.message.includes("404") &&
        error.message.includes("models/gemini-pro is not found")) {
        return {
            success: false,
            error: "Gemini Pro model not found or accessible. Please verify your API key, project configuration, and model availability via ListModels API.",
        };
    }
    if (error.message && error.message.includes("429")) {
        return {
            success: false,
            error: "API rate limit exceeded",
            retryAfter: 60000,
        };
    }
    return {
        success: false,
        error: `AI processing failed: ${error.message || "Unknown error"}.`,
    };
};
exports.conversationRateLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests, please try again later.",
});
const validateRequest = (req) => {
    if (!req.body)
        return { isValid: false, error: "Request body is missing" };
    const { captureId, messages } = req.body;
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
        if (!msg.content ||
            typeof msg.content !== "string" ||
            msg.content.length > MAX_INPUT_LENGTH) {
            return { isValid: false, error: "Invalid message content" };
        }
    }
    return { isValid: true };
};
exports.validateRequest = validateRequest;
const buildConversationPrompt = (userName, documentSummary, messages, retrievedContext) => {
    var _a;
    const MAX_SUMMARY_CHARS = 1500;
    const cleanSummary = (0, sanitization_1.escapeMarkdown)(documentSummary).slice(0, MAX_SUMMARY_CHARS);
    const systemMessage = `
You are **deepen.ai** — a smart, friendly assistant designed to help ${(0, sanitization_1.escapeMarkdown)(userName)} explore, understand, and reason about any document or topic. Think of yourself as a thoughtful friend who is curious, proactive, and deeply knowledgeable — but never overwhelming.

📄 DOCUMENT CONTEXT:
- You are currently helping the user understand a specific document.
${cleanSummary ? `OVERALL DOCUMENT SUMMARY:\n---\n${cleanSummary}\n---` : ""}

- Here is the most relevant information retrieved from that document based on the user's current query:
---\n${(0, sanitization_1.escapeMarkdown)(retrievedContext)}\n---

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
        .map((msg) => `${msg.role.toUpperCase()}: ${(0, sanitization_1.escapeMarkdown)(msg.content)}`)
        .join("\n");
    const lastUserMessage = ((_a = messages.filter((m) => m.role === "user").slice(-1)[0]) === null || _a === void 0 ? void 0 : _a.content) || "";
    return `
${systemMessage}

🗣 CONVERSATION HISTORY:
${conversationHistory}

❓ CURRENT USER REQUEST: \"${(0, sanitization_1.escapeMarkdown)(lastUserMessage)}\"

💬 YOUR RESPONSE (follow the guidance above):
`.trim();
};
exports.buildConversationPrompt = buildConversationPrompt;
async function* processConversationStream(user, apiKey, documentSummary, documentId, messages, model = DEFAULT_MODEL, signal) {
    var _a;
    try {
        const lastUserMessage = ((_a = messages.filter((m) => m.role === "user").slice(-1)[0]) === null || _a === void 0 ? void 0 : _a.content) || "";
        const cleanUserMessage = lastUserMessage.trim().slice(0, 1000);
        const similarChunks = await (0, vectorStore_1.searchSimilar)({
            query: cleanUserMessage,
            userId: user.id,
            documentId: documentId,
            userApiKey: apiKey,
        });
        let retrievedContext = "";
        if (similarChunks.length > 0) {
            retrievedContext = similarChunks
                .map((chunk) => { var _a; return (_a = chunk.payload) === null || _a === void 0 ? void 0 : _a.text; })
                .filter(Boolean)
                .join("\n---\n");
        }
        else {
            retrievedContext =
                "No specific relevant information found in this document for your query.";
        }
        logger_1.logger.info("INFORMATION RETRIEVED FOR STREAM", {
            userId: user.id,
            documentId: documentId,
        });
        const prompt = (0, exports.buildConversationPrompt)(user.name, documentSummary, messages, retrievedContext);
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        const generativeModel = genAI.getGenerativeModel({
            model: model,
            generationConfig: GEMINI_GENERATION_CONFIG,
        });
        const streamingResult = await generativeModel.generateContentStream({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        for await (const chunk of streamingResult.stream) {
            if (signal === null || signal === void 0 ? void 0 : signal.aborted) {
                throw new Error("AbortError");
            }
            const chunkText = chunk.text();
            if (chunkText) {
                yield chunkText;
            }
        }
    }
    catch (error) {
        logger_1.logger.error("Conversation stream processing failed", {
            userId: user.id,
            documentId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
}
//# sourceMappingURL=aiService.js.map