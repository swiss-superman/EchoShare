"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dbOrThrow } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  cleanupEventSchema,
  commentSchema,
  postSchema,
} from "@/lib/validators";

function revalidateCommunityPaths() {
  revalidatePath("/community");
  revalidatePath("/dashboard");
}

export async function createPostAction(formData: FormData) {
  const user = await requireUser();
  const db = dbOrThrow();
  const parsed = postSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid community post.");
  }

  const location =
    parsed.data.latitude !== undefined && parsed.data.longitude !== undefined
      ? await db.location.create({
          data: {
            label: parsed.data.address || parsed.data.title,
            address: parsed.data.address || null,
            locality: parsed.data.locality || null,
            district: parsed.data.district || null,
            state: parsed.data.state || null,
            country: parsed.data.country || "India",
            latitude: parsed.data.latitude,
            longitude: parsed.data.longitude,
          },
        })
      : null;

  await db.post.create({
    data: {
      authorId: user.id,
      waterBodyId: parsed.data.waterBodyId || null,
      locationId: location?.id ?? null,
      title: parsed.data.title,
      body: parsed.data.body,
      type: parsed.data.type as never,
      scheduledFor: parsed.data.scheduledFor ? new Date(parsed.data.scheduledFor) : null,
    },
  });

  revalidateCommunityPaths();
  redirect("/community");
}

export async function createCleanupEventAction(formData: FormData) {
  const user = await requireUser();
  const db = dbOrThrow();
  const parsed = cleanupEventSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid cleanup event.");
  }

  const location = await db.location.create({
    data: {
      label: parsed.data.address || parsed.data.title,
      address: parsed.data.address || null,
      locality: parsed.data.locality || null,
      district: parsed.data.district || null,
      state: parsed.data.state || null,
      country: parsed.data.country || "India",
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
    },
  });

  await db.$transaction(async (tx) => {
    const post = await tx.post.create({
      data: {
        authorId: user.id,
        waterBodyId: parsed.data.waterBodyId,
        locationId: location.id,
        title: parsed.data.title,
        body: parsed.data.description,
        type: "CLEANUP_CALL",
        scheduledFor: new Date(parsed.data.scheduledAt),
      },
    });

    await tx.cleanupEvent.create({
      data: {
        organizerId: user.id,
        waterBodyId: parsed.data.waterBodyId,
        locationId: location.id,
        postId: post.id,
        title: parsed.data.title,
        description: parsed.data.description,
        scheduledAt: new Date(parsed.data.scheduledAt),
        endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
        maxParticipants: parsed.data.maxParticipants,
        participants: {
          create: {
            userId: user.id,
            status: "GOING",
          },
        },
        statusHistory: {
          create: {
            toStatus: "PLANNED",
            note: "Cleanup event created from the community coordination flow.",
            changedById: user.id,
          },
        },
      },
    });
  });

  revalidateCommunityPaths();
  redirect("/community");
}

export async function createCommentAction(formData: FormData) {
  const user = await requireUser();
  const db = dbOrThrow();
  const parsed = commentSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid comment.");
  }

  await db.comment.create({
    data: {
      postId: parsed.data.postId,
      authorId: user.id,
      body: parsed.data.body,
    },
  });

  revalidateCommunityPaths();
}

export async function joinCleanupEventAction(cleanupEventId: string) {
  const user = await requireUser();
  const db = dbOrThrow();

  await db.participant.upsert({
    where: {
      cleanupEventId_userId: {
        cleanupEventId,
        userId: user.id,
      },
    },
    update: {
      status: "GOING",
    },
    create: {
      cleanupEventId,
      userId: user.id,
      status: "GOING",
    },
  });

  revalidateCommunityPaths();
}
