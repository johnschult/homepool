import { describe, it, expect } from 'vitest'
import {
  intlLocale,
  localDateString,
  parseTimestamp,
  formatShortDate,
  formatDate,
  formatDateLong,
  formatMonthYear,
  formatRelativeWhen,
} from './dates'

// 9:30pm on Sep 20 in New York — already Sep 21 in UTC.
const EVENING = new Date(2026, 8, 20, 21, 30)

/** How the API serializes Action.created_at: UTC wall-clock, no zone suffix. */
function apiTimestamp(d: Date): string {
  return d.toISOString().replace('Z', '')
}

describe('intlLocale', () => {
  it('maps English to the US locale and French to France', () => {
    expect(intlLocale('en')).toBe('en-US')
    expect(intlLocale('fr')).toBe('fr-FR')
  })
})

describe('localDateString', () => {
  it('uses the local calendar day, not the UTC one', () => {
    expect(localDateString(EVENING)).toBe('2026-09-20')
  })
})

describe('parseTimestamp', () => {
  it('reads a zone-less timestamp as UTC', () => {
    expect(parseTimestamp('2026-09-20T14:00:00').getTime()).toBe(Date.UTC(2026, 8, 20, 14))
    expect(parseTimestamp('2026-09-20T14:00:00.123456').getTime()).toBe(Date.UTC(2026, 8, 20, 14, 0, 0, 123))
  })

  it('honours an explicit zone', () => {
    expect(parseTimestamp('2026-09-20T14:00:00Z').getTime()).toBe(Date.UTC(2026, 8, 20, 14))
    expect(parseTimestamp('2026-09-20T16:00:00+02:00').getTime()).toBe(Date.UTC(2026, 8, 20, 14))
  })
})

describe('absolute date formats', () => {
  it('formats short dates month-first for English, day-first for French', () => {
    expect(formatShortDate('2026-09-20', 'en')).toBe('09/20')
    expect(formatShortDate('2026-09-20', 'fr')).toBe('20/09')
  })

  it('formats full dates with the year', () => {
    expect(formatDate('2026-09-20', 'en')).toBe('09/20/2026')
    expect(formatDate('2026-09-20', 'fr')).toBe('20/09/2026')
  })

  it('formats long dates, with an optional weekday', () => {
    const d = new Date(2026, 8, 20)
    expect(formatDateLong(d, 'en', { weekday: true })).toBe('Sunday, September 20, 2026')
    expect(formatDateLong(d, 'en')).toBe('September 20, 2026')
    expect(formatDateLong(d, 'fr', { weekday: true })).toBe('dimanche 20 septembre 2026')
  })

  it('formats a month heading', () => {
    expect(formatMonthYear('2026-09', 'en')).toBe('September 2026')
    expect(formatMonthYear('2026-09', 'fr')).toBe('septembre 2026')
  })
})

describe('formatRelativeWhen', () => {
  const now = EVENING
  const minutesAgo = (n: number) => apiTimestamp(new Date(now.getTime() - n * 60_000))

  it('shows minutes for an entry logged for today a few minutes ago', () => {
    const action = { date: '2026-09-20', created_at: minutesAgo(10) }
    expect(formatRelativeWhen(action, 'en', now)).toBe('10 min. ago')
    expect(formatRelativeWhen(action, 'fr', now)).toBe('il y a 10\u00a0min')
  })

  it('says "now" inside the first minute', () => {
    expect(formatRelativeWhen({ date: '2026-09-20', created_at: minutesAgo(0) }, 'en', now)).toBe('now')
  })

  it('shows hours once past an hour', () => {
    expect(formatRelativeWhen({ date: '2026-09-20', created_at: minutesAgo(180) }, 'en', now)).toBe('3 hr. ago')
  })

  it('does not claim minutes for an entry back-dated to an earlier day', () => {
    const action = { date: '2026-09-19', created_at: minutesAgo(5) }
    expect(formatRelativeWhen(action, 'en', now)).toBe('yesterday')
  })

  it('falls back to the day when created_at is unusable', () => {
    expect(formatRelativeWhen({ date: '2026-09-20', created_at: '' }, 'en', now)).toBe('today')
    expect(formatRelativeWhen({ date: '2026-09-20', created_at: 'garbage' }, 'en', now)).toBe('today')
  })

  it('counts days by the local calendar', () => {
    expect(formatRelativeWhen({ date: '2026-09-17', created_at: '2026-09-17T15:00:00' }, 'en', now)).toBe('3 days ago')
    expect(formatRelativeWhen({ date: '2026-09-17', created_at: '2026-09-17T15:00:00' }, 'fr', now)).toBe('il y a 3\u00a0j')
  })

  it('switches to a plain date after a week', () => {
    expect(formatRelativeWhen({ date: '2026-09-10', created_at: '2026-09-10T15:00:00' }, 'en', now)).toBe('09/10')
    expect(formatRelativeWhen({ date: '2026-09-10', created_at: '2026-09-10T15:00:00' }, 'fr', now)).toBe('10/09')
  })

  it('includes the year for a date outside the current year', () => {
    expect(formatRelativeWhen({ date: '2025-12-31', created_at: '2025-12-31T15:00:00' }, 'en', now)).toBe('12/31/2025')
  })
})
