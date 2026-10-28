import type { Metadata } from "next";
import Link from "next/link";
import { profile } from "@/content";
import { LegalPage, type LegalSection } from "@/components/pages/legal/LegalPage";
import "@/components/pages/pages.css";

export const metadata: Metadata = {
  title: "Privacy notice (POPIA)",
  description: `How ${profile.name} collects, uses and protects personal information on this website, in line with South Africa's Protection of Personal Information Act (POPIA).`,
  alternates: { canonical: "/privacy" },
};

const REGULATOR_SITE = "https://inforegulator.org.za";
const REGULATOR_EMAIL = "complaints.IR@inforegulator.org.za";

export default function PrivacyPage() {
  const email = profile.email;
  const mail = <a href={`mailto:${email}`}>{email}</a>;

  const sections: LegalSection[] = [
    {
      id: "who",
      title: "Who is responsible",
      body: (
        <>
          <p>
            This website is run by <strong>{profile.name}</strong>, a sole proprietor based in Johannesburg, Gauteng,
            South Africa. I am the <strong>responsible party</strong> for the personal information described here and,
            as a sole proprietor, also the <strong>Information Officer</strong> under the Protection of Personal
            Information Act, 2013 (POPIA).
          </p>
          <p>Contact me about anything in this notice at {mail}.</p>
        </>
      ),
    },
    {
      id: "collect",
      title: "What I collect",
      body: (
        <>
          <p>I only collect what I need to respond to your enquiry and, if you go ahead, to deliver the work.</p>
          <ul>
            <li>
              <strong>Chat messages.</strong> What you type to Byte, the AI concierge, its replies, and a short summary of
              your project needs (for example the services you&apos;re interested in, budget and timeline if you share
              them).
            </li>
            <li>
              <strong>Contact details.</strong> Your name, email address and company, and your phone number if you choose
              to give it — only when you ask for a quote by email, a call booking or an invoice. Your email address is
              confirmed with a one-time code before anything is sent to it.
            </li>
            <li>
              <strong>Bookings.</strong> The date, time and time zone of any call you book, and the meeting link.
            </li>
            <li>
              <strong>Quotes and invoices.</strong> The services and packages quoted, amounts and currency, deposit
              terms, and payment references and status.
            </li>
            <li>
              <strong>Technical information.</strong> To prevent abuse, the chat derives a one-way hash of your IP
              address to limit how many messages can be sent in a short time. My hosting provider keeps standard server
              logs.
            </li>
          </ul>
          <p>
            Please don&apos;t share special personal information (such as health or financial account details) or
            information about children in the chat — it isn&apos;t needed to scope a project.
          </p>
        </>
      ),
    },
    {
      id: "why",
      title: "Why I use it",
      body: (
        <ul>
          <li>To respond to your enquiry and answer questions about my services.</li>
          <li>To prepare and send quotes, and schedule calls you ask for.</li>
          <li>To issue invoices, take deposits and payments, and keep accounting records.</li>
          <li>To follow up with you about your enquiry or project.</li>
          <li>To keep the site and chat secure and prevent misuse.</li>
        </ul>
      ),
    },
    {
      id: "basis",
      title: "Lawful basis",
      body: (
        <>
          <p>Under section 11 of POPIA I rely on:</p>
          <ul>
            <li>
              <strong>Steps towards a contract you requested</strong> — preparing a quote, booking a call or invoicing a
              deposit because you asked me to.
            </li>
            <li>
              <strong>Your consent</strong> — you accept this notice before chatting and confirm consent when you share
              your contact details. You can withdraw consent at any time; this won&apos;t affect processing that has
              already happened lawfully.
            </li>
            <li>
              <strong>Legal obligations</strong> — keeping tax and accounting records once work is quoted or invoiced.
            </li>
          </ul>
          <p>
            Byte is an AI assistant, not me. It doesn&apos;t make decisions about you that have legal or similarly
            significant effects: prices come from my published packages, and nothing is booked, emailed or charged until
            you confirm it.
          </p>
        </>
      ),
    },
    {
      id: "operators",
      title: "Service providers (operators)",
      body: (
        <>
          <p>
            I use a small number of trusted providers who process information on my behalf, under agreements that require
            them to keep it secure and use it only to provide their service:
          </p>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th scope="col">Provider</th>
                  <th scope="col">What it does</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Anthropic</td>
                  <td>Provides the AI model (Claude) that generates the concierge&apos;s replies to your messages.</td>
                </tr>
                <tr>
                  <td>Vercel</td>
                  <td>Hosts this website and its server functions.</td>
                </tr>
                <tr>
                  <td>Database provider</td>
                  <td>Stores conversations, enquiries, quotes, bookings and invoice records.</td>
                </tr>
                <tr>
                  <td>Resend</td>
                  <td>Sends email: verification codes, quotes, booking confirmations and invoices.</td>
                </tr>
                <tr>
                  <td>Cal.com</td>
                  <td>Manages my calendar availability and the calls you book.</td>
                </tr>
                <tr>
                  <td>Paystack</td>
                  <td>Processes payments on its own secure payment page.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            <strong>This site never sees or stores your card details</strong> — payments are made directly on
            Paystack&apos;s secure page, and I receive only confirmation of the payment, such as its amount, reference and
            status.
          </p>
        </>
      ),
    },
    {
      id: "transfers",
      title: "Transfers outside South Africa",
      body: (
        <p>
          Some of these providers store or process information outside South Africa (for example in the United States).
          In line with section 72 of POPIA, I only transfer personal information where the recipient is bound by law,
          binding corporate rules or a contract that provides an adequate level of protection, or where the transfer is
          necessary for the steps you asked me to take, or you have consented to it.
        </p>
      ),
    },
    {
      id: "storage",
      title: "Cookies and local storage",
      body: (
        <>
          <p>This site doesn&apos;t set advertising or tracking cookies.</p>
          <ul>
            <li>
              The chat keeps a <strong>session ID and a copy of your recent conversation</strong> in your browser&apos;s
              local storage, so refreshing the page doesn&apos;t lose it. Clearing this site&apos;s data in your browser
              removes it.
            </li>
            <li>
              Session storage remembers that you&apos;ve already seen the intro animation; it&apos;s cleared when you
              close the tab.
            </li>
          </ul>
          <p>Payment and scheduling pages run by Paystack and Cal.com use their own cookies under their own policies.</p>
        </>
      ),
    },
    {
      id: "retention",
      title: "How long I keep it",
      body: (
        <ul>
          <li>
            <strong>Enquiries that don&apos;t go ahead</strong> — conversations and contact details are deleted 12 months
            after our last contact.
          </li>
          <li>
            <strong>Quotes, invoices and related records</strong> — kept for 5 years, as required for tax purposes.
          </li>
          <li>You can ask me to delete information sooner where the law allows (see “Your rights”).</li>
        </ul>
      ),
    },
    {
      id: "security",
      title: "Keeping it secure",
      body: (
        <p>
          I take reasonable technical and organisational measures to protect your information, including encrypted
          connections (HTTPS), restricted access to records, email verification before documents are sent, and
          confirm-before-acting for bookings, emails and payments. If a security compromise affects your information, I
          will notify you and the Information Regulator as POPIA requires.
        </p>
      ),
    },
    {
      id: "marketing",
      title: "Marketing",
      body: (
        <p>
          I won&apos;t send you marketing emails unless you opt in, and every marketing email will let you unsubscribe.
          Messages about your own enquiry, quote, booking or invoice aren&apos;t marketing.
        </p>
      ),
    },
    {
      id: "rights",
      title: "Your rights",
      body: (
        <>
          <p>Under POPIA you can:</p>
          <ul>
            <li>ask whether I hold personal information about you and request a copy of it (access);</li>
            <li>ask me to correct or update it (correction);</li>
            <li>ask me to delete or destroy it (deletion), subject to records I must keep by law;</li>
            <li>object to processing, and withdraw consent where I rely on it (objection);</li>
            <li>
              complain to the <strong>Information Regulator</strong> —{" "}
              <a href={REGULATOR_SITE} target="_blank" rel="noreferrer">
                inforegulator.org.za
              </a>
              , <a href={`mailto:${REGULATOR_EMAIL}`}>{REGULATOR_EMAIL}</a>.
            </li>
          </ul>
          <p>
            To exercise a right, email {mail}. I may need to confirm your identity first, and will respond within a
            reasonable time.
          </p>
        </>
      ),
    },
    {
      id: "changes",
      title: "Changes to this notice",
      body: (
        <p>
          I review this notice annually and when the way I handle information changes. The date at the top shows the
          latest update. See also the <Link href="/terms">terms of service</Link>.
        </p>
      ),
    },
  ];

  return (
    <LegalPage
      label="Privacy"
      title="Privacy notice"
      updated="October 2026"
      intro={
        <p>
          How I collect, use and protect personal information when you use this website and its AI concierge — written to
          follow South Africa&apos;s Protection of Personal Information Act (POPIA), in plain language.
        </p>
      }
      notice={
        <>
          <strong className="font-semibold">Template — review with a legal adviser before relying on it.</strong> Reviewed
          annually.
        </>
      }
      sections={sections}
    />
  );
}
