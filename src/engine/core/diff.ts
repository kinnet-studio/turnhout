import type { CardState, Scene } from './scene';

export type DiffOp =
  | { type: 'remove'; id: string }
  | { type: 'add'; card: CardState }
  | { type: 'move'; id: string; fromZoneId: string; toZoneId: string }
  | { type: 'flip'; id: string; faceUp: boolean }
  | { type: 'reface'; id: string; faceKey: string }
  | { type: 'update'; id: string };

/**
 * Reconcile two scenes into an ordered list of {@link DiffOp}s.
 *
 * NOTE (deferred wiring): this is the reconciliation *vocabulary* from the design
 * (add/remove/move/flip/reface/update). It is NOT yet wired into the render path —
 * `TableModel.setScene` (in `./table-model`) owns production reconciliation today via
 * its own render-state map, and `PixiTable.setScene` handles sprite add/remove. This
 * op stream is retained for a future explicit animation-trigger path (e.g. distinct
 * `reface` vs `flip` handling) and is exercised by its unit tests. See the design
 * spec §14 (deferred follow-ups).
 */
export function reconcile(prev: Scene | null, next: Scene): DiffOp[] {
  const prevMap = new Map((prev?.cards ?? []).map((c) => [c.id, c]));
  const nextMap = new Map(next.cards.map((c) => [c.id, c]));

  const removes: DiffOp[] = [];
  const adds: DiffOp[] = [];
  const mods: DiffOp[] = [];

  for (const id of [...prevMap.keys()].sort()) {
    if (!nextMap.has(id)) removes.push({ type: 'remove', id });
  }
  for (const id of [...nextMap.keys()].sort()) {
    const nc = nextMap.get(id)!;
    const pc = prevMap.get(id);
    if (!pc) {
      adds.push({ type: 'add', card: nc });
      continue;
    }
    if (pc.zoneId !== nc.zoneId) mods.push({ type: 'move', id, fromZoneId: pc.zoneId, toZoneId: nc.zoneId });
    if (pc.faceUp !== nc.faceUp) mods.push({ type: 'flip', id, faceUp: nc.faceUp });
    else if (pc.faceKey !== nc.faceKey) mods.push({ type: 'reface', id, faceKey: nc.faceKey });
    if (pc.slot !== nc.slot || pc.draggable !== nc.draggable) mods.push({ type: 'update', id });
  }
  return [...removes, ...adds, ...mods];
}
