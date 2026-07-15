import { zoneCards } from './game-state';
import type { FlowEffect, FlowPredicate, FlowRegistry, TurnPolicy } from './flow-registry';
import { shuffleWithRng } from './rng';
import type { Json } from './table-def';

const always: FlowPredicate = () => true;

const zoneEmpty: FlowPredicate = (s, _ctx, p) => zoneCards(s, (p as { zone: string }).zone).length === 0;

const zonesEmpty: FlowPredicate = (s, _ctx, p) =>
  (p as { zones: string[] }).zones.every((z) => zoneCards(s, z).length === 0);

const zoneCount: FlowPredicate = (s, _ctx, p) => {
  const { zone, count } = p as { zone: string; count: number };
  return zoneCards(s, zone).length === count;
};

const zonesCount: FlowPredicate = (s, _ctx, p) => {
  const { zones, count } = p as { zones: string[]; count: number };
  return zones.every((z) => zoneCards(s, z).length === count);
};

const moveZone: FlowEffect = (s, _ctx, p) => {
  const { from, to } = p as { from: string; to: string };
  return { ...s, cards: s.cards.map((c) => (c.zoneId === from ? { ...c, zoneId: to, slot: undefined } : c)) };
};

const setData: FlowEffect = (s, _ctx, p) => {
  const { key, value } = p as { key: string; value: Json };
  return { ...s, data: { ...s.data, [key]: value } };
};

const deal: FlowEffect = (s, _ctx, p) => {
  const { from, to, count, faceUp } = p as { from: string; to: string; count: number; faceUp?: boolean };
  const top = count > 0 ? zoneCards(s, from).slice(-count) : [];
  const ids = new Set(top.map((c) => c.id));
  return {
    ...s,
    cards: s.cards.map((c) =>
      ids.has(c.id) ? { ...c, zoneId: to, slot: undefined, ...(faceUp !== undefined ? { faceUp } : {}) } : c,
    ),
  };
};

const shuffleZone: FlowEffect = (s, _ctx, p) => {
  const zoneId = (p as { zone: string }).zone;
  const inZone = zoneCards(s, zoneId);
  const { items, rng } = shuffleWithRng(inZone, s.rng);
  const slotById = new Map(items.map((c, i) => [c.id, i]));
  return {
    ...s,
    rng,
    cards: s.cards.map((c) => (slotById.has(c.id) ? { ...c, slot: slotById.get(c.id) } : c)),
  };
};

const roundRobin: TurnPolicy = (s, order) => order[(order.indexOf(s.turn!.current) + 1) % order.length];

export function registerCoreFlow(reg: FlowRegistry): FlowRegistry {
  return reg
    .registerPredicate('always', always)
    .registerPredicate('zoneEmpty', zoneEmpty)
    .registerPredicate('zonesEmpty', zonesEmpty)
    .registerPredicate('zoneCount', zoneCount)
    .registerPredicate('zonesCount', zonesCount)
    .registerEffect('moveZone', moveZone)
    .registerEffect('setData', setData)
    .registerEffect('deal', deal)
    .registerEffect('shuffleZone', shuffleZone)
    .registerPolicy('roundRobin', roundRobin);
}
