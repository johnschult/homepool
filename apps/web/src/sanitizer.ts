import type { TranslationKey } from './i18n/translations'

/** Mirrors apps/api/models.py's Installation.sanitizer comment. No shared enum
 * on the backend (plain string, repo convention) — this is the frontend's
 * single canonical alias, replacing what used to be a repeated inline
 * 'bromine' | 'chlorine' | 'salt' union at every call site. */
export type SanitizerType = 'chlorine' | 'bromine' | 'salt' | 'frog_smartchlor'

/** Which test-strip/method profile a measurement was (or should be) taken
 * with. "aquachek" names the app's original, only strip mode; "frog_ease" is
 * new. Mirrors apps/api/models.py's Installation.strip_profile /
 * Action.strip_profile comments. */
export type StripProfileId = 'aquachek' | 'frog_ease'

/** FROG @ease SmartChlor cartridge status — a categorical indicator, not a
 * numeric free-chlorine reading. */
export type SmartChlorStatus = 'ok' | 'out'

export type SanitizerCapabilities = {
  requiresNumericFreeChlorine: boolean
  supportsFreeChlorineTarget: boolean
  supportsChlorineDoseRecommendation: boolean
  supportsSmartChlorStatus: boolean
  defaultStripProfile: StripProfileId
}

/** Centralized capability lookup so sanitizer-specific behavior (which
 * measurement fields render, whether a FC target/recommendation is shown,
 * whether the SmartChlor tiles appear) is driven by a table lookup instead of
 * `if (sanitizer === 'frog_smartchlor')` conditionals scattered through the
 * UI. Mirrors apps/api/water_params.py's SANITIZER_CAPABILITIES. */
export const SANITIZER_CAPABILITIES: Record<SanitizerType, SanitizerCapabilities> = {
  chlorine: {
    requiresNumericFreeChlorine: true,
    supportsFreeChlorineTarget: true,
    supportsChlorineDoseRecommendation: true,
    supportsSmartChlorStatus: false,
    defaultStripProfile: 'aquachek',
  },
  bromine: {
    requiresNumericFreeChlorine: false,
    supportsFreeChlorineTarget: false,
    supportsChlorineDoseRecommendation: false,
    supportsSmartChlorStatus: false,
    defaultStripProfile: 'aquachek',
  },
  salt: {
    requiresNumericFreeChlorine: true,
    supportsFreeChlorineTarget: true,
    supportsChlorineDoseRecommendation: true,
    supportsSmartChlorStatus: false,
    defaultStripProfile: 'aquachek',
  },
  frog_smartchlor: {
    requiresNumericFreeChlorine: false,
    supportsFreeChlorineTarget: false,
    supportsChlorineDoseRecommendation: false,
    supportsSmartChlorStatus: true,
    defaultStripProfile: 'frog_ease',
  },
}

/** Unknown/omitted sanitizer MUST fall back to chlorine's capabilities (never
 * silently suppress free chlorine) — the safety net for any call site that
 * forgets to pass a sanitizer. */
export function sanitizerCapabilities(sanitizer: string | undefined): SanitizerCapabilities {
  return SANITIZER_CAPABILITIES[sanitizer as SanitizerType] ?? SANITIZER_CAPABILITIES.chlorine
}

export type StripMeasurement =
  | 'ph' | 'totalAlkalinity' | 'totalHardness' | 'freeChlorine' | 'totalChlorine' | 'bromine' | 'smartchlorStatus'

export type StripProfile = {
  id: StripProfileId
  nameKey: TranslationKey
  measurements: StripMeasurement[]
  compatibleSanitizers: SanitizerType[]
}

export const STRIP_PROFILES: Record<StripProfileId, StripProfile> = {
  aquachek: {
    id: 'aquachek',
    nameKey: 'strip_profile_aquachek',
    measurements: ['ph', 'totalAlkalinity', 'totalHardness', 'freeChlorine', 'bromine'],
    compatibleSanitizers: ['chlorine', 'bromine', 'salt'],
  },
  frog_ease: {
    id: 'frog_ease',
    nameKey: 'strip_profile_frog_ease',
    measurements: ['ph', 'totalAlkalinity', 'totalHardness', 'smartchlorStatus'],
    compatibleSanitizers: ['frog_smartchlor'],
  },
}

/** Maintenance tasks (by builtin_key) whose completion requires a specific
 * measurement field beyond "any value" — see ActionForm's validation
 * asymmetry between ad hoc entries and task-triggered ones. */
export const TASK_REQUIRED_MEASUREMENT: Record<string, StripMeasurement> = {
  frog_strip_check: 'smartchlorStatus',
}
