import { Database, Code2, Network, Rocket, Server, Siren, Sparkles, type LucideIcon } from "lucide-react";

export interface TourVisit {
  icon: LucideIcon;
  company: string;
  place: string;
  /** Brief, casual takeaway shown in the dropdown. */
  insight: string;
}

export const tourDates = "November 9–14, 2026";

// Source: Educational Tour Learning Journal (BSIS 4B), accomplished November 15, 2026.
export const tourVisits: TourVisit[] = [
  {
    icon: Server,
    company: "Ng Khai Development Corporation",
    place: "Hernan Cortes St, Brgy. Banilad, Mandaue City, Cebu, PH",
    insight:
      "Showed me how wide IT services can reach, from server racks to EV charging stations. Infrastructure choices are a balance of scale, cost, security, and what people need. It's a great company, though hardware leans a bit away from the software side I'm aiming for.",
  },
  {
    icon: Network,
    company: "Rivan IT / RivanCyber Training Institute",
    place: "V. Rama Ave, Brgy. Guadalupe, Cebu City, Cebu, PH",
    insight:
      "The hands-on culture felt like the kind of place I'd love to learn in. Getting a clean 0.00dB fiber splice on my first try was a good moment. It also nudged me to take industry certifications more seriously on my own.",
  },
  {
    icon: Siren,
    company: "Mandaue City Command Center",
    place: "Brgy. Centro (Poblacion), Mandaue City, Cebu, PH",
    insight:
      "The least “IT company” stop, and that's why it stuck. CCTV, flood sensors, and traffic data on one screen made it clear that public infrastructure is an information system too. With their solid base, adding AI and smart analytics could take it even further.",
  },
  {
    icon: Code2,
    company: "MarioSoft Solutions",
    place: "S. Osmeña St, Brgy. Gun-ob, Lapu-Lapu City, Cebu, PH",
    insight:
      "Made me rethink what software development means: it's making sure a system still works for the client months later. QA and customer support matter as much as the code. I'd gently hope they grow into UI/UX, security, and web development.",
  },
  {
    icon: Sparkles,
    company: "Sansan Global Development Center",
    place: "Cebu, PH",
    insight:
      "A modern workplace I could picture myself in. Their roughly 70% AI-assisted coding stood out: the skill to build is reviewing, judging, and refining what AI produces, not just writing from scratch. I'd love to work there someday.",
  },
  {
    icon: Database,
    company: "Dynata",
    place: "PIPC Bldg, 7 MEPZ 2 Rd, Brgy. Basak, Lapu-Lapu City, Cebu, PH",
    insight:
      "Good data quality depends on every stage before the report. It tied nicely into my database coursework and reminded me that analytics is a team effort between technical and non-technical roles.",
  },
  {
    icon: Rocket,
    company: "Cebu Business Incubator for IT (CeBu InIT), UP Cebu",
    place: "UP Arts & Sciences Bldg, Gorordo Ave, Brgy. Lahug, Cebu City, Cebu, PH",
    insight:
      "Seeing how a startup's survival depends on customer feedback made entrepreneurship feel much less abstract. It's a path I hadn't seriously considered, and it's the process I'd follow if my team and I build something of our own.",
  },
];
