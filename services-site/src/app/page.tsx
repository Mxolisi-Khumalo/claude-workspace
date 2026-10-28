import type { Metadata } from "next";
import { caseStudies, getService, profile, services } from "@/content";
import { testimonial } from "@/content/profile";
import { ConciergeSection } from "@/components/concierge/ConciergeSection";
import { About } from "@/components/home/About";
import { Faq } from "@/components/home/Faq";
import { Hero } from "@/components/home/Hero";
import { Impact } from "@/components/home/Impact";
import { Pricing } from "@/components/home/Pricing";
import { Process } from "@/components/home/Process";
import { Proof, type ProofCardData } from "@/components/home/Proof";
import { ServicesIndex } from "@/components/home/ServicesIndex";
import { TechMarquee } from "@/components/home/TechMarquee";
import { minPackage } from "@/components/home/utils";
import "@/components/home/home.css";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/** Structured data: the person and the services on offer with "from" prices. */
function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: `${profile.name} — Full-stack development services`,
    description: profile.subhead,
    areaServed: "Worldwide",
    address: { "@type": "PostalAddress", addressLocality: "Johannesburg", addressCountry: "ZA" },
    founder: {
      "@type": "Person",
      name: profile.name,
      jobTitle: profile.role,
      knowsLanguage: profile.languages,
      sameAs: profile.links.map((l) => l.url),
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: services.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.title, description: s.tagline },
        priceSpecification: {
          "@type": "PriceSpecification",
          minPrice: minPackage(s).priceFromZar,
          priceCurrency: "ZAR",
        },
      })),
    },
  };
}

export default function Home() {
  const proofItems: ProofCardData[] = caseStudies.map((c) => {
    const primary = getService(c.services[0]);
    return {
      slug: c.slug,
      title: c.title,
      repoUrl: c.repoUrl,
      summary: c.summary,
      outcome: c.outcome,
      stack: c.stack,
      image: c.images[0],
      accent: `var(--${primary?.accent ?? "accent"})`,
    };
  });

  return (
    <div className="hm-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()).replace(/</g, "\\u003c") }}
      />
      <Hero headline={profile.headline} subhead={profile.subhead} />
      <TechMarquee services={services} />
      <ServicesIndex services={services} />
      <Proof items={proofItems} />
      <Impact stats={profile.stats} valueProps={profile.valueProps} />
      <Process />
      <Pricing services={services} />
      <ConciergeSection />
      <About profile={profile} testimonial={testimonial} />
      <Faq />
    </div>
  );
}
