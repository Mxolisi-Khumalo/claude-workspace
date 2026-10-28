import type { CaseStudy } from "./types";

const GH = "https://github.com/Mxolisi-Khumalo";

/**
 * Case studies used as proof across the services. Outcomes describe what the
 * code demonstrably does — no invented metrics, clients or launches.
 */
export const caseStudies: CaseStudy[] = [
  {
    slug: "self-storage-platform",
    title: "Self-Storage Platform",
    repoUrl: `${GH}/Self-Storage-Platform`,
    summary:
      "A serverless booking platform on AWS: customers browse storage units by city, reserve a date range and manage rentals, while staff manage stock.",
    challenge:
      "A storage operator with sites in Cape Town, Johannesburg and Durban needs customers to book units online without overselling stock, without letting the browser decide prices, and without running servers.",
    approach:
      "Eight Python Lambda functions behind an API Gateway with a Cognito authorizer, three DynamoDB tables and an S3 + CloudFront front end, all defined in one AWS SAM template. Each booking reserves stock with a single conditional write; bookings are priced on the server in 30-day billing periods; and cancelling someone else's booking returns the same 404 as a missing one, so booking IDs can't be probed.",
    outcome:
      "86 automated unit tests (most against an in-memory DynamoDB), with linting and CloudFormation validation in CI — the whole stack can be reproduced from the repository. Built as a WeThinkCode_ team capstone and later reworked and hardened; role-based staff permissions are the documented next step.",
    stack: ["Python", "AWS Lambda", "API Gateway", "DynamoDB", "Cognito", "AWS SAM", "S3 + CloudFront", "pytest + moto"],
    images: ["/images/work/self-storage.webp"],
    services: ["cloud-backends", "web-applications"],
  },
  {
    slug: "desksign",
    title: "DeskSign — PDF e-signature app",
    repoUrl: `${GH}/DeskSign-App`,
    summary:
      "A browser-based document-signing app built for Deskflo: upload a PDF, place fields, sign, and download a flattened signed copy with a completion certificate.",
    challenge:
      "Signing a PDF should not require printing, scanning or an expensive subscription — and the document should not have to leave the user's browser.",
    approach:
      "Angular + TypeScript with pdf.js for rendering and pdf-lib for output. Fields (signature, initials, name, date, text, checkbox) live in a resolution-independent model, are dragged across pages with hit-testing, and are mapped to PDF coordinates by a pure, unit-tested function. Signing supports drawing, typing or uploading a PNG, with undo/redo and guided progress.",
    outcome:
      "A working front-end app that produces flattened signed PDFs with embedded fonts and a certificate-of-completion page. Signatures are visual (not cryptographic); multiple recipients, signing order and templates are on the roadmap.",
    stack: ["Angular", "TypeScript", "pdf-lib", "pdf.js", "Tailwind CSS", "PrimeNG", "Vitest"],
    images: ["/images/work/desksign.webp", "/images/work/desksign-certificate.webp"],
    services: ["document-automation", "web-applications"],
  },
  {
    slug: "teddy-goodfella",
    title: "teddy.goodfella — immersive artist site",
    repoUrl: `${GH}/teddy.goodfella`,
    summary:
      "An in-progress portfolio build for a Cape Town MC (phase one, not yet launched): a scroll-driven 2.5D hero that moves from the stage into the crowd, with cursor and device-tilt parallax.",
    challenge:
      "Make an artist's site feel like being at the show — on mid-range phones and patchy mobile data, and for visitors who prefer reduced motion.",
    approach:
      "Next.js and TypeScript with Lenis smooth scrolling synchronised to scroll-linked animation, a reusable scroll-scene component with a built-in reduced-motion fallback, layered photography instead of WebGL for the 2.5D effect, a state-aware custom cursor and magnetic calls to action. Desktop-only cursor code is split out and never downloaded on touch devices.",
    outcome:
      "A performance-budgeted hero (about 184 KiB of initial JavaScript against a 200 KiB budget, self-reported in the project notes) with a reduced-motion version. Imagery is placeholder until launch; later phases (CMS, press pages) are planned.",
    stack: ["Next.js", "React", "TypeScript", "Lenis", "CSS motion", "Cloudflare R2"],
    images: [],
    services: ["interactive-websites"],
  },
  {
    slug: "neon-combat",
    title: "Neon Combat: Hyper Edition",
    repoUrl: `${GH}/Fighting-game`,
    summary: "A Street-Fighter-style browser game (shown on the portfolio as Shadow Fight Game) with six fighters, a CPU opponent and sound generated entirely in code.",
    challenge: "Build a responsive, satisfying real-time fighting game in a single HTML file — no engine, no asset pipeline, no install.",
    approach:
      "A fixed-timestep main loop for consistent game speed, normal attacks driven by frame data (startup, active, recovery), an input buffer that turns key presses into fighting-game commands, and a CPU opponent that queues its moves through the shared action queue, tuned by difficulty. Particles, hit-stop, screen shake and Web Audio synthesis provide the feel.",
    outcome: "A complete, playable game with character select, best-of-three rounds and three AI difficulty levels, embedded and playable on the portfolio site.",
    stack: ["JavaScript", "HTML5 Canvas", "Web Audio API"],
    images: ["/images/work/neon-combat.webp"],
    services: ["interactive-experiences", "interactive-websites"],
  },
  {
    slug: "space-rocks",
    title: "Space Rocks — neon Asteroids remix",
    repoUrl: `${GH}/Asteroids-game`,
    summary: "A modern take on the 1979 arcade classic in Python and pygame, with every sprite and sound generated in code.",
    challenge: "Rebuild a classic with modern game feel while keeping the codebase clean enough to extend.",
    approach:
      "A scene state machine, an object-oriented entity model with frame-rate-independent physics, procedurally generated 3D-looking sprites using numpy, a cached asset pipeline with user overrides, and synthesised audio that degrades gracefully.",
    outcome: "Three game modes, power-ups, a UFO enemy, difficulty scaling and high scores in a modular, readable codebase.",
    stack: ["Python", "pygame", "numpy"],
    images: ["/images/work/space-rocks.webp"],
    services: ["interactive-experiences"],
  },
  {
    slug: "parallel-computing",
    title: "Parallel search & concurrency",
    repoUrl: `${GH}/MonteCarloMini`,
    summary:
      "University of Cape Town coursework built on provided skeletons: a Monte Carlo minimisation parallelised with Java Fork/Join, and a multithreaded club simulation with coordinated pause/resume.",
    challenge: "Speed up a compute-heavy search on multi-core hardware, and coordinate dozens of threads without deadlock.",
    approach:
      "A divide-and-conquer Fork/Join task with a sequential cutoff and a parallel reduction for the search; for the simulation, a CountDownLatch start gate, guarded waits for pause/resume and non-blocking cell ownership to avoid circular waits.",
    outcome: "Up to a 3.12× measured speed-up over the serial version across two machines, with charted benchmarks and a written analysis of overheads.",
    stack: ["Java", "Fork/Join", "java.util.concurrent", "Swing"],
    images: ["/images/work/montecarlo-speedup-charts.webp", "/images/work/club-simulation.webp"],
    services: ["cloud-backends"],
  },
];
