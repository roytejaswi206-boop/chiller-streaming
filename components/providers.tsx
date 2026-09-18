"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { SessionProvider } from "next-auth/react";

interface AgeGateContextType {
  isAgeVerified: boolean;
  verifyAge: () => void;
  openAgeGate: () => void;
}

const AgeGateContext = createContext<AgeGateContextType>({
  isAgeVerified: true,
  verifyAge: () => {},
  openAgeGate: () => {},
});

export const useAgeGate = () => useContext(AgeGateContext);

export function Providers({ children }: { children: React.ReactNode }) {
  const [isAgeVerified, setIsAgeVerified] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    const verified = localStorage.getItem("velora_18_verified");
    if (verified === "true") {
      setIsAgeVerified(true);
    } else {
      setIsAgeVerified(false);
    }
  }, []);

  const verifyAge = () => {
    localStorage.setItem("velora_18_verified", "true");
    setIsAgeVerified(true);
  };

  const openAgeGate = () => {
    setIsAgeVerified(false);
  };

  return (
    <SessionProvider>
      <AgeGateContext.Provider value={{ isAgeVerified, verifyAge, openAgeGate }}>
        {children}
      </AgeGateContext.Provider>
    </SessionProvider>
  );
}
