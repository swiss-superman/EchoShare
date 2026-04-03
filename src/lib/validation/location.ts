import { getOpenMapValidationConfig } from "@/lib/env";

const WATER_BODY_SEARCH_RADIUS_METERS = 1200;
const NAME_MATCH_ENFORCEMENT_DISTANCE_METERS = 650;
const REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
] as const;

const WATER_BODY_GENERIC_TOKENS = new Set([
  "lake",
  "river",
  "pond",
  "canal",
  "beach",
  "wetland",
  "wetlands",
  "reservoir",
  "shore",
  "edge",
  "inlet",
  "tank",
  "creek",
  "lagoon",
  "bay",
  "water",
  "body",
]);

type ValidationStatus = "accepted" | "rejected" | "skipped";

type OverpassElement = {
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
};

type NominatimReverseResponse = {
  display_name?: string;
  address?: Record<string, string>;
};

type NominatimSearchResponseItem = {
  place_id?: number;
  lat: string;
  lon: string;
  display_name?: string;
  class?: string;
  type?: string;
  name?: string;
};

type NearbyWaterBody = {
  id: string;
  name: string | null;
  kind: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
};

export type ReportLocationValidationResult = {
  status: ValidationStatus;
  message: string | null;
  matchedWaterBodyName: string | null;
  reverseGeocodeLabel: string | null;
  nearbyWaterBodies: NearbyWaterBody[];
  reason: string | null;
};

export type WaterBodyLocationSuggestion = {
  name: string;
  kind: string;
  latitude: number;
  longitude: number;
  displayLabel: string | null;
};

function buildRequestHeaders() {
  const { contactEmail } = getOpenMapValidationConfig();
  const userAgent = contactEmail
    ? `EchoShare/1.0 (${contactEmail})`
    : "EchoShare/1.0";

  return {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    "User-Agent": userAgent,
    ...(contactEmail ? { From: contactEmail } : {}),
  };
}

async function fetchJsonWithTimeout<T>(
  input: string,
  init: RequestInit,
  label: string,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(input, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`${label} responded with ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineDistanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const earthRadiusMeters = 6371000;
  const deltaLatitude = toRadians(latitudeB - latitudeA);
  const deltaLongitude = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(deltaLongitude / 2) ** 2;

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(a));
}

function normalizeName(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getMeaningfulTokens(value: string | null | undefined) {
  return normalizeName(value)
    .split(" ")
    .filter(
      (token) =>
        token.length >= 3 && !WATER_BODY_GENERIC_TOKENS.has(token),
    );
}

function namesProbablyMatch(inputName: string, candidateName: string) {
  const normalizedInput = normalizeName(inputName);
  const normalizedCandidate = normalizeName(candidateName);

  if (!normalizedInput || !normalizedCandidate) {
    return false;
  }

  if (
    normalizedCandidate.includes(normalizedInput) ||
    normalizedInput.includes(normalizedCandidate)
  ) {
    return true;
  }

  const inputTokens = getMeaningfulTokens(inputName);
  const candidateTokens = new Set(getMeaningfulTokens(candidateName));

  if (inputTokens.length === 0 || candidateTokens.size === 0) {
    return false;
  }

  return inputTokens.some((token) => candidateTokens.has(token));
}

function countExactTokenMatches(tokens: string[], candidateText: string | null | undefined) {
  if (tokens.length === 0) {
    return 0;
  }

  const candidateTokens = new Set(
    normalizeName(candidateText)
      .split(" ")
      .filter((token) => token.length >= 2),
  );

  return tokens.filter((token) => candidateTokens.has(token)).length;
}

function getElementCoordinates(element: OverpassElement) {
  if (typeof element.lat === "number" && typeof element.lon === "number") {
    return { latitude: element.lat, longitude: element.lon };
  }

  if (element.center) {
    return {
      latitude: element.center.lat,
      longitude: element.center.lon,
    };
  }

  return null;
}

function deriveWaterBodyName(tags: Record<string, string> | undefined) {
  return (
    tags?.name ??
    tags?.["name:en"] ??
    tags?.water_name ??
    tags?.["official_name"] ??
    null
  );
}

function deriveWaterBodyKind(tags: Record<string, string> | undefined) {
  return (
    tags?.water ??
    tags?.waterway ??
    tags?.natural ??
    tags?.landuse ??
    "water-body"
  );
}

function getWaterBodyPriority(kind: string) {
  const normalized = kind.toLowerCase();

  if (
    normalized.includes("lake") ||
    normalized.includes("reservoir") ||
    normalized.includes("pond") ||
    normalized.includes("wetland") ||
    normalized.includes("lagoon") ||
    normalized.includes("bay")
  ) {
    return 4;
  }

  if (
    normalized.includes("river") ||
    normalized.includes("canal") ||
    normalized.includes("stream") ||
    normalized.includes("creek")
  ) {
    return 3;
  }

  if (normalized.includes("water")) {
    return 2;
  }

  if (normalized.includes("drain") || normalized.includes("ditch")) {
    return 0;
  }

  return 1;
}

function isLowSignalFeatureName(name: string | null) {
  if (!name) {
    return true;
  }

  const normalized = normalizeName(name);

  return /^c\d+[a-z0-9-]*$/i.test(normalized);
}

function isQualifyingWaterBody(feature: NearbyWaterBody) {
  const priority = getWaterBodyPriority(feature.kind);

  if (priority >= 3) {
    return true;
  }

  if (priority === 2) {
    return Boolean(feature.name && !isLowSignalFeatureName(feature.name));
  }

  return false;
}

async function reverseGeocodeLocation(latitude: number, longitude: number) {
  const { nominatimUrl } = getOpenMapValidationConfig();
  const url = new URL("/reverse", nominatimUrl);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", latitude.toString());
  url.searchParams.set("lon", longitude.toString());
  url.searchParams.set("zoom", "17");
  url.searchParams.set("addressdetails", "1");

  try {
    return await fetchJsonWithTimeout<NominatimReverseResponse>(
      url.toString(),
      {
        method: "GET",
        headers: buildRequestHeaders(),
      },
      "Nominatim reverse geocoder",
    );
  } catch (error) {
    console.error("Location reverse geocode failed", error);
    return null;
  }
}

async function findNearbyWaterBodies(latitude: number, longitude: number) {
  const { overpassUrl } = getOpenMapValidationConfig();
  const candidateEndpoints = [
    overpassUrl,
    ...DEFAULT_OVERPASS_ENDPOINTS,
  ].filter((value, index, array) => array.indexOf(value) === index);
  const query = `
[out:json][timeout:25];
(
  way(around:${WATER_BODY_SEARCH_RADIUS_METERS},${latitude},${longitude})["natural"="water"];
  relation(around:${WATER_BODY_SEARCH_RADIUS_METERS},${latitude},${longitude})["natural"="water"];
  way(around:${WATER_BODY_SEARCH_RADIUS_METERS},${latitude},${longitude})["water"];
  relation(around:${WATER_BODY_SEARCH_RADIUS_METERS},${latitude},${longitude})["water"];
  way(around:${WATER_BODY_SEARCH_RADIUS_METERS},${latitude},${longitude})["waterway"~"river|stream|canal|drain|ditch"];
  relation(around:${WATER_BODY_SEARCH_RADIUS_METERS},${latitude},${longitude})["waterway"~"river|stream|canal|drain|ditch"];
);
out center tags qt;
  `.trim();

  for (const endpoint of candidateEndpoints) {
    try {
      const response = await fetchJsonWithTimeout<{ elements?: OverpassElement[] }>(
        endpoint,
        {
          method: "POST",
          headers: buildRequestHeaders(),
          body: new URLSearchParams({ data: query }).toString(),
        },
        "Overpass",
      );

      const waterBodies = (response.elements ?? [])
        .map((element) => {
          const coordinates = getElementCoordinates(element);

          if (!coordinates) {
            return null;
          }

          return {
            id: String(element.id),
            name: deriveWaterBodyName(element.tags),
            kind: deriveWaterBodyKind(element.tags),
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            distanceMeters: haversineDistanceMeters(
              latitude,
              longitude,
              coordinates.latitude,
              coordinates.longitude,
            ),
          } satisfies NearbyWaterBody;
        })
        .filter((item): item is NearbyWaterBody => Boolean(item))
        .sort((left, right) => left.distanceMeters - right.distanceMeters);

      const deduped = new Map<string, NearbyWaterBody>();

      for (const item of waterBodies) {
        const key = `${item.name ?? "unnamed"}:${item.kind}:${Math.round(item.distanceMeters)}`;

        if (!deduped.has(key)) {
          deduped.set(key, item);
        }
      }

      return [...deduped.values()]
        .sort((left, right) => {
          const priorityDifference =
            getWaterBodyPriority(right.kind) - getWaterBodyPriority(left.kind);

          if (priorityDifference !== 0) {
            return priorityDifference;
          }

          return left.distanceMeters - right.distanceMeters;
        })
        .slice(0, 8);
    } catch (error) {
      console.error(`Nearby water body lookup failed for ${endpoint}`, error);
    }
  }

  return null;
}

export async function validateReportLocation(input: {
  latitude: number;
  longitude: number;
  waterBodyName: string;
  locality?: string;
  state?: string;
  country?: string;
}) : Promise<ReportLocationValidationResult> {
  const [reverseGeocode, nearbyWaterBodies] = await Promise.all([
    reverseGeocodeLocation(input.latitude, input.longitude),
    findNearbyWaterBodies(input.latitude, input.longitude),
  ]);

  if (!nearbyWaterBodies) {
    const namedSearchFallback = await searchNamedWaterBodyFallback({
      latitude: input.latitude,
      longitude: input.longitude,
      waterBodyName: input.waterBodyName,
      locality: input.locality,
      state: input.state,
      country: input.country,
    });

    if (namedSearchFallback) {
      return {
        status: namedSearchFallback.isMatchNearby ? "accepted" : "rejected",
        message: namedSearchFallback.isMatchNearby
          ? null
          : `The submitted pin is far from the mapped location of "${namedSearchFallback.feature.name}". Move the pin onto the actual water body before submitting.`,
        matchedWaterBodyName: namedSearchFallback.feature.name,
        reverseGeocodeLabel: reverseGeocode?.display_name ?? null,
        nearbyWaterBodies: [namedSearchFallback.feature],
        reason: namedSearchFallback.isMatchNearby
          ? "Accepted by Nominatim named water-body fallback because Overpass was unavailable."
          : "Rejected by Nominatim named water-body fallback because the submitted pin was far from the mapped feature.",
      };
    }

    return {
      status: "skipped",
      message: null,
      matchedWaterBodyName: null,
      reverseGeocodeLabel: reverseGeocode?.display_name ?? null,
      nearbyWaterBodies: [],
      reason: "Open map validation services were unavailable.",
    };
  }

  if (nearbyWaterBodies.length === 0) {
    return {
      status: "rejected",
      message:
        "Selected coordinates are not near a mapped lake, river, canal, beach, pond, or wetland. Move the pin onto the actual water body area before submitting.",
      matchedWaterBodyName: null,
      reverseGeocodeLabel: reverseGeocode?.display_name ?? null,
      nearbyWaterBodies,
      reason: "No mapped water body was found near the submitted coordinates.",
    };
  }

  const qualifyingWaterBodies = nearbyWaterBodies.filter(isQualifyingWaterBody);

  if (qualifyingWaterBodies.length === 0) {
    return {
      status: "rejected",
      message:
        "Selected coordinates are not near a clear mapped lake, river, canal, beach, pond, or wetland. Move the pin onto the actual water body area before submitting.",
      matchedWaterBodyName: null,
      reverseGeocodeLabel: reverseGeocode?.display_name ?? null,
      nearbyWaterBodies,
      reason:
        "Only low-signal or decorative water features were found near the submitted coordinates.",
    };
  }

  const nearestByDistance = [...qualifyingWaterBodies].sort(
    (left, right) => left.distanceMeters - right.distanceMeters,
  )[0];
  const namedNearby = qualifyingWaterBodies.filter((item) => item.name);
  const matchingNamedFeature =
    namedNearby.find((item) =>
      namesProbablyMatch(input.waterBodyName, item.name ?? ""),
    ) ?? null;
  const bestNamedReference =
    namedNearby
      .filter((item) => !isLowSignalFeatureName(item.name))
      .sort((left, right) => {
        const priorityDifference =
          getWaterBodyPriority(right.kind) - getWaterBodyPriority(left.kind);

        if (priorityDifference !== 0) {
          return priorityDifference;
        }

        return left.distanceMeters - right.distanceMeters;
      })[0] ?? null;

  if (matchingNamedFeature) {
    return {
      status: "accepted",
      message: null,
      matchedWaterBodyName: matchingNamedFeature.name,
      reverseGeocodeLabel: reverseGeocode?.display_name ?? null,
      nearbyWaterBodies,
      reason: null,
    };
  }

  const enforceNamedMatch = getMeaningfulTokens(input.waterBodyName).length > 0;
  const namedSearchFallback = enforceNamedMatch
    ? await searchNamedWaterBodyFallback({
        latitude: input.latitude,
        longitude: input.longitude,
        waterBodyName: input.waterBodyName,
        locality: input.locality,
        state: input.state,
        country: input.country,
      })
    : null;

  if (
    namedSearchFallback &&
    namesProbablyMatch(input.waterBodyName, namedSearchFallback.feature.name) &&
    namedSearchFallback.feature.distanceMeters > 2500
  ) {
    return {
      status: "rejected",
      message: `The selected pin is far from the mapped location of "${namedSearchFallback.feature.name}". Use the locate button or move the pin onto the real water body before submitting.`,
      matchedWaterBodyName: namedSearchFallback.feature.name,
      reverseGeocodeLabel: reverseGeocode?.display_name ?? null,
      nearbyWaterBodies,
      reason:
        "The submitted water body name resolves to a different mapped location than the selected pin.",
    };
  }

  if (
    bestNamedReference &&
    bestNamedReference.distanceMeters <= NAME_MATCH_ENFORCEMENT_DISTANCE_METERS &&
    enforceNamedMatch &&
    !namesProbablyMatch(input.waterBodyName, bestNamedReference.name ?? "")
  ) {
    return {
      status: "rejected",
      message: `The pin is currently closer to "${bestNamedReference.name}" than to "${input.waterBodyName}". Move the marker onto the actual water body before submitting.`,
      matchedWaterBodyName: bestNamedReference.name,
      reverseGeocodeLabel: reverseGeocode?.display_name ?? null,
      nearbyWaterBodies,
      reason: "The selected pin is near a different named water body than the one entered.",
    };
  }

  return {
    status: "accepted",
    message: null,
    matchedWaterBodyName:
      bestNamedReference?.name ?? nearestByDistance.name,
    reverseGeocodeLabel: reverseGeocode?.display_name ?? null,
    nearbyWaterBodies,
    reason: null,
  };
}

function isRelevantNominatimWaterResult(item: NominatimSearchResponseItem) {
  const type = (item.type ?? "").toLowerCase();
  const resultClass = (item.class ?? "").toLowerCase();

  return (
    ["natural", "waterway", "landuse"].includes(resultClass) ||
    [
      "water",
      "lake",
      "reservoir",
      "river",
      "canal",
      "pond",
      "wetland",
      "beach",
      "lagoon",
      "bay",
      "stream",
    ].some((keyword) => type.includes(keyword))
  );
}

async function searchNamedWaterBodyFallback(input: {
  latitude: number;
  longitude: number;
  waterBodyName: string;
  locality?: string;
  state?: string;
  country?: string;
}) {
  if (getMeaningfulTokens(input.waterBodyName).length === 0) {
    return null;
  }

  const { nominatimUrl } = getOpenMapValidationConfig();
  const queries = [
    [
      input.waterBodyName,
      input.locality,
      input.state,
      input.country,
    ]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(", "),
    input.waterBodyName.trim(),
  ].filter((value, index, array) => value.length > 0 && array.indexOf(value) === index);

  for (const query of queries) {
    const url = new URL("/search", nominatimUrl);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "5");
    url.searchParams.set("addressdetails", "1");

    try {
      const results = await fetchJsonWithTimeout<NominatimSearchResponseItem[]>(
        url.toString(),
        {
          method: "GET",
          headers: buildRequestHeaders(),
        },
        "Nominatim search",
      );

      const candidates = results
        .filter(isRelevantNominatimWaterResult)
        .map((item) => {
          const latitude = Number(item.lat);
          const longitude = Number(item.lon);

          return {
            feature: {
              id: String(item.place_id ?? item.display_name ?? item.name ?? "nominatim"),
              name: item.name ?? item.display_name ?? input.waterBodyName,
              kind: item.type ?? item.class ?? "water-body",
              latitude,
              longitude,
              distanceMeters: haversineDistanceMeters(
                input.latitude,
                input.longitude,
                latitude,
                longitude,
              ),
            } satisfies NearbyWaterBody,
          };
        })
        .sort((left, right) => left.feature.distanceMeters - right.feature.distanceMeters);

      const bestCandidate = candidates[0];

      if (bestCandidate) {
        return {
          feature: bestCandidate.feature,
          isMatchNearby: bestCandidate.feature.distanceMeters <= 15000,
        };
      }
    } catch (error) {
      console.error(`Named water body fallback search failed for query "${query}"`, error);
    }
  }

  return null;
}

export async function suggestWaterBodyLocation(input: {
  waterBodyName: string;
  locality?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}) {
  if (getMeaningfulTokens(input.waterBodyName).length === 0) {
    return null;
  }

  const { nominatimUrl } = getOpenMapValidationConfig();
  const localityTokens = getMeaningfulTokens(input.locality);
  const stateTokens = getMeaningfulTokens(input.state);
  const queries = [
    [
      input.waterBodyName,
      input.locality,
      input.state,
      input.country,
    ]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(", "),
    input.waterBodyName.trim(),
  ].filter((value, index, array) => value.length > 0 && array.indexOf(value) === index);

  for (const query of queries) {
    const url = new URL("/search", nominatimUrl);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "5");
    url.searchParams.set("addressdetails", "1");

    try {
      const results = await fetchJsonWithTimeout<NominatimSearchResponseItem[]>(
        url.toString(),
        {
          method: "GET",
          headers: buildRequestHeaders(),
        },
        "Nominatim search",
      );

      const contextTokens = [...localityTokens, ...stateTokens];
      const candidate = results
        .filter(isRelevantNominatimWaterResult)
        .map((item) => {
          const displayLabel = item.display_name ?? null;
          const name = item.name ?? item.display_name ?? input.waterBodyName;
          const localityMatchCount =
            countExactTokenMatches(localityTokens, displayLabel) +
            countExactTokenMatches(localityTokens, name);
          const stateMatchCount =
            countExactTokenMatches(stateTokens, displayLabel) +
            countExactTokenMatches(stateTokens, name);

          return {
            item,
            name,
            displayLabel,
            nameScore: namesProbablyMatch(input.waterBodyName, name) ? 3 : 0,
            contextScore: localityMatchCount * 3 + stateMatchCount,
            localityMatchCount,
            distanceMeters:
              typeof input.latitude === "number" && typeof input.longitude === "number"
                ? haversineDistanceMeters(
                    input.latitude,
                    input.longitude,
                    Number(item.lat),
                    Number(item.lon),
                  )
                : null,
          };
        })
        .sort((left, right) => {
          const scoreDifference =
            right.nameScore + right.contextScore - (left.nameScore + left.contextScore);

          if (scoreDifference !== 0) {
            return scoreDifference;
          }

          if (left.distanceMeters !== null && right.distanceMeters !== null) {
            return left.distanceMeters - right.distanceMeters;
          }

          return left.name.localeCompare(right.name);
        })[0];

      if (!candidate) {
        continue;
      }

      if (contextTokens.length > 0 && candidate.contextScore === 0) {
        continue;
      }

      if (localityTokens.length > 0 && candidate.localityMatchCount === 0) {
        continue;
      }

      return {
        name: candidate.name,
        kind: candidate.item.type ?? candidate.item.class ?? "water-body",
        latitude: Number(candidate.item.lat),
        longitude: Number(candidate.item.lon),
        displayLabel: candidate.displayLabel,
      } satisfies WaterBodyLocationSuggestion;
    } catch (error) {
      console.error(`Water body suggestion lookup failed for query "${query}"`, error);
    }
  }

  return null;
}
