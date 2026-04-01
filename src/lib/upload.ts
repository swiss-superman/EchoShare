import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { getSupabaseStorageConfig, isSupabaseStorageConfigured } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

export type SavedUpload = {
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
  isPrimary: boolean;
};

function extensionForMimeType(mimeType: string) {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
      return "heic";
    default:
      return "jpg";
  }
}

async function saveImagesToLocalDisk(files: File[]) {
  const validFiles = files.filter((file) => file.size > 0);

  if (validFiles.length === 0) {
    return [];
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "reports");
  await mkdir(uploadsDir, { recursive: true });

  const saved = await Promise.all(
    validFiles.map(async (file, index) => {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        throw new Error(`Unsupported image type: ${file.type}`);
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error(`Image ${file.name} exceeds the 6MB upload limit.`);
      }

      const extension = extensionForMimeType(file.type);
      const fileName = `${Date.now()}-${nanoid(10)}.${extension}`;
      const storageKey = path.join("reports", fileName).replace(/\\/g, "/");
      const targetPath = path.join(uploadsDir, fileName);
      const buffer = Buffer.from(await file.arrayBuffer());

      await writeFile(targetPath, buffer);

      return {
        storageKey,
        publicUrl: `/uploads/reports/${fileName}`,
        mimeType: file.type,
        sizeBytes: file.size,
        isPrimary: index === 0,
      } satisfies SavedUpload;
    }),
  );

  return saved;
}

async function saveImagesToSupabase(files: File[]) {
  const validFiles = files.filter((file) => file.size > 0);

  if (validFiles.length === 0) {
    return [];
  }

  const storage = getSupabaseAdminClient();
  const { bucket } = getSupabaseStorageConfig();

  return Promise.all(
    validFiles.map(async (file, index) => {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        throw new Error(`Unsupported image type: ${file.type}`);
      }

      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error(`Image ${file.name} exceeds the 6MB upload limit.`);
      }

      const extension = extensionForMimeType(file.type);
      const fileName = `${Date.now()}-${nanoid(10)}.${extension}`;
      const storageKey = `reports/${new Date().toISOString().slice(0, 10)}/${fileName}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error } = await storage.storage.from(bucket).upload(storageKey, buffer, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

      if (error) {
        throw new Error(`Failed to upload ${file.name}: ${error.message}`);
      }

      const { data } = storage.storage.from(bucket).getPublicUrl(storageKey);

      return {
        storageKey,
        publicUrl: data.publicUrl,
        mimeType: file.type,
        sizeBytes: file.size,
        isPrimary: index === 0,
      } satisfies SavedUpload;
    }),
  );
}

export async function saveReportImages(files: File[]) {
  if (isSupabaseStorageConfigured()) {
    return saveImagesToSupabase(files);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Supabase storage is not configured for this deployment.");
  }

  return saveImagesToLocalDisk(files);
}
