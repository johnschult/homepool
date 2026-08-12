import { useEffect, useState } from 'react'
import { PartyPopper, Info, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Action, Recommendation, RecommendationsResponse, TreatmentProduct } from '../types'
import { PARAM_GUIDANCE } from '../paramGuidance'
import { gramsToDisplay, mlToDisplay } from '../units'
import { treatmentProductLabel } from '../utils'
import { useInstallation } from '../context/InstallationContext'
import { useT } from '../context/LocaleContext'
import type { TranslationKey } from '../i18n/translations'
import type { TreatmentPrefill } from './ActionForm'
import SimulatorModal from './SimulatorModal'

const sectionCardStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-card)',
  padding: '16px',
  marginBottom: 14,
}

function formatValue(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

/** The display converters spell two units differently from the treatment form's
 * list (they're written for reading, not for a select). */
function toTreatmentUnit(unit: string): string {
  if (unit === 'mL') return 'ml'
  if (unit === 'fl_oz') return 'fl oz'
  return unit
}

type Props = {
  actions: Action[]
  /** Opens the entry form with this dose preselected as a treatment. Absent for
   * viewers, who can read recommendations but not log anything. */
  onLogTreatment?: (treatment: TreatmentPrefill) => void
}

export default function RecommendationsPage({ actions, onLogTreatment }: Props) {
  const { active } = useInstallation()
  const { t } = useT()
  const [data, setData] = useState<RecommendationsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [showSimulator, setShowSimulator] = useState(false)
  // Which dosage products this installation actually stocks, mapped to that
  // product's own label — a recommendation for "soda_ash" should read as
  // whatever the user actually calls their pH increaser (its translated
  // builtin label, or a custom name/brand they typed in), not the raw
  // chemical name, once they have a matching product configured. Falls back
  // to the generic chemical-name translation when there's no match, and a
  // recommendation only offers to log itself when one exists — otherwise the
  // form would open on an empty product picker.
  const [dosageProducts, setDosageProducts] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (!active) return
    setLoading(true)
    fetch(`/api/installations/${active.id}/recommendations`, { credentials: 'same-origin' })
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .finally(() => setLoading(false))
  }, [active?.id])

  const canLog = !!onLogTreatment
  useEffect(() => {
    if (!active || !canLog) return
    let cancelled = false
    fetch(`/api/installations/${active.id}/treatments`, { credentials: 'same-origin' })
      .then(r => (r.ok ? r.json() : []))
      .then((products: TreatmentProduct[]) => {
        if (cancelled || !Array.isArray(products)) return
        setDosageProducts(new Map(
          products
            .filter(p => p.enabled && p.dosage_product_id)
            .map(p => [p.dosage_product_id!, treatmentProductLabel(p, t)])
        ))
      })
      .catch(() => { /* no catalog, no log buttons — recommendations still read */ })
    return () => { cancelled = true }
  }, [active?.id, canLog])

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header-title">{t('recommendations_page_title')}</h1>
        <div className="page-header-actions">
          <Button type="button" variant="outline" onClick={() => setShowSimulator(true)}>
            {t('simulator_open_button')}
          </Button>
        </div>
      </div>

      <SimulatorModal open={showSimulator} onClose={() => setShowSimulator(false)} actions={actions} />

      {!loading && data && !data.volume_known && (
        <div style={{
          background: 'var(--status-warn-bg)', color: 'var(--status-warn-text)',
          border: '1px solid var(--status-warn-text)', borderRadius: 'var(--radius-md)',
          padding: '10px 14px', marginBottom: 14,
          fontFamily: '"Sora", sans-serif', fontSize: 12,
        }}>
          {t('recommendations_volume_unknown_banner')}
        </div>
      )}

      {loading && (
        <div style={{ fontFamily: '"Sora", sans-serif', fontSize: 13, color: 'var(--text-muted)' }}>
          {t('loading')}
        </div>
      )}

      {!loading && data && data.recommendations.length === 0 && (
        <div style={{ ...sectionCardStyle, padding: '32px 16px', textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, margin: '0 auto 12px', borderRadius: '50%',
            background: 'var(--status-ok-bg)', color: 'var(--status-ok-text)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <PartyPopper size={22} strokeWidth={1.75} aria-hidden="true" />
          </div>
          <p style={{ fontFamily: '"Sora", sans-serif', fontSize: 15, fontWeight: 600, color: 'var(--status-ok-text)', margin: '0 0 4px' }}>
            {t('recommendations_empty')}
          </p>
          <p style={{ fontFamily: '"Sora", sans-serif', fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            {t('recommendations_empty_sub')}
          </p>
        </div>
      )}

      {/* Text-heavy cards read worse the wider they get — capped so lines of
          prose stay a reasonable length instead of stretching edge to edge
          on a wide viewport. */}
      <div style={{ maxWidth: 640 }}>
        {!loading && data && data.recommendations.map(rec => (
          <RecommendationCard
            key={rec.param}
            rec={rec}
            onLogTreatment={onLogTreatment}
            dosageProducts={dosageProducts}
          />
        ))}
      </div>
    </div>
  )
}

function RecommendationCard({ rec, onLogTreatment, dosageProducts }: {
  rec: Recommendation
  onLogTreatment?: (treatment: TreatmentPrefill) => void
  dosageProducts: Map<string, string>
}) {
  const { t } = useT()
  const guidance = PARAM_GUIDANCE[rec.param]
  const directionLabel = rec.direction === 'raise' ? t('recommendations_raise') : t('recommendations_lower')
  const directionColor = rec.direction === 'raise' ? 'var(--status-warn-text)' : 'var(--status-danger-text)'

  return (
    <div style={sectionCardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontFamily: '"Sora", sans-serif', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {guidance ? t(guidance.labelKey) : rec.param}
        </div>
        <span style={{
          fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, fontWeight: 600,
          color: directionColor, background: 'var(--bg-surface-2)',
          padding: '2px 8px', borderRadius: 4,
        }}>
          {directionLabel}
        </span>
      </div>

      <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
        {formatValue(rec.current_value)} → {formatValue(rec.target_value)}
        <span style={{ color: 'var(--text-muted)' }}> ({t('recommendations_target_label')})</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rec.options.map((opt, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', gap: 8,
            padding: '10px 12px', borderRadius: 8, background: 'var(--bg-surface-2)',
          }}>
            {/* Name + amount share a row instead of stacking — the amount is
                the number someone's actually here for, so it gets equal
                billing with the product name rather than trailing below it. */}
            {(opt.product_id || opt.amount_grams !== null || opt.amount_ml !== null) && (
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                {opt.product_id && (
                  <div style={{ fontFamily: '"Sora", sans-serif', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {dosageProducts.get(opt.product_id) ?? t(`dosage_product_${opt.product_id}` as TranslationKey)}
                  </div>
                )}
                {opt.amount_grams !== null && <AmountLine grams={opt.amount_grams} />}
                {opt.amount_ml !== null && <AmountLine mL={opt.amount_ml} />}
              </div>
            )}

            {/* Caveat + side-effect as compact icon chips, wrapping onto a
                second line on narrow screens, instead of two stacked
                full-width paragraphs that read as one undifferentiated
                block of gray text. */}
            {(opt.notes_key || opt.side_effect) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {opt.notes_key && <InfoChip icon={Info} text={t(opt.notes_key as TranslationKey)} />}
                {opt.side_effect && <SideEffectChip side={opt.side_effect} />}
              </div>
            )}

            {onLogTreatment && opt.product_id && dosageProducts.has(opt.product_id) && (
              <LogTreatmentButton
                productId={opt.product_id}
                grams={opt.amount_grams}
                mL={opt.amount_ml}
                onLogTreatment={onLogTreatment}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Turns a dosing suggestion into a pre-filled treatment entry, so acting on
 * the advice and recording that you did are one step. Guidance-only options
 * (dilution, "follow the label") carry no amount — the form still opens with
 * the product picked, ready for whatever you actually poured in. */
function LogTreatmentButton({ productId, grams, mL, onLogTreatment }: {
  productId: string
  grams: number | null
  mL: number | null
  onLogTreatment: (treatment: TreatmentPrefill) => void
}) {
  const { t } = useT()
  const { active } = useInstallation()
  const volumeUnit = active?.volume_unit

  const display = grams !== null
    ? gramsToDisplay(grams, volumeUnit)
    : mL !== null ? mlToDisplay(mL, volumeUnit) : null

  return (
    <button
      type="button"
      className="btn-ghost"
      style={{ alignSelf: 'flex-start', fontSize: 11, padding: '4px 8px' }}
      onClick={() => onLogTreatment({
        dosage_product_id: productId,
        qty: display ? String(display.value) : undefined,
        unit: display ? toTreatmentUnit(display.unit) : undefined,
      })}
    >
      {t('recommendations_log_treatment')}
    </button>
  )
}

// A compact icon + short text pill — replaces what used to be a full-width
// paragraph line, so several of these read as distinct labeled facts instead
// of one continuous block of gray prose.
function InfoChip({ icon: Icon, text }: { icon: typeof Info; text: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      fontFamily: '"Sora", sans-serif', fontSize: 11, color: 'var(--text-muted)',
      background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
      borderRadius: 999, padding: '3px 9px 3px 7px',
    }}>
      <Icon size={11} strokeWidth={2} aria-hidden="true" style={{ flexShrink: 0 }} />
      {text}
    </div>
  )
}

// A product's secondary-parameter shift (issue #40): the translated caveat plus the
// signed estimate. pH shifts carry no unit; everything else is ppm. Direction of the
// shift (up/down) gets its own icon rather than a leading +/- sign buried in prose.
function SideEffectChip({ side }: { side: NonNullable<Recommendation['options'][number]['side_effect']> }) {
  const { t } = useT()
  const raises = side.delta >= 0
  const unit = side.param === 'ph' ? '' : ' ppm'
  return (
    <InfoChip
      icon={raises ? TrendingUp : TrendingDown}
      text={`${t(side.notes_key as TranslationKey)} (${raises ? '+' : '−'}${Math.abs(side.delta)}${unit})`}
    />
  )
}

function AmountLine({ grams, mL }: { grams?: number; mL?: number }) {
  const { active } = useInstallation()
  const volumeUnit = active?.volume_unit
  const display = grams !== undefined ? gramsToDisplay(grams, volumeUnit) : mlToDisplay(mL as number, volumeUnit)
  return (
    <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>
      {display.value} {display.unit === 'fl_oz' ? 'fl oz' : display.unit}
    </div>
  )
}
