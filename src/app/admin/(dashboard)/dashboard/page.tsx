import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  Eye,
  FileEdit,
  CalendarClock,
  Plus,
  Upload,
  FolderKanban,
  Tag,
  ExternalLink,
  Users,
  MousePointerClick,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { verifyAdminSession } from "@/lib/auth/dal";
import { getContentStats, getRecentActivity, getScheduledPosts, getTopArticles } from "@/lib/cms/dashboard";
import { getInteractionSummary, getLiveVisitorCount, getTrafficOverview, type DateRangeKey } from "@/lib/cms/analytics";
import { projects } from "@/data/projects";
import { Button } from "@/components/ui/button";
import { DateRangeSelect } from "@/components/admin/date-range-select";
import { TrafficChart } from "@/components/admin/traffic-chart";
import { LiveVisitorsCard } from "@/components/admin/live-visitors-card";
import { AnalyticsChart } from "@/components/admin/analytics-chart";
import { ScheduledPostsList } from "@/components/admin/scheduled-posts-list";

export const metadata: Metadata = { title: "Dashboard — Admin", robots: { index: false } };

const RANGE_LABEL: Record<DateRangeKey, string> = {
  today: "today",
  "7d": "the last 7 days",
  "30d": "the last 30 days",
  "90d": "the last 90 days",
  year: "this year",
  all: "all time",
};

function StatCard({
  label,
  value,
  icon: Icon,
  change,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  change?: number | null;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {typeof change === "number" && (
          <span
            className={`flex items-center text-xs ${change >= 0 ? "text-brand-ink" : "text-destructive"}`}
          >
            {change >= 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { profile } = await verifyAdminSession();
  const { range: rawRange } = await searchParams;
  const range = (["today", "7d", "30d", "90d", "year", "all"].includes(rawRange ?? "")
    ? rawRange
    : "30d") as DateRangeKey;

  const [stats, topArticles, activity, traffic, interactions, liveVisitors, scheduledPosts] = await Promise.all([
    getContentStats(),
    getTopArticles(),
    getRecentActivity(),
    getTrafficOverview(range),
    getInteractionSummary(range),
    getLiveVisitorCount(),
    getScheduledPosts(),
  ]);

  const now = new Date();

  return (
    <div className="mx-auto max-w-6xl space-y-10 p-6 lg:p-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            {" · "}
            {now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">
            Welcome back, {profile.display_name.split(" ")[0]}.
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-48">
            <LiveVisitorsCard initialCount={liveVisitors} />
          </div>
          <DateRangeSelect value={range} />
        </div>
      </header>
      <p className="-mt-6 text-xs text-muted-foreground">
        Every number on this page is queried live from the database on each load — nothing here is cached,
        mocked, or hardcoded.
      </p>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Content</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Articles" value={stats.total} icon={FileText} />
          <StatCard label="Published" value={stats.published} icon={FileText} />
          <StatCard label="Drafts" value={stats.draft} icon={FileEdit} />
          <StatCard label="Scheduled" value={stats.scheduled} icon={CalendarClock} />
          <StatCard label="Article views" value={stats.totalViews} icon={Eye} />
          <StatCard label="Projects (source-controlled)" value={projects.length} icon={FolderKanban} />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Scheduled posts</h2>
          <Link href="/admin/posts?status=scheduled" className="text-xs text-muted-foreground hover:text-foreground">
            View all
          </Link>
        </div>
        <ScheduledPostsList posts={scheduledPosts} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Most viewed articles</h2>
          <div className="divide-y divide-border rounded-lg border border-border">
            {topArticles.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No article views recorded yet.
              </p>
            ) : (
              topArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/admin/posts/${article.id}/edit`}
                  className="flex items-center justify-between p-3 text-sm hover:bg-accent/40"
                >
                  <span className="truncate text-foreground">{article.title}</span>
                  <span className="shrink-0 text-muted-foreground">{article.views} views</span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Recent activity</h2>
          <div className="divide-y divide-border rounded-lg border border-border">
            {activity.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Nothing yet — write your first article.</p>
            ) : (
              activity.map((item, i) => (
                <Link key={i} href={item.href} className="flex items-center justify-between p-3 text-sm hover:bg-accent/40">
                  <span className="text-foreground">
                    <span className="text-muted-foreground">{item.action}</span> {item.title}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Traffic &amp; audience</h2>

        {traffic.pageViews === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No visits recorded yet for {RANGE_LABEL[range]}. Tracking is live site-wide — data will appear here
            as people visit the public pages.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatCard
                label="Visitors"
                value={traffic.visitors}
                icon={Users}
                change={traffic.hasComparison ? traffic.visitorsChangePct : null}
              />
              <StatCard
                label="Page views"
                value={traffic.pageViews}
                icon={Eye}
                change={traffic.hasComparison ? traffic.pageViewsChangePct : null}
              />
              <StatCard label="Sessions" value={traffic.sessions} icon={MousePointerClick} />
            </div>

            <div className="rounded-lg border border-border p-4">
              <TrafficChart daily={traffic.dailySeries} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <AnalyticsChart
                title="Top pages"
                data={traffic.topPages.map((p) => ({ label: p.path, value: p.views }))}
                defaultType="bar"
                valueLabel="views"
              />
              <AnalyticsChart
                title="Traffic sources"
                data={traffic.sources.map((s) => ({ label: s.label, value: s.count }))}
                defaultType="pie"
                valueLabel="visits"
              />
              <AnalyticsChart
                title="Devices"
                data={traffic.devices.map((d) => ({ label: d.label, value: d.count }))}
                defaultType="pie"
                valueLabel="events"
              />
            </div>

            {interactions.length > 0 && (
              <AnalyticsChart
                title="Interactions"
                data={interactions.map((i) => ({ label: i.eventName.replaceAll("_", " "), value: i.total }))}
                defaultType="bar"
                valueLabel="events"
              />
            )}
          </>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/admin/posts/new">
              <Plus className="size-4" /> Write new article
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/media">
              <Upload className="size-4" /> Upload media
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/categories">
              <FolderKanban className="size-4" /> Manage categories
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/tags">
              <Tag className="size-4" /> Manage tags
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/" target="_blank">
              <ExternalLink className="size-4" /> View public site
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
