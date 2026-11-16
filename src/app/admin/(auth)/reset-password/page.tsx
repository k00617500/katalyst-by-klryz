import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/admin/reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password — The Katalyst Admin",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            The Katalyst
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">Set a new password</h1>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
