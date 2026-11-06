export interface SkillGroup {
  category: string;
  skills: string[];
}

export const skillGroups: SkillGroup[] = [
  {
    category: "Development",
    skills: ["HTML", "CSS", "JavaScript", "PHP", "React", "Dart", "Tailwind CSS"],
  },
  {
    category: "Design",
    skills: ["UI/UX Design", "Figma", "Prototyping", "Graphic Design", "Visual Communication"],
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
