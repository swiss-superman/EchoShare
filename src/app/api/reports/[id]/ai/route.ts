import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { enqueueReportEnrichment, enrichReportById } from "@/lib/ai/gemini";
import { dbOrThrow } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isPrivilegedRole(role: string | null | undefined) {
  return role === "ADMIN" || role === "MODERATOR";
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = dbOrThrow();
  const report = await db.report.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      aiAnalyses: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!report) {
    return NextResponse.json({ ok: false, error: "Report not found" }, { status: 404 });
  }

  if (report.userId !== session.user.id && !isPrivilegedRole(session.user.role)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  if (report.aiAnalyses[0]?.status === "COMPLETED") {
    return NextResponse.json({
      ok: true,
      analysisId: report.aiAnalyses[0].id,
      status: "COMPLETED",
      skipped: true,
    });
  }

  try {
    const analysisId = await enqueueReportEnrichment(id);
    const analysis = await enrichReportById(id, analysisId);

    revalidatePath("/");
    revalidatePath("/reports");
    revalidatePath("/map");
    revalidatePath("/dashboard");
    revalidatePath("/community");
    revalidatePath(`/reports/${id}`);

    return NextResponse.json({
      ok: true,
      analysisId: analysis.id,
      status: analysis.status,
    });
  } catch (error) {
    revalidatePath(`/reports/${id}`);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown enrichment error",
      },
      { status: 500 },
    );
  }
}
