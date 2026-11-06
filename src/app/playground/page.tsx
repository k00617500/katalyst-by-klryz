import type { Metadata } from "next";
import { connection } from "next/server";
import { PlaygroundStack } from "@/components/playground/playground-stack";
import { getPlaygroundItems } from "@/lib/playground";
import { TextReveal } from "@/components/animations/text-reveal";

export const metadata: Metadata = {
  title: "Playground",
  description: "Creative experiments — photography, graphic design, and interactive prototypes.",
};

export default async function PlaygroundPage() {
  await connection();
  const playgroundItems = await getPlaygroundItems();
  return (
    <>
      <section className="container-page section-y">
        <span className="font-mono text-xs tracking-[0.2em] text-brand-ink uppercase">Playground</span>
        <TextReveal text="A space for things I make for fun." as="h1"
          className="mt-4 max-w-3xl text-balance text-4xl font-medium tracking-tight md:text-6xl" />
        <p className="mt-6 max-w-xl font-space text-balance text-base leading-relaxed text-muted-foreground md:text-lg">
          Photography, graphic design, technical experiments, and UI/UX explorations that don&apos;t fit neatly into a case study.
        </p>
      </section>
      <PlaygroundStack items={playgroundItems} />
    </>
  );
}
