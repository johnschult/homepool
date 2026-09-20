import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import DashboardPage from './DashboardPage'
import type { Action, Installation } from '../types'
import { translations } from '../i18n/translations'

let mockLocale: 'en' | 'fr' = 'fr'
vi.mock('../context/LocaleContext', () => ({
  useT: () => ({
    locale: mockLocale,
    setLocale: vi.fn(),
    t: (key: string) => (translations[mockLocale] as Record<string, string>)[key] ?? key,
  }),
}))

const mockUseInstallation = vi.fn()
vi.mock('../context/InstallationContext', () => ({
  useInstallation: () => mockUseInstallation(),
}))

function makeInstallation(overrides: Partial<Installation> = {}): Installation {
  return {
    id: 1,
    role: 'owner',
    name: 'Spa Marin',
    type: 'spa',
    sanitizer: 'chlorine',
    created_at: '2026-01-01T00:00:00',
    ...overrides,
  }
}

function setActiveInstallation(installation: Installation) {
  mockUseInstallation.mockReturnValue({ active: installation, ranges: null })
}

function makeMeasurement(overrides: Partial<Action> = {}): Action {
  return {
    id: 1,
    date: '2026-08-10',
    action_type: 'Measurement',
    user_id: 1,
    product_id: null,
    qty: '7.4',
    unit: '',
    notes: '',
    created_at: '2026-08-10T00:00:00',
    ...overrides,
  }
}

beforeEach(() => {
  mockLocale = 'fr'
  mockUseInstallation.mockReset()
  // Maintenance/recommendations fetches: resolve empty so their effects settle
  // without affecting the tile/card assertions below.
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => ({
    ok: true,
    json: async () => (String(input).endsWith('/recommendations') ? { recommendations: [] } : []),
  } as Response))
})

describe('DashboardPage — FROG @ease SmartChlor', () => {
  it('shows the SmartChlor card in "not checked" state and no chlorine tile when no strip check has been logged', async () => {
    setActiveInstallation(makeInstallation({ sanitizer: 'frog_smartchlor' }))
    const actions = [makeMeasurement({ notes: 'TAC: 100' })]
    render(<DashboardPage actions={actions} products={[]} />)

    // The Dashboard tile is the compact variant — it shows the short title
    // ("SmartChlor"), not the full "Cartouche SmartChlor" used on the wider
    // Measurements card.
    await waitFor(() => expect(screen.getByText(translations.fr.dash_smartchlor_title_short)).toBeInTheDocument())
    expect(screen.getByText(translations.fr.dash_not_checked)).toBeInTheDocument()
    expect(screen.queryByText(translations.fr.param_chlorine)).not.toBeInTheDocument()
  })

  it('shows OUT in danger styling with the last-checked date once a strip check is logged', async () => {
    setActiveInstallation(makeInstallation({ sanitizer: 'frog_smartchlor' }))
    const actions = [makeMeasurement({ smartchlor_status: 'out', notes: 'TAC: 100' })]
    render(<DashboardPage actions={actions} products={[]} />)

    // Renders twice: the SmartChlor tile itself, and the recent-activity
    // row's pill for the same entry.
    await waitFor(() => expect(screen.getAllByText(translations.fr.smartchlor_out).length).toBeGreaterThan(0))
  })

  it('never surfaces a stale chlorine tile even if old notes text mentions chlorine', async () => {
    setActiveInstallation(makeInstallation({ sanitizer: 'frog_smartchlor' }))
    const actions = [makeMeasurement({ notes: 'chlorine: 3. TAC: 100' })]
    render(<DashboardPage actions={actions} products={[]} />)

    // The Dashboard tile is the compact variant — it shows the short title
    // ("SmartChlor"), not the full "Cartouche SmartChlor" used on the wider
    // Measurements card.
    await waitFor(() => expect(screen.getByText(translations.fr.dash_smartchlor_title_short)).toBeInTheDocument())
    expect(screen.queryByText(translations.fr.param_chlorine)).not.toBeInTheDocument()
  })

  it('non-FROG installations render unchanged: a chlorine tile and no SmartChlor card', async () => {
    setActiveInstallation(makeInstallation({ sanitizer: 'chlorine' }))
    const actions = [makeMeasurement({ notes: 'chlorine: 3. TAC: 100' })]
    render(<DashboardPage actions={actions} products={[]} />)

    await waitFor(() => expect(screen.getByText(translations.fr.param_chlorine)).toBeInTheDocument())
    expect(screen.queryByText(translations.fr.dash_smartchlor_title)).not.toBeInTheDocument()
  })
})

describe('DashboardPage — recent history timestamps', () => {
  // 9:30pm Sep 20 in New York (the suite pins TZ) — already Sep 21 in UTC.
  const NOW = new Date(2026, 8, 20, 21, 30)

  beforeEach(() => {
    mockLocale = 'en'
    vi.useFakeTimers({ toFake: ['Date'], now: NOW })
    setActiveInstallation(makeInstallation())
  })
  afterEach(() => vi.useRealTimers())

  it('shows time-since instead of a raw date, with the full US date on hover', async () => {
    const tenMinutesAgo = new Date(NOW.getTime() - 10 * 60_000).toISOString().replace('Z', '')
    const actions = [makeMeasurement({ date: '2026-09-20', created_at: tenMinutesAgo })]
    render(<DashboardPage actions={actions} products={[]} />)

    const when = await screen.findByText('10 min. ago')
    expect(when.tagName).toBe('TIME')
    expect(when).toHaveAttribute('datetime', '2026-09-20')
    expect(when).toHaveAttribute('title', '09/20/2026')
  })

  it('formats the header date the US way', async () => {
    render(<DashboardPage actions={[]} products={[]} />)
    expect(await screen.findByText(/Sunday, September 20, 2026/)).toBeInTheDocument()
  })
})
