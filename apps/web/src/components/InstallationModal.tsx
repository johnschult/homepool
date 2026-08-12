import { useState, useEffect } from 'react'
import { Waves, Bath, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useInstallation } from '../context/InstallationContext'
import { useT } from '../context/LocaleContext'
import type { TempUnit, SaltUnit, ConcUnit, HardnessUnit } from '../units'
import type { Installation } from '../types'
import type { SanitizerType, StripProfileId } from '../sanitizer'
import { SANITIZER_CAPABILITIES, STRIP_PROFILES } from '../sanitizer'
import WaterChemistryTargets from './WaterChemistryTargets'
import TreatmentConfig from './TreatmentConfig'
import SharingTab from './SharingTab'

export type Tab = 'general' | 'water' | 'treatments' | 'sharing'

type Props = {
  open: boolean
  onClose: () => void
  installation?: Installation
  /** Which tab the edit form opens on — defaults to 'general'. Used to land
   * straight on Treatments right after creating a new installation. */
  initialTab?: Tab
  /** Fired once a brand-new installation is successfully created (not on
   * edits/saves) — lets the caller guide the user to the next step. */
  onCreated?: (installation: Installation) => void
}

type UnitPreset = {
  temp_unit: TempUnit
  volume_unit: 'L' | 'gal'
  salt_unit: SaltUnit
  conc_unit: ConcUnit
  hardness_unit: HardnessUnit
}

// One-click shortcut for the common case (everything metric, or everything
// US-imperial) — the individual pickers below stay live so a mixed setup
// (e.g. imperial temperature but hardness in ppm) is still one click away.
const UNIT_PRESETS: Record<'metric' | 'imperial', UnitPreset> = {
  metric: { temp_unit: 'C', volume_unit: 'L', salt_unit: 'g/L', conc_unit: 'mg/L', hardness_unit: 'ppm' },
  imperial: { temp_unit: 'F', volume_unit: 'gal', salt_unit: 'ppm', conc_unit: 'ppm', hardness_unit: 'ppm' },
}

/** What someone a pool was shared with sees instead of the edit form: who owns
 * it, what their role lets them do, and a way to give the access back. */
function SharedInstallationView({
  installation, onLeave, leaving, error,
}: {
  installation: Installation
  onLeave: () => void
  leaving: boolean
  error: string | null
}) {
  const { t } = useT()
  const roleLabel = installation.role === 'editor' ? t('share_role_editor') : t('share_role_viewer')
  const roleHint = installation.role === 'editor'
    ? t('share_role_editor_hint')
    : t('share_role_viewer_hint')

  const row: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', gap: 12,
    fontFamily: '"Sora", sans-serif', fontSize: 13,
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={row}>
        <span style={{ color: 'var(--text-secondary)' }}>{t('share_shared_by')}</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          {installation.owner_name ?? '—'}
        </span>
      </div>
      <div style={row}>
        <span style={{ color: 'var(--text-secondary)' }}>{t('share_your_access')}</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{roleLabel}</span>
      </div>
      <p style={{ fontFamily: '"Sora", sans-serif', fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
        {roleHint} {t('share_owner_configures')}
      </p>
      {error && (
        <p style={{ fontFamily: '"Sora", sans-serif', fontSize: 13, color: 'var(--status-danger-text)', margin: 0 }}>
          {error}
        </p>
      )}
      <Button type="button" variant="outline" disabled={leaving} onClick={onLeave}>
        {leaving ? t('share_leaving') : t('share_leave')}
      </Button>
    </div>
  )
}

export default function InstallationModal({ open, onClose, installation, initialTab, onCreated }: Props) {
  const { t } = useT()
  const { addInstallation, refresh, leaveInstallation } = useInstallation()
  const isEdit = !!installation
  // Everything in this modal except reading the general fields is owner-only;
  // an editor or viewer gets a read-only view with a "leave" action instead.
  const isOwner = !isEdit || installation?.role === 'owner'
  const [tab, setTab] = useState<Tab>(initialTab ?? 'general')
  // The edit modal instance stays mounted across opens (it's only unmounted
  // when there's no active installation at all), so the tab state's lazy
  // initializer only fires once — re-sync it explicitly on every fresh open,
  // otherwise landing on Treatments right after creation wouldn't stick.
  useEffect(() => {
    if (open) setTab(initialTab ?? 'general')
  }, [open, initialTab])
  const [name, setName] = useState(installation?.name ?? '')
  const [type, setType] = useState<'pool' | 'spa'>(installation?.type ?? 'pool')
  const [sanitizer, setSanitizer] = useState<SanitizerType>(installation?.sanitizer ?? 'chlorine')
  // undefined = no explicit choice yet; the effective profile falls back to the
  // current sanitizer's default (see effectiveStripProfile below) rather than
  // being stored eagerly, so switching sanitizer back and forth never leaves a
  // stale, incompatible override behind.
  const [stripProfileOverride, setStripProfileOverride] = useState<StripProfileId | undefined>(
    installation?.strip_profile ?? undefined
  )
  const [volume, setVolume] = useState(installation?.volume != null ? String(installation.volume) : '')
  const [volumeUnit, setVolumeUnit] = useState<'L' | 'gal'>(installation?.volume_unit ?? 'L')
  const [tempUnit, setTempUnit] = useState<TempUnit>(installation?.temp_unit ?? 'C')
  const [saltUnit, setSaltUnit] = useState<SaltUnit>(installation?.salt_unit ?? 'ppm')
  const [concUnit, setConcUnit] = useState<ConcUnit>(installation?.conc_unit ?? 'mg/L')
  const [hardnessUnit, setHardnessUnit] = useState<HardnessUnit>(installation?.hardness_unit ?? 'ppm')

  const applyUnitPreset = (preset: UnitPreset) => {
    setTempUnit(preset.temp_unit)
    setVolumeUnit(preset.volume_unit)
    setSaltUnit(preset.salt_unit)
    setConcUnit(preset.conc_unit)
    setHardnessUnit(preset.hardness_unit)
  }
  const matchesUnitPreset = (preset: UnitPreset) =>
    tempUnit === preset.temp_unit && volumeUnit === preset.volume_unit && saltUnit === preset.salt_unit
    && concUnit === preset.conc_unit && hardnessUnit === preset.hardness_unit

  const [address, setAddress] = useState(installation?.address ?? '')
  const [contactName, setContactName] = useState(installation?.contact_name ?? '')
  const [phone, setPhone] = useState(installation?.phone ?? '')
  const [email, setEmail] = useState(installation?.email ?? '')
  const [notes, setNotes] = useState(installation?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Collapsed by default — most home installations never fill these in. Start
  // open when editing an installation that already has something here, so
  // existing data is never hidden behind an extra click.
  const [contactOpen, setContactOpen] = useState(
    !!(installation?.address || installation?.contact_name || installation?.phone || installation?.email || installation?.notes)
  )

  const compatibleProfiles = Object.values(STRIP_PROFILES).filter(p => p.compatibleSanitizers.includes(sanitizer))
  const effectiveStripProfile: StripProfileId =
    stripProfileOverride && compatibleProfiles.some(p => p.id === stripProfileOverride)
      ? stripProfileOverride
      : SANITIZER_CAPABILITIES[sanitizer].defaultStripProfile

  const resetForm = () => {
    setName('')
    setType('pool')
    setSanitizer('chlorine')
    setStripProfileOverride(undefined)
    setVolume('')
    setVolumeUnit('L')
    setTempUnit('C')
    setSaltUnit('ppm')
    setConcUnit('mg/L')
    setHardnessUnit('ppm')
    setAddress('')
    setContactName('')
    setPhone('')
    setEmail('')
    setNotes('')
    setContactOpen(false)
    setTab('general')
  }

  const handleClose = () => {
    if (!isEdit) resetForm()
    onClose()
  }

  const handleLeave = async () => {
    if (!installation) return
    if (!window.confirm(t('share_leave_confirm').replace('{name}', installation.name))) return
    setLoading(true)
    setError(null)
    try {
      await leaveInstallation(installation.id)
      onClose()
    } catch {
      setError(t('share_leave_error'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError(t('modal_install_name_required')); return }
    setLoading(true)
    setError(null)
    try {
      const parsedVolume = volume.trim() ? parseFloat(volume) : undefined
      const payload = {
        name: name.trim(),
        type,
        sanitizer,
        strip_profile: effectiveStripProfile,
        temp_unit: tempUnit,
        salt_unit: saltUnit,
        conc_unit: concUnit,
        hardness_unit: hardnessUnit,
        address: address.trim() || undefined,
        contact_name: contactName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
        ...(parsedVolume !== undefined && !isNaN(parsedVolume) ? { volume: parsedVolume, volume_unit: volumeUnit } : {}),
      }
      if (isEdit && installation) {
        const res = await fetch(`/api/installations/${installation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('failed')
        await refresh()
      } else {
        const created = await addInstallation(payload)
        resetForm()
        onCreated?.(created)
      }
      onClose()
    } catch {
      setError(isEdit ? t('modal_install_update_error') : t('modal_install_create_error'))
    } finally {
      setLoading(false)
    }
  }

  // One shared control height across every input/pill/card in this form so a
  // row that mixes an <Input> (h-10 = 40px) with pill buttons never looks
  // mismatched — the height that used to vary field-to-field (26px unit
  // pills, ~36px sanitizer pills, 40px inputs) is now a single constant.
  const CONTROL_HEIGHT = 40
  // Consistent label→control spacing for every field block (some used 6,
  // others 8 — now all 8), and a consistent gap between top-level sections.
  const FIELD_GAP = 8
  const SECTION_GAP_X = 24
  const SECTION_GAP_Y = 20

  const cardBase: React.CSSProperties = {
    flex: 1, padding: '14px 12px', borderRadius: 10, border: '2px solid',
    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    fontFamily: '"Sora", sans-serif', fontSize: 13, fontWeight: 600,
    transition: 'border-color 0.15s, background 0.15s',
  }

  const pillBase: React.CSSProperties = {
    flex: 1, height: CONTROL_HEIGHT, padding: '0 12px', borderRadius: 8, border: '2px solid',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: '"Sora", sans-serif', fontSize: 12, fontWeight: 600,
    transition: 'border-color 0.15s, background 0.15s',
  }

  const unitRowLabel: React.CSSProperties = {
    fontFamily: '"Sora", sans-serif', fontSize: 12, color: 'var(--text-secondary)',
  }

  const unitPillStyle = (active: boolean): React.CSSProperties => ({
    ...pillBase,
    flex: 1,
    minWidth: 48,
    borderColor: active ? 'color-mix(in srgb, var(--accent) 35%, transparent)' : 'var(--border)',
    background: active ? 'var(--accent-dim)' : 'var(--bg-surface-2)',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
  })

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      {/* Both the edit tabs (rows of controls: name + unit + parameter, four
          range fields) and the create form (type/sanitizer pickers, a
          measurement-units grid) need real width — a narrow dialog forces
          everything into one tall, cramped column. */}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: '"Sora", sans-serif', fontWeight: 600 }}>
            {isEdit ? t('modal_install_title_edit') : t('modal_install_title')}
          </DialogTitle>
        </DialogHeader>

        {isEdit && isOwner && (
          <div className="flex-shrink-0" style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
            {(['general', 'water', 'treatments', 'sharing'] as Tab[]).map(tb => (
              <button
                key={tb}
                type="button"
                onClick={() => setTab(tb)}
                style={{
                  padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: '"Sora", sans-serif', fontSize: 13, fontWeight: 600,
                  color: tab === tb ? 'var(--accent)' : 'var(--text-secondary)',
                  borderBottom: tab === tb ? '2px solid var(--accent)' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {tb === 'general'
                  ? t('modal_tab_general')
                  : tb === 'water'
                  ? t('modal_tab_water_chemistry')
                  : tb === 'treatments'
                  ? t('modal_tab_treatments')
                  : t('modal_tab_sharing')}
              </button>
            ))}
          </div>
        )}

        {isEdit && !isOwner && installation ? (
          <SharedInstallationView installation={installation} onLeave={handleLeave} leaving={loading} error={error} />
        ) : isEdit && tab === 'water' && installation ? (
          <WaterChemistryTargets installation={installation} onSaved={handleClose} />
        ) : isEdit && tab === 'treatments' && installation ? (
          <TreatmentConfig installation={installation} onSaved={handleClose} />
        ) : isEdit && tab === 'sharing' && installation ? (
          <SharingTab installation={installation} />
        ) : (
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div
            className="flex-1 overflow-y-auto overscroll-contain grid grid-cols-1 sm:grid-cols-2"
            style={{ paddingTop: 4, columnGap: SECTION_GAP_X, rowGap: SECTION_GAP_Y }}
          >
          {/* Name */}
          <div style={{ display: 'grid', gap: FIELD_GAP }}>
            <Label htmlFor="inst-name">{t('modal_install_name')}</Label>
            <Input
              id="inst-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('modal_install_name_placeholder')}
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              data-bwignore="true"
            />
          </div>

          {/* Capacity */}
          <div style={{ display: 'grid', gap: FIELD_GAP }}>
            <Label htmlFor="inst-volume">{t('modal_install_capacity')}</Label>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                id="inst-volume"
                type="number"
                min="0"
                step="any"
                value={volume}
                onChange={e => setVolume(e.target.value)}
                placeholder="45000"
                style={{ flex: 1 }}
              />
              {(['L', 'gal'] as const).map(u => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setVolumeUnit(u)}
                  style={{
                    ...pillBase,
                    flex: 'none',
                    minWidth: 56,
                    borderColor: volumeUnit === u ? 'color-mix(in srgb, var(--accent) 35%, transparent)' : 'var(--border)',
                    background: volumeUnit === u ? 'var(--accent-dim)' : 'var(--bg-surface-2)',
                    color: volumeUnit === u ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div className="sm:col-span-2" style={{ display: 'grid', gap: FIELD_GAP }}>
            <Label>{t('modal_install_type')}</Label>
            <div style={{ display: 'flex', gap: 10 }}>
              {([['pool', Waves, t('modal_install_pool')], ['spa', Bath, t('modal_install_spa')]] as const).map(([tp, Icon, label]) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => {
                    setType(tp)
                    // FROG @ease/SmartChlor is a spa/hot-tub product (King
                    // Technology's separate "Pool Frog" line covers pools,
                    // with a different Cycler-based mechanism, not SmartChlor)
                    // — never leave it selected for a pool.
                    if (tp !== 'spa' && sanitizer === 'frog_smartchlor') setSanitizer('chlorine')
                  }}
                  style={{
                    ...cardBase,
                    borderColor: type === tp ? 'color-mix(in srgb, var(--accent) 35%, transparent)' : 'var(--border)',
                    background: type === tp ? 'var(--accent-dim)' : 'var(--bg-surface-2)',
                    color: type === tp ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  <Icon size={20} strokeWidth={1.75} aria-hidden="true" style={{ color: type === tp ? 'var(--accent)' : 'var(--text-muted)' }} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Sanitizer */}
          <div className="sm:col-span-2" style={{ display: 'grid', gap: FIELD_GAP }}>
            <Label>{t('modal_install_sanitizer')}</Label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {([
                ['chlorine', t('modal_install_chlorine')],
                ['bromine', t('modal_install_bromine')],
                ['salt', t('modal_install_salt')],
                // FROG @ease/SmartChlor only exists as a spa/hot-tub product.
                ...(type === 'spa' ? [['frog_smartchlor', t('modal_install_frog')] as const] : []),
              ] as const).map(([s, label]) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSanitizer(s)}
                  style={{
                    ...pillBase,
                    flex: '1 1 auto',
                    borderColor: sanitizer === s ? 'color-mix(in srgb, var(--accent) 35%, transparent)' : 'var(--border)',
                    background: sanitizer === s ? 'var(--accent-dim)' : 'var(--bg-surface-2)',
                    color: sanitizer === s ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {sanitizer === 'frog_smartchlor' && (
              <p style={{ fontFamily: '"Sora", sans-serif', fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                {t('modal_install_frog_help')}
              </p>
            )}
          </div>

          {/* Test method (strip profile) */}
          {compatibleProfiles.length > 1 && (
            <div className="sm:col-span-2" style={{ display: 'grid', gap: FIELD_GAP }}>
              <Label>{t('modal_install_strip_profile')}</Label>
              <div style={{ display: 'flex', gap: 8 }}>
                {compatibleProfiles.map(profile => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setStripProfileOverride(profile.id)}
                    style={{
                      ...pillBase,
                      borderColor: effectiveStripProfile === profile.id ? 'color-mix(in srgb, var(--accent) 35%, transparent)' : 'var(--border)',
                      background: effectiveStripProfile === profile.id ? 'var(--accent-dim)' : 'var(--bg-surface-2)',
                      color: effectiveStripProfile === profile.id ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    {t(profile.nameKey)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Measurement units */}
          <div className="sm:col-span-2" style={{ display: 'grid', gap: FIELD_GAP }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <Label>{t('modal_install_units')}</Label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['metric', 'imperial'] as const).map(sys => {
                  const active = matchesUnitPreset(UNIT_PRESETS[sys])
                  return (
                    <button
                      key={sys}
                      type="button"
                      onClick={() => applyUnitPreset(UNIT_PRESETS[sys])}
                      style={{
                        ...pillBase, flex: 'none', height: 28, padding: '0 12px', fontSize: 11,
                        borderColor: active ? 'color-mix(in srgb, var(--accent) 35%, transparent)' : 'var(--border)',
                        background: active ? 'var(--accent-dim)' : 'var(--bg-surface-2)',
                        color: active ? 'var(--accent)' : 'var(--text-secondary)',
                      }}
                    >
                      {sys === 'metric' ? t('modal_install_units_metric') : t('modal_install_units_imperial')}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-2" style={{ columnGap: SECTION_GAP_X, rowGap: 14 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <span style={unitRowLabel}>{t('unit_temperature')}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['C', 'F'] as const).map(u => (
                    <button key={u} type="button" onClick={() => setTempUnit(u)} style={unitPillStyle(tempUnit === u)}>
                      °{u}
                    </button>
                  ))}
                </div>
              </div>
              {/* FROG @ease has no salt field anywhere (it isn't a salt water
                  generator) — a unit picker for it would be meaningless. */}
              {sanitizer !== 'frog_smartchlor' && (
                <div style={{ display: 'grid', gap: 6 }}>
                  <span style={unitRowLabel}>{t('unit_salt')}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['ppm', 'g/L'] as const).map(u => (
                      <button key={u} type="button" onClick={() => setSaltUnit(u)} style={unitPillStyle(saltUnit === u)}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gap: 6 }}>
                <span style={unitRowLabel}>{t('unit_concentration')}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['mg/L', 'ppm'] as const).map(u => (
                    <button key={u} type="button" onClick={() => setConcUnit(u)} style={unitPillStyle(concUnit === u)}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <span style={unitRowLabel}>{t('unit_hardness')}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['ppm', '°dH', '°f'] as const).map(u => (
                    <button key={u} type="button" onClick={() => setHardnessUnit(u)} style={unitPillStyle(hardnessUnit === u)}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Contact / location (all optional) — collapsed by default since
              most home installations never use it; auto-expanded on edit when
              any of these fields already has a value. */}
          <div className="sm:col-span-2" style={{ display: 'grid', gap: FIELD_GAP }}>
            <button
              type="button"
              onClick={() => setContactOpen(o => !o)}
              aria-expanded={contactOpen}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
                padding: 0, cursor: 'pointer', textAlign: 'left',
              }}
            >
              {contactOpen
                ? <ChevronDown size={14} strokeWidth={2} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
                : <ChevronRight size={14} strokeWidth={2} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />}
              <Label style={{ cursor: 'pointer' }}>{t('modal_install_contact_section')}</Label>
            </button>
            {contactOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ columnGap: SECTION_GAP_X, rowGap: FIELD_GAP }}>
                <Input
                  id="inst-address"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder={t('modal_install_address')}
                />
                <Input
                  id="inst-contact-name"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder={t('modal_install_contact_name')}
                />
                <Input
                  id="inst-phone"
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder={t('modal_install_phone')}
                />
                <Input
                  id="inst-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('modal_install_email')}
                />
                <textarea
                  id="inst-notes"
                  className="sm:col-span-2"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={t('modal_install_notes')}
                  rows={2}
                  style={{
                    width: '100%', resize: 'vertical', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--bg-surface-2)',
                    color: 'var(--text-primary)', padding: '8px 10px',
                    fontFamily: '"Sora", sans-serif', fontSize: 14,
                  }}
                />
              </div>
            )}
          </div>

          {error && (
            <p className="sm:col-span-2" style={{ fontFamily: '"Sora", sans-serif', fontSize: 13, color: 'var(--status-danger-text)', margin: 0 }}>
              {error}
            </p>
          )}
          </div>

          <Button type="submit" disabled={loading} className="w-full" style={{ marginTop: 18, flexShrink: 0 }}>
            {loading
              ? (isEdit ? t('modal_install_saving') : t('modal_install_creating'))
              : (isEdit ? t('modal_install_save') : t('modal_install_create'))}
          </Button>
        </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
