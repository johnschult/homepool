import { useT } from '../context/LocaleContext'
import { getDaysSince } from '../utils'
import type { SmartChlorStatus } from '../sanitizer'

type Props = {
  status: SmartChlorStatus | null
  lastCheckedDate: string | null
  onClick?: () => void
  /** 'tile' matches ParamTile exactly (short value + one-line sub-label, no
   * badge, no last-checked line) so it sits cleanly in the Dashboard's
   * fixed-width tile grid next to pH/alkalinity/hardness. 'card' is the
   * wider standalone card on the Measurements page, which has room for the
   * last-checked date and the FROG @ease badge. Defaults to 'card'. */
  variant?: 'tile' | 'card'
  style?: React.CSSProperties
}

/** SmartChlor cartridge status — the categorical replacement for a numeric
 * free-chlorine tile/card on a frog_smartchlor installation. Mirrors
 * ParamTile's label → value → sub-label rhythm (value short and single-line,
 * detail pushed to the sub-label, same slot ParamTile uses for "ideal X–Y")
 * so it reads consistently next to the numeric tiles/cards around it. */
export default function SmartChlorCard({ status, lastCheckedDate, onClick, variant = 'card', style }: Props) {
  const { t } = useT()
  const isTile = variant === 'tile'

  const rail = status === 'ok'
    ? 'var(--status-ok-text)'
    : status === 'out'
      ? 'var(--status-danger-text)'
      : 'var(--border)'
  const valueText = status === 'ok' ? t('smartchlor_ok_short') : status === 'out' ? t('smartchlor_out_short') : '—'
  const subText = status === 'ok' ? t('smartchlor_ok_sub') : status === 'out' ? t('smartchlor_out_sub') : t('dash_not_checked')

  const lastCheckedLabel = (() => {
    if (!lastCheckedDate) return null
    const days = getDaysSince(lastCheckedDate)
    if (days === 0) return t('kpi_today').toLowerCase()
    if (days === 1) return t('kpi_yesterday').toLowerCase()
    const prefix = t('kpi_ago')
    return prefix ? `${prefix.toLowerCase()} ${days} ${t('kpi_day_abbr')}` : `${days} ${t('kpi_day_abbr')}`
  })()

  return (
    <button
      className="param-tile"
      onClick={onClick}
      style={{
        '--tile-rail': rail, opacity: status !== null ? 1 : 0.6,
        // The 'card' variant sits in a grid row next to the pH trend chart,
        // which is much taller — grid row-stretch fills this button to match
        // that height, so its (much shorter) content is centered rather than
        // left pinned to the top with a dead gap below it. 'tile' variant
        // skips this: it sits among same-height ParamTile siblings that use
        // plain block flow, so it stays byte-identical to them.
        ...(isTile ? {} : { display: 'flex', flexDirection: 'column', justifyContent: 'center' }),
        ...style,
      } as React.CSSProperties}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t(isTile ? 'dash_smartchlor_title_short' : 'dash_smartchlor_title')}
        </span>
        {status !== null && (
          <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: rail, flexShrink: 0 }} />
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '6px 0 2px' }}>
        <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 22, fontWeight: 500, color: status !== null ? rail : 'var(--text-primary)', lineHeight: 1.1 }}>
          {valueText}
        </span>
      </div>
      <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: 'var(--text-muted)' }}>
        {subText}
      </div>
      {!isTile && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 8 }}>
          {lastCheckedLabel ? (
            <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: 'var(--text-muted)' }}>
              {t('dash_last_measured')} {lastCheckedLabel}
            </div>
          ) : <span />}
          {/* A plain-text nod to the brand (plus the 🐸 emoji, already used
              elsewhere for the FROG strip profile) rather than the FROG®
              mascot artwork — that's King Technology's registered trademark
              and this repo is MIT-licensed and publicly redistributed. */}
          <span style={{
            display: 'flex', alignItems: 'center', gap: 3,
            fontFamily: '"IBM Plex Mono", monospace', fontSize: 9, fontWeight: 600, letterSpacing: '0.03em',
            padding: '2px 6px', borderRadius: 999, flexShrink: 0,
            background: 'var(--status-ok-bg)', color: 'var(--status-ok-text)',
          }}>
            <span aria-hidden="true">🐸</span>
            {t('strip_profile_frog_ease')}
          </span>
        </div>
      )}
    </button>
  )
}
