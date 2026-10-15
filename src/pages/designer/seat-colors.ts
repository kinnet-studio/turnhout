import type { PlayerId } from '@/engine/core/scene';

/** One color per seat, told apart on the playtest's dark panel and on the board's pale spaces alike. */
export const SEAT_COLORS = ['#e11d48', '#3b82f6', '#16a34a', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];

/** The color of `p<n>`: the n-th of eight, wrapping round for a larger table. */
export function seatColor(seat: PlayerId): string {
  const n = Number(/^p(\d+)$/.exec(seat)?.[1] ?? 0);
  return SEAT_COLORS[n % SEAT_COLORS.length];
}
