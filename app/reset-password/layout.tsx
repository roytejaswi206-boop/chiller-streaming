import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set New Password",
  description: "Set a new secure password for your CHILLER account.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
