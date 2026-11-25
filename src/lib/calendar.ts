/*
 * Calendar days in LOCAL time. A workout at 23:30 belongs to the day it happened for the
 * user, not to the UTC day (which, in Brazil, would already be tomorrow).
 */

/** Local calendar day as text, e.g. "2026-11-23". Sorts like the dates it stands for. */
export function localDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * The days of a month laid out in weeks that start on Monday (ISO, like the weekly
 * volume): `null` pads the first and last week. Length is always a multiple of 7.
 * `month` is 0-based, as in `Date` (0 = January).
 */
export function monthGrid(year: number, month: number): Array<Date | null> {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // getDay(): 0 = Sunday ... 6 = Saturday. Blanks before the 1st:
  const leading = (first.getDay() + 6) % 7
  const cells: Array<Date | null> = Array.from({ length: leading }, () => null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day))
  }
  while (cells.length % 7 !== 0) {
    cells.push(null)
  }
  return cells
}

/** "novembro de 2026" / "November 2026", in the given locale. */
export function formatMonthYear(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date)
}

/** Weekday initials from Monday to Sunday ("S T Q Q S S D" / "M T W T F S S"). */
export function weekdayInitials(locale: string): string[] {
  const format = new Intl.DateTimeFormat(locale, { weekday: 'narrow' })
  // 2024-01-01 was a Monday.
  return Array.from({ length: 7 }, (_, index) =>
    format.format(new Date(2024, 0, 1 + index)),
  )
}

export type MonthSpan = {
  year: number
  /** 0-based, as in `Date`. */
  month: number
  /** Local midnight of the 1st. */
  start: number
  /** Local midnight of the 1st of the NEXT month (exclusive end). */
  end: number
}

/** The month `offset` months away from the one containing `now` (0 = this month, -1 = last). */
export function monthSpan(now: number, offset = 0): MonthSpan {
  const date = new Date(now)
  const first = new Date(date.getFullYear(), date.getMonth() + offset, 1)
  const next = new Date(first.getFullYear(), first.getMonth() + 1, 1)
  return {
    year: first.getFullYear(),
    month: first.getMonth(),
    start: first.getTime(),
    end: next.getTime(),
  }
}

/** "2026-11": the local month of a moment, as text that sorts like the dates. */
export function monthKey(timestamp: number): string {
  return localDay(new Date(timestamp)).slice(0, 7)
}

/** The calendar year `offset` years away from the one containing `now` ([start, end)). */
export function yearSpan(
  now: number,
  offset = 0,
): { year: number; start: number; end: number } {
  const year = new Date(now).getFullYear() + offset
  return {
    year,
    start: new Date(year, 0, 1).getTime(),
    end: new Date(year + 1, 0, 1).getTime(),
  }
}
