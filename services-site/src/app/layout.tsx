import type { Metadata, Viewport } from "next";
import { Hubot_Sans, JetBrains_Mono, Mona_Sans } from "next/font/google";
import { ImmersiveBackground } from "@/components/background/ImmersiveBackground";
import { Cursor } from "@/components/cursor/Cursor";
import { Footer } from "@/components/layout/Footer";
import { Nav } from "@/components/layout/Nav";
import { Preloader } from "@/components/layout/Preloader";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { ConciergeDock } from "@/components/concierge/ConciergeDock";
import { profile } from "@/content";
import "./globals.css";

const mona = Mona_Sans({ variable: "--font-mona", subsets: ["latin"], display: "swap", axes: ["wdth"] });
const hubot = Hubot_Sans({ variable: "--font-hubot", subsets: ["latin"], display: "swap", axes: ["wdth"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${profile.name} — Full-stack development services`,
    template: `%s · ${profile.name}`,
  },
  description: profile.subhead,
  openGraph: {
    type: "website",
    title: `${profile.name} — Full-stack development services`,
    description: profile.subhead,
    siteName: `${profile.shortName}.dev`,
  },
};

export const viewport: Viewport = {
  themeColor: "#07080b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${mona.variable} ${hubot.variable} ${jetbrains.variable} antialiased`}
    >
      <body className="min-h-dvh">
        {/* Hide the intro before first paint on repeat views (see Preloader). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(sessionStorage.getItem("mk-preloaded")==="1")document.documentElement.dataset.preloaded=""}catch(e){}`,
          }}
        />
        <Preloader />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
        >
          Skip to content
        </a>
        <ImmersiveBackground />
        <SmoothScroll>
          <Nav />
          <main id="main">{children}</main>
          <Footer />
        </SmoothScroll>
        <ConciergeDock />
        <Cursor />
      </body>
    </html>
  );
}
