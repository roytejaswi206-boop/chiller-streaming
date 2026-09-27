import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Join CHILLER to save titles to your watchlist, track your viewing history, and stream across devices.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
