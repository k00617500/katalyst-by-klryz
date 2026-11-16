import { redirect } from "next/navigation";

export default function AdminIndexPage() {
  // The proxy has already redirected unauthenticated visitors to /admin/login,
  // so reaching this point means there's a session.
  redirect("/admin/dashboard");
}
