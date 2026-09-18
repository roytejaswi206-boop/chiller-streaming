import { Sidebar } from "@/components/layout/Sidebar";
import { CategoryCard } from "@/components/video/CategoryCard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { order: "asc" },
  });

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090c]">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Browse Categories
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Explore {categories.length} curated categories tailored to your desires
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              id={cat.id}
              name={cat.name}
              slug={cat.slug}
              thumbnail={cat.thumbnail}
              icon={cat.icon}
              videoCount={cat.videoCount}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
