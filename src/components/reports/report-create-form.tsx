"use client";

import dynamic from "next/dynamic";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { createReportAction } from "@/app/actions/report-actions";
import { initialReportCreateState } from "@/components/reports/report-create-form-state";
import { pollutionCategories, severityLevels } from "@/lib/constants";
import { formatCoordinate } from "@/lib/utils";

const LocationPicker = dynamic(
  () => import("@/components/maps/location-picker").then((mod) => mod.LocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="h-[320px] animate-pulse rounded-[1.6rem] border border-line bg-white/70" />
    ),
  },
);

function SubmitReportButton() {
  const { pending } = useFormStatus();

  return (
    <button
      aria-disabled={pending}
      className="w-full rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:bg-brand/60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Submitting report..." : "Submit report"}
    </button>
  );
}

export function ReportCreateForm() {
  const [state, formAction] = useActionState(
    createReportAction,
    initialReportCreateState,
  );
  const [coordinates, setCoordinates] = useState({
    latitude: 12.9716,
    longitude: 77.5946,
  });
  const [files, setFiles] = useState<File[]>([]);

  const previews = useMemo(
    () => files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(
    () => () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    },
    [previews],
  );

  const titleError = state.fieldErrors?.title?.[0];
  const waterBodyError = state.fieldErrors?.waterBodyName?.[0];
  const observedAtError = state.fieldErrors?.observedAt?.[0];
  const descriptionError = state.fieldErrors?.description?.[0];
  const latitudeError = state.fieldErrors?.latitude?.[0];
  const longitudeError = state.fieldErrors?.longitude?.[0];

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="space-y-5 rounded-[1.8rem] border border-line bg-white/75 p-6">
        <div>
          <div className="section-kicker">Pollution reporting</div>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em]">
            Submit geo-tagged evidence
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
            Capture what you saw, where it is, and why it matters. EchoShare
            keeps raw citizen evidence separate from AI-assisted
            classification.
          </p>
        </div>
        {state.status === "error" && state.message ? (
          <div
            aria-live="polite"
            className="rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
          >
            {state.message}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2 text-sm font-medium md:col-span-2">
            <span>Title</span>
            <input
              aria-invalid={Boolean(titleError)}
              className="w-full rounded-2xl border border-line bg-white px-4 py-3"
              minLength={5}
              name="title"
              placeholder="Plastic waste piling up near the inlet"
              required
              type="text"
            />
            {titleError ? <p className="text-xs text-rose-700">{titleError}</p> : null}
          </label>
          <label className="block space-y-2 text-sm font-medium">
            <span>Water body name</span>
            <input
              aria-invalid={Boolean(waterBodyError)}
              className="w-full rounded-2xl border border-line bg-white px-4 py-3"
              minLength={2}
              name="waterBodyName"
              placeholder="Ulsoor Lake south edge"
              required
              type="text"
            />
            {waterBodyError ? (
              <p className="text-xs text-rose-700">{waterBodyError}</p>
            ) : null}
          </label>
          <label className="block space-y-2 text-sm font-medium">
            <span>Observed at</span>
            <input
              aria-invalid={Boolean(observedAtError)}
              className="w-full rounded-2xl border border-line bg-white px-4 py-3"
              defaultValue={new Date().toISOString().slice(0, 16)}
              name="observedAt"
              required
              type="datetime-local"
            />
            {observedAtError ? (
              <p className="text-xs text-rose-700">{observedAtError}</p>
            ) : null}
          </label>
          <label className="block space-y-2 text-sm font-medium">
            <span>Category</span>
            <select
              className="w-full rounded-2xl border border-line bg-white px-4 py-3"
              defaultValue="PLASTIC"
              name="category"
            >
              {pollutionCategories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2 text-sm font-medium">
            <span>Severity</span>
            <select
              className="w-full rounded-2xl border border-line bg-white px-4 py-3"
              defaultValue="MEDIUM"
              name="userSeverity"
            >
              {severityLevels.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2 text-sm font-medium md:col-span-2">
            <span>Description</span>
            <textarea
              aria-invalid={Boolean(descriptionError)}
              className="min-h-[180px] w-full rounded-2xl border border-line bg-white px-4 py-3"
              minLength={20}
              name="description"
              placeholder="Describe the visible waste, smell, water condition, nearby inflow, or immediate risk to the public and ecosystem."
              required
            />
            {descriptionError ? (
              <p className="text-xs text-rose-700">{descriptionError}</p>
            ) : null}
          </label>
          <label className="block space-y-2 text-sm font-medium md:col-span-2">
            <span>Images</span>
            <input
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="w-full rounded-2xl border border-line bg-white px-4 py-3"
              multiple
              name="images"
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              type="file"
            />
          </label>
          {previews.length > 0 ? (
            <div className="grid gap-3 md:col-span-2 md:grid-cols-3">
              {previews.map((preview) => (
                <div
                  key={preview.name}
                  className="overflow-hidden rounded-[1.3rem] border border-line"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={preview.name}
                    className="h-32 w-full object-cover"
                    src={preview.url}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <aside className="space-y-5">
        <section className="space-y-4 rounded-[1.8rem] border border-line bg-white/75 p-6">
          <div>
            <h3 className="font-display text-2xl font-semibold tracking-[-0.04em]">
              Pin the location
            </h3>
            <p className="mt-2 text-sm leading-7 text-muted">
              Click the map to mark the report. You can also use the browser’s
              current location and fine-tune manually.
            </p>
          </div>
          <LocationPicker
            latitude={coordinates.latitude}
            longitude={coordinates.longitude}
            onChange={setCoordinates}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">
              <span>Latitude</span>
              <input
                aria-invalid={Boolean(latitudeError)}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3"
                name="latitude"
                onChange={(event) =>
                  setCoordinates((current) => ({
                    ...current,
                    latitude: Number(event.target.value),
                  }))
                }
                step="0.0001"
                type="number"
                value={formatCoordinate(coordinates.latitude)}
              />
              {latitudeError ? (
                <p className="text-xs text-rose-700">{latitudeError}</p>
              ) : null}
            </label>
            <label className="space-y-2 text-sm font-medium">
              <span>Longitude</span>
              <input
                aria-invalid={Boolean(longitudeError)}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3"
                name="longitude"
                onChange={(event) =>
                  setCoordinates((current) => ({
                    ...current,
                    longitude: Number(event.target.value),
                  }))
                }
                step="0.0001"
                type="number"
                value={formatCoordinate(coordinates.longitude)}
              />
              {longitudeError ? (
                <p className="text-xs text-rose-700">{longitudeError}</p>
              ) : null}
            </label>
          </div>
          <button
            className="rounded-full border border-line-strong px-4 py-3 text-sm font-semibold transition hover:bg-white"
            onClick={() => {
              if (!navigator.geolocation) {
                return;
              }

              navigator.geolocation.getCurrentPosition((position) => {
                setCoordinates({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                });
              });
            }}
            type="button"
          >
            Use my current location
          </button>
        </section>

        <section className="space-y-4 rounded-[1.8rem] border border-line bg-white/75 p-6">
          <h3 className="font-display text-2xl font-semibold tracking-[-0.04em]">
            Context notes
          </h3>
          <label className="block space-y-2 text-sm font-medium">
            <span>Address or landmark</span>
            <input
              className="w-full rounded-2xl border border-line bg-white px-4 py-3"
              name="address"
              placeholder="Gate 2 access path, beside stormwater inlet"
              type="text"
            />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            <span>Locality</span>
            <input
              className="w-full rounded-2xl border border-line bg-white px-4 py-3"
              name="locality"
              placeholder="Ward / neighborhood"
              type="text"
            />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            <span>District</span>
            <input
              className="w-full rounded-2xl border border-line bg-white px-4 py-3"
              name="district"
              type="text"
            />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            <span>State</span>
            <input
              className="w-full rounded-2xl border border-line bg-white px-4 py-3"
              name="state"
              type="text"
            />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            <span>Country</span>
            <input
              className="w-full rounded-2xl border border-line bg-white px-4 py-3"
              defaultValue="India"
              name="country"
              type="text"
            />
          </label>
          <SubmitReportButton />
        </section>
      </aside>
    </form>
  );
}
