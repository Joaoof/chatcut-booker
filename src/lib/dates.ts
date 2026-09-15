/*  ISO date helpers (local time, no timezone shifts).  */

export function toISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function fromISO(iso: string) {
  const [year = 1970, month = 1, dayNumber = 1] = iso.split("-").map(Number);
  return new Date(year, month - 1, dayNumber);
}

export function shiftISO(iso: string, delta: number) {
  const date = fromISO(iso);
  date.setDate(date.getDate() + delta);
  return toISO(date);
}

/*  Seven days from `today`, for the week strip.  */
export function weekFrom(today: string) {
  return Array.from({ length: 7 }, (_, index) => shiftISO(today, index));
}
