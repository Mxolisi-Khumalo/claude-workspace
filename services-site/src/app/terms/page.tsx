import type { Metadata } from "next";
import Link from "next/link";
import { profile } from "@/content";
import { LegalPage, type LegalSection } from "@/components/pages/legal/LegalPage";
import "@/components/pages/pages.css";

export const metadata: Metadata = {
  title: "Terms of service",
  description: `Terms of service and Electronic Communications and Transactions Act (ECTA) disclosures for ${profile.name}'s development services.`,
  alternates: { canonical: "/terms" },
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export default function TermsPage() {
  const email = profile.email;
  const mail = <a href={`mailto:${email}`}>{email}</a>;
  const host = siteUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const sections: LegalSection[] = [
    {
      id: "about",
      title: "Who I am (ECTA section 43)",
      body: (
        <>
          <p>
            These disclosures are made under section 43 of the Electronic Communications and Transactions Act, 2002
            (ECTA).
          </p>
          <div className="overflow-x-auto">
            <table>
              <tbody>
                <tr>
                  <th scope="row">Name</th>
                  <td>{profile.name}</td>
                </tr>
                <tr>
                  <th scope="row">Legal status</th>
                  <td>Sole proprietor (not a registered company)</td>
                </tr>
                <tr>
                  <th scope="row">Location</th>
                  <td>Johannesburg, Gauteng, South Africa</td>
                </tr>
                <tr>
                  <th scope="row">Email</th>
                  <td>{mail}</td>
                </tr>
                {host && (
                  <tr>
                    <th scope="row">Website</th>
                    <td>{host}</td>
                  </tr>
                )}
                <tr>
                  <th scope="row">Address for legal notices</th>
                  <td>A physical address for the service of legal documents is available on request by email.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ),
    },
    {
      id: "services",
      title: "The services",
      body: (
        <>
          <p>
            I provide software development and related services — interactive websites, web applications, cloud
            backends, document automation, AI assistants, interactive experiences and mentoring — as described on the{" "}
            <Link href="/services">service pages</Link>. The exact scope, deliverables and timeline for your project are
            set out in your written quote.
          </p>
          <p>
            Byte, the concierge on this site, is an AI assistant. It can explain services, estimate prices from my
            published packages, book calls and send documents, but it can&apos;t agree to anything outside these terms
            or your written quote.
          </p>
        </>
      ),
    },
    {
      id: "prices",
      title: "Prices and quotes",
      body: (
        <ul>
          <li>
            Prices shown on this site are <strong>“from” estimates</strong>. The price for your project is confirmed in a
            written quote before any work starts.
          </li>
          <li>
            A quote is <strong>valid for 14 days</strong> from the date it is issued. After that, prices and availability
            may change.
          </li>
          <li>Quotes are issued in South African rand (ZAR) or US dollars (USD) and state the total amount payable.</li>
          <li>Work outside the quoted scope is agreed and quoted separately before it is done.</li>
        </ul>
      ),
    },
    {
      id: "payment",
      title: "Deposits and payment",
      body: (
        <ul>
          <li>
            A <strong>deposit of 50%</strong> of the quoted total — or <strong>40%</strong> for larger projects (quotes
            above R60&nbsp;000 or US$3&nbsp;500) — secures your start date. The quote states which applies.
          </li>
          <li>
            Payments are made on a <strong>secure third-party payment page</strong> (Paystack). This site never sees or
            stores your card details.
          </li>
          <li>
            The balance is payable as set out in your quote (for example on delivery, or in milestones for larger
            projects). Invoices are due within 7 days unless the invoice says otherwise.
          </li>
          <li>Ongoing services, such as monthly retainers, run month to month and can be cancelled at any time.</li>
        </ul>
      ),
    },
    {
      id: "delivery",
      title: "Delivery and records",
      body: (
        <>
          <p>
            Timelines in your quote are estimates that depend on receiving content, feedback and access from you on time.
            I share progress regularly and agree any change to the timeline with you in writing.
          </p>
          <p>
            Quotes, invoices and booking confirmations are emailed to you so you can keep a copy, and are also available
            on request.
          </p>
        </>
      ),
    },
    {
      id: "cancellation",
      title: "Cancellation and cooling-off",
      body: (
        <>
          <p>
            Where section 44 of ECTA applies to an online purchase, you may cancel{" "}
            <strong>within 7 days</strong> without reason or penalty and receive a refund of what you paid. The cooling-off
            right does not apply once services have started with your agreement before the 7 days end.
          </p>
          <p>
            You can cancel a project at any other time by email. Work completed up to that point is charged at the quoted
            rate and deducted from the deposit, and any unused balance of the deposit is refunded. If the work completed
            exceeds the deposit, the difference is invoiced.
          </p>
        </>
      ),
    },
    {
      id: "ip",
      title: "Ownership of the work",
      body: (
        <ul>
          <li>
            <strong>You own the deliverable code on final payment</strong>, and the repository is transferred to your
            account.
          </li>
          <li>
            Open-source libraries and third-party services keep their own licences and terms. Reusable tools and know-how
            I had before the project remain mine, and you receive a licence to use them as part of the deliverable.
          </li>
          <li>
            I may show the work in my portfolio unless we agree otherwise in writing — for example, under a
            non-disclosure agreement.
          </li>
        </ul>
      ),
    },
    {
      id: "liability",
      title: "Liability",
      body: (
        <p>
          I work with reasonable care and skill. To the extent the law allows, my total liability for any claim connected
          with a project is limited to the fees you paid for that project, and I am not liable for indirect or
          consequential losses such as lost profits or data. Nothing in these terms limits rights you have under the
          Consumer Protection Act, 2008, where it applies.
        </p>
      ),
    },
    {
      id: "privacy",
      title: "Privacy and security",
      body: (
        <p>
          How I handle personal information is explained in the <Link href="/privacy">privacy notice</Link>. Payments are
          processed by a secure third-party provider, and anything that books, sends or charges is confirmed by you first.
        </p>
      ),
    },
    {
      id: "law",
      title: "Disputes and governing law",
      body: (
        <p>
          If something goes wrong, please email me first — most issues can be resolved quickly. These terms and any
          project agreement are governed by the laws of the Republic of South Africa, and South African courts have
          jurisdiction.
        </p>
      ),
    },
    {
      id: "changes",
      title: "Changes to these terms",
      body: (
        <p>
          I may update these terms from time to time. The version in force when you accept a quote applies to that
          project. Questions? Email {mail}.
        </p>
      ),
    },
  ];

  return (
    <LegalPage
      label="Terms"
      title="Terms of service"
      updated="October 2026"
      intro={
        <p>
          The terms that apply when you use this site or engage me for development services, including the disclosures
          required by South Africa&apos;s Electronic Communications and Transactions Act.
        </p>
      }
      notice={
        <strong className="font-semibold">Template — review with a legal adviser before relying on it.</strong>
      }
      sections={sections}
    />
  );
}
