import { Bot, Database, Search, ShieldCheck } from "lucide-react";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { Badge } from "@/components/ui/badge";
import { getHomePageData, getIntelligencePageData } from "@/lib/data/queries";
import {
  getOllamaConfig,
  getSerpApiConfig,
  isFirecrawlConfigured,
  isLiveSearchConfigured,
  isOllamaConfigured,
} from "@/lib/env";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const [homeData, intelligenceData] = await Promise.all([
    getHomePageData(),
    getIntelligencePageData(),
  ]);
  const ollamaConfig = getOllamaConfig();
  const serpApiConfig = getSerpApiConfig();
  const assistantReady = isOllamaConfigured();
  const liveSearchReady = isLiveSearchConfigured();
  const firecrawlReady = isFirecrawlConfigured();

  return (
    <section className="w-full min-w-0 space-y-6 overflow-x-clip">
      <header className="shell-frame rounded-[1.8rem] px-6 py-6">
        <div className="section-kicker">Assistant layer</div>
        <h1 className="mt-3 max-w-4xl font-display text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          Context-grounded water-response assistant
        </h1>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-muted">
          This assistant reasons over EchoShare reports, responders, cleanup plans,
          and external intelligence signals. Live Google search is optional and kept
          separate from citizen-report truth so the answer stays operational instead
          of speculative.
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.3rem] border border-line bg-white/68 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted">
              <Database className="h-4 w-4" />
              Local reports
            </div>
            <div className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em]">
              {formatNumber(homeData.metrics.totalReports)}
            </div>
            <div className="mt-2 text-sm text-muted">
              Visible reports available as grounding context
            </div>
          </div>
          <div className="rounded-[1.3rem] border border-line bg-white/68 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted">
              <ShieldCheck className="h-4 w-4" />
              Responders
            </div>
            <div className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em]">
              {formatNumber(homeData.metrics.organizations)}
            </div>
            <div className="mt-2 text-sm text-muted">
              Directory records available for routing and escalation
            </div>
          </div>
          <div className="rounded-[1.3rem] border border-line bg-white/68 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted">
              <Search className="h-4 w-4" />
              Search routing
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Badge tone={liveSearchReady ? "brand" : "muted"}>
                {serpApiConfig.apiKey
                  ? "SerpAPI + fallback"
                  : firecrawlReady
                    ? "Firecrawl only"
                    : "Off"}
              </Badge>
            </div>
            <div className="mt-2 text-sm text-muted">
              {serpApiConfig.apiKey
                ? `Google search is routed through SerpAPI for ${serpApiConfig.location} queries, with Firecrawl fallback whenever that path is unavailable`
                : firecrawlReady
                  ? "SerpAPI is not active, but Firecrawl search fallback is available"
                  : "Add SERPAPI_API_KEY or FIRECRAWL_API_KEY to enable live web search in chat"}
            </div>
          </div>
          <div className="rounded-[1.3rem] border border-line bg-white/68 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted">
              <Bot className="h-4 w-4" />
              Ollama model
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Badge tone={assistantReady ? "success" : "danger"}>
                {assistantReady ? "Connected" : "Needs config"}
              </Badge>
            </div>
            <div className="mt-2 text-sm text-muted">
              {assistantReady
                ? `${ollamaConfig.model} at ${ollamaConfig.baseUrl}`
                : "Set OLLAMA_BASE_URL if needed. The model defaults to gpt-oss:120b-cloud."}
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <AssistantChat
          assistantReady={assistantReady}
          liveSearchReady={liveSearchReady}
        />

        <aside className="min-w-0 space-y-6">
          <section className="shell-frame rounded-[1.8rem] px-5 py-5">
            <div className="section-kicker">How it answers</div>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em]">
              Grounding rules
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-muted">
              <p>Citizen reports remain the primary truth layer.</p>
              <p>External intelligence and live web search stay clearly labeled as supporting context.</p>
              <p>The assistant should recommend responders and actions, not silently invent incidents.</p>
            </div>
          </section>

          <section className="shell-frame rounded-[1.8rem] px-5 py-5">
            <div className="section-kicker">Current context</div>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em]">
              What the model can see
            </h2>
            <div className="mt-4 space-y-4">
              <div className="rounded-[1.25rem] border border-line bg-white/72 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-muted">
                  Live report truth
                </div>
                <div className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em]">
                  {formatNumber(homeData.metrics.totalReports)}
                </div>
                <p className="mt-2 text-sm leading-7 text-muted">
                  Reports, hotspots, cleanup events, and responder records are included in local grounding.
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-line bg-white/72 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-muted">
                  External intelligence
                </div>
                <div className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em]">
                  {formatNumber(intelligenceData.metrics.totalSignals)}
                </div>
                <p className="mt-2 text-sm leading-7 text-muted">
                  Active official and news signals can be used as context, but never as citizen-report truth.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
