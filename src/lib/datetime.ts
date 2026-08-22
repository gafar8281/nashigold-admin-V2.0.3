export const RIYADH_TZ = "Asia/Riyadh"

const todayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: RIYADH_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

const calendarDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "numeric",
})

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: RIYADH_TZ,
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

/** Today's date in Saudi Arabia local time, as YYYY-MM-DD. */
export function getRiyadhTodayISO(): string {
  return todayFormatter.format(new Date())
}

/**
 * Formats a plain YYYY-MM-DD calendar-day string for display without ever
 * shifting the day due to the browser's own local timezone offset.
 */
export function formatCalendarDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number)
  if (!year || !month || !day) return dateStr
  return calendarDateFormatter.format(new Date(Date.UTC(year, month - 1, day)))
}

/** Coerces a Firestore Timestamp, Date, string, or number to a JS Date, or undefined if unusable. */
function toDate(value: unknown): Date | undefined {
  if (!value) return undefined
  if (value instanceof Date) return value
  if (typeof value === "number") return new Date(value)
  if (typeof value === "string") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate() as Date
  }
  return undefined
}

/** Converts a Firestore Timestamp/Date/string to the Saudi Arabia local calendar day, as YYYY-MM-DD. */
export function toRiyadhDateISO(value: unknown): string {
  const date = toDate(value)
  if (!date) return ""
  return todayFormatter.format(date)
}

/** Converts a Firestore Timestamp/Date/string/number to epoch millis, or undefined if unusable. */
export function toEpochMs(value: unknown): number | undefined {
  return toDate(value)?.getTime()
}

/** Formats an epoch millis value as Saudi Arabia local date and time, e.g. "12 Aug 2026, 3:42 PM". */
export function formatRiyadhDateTime(ms: number): string {
  return dateTimeFormatter.format(new Date(ms))
}

/** Formats a YYYY-MM-DD date range for display, collapsing to a single date when start === end. */
export function formatDateRange(startISO: string, endISO: string): string {
  if (startISO === endISO) return formatCalendarDate(startISO)
  return `${formatCalendarDate(startISO)} – ${formatCalendarDate(endISO)}`
}

/** Inclusive day count between two YYYY-MM-DD calendar days. */
export function countLeaveDays(startISO: string, endISO: string): number {
  const [sy, sm, sd] = startISO.split("-").map(Number)
  const [ey, em, ed] = endISO.split("-").map(Number)
  if (!sy || !sm || !sd || !ey || !em || !ed) return 0
  const start = Date.UTC(sy, sm - 1, sd)
  const end = Date.UTC(ey, em - 1, ed)
  return Math.round((end - start) / 86_400_000) + 1
}
