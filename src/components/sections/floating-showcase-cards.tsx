"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { projects } from "@/data/projects";

interface CardSpec {
  slug: string;
  top: string;
  left?: string;
  right?: string;
  rotate: number;
  width: number;
  depth: number;
  delay: number;
}

const cards: CardSpec[] = [
  { slug: "asenxo", top: "4%", right: "6%", rotate: -6, width: 190, depth: 24, delay: 0 },
  { slug: "agrichain", top: "30%", right: "22%", rotate: 4, width: 150, depth: 40, delay: 0.4 },
  { slug: "bantai-bahay", top: "54%", right: "2%", rotate: 8, width: 170, depth: 18, delay: 0.8 },
  { slug: "litlatte-pos", top: "70%", right: "28%", rotate: -5, width: 140, depth: 34, delay: 1.2 },
];

export function FloatingShowcaseCards() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="pointer-events-none absolute inset-0 z-[1] hidden lg:block"
    >
      {cards.map((card) => {
        const project = projects.find((p) => p.slug === card.slug);
        if (!project) return null;

        return (
          <FloatingCard key={card.slug} card={card} springX={springX} springY={springY}>
            <Image
              src={project.thumbnail}
              alt={project.title}
              width={card.width}
              height={Math.round((card.width * 9) / 16)}
              className="h-full w-full object-contain"
            />
          </FloatingCard>
        );
      })}
    </div>
  );
}

function FloatingCard({
  card,
  springX,
  springY,
  children,
}: {
  card: CardSpec;
  springX: ReturnType<typeof useSpring>;
  springY: ReturnType<typeof useSpring>;
  children: React.ReactNode;
}) {
  const parallaxX = useTransform(springX, (v) => v * card.depth);
  const parallaxY = useTransform(springY, (v) => v * card.depth);

  return (
    <motion.div
      className="pointer-events-auto absolute"
      style={{
        top: card.top,
        left: card.left,
        right: card.right,
        width: card.width,
        x: parallaxX,
        y: parallaxY,
      }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: card.delay }}
    >
      <motion.div
        className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl"
        style={{ rotate: card.rotate }}
        animate={{ y: [0, -10, 0] }}
        transition={{
          duration: 4 + card.delay,
          repeat: Infinity,
          ease: "easeInOut",
          delay: card.delay,
        }}
        whileHover={{ scale: 1.08, rotate: 0 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
