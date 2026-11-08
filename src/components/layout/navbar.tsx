"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ArrowUpRight } from "lucide-react";
import { navigation } from "@/data/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SoundToggle } from "@/components/providers/sound-provider";
import { Logo } from "@/components/layout/logo";
import { FollowersWidget } from "@/components/layout/followers-widget";
import { LiveViewers } from "@/components/layout/live-viewers";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-[1fr_auto] items-center justify-between px-3 min-[360px]:px-4 min-[500px]:flex min-[500px]:h-16 sm:px-6 md:h-20 md:px-10 lg:px-16">
        <Logo className="justify-self-start whitespace-nowrap max-[360px]:[&>span:first-child]:text-base min-[500px]:shrink-0" />

        <nav className="hidden items-center gap-4 text-sm xl:flex 2xl:gap-7">
          {navigation.slice(1, -1).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm text-muted-foreground transition-colors hover:text-foreground",
                pathname === item.href && "text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="contents shrink-0 items-center gap-1 min-[500px]:flex sm:gap-2">
          <div className="flex h-12 items-center justify-end min-[500px]:contents">
            <LiveViewers />
          </div>
          <div className="flex items-center pb-2 min-[500px]:contents">
            <FollowersWidget />
          </div>
          <div className="flex items-center justify-end gap-1 pb-2 min-[500px]:contents">
            <SoundToggle />
            <ThemeToggle />
            <Button asChild size="sm" variant="outline" className="hidden rounded-full xl:inline-flex">
              <Link href="/resume/PolaronMKA_Resume.pdf" target="_blank">
                Resume
              </Link>
            </Button>
            <Button asChild size="sm" className="hidden rounded-full xl:inline-flex">
              <Link href="/contact">
                Let&apos;s Connect
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="xl:hidden" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-sm">
                <SheetHeader>
                  <SheetTitle asChild>
                    <Logo />
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4">
                  {navigation.map((item) => (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "border-b border-border/60 py-4 text-lg",
                          pathname === item.href
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
                <div className="mt-6 px-4">
                  <Button asChild className="w-full rounded-full">
                    <Link href="/resume/PolaronMKA_Resume.pdf" target="_blank">
                      Download Resume
                    </Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
