import { useT } from '../context/LocaleContext'
import { getDaysSince } from '../utils'
import type { SmartChlorStatus } from '../sanitizer'

type Props = {
  status: SmartChlorStatus | null
  lastCheckedDate: string | null
  onClick?: () => void
  /** 'tile' matches ParamTile exactly (short value + one-line sub-label, no
   * last-checked line) so it sits cleanly in the Dashboard's fixed-width
   * tile grid next to pH/alkalinity/hardness. 'card' is the wider standalone
   * card on the Measurements page, which has room to also show the
   * last-checked date. Defaults to 'card'. */
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
  // Measurements page renders this with no onClick at all (there's nowhere
  // to navigate to from there) — a <button> with pointer/hover affordance
  // that does nothing on click reads as broken, so it's a plain <div> then.
  const Tag = onClick ? 'button' : 'div'
  const className = `param-tile${onClick ? '' : ' param-tile-static'}`

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

  const labelRow = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {/* The 🐸 emoji, not the FROG® mascot artwork — that's King
            Technology's registered trademark and this repo is MIT-licensed
            and publicly redistributed. Already used elsewhere (the strip
            profile picker) for the same reason. */}
        <span aria-hidden="true">🐸</span>
        <span>{t(isTile ? 'dash_smartchlor_title_short' : 'dash_smartchlor_title')}</span>
      </span>
      {status !== null && (
        <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: rail, flexShrink: 0 }} />
      )}
    </div>
  )

  const valueBlock = (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '6px 0 2px' }}>
        <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 22, fontWeight: 500, color: status !== null ? rail : 'var(--text-primary)', lineHeight: 1.1 }}>
          {valueText}
        </span>
      </div>
      <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: 'var(--text-muted)' }}>
        {subText}
      </div>
    </>
  )

  if (isTile) {
    return (
      <Tag
        className={className}
        onClick={onClick}
        style={{ '--tile-rail': rail, opacity: status !== null ? 1 : 0.6, display: 'flex', flexDirection: 'column', ...style } as React.CSSProperties}
      >
        {labelRow}
        {/* ParamTile siblings grow taller once they have a sparkline (2+
            history points) — this tile has no chart to fill that same
            space, so the value/sub-label center in whatever's left below
            the label instead of being stranded at the top. The label row
            above stays put, so it keeps lining up with siblings' labels. */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {valueBlock}
        </div>
      </Tag>
    )
  }

  return (
    <Tag
      className={className}
      onClick={onClick}
      style={{
        '--tile-rail': rail, opacity: status !== null ? 1 : 0.6,
        // This card sits in a grid row next to the pH trend chart, which is
        // much taller — grid row-stretch fills this button to match that
        // height. The title stays pinned at the top (matching the pH trend
        // card's title, which never moves), and only the value/status block
        // below it centers in the leftover space.
        display: 'flex', flexDirection: 'column',
        ...style,
      } as React.CSSProperties}
    >
      {labelRow}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {valueBlock}
        {lastCheckedLabel && (
          <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
            {t('dash_last_measured')} {lastCheckedLabel}
          </div>
        )}
      </div>
    </Tag>
  )
}
