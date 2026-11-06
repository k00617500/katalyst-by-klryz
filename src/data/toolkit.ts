import type { IconType } from "react-icons";
import { VscVscode } from "react-icons/vsc";
import { RiOpenaiFill } from "react-icons/ri";
import { TbBrandAdobePhotoshop } from "react-icons/tb";
import {
  SiHtml5,
  SiCss,
  SiJavascript,
  SiNextdotjs,
  SiReact,
  SiTypescript,
  SiTailwindcss,
  SiGreensock,
  SiFigma,
  SiPhp,
  SiMysql,
  SiSupabase,
  SiVercel,
  SiDart,
  SiFlutter,
  SiFramer,
  SiLucide,
  SiShadcnui,
  SiPostgresql, SiGithub, SiClaude, SiGithubcopilot, SiOllama, SiHuggingface, SiGit, SiClickup,
} from "react-icons/si";

export interface ToolkitItem {
  name: string;
  icon: IconType;
  color: string;
}

export const toolkitItems: ToolkitItem[] = [
  { name: "HTML", icon: SiHtml5, color: "#E34F26" },
  { name: "CSS", icon: SiCss, color: "#663399" },
  { name: "JavaScript", icon: SiJavascript, color: "#F7DF1E" },
  { name: "Next.js", icon: SiNextdotjs, color: "adaptive" },
  { name: "React", icon: SiReact, color: "#61DAFB" },
  { name: "TypeScript", icon: SiTypescript, color: "#3178C6" },
  { name: "Tailwind CSS", icon: SiTailwindcss, color: "#38BDF8" },
  { name: "GSAP", icon: SiGreensock, color: "#88CE02" },
  { name: "Motion", icon: SiFramer, color: "#0055FF" },
  { name: "Figma", icon: SiFigma, color: "#F24E1E" },
  { name: "shadcn/ui", icon: SiShadcnui, color: "adaptive" },
  { name: "Lucide", icon: SiLucide, color: "adaptive" },
  { name: "Supabase", icon: SiSupabase, color: "#3ECF8E" },
  { name: "Vercel", icon: SiVercel, color: "adaptive" },
  { name: "PHP", icon: SiPhp, color: "#777BB4" },
  { name: "MySQL", icon: SiMysql, color: "#4479A1" },
  { name: "Dart", icon: SiDart, color: "#0175C2" },
  { name: "Flutter", icon: SiFlutter, color: "#02569B" },
  { name: "PostgreSQL", icon: SiPostgresql, color: "#4169E1" },
  { name: "PostGIS", icon: SiPostgresql, color: "#4E9A36" },
  { name: "GitHub", icon: SiGithub, color: "adaptive" },
  { name: "Claude", icon: SiClaude, color: "#D97757" },
  { name: "Codex", icon: RiOpenaiFill, color: "#10A37F" },
  { name: "GitHub Copilot", icon: SiGithubcopilot, color: "#6E8FFB" },
  { name: "Ollama", icon: SiOllama, color: "adaptive" },
  { name: "Hugging Face", icon: SiHuggingface, color: "#FFB800" },
  { name: "Git", icon: SiGit, color: "#F05032" },
  { name: "VS Code", icon: VscVscode, color: "#007ACC" },
  { name: "ClickUp", icon: SiClickup, color: "#FF4785" },
  { name: "Adobe Photoshop", icon: TbBrandAdobePhotoshop, color: "#31A8FF" },
];
