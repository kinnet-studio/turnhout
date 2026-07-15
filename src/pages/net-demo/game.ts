import type { FlowDef } from '@/engine/core/flow';
import { registerCoreFlow } from '@/engine/core/flow-library';
import { FlowRegistry } from '@/engine/core/flow-registry';
import { GameEngine } from '@/engine/core/game-engine';
import { cardById, nextPlayer, zoneCards, type GameState } from '@/engine/core/game-state';
import { MoveRegistry, type MoveHandler } from '@/engine/core/moves';
import { registerCoreMoves } from '@/engine/core/moves-library';
import { makeRng, shuffleWithRng } from '@/engine/core/rng';
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

const FLOW: FlowDef = {
  turn: { order: ['me', 'opp'] },
  phases: [
    {
      id: 'setup',
      allow: [],
      onEnter: [
        { name: 'deal', params: { from: 'deck', to: 'hand-me', count: 3 } },
        { name: 'deal', params: { from: 'deck', to: 'hand-opp', count: 3 } },
      ],
      advance: { when: 'always', to: 'main' },
    },
    { id: 'main', allow: ['play', 'endTurn', 'reorder'], actor: 'current', anyActor: ['reorder'] },
  ],
};

/** Play a card: only on your turn, and only from a zone you own or that is shared. */
const play: MoveHandler = {
  legal(state, m, ctx) {
    const by = m.by as string;
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

/** End your turn (passes to the other seat). Turn ownership is enforced by the flow gate. */
const endTurn: MoveHandler = {
  legal: () => true,
  apply: (s) => nextPlayer(s, ['me', 'opp']),
};

function demoDeck(rng: ReturnType<typeof makeRng>): { cards: CardState[]; rng: ReturnType<typeof makeRng> } {
  const suits = ['S', 'H', 'D', 'C'];
  const identities: { suit: string; rank: number }[] = [];
  for (const s of suits) for (let r = 1; r <= 13; r++) identities.push({ suit: s, rank: r });
  const { items, rng: next } = shuffleWithRng(identities, rng);
  return {
    cards: items.map(({ suit, rank }, i) => ({
      id: `c${i}`, zoneId: 'deck', faceUp: false, faceKey: `${rank}${suit}`, data: { suit, rank },
    })),
    rng: next,
  };
}

export function createDemoServer(): GameServer {
  const moves = registerCoreMoves(new MoveRegistry()).register('play', play).register('endTurn', endTurn);
  const { cards, rng } = demoDeck(makeRng(20260709));
  const initial: GameState = { cards, turn: { current: 'me' }, data: {}, rng };
  const engine = new GameEngine({
    tableDef: TABLE,
    rules: registerStarterRules(new RuleRegistry()),
    moves,
    initial,
    flow: FLOW,
    flowRegistry: registerCoreFlow(new FlowRegistry()),
  });
  return new GameServer({ engine, tableDef: TABLE, seats: ['me', 'opp'] });
}
