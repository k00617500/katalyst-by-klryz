"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction, type SettingsFormState } from "@/app/admin/(dashboard)/settings/actions";

export function SettingsForm({ displayName }: { displayName: string }) {
  const [state, action, pending] = useActionState<SettingsFormState, FormData>(updateProfileAction, {});

  return (
    <form action={action} className="flex items-end gap-3">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="displayName">Display name</Label>
        <Input id="displayName" name="displayName" defaultValue={displayName} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Save
      </Button>
      {state.success && <span className="text-sm text-brand-ink">Saved</span>}
      {state.error && <span className="text-sm text-destructive">{state.error}</span>}
    </form>
  );
}
