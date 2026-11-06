export interface SocialLink {
  label: string;
  href: string;
  icon: "github" | "linkedin" | "mail" | "instagram" | "twitter" | "facebook";
}

export const socialLinks: SocialLink[] = [
  { label: "Email", href: "mailto:meryll.polaron@gmail.com", icon: "mail" },
  {
    label: "GitHub",
    href: "https://github.com/k00617500",
    icon: "github",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/meryll-klaryze-polaron-556947312/",
    icon: "linkedin",
  },
];
