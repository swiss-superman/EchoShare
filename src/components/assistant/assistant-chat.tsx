"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Compass,
  ExternalLink,
  LoaderCircle,
  RefreshCcw,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  AssistantChatResponse,
  AssistantMessage,
  AssistantSource,
} from "@/lib/assistant/types";

const STORAGE_KEY = "echoshare-assistant-thread-v1";

const starterPrompts = [
  "Which water bodies currently look most urgent in EchoShare, and what should communities do next?",
  "Match the best NGO or government responders for plastic waste around Ulsoor Lake.",
  "Summarize the latest external intelligence signals relevant to India water-body pollution.",
  "Use live web search and tell me the latest India updates about lake pollution or wetland restoration.",
];

function createMessage(
  role: AssistantMessage["role"],
  content: string,
  sources?: AssistantSource[],
): AssistantMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    sources,
  };
}

function MarkdownAnswer({ content }: { content: string }) {
  return (
    <div className="space-y-3 text-[15px] leading-7 text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="text-[15px] leading-7">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc space-y-2 pl-5 text-[15px] leading-7">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-7">{children}</ol>
          ),
          li: ({ children }) => <li>{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-[#0f2633]">{children}</strong>
          ),
          h1: ({ children }) => (
            <h1 className="font-display text-2xl font-semibold tracking-[-0.03em] text-[#0f2633]">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-display text-xl font-semibold tracking-[-0.03em] text-[#0f2633]">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-display text-lg font-semibold tracking-[-0.02em] text-[#0f2633]">
              {children}
            </h3>
          ),
          code: ({ children }) => (
            <code className="rounded bg-[#eef5f7] px-1.5 py-0.5 font-mono text-[13px] text-[#123346]">
              {children}
            </code>
          ),
          a: ({ children, href }) => (
            <a
              className="font-medium text-brand underline decoration-brand/30 underline-offset-4"
              href={href}
              rel="noreferrer"
              target="_blank"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="rounded-r-2xl border-l-2 border-brand/30 bg-[#f4fbfb] px-4 py-3 text-muted">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function SourcePanel({
  messageId,
  sources,
}: {
  messageId: string;
  sources: AssistantSource[];
}) {
  return (
    <details className="mt-5 rounded-[1.2rem] border border-line bg-[#f8f4ec]">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-[#123346]">
        <span>Sources used</span>
        <Badge tone="default">{sources.length}</Badge>
      </summary>
      <div className="grid gap-3 border-t border-line px-4 py-4">
        {sources.map((source) => (
          <a
            key={`${messageId}-${source.url}`}
            className="rounded-[1rem] border border-line bg-white px-4 py-3 transition hover:border-line-strong hover:bg-[#fcfaf6]"
            href={source.url}
            rel="noreferrer"
            target="_blank"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <Badge tone={source.kind === "web-search" ? "default" : "brand"}>
                    {source.kind === "web-search" ? "Web result" : "EchoShare context"}
                  </Badge>
                </div>
                <p className="mt-3 font-semibold text-foreground">{source.title}</p>
                {source.note ? (
                  <p className="mt-1 text-sm leading-6 text-muted">{source.note}</p>
                ) : null}
              </div>
              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            </div>
          </a>
        ))}
      </div>
    </details>
  );
}

function MessageBubble({ message }: { message: AssistantMessage }) {
  const isAssistant = message.role === "assistant";

  return (
    <article
      className={`flex gap-3 ${isAssistant ? "items-start" : "justify-end items-start"}`}
    >
      {isAssistant ? (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-black/6 bg-white shadow-[0_10px_24px_rgba(17,35,47,0.08)]">
          <Image
            alt="EcoShare logo"
            className="h-full w-full object-cover"
            height={44}
            src="/brand/ecoshare-logo.jpeg"
            width={44}
          />
        </div>
      ) : null}

      <div
        className={`min-w-0 max-w-[min(100%,52rem)] rounded-[1.55rem] border px-5 py-4 shadow-[0_16px_40px_rgba(17,35,47,0.06)] ${
          isAssistant
            ? "border-line bg-white"
            : "border-brand/25 bg-[linear-gradient(180deg,#0f7f8f,#116a77)] text-white"
        }`}
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
          {isAssistant ? (
            <>
              <Sparkles className="h-4 w-4 text-brand" />
              <span className="text-[#123346]">EchoShare Assistant</span>
            </>
          ) : (
            <>
              <Search className="h-4 w-4 text-white/80" />
              <span className="text-white/90">You</span>
            </>
          )}
        </div>

        <div className="mt-3">
          {isAssistant ? (
            <MarkdownAnswer content={message.content} />
          ) : (
            <div className="whitespace-pre-wrap text-[15px] leading-7 text-white">
              {message.content}
            </div>
          )}
        </div>

        {isAssistant && message.sources && message.sources.length > 0 ? (
          <SourcePanel messageId={message.id} sources={message.sources} />
        ) : null}
      </div>
    </article>
  );
}

export function AssistantChat({
  assistantMode,
  assistantReady,
  liveSearchReady,
}: {
  assistantMode: "ollama" | "gemini" | "none";
  assistantReady: boolean;
  liveSearchReady: boolean;
}) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [useLiveSearch, setUseLiveSearch] = useState(liveSearchReady);
  const [error, setError] = useState<string | null>(null);
  const [searchWarning, setSearchWarning] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as AssistantMessage[];
      setMessages(parsed);
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isPending]);

  const canSend = assistantReady && draft.trim().length > 0 && !isPending;

  const messageCountLabel = useMemo(
    () => `${messages.length} message${messages.length === 1 ? "" : "s"}`,
    [messages.length],
  );

  function handleSubmit(promptOverride?: string) {
    const nextPrompt = (promptOverride ?? draft).trim();

    if (!assistantReady || !nextPrompt) {
      return;
    }

    const nextMessages = [...messages, createMessage("user", nextPrompt)];
    setMessages(nextMessages);
    setDraft("");
    setError(null);
    setSearchWarning(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/assistant/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: nextMessages,
            useLiveSearch,
          }),
        });

        const payload = (await response.json()) as
          | AssistantChatResponse
          | { error?: string };

        if (!response.ok || !("reply" in payload)) {
          throw new Error(
            "error" in payload ? payload.error ?? "Assistant request failed." : "Assistant request failed.",
          );
        }

        setMessages((current) => [
          ...current,
          createMessage("assistant", payload.reply, payload.sources),
        ]);
        setSearchWarning(payload.liveSearchWarning ?? null);
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Assistant request failed.";
        setError(message);
      }
    });
  }

  return (
    <section className="shell-frame min-w-0 rounded-[1.8rem] px-6 py-6">
      <div className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="section-kicker">Assistant console</div>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em]">
            Grounded civic assistant
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            Uses EchoShare reports, responders, cleanups, and intelligence signals as
            local context. Live search is optional and remains separate from
            citizen-report truth.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={assistantReady ? "success" : "danger"}>
            {assistantMode === "ollama"
              ? "Ollama ready"
              : assistantMode === "gemini"
                ? "Gemini ready"
                : "Assistant config needed"}
          </Badge>
          <Badge tone={liveSearchReady ? "brand" : "muted"}>
            {liveSearchReady ? "Live search available" : "Live search off"}
          </Badge>
          <Badge tone="default">{messageCountLabel}</Badge>
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-line bg-white/72 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-3 text-sm font-medium text-foreground">
            <input
              checked={useLiveSearch}
              className="h-4 w-4 rounded border-line text-brand"
              disabled={!liveSearchReady}
              onChange={(event) => setUseLiveSearch(event.target.checked)}
              type="checkbox"
            />
            Use live web search
          </label>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-sm font-semibold transition hover:bg-white"
            onClick={() => {
              setMessages([]);
              setError(null);
              setSearchWarning(null);
              window.sessionStorage.removeItem(STORAGE_KEY);
            }}
            type="button"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear thread
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-[1.6rem] border border-line bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(245,250,251,0.9))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] sm:p-5">
        {messages.length === 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                className="rounded-[1.35rem] border border-line bg-white/88 p-5 text-left transition hover:border-line-strong hover:bg-white"
                onClick={() => handleSubmit(prompt)}
                type="button"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-brand">
                  <Compass className="h-4 w-4" />
                  Starter prompt
                </div>
                <p className="mt-3 text-base leading-7 text-foreground">{prompt}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isPending ? (
              <article className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-black/6 bg-white shadow-[0_10px_24px_rgba(17,35,47,0.08)]">
                  <Image
                    alt="EcoShare logo"
                    className="h-full w-full object-cover"
                    height={44}
                    src="/brand/ecoshare-logo.jpeg"
                    width={44}
                  />
                </div>
                <div className="max-w-[min(100%,52rem)] rounded-[1.55rem] border border-line bg-white px-5 py-4 shadow-[0_16px_40px_rgba(17,35,47,0.06)]">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#123346]">
                    <Sparkles className="h-4 w-4 text-brand" />
                    EchoShare Assistant
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted">
                    <LoaderCircle className="h-4 w-4 animate-spin text-brand" />
                    Generating a grounded answer...
                  </div>
                </div>
              </article>
            ) : null}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>

      {error ? (
        <div className="mt-5 rounded-[1.2rem] border border-danger/20 bg-danger/8 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {searchWarning ? (
        <div className="mt-5 rounded-[1.2rem] border border-brand/18 bg-brand/8 px-4 py-3 text-sm text-foreground">
          Live search note: {searchWarning}
        </div>
      ) : null}

      <form
        className="mt-6 rounded-[1.6rem] border border-line bg-white/82 p-4 shadow-[0_14px_34px_rgba(17,35,47,0.06)]"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <textarea
          className="min-h-[132px] w-full resize-y rounded-[1.35rem] border border-line bg-[#fdfcf9] px-4 py-3 text-[15px] leading-7 outline-none transition placeholder:text-muted focus:border-line-strong"
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask about hotspots, responders, cleanup planning, or use live search for the latest India water-body updates..."
          value={draft}
        />

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            The assistant keeps citizen reports, external signals, and live search clearly separated.
          </p>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[180px]"
            disabled={!canSend}
            type="submit"
          >
            {isPending ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Thinking
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
