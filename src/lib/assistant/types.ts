export type AssistantRole = "user" | "assistant";

export type AssistantSourceKind =
  | "local-report"
  | "local-organization"
  | "local-intelligence"
  | "web-search";

export type AssistantSource = {
  title: string;
  url: string;
  kind: AssistantSourceKind;
  note?: string;
};

export type AssistantMessage = {
  id: string;
  role: AssistantRole;
  content: string;
  sources?: AssistantSource[];
};

export type AssistantChatResponse = {
  reply: string;
  sources: AssistantSource[];
  usedLiveSearch: boolean;
  liveSearchAvailable: boolean;
  assistantAvailable: boolean;
  liveSearchProvider?: "serpapi" | "firecrawl" | "none";
  liveSearchWarning?: string | null;
};
