export interface SocialLink {
  label: string;
  href: string;
  icon: "github" | "linkedin" | "mail" | "instagram" | "twitter" | "facebook";
}

// TODO: replace placeholder hrefs with your actual profile URLs.
export const socialLinks: SocialLink[] = [
  { label: "Email", href: "mailto:meryll.polaron@gmail.com", icon: "mail" },
  { label: "GitHub", href: "https://github.com/", icon: "github" },
  { label: "LinkedIn", href: "https://www.linkedin.com/", icon: "linkedin" },
  { label: "Instagram", href: "https://instagram.com/", icon: "instagram" },
];
