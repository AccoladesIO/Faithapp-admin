/**
 * SLOT TIME STANDARD
 * ─────────────────────────────────────────────────────────────────────────────
 * Slot startTime / endTime are stored as genuine UTC ISO strings.
 * The admin enters local time (e.g. 7:00 WAT) and the client converts it
 * to UTC before sending (7:00 WAT → 06:00Z). The server stores and enforces
 * windows in UTC.
 *
 * For DISPLAY:  new Date(iso).toLocaleTimeString() converts UTC → device local
 *               automatically. 06:00Z → "7:00 am" in WAT. No manual offset.
 *
 * For MATH:     new Date(iso).getTime() → real UTC ms. Matches server exactly.
 *
 * Do NOT strip Z or apply manual offsets anywhere on slot times.
 * createdAt / updatedAt / checkinTime are also genuine UTC — same treatment.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** UTC ms for window open/close arithmetic */
export function parseSlotMs(iso: string): number {
    return new Date(iso).getTime();
}

/** Display a single slot time in device local timezone */
export function formatLocalTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("en-GB", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

/** Display a start–end slot time range in device local timezone */
export function formatLocalSlotTime(isoStart: string, isoEnd: string): string {
    return `${formatLocalTime(isoStart)} – ${formatLocalTime(isoEnd)}`;
}

/**
 * For the admin datetime-local input:
 * Browser gives "YYYY-MM-DDTHH:mm" in local time.
 * new Date() parses it as local, toISOString() emits UTC.
 * Admin in WAT types 07:00 → sent as "...T06:00:00.000Z" ✅
 */
export function toPayloadDateTime(localValue: string): string {
    return new Date(localValue).toISOString();
}

/**
 * For pre-populating the admin datetime-local input on edit:
 * Converts stored UTC ISO back to local "YYYY-MM-DDTHH:mm".
 * "...T06:00:00.000Z" → "...T07:00" in WAT ✅
 */
export function toInputDateTime(iso: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    const offsetMs = d.getTimezoneOffset() * 60 * 1000;
    return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}