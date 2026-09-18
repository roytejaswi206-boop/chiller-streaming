import { prisma } from "../lib/prisma";

async function main() {
  console.log("=================================================");
  console.log("⚡ VELORA DATABASE SCALE & INDEX BENCHMARK");
  console.log("=================================================");

  const BATCH_SIZE = 1000;
  console.log(`1. Seeding ${BATCH_SIZE} benchmark catalog records...`);
  const seedStart = Date.now();

  const category = await prisma.category.findFirst();
  const records = [];

  for (let i = 1; i <= BATCH_SIZE; i++) {
    records.push({
      publicId: `bench_${Date.now()}_${i}`,
      slug: `benchmark-test-video-${Date.now()}-${i}`,
      title: `Benchmark Scale Video #${i}`,
      description: `Synthesized performance test video asset #${i}`,
      thumbnailUrl: "/images/placeholder.jpg",
      duration: 120 + (i % 600),
      resolution: i % 2 === 0 ? "1080p" : "720p",
      status: "READY",
      isPublished: true,
      views: Math.floor(Math.random() * 50000),
      categoryId: category?.id,
      contentHash: `hash_bench_${i}`,
    });
  }

  // Insert in chunks of 200
  for (let c = 0; c < records.length; c += 200) {
    const chunk = records.slice(c, c + 200);
    for (const item of chunk) {
      await prisma.video.create({ data: item });
    }
  }

  const seedTime = Date.now() - seedStart;
  console.log(`✔ Seeded ${BATCH_SIZE} records in ${seedTime}ms (${(BATCH_SIZE / (seedTime / 1000)).toFixed(0)} records/sec)\n`);

  // Benchmark 1: Indexed Slug Lookup
  console.log("2. Benchmarking indexed slug lookups (100 random lookups)...");
  const lookupStart = Date.now();
  for (let i = 0; i < 100; i++) {
    const randIdx = Math.floor(Math.random() * BATCH_SIZE);
    const targetSlug = records[randIdx].slug;
    await prisma.video.findUnique({ where: { slug: targetSlug } });
  }
  const lookupTime = Date.now() - lookupStart;
  console.log(`✔ 100 Indexed Lookups: ${lookupTime}ms (Average: ${(lookupTime / 100).toFixed(2)}ms per lookup)\n`);

  // Benchmark 2: Deep Pagination (Page 20, 24 items per page)
  console.log("3. Benchmarking deep pagination (LIMIT 24 OFFSET 480 ORDER BY views DESC)...");
  const pageStart = Date.now();
  const pageResult = await prisma.video.findMany({
    where: { isPublished: true, status: "READY" },
    orderBy: { views: "desc" },
    skip: 480,
    take: 24,
  });
  const pageTime = Date.now() - pageStart;
  console.log(`✔ Deep Pagination: ${pageTime}ms (Fetched ${pageResult.length} items)\n`);

  // Cleanup benchmark records
  console.log("4. Cleaning up benchmark records...");
  const cleanupStart = Date.now();
  const deleted = await prisma.video.deleteMany({
    where: { slug: { startsWith: "benchmark-test-video-" } },
  });
  console.log(`✔ Cleaned up ${deleted.count} benchmark records in ${Date.now() - cleanupStart}ms\n`);

  console.log("=================================================");
  console.log("✔ SCALE & INDEX BENCHMARK COMPLETED SUCCESSFULLY");
  console.log("=================================================");

  await prisma.$disconnect();
}

main();
