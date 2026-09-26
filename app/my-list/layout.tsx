import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My List • CHILLER",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function MyListLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
