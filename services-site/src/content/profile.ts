import type { Profile } from "./types";

/**
 * Facts here come from the public portfolio (github.com/Mxolisi-Khumalo/Portfolio)
 * and résumé. Keep claims verifiable.
 */
export const profile: Profile = {
  name: "Mxolisi Khumalo",
  shortName: "Mxolisi",
  role: "Full-stack developer & mentor",
  location: "Johannesburg, South Africa",
  timezone: "SAST (UTC+2)",
  languages: ["English", "isiZulu", "isiXhosa"],
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "mxolisikhumalo611@gmail.com",
  headline: "Software that sells, scales and ships.",
  subhead:
    "Full-stack development services from Johannesburg — interactive websites, web apps, cloud backends and AI assistants, each backed by real, inspectable work.",
  valueProps: [
    "Evidence over adjectives — every service links to code you can inspect.",
    "Fixed, published starting prices and an instant quote from the concierge.",
    "Weekly demos on a live staging link, so you never wonder what's happening.",
    "Clean, tested, documented code that you own outright.",
  ],
  whoFor: [
    "Startups and founders shipping a first version",
    "Small businesses replacing manual workflows",
    "Creatives and brands who want a site with presence",
    "Teams that need an extra full-stack pair of hands",
  ],
  bio: [
    "I'm a full-stack developer from Johannesburg and a WeThinkCode_ alumnus (National Diploma in Software Development, NQF 6), with four years of Information Technology studies at the University of Cape Town before that.",
    "By day I work as a Technology Associate on an enterprise SaaS platform (C#, .NET, TypeScript, React, SQL Server, Azure DevOps). Alongside that, I take on a small number of client projects where I can give each one proper attention.",
    "I've also mentored more than 115 bootcamp students — which is why I explain technical decisions in plain language and leave every codebase better documented than I found it.",
  ],
  stats: [
    { label: "Projects built across GitHub & GitLab", value: 60, suffix: "+" },
    { label: "Students mentored", value: 115, suffix: "+" },
    { label: "Years programming", value: 6, suffix: "+" },
    { label: "Courses & certifications", value: 20, suffix: "+" },
  ],
  credibility: [
    "WeThinkCode_ alumnus — National Diploma in Software Development (NQF 6)",
    "Technical Mentor at WeThinkCode_ (2025–2026)",
    "Mentored 115+ bootcamp students; ~80% passed their bootcamp tests",
    "Certified AI-Empowered SAFe 6 Practitioner (Scaled Agile)",
    "Scrum Master certification",
    "AWS Cloud Computing, Machine Learning Foundations & Generative AI badges",
  ],
  certifications: [
    { title: "Certified AI-Empowered SAFe 6 Practitioner", issuer: "Scaled Agile" },
    { title: "Scrum Master Certification", issuer: "The Knowledge Academy" },
    { title: "GenAI for Software Engineers", issuer: "WeThinkCode_" },
    { title: "AWS Cloud Computing (Trainee)", issuer: "AWS · Credly" },
    { title: "AWS Introduction to Generative AI", issuer: "AWS · Credly" },
    { title: "AWS Machine Learning Foundations", issuer: "AWS · Credly" },
    { title: "Azure Secure Networking", issuer: "Microsoft Learn" },
    { title: "Building Web APIs with ASP.NET Core 8", issuer: "LinkedIn Learning" },
    { title: "React Essential Training", issuer: "LinkedIn Learning" },
    { title: "TanStack Query: React Server State", issuer: "Udemy" },
    { title: "Software Testing: Continuous Testing & DevOps", issuer: "LinkedIn Learning" },
    { title: "Azure DevOps for Beginners", issuer: "LinkedIn Learning" },
    { title: "Microsoft SQL Server 2022 Essential Training", issuer: "LinkedIn Learning" },
    { title: "Business Analysis Foundations", issuer: "LinkedIn Learning" },
  ],
  links: [
    { label: "GitHub", url: "https://github.com/Mxolisi-Khumalo" },
    { label: "LinkedIn", url: "https://www.linkedin.com/in/mxolisi-khumalo-8b6296324/" },
    { label: "Portfolio", url: "https://mxolisi-khumalo.github.io/Portfolio" },
  ],
  portrait: "/images/about/portrait.webp",
};

/** The one third-party testimonial on record (a bootcamp mentee), quoted verbatim in part. */
export const testimonial = {
  quote: "Shoutout to Mxolisi the mentor — explains basics so patiently, set a bench mark for mentors, ever so patient.",
  source: "Bootcamp mentee, WeThinkCode_ JHB",
  image: "/images/about/mentor-shoutout.webp",
};
