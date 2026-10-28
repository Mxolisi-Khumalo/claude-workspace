import type { Service } from "./types";

const GH = "https://github.com/Mxolisi-Khumalo";

/**
 * The services catalogue. Every evidence item points at real code in a public
 * repository; strengths are deliberately conservative. Prices are "from"
 * prices and feed the concierge's deterministic quote engine.
 */
export const services: Service[] = [
  {
    slug: "interactive-websites",
    title: "Interactive websites",
    tagline: "Premium, motion-rich marketing sites that feel alive and still load fast.",
    priority: 1,
    evidenceStrength: "strong",
    accent: "accent",
    description: [
      "A website is often the first conversation a client has with your brand. I design and build sites that make that moment count: kinetic typography, scroll-driven storytelling, custom cursors, magnetic interactions and WebGL backdrops, all built on a modern Next.js and TypeScript stack.",
      "Motion is engineered, not sprinkled on. Smooth scrolling is synchronised with scroll-linked animation, desktop-only effects are never shipped to phones, and every animated section has a designed reduced-motion version. Performance budgets (JavaScript weight, image and font pipelines) are set up front and checked before launch.",
      "This site is a live example: the immersive background is a hand-written WebGL shader, the robot concierge is a real-time 3D scene, and everything respects prefers-reduced-motion.",
    ],
    idealFor: [
      "Creative professionals, artists and agencies who need a site with personality",
      "Startups launching a product and wanting a memorable landing page",
      "Brands moving off a template site to something bespoke",
    ],
    deliverables: [
      "Art-directed, responsive pages built in Next.js + TypeScript",
      "Scroll-driven animation (GSAP / ScrollTrigger) with smooth scrolling",
      "Custom cursor, magnetic and hover interactions on desktop",
      "Optional WebGL / 3D hero or background",
      "Reduced-motion and keyboard-accessible versions of every interaction",
      "SEO metadata, Open Graph images and analytics",
      "Deployment to Vercel (or your host) with a handover walkthrough",
    ],
    process: [
      { step: "Discovery", detail: "We agree goals, audience, references and the one feeling the site must leave behind." },
      { step: "Motion concept", detail: "A clickable prototype of the hero and key interactions, so you can feel the motion before full build." },
      { step: "Build", detail: "Page-by-page build in weekly previews on a staging URL, with performance budgets enforced." },
      { step: "Polish & accessibility", detail: "Reduced-motion pass, keyboard pass, cross-device testing and Core Web Vitals checks." },
      { step: "Launch & handover", detail: "Deploy, connect your domain and analytics, and walk you through updating content." },
    ],
    tech: ["Next.js", "React", "TypeScript", "GSAP", "Lenis", "Three.js / React Three Fiber", "WebGL", "Tailwind CSS", "Vercel"],
    packages: [
      {
        name: "Launch",
        priceFromZar: 18000,
        priceFromUsd: 1000,
        timeline: "2–3 weeks",
        includes: ["Single-page site (up to 5 sections)", "Scroll-reveal animation and micro-interactions", "Responsive and reduced-motion versions", "Deployment and domain setup"],
      },
      {
        name: "Signature",
        priceFromZar: 45000,
        priceFromUsd: 2500,
        timeline: "4–6 weeks",
        includes: ["Up to 7 pages", "Custom cursor and magnetic interactions", "Scroll-driven storytelling sections", "Content managed from simple files or a headless CMS", "Performance budget and Lighthouse report"],
      },
      {
        name: "Immersive",
        priceFromZar: 85000,
        priceFromUsd: 4800,
        timeline: "6–10 weeks",
        includes: ["Everything in Signature", "WebGL / 3D hero or interactive scene", "Bespoke page transitions", "Advanced motion design system", "30 days of post-launch support"],
      },
    ],
    evidence: [
      {
        project: "teddy.goodfella — immersive artist site",
        repoUrl: `${GH}/teddy.goodfella`,
        proofPoint:
          "A scroll-driven 2.5D hero with cursor and device-tilt parallax, a state-aware custom cursor, magnetic calls to action and a designed reduced-motion version, built in Next.js and TypeScript (phase one of the site).",
        fileRef: "teddy.goodfella/src/motion/ScrollScene.tsx",
      },
      {
        project: "teddy.goodfella — immersive artist site",
        repoUrl: `${GH}/teddy.goodfella`,
        proofPoint: "Desktop-only cursor code is split into its own chunk and never downloaded on touch devices.",
        fileRef: "teddy.goodfella/src/motion/CursorLayer.tsx",
      },
      {
        project: "Portfolio site",
        repoUrl: `${GH}/Portfolio`,
        proofPoint:
          "A GSAP + Lenis site with a preloader, custom cursor, magnetic buttons, count-up stats, pinned horizontal-scroll sections that fall back to native swipe on touch and reduced motion, and a hand-fan photo gallery.",
        fileRef: "Portfolio/src/js/app.js",
      },
      {
        project: "Neon Combat: Hyper Edition",
        repoUrl: `${GH}/Fighting-game`,
        proofPoint:
          "A browser fighting game with a fixed-timestep loop, frame-data combat, a CPU opponent and procedurally generated audio — real-time animation craft without a game engine.",
        fileRef: "Fighting-game/fighting_game.html",
        image: "/images/work/neon-combat.webp",
      },
      {
        project: "This website",
        repoUrl: "https://github.com/Mxolisi-Khumalo/claude-workspace",
        proofPoint:
          "Hand-written WebGL background shader, a real-time 3D concierge robot whose eyes follow your cursor, Lenis + GSAP scroll choreography and full reduced-motion support.",
        fileRef: "services-site/src/components/background/ImmersiveBackground.tsx",
      },
    ],
    faq: [
      { q: "Will all this animation slow my site down?", a: "No — performance is a requirement, not an afterthought. Heavy effects load only where they are used, desktop-only code is never sent to phones, and I set and check a JavaScript budget before launch." },
      { q: "What about visitors who get motion sickness?", a: "Every animated section has a designed reduced-motion version that respects the operating-system setting, and all interactions work with a keyboard." },
      { q: "Can I update the content myself?", a: "Yes. Content lives in simple structured files or a headless CMS, depending on the package, and I walk you through it at handover." },
    ],
  },
  {
    slug: "web-applications",
    title: "Web applications & MVPs",
    tagline: "From idea to a working product your users can log into — fast, typed and tested.",
    priority: 2,
    evidenceStrength: "strong",
    accent: "violet",
    description: [
      "When you need software rather than a brochure — a booking flow, a dashboard, a document tool or a SaaS MVP — I build full-stack web applications with clear data models, typed code and the tests that keep them working.",
      "I work comfortably across Angular, React and Next.js on the front end, and Python, Node.js, Java or C#/.NET behind it. I care about the unglamorous parts that make products trustworthy: server-side validation, prices calculated on the server, ownership checks, consistent error handling and automated tests.",
      "Projects are delivered in small, demoable increments, so you see real progress every week and can change direction early.",
    ],
    idealFor: [
      "Founders validating a product idea with a focused MVP",
      "Businesses replacing spreadsheets or email workflows with a proper tool",
      "Teams that need an extra full-stack developer for a defined feature",
    ],
    deliverables: [
      "Product scoping workshop and a prioritised feature list",
      "Responsive web app (Angular, React or Next.js) with authentication",
      "REST API and database design",
      "Automated unit tests for core business logic",
      "Admin dashboard for your team",
      "Deployment, documentation and handover",
    ],
    process: [
      { step: "Scope", detail: "Map users, core workflow and the smallest version worth shipping." },
      { step: "Design the data", detail: "Entities, permissions and API contracts agreed before UI work begins." },
      { step: "Build in sprints", detail: "One- or two-week increments, each ending in a demo on a staging URL." },
      { step: "Harden", detail: "Validation, error handling, tests and a security pass on every endpoint." },
      { step: "Launch & iterate", detail: "Production deploy, monitoring and an agreed backlog for the next phase." },
    ],
    tech: ["TypeScript", "Angular", "React", "Next.js", "Node.js / Express", "Python", "MongoDB", "DynamoDB", "PostgreSQL", "Tailwind CSS", "Vitest", "pytest"],
    packages: [
      {
        name: "MVP Sprint",
        priceFromZar: 45000,
        priceFromUsd: 2500,
        timeline: "4–6 weeks",
        includes: ["One core user workflow end to end", "Authentication and roles", "Database and REST API", "Deployed staging and production environments"],
      },
      {
        name: "Product Build",
        priceFromZar: 95000,
        priceFromUsd: 5500,
        timeline: "8–12 weeks",
        includes: ["Multiple workflows and an admin dashboard", "Third-party integrations (payments, email, storage)", "Automated tests for business logic", "Documentation and handover"],
      },
      {
        name: "Feature Retainer",
        priceFromZar: 18000,
        priceFromUsd: 1000,
        timeline: "Monthly",
        includes: ["Up to 30 hours of development per month", "Bug fixes and small features", "Fortnightly check-in", "Cancel any time"],
      },
    ],
    evidence: [
      {
        project: "DeskSign — PDF e-signature app",
        repoUrl: `${GH}/DeskSign-App`,
        proofPoint:
          "An Angular + TypeScript app where users upload a PDF, drag signature and form fields onto any page, sign by drawing, typing or uploading, and download a flattened signed PDF — with undo/redo and guided signing.",
        fileRef: "DeskSign-App/src/app/pages/document-preview/document-preview.ts",
        image: "/images/work/desksign.webp",
      },
      {
        project: "Self-Storage Platform",
        repoUrl: `${GH}/Self-Storage-Platform`,
        proofPoint:
          "A booking platform where customers browse units by city and reserve a date range; the server calculates every price and ignores any amount sent by the browser.",
        fileRef: "Self-Storage-Platform/src/storage/book.py",
        image: "/images/work/self-storage.webp",
      },
      {
        project: "Student Management System",
        repoUrl: `${GH}/Simple-Student-Management-System`,
        proofPoint: "A React + Tailwind dashboard over an Express and MongoDB REST API with create, edit and delete for every record.",
        fileRef: "Simple-Student-Management-System/server/routes/studentRoutes.js",
      },
    ],
    faq: [
      { q: "Do I own the code?", a: "Yes. On final payment you own the code and the repository is transferred to your account." },
      { q: "Which stack will you use?", a: "Whatever fits your team and budget. I default to TypeScript with Next.js or Angular and a managed database, but I am comfortable in Python, Java and C#/.NET too." },
      { q: "What happens after launch?", a: "Every build includes a short warranty period for bugs. Ongoing work can continue on the Feature Retainer." },
    ],
  },
  {
    slug: "cloud-backends",
    title: "Cloud & serverless backends",
    tagline: "Secure APIs and infrastructure-as-code on AWS — tested before they ever reach production.",
    priority: 3,
    evidenceStrength: "strong",
    accent: "sky",
    description: [
      "Good backends are boring in the best way: predictable, secure and cheap to run. I design REST APIs and serverless architectures on AWS — Lambda, API Gateway, DynamoDB, Cognito, S3 and CloudFront — and define the whole stack as code so environments are reproducible.",
      "Correctness comes first. That means atomic writes so inventory can never be oversold, identity taken from verified tokens rather than request bodies, least-privilege permissions per function, consistent error responses that never leak internals, and a test suite that runs without touching a real AWS account.",
      "I can also review and harden an existing backend: finding race conditions, missing authorisation checks and fragile infrastructure before your customers do.",
    ],
    idealFor: [
      "Products that need a scalable API without managing servers",
      "Teams that want their infrastructure versioned and reviewable",
      "Owners of an existing backend that feels fragile or untested",
    ],
    deliverables: [
      "API design (resources, auth model, error format)",
      "Serverless implementation on AWS Lambda + API Gateway",
      "DynamoDB or PostgreSQL data modelling",
      "Cognito (or other) authentication",
      "Infrastructure as code with AWS SAM / CloudFormation",
      "Automated unit tests and a CI pipeline",
      "Runbook and architecture diagram",
    ],
    process: [
      { step: "Assess", detail: "Requirements, traffic expectations, data sensitivity and existing systems." },
      { step: "Design", detail: "API contract, data model and an infrastructure diagram you sign off." },
      { step: "Implement as code", detail: "Functions, tables, auth and hosting defined in one template." },
      { step: "Test & harden", detail: "Unit tests with mocked AWS, linting, template validation and a security review." },
      { step: "Deploy & document", detail: "Staged rollout, monitoring and a handover runbook." },
    ],
    tech: ["AWS Lambda", "API Gateway", "DynamoDB", "Cognito", "S3 + CloudFront", "AWS SAM / CloudFormation", "Python", "Node.js", "Java", "pytest + moto", "GitLab / GitHub CI", "Azure"],
    packages: [
      {
        name: "API Starter",
        priceFromZar: 30000,
        priceFromUsd: 1700,
        timeline: "2–4 weeks",
        includes: ["REST API for one domain area", "Database and authentication", "Infrastructure as code", "Unit tests and CI"],
      },
      {
        name: "Platform",
        priceFromZar: 70000,
        priceFromUsd: 4000,
        timeline: "6–8 weeks",
        includes: ["Multiple services and data stores", "Secure static hosting for your front end", "Tracing, throttling and alerts", "Staging and production environments"],
      },
      {
        name: "Audit & Harden",
        priceFromZar: 15000,
        priceFromUsd: 850,
        timeline: "1–2 weeks",
        includes: ["Code and infrastructure review", "Prioritised findings report", "Fixes for the top issues", "Test coverage for critical paths"],
        purchasable: true,
      },
    ],
    evidence: [
      {
        project: "Self-Storage Platform",
        repoUrl: `${GH}/Self-Storage-Platform`,
        proofPoint:
          "8 Python Lambda functions behind a Cognito-secured API Gateway, 3 DynamoDB tables, and an S3 + CloudFront front end — the entire stack defined in one AWS SAM template.",
        fileRef: "Self-Storage-Platform/src/template.yaml",
      },
      {
        project: "Self-Storage Platform",
        repoUrl: `${GH}/Self-Storage-Platform`,
        proofPoint:
          "Bookings reserve stock with a single conditional DynamoDB update, so units can never be oversold or booked while out of service.",
        fileRef: "Self-Storage-Platform/src/storage/book.py",
      },
      {
        project: "Self-Storage Platform",
        repoUrl: `${GH}/Self-Storage-Platform`,
        proofPoint: "86 automated unit tests run against an in-memory DynamoDB (moto), plus lint and template-validation in CI.",
        fileRef: "Self-Storage-Platform/src/tests/unit",
      },
      {
        project: "Monte Carlo Minimisation",
        repoUrl: `${GH}/MonteCarloMini`,
        proofPoint: "A compute-heavy search parallelised with Java's Fork/Join framework and benchmarked on two machines, reaching up to a 3.12× speed-up.",
        fileRef: "MonteCarloMini/src/MonteCarloMini/SearchParallel.java",
        image: "/images/work/montecarlo-speedup-charts.webp",
      },
    ],
    faq: [
      { q: "AWS or Azure?", a: "My deepest hands-on work is on AWS; I also have Azure DevOps experience. I will recommend whichever suits your team and existing accounts." },
      { q: "Will serverless be expensive?", a: "For most early-stage products it is the cheapest option because you pay per request. I estimate running costs as part of the design." },
      { q: "Can you work on a backend someone else built?", a: "Yes — the Audit & Harden package is designed for exactly that." },
    ],
  },
  {
    slug: "document-automation",
    title: "Document & PDF automation",
    tagline: "E-signature flows, generated quotes and invoices, and paperwork that fills itself in.",
    priority: 4,
    evidenceStrength: "moderate",
    accent: "amber",
    description: [
      "Paperwork is where many small businesses lose hours every week. I build tools that generate, fill and sign documents: quote and invoice PDFs created from your data, drag-and-drop signing workflows, and completion certificates you can file.",
      "The signing work runs in the browser with precise, resolution-independent field placement and flattened output, and the generation work powers this site's own quotes and invoices.",
      "Where you need legally robust digital signatures, I integrate a certified signing provider rather than reinventing compliance.",
    ],
    idealFor: [
      "Service businesses sending quotes, contracts or invoices by hand",
      "Teams collecting signatures on internal forms",
      "Products that need branded PDF exports",
    ],
    deliverables: [
      "Branded PDF templates generated from your data",
      "Drag-and-drop field placement and in-browser signing",
      "Completion certificates and audit-friendly records",
      "Email delivery and storage of finished documents",
      "Integration with a certified e-signature provider when required",
    ],
    process: [
      { step: "Map the paperwork", detail: "Which documents, who fills them, who signs and where they end up." },
      { step: "Template", detail: "Branded templates and a data model for every field." },
      { step: "Build the flow", detail: "Generation, signing and delivery wired into your process." },
      { step: "Verify", detail: "Test with real documents across devices and PDF readers." },
    ],
    tech: ["TypeScript", "Angular", "pdf-lib", "pdf.js", "Next.js", "Resend"],
    packages: [
      {
        name: "Templates",
        priceFromZar: 20000,
        priceFromUsd: 1100,
        timeline: "2–3 weeks",
        includes: ["Up to 3 branded PDF templates", "Generated from your data or a form", "Email delivery"],
      },
      {
        name: "Signing Workflow",
        priceFromZar: 55000,
        priceFromUsd: 3000,
        timeline: "5–7 weeks",
        includes: ["Upload, place fields and sign in the browser", "Flattened signed PDFs with a completion certificate", "Dashboard of documents and statuses"],
      },
    ],
    evidence: [
      {
        project: "DeskSign — PDF e-signature app",
        repoUrl: `${GH}/DeskSign-App`,
        proofPoint: "Signature, initials, date, text and checkbox fields stored in a resolution-independent model and mapped precisely from screen space to PDF space (unit-tested).",
        fileRef: "DeskSign-App/src/app/services/pdf-signing.ts",
        image: "/images/work/desksign.webp",
      },
      {
        project: "DeskSign — PDF e-signature app",
        repoUrl: `${GH}/DeskSign-App`,
        proofPoint: "Produces a flattened signed PDF with embedded fonts and a certificate-of-completion page.",
        fileRef: "DeskSign-App/src/app/services/pdf-signing.ts",
        image: "/images/work/desksign-certificate.webp",
      },
      {
        project: "This website",
        repoUrl: "https://github.com/Mxolisi-Khumalo/claude-workspace",
        proofPoint: "Generates numbered quote and invoice PDFs on the server and emails them to clients from the concierge chat.",
        fileRef: "services-site/src/lib/documents",
      },
    ],
    faq: [
      { q: "Are the signatures legally binding?", a: "Simple electronic signatures are suitable for many everyday agreements. For documents that need advanced or certified signatures, I integrate an accredited provider." },
      { q: "Can it use my existing Word templates?", a: "Yes — I recreate them as data-driven PDF templates so they stay on-brand and consistent." },
    ],
  },
  {
    slug: "ai-assistants",
    title: "AI assistants & automation",
    tagline: "Chat assistants that actually do things — qualify leads, quote, book and invoice.",
    priority: 5,
    evidenceStrength: "emerging",
    accent: "pink",
    description: [
      "Large language models are most useful when they are connected to your business, not just answering questions. I build assistants that use tools safely: looking up your catalogue, calculating quotes with your real prices, checking a calendar and handing off to a human when it matters.",
      "Safety and cost are designed in. The model can only propose actions; prices are calculated by your own code; emails are fixed templates; visitors confirm anything that books, sends or charges; and usage is capped and monitored.",
      "The concierge on this site is the reference build — talk to it to see the experience your customers would get.",
    ],
    idealFor: [
      "Service businesses that answer the same enquiries every day",
      "Teams wanting to automate intake, triage or scheduling",
      "Products adding an AI feature without compromising safety",
    ],
    deliverables: [
      "Assistant design: tone, scope, tools and guardrails",
      "Integration with the Claude API (tool use, streaming)",
      "Connections to your calendar, email, payments or database",
      "Two-phase confirmation for any real-world action",
      "Usage, cost and conversation monitoring",
      "A scripted fallback mode so it never goes fully dark",
    ],
    process: [
      { step: "Pick the job", detail: "One clear job the assistant should do well, and what it must never do." },
      { step: "Design the tools", detail: "Small, safe tools with validated inputs and server-side business rules." },
      { step: "Build & evaluate", detail: "Test against realistic conversations, including adversarial ones." },
      { step: "Launch & monitor", detail: "Rate limits, spend caps, transcripts and a feedback loop." },
    ],
    tech: ["Claude API", "Anthropic TypeScript SDK", "Tool use", "Next.js route handlers", "Zod", "Cal.com", "Paystack", "Resend"],
    packages: [
      {
        name: "Concierge",
        priceFromZar: 28000,
        priceFromUsd: 1600,
        timeline: "3–4 weeks",
        includes: ["Website chat assistant trained on your services", "Lead capture with email verification", "Calendar booking", "Usage and cost safeguards"],
      },
      {
        name: "Workflow Assistant",
        priceFromZar: 60000,
        priceFromUsd: 3400,
        timeline: "6–8 weeks",
        includes: ["Everything in Concierge", "Quotes, invoices and payments", "Custom integrations with your systems", "Admin view of conversations and leads"],
      },
    ],
    evidence: [
      {
        project: "This website's concierge",
        repoUrl: "https://github.com/Mxolisi-Khumalo/claude-workspace",
        proofPoint:
          "A Claude-powered assistant with a fixed tool allowlist, server-owned conversation history, deterministic pricing, email verification and confirm-before-acting for bookings, emails and invoices.",
        fileRef: "services-site/src/lib/chat/server/tools.ts",
      },
    ],
    faq: [
      { q: "Will it make things up?", a: "It is restricted to your catalogue and tools: prices, availability and evidence come from your systems, never from the model's imagination." },
      { q: "What does it cost to run?", a: "Typically a few cents per conversation. Spend caps and a scripted fallback keep costs predictable." },
      { q: "Is customer data safe?", a: "Conversations are stored on your infrastructure with POPIA-aligned notices, minimal data collection and retention rules." },
    ],
  },
  {
    slug: "interactive-experiences",
    title: "Games & interactive experiences",
    tagline: "Playable, shareable experiences for campaigns, events and learning.",
    priority: 6,
    evidenceStrength: "moderate",
    accent: "amber",
    description: [
      "Sometimes the best way to get attention is to let people play. I build browser games and interactive pieces — campaign mini-games, event activations and learning simulations — with real-time loops, AI opponents, procedural art and sound.",
      "Everything runs in the browser without installs, so it is easy to share on social media or a landing page, and it can feed scores or sign-ups back to your marketing tools.",
    ],
    idealFor: ["Brand campaigns and product launches", "Event and expo activations", "Educators wanting interactive simulations"],
    deliverables: [
      "Game or interaction concept and prototype",
      "Browser build (HTML5 Canvas / WebGL)",
      "Procedural or custom art and sound",
      "Leaderboards or lead capture",
      "Responsive and touch controls where required",
    ],
    process: [
      { step: "Concept", detail: "The core loop in one sentence and a playable greybox within days." },
      { step: "Feel", detail: "Tune controls, timing and feedback until it is fun." },
      { step: "Dress", detail: "Art, sound, menus and brand integration." },
      { step: "Ship", detail: "Performance pass, analytics and hosting." },
    ],
    tech: ["JavaScript", "TypeScript", "HTML5 Canvas", "WebGL", "Web Audio API", "Python / pygame"],
    packages: [
      {
        name: "Mini-game",
        priceFromZar: 25000,
        priceFromUsd: 1400,
        timeline: "3–4 weeks",
        includes: ["One polished game loop", "Branded art and sound", "Score sharing", "Desktop and mobile"],
      },
      {
        name: "Campaign Experience",
        priceFromZar: 60000,
        priceFromUsd: 3400,
        timeline: "6–8 weeks",
        includes: ["Multi-level or multi-mode experience", "Leaderboard and lead capture", "Analytics events", "Launch support"],
      },
    ],
    evidence: [
      {
        project: "Neon Combat: Hyper Edition",
        repoUrl: `${GH}/Fighting-game`,
        proofPoint: "Six fighters, a CPU opponent with three difficulty levels that uses the same input path as a human, and all sound generated in code — playable in the browser with no install.",
        fileRef: "Fighting-game/fighting_game.html",
        image: "/images/work/neon-combat.webp",
      },
      {
        project: "Space Rocks — neon Asteroids remix",
        repoUrl: `${GH}/Asteroids-game`,
        proofPoint: "Three game modes, power-ups and a UFO enemy, with procedurally generated 3D-looking sprites and synthesised audio, structured as a clean scene state machine.",
        fileRef: "Asteroids-game/space_rocks/game.py",
        image: "/images/work/space-rocks.webp",
      },
    ],
    faq: [
      { q: "Will it work on phones?", a: "Yes — mobile and touch controls are scoped in from the start for campaign builds." },
      { q: "Can it collect leads?", a: "Yes. Scores, sign-ups and consent can flow into your CRM or mailing tool." },
    ],
  },
  {
    slug: "mentoring",
    title: "Code mentoring & team upskilling",
    tagline: "Patient, practical mentoring that turns beginners into confident developers.",
    priority: 7,
    evidenceStrength: "strong",
    accent: "accent",
    description: [
      "I have mentored more than 115 prospective developers through bootcamp final projects and reviewed over 100 more, and later served as a Technical Mentor at WeThinkCode_. Around 80% of the students I mentored passed their bootcamp tests — many of them completely new to programming.",
      "Sessions are hands-on: pair programming on your real code, code reviews with clear explanations, and study plans that build confidence step by step. I work with individuals, bootcamps and teams onboarding junior developers.",
    ],
    idealFor: [
      "Self-taught developers and bootcamp students",
      "Companies onboarding junior developers",
      "Bootcamps and training programmes needing project mentors",
    ],
    deliverables: [
      "1:1 pair-programming and code-review sessions",
      "Personalised learning plan",
      "Project feedback on functionality, code quality and collaboration",
      "Workshops on Git, testing, clean code and Agile delivery",
    ],
    process: [
      { step: "Baseline", detail: "A short session to understand goals and current level." },
      { step: "Plan", detail: "A focused plan with weekly outcomes." },
      { step: "Practise", detail: "Pair programming and reviews on real projects." },
      { step: "Review", detail: "Progress check and next steps." },
    ],
    tech: ["Java", "Python", "C#", "JavaScript / TypeScript", "SQL", "Git", "Agile / Scrum"],
    packages: [
      {
        name: "Mentoring Pack",
        priceFromZar: 3800,
        priceFromUsd: 220,
        timeline: "4 × 1-hour sessions",
        includes: ["Four 1:1 online sessions", "Code review between sessions", "Personal learning plan"],
        purchasable: true,
      },
      {
        name: "Team Workshop",
        priceFromZar: 9500,
        priceFromUsd: 550,
        timeline: "Half day",
        includes: ["Workshop for up to 12 people", "Topic of your choice (Git, testing, clean code, Agile)", "Exercises and follow-up notes"],
        purchasable: true,
      },
      {
        name: "Bootcamp Mentor",
        priceFromZar: 16000,
        priceFromUsd: 900,
        timeline: "Monthly",
        includes: ["Project mentoring for a cohort", "Code reviews and feedback", "Weekly progress reporting"],
      },
    ],
    evidence: [
      {
        project: "WeThinkCode_ bootcamps",
        repoUrl: "https://www.wethinkcode.co.za",
        proofPoint: "Mentored 115+ prospective students through final projects and reviewed 100+ more; around 80% of mentored students passed their bootcamp tests.",
        fileRef: "Portfolio/index.html",
        image: "/images/about/mentoring-whiteboard.webp",
      },
      {
        project: "Technical Mentor, WeThinkCode_",
        repoUrl: "https://www.wethinkcode.co.za",
        proofPoint: "Guided students through pair programming and architectural reviews, and supervised campus roles as the liaison to operations management.",
        fileRef: "Portfolio/index.html",
        image: "/images/about/pair-programming.webp",
      },
    ],
    faq: [
      { q: "Do you teach complete beginners?", a: "Yes — many of the students I have mentored were brand new to programming." },
      { q: "Online or in person?", a: "Online by default; in person around Johannesburg by arrangement." },
    ],
  },
];
