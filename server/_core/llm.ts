/**
 * LLM abstraction layer — Anthropic Claude integration.
 *
 * Drop-in replacement for the Manus LLM runtime.
 * Maintains the same interface (OpenAI-style response format)
 * so nothing else in the codebase needs to change.
 *
 * Model: claude-sonnet-4-5-20250929
 * - Fast enough for real-time chat
 * - Excellent system prompt adherence
 * - Strong tone control for luxury concierge voice
 */

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LLMRequest {
  messages: Message[];
}

interface LLMResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
}

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 1024;

export async function invokeLLM(request: LLMRequest): Promise<LLMResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your Railway environment variables."
    );
  }

  // Separate system prompt from conversation messages.
  // Anthropic API takes system as a top-level parameter, not in the messages array.
  let systemPrompt = "";
  const conversationMessages: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const msg of request.messages) {
    if (msg.role === "system") {
      // Concatenate in case there are multiple system messages (unlikely but safe)
      systemPrompt += (systemPrompt ? "\n\n" : "") + msg.content;
    } else {
      conversationMessages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }
  }

  // Anthropic requires messages to start with a user message.
  // If history starts with assistant (e.g., onboarding greeting), prepend a blank user turn.
  if (conversationMessages.length > 0 && conversationMessages[0].role === "assistant") {
    conversationMessages.unshift({
      role: "user",
      content: ".",
    });
  }

  // Anthropic requires strictly alternating user/assistant messages.
  // Merge consecutive same-role messages if they exist.
  const mergedMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const msg of conversationMessages) {
    const last = mergedMessages[mergedMessages.length - 1];
    if (last && last.role === msg.role) {
      // Merge consecutive same-role messages
      last.content += "\n" + msg.content;
    } else {
      mergedMessages.push({ ...msg });
    }
  }

  // Safety: if no messages at all, add a minimal user message
  if (mergedMessages.length === 0) {
    mergedMessages.push({ role: "user", content: "Hello" });
  }

  const body = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt || undefined,
    messages: mergedMessages,
  };

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[LLM] Anthropic API error (${response.status}):`, errorText);
    throw new Error(`Anthropic API error: ${response.status} — ${errorText}`);
  }

  const data = await response.json();

  // Anthropic response format:
  // { content: [{ type: "text", text: "..." }], ... }
  //
  // Convert to OpenAI-style format so chat.ts doesn't need changes:
  // { choices: [{ message: { role: "assistant", content: "..." } }] }

  const textContent = data.content
    ?.filter((block: any) => block.type === "text")
    ?.map((block: any) => block.text)
    ?.join("") ?? "I am having a moment. Try again.";

  return {
    choices: [
      {
        message: {
          role: "assistant",
          content: textContent,
        },
      },
    ],
  };
}