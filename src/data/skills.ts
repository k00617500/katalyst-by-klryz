export interface SkillGroup {
  category: string;
  skills: string[];
}

export const skillGroups: SkillGroup[] = [
  {
    category: "Technical",
    skills: [
      "HTML",
      "Tailwind CSS",
      "JavaScript",
      "PHP",
      "TypeScript",
      "Next.js",
      "React",
      "Vite",
      "GSAP",
      "PostgreSQL",
      "Leaflet",
      "Figma",
      "Adobe Photoshop",
      "Canva",
    ],
  },
  {
    category: "Design",
    skills: ["UI/UX Design", "Prototyping", "Graphic Design", "Visual Communication"],
  },
  {
    category: "Systems & Technology",
    skills: [
      "Database Management",
      "Business Application Development",
      "Systems Analysis",
      "Software Documentation",
      "Project Management",
    ],
  },
];

export const languages: string[] = ["English", "Filipino", "Hiligaynon"];

export const interests: string[] = [
  "Web Development",
  "Tech-for-Good Solutions",
  "UI/UX Design",
  "Product Design",
  "Graphic Design",
  "Social Media Management",
];

export const expertiseAreas: string[] = [
  "Software Development",
  "UI/UX Design",
  "Product Development",
  "Business Systems Analysis",
  "Project Management",
  "Digital Innovation",
  "Creative Design",
  "Digital Marketing",
];

export const currentlyLearning: string[] = [
  "React",
  "Dart",
  "Flutter",
  "Modern frontend development",
  "AI-powered applications",
  "Emerging technologies",
  "Interactive web experiences",
];
