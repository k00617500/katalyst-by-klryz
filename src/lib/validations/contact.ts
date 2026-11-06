import { z } from "zod";

export const contactFormSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  email: z.email("Please enter a valid email address."),
  company: z.string().trim().optional().or(z.literal("")),
  subject: z.string().trim().min(3, "Let me know what you're building."),
  timeline: z.string().trim().max(200, "Please keep the timeline under 200 characters.").optional().or(z.literal("")),
  message: z.string().trim().min(10, "Project details should be at least 10 characters."),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
