import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account • CHILLER",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
