import { syncIntelligenceSources } from "@/lib/intelligence/sync";
import { dbOrThrow } from "@/lib/prisma";

async function main() {
  const result = await syncIntelligenceSources();
  const db = dbOrThrow();
  const signalCount = await db.intelligenceSignal.count({
    where: {
      status: "ACTIVE",
    },
  });

  console.log(`INTELLIGENCE_SOURCE_COUNT=${result.sourceCount}`);
  console.log(`INTELLIGENCE_SYNCED_THIS_RUN=${result.signalCount}`);
  console.log(`INTELLIGENCE_ACTIVE_SIGNAL_COUNT=${signalCount}`);
  console.log(`INTELLIGENCE_CREDITS_USED=${result.creditsUsed}`);

  if (result.failures.length > 0) {
    for (const failure of result.failures) {
      console.error(`INTELLIGENCE_FAILURE ${failure.slug}: ${failure.error}`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    const db = dbOrThrow();
    await db.$disconnect();
  });
