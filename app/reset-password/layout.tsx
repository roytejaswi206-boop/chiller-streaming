import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password | CHILLER",
  description: "Set a new password for your CHILLER account.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
