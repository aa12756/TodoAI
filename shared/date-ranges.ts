/** 周一 00:00:00.000（本地） */
export function startOfWeekMonday(anchor = new Date()): Date {
  const d = new Date(anchor)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

export function endOfWeekSunday(weekStartMonday: Date): Date {
  const d = new Date(weekStartMonday)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

export function startOfMonth(anchor = new Date()): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth(), 1, 0, 0, 0, 0)
}

export function endOfMonth(anchor = new Date()): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function dueInRange(iso: string, start: Date, end: Date): boolean {
  const due = new Date(iso)
  if (Number.isNaN(due.getTime())) return false
  return due >= start && due <= end
}
