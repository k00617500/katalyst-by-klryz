"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe mount flag
    setMounted(true);
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={(event) => {
        const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setTheme(nextTheme);
          return;
        }
        if (!document.startViewTransition) {
          flushSync(() => setTheme(nextTheme));
          document.documentElement.animate([{ opacity: 0.55 }, { opacity: 1 }], { duration: 650, easing: "ease-out" });
          return;
        }
        const rect = event.currentTarget.getBoundingClientRect();
        document.documentElement.style.setProperty("--theme-x", `${rect.left + rect.width / 2}px`);
        document.documentElement.style.setProperty("--theme-y", `${rect.top + rect.height / 2}px`);
        document.startViewTransition(() => flushSync(() => setTheme(nextTheme)));
      }}
      className="rounded-full"
    >
      {mounted && resolvedTheme === "dark" ? (
        <Sun key="sun" className="theme-icon size-4" />
      ) : (
        <Moon key="moon" className="theme-icon size-4" />
      )}
    </Button>
  );
}
