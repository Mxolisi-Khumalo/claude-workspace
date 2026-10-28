import "server-only";

import { createHash } from "node:crypto";
import type { BookingRequest, CalendarProvider, Slot } from "../types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
/** South Africa Standard Time is UTC+2 all year (no DST). */
const SAST_OFFSET = 2 * HOUR;
const FIRST_HOUR = 9;
const LAST_HOUR = 16;
const BUSINESS_DAYS = 5;
const MIN_NOTICE = 2 * HOUR;
const LENGTH = 30 * MINUTE;

/**
 * Deterministic demo calendar: 30-minute slots on the hour, 09:00–16:00 SAST,
 * over the next five business days, at least two hours out. A slot is "busy"
 * when (day-of-month + hour) is divisible by 3, so the grid looks realistic.
 */
export class MockCalendar implements CalendarProvider {
  readonly name = "mock";

  async getAvailableSlots(fromIso: string, toIso: string): Promise<Slot[]> {
    const earliest = Math.max(Date.now() + MIN_NOTICE, Date.parse(fromIso) || 0);
    const latest = Date.parse(toIso) || Number.POSITIVE_INFINITY;
    const slots: Slot[] = [];
    // Walk SAST calendar days: shifting by the offset lets UTC getters read SAST fields.
    let day = Math.floor((earliest + SAST_OFFSET) / DAY) * DAY;
    for (let businessDays = 0, guard = 0; businessDays < BUSINESS_DAYS && guard < 21; guard++, day += DAY) {
      const d = new Date(day);
      if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
      let open = false;
      for (let hour = FIRST_HOUR; hour <= LAST_HOUR; hour++) {
        const start = day + hour * HOUR - SAST_OFFSET;
        if (start < earliest) continue;
        open = true;
        if ((d.getUTCDate() + hour) % 3 === 0 || start > latest) continue;
        slots.push({ start: new Date(start).toISOString(), end: new Date(start + LENGTH).toISOString() });
      }
      if (open) businessDays++;
    }
    return slots;
  }

  async book(req: BookingRequest) {
    const start = new Date(req.start);
    if (Number.isNaN(start.getTime())) throw new Error("Invalid booking start time.");
    const id = `mock_${createHash("sha256").update(`${start.toISOString()}|${req.email.toLowerCase()}`).digest("hex").slice(0, 10)}`;
    return {
      providerBookingId: id,
      start: start.toISOString(),
      end: new Date(start.getTime() + LENGTH).toISOString(),
      meetingUrl: `https://meet.example.com/${id}`,
    };
  }
}
