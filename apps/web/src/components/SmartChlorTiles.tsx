import { useT } from '../context/LocaleContext'
import type { SmartChlorStatus } from '../sanitizer'

type Props = {
  value: SmartChlorStatus | ''
  onChange: (value: SmartChlorStatus | '') => void
  /** True when this field is required (opened from the FROG-strip-check
   * maintenance task) and hasn't been answered yet — draws attention with the
   * same danger-toned outline a required-but-empty field gets elsewhere. */
  invalid?: boolean
}

const TILES: { status: SmartChlorStatus; labelKey: 'smartchlor_ok' | 'smartchlor_out' }[] = [
  { status: 'out', labelKey: 'smartchlor_out' },
  { status: 'ok', labelKey: 'smartchlor_ok' },
]

/** Two mutually-exclusive status tiles — OK / OUT — for the FROG @ease
 * SmartChlor cartridge indicator. Deliberately not a numeric swatch/zone
 * picker like StripMode's other rows: cartridge status is categorical, not a
 * value read off a color gradient, and must never be conflated with a
 * free-chlorine reading. */
export default function SmartChlorTiles({ value, onChange, invalid }: Props) {
  const { t } = useT()
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontFamily: '"Sora", sans-serif', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
          {t('smartchlor_label')}
        </span>
      </div>
      <p style={{
        fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--text-muted)', margin: '0 0 6px',
      }}>
        {t('smartchlor_instruction')}
      </p>
      <div style={{ display: 'flex', gap: 4 }}>
        {TILES.map(({ status, labelKey }) => {
          const selected = value === status
          const tone = status === 'ok'
            ? { bg: 'var(--status-ok-bg)', color: 'var(--status-ok-text)' }
            : { bg: 'var(--status-danger-bg)', color: 'var(--status-danger-text)' }
          return (
            <button
              key={status}
              type="button"
              onClick={() => onChange(selected ? '' : status)}
              style={{
                flex: 1,
                height: 34,
                borderRadius: 6,
                fontFamily: '"Sora", sans-serif',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'border-color 0.12s, background 0.12s, color 0.12s',
                background: selected ? tone.bg : 'var(--bg-surface-2)',
                color: selected ? tone.color : 'var(--text-secondary)',
                border: selected
                  ? `2.5px solid ${tone.color}`
                  : invalid
                    ? '2.5px solid var(--status-danger-text)'
                    : '2.5px solid transparent',
              }}
            >
              {t(labelKey)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
