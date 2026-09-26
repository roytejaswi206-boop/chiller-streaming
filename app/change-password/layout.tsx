import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Change Password • CHILLER",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ChangePasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
