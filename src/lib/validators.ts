import { z } from "zod";
import {
  organizationTypes,
  pollutionCategories,
  postTypes,
  severityLevels,
} from "@/lib/constants";

const categoryValues = pollutionCategories.map((item) => item.value);
const severityValues = severityLevels.map((item) => item.value);
const postTypeValues = postTypes.map((item) => item.value);
const organizationTypeValues = organizationTypes.map((item) => item.value);

export const reportSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(20).max(3000),
  waterBodyName: z.string().min(2).max(120),
  category: z.enum(categoryValues as [string, ...string[]]),
  userSeverity: z.enum(severityValues as [string, ...string[]]),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  address: z.string().max(180).optional().default(""),
  locality: z.string().max(120).optional().default(""),
  district: z.string().max(120).optional().default(""),
  state: z.string().max(120).optional().default(""),
  country: z.string().max(120).optional().default("India"),
  observedAt: z.string().min(1),
});

export const postSchema = z.object({
  title: z.string().min(5).max(120),
  body: z.string().min(20).max(3000),
  type: z.enum(postTypeValues as [string, ...string[]]),
  waterBodyId: z.string().optional().nullable(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  address: z.string().max(180).optional().default(""),
  locality: z.string().max(120).optional().default(""),
  district: z.string().max(120).optional().default(""),
  state: z.string().max(120).optional().default(""),
  country: z.string().max(120).optional().default("India"),
  scheduledFor: z.string().optional().nullable(),
});

export const commentSchema = z.object({
  postId: z.string().min(1),
  body: z.string().min(2).max(1000),
});

export const cleanupEventSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(20).max(2000),
  waterBodyId: z.string().min(1),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  address: z.string().max(180).optional().default(""),
  locality: z.string().max(120).optional().default(""),
  district: z.string().max(120).optional().default(""),
  state: z.string().max(120).optional().default(""),
  country: z.string().max(120).optional().default("India"),
  scheduledAt: z.string().min(1),
  endsAt: z.string().optional().nullable(),
  maxParticipants: z.coerce.number().int().min(1).max(500).optional(),
});

export const organizationSchema = z.object({
  name: z.string().min(2).max(140),
  type: z.enum(organizationTypeValues as [string, ...string[]]),
  areaServed: z.string().min(2).max(140),
});
