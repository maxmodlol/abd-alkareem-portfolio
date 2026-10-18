export type Project = {
  /** Also the key of the matching building in the 3D scene. */
  id: "villagewellth" | "sahefa" | "diwan" | "oliva" | "watan" | "carebooks" | "arvo";
  /** Product name. */
  name: string;
  /** Short floating label on the island. */
  tag: string;
  /** What kind of product it is. */
  kind: string;
  /** One line for lists. */
  short: string;
  text: string;
  stack: string[];
};

export const projects: Project[] = [
  {
    id: "villagewellth",
    name: "VillageWellth",
    tag: "VillageWellth",
    kind: "CRM for financial brokers",
    short: "CRM for financial brokers",
    text: "Lead management, commissions, reports and live dashboards for several brokerages at once. An AI pipeline reads client documents, and webhook APIs pull in data from other CRMs.",
    stack: ["Next.js", "Prisma", "PostgreSQL", "NextAuth", "Firebase", "Gemini", "Webhooks"],
  },
  {
    id: "sahefa",
    name: "Sahefa",
    tag: "Sahefa",
    kind: "Multi-tenant blog and CMS",
    short: "Multi-tenant blog and CMS",
    text: "Every tenant gets its own domain, theme, roles and publishing workflow. Domain setup, wildcard SSL and deploys are automated, and cached pages keep it fast.",
    stack: ["Next.js", "PostgreSQL", "Cloudflare", "Plesk", "ISR", "CDN", "Google Ads"],
  },
  {
    id: "diwan",
    name: "DIWAN",
    tag: "DIWAN",
    kind: "Point of sale for a furniture store",
    short: "Point of sale for a furniture store",
    text: "A point-of-sale system for selling furniture: checkout at the counter, the product catalogue and stock in one place.",
    stack: ["Next.js", "Node.js", "PostgreSQL", "REST APIs"],
  },
  {
    id: "oliva",
    name: "Oliva",
    tag: "Oliva",
    kind: "Restaurant management system",
    short: "Staff clock in and out for restaurants",
    text: "A small restaurant management system: staff clock in and clock out, plus the everyday features a restaurant needs to run its team.",
    stack: ["Next.js", "Supabase"],
  },
  {
    id: "watan",
    name: "Watan",
    tag: "Watan",
    kind: "Palestinian checkpoint status app",
    short: "Live checkpoint status between cities",
    text: "Live checkpoint status between Palestinian cities, with history, reviews and a map. Users and admins can both post updates.",
    stack: ["Flutter", "Firebase", "MongoDB", "Maps", "Geolocation"],
  },
  {
    id: "carebooks",
    name: "CareBooks",
    tag: "CareBooks",
    kind: "Book publishing and shop platform",
    short: "Books for families of people with disabilities",
    text: "A CMS and online shop for publishing and buying books that help families and friends learn how to support people with disabilities.",
    stack: ["Angular", "Node.js"],
  },
  {
    id: "arvo",
    name: "Arvo",
    tag: "Arvo",
    kind: "Fashion and clothing shop",
    short: "Pick a bundle or shop by fashion",
    text: "An online clothing and fashion shop where customers build their own bundle, or simply shop by fashion.",
    stack: ["Next.js", "Supabase"],
  },
];
