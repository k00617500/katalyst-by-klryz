import type { Metadata } from "next";
import { TextReveal } from "@/components/animations/text-reveal";
import { PlaygroundGallery } from "@/components/playground/playground-gallery";
import { playgroundItems } from "@/data/playground";

export const metadata: Metadata = {
  title: "Playground",
  description:
    "Creative experiments — photography, graphic design, and interactive prototypes.",
};

export default function PlaygroundPage() {
  return (
    <>
      <section className="container-page section-y">
        <span className="font-mono text-xs tracking-[0.2em] text-brand-ink uppercase">
          Playground
        </span>
        <TextReveal
          text="A space for things I make for fun."
          as="h1"
          className="mt-4 max-w-3xl text-balance text-4xl font-medium tracking-tight md:text-6xl"
        />
        <p className="mt-6 max-w-xl font-space text-balance text-base leading-relaxed text-muted-foreground md:text-lg">
          Photography, graphic design, technical experiments, and UI/UX
          explorations that don&apos;t fit neatly into a case study.
        </p>
      </section>

      <section className="container-page section-y border-t border-border/60">
        <PlaygroundGallery items={playgroundItems} />
      </section>
    </>
  );
}
