import "server-only";

import type { EmailMessage, EmailProvider } from "../types";
import type { AppStore } from "../store/shared";
import { maskEmail } from "../env";

/** Demo email: nothing is delivered; messages land in the store's outbox (/demo/outbox). */
export class MockEmail implements EmailProvider {
  readonly name = "mock";

  constructor(private readonly store: () => AppStore) {}

  async send(msg: EmailMessage): Promise<{ id: string }> {
    const id = `out_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const to = Array.isArray(msg.to) ? msg.to : [msg.to];
    const attachments = (msg.attachments ?? []).map((a) => a.filename);
    await this.store().saveOutboxEntry({
      id,
      createdAt: new Date().toISOString(),
      to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      attachments,
    });
    console.info(
      `[email:mock] ${id} to=${to.map(maskEmail).join(",")} subject=${JSON.stringify(msg.subject)} attachments=${attachments.length}`,
    );
    return { id };
  }
}
