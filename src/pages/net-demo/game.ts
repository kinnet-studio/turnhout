import { GameEngine } from '@/engine/core/game-engine';
import { cardById, nextPlayer, zoneCards, type GameState } from '@/engine/core/game-state';
import { MoveRegistry, type MoveHandler } from '@/engine/core/moves';
import { registerCoreMoves } from '@/engine/core/moves-library';
import { makeRng } from '@/engine/core/rng';
import { canAccept, RuleRegistry } from '@/engine/core/rules';
import { registerStarterRules } from '@/engine/core/rules-library';
import type { CardState } from '@/engine/core/scene';
import type { TableDef } from '@/engine/core/table-def';
import { GameServer } from '@/engine/net/game-server';

export const TABLE: TableDef = {
  players: ['me', 'opp'],
  zones: [
    { id: 'deck', layout: 'pile', transform: { x: -350, y: 0 }, layoutOptions: { jitter: 0.02 }, visibility: 'secret' },
    { id: 'discard', layout: 'pile', transform: { x: 350, y: 0 }, visibility: 'public' },
    { id: 'hand-me', layout: 'fan', transform: { x: 0, y: 300 }, layoutOptions: { fanAngleDeg: 24 }, owner: 'me', visibility: 'owner', ordering: 'free' },
    { id: 'hand-opp', layout: 'fan', transform: { x: 0, y: -300 }, layoutOptions: { fanAngleDeg: 24 }, owner: 'opp', visibility: 'owner', ordering: 'free' },
  ],
};

/** Play a card: only on your turn, and only from a zone you own or that is shared. */
const play: MoveHandler = {
  legal(state, m, ctx) {
    const by = m.by as string;
    if (state.turn && state.turn.current !== by) return 'not your turn';
    const card = cardById(state, m.cardId as string);
    if (!card) return `unknown card: ${m.cardId as string}`;
    const from = ctx.tableDef.zones.find((z) => z.id === card.zoneId);
    if (from?.owner && from.owner !== 'shared' && from.owner !== by) return 'not your card';
    const to = ctx.tableDef.zones.find((z) => z.id === (m.toZone as string));
    if (!to) return `unknown zone: ${m.toZone as string}`;
    if (to.accept && !ctx.rules.has(to.accept.rule)) return `unknown rule: ${to.accept.rule}`;
    if (!canAccept(to, card, zoneCards(state, to.id), ctx.rules)) return `zone ${to.id} rejects card`;
    return true;
  },
  apply(state, m) {
    const cardId = m.cardId as string;
    const toZone = m.toZone as string;
    return { ...state, cards: state.cards.map((c) => (c.id === cardId ? { ...c, zoneId: toZone, slot: undefined } : c)) };
  },
};

/** End your turn (passes to the other seat). */
const endTurn: MoveHandler = {
  legal: (s, m) => (s.turn?.current === (m.by as string) ? true : 'not your turn'),
  apply: (s) => nextPlayer(s, ['me', 'opp']),
};

function demoDeck(): CardState[] {
  const suits = ['S', 'H', 'D', 'C'];
  const cards: CardState[] = [];
  let n = 0;
  for (const s of suits) {
    for (let r = 1; r <= 13; r++) cards.push({ id: `c${n++}`, zoneId: 'deck', faceUp: false, faceKey: `${r}${s}`, data: { suit: s, rank: r } });
  }
  return cards;
}

export function createDemoServer(): GameServer {
  const moves = registerCoreMoves(new MoveRegistry()).register('play', play).register('endTurn', endTurn);
  const initial: GameState = { cards: demoDeck(), turn: { current: 'me' }, data: {}, rng: makeRng(20260709) };
  const engine = new GameEngine({ tableDef: TABLE, rules: registerStarterRules(new RuleRegistry()), moves, initial });
  // Deal 3 face-down to each hand as setup (core `deal` ignores `by`).
  engine.dispatch({ type: 'deal', fromZone: 'deck', toZone: 'hand-me', count: 3 });
  engine.dispatch({ type: 'deal', fromZone: 'deck', toZone: 'hand-opp', count: 3 });
  return new GameServer({ engine, tableDef: TABLE, seats: ['me', 'opp'] });
}
