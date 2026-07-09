import { canAccept } from './rules';
import { cardById, zoneCards, type GameState } from './game-state';
import type { Move, MoveContext, MoveHandler, MoveRegistry } from './moves';
import { shuffleWithRng } from './rng';
import type { CardState } from './scene';

function zoneById(ctx: MoveContext, id: string) {
  return ctx.tableDef.zones.find((z) => z.id === id);
}

function mapCards(state: GameState, fn: (c: CardState) => CardState): GameState {
  return { ...state, cards: state.cards.map(fn) };
}

const move: MoveHandler = {
  legal(state, m, ctx) {
    const cardId = m.cardId as string;
    const toZone = m.toZone as string;
    const card = cardById(state, cardId);
    if (!card) return `unknown card: ${cardId}`;
    const zone = zoneById(ctx, toZone);
    if (!zone) return `unknown zone: ${toZone}`;
    if (zone.accept && !ctx.rules.has(zone.accept.rule)) return `zone ${toZone} references unknown rule: ${zone.accept.rule}`;
    if (!canAccept(zone, card, zoneCards(state, toZone), ctx.rules)) return `zone ${toZone} rejects ${cardId}`;
    return true;
  },
  apply(state, m) {
    const cardId = m.cardId as string;
    const toZone = m.toZone as string;
    const slot = m.slot as number | undefined;
    return mapCards(state, (c) =>
      c.id === cardId ? { ...c, zoneId: toZone, ...(slot !== undefined ? { slot } : {}) } : c,
    );
  },
};

const flip: MoveHandler = {
  legal(state, m) {
    return cardById(state, m.cardId as string) ? true : `unknown card: ${m.cardId as string}`;
  },
  apply(state, m) {
    const cardId = m.cardId as string;
    const faceUp = m.faceUp as boolean | undefined;
    return mapCards(state, (c) => (c.id === cardId ? { ...c, faceUp: faceUp ?? !c.faceUp } : c));
  },
};

const deal: MoveHandler = {
  legal(state, m) {
    const fromZone = m.fromZone as string;
    const count = m.count as number;
    if (zoneCards(state, fromZone).length < count) return `not enough cards in ${fromZone}`;
    return true;
  },
  apply(state, m) {
    const fromZone = m.fromZone as string;
    const toZone = m.toZone as string;
    const count = m.count as number;
    const faceUp = m.faceUp as boolean | undefined;
    const top = count > 0 ? zoneCards(state, fromZone).slice(-count) : [];
    const ids = new Set(top.map((c) => c.id));
    return mapCards(state, (c) =>
      ids.has(c.id) ? { ...c, zoneId: toZone, ...(faceUp !== undefined ? { faceUp } : {}) } : c,
    );
  },
};

const shuffle: MoveHandler = {
  legal(_state, m, ctx) {
    return zoneById(ctx, m.zoneId as string) ? true : `unknown zone: ${m.zoneId as string}`;
  },
  apply(state, m) {
    const zoneId = m.zoneId as string;
    const inZone = zoneCards(state, zoneId);
    const { items, rng } = shuffleWithRng(inZone, state.rng);
    const slotById = new Map(items.map((c, i) => [c.id, i]));
    return {
      ...state,
      rng,
      cards: state.cards.map((c) => (slotById.has(c.id) ? { ...c, slot: slotById.get(c.id) } : c)),
    };
  },
};

export function registerCoreMoves(registry: MoveRegistry): MoveRegistry {
  return registry.register('move', move).register('flip', flip).register('deal', deal).register('shuffle', shuffle);
}

export type { Move };
