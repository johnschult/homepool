import type { Locale } from './i18n/translations'

/** Action.date is a bare calendar day ("2026-09-20") with no zone — it means
 * "that day on the viewer's wall calendar". Everything here parses and formats
 * it in local time, never UTC, so a US evening isn't rendered as tomorrow. */

/** The BCP 47 tag Intl needs. English is US-formatted (MM/DD/YYYY); French keeps
 * the day-first convention its readers expect. */
export function intlLocale(locale: Locale): string {
  return locale === 'fr' ? 'fr-FR' : 'en-US'
}

/** "YYYY-MM-DD" for the viewer's current local day. `toISOString()` would give
 * the UTC day, which is already tomorrow for a US evening. */
export function localDateString(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Local midnight of a "YYYY-MM-DD" day. */
export function parseDay(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Whole calendar days from `dateStr` to `now` in the viewer's calendar
 * (positive = past). Compares UTC-normalized calendar fields, so DST shifts
 * can't make a day 23 or 25 hours long. */
export function calendarDaysSince(dateStr: string, now: Date = new Date()): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  const then = Date.UTC(y, m - 1, d)
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((today - then) / 86_400_000)
}

/** The API serializes Action.created_at as UTC wall-clock with no zone suffix.
 * JS would read that as *local* time, so a missing zone is taken as UTC. */
export function parseTimestamp(value: string): Date {
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
  return new Date(hasZone ? value : `${value}Z`)
}

/** "09/20" (en) / "20/09" (fr). */
export function formatShortDate(dateStr: string, locale: Locale): string {
  return parseDay(dateStr).toLocaleDateString(intlLocale(locale), { month: '2-digit', day: '2-digit' })
}

/** "09/20/2026" (en) / "20/09/2026" (fr). */
export function formatDate(dateStr: string, locale: Locale): string {
  return parseDay(dateStr).toLocaleDateString(intlLocale(locale), { month: '2-digit', day: '2-digit', year: 'numeric' })
}

/** "Sunday, September 20, 2026" / "September 20, 2026" (en). */
export function formatDateLong(date: Date, locale: Locale, opts: { weekday?: boolean } = {}): string {
  return date.toLocaleDateString(intlLocale(locale), {
    ...(opts.weekday ? { weekday: 'long' as const } : {}),
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

/** "September 2026" for a "YYYY-MM" key. */
export function formatMonthYear(yearMonth: string, locale: Locale): string {
  const [y, m] = yearMonth.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(intlLocale(locale), { month: 'long', year: 'numeric' })
}

// Past this many days a relative label stops being useful ("23 days ago"
// makes you do arithmetic) and the calendar date reads faster.
const RELATIVE_WINDOW_DAYS = 7

/**
 * How long ago an entry happened, for lists where recency is the point.
 *
 * `date` only has day resolution, so minutes/hours come from `created_at` —
 * but only when the entry was logged for the day it was created. A back-dated
 * entry ("I forgot to log yesterday's test") would otherwise read "5 min. ago".
 */
export function formatRelativeWhen(
  action: { date: string; created_at: string },
  locale: Locale,
  now: Date = new Date(),
): string {
  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: 'auto', style: 'short' })

  const created = parseTimestamp(action.created_at)
  if (!Number.isNaN(created.getTime()) && localDateString(created) === action.date) {
    const seconds = Math.max(0, Math.floor((now.getTime() - created.getTime()) / 1000))
    if (seconds < 60) return rtf.format(0, 'second')
    if (seconds < 3600) return rtf.format(-Math.floor(seconds / 60), 'minute')
    if (seconds < 86_400) return rtf.format(-Math.floor(seconds / 3600), 'hour')
  }

  const days = calendarDaysSince(action.date, now)
  if (Math.abs(days) <= RELATIVE_WINDOW_DAYS) return rtf.format(-days, 'day')
  return action.date.slice(0, 4) === String(now.getFullYear())
    ? formatShortDate(action.date, locale)
    : formatDate(action.date, locale)
}
