export interface TourVisit {
  company: string;
  place: string;
  /** Brief, casual takeaway shown in the dropdown. */
  insight: string;
}

export const tourDates = "November 9–14, 2026";

// Source: Educational Tour Learning Journal (BSIS 4B), accomplished November 15, 2026.
export const tourVisits: TourVisit[] = [
  {
    company: "Ng Khai Development Corporation",
    place: "Mandaue City, Cebu",
    insight:
      "Showed me how wide IT services can reach, from server racks to EV charging stations. Infrastructure choices are a balance of scale, cost, security, and what people need. It's a great company, though hardware leans a bit away from the software side I'm aiming for.",
  },
  {
    company: "Rivan IT / RivanCyber Training Institute",
    place: "Cebu",
    insight:
      "The hands-on culture felt like the kind of place I'd love to learn in. Getting a clean 0.00dB fiber splice on my first try was a good moment. It also nudged me to take industry certifications more seriously on my own.",
  },
  {
    company: "Mandaue City Command Center",
    place: "Mandaue City, Cebu",
    insight:
      "The least “IT company” stop, and that's why it stuck. CCTV, flood sensors, and traffic data on one screen made it clear that public infrastructure is an information system too. With their solid base, adding AI and smart analytics could take it even further.",
  },
  {
    company: "MarioSoft Solutions",
    place: "Cebu",
    insight:
      "Made me rethink what software development means: it's making sure a system still works for the client months later. QA and customer support matter as much as the code. I'd gently hope they grow into UI/UX, security, and web development.",
  },
  {
    company: "Sansan Global Development Center",
    place: "Cebu (HQ: Tokyo, Japan)",
    insight:
      "A modern workplace I could picture myself in. Their roughly 70% AI-assisted coding stood out: the skill to build is reviewing, judging, and refining what AI produces, not just writing from scratch. I'd love to work there someday.",
  },
  {
    company: "Dynata",
    place: "Cebu and Davao (HQ: United States)",
    insight:
      "Good data quality depends on every stage before the report. It tied nicely into my database coursework and reminded me that analytics is a team effort between technical and non-technical roles.",
  },
  {
    company: "Cebu Business Incubator for IT (CeBu InIT), UP Cebu",
    place: "Cebu City",
    insight:
      "Seeing how a startup's survival depends on customer feedback made entrepreneurship feel much less abstract. It's a path I hadn't seriously considered, and it's the process I'd follow if my team and I build something of our own.",
  },
];
