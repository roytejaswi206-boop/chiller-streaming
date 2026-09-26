import { redirect } from "next/navigation";

export default function AdminTelemetryRedirect() {
  redirect("/admin/analytics");
}
