import type { FlowDef } from '@/engine/core/flow';
import type { FlowEffect, FlowPredicate, FlowRegistry, TurnPolicy } from '@/engine/core/flow-registry';
import { zoneCards } from '@/engine/core/game-state';
import type { Json } from '@/engine/core/table-def';
import { SEATS } from './cards';
import { trickPlays } from './moves';

const heartsValue = (rank: number) => (rank === 1 ? 14 : rank);

/**
 * True mid-trick (pass to next seat) or right after an award (winner leads).
 *
 * `runFlow` runs after EVERY accepted move, including off-turn `reorder`
 * (allowed mid-trick via `anyActor`) — not just after the play that actually
 * ends the turn. The mid-trick clause therefore only fires for the runFlow
 * immediately following the current turn-holder's own play (`plays[n-1].by
 * === state.turn.current`); a later off-turn reorder must not re-fire it.
 *
 * The `n === 0` winner-leads clause can still re-fire on a post-award
 * reorder, but `heartsNext` deterministically returns the recorded winner in
 * that case, so a repeat firing is a harmless no-op.
 */
const heartsTurnOver: FlowPredicate = (state) => {
  const plays = trickPlays(state);
  const n = plays.length;
  if (n >= 1 && n <= 3) return plays[n - 1].by === state.turn?.current;
  return n === 0 && typeof state.data.trickWinner === 'string' && zoneCards(state, 'trick').length === 0;
};

const setLeaderTwoOfClubs: FlowEffect = (state) => {
  const holder = state.cards.find((c) => c.data?.suit === 'C' && c.data?.rank === 2)!;
  return { ...state, turn: { ...state.turn!, current: holder.zoneId.replace('hand-', '') } };
};

/** Move the completed trick to the winner's pile; record the winner; clear the plays. */
const awardTrick: FlowEffect = (state) => {
  const plays = trickPlays(state);
  const lead = plays[0].suit;
  const winner = plays
    .filter((p) => p.suit === lead)
    .reduce((a, b) => (heartsValue(b.rank) > heartsValue(a.rank) ? b : a)).by;
  const ids = new Set(plays.map((p) => p.cardId));
  return {
    ...state,
    data: { ...state.data, trickPlays: [], trickWinner: winner },
    cards: state.cards.map((c) =>
      ids.has(c.id) ? { ...c, zoneId: `won-${winner}`, faceUp: false, slot: undefined } : c,
    ),
  };
};

/** 1 point per heart, 13 for the queen of spades; lowest score wins the hand. */
const scoreHand: FlowEffect = (state) => {
  const scores: Record<string, number> = {};
  for (const seat of SEATS) {
    scores[seat] = zoneCards(state, `won-${seat}`).reduce((sum, c) => {
      if (c.data?.suit === 'H') return sum + 1;
      if (c.data?.suit === 'S' && c.data?.rank === 12) return sum + 13;
      return sum;
    }, 0);
  }
  const winner = SEATS.reduce((a, b) => (scores[b] < scores[a] ? b : a));
  return { ...state, result: { scores, winner } as unknown as Json };
};

const heartsNext: TurnPolicy = (state, order) => {
  const w = state.data.trickWinner;
  if (trickPlays(state).length === 0 && typeof w === 'string') return w;
  return order[(order.indexOf(state.turn!.current) + 1) % order.length];
};

export function registerHeartsFlow(reg: FlowRegistry): FlowRegistry {
  return reg
    .registerPredicate('heartsTurnOver', heartsTurnOver)
    .registerEffect('setLeaderTwoOfClubs', setLeaderTwoOfClubs)
    .registerEffect('awardTrick', awardTrick)
    .registerEffect('scoreHand', scoreHand)
    .registerPolicy('heartsNext', heartsNext);
}

const HANDS = SEATS.map((s) => `hand-${s}`);
const PASSES = SEATS.map((s) => `pass-${s}`);

export const FLOW: FlowDef = {
  turn: { order: [...SEATS], next: 'heartsNext' },
  phases: [
    {
      id: 'setup',
      allow: [],
      onEnter: [
        { name: 'shuffleZone', params: { zone: 'deck' } },
        ...SEATS.map((s) => ({ name: 'deal', params: { from: 'deck', to: `hand-${s}`, count: 13 } })),
      ],
      advance: { when: 'always', to: 'passing' },
    },
    {
      id: 'passing',
      allow: ['pass', 'reorder'],
      actor: 'any',
      advance: { when: { name: 'zonesCount', params: { zones: PASSES, count: 3 } }, to: 'playing' },
    },
    {
      id: 'playing',
      allow: ['play', 'reorder'],
      actor: 'current',
      anyActor: ['reorder'],
      onEnter: [
        { name: 'moveZone', params: { from: 'pass-p0', to: 'hand-p1' } },
        { name: 'moveZone', params: { from: 'pass-p1', to: 'hand-p2' } },
        { name: 'moveZone', params: { from: 'pass-p2', to: 'hand-p3' } },
        { name: 'moveZone', params: { from: 'pass-p3', to: 'hand-p0' } },
        'setLeaderTwoOfClubs',
      ],
      endTurn: { when: 'heartsTurnOver' },
    },
  ],
  triggers: [{ id: 'award-trick', when: { name: 'zoneCount', params: { zone: 'trick', count: 4 } }, then: ['awardTrick'] }],
  end: [{ when: { name: 'zonesEmpty', params: { zones: [...HANDS, 'trick'] } }, result: 'scoreHand' }],
};
