import type { Project } from "@/types/project";

export const projects: Project[] = [
  {
    slug: "asenxo",
    title: "ASENXO",
    shortDescription:
      "A project management system for the DOST SETUP 4.0 iFund Program, combining GIS spatial analysis with MSME financial projection.",
    categories: ["web-development", "research-innovation"],
    year: 2025,
    featured: true,
    technologies: ["PHP", "JavaScript", "MySQL", "GIS"],
    thumbnail: "/images/projects/asenxo/thumbnail.jpg",
    overview:
      "ASENXO is a project management system built for the DOST SETUP 4.0 iFund Program, designed to support project management, GIS spatial analysis, MSME financial projection, project completion prediction, administrative workflows, and business process digitization.",
    caseStudy: {
      background:
        "Built to support the administration of the DOST SETUP 4.0 iFund Program, which involves tracking and managing MSME project funding and completion.",
      objectives: [
        "Digitize project management and administrative workflows",
        "Incorporate GIS spatial analysis into project tracking",
        "Support MSME financial projection",
        "Support project completion prediction",
      ],
    },
  },
  {
    slug: "foreal-agrichain",
    title: "Foreal AgriChain",
    shortDescription:
      "An agricultural distribution and market connection platform built to strengthen agricultural supply chains through digital connectivity.",
    categories: ["web-development", "startup-entrepreneurship"],
    year: 2025,
    featured: true,
    technologies: ["Web", "AgriTech"],
    thumbnail: "/images/projects/agri-chain/thumbnail.jpg",
    overview:
      "Foreal AgriChain connects agricultural producers to markets, focused on AgriTech, agricultural supply chains, market connectivity, digital innovation, and startup development.",
    caseStudy: {
      background:
        "Developed under Foreal Solutions to address gaps in agricultural distribution and market connectivity for local producers.",
      objectives: [
        "Improve market connectivity for agricultural producers",
        "Digitize agricultural supply chain coordination",
        "Support startup development within the AgriTech space",
      ],
    },
  },
];

export function getFeaturedProjects(): Project[] {
  return projects.filter((project) => project.featured);
}

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
