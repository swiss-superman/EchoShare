import { NextResponse } from "next/server";
import { suggestWaterBodyLocation } from "@/lib/validation/location";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const waterBodyName = url.searchParams.get("name")?.trim() ?? "";
  const locality = url.searchParams.get("locality")?.trim() ?? "";
  const state = url.searchParams.get("state")?.trim() ?? "";
  const country = url.searchParams.get("country")?.trim() ?? "India";
  const latitudeParam = url.searchParams.get("latitude");
  const longitudeParam = url.searchParams.get("longitude");
  const latitude = latitudeParam ? Number(latitudeParam) : undefined;
  const longitude = longitudeParam ? Number(longitudeParam) : undefined;

  if (waterBodyName.length < 2) {
    return NextResponse.json(
      { ok: false, error: "Water body name is required." },
      { status: 400 },
    );
  }

  const suggestion = await suggestWaterBodyLocation({
    waterBodyName,
    locality,
    state,
    country,
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
  });

  if (!suggestion) {
    return NextResponse.json(
      { ok: false, error: "No mapped water body was found for that name." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    suggestion,
  });
}
