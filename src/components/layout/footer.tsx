import Link from "next/link";
import { navigation } from "@/data/navigation";
import { profile } from "@/data/profile";
import { SocialIconLinks } from "@/components/layout/social-icon-links";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.5fr_1fr_1fr] md:py-20">
        <div className="space-y-4">
          <span className="font-mono text-sm font-medium tracking-tight uppercase">
            {profile.siteName}
          </span>
          <p className="max-w-sm text-sm text-muted-foreground">
            {profile.shortBio}
          </p>
          <SocialIconLinks />
        </div>

        <div className="space-y-3">
          <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
            Navigate
          </span>
          <ul className="space-y-2">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
            Contact
          </span>
          <p className="text-sm text-muted-foreground">
            <a href={`mailto:${profile.email}`} className="hover:text-foreground">
              {profile.email}
            </a>
          </p>
          <p className="text-sm text-muted-foreground">{profile.location}</p>
        </div>
      </div>

      <div className="container-page flex flex-col items-center justify-between gap-2 border-t border-border/60 py-6 text-xs text-muted-foreground md:flex-row">
        <span>
          © {year} {profile.name}. All rights reserved.
        </span>
        <span className="font-mono">Designed &amp; built by {profile.shortName}</span>
      </div>
    </footer>
  );
}
