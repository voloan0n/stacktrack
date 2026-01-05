export type TicketLike = {
  status?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  statusUpdatedAt?: string | null;
};

type StatusDeadlineMap = Record<string, number | null | undefined>;

// Business hours settings
const BUSINESS_START = 8;  // 8 AM
const BUSINESS_END = 17;   // 5 PM (17:00)
const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Return true if given date falls on a weekend.
 */
function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6; // Sunday=0, Saturday=6
}

/**
 * Move the date forward to the next business start time if it's outside business hours.
 */
function normalizeToBusinessHours(d: Date): Date {
  const out = new Date(d);

  // If weekend → advance to Monday 8AM
  if (isWeekend(out)) {
    const day = out.getDay();
    const diff = day === 6 ? 2 : 1; // Saturday→Monday, Sunday→Monday
    out.setDate(out.getDate() + diff);
    out.setHours(BUSINESS_START, 0, 0, 0);
    return out;
  }

  const hour = out.getHours();

  // Before business hours → jump to 8AM
  if (hour < BUSINESS_START) {
    out.setHours(BUSINESS_START, 0, 0, 0);
  }
  // After business hours → jump to next day 8AM
  else if (hour >= BUSINESS_END) {
    out.setDate(out.getDate() + 1);
    out.setHours(BUSINESS_START, 0, 0, 0);

    // If that day is weekend, push again
    return normalizeToBusinessHours(out);
  }

  return out;
}

/**
 * Add business hours to a given starting datetime.
 */
function addBusinessHours(start: Date, hours: number): Date {
  let current = normalizeToBusinessHours(start);
  let remaining = hours;

  while (remaining > 0) {
    // Hours left in current business day
    const endOfDay = new Date(current);
    endOfDay.setHours(BUSINESS_END, 0, 0, 0);

    const msUntilEnd = endOfDay.getTime() - current.getTime();
    const hoursAvailable = msUntilEnd / MS_PER_HOUR;

    if (remaining <= hoursAvailable) {
      // All remaining hours fit in the current business day
      return new Date(current.getTime() + remaining * MS_PER_HOUR);
    }

    // Consume the day and move to next business day
    remaining -= hoursAvailable;

    // Move to next day 8AM
    current = new Date(endOfDay);
    current.setDate(current.getDate() + 1);
    current = normalizeToBusinessHours(current);
  }

  return current;
}

/**
 * Compute business-hour deadlines:
 *  - "new": +4 business hours
 *  - "in progress": +72 business hours
 *  - others: null
 */
export function computeNextActionDue(
  ticket: TicketLike,
  statusDeadlines?: StatusDeadlineMap
): Date | null {
  if (!ticket) return null;

  const status = (ticket.status || "").toLowerCase();
  const referenceTs =
    ticket.statusUpdatedAt || ticket.updatedAt || ticket.createdAt;

  if (!referenceTs) return null;

  const reference = new Date(referenceTs);
  if (Number.isNaN(reference.getTime())) return null;

  let offsetHours: number | null = null;

  const normalizedStatus = status.replace(/\s+/g, "_");
  const configured = statusDeadlines?.[normalizedStatus];
  if (typeof configured === "number") {
    offsetHours = configured;
  } else {
    if (normalizedStatus === "new") offsetHours = 4;
    else if (normalizedStatus === "in_progress") offsetHours = 72;
    else offsetHours = null;
  }

  if (offsetHours === null) return null;

  return addBusinessHours(reference, offsetHours);
}
