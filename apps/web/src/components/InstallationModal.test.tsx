import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import InstallationModal from './InstallationModal'
import { translations } from '../i18n/translations'

vi.mock('../context/LocaleContext', () => ({
  useT: () => ({
    locale: 'fr',
    setLocale: vi.fn(),
    t: (key: string) => (translations.fr as Record<string, string>)[key] ?? key,
  }),
}))

const mockAddInstallation = vi.fn()
vi.mock('../context/InstallationContext', () => ({
  useInstallation: () => ({
    installations: [],
    active: null,
    ranges: null,
    isOwner: true,
    canEdit: true,
    setActive: vi.fn(),
    refresh: vi.fn(),
    addInstallation: mockAddInstallation,
    leaveInstallation: vi.fn(),
  }),
}))

beforeEach(() => {
  mockAddInstallation.mockReset()
  mockAddInstallation.mockResolvedValue({ id: 1 })
})

describe('InstallationModal', () => {
  it('submits with volume and unit when provided', async () => {
    render(<InstallationModal open onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Ma piscine' } })
    fireEvent.change(screen.getByPlaceholderText('45000'), { target: { value: '45000' } })
    fireEvent.click(screen.getByText('gal'))
    fireEvent.click(screen.getByText("Créer l'installation"))

    await waitFor(() => expect(mockAddInstallation).toHaveBeenCalledTimes(1))
    expect(mockAddInstallation).toHaveBeenCalledWith(
      expect.objectContaining({ volume: 45000, volume_unit: 'gal' })
    )
  })

  it('omits volume when left empty', async () => {
    render(<InstallationModal open onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Ma piscine' } })
    fireEvent.click(screen.getByText("Créer l'installation"))

    await waitFor(() => expect(mockAddInstallation).toHaveBeenCalledTimes(1))
    const arg = mockAddInstallation.mock.calls[0][0]
    expect(arg.volume).toBeUndefined()
  })

  it('submits optional contact fields when provided', async () => {
    render(<InstallationModal open onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Ma piscine' } })
    // Contact/location is collapsed by default — expand it first.
    fireEvent.click(screen.getByText('Contact / emplacement (optionnel)'))
    fireEvent.change(screen.getByPlaceholderText('Adresse'), { target: { value: '123 rue Principale' } })
    fireEvent.change(screen.getByPlaceholderText('Nom du contact'), { target: { value: 'Jean Tremblay' } })
    fireEvent.change(screen.getByPlaceholderText('Téléphone'), { target: { value: '555-1234' } })
    fireEvent.change(screen.getByPlaceholderText('Courriel'), { target: { value: 'jean@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Notes'), { target: { value: 'Portail à gauche' } })
    fireEvent.click(screen.getByText("Créer l'installation"))

    await waitFor(() => expect(mockAddInstallation).toHaveBeenCalledTimes(1))
    expect(mockAddInstallation).toHaveBeenCalledWith(
      expect.objectContaining({
        address: '123 rue Principale',
        contact_name: 'Jean Tremblay',
        phone: '555-1234',
        email: 'jean@example.com',
        notes: 'Portail à gauche',
      })
    )
  })

  it('omits contact fields when left empty', async () => {
    render(<InstallationModal open onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Ma piscine' } })
    fireEvent.click(screen.getByText("Créer l'installation"))

    await waitFor(() => expect(mockAddInstallation).toHaveBeenCalledTimes(1))
    const arg = mockAddInstallation.mock.calls[0][0]
    expect(arg.address).toBeUndefined()
    expect(arg.contact_name).toBeUndefined()
    expect(arg.phone).toBeUndefined()
    expect(arg.email).toBeUndefined()
    expect(arg.notes).toBeUndefined()
  })

  it('offers FROG @ease / SmartChlor as a sanitizer for a spa, defaulting its strip profile to frog_ease', async () => {
    render(<InstallationModal open onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Spa Marin' } })
    fireEvent.click(screen.getByText(translations.fr.modal_install_spa))
    fireEvent.click(screen.getByText(translations.fr.modal_install_frog))
    // Selecting FROG surfaces the help text explaining the cartridge-status model.
    expect(screen.getByText(translations.fr.modal_install_frog_help)).toBeInTheDocument()

    fireEvent.click(screen.getByText("Créer l'installation"))

    await waitFor(() => expect(mockAddInstallation).toHaveBeenCalledTimes(1))
    expect(mockAddInstallation).toHaveBeenCalledWith(
      expect.objectContaining({ sanitizer: 'frog_smartchlor', strip_profile: 'frog_ease' })
    )
  })

  it('does not offer FROG @ease / SmartChlor for a pool — it is a spa/hot-tub-only product', () => {
    render(<InstallationModal open onClose={vi.fn()} />)
    // Default type is pool.
    expect(screen.queryByText(translations.fr.modal_install_frog)).not.toBeInTheDocument()
  })

  it('drops the FROG sanitizer choice when switching type back to pool', () => {
    render(<InstallationModal open onClose={vi.fn()} />)

    fireEvent.click(screen.getByText(translations.fr.modal_install_spa))
    fireEvent.click(screen.getByText(translations.fr.modal_install_frog))
    expect(screen.getByText(translations.fr.modal_install_frog_help)).toBeInTheDocument()

    fireEvent.click(screen.getByText(translations.fr.modal_install_pool))
    expect(screen.queryByText(translations.fr.modal_install_frog)).not.toBeInTheDocument()
    expect(screen.getByText(translations.fr.modal_install_chlorine)).toHaveStyle({ color: 'var(--accent)' })
  })

  it('still defaults new installations to chlorine (FROG stays opt-in)', () => {
    render(<InstallationModal open onClose={vi.fn()} />)
    expect(screen.getByText(translations.fr.modal_install_chlorine)).toHaveStyle({ color: 'var(--accent)' })
    expect(screen.queryByText(translations.fr.modal_install_frog_help)).not.toBeInTheDocument()
  })

  it('calls onCreated with the new installation after creating (not before, not on failure)', async () => {
    const created = { id: 42, name: 'Ma piscine' }
    mockAddInstallation.mockResolvedValue(created)
    const onCreated = vi.fn()
    render(<InstallationModal open onClose={vi.fn()} onCreated={onCreated} />)

    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Ma piscine' } })
    expect(onCreated).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText("Créer l'installation"))

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created))
  })

  it('opens the edit modal on the requested tab — used to land on Treatments right after creating', async () => {
    const installation = {
      id: 7, role: 'owner' as const, owner_name: null, name: 'Ma piscine', type: 'pool' as const,
      sanitizer: 'chlorine' as const, created_at: '2026-01-01T00:00:00',
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: () => Promise.resolve([]) } as Response)

    render(<InstallationModal open onClose={vi.fn()} installation={installation} initialTab="treatments" />)

    await waitFor(() => {
      expect(screen.getByText(translations.fr.modal_tab_treatments)).toHaveStyle({ color: 'var(--accent)' })
    })
    expect(screen.getByText(translations.fr.modal_tab_general)).toHaveStyle({ color: 'var(--text-secondary)' })

    vi.restoreAllMocks()
  })
})
