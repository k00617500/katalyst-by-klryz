"use client";

import { useActionState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { updatePassword, type ResetPasswordState } from "@/app/admin/(auth)/reset-password/actions";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<ResetPasswordState, FormData>(updatePassword, {});

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <PasswordInput id="password" name="password" minLength={8} required autoFocus />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <PasswordInput id="confirmPassword" name="confirmPassword" minLength={8} required />
      </div>
      {state.error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" /> {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Update password
      </Button>
    </form>
  );
}
