// Date logic must follow the *viewer's* calendar, and the bugs it guards
// against (evening in the US is already "tomorrow" in UTC) only show up in a
// zone behind UTC. Pin one so the suite gives the same answer on a UTC CI
// runner as on a laptop.
export function setup(): void {
  process.env.TZ = 'America/New_York'
}
