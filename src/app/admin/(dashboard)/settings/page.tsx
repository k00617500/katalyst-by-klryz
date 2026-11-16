import type { Metadata } from "next";
import { verifyAdminSession } from "@/lib/auth/dal";
import { SettingsForm } from "@/components/admin/settings-form";
import { CheckCircle2, XCircle } from "lucide-react";

export const metadata: Metadata = { title: "Settings — Admin", robots: { index: false } };

const INTEGRATIONS = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", label: "Supabase project" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase service role (scheduled publishing)" },
  { key: "RESEND_API_KEY", label: "Resend (contact form email)" },
];

export default async function SettingsPage() {
  const { user, profile } = await verifyAdminSession();

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6 lg:p-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Account and integration status.</p>
      </div>

      <section className="space-y-4 rounded-lg border border-border p-5">
        <h2 className="text-sm font-medium text-foreground">Profile</h2>
        <p className="text-sm text-muted-foreground">Signed in as {user.email}</p>
        <SettingsForm displayName={profile.display_name} />
      </section>

      <section className="space-y-3 rounded-lg border border-border p-5">
        <h2 className="text-sm font-medium text-foreground">Integration status</h2>
        <ul className="space-y-2">
          {INTEGRATIONS.map((integration) => {
            const configured = Boolean(process.env[integration.key]);
            return (
              <li key={integration.key} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{integration.label}</span>
                {configured ? (
                  <span className="flex items-center gap-1.5 text-brand-ink">
                    <CheckCircle2 className="size-4" /> Configured
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <XCircle className="size-4" /> Not configured
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
