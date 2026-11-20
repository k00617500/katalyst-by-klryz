"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-border lg:block">
        <AdminSidebarNav />
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          <AdminSidebarNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
            <p className="text-sm font-medium text-foreground">Admin</p>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
