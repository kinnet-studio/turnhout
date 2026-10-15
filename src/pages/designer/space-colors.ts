const UNKNOWN = '#9ca3af';

// A Map, so a name like "constructor" is just an unknown color rather than something inherited.
const COLORS = new Map<string, string>([
  ['brown', '#92572b'],
  ['light blue', '#7dd3fc'],
  ['pink', '#f472b6'],
  ['orange', '#fb923c'],
  ['red', '#ef4444'],
  ['yellow', '#facc15'],
  ['green', '#22c55e'],
  ['dark blue', '#1e40af'],
  ['blue', '#3b82f6'],
  ['purple', '#a855f7'],
  ['black', '#111827'],
  ['white', '#ffffff'],
  ['gray', UNKNOWN],
  ['grey', UNKNOWN],
]);

/** The paint for a space's `color` text; gray for a name we have no paint for, and no band at all for no color. */
export function spaceColor(name: string | null): string | null {
  if (name === null) return null;
  return COLORS.get(name.trim().replace(/\s+/g, ' ').toLowerCase()) ?? UNKNOWN;
}
