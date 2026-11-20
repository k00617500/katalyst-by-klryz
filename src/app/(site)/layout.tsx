import { TooltipProvider } from "@/components/ui/tooltip";
import { MusicProvider } from "@/components/providers/music-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ScrollProgress } from "@/components/animations/scroll-progress";
import { Preloader } from "@/components/animations/preloader";
import { BackToTop } from "@/components/layout/back-to-top";
import { CursorStamps } from "@/components/animations/cursor-stamps";
import { SiteParallax } from "@/components/animations/site-parallax";
import { Snowfall } from "@/components/animations/snowfall";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={150}>
      <MusicProvider>
      <PageViewTracker />
      <Preloader />
      <ScrollProgress />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <BackToTop />
      <CursorStamps />
      <SiteParallax />
      <Snowfall />
      </MusicProvider>
    </TooltipProvider>
  );
}
