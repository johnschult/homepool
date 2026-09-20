import { useEffect, useState } from 'react'
import type { TreatmentProduct } from '../types'

/** The active installation's treatment catalog, for resolving a logged
 * treatment's product name so a rename reads through to every entry. A failed
 * load degrades to an empty catalog — callers fall back to the label
 * snapshotted on the entry rather than blanking the list. */
export function useTreatments(installationId: number | undefined): TreatmentProduct[] {
  const [treatments, setTreatments] = useState<TreatmentProduct[]>([])
  useEffect(() => {
    if (installationId === undefined) return
    let cancelled = false
    fetch(`/api/installations/${installationId}/treatments`, { credentials: 'same-origin' })
      .then(r => (r.ok ? r.json() : []))
      .then((data: TreatmentProduct[]) => { if (!cancelled) setTreatments(Array.isArray(data) ? data : []) })
      .catch(() => { /* snapshotted labels still render */ })
    return () => { cancelled = true }
  }, [installationId])
  return treatments
}
