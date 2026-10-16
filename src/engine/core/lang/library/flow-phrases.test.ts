import { describe, expect, it } from 'vitest';
import type { GameEngine } from '../../game-engine';
import { zoneCards, type GameState } from '../../game-state';
import { shuffleWithRng } from '../../rng';
import type { CardState } from '../../scene';
import { RuleError } from '../diagnostics';
import { TURN_KEY, TURN_ROLLS_KEY, interruptedTurn, markOut, playerFact, queueRoll, setPlayerFact, withBoardData } from '../board-state';
import { createEngine, initialState, seatsFor } from '../build';
import { compileGame } from '../compile';
import { INTERRUPT_BOARD, fixtureBoardGame, fixtureBoardState, fixtureCard, fixtureEnv, fixtureGame, fixtureState, runPhrase } from '../testing';
import type { CompiledGame, PhraseKind, PhraseEnv } from '../types';
import { WINNER_KEY } from '../zones';
import { createDefaultLibrary } from './index';

const lib = createDefaultLibrary();
const run = <T = unknown>(kind: PhraseKind, text: string, env: PhraseEnv, ...extra: unknown[]) => runPhrase<T>(lib, kind, text, env, ...extra);

const ids = (state: GameState, zoneId: string) => zoneCards(state, zoneId).map((c) => c.id);
/** `count` cards named `${prefix}0`… in a zone, in slot order; the suit and rank are filler. */
const pile = (zoneId: string, prefix: string, count: number): CardState[] =>
  Array.from({ length: count }, (_, i) => fixtureCard(`${prefix}${i}`, zoneId, { suit: 'C', rank: i + 2 }, { slot: i }));
const std = (id: string, zoneId: string, suit: string, rank: number) => fixtureCard(id, zoneId, { suit, rank });

describe('count conditions', () => {
  it('has N cards: a single zone must hold exactly N', () => {
    const env = fixtureEnv(fixtureState(pile('trick', 't', 4)));
    expect(run('condition', 'the trick has 4 cards', env)).toBe(true);
    expect(run('condition', 'the trick has 3 cards', env)).toBe(false);
  });
  it('accepts the singular “card”', () => {
    const env = fixtureEnv(fixtureState(pile('trick', 't', 1)));
    expect(run('condition', 'the trick has 1 card', env)).toBe(true);
  });
  it('every pass pile has 3 cards — every zone must match', () => {
    const cards = [...pile('pass-pile-p0', 'a', 3), ...pile('pass-pile-p1', 'b', 3), ...pile('pass-pile-p2', 'c', 2)];
    const seats = ['p0', 'p1', 'p2'];
    const env = fixtureEnv(fixtureState(cards), { seats });
    expect(run('condition', 'every pass pile has 3 cards', env)).toBe(false);
    const full = fixtureEnv(fixtureState([...cards, fixtureCard('c9', 'pass-pile-p2', { suit: 'H', rank: 5 })]), { seats });
    expect(run('condition', 'every pass pile has 3 cards', full)).toBe(true);
  });
  it('their zone is the acting player’s own', () => {
    const state = fixtureState([...pile('pass-pile-p1', 'a', 2), ...pile('pass-pile-p2', 'b', 3)]);
    const move = (by: string) => ({ verb: 'pass', by, cardId: 'a0', from: `hand-${by}`, to: `pass-pile-${by}` });
    expect(run('condition', 'their pass pile has fewer than 3 cards', fixtureEnv(state, { move: move('p1') }))).toBe(true);
    expect(run('condition', 'their pass pile has fewer than 3 cards', fixtureEnv(state, { move: move('p2') }))).toBe(false);
  });
  it('has fewer than N cards', () => {
    const cards = [...pile('trick', 't', 2), ...pile('pass-pile-p0', 'a', 1), ...pile('pass-pile-p1', 'b', 3)];
    const env = fixtureEnv(fixtureState(cards), { seats: ['p0', 'p1'] });
    expect(run('condition', 'the trick has fewer than 3 cards', env)).toBe(true);
    expect(run('condition', 'the trick has fewer than 2 cards', env)).toBe(false);
    expect(run('condition', 'each pass pile has fewer than 4 cards', env)).toBe(true);
    expect(run('condition', 'each pass pile has fewer than 3 cards', env)).toBe(false);
  });
  it('has more than N cards', () => {
    const cards = [...pile('trick', 't', 3), ...pile('hand-p0', 'a', 5), ...pile('hand-p1', 'b', 2)];
    const env = fixtureEnv(fixtureState(cards), { seats: ['p0', 'p1'] });
    expect(run('condition', 'the trick has more than 2 cards', env)).toBe(true);
    expect(run('condition', 'the trick has more than 3 cards', env)).toBe(false);
    expect(run('condition', 'each hand has more than 1 card', env)).toBe(true);
    expect(run('condition', 'each hand has more than 2 cards', env)).toBe(false);
  });
});

describe('empty conditions', () => {
  const cards = [...pile('hand-p0', 'a', 2), ...pile('trick', 't', 1)];
  const env = fixtureEnv(fixtureState(cards), { seats: ['p0', 'p1'] });
  it('is empty / is not empty for a single zone', () => {
    expect(run('condition', 'the trick is empty', env)).toBe(false);
    expect(run('condition', 'the trick is not empty', env)).toBe(true);
    expect(run('condition', 'the discard pile is empty', env)).toBe(true);
    expect(run('condition', 'the discard pile is not empty', env)).toBe(false);
  });
  it('is empty / is not empty for each zone', () => {
    // p0 holds cards, p1 holds none
    expect(run('condition', 'each hand is empty', env)).toBe(false);
    expect(run('condition', 'each hand is not empty', env)).toBe(false);
    const emptyHands = fixtureEnv(fixtureState([]), { seats: ['p0', 'p1'] });
    expect(run('condition', 'each hand is empty', emptyHands)).toBe(true);
    const fullHands = fixtureEnv(fixtureState([...cards, ...pile('hand-p1', 'b', 1)]), { seats: ['p0', 'p1'] });
    expect(run('condition', 'each hand is not empty', fullHands)).toBe(true);
  });
  it('a list of zones is empty when every one of them is', () => {
    expect(run('condition', 'every hand and the trick are empty', env)).toBe(false);
    const onlyHand = fixtureEnv(fixtureState(pile('hand-p1', 'b', 1)), { seats: ['p0', 'p1'] });
    expect(run('condition', 'every hand and the trick are empty', onlyHand)).toBe(false);
    const nothing = fixtureEnv(fixtureState(pile('deck', 'd', 5)), { seats: ['p0', 'p1'] });
    expect(run('condition', 'every hand and the trick are empty', nothing)).toBe(true);
    expect(run('condition', 'the trick and the discard pile are empty', nothing)).toBe(true);
  });
  it('a player’s zone is empty when some seat has none', () => {
    expect(run('condition', "a player's hand is empty", env)).toBe(true);
    const full = fixtureEnv(fixtureState([...cards, ...pile('hand-p1', 'b', 1)]), { seats: ['p0', 'p1'] });
    expect(run('condition', "a player's hand is empty", full)).toBe(false);
  });
  it('a zone named in the plural is not empty with its cards: their kept cards are not empty', () => {
    const game = fixtureGame({ zones: [...fixtureGame().zones, { name: 'kept cards', perPlayer: true, layout: 'row', visibility: 'public' }] });
    const state = fixtureState(pile('kept-cards-p1', 'k', 1));
    const about = (by: string) => fixtureEnv(state, { game, seats: ['p0', 'p1'], subject: { player: by, space: null, card: null } });
    expect(run('condition', 'their kept cards are not empty', about('p1'))).toBe(true);
    expect(run('condition', 'their kept cards are not empty', about('p0'))).toBe(false);
  });
});

describe('shuffle', () => {
  const deck = pile('deck', 'd', 6);
  const state = fixtureState([...deck, ...pile('trick', 't', 2)]);

  it('reorders the zone with the game’s own rng and rewrites the slots', () => {
    const out = run<GameState>('effect', 'shuffle the deck', fixtureEnv(state));
    const expected = shuffleWithRng(zoneCards(state, 'deck'), state.rng);
    expect(ids(out, 'deck')).toEqual(expected.items.map((c) => c.id));
    expect(zoneCards(out, 'deck').map((c) => c.slot)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(out.rng).toEqual(expected.rng);
    expect(out.rng.count).toBeGreaterThan(state.rng.count);
    expect(ids(out, 'trick')).toEqual(['t0', 't1']);
  });
  it('is the same shuffle every time for the same rng', () => {
    const again = run<GameState>('effect', 'shuffle the deck', fixtureEnv(state));
    expect(again.cards).toEqual(run<GameState>('effect', 'shuffle the deck', fixtureEnv(state)).cards);
  });
  it('shuffles every zone of “each hand”', () => {
    const hands = fixtureState([...pile('hand-p0', 'a', 4), ...pile('hand-p1', 'b', 4)]);
    const out = run<GameState>('effect', 'shuffle each hand', fixtureEnv(hands, { seats: ['p0', 'p1'] }));
    expect(ids(out, 'hand-p0').sort()).toEqual(['a0', 'a1', 'a2', 'a3']);
    expect(ids(out, 'hand-p1').sort()).toEqual(['b0', 'b1', 'b2', 'b3']);
    expect(out.rng.count).toBeGreaterThan(hands.rng.count);
  });
});

describe('deal', () => {
  const seats = ['p0', 'p1', 'p2'];
  const six = fixtureState(pile('deck', 'c', 6));

  it('deal moves the top cards to each seat in order', () => {
    const out = run<GameState>('effect', 'Deal 2 cards from the deck to each hand', fixtureEnv(six, { seats }));
    expect(ids(out, 'hand-p0')).toEqual(['c4', 'c5']);
    expect(ids(out, 'hand-p1')).toEqual(['c2', 'c3']);
    expect(ids(out, 'hand-p2')).toEqual(['c0', 'c1']);
    expect(ids(out, 'deck')).toEqual([]);
    expect(out.cards.every((c) => c.faceUp === false)).toBe(true);
  });
  it('deals to a single zone too, face up when that zone is public', () => {
    const out = run<GameState>('effect', 'deal 2 cards from the deck to the trick', fixtureEnv(six, { seats }));
    expect(ids(out, 'trick')).toEqual(['c4', 'c5']);
    expect(ids(out, 'deck')).toEqual(['c0', 'c1', 'c2', 'c3']);
    expect(zoneCards(out, 'trick').every((c) => c.faceUp)).toBe(true);
  });
  it('stops with a readable message when the deck runs out', () => {
    const dealTo = (n: number) => () => run('effect', `deal ${n} cards from the deck to each hand`, fixtureEnv(six, { seats }));
    expect(dealTo(4)).toThrow(RuleError);
    expect(dealTo(4)).toThrow('Only 2 cards are left in the deck.');
    expect(dealTo(3)).toThrow('There are no cards left in the deck.');
    const one = fixtureState(pile('deck', 'c', 1));
    expect(() => run('effect', 'deal 2 cards from the deck to the trick', fixtureEnv(one))).toThrow('Only 1 card is left in the deck.');
  });
  it('names the zone it dealt from', () => {
    const state = fixtureState(pile('discard-pile', 'c', 1));
    expect(() => run('effect', 'deal 2 cards from the discard pile to the trick', fixtureEnv(state))).toThrow(
      'Only 1 card is left in the discard pile.',
    );
  });
  it('deals nothing for 0 cards and refuses a negative number', () => {
    expect(run<GameState>('effect', 'deal 0 cards from the deck to each hand', fixtureEnv(six, { seats })).cards).toEqual(six.cards);
    expect(() => run('effect', 'deal -1 cards from the deck to each hand', fixtureEnv(six, { seats }))).toThrow(RuleError);
  });
  it('deals from one zone at a time', () => {
    expect(() => run('effect', 'deal 1 cards from each hand to the trick', fixtureEnv(six, { seats }))).toThrow(
      'each hand is more than one zone, but this rule needs just one.',
    );
  });
});

describe('moving cards', () => {
  it('moves everything in a zone to another, the winner’s won pile included', () => {
    const state = fixtureState([...pile('trick', 't', 3), fixtureCard('x', 'deck', {})], { data: { [WINNER_KEY]: 'p2' } });
    const out = run<GameState>('effect', "Move the trick to the winner's won pile", fixtureEnv(state));
    expect(ids(out, 'won-pile-p2')).toEqual(['t0', 't1', 't2']);
    expect(zoneCards(out, 'won-pile-p2').every((c) => c.faceUp)).toBe(true);
    expect(ids(out, 'trick')).toEqual([]);
    expect(ids(out, 'deck')).toEqual(['x']);
  });
  it('appends after what the target already holds', () => {
    const state = fixtureState([...pile('trick', 't', 2), ...pile('discard-pile', 'd', 2)]);
    const out = run<GameState>('effect', 'move the trick to the discard pile', fixtureEnv(state));
    expect(ids(out, 'discard-pile')).toEqual(['d0', 'd1', 't0', 't1']);
  });
  it('gathers every zone of “each …” into the one target, in seat order', () => {
    const state = fixtureState([...pile('pass-pile-p1', 'b', 2), ...pile('pass-pile-p0', 'a', 1)]);
    const out = run<GameState>('effect', 'move each pass pile to the deck', fixtureEnv(state, { seats: ['p0', 'p1'] }));
    expect(ids(out, 'deck')).toEqual(['a0', 'b0', 'b1']);
    expect(ids(out, 'pass-pile-p0')).toEqual([]);
    expect(ids(out, 'pass-pile-p1')).toEqual([]);
  });
  it('needs a winner to move cards to the winner’s pile', () => {
    expect(() => run('effect', "move the trick to the winner's won pile", fixtureEnv(fixtureState(pile('trick', 't', 1))))).toThrow(
      'There is no winner yet.',
    );
  });
  it('moves the target only into one zone', () => {
    expect(() => run('effect', 'move the trick to each hand', fixtureEnv(fixtureState(pile('trick', 't', 1))))).toThrow(RuleError);
  });
  it('moves the top card of a zone', () => {
    const state = fixtureState(pile('deck', 'd', 3));
    const out = run<GameState>('effect', 'Move the top card of the deck to the discard pile', fixtureEnv(state));
    expect(ids(out, 'discard-pile')).toEqual(['d2']);
    expect(ids(out, 'deck')).toEqual(['d0', 'd1']);
    expect(zoneCards(out, 'discard-pile')[0].faceUp).toBe(true);
  });
  it('has no top card to move from an empty zone', () => {
    expect(() => run('effect', 'move the top card of the deck to the discard pile', fixtureEnv(fixtureState([])))).toThrow(
      'There is no card to move: the deck is empty.',
    );
  });
  it('shuffles all but the top card of one zone into another', () => {
    const state = fixtureState([...pile('discard-pile', 'd', 5), ...pile('deck', 'x', 1)]);
    const out = run<GameState>('effect', 'Shuffle the discard pile, except its top card, into the deck', fixtureEnv(state));
    const expected = shuffleWithRng(pile('discard-pile', 'd', 5).slice(0, 4), state.rng);
    expect(ids(out, 'discard-pile')).toEqual(['d4']);
    expect(ids(out, 'deck')).toEqual(['x0', ...expected.items.map((c) => c.id)]);
    expect(zoneCards(out, 'deck').every((c) => !c.faceUp)).toBe(true);
    expect(out.rng).toEqual(expected.rng);
  });
  it('leaves a one-card zone alone when shuffling all but its top card', () => {
    const state = fixtureState(pile('discard-pile', 'd', 1));
    const out = run<GameState>('effect', 'shuffle the discard pile, except its top card, into the deck', fixtureEnv(state));
    expect(ids(out, 'discard-pile')).toEqual(['d0']);
    expect(ids(out, 'deck')).toEqual([]);
    expect(out.rng).toEqual(state.rng);
  });
  it('pass piles go left', () => {
    const state = fixtureState([...pile('pass-pile-p0', 'a', 2), ...pile('pass-pile-p1', 'b', 2), ...pile('pass-pile-p2', 'c', 2), ...pile('hand-p0', 'h', 1)]);
    const out = run<GameState>(
      'effect', "Each pass pile goes to the hand of the player on its owner's left", fixtureEnv(state, { seats: ['p0', 'p1', 'p2'] }),
    );
    expect(ids(out, 'hand-p1')).toEqual(['a0', 'a1']);
    expect(ids(out, 'hand-p2')).toEqual(['b0', 'b1']);
    expect(ids(out, 'hand-p0')).toEqual(['h0', 'c0', 'c1']);
    expect(['pass-pile-p0', 'pass-pile-p1', 'pass-pile-p2'].flatMap((z) => ids(out, z))).toEqual([]);
    expect(out.cards.every((c) => c.faceUp === false)).toBe(true);
  });
  it('passing is worked out for every seat before any card moves', () => {
    const state = fixtureState([...pile('hand-p0', 'a', 2), ...pile('hand-p1', 'b', 2), ...pile('hand-p2', 'c', 2)]);
    const out = run<GameState>(
      'effect', "each hand goes to the hand of the player on its owner's left", fixtureEnv(state, { seats: ['p0', 'p1', 'p2'] }),
    );
    expect(ids(out, 'hand-p0')).toEqual(['c0', 'c1']);
    expect(ids(out, 'hand-p1')).toEqual(['a0', 'a1']);
    expect(ids(out, 'hand-p2')).toEqual(['b0', 'b1']);
  });
});

describe('who goes next', () => {
  const turn = { current: 'p1', phase: 'playing' };
  it('the winner goes next', () => {
    const state = fixtureState([], { turn, data: { [WINNER_KEY]: 'p3' } });
    const out = run<GameState>('effect', 'The winner goes next', fixtureEnv(state));
    expect(out.turn).toEqual({ current: 'p3', phase: 'playing', chosen: true });
  });
  it('the winner goes next marks the choice even for the same player', () => {
    const state = fixtureState([], { turn, data: { [WINNER_KEY]: 'p1' } });
    expect(run<GameState>('effect', 'the winner goes next', fixtureEnv(state)).turn).toEqual({ current: 'p1', phase: 'playing', chosen: true });
  });
  it('needs a winner', () => {
    expect(() => run('effect', 'the winner goes next', fixtureEnv(fixtureState([], { turn })))).toThrow('There is no winner yet.');
  });
  it('the player holding a card goes first', () => {
    const state = fixtureState([std('a', 'hand-p0', 'C', 5), std('b', 'hand-p2', 'C', 2), std('c', 'deck', 'S', 2)], { turn });
    const out = run<GameState>('effect', 'The player holding the 2 of clubs goes first', fixtureEnv(state));
    expect(out.turn).toEqual({ current: 'p2', phase: 'playing', chosen: true });
  });
  it('fails when nobody holds the card', () => {
    const state = fixtureState([std('b', 'deck', 'C', 2), std('c', 'trick', 'C', 2)], { turn });
    const go = () => run('effect', 'the player holding the 2 of clubs goes first', fixtureEnv(state));
    expect(go).toThrow(RuleError);
    expect(go).toThrow('No player is holding that card.');
  });
  it('ignores a seat that is not at the table', () => {
    const state = fixtureState([std('b', 'hand-p3', 'C', 2)], { turn });
    expect(() => run('effect', 'the player holding the 2 of clubs goes first', fixtureEnv(state, { seats: ['p0', 'p1'] }))).toThrow(
      'No player is holding that card.',
    );
  });
  it('the turn passes to the left', () => {
    const at = (current: string) => fixtureEnv(fixtureState([], { turn: { current } }));
    expect(run('turn', 'The turn passes to the left', at('p1'))).toBe('p2');
    expect(run('turn', 'the turn passes to the left', at('p3'))).toBe('p0');
  });
  it('skips a player who is out', () => {
    const game = fixtureBoardGame();
    const seats = ['p0', 'p1', 'p2'];
    const state = markOut(fixtureBoardState(game, seats), 'p1');
    expect(run('turn', 'the turn passes to the left', fixtureEnv(state, { game, seats }))).toBe('p2');
  });
  it('gives a lone player the turn again', () => {
    expect(run('turn', 'the turn passes to the left', fixtureEnv(fixtureState([], { turn: { current: 'p0' } }), { seats: ['p0'] }))).toBe('p0');
  });
  it('cannot pass a turn nobody has', () => {
    expect(() => run('turn', 'the turn passes to the left', fixtureEnv(fixtureState([])))).toThrow(RuleError);
  });
});

describe('a phase that interrupts the turn', () => {
  const vote = compileGame(INTERRUPT_BOARD, lib).game!;
  const WITH_THEM = compileGame(INTERRUPT_BOARD.replace('      The vote phase starts with the player on their left.', '      The vote phase starts with them.'), lib).game!;
  /** An engine for `players` seats with the turn at p0 in playing, its board arranged by `arrange`, playing `game`. */
  const voting = (players: number, arrange: (s: GameState) => GameState, game: CompiledGame = vote): GameEngine => {
    const start = withBoardData(initialState(game, 1), game, seatsFor(players));
    return createEngine(game, lib, players, arrange({ ...start, turn: { current: 'p0', phase: 'playing' } })).engine;
  };
  const press = (engine: GameEngine, type: string, by: string) => expect(engine.dispatch({ type, by }).reason).toBeUndefined();

  it('starts with the player on the left, runs its start lines, and goes back to the turn exactly, its log and rolls and all', () => {
    const engine = voting(3, (s) => queueRoll(s, [1, 2]));
    press(engine, 'roll the dice', 'p0');
    press(engine, 'call a vote', 'p0');
    let s = engine.getState();
    expect(s.turn).toEqual({ current: 'p1', phase: 'vote' });
    expect(['p0', 'p1', 'p2'].map((seat) => playerFact(s, seat, 'voting'))).toEqual([true, true, true]);
    expect([s.data[TURN_KEY], s.data[TURN_ROLLS_KEY]]).toEqual([{}, {}]);
    for (const seat of ['p1', 'p2', 'p0']) press(engine, 'abstain', seat);
    s = engine.getState();
    expect(s.turn).toEqual({ current: 'p0', phase: 'playing' });
    expect(s.data[TURN_KEY]).toEqual({ p0: ['roll the dice', 'call a vote'] });
    expect(s.data[TURN_ROLLS_KEY]).toEqual({ p0: [[1, 2]] });
    expect(engine.canDispatch({ type: 'end their turn', by: 'p0' })).toBe(true);
  });
  it('starts with the next player still in, and passes only to players still in', () => {
    const engine = voting(4, (s) => markOut(queueRoll(s, [1, 2]), 'p1'));
    press(engine, 'roll the dice', 'p0');
    press(engine, 'call a vote', 'p0');
    expect(engine.getState().turn!.current).toBe('p2');
    press(engine, 'abstain', 'p2');
    press(engine, 'abstain', 'p3');
    expect(engine.getState().turn!.current).toBe('p0');
  });
  it('needs the player on whose left it starts, and enters the phase it names', () => {
    expect(lib.get('effect', 'the {phase} phase starts with the player on their left')).toMatchObject({ needsPlayer: true, entersPhase: true });
  });
  it('starts with the player who pressed, runs its start lines, and goes back to their turn as it was', () => {
    const engine = voting(3, (s) => queueRoll(s, [1, 2]), WITH_THEM);
    press(engine, 'roll the dice', 'p0');
    press(engine, 'call a vote', 'p0');
    let s = engine.getState();
    expect(s.turn).toEqual({ current: 'p0', phase: 'vote' });
    expect(['p0', 'p1', 'p2'].map((seat) => playerFact(s, seat, 'voting'))).toEqual([true, true, true]);
    expect(interruptedTurn(s)).toEqual({ phase: 'playing', current: 'p0', log: { p0: ['roll the dice', 'call a vote'] }, rolls: { p0: [[1, 2]] } });
    for (const seat of ['p0', 'p1', 'p2']) press(engine, 'abstain', seat);
    s = engine.getState();
    expect(s.turn).toEqual({ current: 'p0', phase: 'playing' });
    expect(s.data[TURN_KEY]).toEqual({ p0: ['roll the dice', 'call a vote'] });
    expect(engine.canDispatch({ type: 'end their turn', by: 'p0' })).toBe(true);
  });
  it('needs the player it starts with, and enters the phase it names', () => {
    expect(lib.get('effect', 'the {phase} phase starts with them')).toMatchObject({ needsPlayer: true, entersPhase: true });
  });
  it('cannot run start lines with nothing to run them', () => {
    const state = fixtureBoardState(vote, ['p0', 'p1']);
    const env = fixtureEnv(state, { game: vote, seats: ['p0', 'p1'], subject: { player: 'p0', space: null, card: null } });
    expect(() => run('effect', 'the vote phase starts with the player on their left', env))
      .toThrow('This phrase needs to run the start lines of a phase, but nothing is listening.');
  });

  describe('the next player on the left who has a flag', () => {
    const seats = ['p0', 'p1', 'p2', 'p3'];
    /** Whose turn it is next, from `current`, with `flagged` voting and `out` out of the game. */
    const next = (current: string, flagged: string[], out: string[] = []) => {
      let state: GameState = { ...fixtureBoardState(vote, seats), turn: { current, phase: 'vote' } };
      for (const seat of flagged) state = setPlayerFact(state, seat, 'voting', true);
      for (const seat of out) state = markOut(state, seat);
      return run('turn', 'the turn passes to the next player on the left who is voting', fixtureEnv(state, { game: vote, seats }));
    };
    it('goes round to the first one still in who has it', () => {
      expect(next('p0', ['p2', 'p3'])).toBe('p2');
      expect(next('p3', ['p1', 'p2'], ['p1'])).toBe('p2');
    });
    it('stays where it is when nobody else has it', () => {
      expect(next('p1', ['p1'])).toBe('p1');
      expect(next('p1', [])).toBe('p1');
    });
  });
});

describe('scoring and winners', () => {
  const state = fixtureState([
    std('h1', 'won-pile-p0', 'H', 2), std('h2', 'won-pile-p0', 'H', 9), std('s1', 'won-pile-p0', 'S', 12), std('d1', 'won-pile-p0', 'D', 4),
    std('h3', 'won-pile-p1', 'H', 5), std('s2', 'hand-p1', 'S', 12),
  ]);
  const env = fixtureEnv(state);
  it('each card of a kind scores its points', () => {
    expect(run('score', "Each heart in a player's won pile scores 1 point", env, 'p0')).toBe(2);
    expect(run('score', "each heart in a player's won pile scores 3 points", env, 'p0')).toBe(6);
    expect(run('score', "each heart in a player's won pile scores 1 point", env, 'p1')).toBe(1);
    expect(run('score', "each heart in a player's won pile scores 1 point", env, 'p2')).toBe(0);
  });
  it('a particular card scores its points when it is there', () => {
    const text = "The queen of spades in a player's won pile scores 13 points";
    expect(run('score', text, env, 'p0')).toBe(13);
    expect(run('score', text, env, 'p1')).toBe(0);   // in a hand, not the won pile
    expect(run('score', text, env, 'p2')).toBe(0);
  });
  it('lowest score wins with ties to the earliest seat', () => {
    const scores = { p0: 14, p1: 1, p2: 0, p3: 0 };
    expect(run('winner', 'The lowest score wins', env, scores)).toBe('p2');
  });
  it('highest score wins with ties to the earliest seat', () => {
    expect(run('winner', 'the highest score wins', env, { p0: 3, p1: 9, p2: 9, p3: 1 })).toBe('p1');
    expect(run('winner', 'the highest score wins', env, { p0: 9, p1: 9, p2: 9, p3: 9 })).toBe('p0');
  });
  it('only counts the seats at the table', () => {
    const two = fixtureEnv(state, { seats: ['p0', 'p1'] });
    expect(run('winner', 'the lowest score wins', two, { p0: 5, p1: 4, p2: -3 })).toBe('p1');
  });
  it('the player with an empty zone wins', () => {
    const cards = fixtureState([std('a', 'hand-p0', 'H', 2), std('b', 'hand-p3', 'H', 3)]);
    expect(run('winner', 'The player with an empty hand wins', fixtureEnv(cards), {})).toBe('p1');
  });
  it('fails when no one has an empty zone', () => {
    const cards = fixtureState(['p0', 'p1'].map((p) => std(`c-${p}`, `hand-${p}`, 'H', 2)));
    const winner = () => run('winner', 'the player with an empty hand wins', fixtureEnv(cards, { seats: ['p0', 'p1'] }), {});
    expect(winner).toThrow(RuleError);
    expect(winner).toThrow('No player has an empty hand.');
  });
});
