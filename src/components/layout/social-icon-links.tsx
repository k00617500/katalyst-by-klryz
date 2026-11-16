"use client";

import { Mail } from "lucide-react";
import {
  FaGithub,
  FaLinkedin,
  FaInstagram,
  FaXTwitter,
  FaFacebook,
} from "react-icons/fa6";
import { socialLinks } from "@/data/social-links";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics/track";

const iconMap = {
  github: FaGithub,
  linkedin: FaLinkedin,
  mail: Mail,
  instagram: FaInstagram,
  twitter: FaXTwitter,
  facebook: FaFacebook,
};

export function SocialIconLinks({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {socialLinks.map((link) => {
        const Icon = iconMap[link.icon];
        return (
          <a
            key={link.label}
            href={link.href}
            target={link.href.startsWith("mailto:") ? undefined : "_blank"}
            rel="noreferrer"
            aria-label={link.label}
            onClick={() =>
              track(link.href.startsWith("mailto:") ? "email_click" : "social_link_click", {
                platform: link.icon,
              })
            }
            className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-brand hover:text-foreground"
          >
            <Icon className="size-4" />
          </a>
        );
      })}
    </div>
  );
}
