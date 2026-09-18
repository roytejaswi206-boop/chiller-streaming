import { Sidebar } from "@/components/layout/Sidebar";

export default function TermsPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-3xl overflow-hidden text-zinc-300">
        <h1 className="text-2xl font-bold text-white tracking-tight mb-4">
          Terms of Service
        </h1>

        <div className="space-y-4 text-xs sm:text-sm leading-relaxed">
          <p>
            Welcome to CHILLER. By accessing or using this website, you agree to be bound by these Terms of Service.
          </p>

          <h2 className="text-base font-bold text-white mt-6 mb-2">
            1. Platform Services
          </h2>
          <p>
            Chiller is an entertainment discovery and streaming platform connecting users with cinematic stories across movies, anime, TV series, and documentaries.
          </p>

          <h2 className="text-base font-bold text-white mt-6 mb-2">
            2. Third-Party Metadata and Playback
          </h2>
          <p>
            Chiller uses the TMDB API for catalog metadata, information, and imagery, but is not endorsed or certified by TMDB. Stream playback is provided via integrated playback providers.
          </p>

          <h2 className="text-base font-bold text-white mt-6 mb-2">
            3. Acceptable Use
          </h2>
          <p>
            Users agree to use Chiller solely for personal, non-commercial entertainment. Any automated scraping, unauthorized indexing, or disruption of platform availability is prohibited.
          </p>
        </div>
      </main>
    </div>
  );
}
