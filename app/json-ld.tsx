import { getSiteUrl } from "@/lib/site";

const siteName = "Abd Alkareem Abu-Alsoud";
const jobTitle = "Full-Stack Software Engineer";
const description =
  "Backend-leaning full-stack software engineer building SaaS platforms, APIs, CRM systems, integrations, and web/mobile products.";

export function HomeJsonLd() {
  const url = getSiteUrl();
  const sameAs = ["https://github.com/maxmodlol"] as const;
  const json = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteName,
    jobTitle,
    description,
    url,
    sameAs: [...sameAs],
    address: { "@type": "PostalAddress", addressCountry: "PS" },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
