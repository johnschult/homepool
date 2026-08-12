import { useT } from '../context/LocaleContext'
import { getDaysSince } from '../utils'
import type { SmartChlorStatus } from '../sanitizer'

type Props = {
  status: SmartChlorStatus | null
  lastCheckedDate: string | null
  onClick?: () => void
}

/** Dashboard tile for the FROG @ease SmartChlor cartridge status — the
 * categorical replacement for a numeric free-chlorine tile on a
 * frog_smartchlor installation. Same card shape/sizing as ParamTile so it
 * sits in the tile grid, but has no numeric range/sparkline: cartridge status
 * has neither. */
export default function SmartChlorCard({ status, lastCheckedDate, onClick }: Props) {
  const { t } = useT()

  const rail = status === 'ok'
    ? 'var(--status-ok-text)'
    : status === 'out'
      ? 'var(--status-danger-text)'
      : 'var(--border)'
  const valueText = status === 'ok' ? t('smartchlor_ok') : status === 'out' ? t('smartchlor_out') : t('dash_not_checked')

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
      style={{ '--tile-rail': rail, opacity: status !== null ? 1 : 0.6 } as React.CSSProperties}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t('dash_smartchlor_title')}
        </span>
        {status !== null && (
          <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: rail, flexShrink: 0 }} />
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '6px 0 2px' }}>
        <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 15, fontWeight: 500, color: status !== null ? rail : 'var(--text-primary)', lineHeight: 1.2 }}>
          {valueText}
        </span>
      </div>
      {lastCheckedLabel && (
        <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: 'var(--text-muted)' }}>
          {t('dash_last_measured')} {lastCheckedLabel}
        </div>
      )}
    </button>
  )
}
