import { useState } from 'react'
import { Sun, Moon, Bath, Waves, Pencil, Plus, Trash2, Home, Activity, Clock, ClipboardList, Wrench, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react'
import homepoolLogo from '@/assets/homepool-logo.svg'
import homepoolSidebarLogo from '@/assets/homepool-logo-sidebar.svg'
import type { User } from '../types'
import type { Theme } from '../hooks/useTheme'
import { useInstallation } from '../context/InstallationContext'
import { useT } from '../context/LocaleContext'
import type { Locale } from '../i18n/translations'
import BottomNav from './BottomNav'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Page = 'log' | 'measurements' | 'history' | 'recommendations' | 'maintenance'

function getIsDark(theme: Theme): boolean {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

// Both switches are sized to sit side by side in one row (see their shared
// usage site below) rather than each owning a full-width row of their own.

function ThemeSwitch({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const isDark = getIsDark(theme)
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark')
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <Sun size={13} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--text-muted)', opacity: isDark ? 0.4 : 1, transition: 'opacity 0.2s' }} />

      <div
        onClick={toggleTheme}
        role="switch"
        aria-checked={isDark}
        aria-label="Theme"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTheme() } }}
        style={{
          width: 34,
          height: 19,
          borderRadius: 100,
          background: isDark ? 'var(--accent-dim)' : 'var(--bg-surface-2)',
          border: '1px solid var(--border)',
          position: 'relative',
          cursor: 'pointer',
          transition: 'background 0.3s, border-color 0.3s',
          flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute',
          top: 2,
          left: 2,
          width: 13,
          height: 13,
          borderRadius: '50%',
          background: 'var(--accent)',
          transform: isDark ? 'translateX(15px)' : 'translateX(0)',
          transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }} />
      </div>

      <Moon size={13} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--text-muted)', opacity: isDark ? 1 : 0.4, transition: 'opacity 0.2s' }} />
    </div>
  )
}

function LocaleSwitch({ locale, setLocale }: { locale: Locale; setLocale: (l: Locale) => void }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      background: 'var(--bg-surface-2)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: 2,
      flexShrink: 0,
    }}>
      {(['fr', 'en'] as Locale[]).map(l => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          style={{
            padding: '3px 8px',
            borderRadius: 4,
            border: 'none',
            background: locale === l ? 'var(--accent-dim)' : 'transparent',
            color: locale === l ? 'var(--accent)' : 'var(--text-muted)',
            fontSize: 10,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace",
            transition: 'all 0.15s',
            letterSpacing: '0.05em',
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

type Props = {
  onAdd?: () => void
  onLogout?: () => void
  onProfile?: () => void
  /** Only passed for administrators — undefined hides the entry entirely. */
  onAdmin?: () => void
  onAddInstallation?: () => void
  onEditInstallation?: () => void
  page?: Page
  onNavigate?: (page: Page) => void
  user?: User
  theme?: Theme
  setTheme?: (t: Theme) => void
}

const NAV_ITEMS: { page: Page; labelKey: 'nav_log' | 'nav_measurements' | 'nav_history' | 'nav_recommendations' | 'nav_maintenance'; Icon: typeof Home }[] = [
  { page: 'log', labelKey: 'nav_log', Icon: Home },
  { page: 'measurements', labelKey: 'nav_measurements', Icon: Activity },
  { page: 'maintenance', labelKey: 'nav_maintenance', Icon: Wrench },
  { page: 'history', labelKey: 'nav_history', Icon: Clock },
  { page: 'recommendations', labelKey: 'nav_recommendations', Icon: ClipboardList },
]

export default function Topbar({ onAdd, onLogout, onProfile, onAdmin, onAddInstallation, onEditInstallation, page = 'log', onNavigate, theme = 'auto', setTheme }: Props) {
  const { installations, active, setActive, deleteInstallation, isOwner } = useInstallation()
  const { t, locale, setLocale } = useT()

  // Measurements/History/Maintenance/Recommendations have nothing to show
  // with zero installations — only Dashboard (page 'log') is usable until
  // the user adds their first pool or spa.
  const hasInstallations = installations.length > 0

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const confirmDeleteInstallation = async () => {
    if (!active) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteInstallation(active.id)
      setConfirmingDelete(false)
    } catch {
      setDeleteError(t('installation_delete_error'))
    } finally {
      setDeleting(false)
    }
  }

  // Non-owners get the same button, but it opens the shared-installation view
  // (who owns it, what your role allows, and "leave") rather than the edit form.
  const installationActionLabel = isOwner
    ? t('nav_edit_installation')
    : t('nav_installation_details')

  const InstallationIcon = active?.type === 'spa' ? Bath : Waves

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="sidebar">
        {/* Logo — doubles as a "go to Dashboard" shortcut, matching the
            convention of clicking a logo to return home. */}
        <button
          type="button"
          onClick={() => onNavigate?.('log')}
          aria-label={t('nav_log')}
          style={{
            padding: '4px 16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'none',
            border: 'none',
            borderBottom: '1px solid var(--border-subtle)',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
          }}
        >
          <img
            src={homepoolSidebarLogo}
            alt=""
            width={42}
            height={42}
            style={{ flexShrink: 0 }}
          />
          <div style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            fontFamily: 'Sora, sans-serif',
          }}>
            <span style={{ color: 'var(--text-primary)' }}>home</span>
            <span style={{ color: 'var(--accent)' }}>pool</span>
          </div>
        </button>

        {/* Nav */}
        <nav className="sidebar-nav">
          {/* Logging an entry is the thing this app is for, so it leads the nav
              rather than hiding on the dashboard. Absent for viewers, who have
              nothing to log. The mobile equivalent is BottomNav's FAB. */}
          {onAdd && (
            <button className="sidebar-add-entry" onClick={onAdd}>
              <Plus size={15} strokeWidth={2.25} aria-hidden="true" />
              {t('nav_new_entry')}
            </button>
          )}
          {NAV_ITEMS.map(({ page: p, labelKey, Icon }) => {
            const disabled = p !== 'log' && !hasInstallations
            return (
              <button
                key={p}
                className={`sidebar-nav-item${page === p ? ' active' : ''}`}
                onClick={() => onNavigate?.(p)}
                disabled={disabled}
                aria-disabled={disabled}
                title={disabled ? t('nav_disabled_hint') : undefined}
              >
                <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
                {t(labelKey)}
              </button>
            )
          })}
        </nav>

        {/* Footer: installation + preferences + profile */}
        <div className="sidebar-footer">
          {/* Installation selector — its own visually distinct card, not just
              another row in the footer stack, since switching/managing
              installations is a much more frequent action than the
              preferences/account rows below it. */}
          {installations.length > 0 && (
            <div style={{
              padding: '10px 12px', margin: '0 0 6px', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)',
            }}>
              {installations.length === 1 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <InstallationIcon size={14} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {active?.name ?? '…'}
                    </span>
                    {onEditInstallation && (
                      <button
                        type="button"
                        onClick={onEditInstallation}
                        aria-label={installationActionLabel}
                        title={installationActionLabel}
                        style={{
                          flexShrink: 0, width: 22, height: 22, borderRadius: 'var(--radius-sm)',
                          background: 'none', border: 'none',
                          color: 'var(--text-muted)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Pencil size={12} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    )}
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => { setDeleteError(null); setConfirmingDelete(true) }}
                        aria-label={t('installation_delete')}
                        title={t('installation_delete')}
                        style={{
                          flexShrink: 0, width: 22, height: 22, borderRadius: 'var(--radius-sm)',
                          background: 'none', border: 'none',
                          color: 'var(--text-muted)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={12} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  {active?.volume != null && (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text-muted)', marginLeft: 21 }}>
                      {active.volume.toLocaleString('fr-FR')} {active.volume_unit ?? 'L'}
                    </span>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <select
                    value={active?.id ?? ''}
                    onChange={e => setActive(Number(e.target.value))}
                    style={{
                      flex: 1, width: '100%', padding: '5px 8px', borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)', border: '1px solid var(--border)',
                      color: 'var(--text-secondary)', fontFamily: 'Sora, sans-serif', fontSize: 12,
                      cursor: 'pointer', outline: 'none',
                    }}
                  >
                    {installations.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.role === 'owner' ? i.name : `${i.name} · ${i.owner_name ?? ''}`}
                      </option>
                    ))}
                  </select>
                  {onEditInstallation && (
                    <button
                      type="button"
                      onClick={onEditInstallation}
                      aria-label={installationActionLabel}
                      title={installationActionLabel}
                      style={{
                        flexShrink: 0, width: 26, height: 26, borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-surface)', border: '1px solid var(--border)',
                        color: 'var(--text-muted)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Pencil size={12} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  )}
                  {isOwner && (
                  <button
                    type="button"
                    onClick={() => { setDeleteError(null); setConfirmingDelete(true) }}
                    aria-label={t('installation_delete')}
                    title={t('installation_delete')}
                    style={{
                      flexShrink: 0, width: 26, height: 26, borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-surface)', border: '1px solid var(--border)',
                      color: 'var(--text-muted)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={12} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                  )}
                </div>
              )}
              {onAddInstallation && (
                <button
                  className="sidebar-add-installation"
                  onClick={onAddInstallation}
                  style={{
                    marginTop: 8, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    background: 'var(--bg-surface)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)',
                    fontFamily: 'Sora, sans-serif', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
                    cursor: 'pointer', padding: '6px 10px', transition: 'border-color 0.15s, color 0.15s',
                  }}
                >
                  <Plus size={12} strokeWidth={2} aria-hidden="true" />
                  {t('nav_add_installation')}
                </button>
              )}
            </div>
          )}

          {/* Theme + locale on one row — two prefs that don't need a full
              width each to themselves. */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px' }}>
            {setTheme && <ThemeSwitch theme={theme} setTheme={setTheme} />}
            <LocaleSwitch locale={locale} setLocale={setLocale} />
          </div>

          {onProfile && (
            <button className="btn-sidebar-logout" onClick={onProfile} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <UserIcon size={13} strokeWidth={1.75} aria-hidden="true" />
              {t('nav_my_profile')}
            </button>
          )}
          {onAdmin && (
            <button className="btn-sidebar-logout" onClick={onAdmin} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={13} strokeWidth={1.75} aria-hidden="true" />
              {t('nav_administration')}
            </button>
          )}
          {onLogout && (
            <button className="btn-sidebar-logout" onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <LogOut size={13} strokeWidth={1.75} aria-hidden="true" />
              {t('nav_logout')}
            </button>
          )}
          <div style={{
            padding: '6px 12px 8px',
            fontSize: 10,
            fontFamily: "'IBM Plex Mono', monospace",
            color: 'var(--text-muted)',
            letterSpacing: '0.03em',
            userSelect: 'none',
          }}>
            homepool · MIT License
          </div>
        </div>
      </aside>

      {/* ── Mobile top header ───────────────────────────────── */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <img src={homepoolLogo} alt="homepool" />
          {active?.name && (
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {active.name}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onLogout && (
            <button className="mobile-header-logout" onClick={onLogout}>
              <LogOut size={14} strokeWidth={1.75} aria-hidden="true" />
              {t('nav_logout_short')}
            </button>
          )}
        </div>
      </header>

      {/* ── Mobile bottom nav ───────────────────────────────── */}
      {onAdd && onNavigate && (
        <BottomNav page={page} onNavigate={onNavigate} onAdd={onAdd} hasInstallations={hasInstallations} />
      )}

      {/* Dialog — delete installation confirmation */}
      <Dialog open={confirmingDelete} onOpenChange={open => { if (!open) setConfirmingDelete(false) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: '"Sora", sans-serif', fontWeight: 600 }}>
              {t('installation_delete')}
            </DialogTitle>
          </DialogHeader>
          {active && (
            <div>
              <p style={{ fontFamily: '"Sora", sans-serif', fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 20px' }}>
                {t('installation_confirm_delete').replace('{name}', active.name)}
              </p>
              {deleteError && (
                <p style={{ fontFamily: '"Sora", sans-serif', fontSize: 13, color: 'var(--status-danger-text)', margin: '0 0 12px' }}>
                  {deleteError}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn-ghost" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                  {t('modal_cancel')}
                </button>
                <button className="btn-danger" onClick={confirmDeleteInstallation} disabled={deleting}>
                  {deleting ? t('modal_install_saving') : t('modal_delete')}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
