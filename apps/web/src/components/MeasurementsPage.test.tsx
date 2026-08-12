import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import MeasurementsPage from './MeasurementsPage'
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
})

describe('MeasurementsPage — FROG @ease SmartChlor', () => {
  it('replaces the chlorine chart and table column with a SmartChlor summary', () => {
    setActiveInstallation(makeInstallation({ sanitizer: 'frog_smartchlor' }))
    const actions = [makeMeasurement({ smartchlor_status: 'ok', notes: 'TAC: 100' })]
    render(<MeasurementsPage actions={actions} />)

    expect(screen.getAllByText(translations.fr.dash_smartchlor_title).length).toBeGreaterThan(0)
    expect(screen.queryByText(translations.fr.graph_chlorine_trend)).not.toBeInTheDocument()
  })

  it('shows no chlorine pill/value even when underlying notes contain stale pre-switch chlorine text', () => {
    setActiveInstallation(makeInstallation({ sanitizer: 'frog_smartchlor' }))
    const actions = [makeMeasurement({ notes: 'chlorine: 3. TAC: 100' })]
    render(<MeasurementsPage actions={actions} />)

    expect(screen.queryByText(/3\.0 mg\/L/)).not.toBeInTheDocument()
  })

  it('non-FROG installations keep the chlorine chart and column, unchanged', () => {
    setActiveInstallation(makeInstallation({ sanitizer: 'chlorine' }))
    const actions = [makeMeasurement({ notes: 'chlorine: 3. TAC: 100' })]
    render(<MeasurementsPage actions={actions} />)

    expect(screen.getByText(translations.fr.graph_chlorine_trend)).toBeInTheDocument()
    expect(screen.queryByText(translations.fr.dash_smartchlor_title)).not.toBeInTheDocument()
  })
})
