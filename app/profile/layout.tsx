import { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Profile • CHILLER",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
