import React from "react";
import { notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { LanguageExplorerView } from "@/components/discovery/LanguageExplorerView";
import { getLanguageBySlug } from "@/lib/content/languages";
import { discoverContent } from "@/lib/content/discovery";

export const dynamic = "force-dynamic";

interface LanguagePageProps {
  params: Promise<{ slug: string }>;
}

export default async function LanguagePage({ params }: LanguagePageProps) {
  const { slug } = await params;
  const language = getLanguageBySlug(slug);

  if (!language) {
    notFound();
  }

  const initialRes = await discoverContent({
    language: language.code,
    page: 1,
  });

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
        <LanguageExplorerView
          language={language}
          initialItems={initialRes.items}
          initialHasNextPage={initialRes.hasNextPage}
        />
      </main>
    </div>
  );
}
