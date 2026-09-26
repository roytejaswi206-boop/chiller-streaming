import React from "react";
import { notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { CountryExplorerView } from "@/components/discovery/CountryExplorerView";
import { getCountryBySlug } from "@/lib/content/countries";
import { discoverContent } from "@/lib/content/discovery";

export const dynamic = "force-dynamic";

interface CountryPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CountryPage({ params }: CountryPageProps) {
  const { slug } = await params;
  const country = getCountryBySlug(slug);

  if (!country) {
    notFound();
  }

  const initialRes = await discoverContent({
    country: country.code,
    language: country.primaryLang,
    page: 1,
  });

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090C]">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-[1680px] overflow-hidden">
        <CountryExplorerView
          country={country}
          initialItems={initialRes.items}
          initialHasNextPage={initialRes.hasNextPage}
        />
      </main>
    </div>
  );
}
