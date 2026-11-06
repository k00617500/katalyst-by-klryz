import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "max-w-2xl space-y-4",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow && (
        <span className="font-mono text-xs tracking-[0.2em] text-brand uppercase">
          {eyebrow}
        </span>
      )}
      <h2 className="text-balance text-3xl font-medium tracking-tight md:text-4xl lg:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="text-balance text-base text-muted-foreground md:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}
