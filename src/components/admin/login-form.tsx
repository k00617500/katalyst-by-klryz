"use client";

import { useActionState, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { login, requestPasswordReset, type LoginState, type ForgotPasswordState } from "@/app/admin/(auth)/login/actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [forgotState, forgotAction, forgotPending] = useActionState<ForgotPasswordState, FormData>(
    requestPasswordReset,
    {},
  );
  const [mode, setMode] = useState<"login" | "forgot">("login");

  if (mode === "forgot") {
    return (
      <form action={forgotAction} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="reset-email">Email</Label>
          <Input id="reset-email" name="email" type="email" placeholder="you@example.com" required />
        </div>
        {forgotState.error && (
          <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4" /> {forgotState.error}
          </p>
        )}
        {forgotState.message && (
          <p role="status" className="text-sm text-muted-foreground">{forgotState.message}</p>
        )}
        <Button type="submit" className="w-full" disabled={forgotPending}>
          {forgotPending && <Loader2 className="size-4 animate-spin" />}
          Send reset link
        </Button>
        <button
          type="button"
          onClick={() => setMode("login")}
          className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Back to login
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="you@example.com" required autoFocus />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput id="password" name="password" required />
      </div>
      {state.error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" /> {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Log in
      </Button>
      <button
        type="button"
        onClick={() => setMode("forgot")}
        className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Forgot your password?
      </button>
    </form>
  );
}
