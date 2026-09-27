import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password | CHILLER",
  description: "Reset your CHILLER account password.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
