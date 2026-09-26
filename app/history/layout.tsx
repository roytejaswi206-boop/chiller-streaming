import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Watch History • CHILLER",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
