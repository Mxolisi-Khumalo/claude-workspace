/**
 * Intrinsic sizes and descriptive alt text for images in /public/images.
 * Alt text describes what is visibly in each image.
 */
export interface MediaMeta {
  width: number;
  height: number;
  alt: string;
}

const MEDIA: Record<string, MediaMeta> = {
  "/images/work/desksign.webp": {
    width: 1600,
    height: 595,
    alt: "DeskSign's “Add your signature” dialog with a hand-drawn signature, next to name, initials, date and signature fields placed on a PDF page.",
  },
  "/images/work/desksign-certificate.webp": {
    width: 496,
    height: 702,
    alt: "A DeskSign certificate of completion listing the envelope ID, document, signer, completion time and a summary of completed fields.",
  },
  "/images/work/desksign-initials.webp": {
    width: 496,
    height: 702,
    alt: "A DeskSign document page with initials placed in a field.",
  },
  "/images/work/self-storage.webp": {
    width: 1280,
    height: 680,
    alt: "The Self-Storage Platform's “Explore storage units” screen: filters for town, size and status above unit cards in Cape Town, Johannesburg and Durban with availability and daily prices.",
  },
  "/images/work/montecarlo-speedup-charts.webp": {
    width: 470,
    height: 660,
    alt: "Two line charts of speed-up against grid size for the parallel Monte Carlo search, rising to 3.12× on a MacBook and about 1.94× on a UCT computer.",
  },
  "/images/work/club-simulation.webp": {
    width: 1275,
    height: 719,
    alt: "The multithreaded club simulation: a Java Swing grid of numbered patron threads around a dance floor and bar, beside a terminal logging each thread's actions.",
  },
  "/images/work/neon-combat.webp": {
    width: 1537,
    height: 874,
    alt: "Neon Combat: fighters Blaze and Frost face off in front of a neon city skyline under a “FIGHT!” banner, with health bars and a 99-second timer.",
  },
  "/images/work/space-rocks.webp": {
    width: 952,
    height: 705,
    alt: "Space Rocks: a shielded ship among drifting asteroids and planets on a starfield, with score, best score, wave number and lives on screen.",
  },
  "/images/about/mentoring-whiteboard.webp": {
    width: 1600,
    height: 900,
    alt: "A group session: students seated in a circle listen to a presenter standing beside a screen.",
  },
  "/images/about/pair-programming.webp": {
    width: 480,
    height: 640,
    alt: "A pair-programming session: a mentor stands beside a seated student and points at code on the student's screen.",
  },
};

export function media(src: string, fallbackAlt: string): MediaMeta {
  return MEDIA[src] ?? { width: 1600, height: 1000, alt: fallbackAlt };
}
