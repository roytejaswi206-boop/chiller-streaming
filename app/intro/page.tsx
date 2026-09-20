"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ChillerIntro } from "@/components/intro/ChillerIntro";

export default function IntroPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#09090C] flex flex-col items-center justify-center">
      <ChillerIntro
        forcePlay={true}
        onComplete={() => {
          router.push("/");
        }}
      />
      <noscript>
        <div className="text-white text-center p-8">
          <p>JavaScript is required to view the CHILLER opening experience.</p>
          <a href="/" className="text-[#FF3B6B] underline mt-4 block">
            Enter CHILLER
          </a>
        </div>
      </noscript>
    </div>
  );
}
