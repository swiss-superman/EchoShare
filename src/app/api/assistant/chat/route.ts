import { NextResponse } from "next/server";
import { z } from "zod";
import { buildAssistantContext } from "@/lib/assistant/context";
import { generateAssistantReply } from "@/lib/assistant/ollama";
import { searchWeb } from "@/lib/assistant/serpapi";
import type { AssistantSource } from "@/lib/assistant/types";
import { isLiveSearchConfigured, isOllamaConfigured } from "@/lib/env";

export const runtime = "nodejs";

const messageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(12),
  useLiveSearch: z.boolean().optional().default(false),
});

function dedupeSources(sources: AssistantSource[]) {
  const seen = new Set<string>();

  return sources.filter((source) => {
    if (seen.has(source.url)) {
      return false;
    }

    seen.add(source.url);
    return true;
  });
}

function buildWebResultsText(
  results: Array<{
    title: string;
    url: string;
    snippet: string;
    source: string;
    publishedAt: string | null;
  }>,
) {
  if (results.length === 0) {
    return null;
  }

  return results
    .map(
      (result, index) =>
        `${index + 1}. ${result.title} | ${result.source}${result.publishedAt ? ` | ${result.publishedAt}` : ""}\n   ${result.snippet}\n   ${result.url}`,
    )
    .join("\n");
}

export async function POST(request: Request) {
  if (!isOllamaConfigured()) {
    return NextResponse.json(
      {
        error:
          "Assistant model is not configured. Set OLLAMA_MODEL and OLLAMA_BASE_URL or OLLAMA_API_KEY-backed cloud access.",
      },
      { status: 503 },
    );
  }

  const body = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid assistant payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const latestUserMessage = [...parsed.data.messages]
      .reverse()
      .find((message) => message.role === "user");

    const [localContext, webSearch] = await Promise.all([
      buildAssistantContext(),
      parsed.data.useLiveSearch && isLiveSearchConfigured() && latestUserMessage
        ? searchWeb(latestUserMessage.content)
        : Promise.resolve({
            provider: "none" as const,
            results: [],
            sources: [] as AssistantSource[],
            warning: null,
          }),
    ]);

    const webResultsText = buildWebResultsText(webSearch.results);
    const generated = await generateAssistantReply({
      messages: parsed.data.messages.map((message, index) => ({
        ...message,
        id: message.id ?? `server-${index}`,
      })),
      localContext: localContext.contextText,
      webResultsText,
      webSources: webSearch.sources,
    });

    return NextResponse.json({
      reply: generated.reply,
      sources: dedupeSources([...localContext.sources, ...generated.sources]).slice(0, 10),
      usedLiveSearch: webSearch.results.length > 0,
      liveSearchAvailable: isLiveSearchConfigured(),
      assistantAvailable: true,
      liveSearchProvider: webSearch.provider,
      liveSearchWarning: webSearch.warning,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Assistant request failed unexpectedly.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}
