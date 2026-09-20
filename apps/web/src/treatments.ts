import type { Action, Product, TreatmentProduct } from './types'
import type { TranslationKey } from './i18n/translations'
import { translateLabel, treatmentProductLabel, PRODUCT_ACTION_TYPE } from './utils'
import { PRODUCT_LABELS } from './components/ActionForm'

/** Which product an "Add product" entry was logged with. */
export function treatmentTitle(
  action: Action,
  products: Product[],
  treatments: TreatmentProduct[],
  t: (key: TranslationKey) => string,
): string {
  // The live catalog first, so renaming a product carries through history.
  const current = treatments.find(p => p.id === action.treatment_id)
  if (current) return treatmentProductLabel(current, t)
  // Then the label snapshotted when the entry was logged, which is all that
  // survives once the product is deleted.
  if (action.treatment_label) return action.treatment_label
  // Then the global product table, for entries predating the catalog.
  const legacy = products.find(p => p.id === action.product_id)
  if (legacy) return translateLabel(t, PRODUCT_LABELS, legacy.name)
  return t('action_type_add_product')
}

/** The amount and brand a treatment carries, e.g. "250 g · HTH Super". */
export function treatmentDetail(action: Action): string {
  if (action.action_type !== PRODUCT_ACTION_TYPE) return ''
  return [[action.qty, action.unit].filter(Boolean).join(' '), action.brand]
    .filter(Boolean)
    .join(' · ')
}
