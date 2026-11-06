"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { contactFormSchema, type ContactFormValues } from "@/lib/validations/contact";

type Status = "idle" | "success" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
  });

  const onSubmit = async (values: ContactFormValues) => {
    setStatus("idle");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success !== true || !data?.messageId) {
        throw new Error(data?.error ?? "Something went wrong. Please try again.");
      }

      setStatus("success");
      reset();
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="Your name" {...register("name")} />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="company">
          Company / organization{" "}
          <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input id="company" placeholder="Where you work" {...register("company")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Project or campaign</Label>
        <Input id="subject" placeholder="What are you building?" {...register("subject")} />
        {errors.subject && (
          <p className="text-xs text-destructive">{errors.subject.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="timeline">Ideal Timeline <span className="text-muted-foreground">(optional)</span></Label>
        <Input id="timeline" placeholder="e.g. Within 4–6 weeks, or a target launch date" {...register("timeline")} />
        {errors.timeline && <p className="text-xs text-destructive">{errors.timeline.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Project details</Label>
        <Textarea
          id="message"
          rows={6}
          placeholder="What are you working on, who is it for, and what would success look like?"
          {...register("message")}
        />
        {errors.message && (
          <p className="text-xs text-destructive">{errors.message.message}</p>
        )}
      </div>

      <p className="text-sm text-muted-foreground">I&apos;ll reply with next steps.</p>

      <div className="flex items-center gap-4">
        <Button type="submit" size="lg" className="rounded-full px-8" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Send inquiry
        </Button>

        {status === "success" && (
          <span role="status" className="flex items-center gap-2 text-sm text-foreground">
            <CheckCircle2 className="size-4 text-brand-ink" />
            Sent — I&apos;ll get back to you soon.
          </span>
        )}
        {status === "error" && (
          <span role="alert" className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4" />
            {errorMessage}
          </span>
        )}
      </div>
    </form>
  );
}
