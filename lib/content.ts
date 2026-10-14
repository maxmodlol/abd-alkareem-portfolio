export const person = {
  name: "Abd Alkareem Abu-Alsoud",
  email: "kareemabualsoud8@gmail.com",
  linkedin: "https://www.linkedin.com/in/abd-alkareem-abu-alsoud-843738227/",
  github: "https://github.com/maxmodlol",
  cv: "/cv.pdf",
};

export type Job = {
  dates: string;
  company: string;
  role: string;
  points: string[];
};

export const jobs: Job[] = [
  {
    dates: "Jun 2025 to Aug 2025",
    company: "VillageWellth CRM at RaySolution",
    role: "Full-stack developer",
    points: [
      "Built and maintained a CRM for financial brokers on Next.js, Prisma and NextAuth.",
      "Added AI pipelines on Firebase and Gemini to extract client data.",
      "Designed webhook APIs for third-party CRM data, plus JWT SSO and embeddable dashboards.",
    ],
  },
  {
    dates: "Feb 2025 to Jun 2025",
    company: "Sahefa, multi-tenant blog platform",
    role: "Freelance full-stack developer",
    points: [
      "Built a multi-tenant SSR platform with tenant isolation and role-based CMS features.",
      "Automated domain provisioning, wildcard SSL and deploys with Cloudflare and Plesk.",
      "Improved SEO and speed with ISR caching and CDN tuning.",
    ],
  },
  {
    dates: "Feb 2024 to Jan 2025",
    company: "Psycode IO",
    role: "Full-stack developer",
    points: [
      "Built POS and internal business systems with Node.js and Java Spring Boot REST APIs.",
      "Turned Figma designs into responsive Next.js interfaces and customised Shopify storefronts.",
    ],
  },
  {
    dates: "Sep 2022 to Sep 2023",
    company: "SGSoft SAS",
    role: "Full-stack developer",
    points: [
      "Developed NestJS services in a microservices setup, with AWS S3 storage and RabbitMQ events.",
      "Built reusable Angular components shared across internal systems.",
    ],
  },
];

export const skills: { name: string; items: string }[] = [
  { name: "Backend", items: "Node.js, NestJS, Spring Boot, REST APIs, Prisma" },
  { name: "Frontend", items: "React, Next.js, TypeScript, Angular, Tailwind CSS, shadcn/ui" },
  { name: "Data and messaging", items: "PostgreSQL, MongoDB, Redis, RabbitMQ" },
  { name: "Mobile", items: "Flutter, Firebase, React Native" },
  { name: "Cloud and delivery", items: "Cloudflare, Vercel, AWS S3, Docker, Plesk, CI/CD" },
  { name: "Architecture", items: "Multi-tenant SaaS, CRM integrations, webhooks, JWT SSO, API design" },
];
