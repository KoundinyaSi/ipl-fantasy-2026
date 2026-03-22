import { format, formatDistanceToNow, isBefore, subMinutes } from 'date-fns'
import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/** Is voting locked? Locked 30 mins before match start */
export function isVotingLocked(matchDate: string | Date): boolean {
  const date = typeof matchDate === 'string' ? new Date(matchDate) : matchDate
  const lockTime = subMinutes(date, 30)
  return isBefore(lockTime, new Date())
}

/** Format a match date nicely */
export function formatMatchDate(matchDate: string | Date): string {
  const date = typeof matchDate === 'string' ? new Date(matchDate) : matchDate
  return format(date, "EEE, d MMM · h:mm a")
}

/** Format relative time */
export function formatRelativeTime(matchDate: string | Date): string {
  const date = typeof matchDate === 'string' ? new Date(matchDate) : matchDate
  return formatDistanceToNow(date, { addSuffix: true })
}

/** Ordinal suffix for rank numbers */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/** Get initials from a name */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
