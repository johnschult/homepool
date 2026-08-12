import { Home, Activity, Clock, ClipboardList, Wrench, Plus } from 'lucide-react'
import { useT } from '../context/LocaleContext'

type Page = 'log' | 'measurements' | 'history' | 'recommendations' | 'maintenance'

type Props = {
  page: Page
  onNavigate: (p: Page) => void
  onAdd: () => void
  /** False once the account has zero installations — only Dashboard ('log')
   * stays usable until the user adds their first pool or spa. */
  hasInstallations?: boolean
}

export default function BottomNav({ page, onNavigate, onAdd, hasInstallations = true }: Props) {
  const { t } = useT()
  const disabled = !hasInstallations
  return (
    <nav className="bottom-nav">
      <button
        className={`bn-item${page === 'log' ? ' active' : ''}`}
        onClick={() => onNavigate('log')}
      >
        <Home size={20} strokeWidth={1.75} aria-hidden="true" />
        {t('nav_log')}
      </button>

      <button
        className={`bn-item${page === 'measurements' ? ' active' : ''}`}
        onClick={() => onNavigate('measurements')}
        disabled={disabled}
        aria-disabled={disabled}
      >
        <Activity size={20} strokeWidth={1.75} aria-hidden="true" />
        {t('nav_measurements')}
      </button>

      <button className="bn-fab" onClick={onAdd} aria-label={t('nav_new_entry_aria')}>
        <Plus size={22} strokeWidth={2} aria-hidden="true" />
      </button>

      <button
        className={`bn-item${page === 'maintenance' ? ' active' : ''}`}
        onClick={() => onNavigate('maintenance')}
        disabled={disabled}
        aria-disabled={disabled}
      >
        <Wrench size={20} strokeWidth={1.75} aria-hidden="true" />
        {t('nav_maintenance')}
      </button>

      <button
        className={`bn-item${page === 'history' ? ' active' : ''}`}
        onClick={() => onNavigate('history')}
        disabled={disabled}
        aria-disabled={disabled}
      >
        <Clock size={20} strokeWidth={1.75} aria-hidden="true" />
        {t('nav_history')}
      </button>

      <button
        className={`bn-item${page === 'recommendations' ? ' active' : ''}`}
        onClick={() => onNavigate('recommendations')}
        disabled={disabled}
        aria-disabled={disabled}
      >
        <ClipboardList size={20} strokeWidth={1.75} aria-hidden="true" />
        {t('nav_recommendations')}
      </button>
    </nav>
  )
}
