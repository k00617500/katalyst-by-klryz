"use client";

import dynamic from "next/dynamic";

export const PinballExperience = dynamic(
  () => import("./pinball-experience").then((mod) => mod.PinballExperience),
  { ssr: false },
);
