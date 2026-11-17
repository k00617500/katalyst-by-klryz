import type { Project } from "@/types/project";

const projectEntries: Project[] = [
  {
    slug: "verde",
    title: "Verde",
    shortDescription: "An AI-powered plant identification and mapping app using YOLO image recognition, focused on Philippine native and endemic species.",
    categories: ["mobile-applications", "ui-ux-design", "creative-design"],
    year: 2026,
    featured: true,
    technologies: ["YOLO", "Image Recognition", "Geotagging", "Mobile UI"],
    thumbnail: "/images/project (8).png",
    overview: "Verde is an AI-powered plant identification and mapping app that uses YOLO image recognition to scan and identify plants, with a focus on Philippine native and endemic species. It combines geotagged discoveries, a plant encyclopedia, a research and article hub, offline functionality, and community participation to support biodiversity education and conservation. Its rewards system lets users earn points intended to be redeemable through options such as GCash.",
  },
  ...[
    {
      slug: "respolink", title: "RespoLink", thumbnail: "/images/project (9).png",
      short: "A disaster response and resource management system connecting communities, responders, and relief organizations in real time.",
      description: "RespoLink is a disaster response and resource management system that connects communities, responders, and relief organizations through timely alerts, critical updates, and accurate evacuation information. It supports resource tracking, relief inventory, volunteer coordination, and recovery efforts to help teams respond more efficiently during emergencies. Its development framework and database have not yet been confirmed.",
    },
    {
      slug: "agrichain-mobile", title: "AgriChain Mobile", thumbnail: "/images/project (10).png",
      short: "A mobile app connecting farmers with agricultural authorities to coordinate logistics, supply chains, and disaster response.",
      description: "AgriChain Mobile connects farmers with agricultural authorities to coordinate logistics, manage the farm-to-market supply chain, and monitor crop prices, production, and demand. It also brings disaster-related information into agricultural coordination, helping farmers report conditions and authorities identify needs, organize deliveries, and respond to disruptions. Its mobile development framework and backend stack have not yet been confirmed.",
    },
  ].map(({ slug, title, thumbnail, short, description }): Project => ({
    slug, title,
    shortDescription: short,
    categories: ["mobile-applications", "ui-ux-design", "creative-design"],
    year: 2026, featured: true,
    technologies: ["Mobile UI", "Interface Design", "Visual Design"],
    thumbnail,
    overview: description,
  })),
  {
    slug: "merkaventures",
    title: "MerkaVentures",
    shortDescription:
      "A student marketplace for the WVSU-HCC Campus Student Council — student entrepreneurs showcase products and services and reach more customers on campus.",
    categories: ["web-development", "startup-entrepreneurship", "ui-ux-design"],
    year: 2026,
    featured: true,
    technologies: ["React", "TypeScript", "Vite", "Tailwind CSS", "shadcn/ui", "Supabase", "Capacitor"],
    thumbnail: "/images/project (11).png",
    overview:
      "MerkaVentures is an initiative by the Councilors of the WVSU-HCC Campus Student Council that gives student entrepreneurs a space to showcase their products and services and reach more customers within campus. Buyers browse by category, store, and community posts; sellers manage listings and orders; and administrators review seller applications and moderate the marketplace — all from one shared codebase. The platform is currently in beta testing.",
    caseStudy: {
      background:
        "Built for the WVSU-HCC Campus Student Council to connect student sellers and buyers in one place, promoting creativity, financial independence, and practical business skills so students can turn their ideas into real ventures.",
      objectives: [
        "Give student sellers a storefront for food, clothing, crafts, beauty, school supplies, services, and more",
        "Let buyers discover products by category and store, save favorites, place orders, and message sellers",
        "Provide an admin portal for seller application review, moderation, categories, announcements, and analytics with CSV/PDF reports",
        "Ship web plus Android and iOS shells (Capacitor) with realtime notifications from a single Supabase backend",
      ],
      developmentProcess:
        "Buyer, seller, and administrator interfaces share one React + TypeScript codebase backed by Supabase (Postgres with row-level security, Auth, Storage, Realtime). Database workflows are covered by automated tests, and the app is in beta testing ahead of a verified production release.",
    },
  },
  {
    slug: "dwellr",
    title: "dwellr",
    shortDescription:
      "A boarding house marketplace and management platform — renters find a room on a map and pay bills, while owners run properties, tenants, and billing in one app.",
    categories: ["web-development", "startup-entrepreneurship", "ui-ux-design"],
    year: 2026,
    featured: true,
    technologies: ["React", "TypeScript", "Supabase", "MapLibre GL", "Tailwind CSS", "i18next", "Capacitor"],
    thumbnail: "/images/project (12).png",
    overview:
      "dwellr is a multi-tenant boarding house marketplace and property-management platform — “Find your space. Manage your place.” Renters browse listings on a map, apply for a room or bedspace, pay bills, message the landlady, and request repairs. Owners manage properties, rooms, tenants, billing, and payments from a dashboard with collections and occupancy analytics, while a platform admin verifies every business before it goes public. The platform is currently in beta testing.",
    caseStudy: {
      background:
        "Boarding house renting is often handled through scattered messages, paper agreements, and manual payment tracking. dwellr brings discovery, applications, billing, and communication into one multi-tenant platform.",
      objectives: [
        "Let renters search a map of listings, apply for a room or bedspace, and track their bills and repairs",
        "Give owners an ERP for properties, floors, rooms, bedspaces, boarders, agreements, billing, and payment verification",
        "Surface collections, net operating performance, payment methods, and occupancy per property in a live dashboard",
        "Verify every business through an admin workflow before listings go public",
      ],
      developmentProcess:
        "Built with React, TypeScript, Tailwind, and shadcn/ui on a Supabase backend (Postgres RLS, Auth, Storage, Realtime, Edge Functions), with MapLibre GL maps and i18n support for eight languages. Workflows such as double-booking prevention, utility billing, proration, and tenant isolation are verified by automated tests, and a Capacitor shell covers Android and iOS.",
    },
  },
  {
    slug: "agrichain",
    title: "AgriChain",
    shortDescription:
      "An agricultural distribution dashboard that tracks production, demand, and dispatch across Iloilo's farm-to-market supply chain in real time.",
    categories: ["web-development", "startup-entrepreneurship"],
    year: 2025,
    featured: true,
    technologies: ["Web App", "Maps", "Analytics Dashboard"],
    thumbnail: "/images/project (2).png",
    gallery: [
      "/images/project (2).png",
      "/images/projects/agrichain/panel-1.jpg",
      "/images/projects/agrichain/panel-2.jpg",
    ],
    overview:
      "AgriChain gives municipal agriculture offices and distributors a single dashboard for production volume, demand volume, and estimated production loss, with a live dispatch-tracking map and per-municipality pricing for top lowland high-value crops (HVCs) such as tomato, eggplant, and banana.",
    caseStudy: {
      background:
        "Developed under Foreal Solutions to close the information gap between agricultural producers and buyers across Iloilo's municipalities.",
      objectives: [
        "Centralize production, distribution, and demand data by municipality",
        "Visualize dispatch routes and delivery status on an interactive map",
        "Track pricing and volume for key lowland crops",
        "Support account verification for new producers joining the network",
      ],
    },
  },
  {
    slug: "bantai-bahay",
    title: "Bantay-BahAI",
    shortDescription:
      "Spatial analysis and forecasting of informal housing patterns in Iloilo City — AI and GIS-driven urban planning for safer, more resilient communities.",
    categories: ["web-development", "research-innovation", "ui-ux-design"],
    year: 2025,
    featured: true,
    technologies: ["GIS", "Spatial Analysis", "AI Forecasting"],
    thumbnail: "/images/project (3).png",
    gallery: [
      "/images/project (3).png",
      "/images/projects/bantai-bahay/panel-1.jpg",
      "/images/projects/bantai-bahay/panel-2.jpg",
    ],
    overview:
      "Bantay-BahAI helps Ilonggos explore Iloilo City's districts with insights on urban planning. Using AI and spatial intelligence, it helps communities prepare and check whether their area is included in redevelopment or demolition plans — giving residents the chance to anticipate change and build resilience.",
    caseStudy: {
      background:
        "A data-driven framework addressing the challenges of informal housing and displacement in Iloilo City, integrating spatial forecasting, AI-driven decision support, and participatory planning.",
      objectives: [
        "Forecast informal housing patterns across Iloilo City's districts",
        "Let residents check whether their area is flagged for redevelopment or demolition",
        "Profile each district (coastal hub, commercial center, heritage zone, industrial growth, mobility hub)",
        "Support participatory planning between residents and local government",
      ],
    },
  },
  {
    slug: "asenxo",
    title: "ASENXO",
    liveUrl: "http://asenxo-main.vercel.app/",
    shortDescription:
      "Empowering smarter enterprises — a project management system for the DOST SETUP 4.0 iFund Program, combining GIS spatial analysis with MSME financial projection.",
    categories: ["web-development", "research-innovation"],
    year: 2025,
    featured: true,
    technologies: ["Leaflet", "OpenStreetMap", "CARTO", "GIS"],
    thumbnail: "/images/project (4).png",
    gallery: [
      "/images/project (4).png",
      "/images/projects/asenxo/panel-1.jpg",
      "/images/projects/asenxo/panel-2.jpg",
    ],
    overview:
      "ASENXO is a project management system built for the DOST SETUP 4.0 iFund Program. It digitizes the Technical Needs Assessment (TNA) workflow for MSMEs, maps enterprise locations and market access on an interactive GIS layer, and surfaces pre-TNA insights — strengths, road-network findings, and nearby competition — to support funding and assessment decisions.",
    caseStudy: {
      background:
        "Built to support the administration of the DOST SETUP 4.0 iFund Program, which tracks and manages MSME project funding, technical assessments, and completion.",
      objectives: [
        "Digitize the TNA (Technical Needs Assessment) request and endorsement workflow",
        "Map MSME enterprises and funding activity with GIS spatial analysis",
        "Surface application activity trends and top business sectors",
        "Support project completion prediction and administrative reporting",
      ],
    },
  },
  {
    slug: "litlatte-pos",
    title: "LitLatté POS System",
    shortDescription:
      "An AI-powered point-of-sale and café management system built for BookLatté Iloilo — real-time inventory, orders, and sales analytics.",
    categories: ["web-development", "ui-ux-design"],
    year: 2025,
    featured: false,
    technologies: ["POS System", "Inventory Management", "Analytics Dashboard"],
    thumbnail: "/images/project (5).png",
    gallery: [
      "/images/project (5).png",
      "/images/projects/litlatte-pos/panel-1.jpg",
      "/images/projects/litlatte-pos/panel-2.jpg",
    ],
    overview:
      "The LitLatté POS Suite centralizes ordering, inventory, and sales reporting for BookLatté Iloilo. The ordering screen groups the menu by category for fast checkout, while the manager dashboard tracks revenue, orders, customers, net profit, and top-selling products in real time.",
    caseStudy: {
      background:
        "Built specifically for BookLatté Iloilo to speed up checkout, track inventory in real time, and give management actionable sales insight.",
      objectives: [
        "Speed up café checkout with a categorized, touch-friendly ordering screen",
        "Track inventory in real time across the menu",
        "Give managers a live overview of revenue, orders, and net profit",
        "Surface top-selling products and sales-by-category breakdowns",
      ],
    },
  },
  {
    slug: "trackit",
    title: "TrackIT",
    shortDescription:
      "A workforce management portal for Paul Kaldi's coffee farm — employee registration, task assignment, and reminders in one dashboard.",
    categories: ["web-development", "startup-entrepreneurship"],
    year: 2025,
    featured: false,
    technologies: ["Web App", "Task Management"],
    thumbnail: "/images/project (6).png",
    gallery: [
      "/images/project (6).png",
      "/images/projects/trackit/panel-1.jpg",
      "/images/projects/trackit/panel-2.jpg",
    ],
    overview:
      "TrackIT simplifies workforce management for Paul Kaldi's Manager Portal — registering employees, assigning and tracking tasks, and sending reminders — built in partnership with Foreal Solutions and the WVSU-BINHI Technology Business Incubator.",
    caseStudy: {
      background:
        "Built in partnership with Foreal Solutions and WVSU-BINHI TBI to replace manual, paper-based coordination on the farm with a simple digital workflow.",
      objectives: [
        "Digitize employee registration and employment information",
        "Assign and track tasks across the team from one dashboard",
        "Centralize reminders for time-sensitive farm operations",
      ],
    },
  },
  {
    slug: "rebadulla-appointment",
    title: "Rebadulla Appointment System",
    shortDescription:
      "An online booking system for Rebadulla Animal Care — pet owners book appointments by service type, pet, and date in a few clicks.",
    categories: ["web-development", "ui-ux-design"],
    year: 2025,
    featured: false,
    technologies: ["Web App", "Booking System"],
    thumbnail: "/images/project (7).png",
    gallery: [
      "/images/project (7).png",
      "/images/projects/rebadulla-appointment/panel-1.jpg",
      "/images/projects/rebadulla-appointment/panel-2.jpg",
    ],
    overview:
      "Built for Rebadulla Animal Care, this system lets pet owners book appointments online by service type, pet name, and preferred date, and gives the clinic a simple account and appointments view to manage bookings — bringing pet care closer to home.",
    caseStudy: {
      background:
        "Rebadulla Animal Care needed a simple way for clients to book appointments online instead of by phone, and a lightweight account system to manage them.",
      objectives: [
        "Let clients book appointments by service, pet, and date online",
        "Reduce phone-based scheduling friction for the clinic",
        "Give the clinic an account and appointments view for managing bookings",
      ],
    },
  },
];

export const projects: Project[] = [
  ...projectEntries.filter((project) => !project.categories.includes("mobile-applications")),
  ...projectEntries.filter((project) => project.categories.includes("mobile-applications")),
];

export function getFeaturedProjects(): Project[] {
  return projects.filter((project) => project.featured);
}

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
