import { REAL_DIRECTORY_ORGANIZATIONS } from "@/lib/data/real-organizations";
import { dbOrThrow } from "@/lib/prisma";

async function main() {
  const db = dbOrThrow();

  for (const organization of REAL_DIRECTORY_ORGANIZATIONS) {
    await db.organization.upsert({
      where: { slug: organization.slug },
      update: {
        name: organization.name,
        type: organization.type,
        verification: organization.verification,
        description: organization.description,
        areaServed: organization.areaServed,
        contactName: organization.contactName ?? null,
        email: organization.email ?? null,
        phone: organization.phone ?? null,
        website: organization.website,
        tags: organization.metadata,
        isDevelopmentSeed: false,
      },
      create: {
        name: organization.name,
        slug: organization.slug,
        type: organization.type,
        verification: organization.verification,
        description: organization.description,
        areaServed: organization.areaServed,
        contactName: organization.contactName ?? null,
        email: organization.email ?? null,
        phone: organization.phone ?? null,
        website: organization.website,
        tags: organization.metadata,
        isDevelopmentSeed: false,
      },
    });
  }

  const count = await db.organization.count({
    where: {
      isDevelopmentSeed: false,
    },
  });

  console.log(`REAL_DIRECTORY_COUNT=${count}`);
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
