import { useEffect, useState } from 'react'

/** The current time, refreshed on an interval — keeps relative labels ("10 min.
 * ago") and "today" from going stale while a page sits open. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
