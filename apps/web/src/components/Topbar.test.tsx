import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Topbar from './Topbar'
import { translations } from '../i18n/translations'
import type { User } from '../types'

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

const user: User = {
  id: 1,
  email: 'admin@example.com',
  first_name: 'Alec',
  is_admin: false,
  created_at: '2026-01-01T00:00:00',
}

function renderTopbar(props: Partial<React.ComponentProps<typeof Topbar>> = {}) {
  render(
    <Topbar
      onLogout={vi.fn()}
      onProfile={vi.fn()}
      page="log"
      onNavigate={vi.fn()}
      user={user}
      {...props}
    />
  )
}

beforeEach(() => {
  mockUseInstallation.mockReturnValue({
    active: null,
    ranges: null,
    installations: [],
    setActive: vi.fn(),
    refresh: vi.fn(),
    addInstallation: vi.fn(),
  })
})

const activeInstallation = {
  id: 1,
  role: 'owner' as const,
  owner_name: null,
  name: 'Marin spa',
  type: 'spa' as const,
  sanitizer: 'chlorine' as const,
  created_at: '2026-01-01T00:00:00',
}

describe('Topbar — delete installation', () => {
  it('opens a styled confirm dialog instead of a native window.confirm', () => {
    const deleteInstallation = vi.fn()
    mockUseInstallation.mockReturnValue({
      active: activeInstallation, ranges: null, installations: [activeInstallation],
      isOwner: true, setActive: vi.fn(), refresh: vi.fn(), addInstallation: vi.fn(), deleteInstallation,
    })
    const confirmSpy = vi.spyOn(window, 'confirm')
    renderTopbar({ onEditInstallation: vi.fn() })

    fireEvent.click(screen.getByLabelText(translations.fr.installation_delete))

    expect(confirmSpy).not.toHaveBeenCalled()
    expect(screen.getByText(
      translations.fr.installation_confirm_delete.replace('{name}', activeInstallation.name)
    )).toBeInTheDocument()
    expect(deleteInstallation).not.toHaveBeenCalled()
  })

  it('cancel closes the dialog without deleting', () => {
    const deleteInstallation = vi.fn()
    mockUseInstallation.mockReturnValue({
      active: activeInstallation, ranges: null, installations: [activeInstallation],
      isOwner: true, setActive: vi.fn(), refresh: vi.fn(), addInstallation: vi.fn(), deleteInstallation,
    })
    renderTopbar({ onEditInstallation: vi.fn() })

    fireEvent.click(screen.getByLabelText(translations.fr.installation_delete))
    fireEvent.click(screen.getByText(translations.fr.modal_cancel))

    expect(deleteInstallation).not.toHaveBeenCalled()
    expect(screen.queryByText(
      translations.fr.installation_confirm_delete.replace('{name}', activeInstallation.name)
    )).not.toBeInTheDocument()
  })

  it('confirming calls deleteInstallation', async () => {
    const deleteInstallation = vi.fn().mockResolvedValue(undefined)
    mockUseInstallation.mockReturnValue({
      active: activeInstallation, ranges: null, installations: [activeInstallation],
      isOwner: true, setActive: vi.fn(), refresh: vi.fn(), addInstallation: vi.fn(), deleteInstallation,
    })
    renderTopbar({ onEditInstallation: vi.fn() })

    fireEvent.click(screen.getByLabelText(translations.fr.installation_delete))
    fireEvent.click(screen.getByText(translations.fr.modal_delete))

    expect(deleteInstallation).toHaveBeenCalledWith(activeInstallation.id)
  })
})

describe('Topbar sidebar', () => {
  it('puts logging an entry at the top of the nav, not just on the dashboard', () => {
    const onAdd = vi.fn()
    renderTopbar({ onAdd })

    const button = screen.getByText(translations.fr.nav_new_entry)
    fireEvent.click(button)
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it('omits the add button for someone with nothing to log', () => {
    // App passes onAdd only when the current role can write; a viewer gets none.
    renderTopbar({ onAdd: undefined })

    expect(screen.queryByText(translations.fr.nav_new_entry)).not.toBeInTheDocument()
    // The rest of the nav still renders.
    expect(screen.getByText(translations.fr.nav_measurements)).toBeInTheDocument()
  })
})
