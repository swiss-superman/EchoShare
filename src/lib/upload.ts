import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";

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

export async function saveReportImages(files: File[]) {
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
