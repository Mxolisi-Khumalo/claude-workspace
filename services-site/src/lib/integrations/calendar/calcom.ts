import "server-only";

import type { BookingRequest, CalendarProvider, Slot } from "../types";
import { IntegrationConfigError, asRecord, fetchJson } from "../env";

const BASE_URL = "https://api.cal.com/v2";
const SLOTS_API_VERSION = "2024-09-04";
const BOOKINGS_API_VERSION = "2024-08-13";
const MINUTE = 60_000;

const isUrl = (v: unknown): v is string => typeof v === "string" && /^https?:\/\//i.test(v);

function errorMessage(body: unknown) {
  const b = asRecord(body);
  const err = asRecord(b.error);
  return String(err.message ?? b.message ?? "unexpected response");
}

/**
 * Normalises a Cal.com slots payload into Slot[]. Accepts the date-keyed
 * object (`{ "2026-11-02": [...] }`), an older `{ slots: {...} }` wrapper or
 * a flat array; entries may be ISO strings, `{ start, end? }` or `{ time }`.
 */
export function normaliseCalSlots(data: unknown, lengthMinutes: number): Slot[] {
  const root = asRecord(data).slots ?? data;
  const items: unknown[] = Array.isArray(root)
    ? root
    : Object.values(asRecord(root)).flatMap((v) => (Array.isArray(v) ? v : []));
  const seen = new Set<string>();
  const slots: Slot[] = [];
  for (const item of items) {
    const rec = asRecord(item);
    const startRaw = typeof item === "string" ? item : (rec.start ?? rec.time);
    if (typeof startRaw !== "string") continue;
    const start = new Date(startRaw);
    if (Number.isNaN(start.getTime())) continue;
    const endRaw = typeof rec.end === "string" ? new Date(rec.end) : null;
    const end = endRaw && !Number.isNaN(endRaw.getTime()) ? endRaw : new Date(start.getTime() + lengthMinutes * MINUTE);
    const key = start.toISOString();
    if (seen.has(key)) continue;
    seen.add(key);
    slots.push({ start: key, end: end.toISOString() });
  }
  return slots.sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * Cal.com API v2. The owner's Google Calendar is connected inside Cal.com,
 * which handles availability, buffers, video links and invites.
 */
export class CalComCalendar implements CalendarProvider {
  readonly name = "calcom";

  constructor(
    private readonly apiKey: string,
    private readonly eventTypeId: number,
    private readonly lengthMinutes = 30,
  ) {
    if (!apiKey || !Number.isInteger(eventTypeId) || eventTypeId <= 0) {
      throw new IntegrationConfigError("CALCOM_API_KEY and a numeric CALCOM_EVENT_TYPE_ID are required for Cal.com.");
    }
  }

  private request(path: string, version: string, init: RequestInit = {}) {
    return fetchJson(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "cal-api-version": version,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  }

  async getAvailableSlots(fromIso: string, toIso: string, timezone: string): Promise<Slot[]> {
    const from = new Date(fromIso);
    const to = new Date(toIso);
    const params = new URLSearchParams({
      eventTypeId: String(this.eventTypeId),
      start: from.toISOString().slice(0, 10),
      end: to.toISOString().slice(0, 10),
      timeZone: timezone,
    });
    const res = await this.request(`/slots?${params}`, SLOTS_API_VERSION);
    if (!res.ok) throw new Error(`Cal.com slots failed (${res.status}): ${errorMessage(res.body)}`);
    return normaliseCalSlots(asRecord(res.body).data, this.lengthMinutes).filter(
      (s) => s.start >= from.toISOString() && s.start <= to.toISOString(),
    );
  }

  async book(req: BookingRequest) {
    const notes = req.notes?.trim();
    const res = await this.request("/bookings", BOOKINGS_API_VERSION, {
      method: "POST",
      body: JSON.stringify({
        start: new Date(req.start).toISOString(),
        eventTypeId: this.eventTypeId,
        attendee: { name: req.name, email: req.email, timeZone: req.timezone, language: "en" },
        ...(notes ? { bookingFieldsResponses: { notes } } : {}),
      }),
    });
    const data = asRecord(asRecord(res.body).data);
    if (!res.ok || typeof data.uid !== "string") {
      throw new Error(`Cal.com booking failed (${res.status}): ${errorMessage(res.body)}`);
    }
    const start = typeof data.start === "string" ? data.start : new Date(req.start).toISOString();
    const end =
      typeof data.end === "string" ? data.end : new Date(new Date(start).getTime() + this.lengthMinutes * MINUTE).toISOString();
    return {
      providerBookingId: data.uid,
      start,
      end,
      meetingUrl: isUrl(data.meetingUrl) ? data.meetingUrl : isUrl(data.location) ? data.location : undefined,
    };
  }
}
