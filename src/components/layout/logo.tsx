import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      aria-label="The Katalyst by Klaryze — home"
      className={cn("inline-flex flex-col leading-none", className)}
    >
      <span className="font-heading text-lg font-semibold tracking-tight lowercase">
        the katalyst.
      </span>
      <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
        by klaryze
      </span>
    </Link>
  );
}
