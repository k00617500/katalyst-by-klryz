"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe mount flag
    setMounted(true);
  }, []);

  const isLight = mounted && theme === "light";
  const label = isLight ? "Switch to dark mode" : "Switch to light mode";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
      className="rounded-full"
    >
      <Sun aria-hidden="true" className="hidden size-4 dark:block" />
      <Moon aria-hidden="true" className="size-4 dark:hidden" />
    </Button>
  );
}
