import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

// Reliable multi-bitrate HLS streams for player validation
const DEMO_HLS_STREAMS = [
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
];

async function main() {
  console.log("🌱 Starting Velora Database Seeding...");

  // 1. Clean existing data
  await prisma.viewEvent.deleteMany();
  await prisma.watchHistory.deleteMany();
  await prisma.watchlist.deleteMany();
  await prisma.videoOrigin.deleteMany();
  await prisma.videoVariant.deleteMany();
  await prisma.videoTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.processingJob.deleteMany();
  await prisma.video.deleteMany();
  await prisma.category.deleteMany();
  await prisma.streamingServer.deleteMany();
  await prisma.systemLog.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.user.deleteMany();

  // 2. Seed Users
  const adminPassword = await hash("Admin@123456", 10);
  const userPassword = await hash("User@123456", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Velora Admin",
      email: "admin@velora.com",
      passwordHash: adminPassword,
      role: "ADMIN",
      tier: "PREMIUM",
    },
  });

  const member = await prisma.user.create({
    data: {
      name: "Sarah Jenkins",
      email: "user@velora.com",
      passwordHash: userPassword,
      role: "USER",
      tier: "FREE",
    },
  });

  console.log("✓ Created Admin & Member Users");

  // 3. Seed Origin Servers
  const serverIndia = await prisma.streamingServer.create({
    data: {
      name: "INDIA-01",
      region: "ap-south",
      endpoint: "https://origin-in.velora-cdn.net",
      currentLoad: 18.5,
      activeStreams: 342,
      bandwidthMbps: 1250,
      priority: 1,
      isHealthy: true,
      isEnabled: true,
    },
  });

  const serverSingapore = await prisma.streamingServer.create({
    data: {
      name: "SINGAPORE-01",
      region: "ap-southeast",
      endpoint: "https://origin-sg.velora-cdn.net",
      currentLoad: 24.0,
      activeStreams: 512,
      bandwidthMbps: 2100,
      priority: 2,
      isHealthy: true,
      isEnabled: true,
    },
  });

  const serverEurope = await prisma.streamingServer.create({
    data: {
      name: "EUROPE-01",
      region: "eu-central",
      endpoint: "https://origin-eu.velora-cdn.net",
      currentLoad: 35.2,
      activeStreams: 820,
      bandwidthMbps: 3400,
      priority: 3,
      isHealthy: true,
      isEnabled: true,
    },
  });

  const serverUS = await prisma.streamingServer.create({
    data: {
      name: "US-01",
      region: "us-east",
      endpoint: "https://origin-us.velora-cdn.net",
      currentLoad: 41.8,
      activeStreams: 1140,
      bandwidthMbps: 4800,
      priority: 4,
      isHealthy: true,
      isEnabled: true,
    },
  });

  const allServers = [serverIndia, serverSingapore, serverEurope, serverUS];
  console.log("✓ Created 4 Global Streaming Origin Servers");

  // 4. Seed Categories Matching Visual Reference
  const categoriesData = [
    {
      name: "Romance",
      slug: "romance",
      icon: "heart",
      description: "Tender, passionate, and deeply romantic connections.",
      videoCount: 12400,
      order: 1,
      thumbnail: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=600&auto=format&fit=crop",
    },
    {
      name: "Couples",
      slug: "couples",
      icon: "fire",
      description: "Authentic real-life couples sharing intense chemistry.",
      videoCount: 18700,
      order: 2,
      thumbnail: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=600&auto=format&fit=crop",
    },
    {
      name: "Solo",
      slug: "solo",
      icon: "person",
      description: "Intimate solo self-love and sensual exploration.",
      videoCount: 9300,
      order: 3,
      thumbnail: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop",
    },
    {
      name: "Indian",
      slug: "indian",
      icon: "star",
      description: "Exquisite South Asian stories and passionate regional cinema.",
      videoCount: 14100,
      order: 4,
      thumbnail: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600&auto=format&fit=crop",
    },
    {
      name: "Lesbian",
      slug: "lesbian",
      icon: "cocktail",
      description: "Pure female desire, sensual romance, and gentle touch.",
      videoCount: 8600,
      order: 5,
      thumbnail: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=600&auto=format&fit=crop",
    },
    {
      name: "Fitness",
      slug: "fitness",
      icon: "dumbbell",
      description: "Athletic bodies, high stamina, and sculpted physiques.",
      videoCount: 4200,
      order: 6,
      thumbnail: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600&auto=format&fit=crop",
    },
    {
      name: "Amateur",
      slug: "amateur",
      icon: "mask",
      description: "Unscripted, genuine bedroom videos and real encounters.",
      videoCount: 11900,
      order: 7,
      thumbnail: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop",
    },
    {
      name: "Fantasy",
      slug: "fantasy",
      icon: "diamond",
      description: "Cinematic roleplay, taboo dreams, and lavish fantasies.",
      videoCount: 7400,
      order: 8,
      thumbnail: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=600&auto=format&fit=crop",
    },
  ];

  const categories = [];
  for (const cat of categoriesData) {
    const created = await prisma.category.create({ data: cat });
    categories.push(created);
  }
  console.log(`✓ Created ${categories.length} Design Categories`);

  // 5. Seed Videos Matching Design References
  const videosData = [
    {
      title: "Closer Than Ever",
      slug: "closer-than-ever",
      description: "Desire. Emotions. Real Connections. An award-winning exploration of modern romance and deep emotional intimacy.",
      duration: 5520, // 1h 32m
      views: 4200000,
      likes: 42300,
      resolution: "4K",
      isFeatured: true,
      isTrending: true,
      isPremium: true,
      categorySlug: "romance",
      thumbnailUrl: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=1200&auto=format&fit=crop",
      backdropUrl: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=1920&auto=format&fit=crop",
      hlsUrl: DEMO_HLS_STREAMS[0],
    },
    {
      title: "Late Night Feelings",
      slug: "late-night-feelings",
      description: "When the city sleeps, raw desires take over. Gentle touches ignite an unforgettable night.",
      duration: 754, // 12:34
      views: 2100000,
      likes: 18900,
      resolution: "1080p",
      isFeatured: false,
      isTrending: true,
      categorySlug: "romance",
      thumbnailUrl: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=1200&auto=format&fit=crop",
      hlsUrl: DEMO_HLS_STREAMS[1],
    },
    {
      title: "Unspoken Desires",
      slug: "unspoken-desires",
      description: "Eyes locked across the candlelight. Words become unnecessary in this passionate bedroom encounter.",
      duration: 501, // 08:21
      views: 1400000,
      likes: 14200,
      resolution: "1080p",
      isFeatured: false,
      isTrending: true,
      categorySlug: "couples",
      thumbnailUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1200&auto=format&fit=crop",
      hlsUrl: DEMO_HLS_STREAMS[0],
    },
    {
      title: "Just You & Me",
      slug: "just-you-and-me",
      description: "An intimate weekend getaway with zero distractions. Exploring every inch of each other.",
      duration: 909, // 15:09
      views: 3700000,
      likes: 31000,
      resolution: "4K",
      isFeatured: false,
      isTrending: true,
      categorySlug: "couples",
      thumbnailUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1200&auto=format&fit=crop",
      hlsUrl: DEMO_HLS_STREAMS[2],
    },
    {
      title: "In Your Arms",
      slug: "in-your-arms",
      description: "Finding warmth, shelter, and intense passion inside the arms of the one you adore.",
      duration: 705, // 11:45
      views: 2900000,
      likes: 24500,
      resolution: "1080p",
      isFeatured: false,
      isTrending: true,
      categorySlug: "romance",
      thumbnailUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1200&auto=format&fit=crop",
      hlsUrl: DEMO_HLS_STREAMS[0],
    },
    {
      title: "Forbidden Moments",
      slug: "forbidden-moments",
      description: "Stealing moments when nobody is watching. The rush of danger makes the ecstasy sweeter.",
      duration: 618, // 10:18
      views: 1800000,
      likes: 19800,
      resolution: "1080p",
      isFeatured: false,
      isTrending: true,
      categorySlug: "fantasy",
      thumbnailUrl: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=1200&auto=format&fit=crop",
      hlsUrl: DEMO_HLS_STREAMS[1],
    },
    {
      title: "Morning Kisses",
      slug: "morning-kisses",
      description: "Sunlight filtering through sheer curtains. Starting the day with slow, tender caresses.",
      duration: 552, // 09:12
      views: 850000,
      likes: 9200,
      resolution: "1080p",
      isFeatured: false,
      categorySlug: "romance",
      thumbnailUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200&auto=format&fit=crop",
      hlsUrl: DEMO_HLS_STREAMS[0],
    },
    {
      title: "Rainy Nights",
      slug: "rainy-nights",
      description: "Thunder rumbles outside as body temperatures rise inside. A cozy, steamy rainy evening.",
      duration: 876, // 14:36
      views: 1100000,
      likes: 12500,
      resolution: "1080p",
      isFeatured: false,
      categorySlug: "couples",
      thumbnailUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1200&auto=format&fit=crop",
      hlsUrl: DEMO_HLS_STREAMS[3],
    },
    {
      title: "Private Moments",
      slug: "private-moments",
      description: "An uninhibited private evening capturing unfiltered intimacy without compromise.",
      duration: 668, // 11:08
      views: 920000,
      likes: 10400,
      resolution: "1080p",
      isFeatured: false,
      categorySlug: "amateur",
      thumbnailUrl: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=1200&auto=format&fit=crop",
      hlsUrl: DEMO_HLS_STREAMS[0],
    },
    {
      title: "Body Language",
      slug: "body-language",
      description: "Every curve speaks volumes. Athletic stamina meets sensual elegance in high definition.",
      duration: 801, // 13:21
      views: 1600000,
      likes: 16700,
      resolution: "4K",
      isFeatured: false,
      categorySlug: "fitness",
      thumbnailUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200&auto=format&fit=crop",
      hlsUrl: DEMO_HLS_STREAMS[1],
    },
    {
      title: "Midnight Stories",
      slug: "midnight-stories",
      description: "Confessions after midnight lead to irresistible pleasure under the silk sheets.",
      duration: 645, // 10:45
      views: 2400000,
      likes: 22100,
      resolution: "1080p",
      isFeatured: false,
      categorySlug: "romance",
      thumbnailUrl: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=1200&auto=format&fit=crop",
      hlsUrl: DEMO_HLS_STREAMS[2],
    },
    {
      title: "Midnight Mumbai",
      slug: "midnight-mumbai",
      description: "A passionate encounter set against the vibrant skyline of nocturnal Mumbai.",
      duration: 1570, // 26:10
      views: 4200000,
      likes: 38900,
      resolution: "4K",
      isFeatured: true,
      categorySlug: "indian",
      thumbnailUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1200&auto=format&fit=crop",
      hlsUrl: DEMO_HLS_STREAMS[0],
    },
  ];

  for (const v of videosData) {
    const category = categories.find((c) => c.slug === v.categorySlug);

    const video = await prisma.video.create({
      data: {
        title: v.title,
        slug: v.slug,
        description: v.description,
        duration: v.duration,
        views: v.views,
        uniqueViews: Math.round(v.views * 0.75),
        likes: v.likes,
        resolution: v.resolution,
        isFeatured: v.isFeatured || false,
        isTrending: v.isTrending || false,
        isPremium: v.isPremium || false,
        thumbnailUrl: v.thumbnailUrl,
        backdropUrl: v.backdropUrl || v.thumbnailUrl,
        hlsMasterUrl: v.hlsUrl,
        fallbackMp4Url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        status: "READY",
        categoryId: category?.id,
        fileSize: BigInt(v.duration * 450000), // ~450KB per second
        totalWatchTime: BigInt(v.views * Math.round(v.duration * 0.6)),
      },
    });

    // Create multi-quality variants (1080p, 720p, 480p, 360p)
    await prisma.videoVariant.createMany({
      data: [
        {
          videoId: video.id,
          quality: "1080p",
          width: 1920,
          height: 1080,
          bitrate: 4500,
          playlistUrl: v.hlsUrl,
        },
        {
          videoId: video.id,
          quality: "720p",
          width: 1280,
          height: 720,
          bitrate: 2500,
          playlistUrl: v.hlsUrl,
        },
        {
          videoId: video.id,
          quality: "480p",
          width: 854,
          height: 480,
          bitrate: 1200,
          playlistUrl: v.hlsUrl,
        },
        {
          videoId: video.id,
          quality: "360p",
          width: 640,
          height: 360,
          bitrate: 800,
          playlistUrl: v.hlsUrl,
        },
      ],
    });

    // Link video to 2 origin servers
    await prisma.videoOrigin.createMany({
      data: [
        {
          videoId: video.id,
          serverId: serverIndia.id,
          status: "READY",
          checksum: `sha256_${video.slug}_in`,
          sizeBytes: BigInt(video.duration * 450000),
        },
        {
          videoId: video.id,
          serverId: serverSingapore.id,
          status: "READY",
          checksum: `sha256_${video.slug}_sg`,
          sizeBytes: BigInt(video.duration * 450000),
        },
      ],
    });

    // Add Watch History for demo user with resume timestamp
    if (v.slug === "closer-than-ever" || v.slug === "late-night-feelings") {
      await prisma.watchHistory.create({
        data: {
          userId: member.id,
          videoId: video.id,
          progressSeconds: Math.round(v.duration * 0.45),
          durationSeconds: v.duration,
          lastWatchedAt: new Date(Date.now() - 3600000 * 4),
        },
      });

      await prisma.watchlist.create({
        data: {
          userId: member.id,
          videoId: video.id,
        },
      });
    }

    // Add a completed ProcessingJob record
    await prisma.processingJob.create({
      data: {
        videoId: video.id,
        type: "HLS_TRANSCODE",
        status: "READY",
        progress: 100,
        workerId: "worker-ffmpeg-01",
        startedAt: new Date(Date.now() - 60000 * 15),
        completedAt: new Date(Date.now() - 60000 * 5),
      },
    });
  }

  console.log(`✓ Seeded ${videosData.length} Videos with Adaptive HLS Variants & Origins`);

  // 6. Seed System Logs
  await prisma.systemLog.createMany({
    data: [
      {
        level: "INFO",
        service: "API",
        message: "Platform initialized and database schema verified",
        metadata: JSON.stringify({ version: "1.0.0", environment: "development" }),
      },
      {
        level: "INFO",
        service: "ORIGIN",
        message: "Origin server cluster health check completed: 4/4 nodes active",
        metadata: JSON.stringify({ latencyAvg: "14ms" }),
      },
      {
        level: "INFO",
        service: "QUEUE",
        message: "FFmpeg background queue runner started",
        metadata: JSON.stringify({ concurrency: 4 }),
      },
    ],
  });

  console.log("✓ Seeded System Logs");
  console.log("🚀 Velora Seeding Complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
