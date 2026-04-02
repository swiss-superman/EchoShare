import type {
  IntelligenceSignalType,
  IntelligenceSourceType,
} from "@prisma/client";
import { getFirecrawlConfig } from "@/lib/env";

type FirecrawlSearchSource = "news" | "web";

export type IntelligenceSourceConfig = {
  slug: string;
  name: string;
  type: IntelligenceSourceType;
  signalType: IntelligenceSignalType;
  description: string;
  queries: string[];
  sourceUrl: string | null;
  focusLabel: string;
  searchSources: FirecrawlSearchSource[];
  maxItemsPerRun: number;
  tbs?: string;
  tags: string[];
  requiredTerms?: string[];
  excludedTerms?: string[];
};

export function getIntelligenceSourceConfigs(): IntelligenceSourceConfig[] {
  const firecrawlConfig = getFirecrawlConfig();
  const location = firecrawlConfig.searchLocation;

  return [
    {
      slug: "cpcb-official-watch",
      name: "CPCB official watch",
      type: "OFFICIAL_SITE",
      signalType: "OFFICIAL_UPDATE",
      description:
        "Recent official Central Pollution Control Board updates connected to water, sewage, pollution control, or environmental enforcement in India.",
      queries: [
        'site:cpcb.nic.in "polluted river stretches"',
        'site:cpcb.nic.in "water quality" river sewage lake wetland',
      ],
      sourceUrl: "https://cpcb.nic.in/",
      focusLabel: "India",
      searchSources: ["web"],
      maxItemsPerRun: Math.max(1, firecrawlConfig.officialLimit),
      tbs: "sbd:1,qdr:m",
      tags: ["official", "regulator", "pollution-control"],
      requiredTerms: ["river", "water", "sewage", "lake", "wetland", "pollution"],
      excludedTerms: ["air", "ambient air", "noise", "laboratory"],
    },
    {
      slug: "nmcg-official-watch",
      name: "NMCG official watch",
      type: "OFFICIAL_SITE",
      signalType: "OFFICIAL_UPDATE",
      description:
        "Recent National Mission for Clean Ganga updates covering river health, sewage interception, restoration, or basin-level action.",
      queries: [
        'site:nmcg.nic.in Ganga sewage treatment river restoration',
        'site:nmcg.nic.in "polluted river stretches" Ganga',
      ],
      sourceUrl: "https://nmcg.nic.in/",
      focusLabel: "Ganga basin",
      searchSources: ["web"],
      maxItemsPerRun: Math.max(1, firecrawlConfig.officialLimit),
      tbs: "sbd:1,qdr:m",
      tags: ["official", "river-mission", "ganga"],
      requiredTerms: ["ganga", "river", "sewage", "water quality", "restoration"],
    },
    {
      slug: "bbmp-lakes-watch",
      name: "BBMP lakes watch",
      type: "OFFICIAL_SITE",
      signalType: "OFFICIAL_UPDATE",
      description:
        "Recent Bengaluru lake-system updates from the official BBMP lake platform.",
      queries: [
        'site:lms.bbmpgov.in Bengaluru lake sewage pollution restoration',
        'site:lms.bbmpgov.in Bengaluru lake encroachment wetland',
      ],
      sourceUrl: "https://lms.bbmpgov.in/",
      focusLabel: "Bengaluru",
      searchSources: ["web"],
      maxItemsPerRun: Math.max(1, firecrawlConfig.officialLimit),
      tbs: "sbd:1,qdr:m",
      tags: ["official", "lakes", "bengaluru"],
      requiredTerms: ["lake", "bengaluru", "sewage", "pollution", "encroachment", "wetland"],
    },
    {
      slug: "saytrees-field-watch",
      name: "SayTrees field watch",
      type: "OFFICIAL_SITE",
      signalType: "OFFICIAL_UPDATE",
      description:
        "Recent official SayTrees updates relevant to lake restoration, cleanup activity, or community-led water stewardship.",
      queries: [
        'site:saytrees.org lake restoration cleanup volunteer water conservation',
        'site:saytrees.org wetland biodiversity lake restoration Bengaluru',
      ],
      sourceUrl: "https://www.saytrees.org/",
      focusLabel: "Bengaluru and India",
      searchSources: ["web"],
      maxItemsPerRun: Math.max(1, firecrawlConfig.officialLimit),
      tbs: "sbd:1,qdr:m",
      tags: ["official", "ngo", "cleanup"],
      requiredTerms: ["lake", "cleanup", "restoration", "water", "volunteer"],
    },
    {
      slug: "kspcb-water-watch",
      name: "KSPCB water watch",
      type: "OFFICIAL_SITE",
      signalType: "OFFICIAL_UPDATE",
      description:
        "Karnataka pollution-control updates relevant to sewage, industrial discharge, lakes, rivers, and water-quality action.",
      queries: [
        'site:kspcb.karnataka.gov.in Karnataka water pollution sewage lake river',
        'site:kspcb.sumukha.app Karnataka pollution water sewage lake',
      ],
      sourceUrl: "https://kspcb.sumukha.app/",
      focusLabel: "Karnataka",
      searchSources: ["web"],
      maxItemsPerRun: Math.max(1, firecrawlConfig.officialLimit),
      tbs: "sbd:1,qdr:m",
      tags: ["official", "regulator", "karnataka"],
      requiredTerms: ["water", "sewage", "lake", "river", "pollution", "karnataka"],
      excludedTerms: ["air", "ambient air", "noise"],
    },
    {
      slug: "hasiru-dala-field-watch",
      name: "Hasiru Dala field watch",
      type: "OFFICIAL_SITE",
      signalType: "OFFICIAL_UPDATE",
      description:
        "Waste-system and plastic-recovery updates relevant to cleanup action, ward-level solid waste response, and circular recovery.",
      queries: [
        'site:hasirudala.in waste plastic cleanup Bengaluru lake',
        'site:hasirudala.in solid waste recovery community Bengaluru',
      ],
      sourceUrl: "https://hasirudala.in/",
      focusLabel: "Bengaluru and Karnataka",
      searchSources: ["web"],
      maxItemsPerRun: Math.max(1, firecrawlConfig.officialLimit),
      tbs: "sbd:1,qdr:m",
      tags: ["official", "ngo", "waste"],
      requiredTerms: ["waste", "plastic", "cleanup", "recovery", "community"],
    },
    {
      slug: "wake-the-lake-watch",
      name: "Wake the Lake watch",
      type: "OFFICIAL_SITE",
      signalType: "OFFICIAL_UPDATE",
      description:
        "Wake the Lake and allied Bengaluru stewardship updates relevant to local restoration and community lake action.",
      queries: [
        'site:uwbengaluru.org "Wake the Lake" restoration lake Bengaluru',
        'site:uwbengaluru.org lake stewardship volunteer Bengaluru',
      ],
      sourceUrl: "https://www.uwbengaluru.org/wake-the-lake/",
      focusLabel: "Bengaluru",
      searchSources: ["web"],
      maxItemsPerRun: Math.max(1, firecrawlConfig.officialLimit),
      tbs: "sbd:1,qdr:m",
      tags: ["official", "ngo", "lake-restoration"],
      requiredTerms: ["lake", "bengaluru", "restoration", "volunteer", "cleanup"],
    },
    {
      slug: "india-water-pollution-news",
      name: "India water-pollution news",
      type: "NEWS_QUERY",
      signalType: "NEWS_MENTION",
      description:
        "Recent India news mentions tied to lakes, rivers, wetlands, sewage, or visible waste near water bodies.",
      queries: [
        `${location} water pollution lake river wetland sewage plastic waste`,
        `${location} lake pollution sewage river dumping wetland`,
      ],
      sourceUrl: null,
      focusLabel: "India",
      searchSources: ["news"],
      maxItemsPerRun: firecrawlConfig.newsLimit,
      tags: ["news", "pollution", "water-bodies"],
      requiredTerms: ["lake", "river", "wetland", "sewage", "waste", "pollution", "water"],
    },
    {
      slug: "india-cleanup-restoration-news",
      name: "India cleanup and restoration news",
      type: "NEWS_QUERY",
      signalType: "NEWS_MENTION",
      description:
        "Recent India news mentions focused on cleanup campaigns, restoration drives, or community response around water bodies.",
      queries: [
        `${location} lake cleanup river cleanup wetland restoration water body drive`,
        `${location} lake restoration volunteer river cleanup community`,
      ],
      sourceUrl: null,
      focusLabel: "India",
      searchSources: ["news"],
      maxItemsPerRun: firecrawlConfig.newsLimit,
      tags: ["news", "cleanup", "restoration"],
      requiredTerms: ["lake", "river", "wetland", "cleanup", "restoration", "water"],
    },
  ];
}
