import { parseTextFaceKey } from '@/engine/core/lang/cards';

/**
 * A card in full, for the hover line: its name, then every other column as `key value` ("Goblin — attack 3 · color green"); a
 * card with no name gives all its columns ("color red · number 7"). The small face shows only some of them. Null for a face
 * that is not words, or has no columns.
 */
export function cardDetail(faceKey: string): string | null {
  const attrs = parseTextFaceKey(faceKey);
  if (!attrs) return null;
  const { name, ...others } = attrs;
  const columns = Object.entries(others).map(([key, value]) => `${key} ${value}`).join(' · ');
  if (name === undefined) return columns === '' ? null : columns;
  return columns === '' ? name : `${name} — ${columns}`;
}
