import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from './App'
import { translations } from './i18n/translations'

const mockUser = { id: 1, email: 'admin@example.com', is_admin: true, created_at: '2026-02-25T00:00:00' }
const mockActions = [
  {
    id: 1,
    date: '2026-02-23',
    action_type: 'Cartridge cleaning',
    user_id: 1,
    product_id: null,
    qty: '',
    unit: '',
    notes: 'Filtre propre',
    created_at: '2026-02-23T00:00:00',
  },
]
const mockProducts = [{ id: 1, name: 'Chlorine', type: 'seed', unit_default: 'g' }]
const mockInstallation = {
  id: 1,
  role: 'owner' as const,
  owner_name: null,
  name: 'Pool',
  type: 'pool' as const,
  sanitizer: 'chlorine' as const,
  created_at: '2026-02-25T00:00:00',
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      const u = String(url)
      if (u === '/api/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: mockUser }) } as Response)
      }
      if (u === '/api/installations') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([mockInstallation]) } as Response)
      }
      if (u.startsWith('/api/installations/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
      }
      if (u.startsWith('/api/actions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockActions) } as Response)
      }
      if (u === '/api/products') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockProducts) } as Response)
      }
      if (u === '/api/auth/registration-status') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ open: true, first_run: false }) } as Response)
      }
      return Promise.reject(new Error(`fetch inattendu : ${u}`))
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches user, actions and products on mount', async () => {
    render(<App />)
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/me', expect.any(Object))
      expect(fetch).toHaveBeenCalledWith(`/api/actions?installation_id=${mockInstallation.id}`, expect.any(Object))
      expect(fetch).toHaveBeenCalledWith('/api/products', expect.any(Object))
    })
  })

  it('prompts to add a first pool/spa for a brand-new account with zero installations', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      const u = String(url)
      if (u === '/api/me') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: mockUser }) } as Response)
      }
      if (u === '/api/installations') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
      }
      return Promise.reject(new Error(`fetch inattendu : ${u}`))
    })

    render(<App />)

    // jsdom's default navigator.language is en-US, so the app renders in
    // English absent a saved locale preference.
    await waitFor(() => expect(screen.getByText(translations.en.onboarding_title)).toBeInTheDocument())
    expect(screen.getByText(translations.en.onboarding_add_button)).toBeInTheDocument()
  })
})
