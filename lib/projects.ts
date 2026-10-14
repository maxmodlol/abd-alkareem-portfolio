export type Project = {
  /** Also the key of the matching building in the 3D scene. */
  id: "villagewellth" | "sahefa" | "diwan" | "oliva" | "watan";
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
    stack: ["Node.js", "Next.js", "PostgreSQL", "REST APIs"],
  },
  {
    id: "oliva",
    name: "Oliva",
    tag: "Oliva",
    kind: "Restaurant management system",
    short: "Restaurant management system",
    text: "A system for running a restaurant: the menu, table orders and the flow to the kitchen in one place.",
    stack: ["Node.js", "Next.js", "PostgreSQL", "REST APIs"],
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
];
