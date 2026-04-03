import { createUserContent, GoogleGenAI } from "@google/genai";
import { getGeminiApiKey, getOllamaConfig } from "@/lib/env";
import type { AssistantMessage, AssistantSource } from "@/lib/assistant/types";

const DEFAULT_GEMINI_ASSISTANT_MODEL = "gemini-2.5-flash-lite";

function trimHistory(messages: AssistantMessage[]) {
  return messages.slice(-8).map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

function resolveChatEndpoint(baseUrl: string) {
  const normalized = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  if (normalized.endsWith("/api")) {
    return `${normalized}/chat`;
  }

  return `${normalized}/api/chat`;
}

function buildSystemPrompt(localContext: string, webResultsText: string | null) {
  return [
    "You are EchoShare Assistant, a grounded civic response assistant for India-focused water-body pollution monitoring and cleanup coordination.",
    "Your job is to answer using the supplied EchoShare platform context first, then optionally the supplied live web search results.",
    "Keep citizen reports and external intelligence separate in your reasoning and language.",
    "Never present external news or search results as verified citizen reports.",
    "If the answer depends on current web information, say that it comes from live search results.",
    "If the platform context is empty, say that clearly instead of inventing local incidents.",
    "Answer with direct, operational guidance when possible: what happened, why it matters, who should respond, and what the user can do next.",
    "Format your answer in clean markdown.",
    "Prefer a short lead sentence, then flat bullets or short sections when useful.",
    "Do not dump one long paragraph unless the user explicitly wants a very short answer.",
    "Use bold sparingly for key takeaways and avoid tables unless they add real clarity.",
    "",
    "EchoShare local context:",
    localContext,
    "",
    webResultsText ? `Live web results:\n${webResultsText}` : "Live web results:\n- None supplied for this turn.",
  ].join("\n");
}

function buildConversationTranscript(messages: AssistantMessage[]) {
  return trimHistory(messages)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");
}

function getGeminiAssistantModel() {
  const explicit = process.env.GEMINI_ASSISTANT_MODEL?.trim();
  return explicit && explicit.length > 0 ? explicit : DEFAULT_GEMINI_ASSISTANT_MODEL;
}

async function generateGeminiAssistantReply(input: {
  messages: AssistantMessage[];
  localContext: string;
  webSources: AssistantSource[];
  webResultsText: string | null;
}) {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const client = new GoogleGenAI({ apiKey });
  const response = await client.models.generateContent({
    model: getGeminiAssistantModel(),
    contents: createUserContent([
      {
        text: [
          buildSystemPrompt(input.localContext, input.webResultsText),
          "",
          "Conversation history:",
          buildConversationTranscript(input.messages) || "No prior conversation.",
          "",
          "Answer the latest user message in clean markdown.",
        ].join("\n"),
      },
    ]),
    config: {
      temperature: 0.25,
    },
  });

  const reply = response.text?.trim() ?? "";

  if (!reply) {
    throw new Error("Gemini returned an empty reply.");
  }

  return {
    reply,
    sources: input.webSources,
  };
}

export async function generateAssistantReply(input: {
  messages: AssistantMessage[];
  localContext: string;
  webSources: AssistantSource[];
  webResultsText: string | null;
}) {
  const config = getOllamaConfig();

  if (!config.model) {
    throw new Error("OLLAMA_MODEL is not configured.");
  }

  if (!config.baseUrl) {
    return generateGeminiAssistantReply(input);
  }

  try {
    const endpoint = resolveChatEndpoint(config.baseUrl);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (config.apiKey) {
      headers.Authorization = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({
        model: config.model,
        stream: false,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(input.localContext, input.webResultsText),
          },
          ...trimHistory(input.messages),
        ],
        options: {
          temperature: 0.25,
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Ollama request failed (${response.status}): ${detail.slice(0, 500)}`);
    }

    const payload = (await response.json()) as {
      message?: {
        content?: string;
      };
      response?: string;
    };

    const reply =
      payload.message?.content?.trim() || payload.response?.trim() || "";

    if (!reply) {
      throw new Error("Ollama returned an empty reply.");
    }

    return {
      reply,
      sources: input.webSources,
    };
  } catch (error) {
    if (!getGeminiApiKey()) {
      throw error;
    }

    console.warn("Ollama assistant request failed, falling back to Gemini.", error);
    return generateGeminiAssistantReply(input);
  }
}
