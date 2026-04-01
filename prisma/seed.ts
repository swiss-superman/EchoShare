import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const demoUser = await prisma.user.upsert({
    where: { email: "seed-admin@waterline.local" },
    update: {},
    create: {
      email: "seed-admin@waterline.local",
      name: "Waterline Development Seed",
      profile: {
        create: {
          handle: "waterline-seed",
          displayName: "Waterline Development Seed",
          bio: "Development seed account used to populate the local demo experience.",
          city: "Demo City",
          state: "Demo State",
          country: "India",
        },
      },
    },
  });

  const eastLakeLocation = await prisma.location.create({
    data: {
      label: "Demo East Lake Edge",
      locality: "Ward 3",
      district: "Demo District",
      state: "Karnataka",
      country: "India",
      latitude: 12.9822,
      longitude: 77.6197,
    },
  });

  const canalLocation = await prisma.location.create({
    data: {
      label: "Demo Canal Bend",
      locality: "Ward 5",
      district: "Demo District",
      state: "Karnataka",
      country: "India",
      latitude: 12.9766,
      longitude: 77.6401,
    },
  });

  const eastLake = await prisma.waterBody.upsert({
    where: { slug: "demo-east-lake" },
    update: {},
    create: {
      name: "Demo East Lake",
      slug: "demo-east-lake",
      type: "LAKE",
      description: "Development seed water body for local demo flows.",
      city: "Demo City",
      state: "Karnataka",
      country: "India",
      locationId: eastLakeLocation.id,
      isDevelopmentSeed: true,
    },
  });

  const southCanal = await prisma.waterBody.upsert({
    where: { slug: "demo-south-canal" },
    update: {},
    create: {
      name: "Demo South Canal",
      slug: "demo-south-canal",
      type: "CANAL",
      description: "Development seed canal used for reporting and event demos.",
      city: "Demo City",
      state: "Karnataka",
      country: "India",
      locationId: canalLocation.id,
      isDevelopmentSeed: true,
    },
  });

  const reportOne = await prisma.report.create({
    data: {
      userId: demoUser.id,
      waterBodyId: eastLake.id,
      locationId: eastLakeLocation.id,
      title: "Overflowing plastic waste near the east steps",
      description:
        "Development seed report showing plastic wrappers, bottles, and food packaging collected along the retaining wall.",
      waterBodyName: eastLake.name,
      category: "PLASTIC",
      userSeverity: "HIGH",
      status: "UNDER_REVIEW",
      observedAt: new Date(),
      isDevelopmentSeed: true,
      statusHistory: {
        create: [
          {
            toStatus: "NEW",
            note: "Seed report created.",
            changedById: demoUser.id,
          },
          {
            fromStatus: "NEW",
            toStatus: "UNDER_REVIEW",
            note: "Marked for volunteer validation.",
            changedById: demoUser.id,
          },
        ],
      },
      aiAnalyses: {
        create: {
          status: "COMPLETED",
          modelName: "gemini-2.5-flash",
          summary:
            "AI-assisted summary: mixed plastic litter concentrated near access steps and likely to spread during rainfall.",
          classification: "PLASTIC",
          severityEstimate: "HIGH",
          wasteTypes: ["plastic bottles", "food wrappers", "single-use cups"],
          actionRecommendation:
            "Prioritize a volunteer cleanup within 72 hours and notify the local ward sanitation contact.",
          explanation: {
            evidenceSignals: ["Visible plastics", "Near public access edge", "Likely rain runoff path"],
            source: "development-seed",
          },
          rawResponse: {
            note: "Development seed AI analysis.",
          },
        },
      },
    },
  });

  const reportTwo = await prisma.report.create({
    data: {
      userId: demoUser.id,
      waterBodyId: southCanal.id,
      locationId: canalLocation.id,
      title: "Foamy discharge and mixed debris at canal bend",
      description:
        "Development seed report with floating foam, stagnant trash pockets, and a strong odor near the culvert.",
      waterBodyName: southCanal.name,
      category: "FOAM",
      userSeverity: "CRITICAL",
      status: "VERIFIED",
      observedAt: new Date(),
      isDevelopmentSeed: true,
    },
  });

  const cleanupPost = await prisma.post.create({
    data: {
      authorId: demoUser.id,
      waterBodyId: eastLake.id,
      locationId: eastLakeLocation.id,
      title: "Saturday morning cleanup call for Demo East Lake",
      body: "Development seed post inviting volunteers to focus on the eastern edge and access steps.",
      type: "CLEANUP_CALL",
      isDevelopmentSeed: true,
    },
  });

  await prisma.cleanupEvent.create({
    data: {
      organizerId: demoUser.id,
      waterBodyId: eastLake.id,
      locationId: eastLakeLocation.id,
      postId: cleanupPost.id,
      title: "Demo East Lake cleanup drive",
      description: "Development seed event for volunteer coordination.",
      scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3 + 1000 * 60 * 90),
      maxParticipants: 35,
      isDevelopmentSeed: true,
      participants: {
        create: {
          userId: demoUser.id,
          status: "GOING",
        },
      },
      statusHistory: {
        create: {
          toStatus: "PLANNED",
          note: "Development seed event created.",
          changedById: demoUser.id,
        },
      },
    },
  });

  await prisma.comment.create({
    data: {
      postId: cleanupPost.id,
      authorId: demoUser.id,
      body: "Development seed note: gloves and collection sacks will be arranged at the meeting point.",
    },
  });

  await prisma.organization.createMany({
    data: [
      {
        name: "Development Seed Lake Response Collective",
        slug: "development-seed-lake-response-collective",
        type: "NGO",
        description: "Development seed NGO entry for civic demo scenarios.",
        areaServed: "Demo East Lake precinct",
        verification: "UNVERIFIED",
        email: "demo-ngo@waterline.local",
        website: "https://example.org/demo-ngo",
        locationId: eastLakeLocation.id,
        waterBodyId: eastLake.id,
        tags: ["development-seed", "cleanup", "lake"],
        isDevelopmentSeed: true,
      },
      {
        name: "Development Seed Ward Sanitation Cell",
        slug: "development-seed-ward-sanitation-cell",
        type: "GOVERNMENT",
        description: "Development seed government contact for escalation flows.",
        areaServed: "Ward 5 canal belt",
        verification: "UNVERIFIED",
        email: "demo-ward@waterline.local",
        phone: "+91-9000000000",
        locationId: canalLocation.id,
        waterBodyId: southCanal.id,
        tags: ["development-seed", "ward", "sanitation"],
        isDevelopmentSeed: true,
      },
    ],
  });

  await prisma.notification.create({
    data: {
      userId: demoUser.id,
      type: "DIGEST",
      title: "Development seed digest available",
      body: "Seed digest summarizing report activity and cleanup interest.",
      linkUrl: "/dashboard",
    },
  });

  await prisma.moderationRecord.create({
    data: {
      targetType: "REPORT",
      status: "REVIEWED",
      reason: "Seed moderation trail for product demo.",
      detail: "No action needed; used to demonstrate moderation record storage.",
      reportId: reportOne.id,
      createdById: demoUser.id,
    },
  });

  await prisma.reportImage.create({
    data: {
      reportId: reportTwo.id,
      storageKey: "development-seed/canal-foam.jpg",
      publicUrl: "https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=1200&q=80",
      mimeType: "image/jpeg",
      sizeBytes: 120000,
      isPrimary: true,
    },
  });

  console.log("Seeded EchoShare development data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
