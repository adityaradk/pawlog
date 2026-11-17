// Date helpers. Calendar dates are stored as local 'YYYY-MM-DD' strings.

export function toISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO() {
  return toISO(new Date())
}

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso, n) {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

// Whole days from b to a (positive when a is later)
export function diffDays(a, b) {
  return Math.round((parseISO(a) - parseISO(b)) / 86400000)
}

export function formatDate(iso, { weekday = false } = {}) {
  const d = parseISO(iso)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString('en-US', {
    weekday: weekday ? 'short' : undefined,
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  })
}

export function relativeDay(iso) {
  const n = diffDays(iso, todayISO())
  if (n === 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  if (n === -1) return 'Yesterday'
  if (n > 1) return `In ${n} days`
  return `${-n} days ago`
}

// "4 days overdue", "Due today", "Due in 10 days"
export function dueLabel(iso) {
  const n = diffDays(iso, todayISO())
  if (n === 0) return 'Due today'
  if (n === 1) return 'Due tomorrow'
  if (n > 1) return `Due in ${n} days`
  if (n === -1) return '1 day overdue'
  return `${-n} days overdue`
}

export function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function formatDateTime(ts) {
  return `${formatDate(toISO(new Date(ts)))}, ${formatTime(ts)}`
}

export function hourLabel(hour) {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  return formatTime(d)
}

export function ageLabel(birthISO) {
  if (!birthISO) return 'Age unknown'
  const months = Math.floor(diffDays(todayISO(), birthISO) / 30.44)
  if (months < 1) return 'Under 1 month old'
  if (months < 24) return `${months} month${months === 1 ? '' : 's'} old`
  return `${Math.floor(months / 12)} years old`
}
