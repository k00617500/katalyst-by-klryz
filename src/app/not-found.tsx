import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[70vh] flex-col items-center justify-center text-center">
      <span className="font-mono text-xs tracking-[0.2em] text-brand-ink uppercase">
        404
      </span>
      <h1 className="mt-4 text-balance text-4xl font-medium tracking-tight md:text-6xl">
        This page doesn&apos;t exist.
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        The page you&apos;re looking for may have been moved or never existed.
      </p>
      <Button asChild size="lg" className="mt-8 rounded-full px-8">
        <Link href="/">
          <ArrowLeft className="size-4" />
          Back to Home
        </Link>
      </Button>
    </div>
  );
}
