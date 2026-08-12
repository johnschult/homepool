import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import HistoryPage from './HistoryPage'
import type { Action, Installation } from '../types'
import { translations } from '../i18n/translations'

vi.mock('../context/LocaleContext', () => ({
  useT: () => ({
    locale: 'fr',
    setLocale: vi.fn(),
    t: (key: string) => (translations.fr as Record<string, string>)[key] ?? key,
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
  mockUseInstallation.mockReset()
  // The treatment catalog fetch: resolve empty so the effect settles without
  // affecting the entry-list assertions below.
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => [] } as Response)
})

describe('HistoryPage — FROG @ease SmartChlor', () => {
  it('renders readable SmartChlor status text instead of a chlorine pill', async () => {
    setActiveInstallation(makeInstallation({ sanitizer: 'frog_smartchlor' }))
    const actions = [makeMeasurement({ smartchlor_status: 'ok', notes: 'TAC: 100' })]
    render(<HistoryPage actions={actions} products={[]} />)

    await waitFor(() => expect(screen.getByText(translations.fr.history_smartchlor_ok)).toBeInTheDocument())
    expect(screen.queryByText(/^Cl /)).not.toBeInTheDocument()
  })

  it('renders the OUT status text for a cartridge that needs replacing', async () => {
    setActiveInstallation(makeInstallation({ sanitizer: 'frog_smartchlor' }))
    const actions = [makeMeasurement({ smartchlor_status: 'out' })]
    render(<HistoryPage actions={actions} products={[]} />)

    await waitFor(() => expect(screen.getByText(translations.fr.history_smartchlor_out)).toBeInTheDocument())
  })

  it('never shows a chlorine pill for a FROG entry, even if old notes text mentions chlorine', async () => {
    setActiveInstallation(makeInstallation({ sanitizer: 'frog_smartchlor' }))
    const actions = [makeMeasurement({ notes: 'chlorine: 3. TAC: 100' })]
    render(<HistoryPage actions={actions} products={[]} />)

    await waitFor(() => expect(screen.getByText(/TAC/)).toBeInTheDocument())
    expect(screen.queryByText(/^Cl /)).not.toBeInTheDocument()
  })

  it('non-FROG installations keep showing a chlorine pill, unchanged', async () => {
    setActiveInstallation(makeInstallation({ sanitizer: 'chlorine' }))
    const actions = [makeMeasurement({ notes: 'chlorine: 3. TAC: 100' })]
    render(<HistoryPage actions={actions} products={[]} />)

    await waitFor(() => expect(screen.getByText(/^Cl /)).toBeInTheDocument())
  })
})
