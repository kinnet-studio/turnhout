import { describe, expect, it, vi } from 'vitest';
import { zoneCards, type GameState } from '../../game-state';
import type { CardState } from '../../scene';
import { RuleError } from '../diagnostics';
import {
  fixtureCard, fixtureColorGame, fixtureEnv, fixtureGame, fixtureMove, fixturePhase, fixtureState, runPhrase, vocabFor,
} from '../testing';
import type { ExampleEnv, PhraseEnv, PhraseKind } from '../types';
import { BOX_ZONE, matchesCard } from '../zones';
import { normalizeReason } from './example-phrases';
import { createDefaultLibrary } from './index';

const lib = createDefaultLibrary();
const run = <T = unknown>(kind: PhraseKind, text: string, env: PhraseEnv) => runPhrase<T>(lib, kind, text, env);
const given = (text: string, env: PhraseEnv) => run<GameState>('given', text, env);
const action = (text: string, env: PhraseEnv) => run<{ by: string; move: { type: string; cardId: string } }>('action', text, env);
const expectThat = (text: string, env: PhraseEnv) => run<true | string>('expect', text, env);

const std = (id: string, zoneId: string, suit: string, rank: number, over: Partial<CardState> = {}) =>
  fixtureCard(id, zoneId, { suit, rank }, over);
const colored = (id: string, zoneId: string, color: string, number: number, over: Partial<CardState> = {}) =>
  fixtureCard(id, zoneId, { color, number }, over);

const idNumber = (id: string) => Number(id.slice(1));

/** An example env whose claim hands out the first matching card nobody has claimed yet, lowest id first. */
function exampleEnv(
  state: GameState,
  opts: { game?: PhraseEnv['game']; seats?: string[]; last?: ExampleEnv['last'] } = {},
) {
  const claimed = new Set<string>();
  const setUp = vi.fn((s: GameState) => ({ ...s, data: { ...s.data, setUp: true } }));
  const example: ExampleEnv = {
    last: opts.last ?? null,
    claim: (match, text, s) => {
      const card = s.cards
        .filter((c) => !claimed.has(c.id) && matchesCard(c, match))
        .sort((a, b) => idNumber(a.id) - idNumber(b.id))[0];
      if (!card) throw new Error(`nothing to claim for ${text}`);
      claimed.add(card.id);
      return card.id;
    },
    setUp,
  };
  return { env: { ...fixtureEnv(state, { game: opts.game, seats: opts.seats }), example } as PhraseEnv, setUp, claimed };
}

const ids = (state: GameState, zoneId: string) => zoneCards(state, zoneId).map((c) => c.id);

describe('given: setting the scene', () => {
  it('a player count changes nothing', () => {
    const state = fixtureState([std('c0', 'deck', 'C', 2)]);
    expect(given('3 players', fixtureEnv(state))).toBe(state);
  });

  it('the game is set up asks the example to run the setup', () => {
    const { env, setUp } = exampleEnv(fixtureState([]));
    expect(given('the game is set up', env).data).toEqual({ setUp: true });
    expect(setUp).toHaveBeenCalledWith(env.state);
  });

  it('the phase is sets the phase and keeps whose turn it is', () => {
    const game = fixtureGame({ phases: [fixturePhase('passing', []), fixturePhase('playing', [])] });
    const state = fixtureState([], { turn: { current: 'p2', phase: 'passing' } });
    expect(given('the phase is playing', fixtureEnv(state, { game })).turn).toEqual({ current: 'p2', phase: 'playing' });
  });

  it('the phase is starts a turn at the first seat when there is none yet', () => {
    const game = fixtureGame({ phases: [fixturePhase('playing', [])] });
    expect(given('the phase is playing', fixtureEnv(fixtureState([]), { game, seats: ['p0', 'p1'] })).turn)
      .toEqual({ current: 'p0', phase: 'playing' });
  });

  it("it is a player's turn sets whose turn it is and keeps the phase", () => {
    const state = fixtureState([], { turn: { current: 'p0', phase: 'playing' } });
    expect(given("it is p2's turn", fixtureEnv(state)).turn).toEqual({ current: 'p2', phase: 'playing' });
    expect(given('it is p1’s turn', fixtureEnv(fixtureState([]))).turn).toEqual({ current: 'p1' });
  });

  it('a zone is empty sends its cards out of play', () => {
    const state = fixtureState([std('c0', 'trick', 'C', 2), std('c1', 'trick', 'C', 3), std('c2', 'deck', 'C', 4)]);
    const next = given('the trick is empty', fixtureEnv(state));
    expect(ids(next, 'trick')).toEqual([]);
    expect(ids(next, BOX_ZONE)).toEqual(['c0', 'c1']);
    expect(ids(next, 'deck')).toEqual(['c2']);
  });

  it('every hand is empty clears all of them', () => {
    const state = fixtureState([std('c0', 'hand-p0', 'C', 2), std('c1', 'hand-p3', 'C', 3)]);
    const next = given('each hand is empty', fixtureEnv(state));
    expect(ids(next, BOX_ZONE).sort()).toEqual(['c0', 'c1']);
  });
});

describe('given: placing cards', () => {
  const deck = () => [
    std('c1', 'deck', 'C', 2), std('c2', 'deck', 'C', 3), std('c3', 'deck', 'C', 4), std('c9', 'hand-p0', 'D', 9),
  ];

  it('holds replaces the hand exactly, moving old cards out of play', () => {
    const { env } = exampleEnv(fixtureState(deck()));
    const next = given('p0 holds the 2 of clubs and the 3 of clubs', env);
    expect(ids(next, 'hand-p0')).toEqual(['c1', 'c2']);
    expect(next.cards.find((c) => c.id === 'c9')?.zoneId).toBe(BOX_ZONE);
    expect(next.cards.find((c) => c.id === 'c3')?.zoneId).toBe('deck');
  });

  it('holds can hold a card the hand already had', () => {
    const { env } = exampleEnv(fixtureState(deck()));
    expect(ids(given('p0 holds the 9 of diamonds', env), 'hand-p0')).toEqual(['c9']);
  });

  it('holds claims each card by its words, in order', () => {
    const { env, claimed } = exampleEnv(fixtureState(deck()));
    const claim = vi.spyOn(env.example!, 'claim');
    given('p0 holds the 3 of clubs and the 2 of clubs', env);
    expect(claim.mock.calls.map(([match, text]) => [match, text])).toEqual([
      [{ suit: 'C', rank: 3 }, 'the 3 of clubs'],
      [{ suit: 'C', rank: 2 }, 'the 2 of clubs'],
    ]);
    expect([...claimed]).toEqual(['c2', 'c1']);
  });

  it('holds lists the cards in the order given, so the last one is on top', () => {
    const { env } = exampleEnv(fixtureState(deck()));
    const next = given('p0 holds the 3 of clubs and the 2 of clubs', env);
    expect(ids(next, 'hand-p0')).toEqual(['c2', 'c1']);
  });

  it('holds describes a custom card the way a designer wrote it', () => {
    const game = fixtureColorGame();
    const { env } = exampleEnv(fixtureState([colored('c0', 'draw-pile', 'red', 2)]), { game });
    const claim = vi.spyOn(env.example!, 'claim');
    given('p0 holds a red 2', env);
    expect(claim.mock.calls[0][1]).toBe('a red 2');
  });

  it('a zone has puts exactly those cards there, the last listed on top', () => {
    const cards = [...deck(), std('c4', 'trick', 'S', 12)];
    const { env } = exampleEnv(fixtureState(cards));
    const next = given('the trick has the 3 of clubs and the 2 of clubs', env);
    expect(ids(next, 'trick')).toEqual(['c2', 'c1']);
    expect(next.cards.find((c) => c.id === 'c4')?.zoneId).toBe(BOX_ZONE);
    expect(next.cards.find((c) => c.id === 'c2')?.faceUp).toBe(true);
  });

  it('a zone has works for one player’s zone', () => {
    const { env } = exampleEnv(fixtureState(deck()));
    const next = given("p1's pass pile has the 4 of clubs", env);
    expect(ids(next, 'pass-pile-p1')).toEqual(['c3']);
  });

  it('a zone has refuses a phrase that names more than one zone', () => {
    const { env } = exampleEnv(fixtureState(deck()));
    expect(() => given('each hand has the 2 of clubs', env)).toThrow(RuleError);
    expect(() => given('each hand has the 2 of clubs', env)).toThrow('each hand is more than one zone');
  });

  it('played records who played the card', () => {
    const cards = [std('c1', 'deck', 'C', 5), std('c2', 'trick', 'C', 9, { slot: 0, faceUp: true })];
    const { env } = exampleEnv(fixtureState(cards));
    const next = given('p1 played the 5 of clubs to the trick', env);
    const played = next.cards.find((c) => c.id === 'c1')!;
    expect(played.zoneId).toBe('trick');
    expect(played.data).toEqual({ suit: 'C', rank: 5, movedBy: 'p1' });
    expect(played.faceUp).toBe(true);
    expect(ids(next, 'trick')).toEqual(['c2', 'c1']);
  });

  it('played refuses a zone that names more than one', () => {
    const { env } = exampleEnv(fixtureState(deck()));
    expect(() => given('p1 played the 2 of clubs to each hand', env)).toThrow('each hand is more than one zone');
  });

  it('does not change the state it was given', () => {
    const state = fixtureState(deck());
    const before = JSON.stringify(state);
    const { env } = exampleEnv(state);
    given('p0 holds the 2 of clubs', env);
    given('p1 played the 3 of clubs to the trick', env);
    given('the trick has the 4 of clubs', env);
    given('the trick is empty', env);
    expect(JSON.stringify(state)).toBe(before);
  });

  it.each([
    'the game is set up',
    'p0 holds the 2 of clubs',
    'the trick has the 2 of clubs',
    'p0 played the 2 of clubs to the trick',
  ])('“%s” needs an example to run in', (text) => {
    const env = fixtureEnv(fixtureState(deck()));
    expect(() => given(text, env)).toThrow(RuleError);
    expect(() => given(text, env)).toThrow('This step only works inside an example.');
  });
});

describe('players that are not at the table', () => {
  const noSuchPlayer = 'There is no player p3 at this table.';
  const cards = [std('c1', 'hand-p0', 'C', 2), std('c2', 'deck', 'C', 5)];
  const seated = (opts: Parameters<typeof exampleEnv>[1] = {}) =>
    exampleEnv(fixtureState(cards), { seats: ['p0', 'p1', 'p2'], ...opts }).env;
  const phased = () => {
    const play = fixtureMove('play', { of: { who: 'actor' }, zone: 'hand' }, { shared: 'trick' });
    const game = fixtureGame({ phases: [fixturePhase('playing', [play])] });
    return exampleEnv(fixtureState(cards, { turn: { current: 'p0', phase: 'playing' } }), { game, seats: ['p0', 'p1', 'p2'] }).env;
  };

  it.each([
    ['given', "it is p3's turn"],
    ['given', 'p3 holds the 2 of clubs'],
    ['given', 'p3 played the 5 of clubs to the trick'],
    ['given', "p3's hand has the 5 of clubs"],
    ['given', 'p0 played the 5 of clubs to p3’s hand'],
  ] as [PhraseKind, string][])('%s “%s” is refused', (kind, text) => {
    expect(() => run(kind, text, seated())).toThrow(RuleError);
    expect(() => run(kind, text, seated())).toThrow(noSuchPlayer);
  });

  it('an action by that player is refused', () => {
    expect(() => action('p3 plays the 2 of clubs', phased())).toThrow(RuleError);
    expect(() => action('p3 plays the 2 of clubs', phased())).toThrow(noSuchPlayer);
    expect(() => action('p3 plays a card', phased())).toThrow(noSuchPlayer);
  });

  it.each([
    "it is p3's turn",
    'p3 holds 1 card',
    'p3 scores 4',
    'p3 wins',
  ])('expect “%s” is refused', (text) => {
    const env = seated({ last: { ok: true } });
    env.state = { ...env.state, result: { scores: { p0: 1 }, winner: 'p0' } };
    expect(() => expectThat(text, env)).toThrow(RuleError);
    expect(() => expectThat(text, env)).toThrow(noSuchPlayer);
  });

  it('names the actual player in the message', () => {
    const env = exampleEnv(fixtureState([]), { seats: ['p0', 'p1'] }).env;
    expect(() => given('p2 holds the 2 of clubs', env)).toThrow('There is no player p2 at this table.');
  });
});

describe('action: a player moves a card', () => {
  const play = fixtureMove('play', { of: { who: 'actor' }, zone: 'hand' }, { shared: 'discard pile' });
  const draw = fixtureMove('draw', { shared: 'draw pile' }, { of: { who: 'actor' }, zone: 'hand' });
  // The other phase keeps both verbs in the game's vocabulary however few moves 'playing' declares.
  const game = (...moves: ReturnType<typeof fixtureMove>[]) =>
    fixtureColorGame({ phases: [fixturePhase('playing', moves.length > 0 ? moves : [play, draw]), fixturePhase('waiting', [play, draw])] });
  const playing = { turn: { current: 'p0', phase: 'playing' } };
  const at = (cards: CardState[], g = game(), over: Partial<GameState> = playing) => fixtureEnv(fixtureState(cards, over), { game: g });

  it('a card action picks the card from the actor’s own zone first', () => {
    const env = at([colored('c1', 'draw-pile', 'red', 7), colored('c2', 'hand-p0', 'red', 7)]);
    expect(action('p0 plays a red 7', env)).toEqual({ by: 'p0', move: { type: 'play', cardId: 'c2' } });
  });

  it('falls back to a matching card anywhere, so the game can refuse it', () => {
    const env = at([colored('c1', 'hand-p1', 'red', 7), colored('c2', 'draw-pile', 'blue', 3)]);
    expect(action('p0 plays a red 7', env)).toEqual({ by: 'p0', move: { type: 'play', cardId: 'c1' } });
  });

  it('puts card ids in numeric order, so c3 comes before c12', () => {
    const hand = [colored('c12', 'hand-p0', 'red', 7), colored('c3', 'hand-p0', 'red', 7)];
    expect(action('p0 plays a red 7', at(hand)).move.cardId).toBe('c3');
    const elsewhere = [colored('c12', 'draw-pile', 'red', 7), colored('c3', 'hand-p1', 'red', 7)];
    expect(action('p0 plays a red 7', at(elsewhere)).move.cardId).toBe('c3');
  });

  it('ignores cards that are out of play', () => {
    const env = at([colored('c1', BOX_ZONE, 'red', 7), colored('c2', 'draw-pile', 'red', 7)]);
    expect(action('p0 plays a red 7', env).move.cardId).toBe('c2');
  });

  it('works for standard cards and the verb in the third person', () => {
    const passing = fixtureGame({
      phases: [fixturePhase('passing', [fixtureMove('pass', { of: { who: 'actor' }, zone: 'hand' }, { of: { who: 'actor' }, zone: 'pass pile' })])],
    });
    const env = fixtureEnv(fixtureState([std('c4', 'hand-p2', 'D', 4)], { turn: { current: 'p2', phase: 'passing' } }), { game: passing });
    expect(action('p2 passes the 4 of diamonds', env)).toEqual({ by: 'p2', move: { type: 'pass', cardId: 'c4' } });
  });

  it('uses the first move declared for the verb in the current phase', () => {
    const fromDiscard = fixtureMove('play', { shared: 'discard pile' }, { of: { who: 'actor' }, zone: 'hand' });
    const env = at(
      [colored('c1', 'hand-p0', 'red', 7), colored('c2', 'discard-pile', 'red', 7)],
      game(fromDiscard, play),
    );
    expect(action('p0 plays a red 7', env).move.cardId).toBe('c2');
  });

  it('still finds the card when the phase has no such move', () => {
    const env = at([colored('c1', 'hand-p0', 'red', 7)], game(draw));
    expect(action('p0 plays a red 7', env).move.cardId).toBe('c1');
  });

  it('says so when no such card is in the game', () => {
    const env = at([colored('c1', 'hand-p0', 'red', 7)]);
    expect(() => action('p0 plays a blue 3', env)).toThrow(RuleError);
    expect(() => action('p0 plays a blue 3', env)).toThrow("I can't find a blue 3 for p0 to play.");
  });

  it('a card is the top card of the zone the move takes from', () => {
    const cards = [
      colored('c1', 'draw-pile', 'red', 2, { slot: 0 }), colored('c2', 'draw-pile', 'blue', 3, { slot: 1 }),
      colored('c3', 'hand-p0', 'red', 7, { slot: 0 }), colored('c4', 'hand-p0', 'blue', 7, { slot: 1 }),
    ];
    expect(action('p0 draws a card', at(cards))).toEqual({ by: 'p0', move: { type: 'draw', cardId: 'c2' } });
    expect(action('p0 plays a card', at(cards))).toEqual({ by: 'p0', move: { type: 'play', cardId: 'c4' } });
  });

  it('a card from an empty zone is an error', () => {
    const env = at([colored('c3', 'hand-p0', 'red', 7)]);
    expect(() => action('p0 draws a card', env)).toThrow(RuleError);
    expect(() => action('p0 draws a card', env)).toThrow("p0 can't draw a card because the draw pile is empty.");
    expect(() => action('p1 plays a card', env)).toThrow("p1 can't play a card because their hand is empty.");
  });

  it('a card needs a move the phase declares', () => {
    const env = at([colored('c3', 'hand-p0', 'red', 7)], game(draw));
    expect(() => action('p0 plays a card', env)).toThrow(RuleError);
    expect(() => action('p0 plays a card', env)).toThrow('Nobody can play in the playing phase.');
    expect(() => action('p0 plays a card', at([], game(play), {}))).toThrow('Nobody can play before a phase has started.');
  });

  it('a card from several zones is an error', () => {
    const fromEach = fixtureMove('play', { each: 'hand' }, { shared: 'discard pile' });
    const env = at([colored('c3', 'hand-p0', 'red', 7)], game(fromEach));
    expect(() => action('p0 plays a card', env)).toThrow('each hand is more than one zone');
  });
});

describe('expect: accepted and rejected', () => {
  const rejected = (reason?: string) => exampleEnv(fixtureState([]), { last: { ok: false, reason } }).env;
  const accepted = () => exampleEnv(fixtureState([]), { last: { ok: true } }).env;

  it('accepted passes for an accepted move', () => {
    expect(expectThat('it is accepted', accepted())).toBe(true);
  });

  it('accepted explains a rejection', () => {
    expect(expectThat('it is accepted', rejected('You can only play a card from your hand.')))
      .toBe('Expected the move to be accepted, but it was rejected: You can only play a card from your hand.');
  });

  it('accepted copes with a rejection that gave no reason', () => {
    expect(expectThat('it is accepted', rejected())).toBe('Expected the move to be accepted, but it was rejected.');
  });

  it('rejected passes for a rejected move, whatever the reason', () => {
    expect(expectThat('it is rejected', rejected('anything at all'))).toBe(true);
    expect(expectThat('it is rejected', rejected())).toBe(true);
  });

  it('rejected fails for an accepted move', () => {
    expect(expectThat('it is rejected', accepted())).toBe('Expected the move to be rejected, but it was accepted.');
  });

  it('rejected because compares friendly text loosely', () => {
    const env = rejected('They follow the led suit when they can');
    expect(expectThat('it is rejected because “they follow the led suit when they can.”', env)).toBe(true);
    expect(expectThat('it is rejected because "They follow the led suit when they can"', env)).toBe(true);
    expect(expectThat('it is rejected because “THEY FOLLOW THE LED SUIT WHEN THEY CAN.”', env)).toBe(true);
  });

  it('rejected because treats curly and straight apostrophes alike', () => {
    expect(expectThat('it is rejected because “That’s not your card.”', rejected("That's not your card"))).toBe(true);
    expect(expectThat('it is rejected because "That\'s not your card"', rejected('That’s not your card.'))).toBe(true);
  });

  it('rejected because names the reason it got instead', () => {
    expect(expectThat('it is rejected because “the card is a heart”', rejected('The card is not a heart.')))
      .toBe('Expected it to be rejected because “the card is a heart”, but the reason was “The card is not a heart.”.');
  });

  it('rejected because names an acceptance', () => {
    expect(expectThat('it is rejected because “the card is a heart”', accepted()))
      .toBe('Expected it to be rejected because “the card is a heart”, but it was accepted.');
  });

  it('rejected because copes with a rejection that gave no reason', () => {
    expect(expectThat('it is rejected because “the card is a heart”', rejected()))
      .toBe('Expected it to be rejected because “the card is a heart”, but no reason was given.');
  });

  it('needs an example, and a move to have been made', () => {
    const none = fixtureEnv(fixtureState([]));
    for (const text of ['it is accepted', 'it is rejected', 'it is rejected because “x”']) {
      expect(() => expectThat(text, none)).toThrow('This step only works inside an example.');
      expect(() => expectThat(text, exampleEnv(fixtureState([])).env)).toThrow(RuleError);
      expect(() => expectThat(text, exampleEnv(fixtureState([])).env)).toThrow('No move has been made yet.');
    }
  });
});

describe('normalizeReason', () => {
  it('lowercases, straightens quotes, trims and drops one trailing period', () => {
    expect(normalizeReason('  They’re “Here”.  ')).toBe('they\'re "here"');
    expect(normalizeReason('‘Quoted’')).toBe("'quoted'");
    expect(normalizeReason('Wait...')).toBe('wait..');
    expect(normalizeReason('')).toBe('');
  });
});

describe('expect: the state of the table', () => {
  const at = (cards: CardState[], over: Partial<GameState> = {}) => fixtureEnv(fixtureState(cards, over));

  it('whose turn it is', () => {
    const env = at([], { turn: { current: 'p1', phase: 'playing' } });
    expect(expectThat("it is p1's turn", env)).toBe(true);
    expect(expectThat("it is p2's turn", env)).toBe("Expected it to be p2's turn, but it is p1's turn.");
    expect(expectThat("it is p1's turn", at([]))).toBe("Expected it to be p1's turn, but nobody's turn has started.");
  });

  it('which phase', () => {
    const game = fixtureGame({ phases: [fixturePhase('passing', []), fixturePhase('playing', [])] });
    const env = fixtureEnv(fixtureState([], { turn: { current: 'p1', phase: 'playing' } }), { game });
    expect(expectThat('the phase is playing', env)).toBe(true);
    expect(expectThat('the phase is passing', env)).toBe('Expected the phase to be passing, but it is playing.');
    const none = fixtureEnv(fixtureState([]), { game });
    expect(expectThat('the phase is passing', none)).toBe('Expected the phase to be passing, but no phase has started.');
  });

  it('how many cards a player holds', () => {
    const env = at([std('c1', 'hand-p0', 'C', 2), std('c2', 'hand-p0', 'C', 3), std('c3', 'hand-p1', 'C', 4)]);
    expect(expectThat('p0 holds 2 cards', env)).toBe(true);
    expect(expectThat('p1 holds 1 card', env)).toBe(true);
    expect(expectThat('p2 holds 0 cards', env)).toBe(true);
    expect(expectThat('p0 holds 3 cards', env)).toBe('Expected p0 to hold 3 cards, but they hold 2 cards.');
    expect(expectThat('p0 holds 1 card', env)).toBe('Expected p0 to hold 1 card, but they hold 2 cards.');
    expect(expectThat('p1 holds 0 cards', env)).toBe('Expected p1 to hold 0 cards, but they hold 1 card.');
  });

  it('what a zone has, in any order', () => {
    const env = at([std('c1', 'trick', 'C', 2), std('c2', 'trick', 'S', 12), std('c3', 'deck', 'D', 5)]);
    expect(expectThat('the trick has the queen of spades and the 2 of clubs', env)).toBe(true);
    expect(expectThat('the trick has the 2 of clubs and the queen of spades', env)).toBe(true);
  });

  it('a zone has says what it has instead', () => {
    const env = at([std('c1', 'trick', 'C', 2), std('c2', 'trick', 'S', 12), std('c3', 'deck', 'D', 5)]);
    expect(expectThat('the trick has the 2 of clubs', env))
      .toBe('Expected the trick to have the 2 of clubs, but it has the 2 of clubs and the queen of spades.');
    expect(expectThat('the trick has the 2 of clubs and the 3 of clubs', env))
      .toBe('Expected the trick to have the 2 of clubs and the 3 of clubs, but it has the 2 of clubs and the queen of spades.');
    expect(expectThat('the discard pile has the 2 of clubs', env))
      .toBe('Expected the discard pile to have the 2 of clubs, but it is empty.');
    expect(expectThat("p0's hand has the 5 of diamonds", env))
      .toBe("Expected p0's hand to have the 5 of diamonds, but it is empty.");
  });

  it('a zone has describes custom cards the way a designer wrote them, and not the bookkeeping', () => {
    const game = fixtureColorGame();
    const played = colored('c1', 'discard-pile', 'red', 2);
    played.data = { ...played.data, movedBy: 'p1' };
    const env = fixtureEnv(fixtureState([played]), { game });
    expect(expectThat('the discard pile has a blue 3', env))
      .toBe('Expected the discard pile to have a blue 3, but it has a red 2.');
    expect(expectThat('the discard pile has a red 2', env)).toBe(true);
  });

  it('a zone has counts copies, and lets a general card stand for a particular one', () => {
    const game = fixtureColorGame();
    const env = fixtureEnv(fixtureState([colored('c1', 'discard-pile', 'red', 7), colored('c2', 'discard-pile', 'red', 2)]), { game });
    expect(expectThat('the discard pile has a red 7 and a red 2', env)).toBe(true);
    expect(expectThat('the discard pile has a red 7 and a red 7', env)).toMatch(/^Expected the discard pile to have a red 7 and a red 7/);
    expect(expectThat('the discard pile has a red 2 and a red 7', env)).toBe(true);
  });

  it('a zone has refuses a phrase that names more than one zone', () => {
    const env = at([std('c1', 'hand-p0', 'C', 2)]);
    expect(() => expectThat('each hand has the 2 of clubs', env)).toThrow(RuleError);
    expect(() => expectThat('each hand has the 2 of clubs', env)).toThrow('each hand is more than one zone');
  });

  it('the top card of a zone', () => {
    const env = at([std('c1', 'trick', 'C', 2, { slot: 0 }), std('c2', 'trick', 'S', 12, { slot: 1 })]);
    expect(expectThat('the top card of the trick is the queen of spades', env)).toBe(true);
    expect(expectThat('the top card of the trick is the 2 of clubs', env))
      .toBe('Expected the top card of the trick to be the 2 of clubs, but it is the queen of spades.');
    expect(expectThat('the top card of the deck is the 2 of clubs', env))
      .toBe('Expected the top card of the deck to be the 2 of clubs, but the deck is empty.');
  });

  it('the bottom card of a zone', () => {
    const env = at([std('c1', 'trick', 'C', 2, { slot: 0 }), std('c2', 'trick', 'S', 12, { slot: 1 })]);
    expect(expectThat('the bottom card of the trick is the 2 of clubs', env)).toBe(true);
    expect(expectThat('the bottom card of the trick is the queen of spades', env))
      .toBe('Expected the bottom card of the trick to be the queen of spades, but it is the 2 of clubs.');
    expect(expectThat('the bottom card of the deck is the 2 of clubs', env))
      .toBe('Expected the bottom card of the deck to be the 2 of clubs, but the deck is empty.');
  });

  it('the top card of a zone accepts a partly described card', () => {
    const game = fixtureColorGame();
    const env = fixtureEnv(fixtureState([colored('c1', 'discard-pile', 'red', 2)]), { game });
    expect(expectThat('the top card of the discard pile is a red 2', env)).toBe(true);
    expect(expectThat('the top card of the discard pile is a blue 3', env))
      .toBe('Expected the top card of the discard pile to be a blue 3, but it is a red 2.');
  });
});

describe('expect: how the game ended', () => {
  const ended = fixtureEnv(fixtureState([], { result: { scores: { p0: 14, p1: 1, p2: 0, p3: 0 }, winner: 'p2' } }));
  const noScores = fixtureEnv(fixtureState([], { result: { winner: 'p0' } }));
  const running = fixtureEnv(fixtureState([]));

  it('a score', () => {
    expect(expectThat('p0 scores 14', ended)).toBe(true);
    expect(expectThat('p2 scores 0', ended)).toBe(true);
    expect(expectThat('p1 scores 13', ended)).toBe('Expected p1 to score 13, but they scored 1.');
  });

  it('a winner', () => {
    expect(expectThat('p2 wins', ended)).toBe(true);
    expect(expectThat('p0 wins', ended)).toBe('Expected p0 to win, but p2 won.');
  });

  it('a game that has not ended', () => {
    expect(expectThat('p0 scores 14', running)).toBe("The game hasn't ended.");
    expect(expectThat('p0 wins', running)).toBe("The game hasn't ended.");
  });

  it('a game that keeps no scores or names no winner', () => {
    expect(expectThat('p0 wins', noScores)).toBe(true);
    expect(expectThat('p0 scores 3', noScores)).toBe('Expected p0 to score 3, but no score was recorded for p0.');
    const noWinner = fixtureEnv(fixtureState([], { result: { scores: { p0: 1 } } }));
    expect(expectThat('p0 wins', noWinner)).toBe('Expected p0 to win, but the game has no winner.');
  });

  it('a result that is not a record', () => {
    const odd = fixtureEnv(fixtureState([], { result: 'done' }));
    expect(expectThat('p0 wins', odd)).toBe('Expected p0 to win, but the game has no winner.');
  });
});

describe('the default library', () => {
  const play = fixtureMove('play', { of: { who: 'actor' }, zone: 'hand' }, { shared: 'trick' });
  const vocab = vocabFor(fixtureGame({ phases: [fixturePhase('playing', [play])] }), 4);

  it.each<[PhraseKind, string, string]>([
    ['given', '3 players', '{int} players'],
    ['given', 'The game is set up', 'the game is set up'],
    ['given', 'the phase is playing', 'the phase is {phase}'],
    ['given', "it is p1's turn", "it is {player}'s turn"],
    ['given', 'p0 holds the 3 of clubs and the 4 of clubs', '{player} holds {cardlist}'],
    ['given', 'the trick has the 2 of clubs', '{zone} has {cardlist}'],
    ['given', "p0's pass pile has the 2 of clubs, the 3 of clubs and the 4 of clubs", '{zone} has {cardlist}'],
    ['given', 'the trick is empty', '{zone} is empty'],
    ['given', 'p1 played the 5 of clubs to the trick', '{player} played {card} to {zone}'],
    ['action', 'p0 plays the 3 of clubs', '{player} {move} {card}'],
    ['action', 'p0 plays a card', '{player} {move} a card'],
    ['expect', 'it is accepted', 'it is accepted'],
    ['expect', 'it is rejected', 'it is rejected'],
    ['expect', 'it is rejected because “they follow the led suit when they can”', 'it is rejected because {string}'],
    ['expect', "it is p1's turn", "it is {player}'s turn"],
    ['expect', 'the phase is playing', 'the phase is {phase}'],
    ['expect', 'p0 holds 1 card', '{player} holds {int} card(s)'],
    ['expect', 'p0 holds 2 cards', '{player} holds {int} card(s)'],
    ['expect', 'the trick has the 2 of clubs', '{zone} has {cardlist}'],
    ['expect', 'the top card of the trick is the 2 of clubs', 'the top card of {zone} is {card}'],
    ['expect', 'the bottom card of the trick is the 2 of clubs', 'the bottom card of {zone} is {card}'],
    ['expect', 'p0 scores 14', '{player} scores {int}'],
    ['expect', 'p0 wins', '{player} wins'],
  ])('reads an example %s line exactly one way: “%s”', (kind, text, pattern) => {
    expect(lib.match(kind, text, vocab)).toEqual(expect.objectContaining({ status: 'ok', pattern }));
    expect(lib.get(kind, pattern)).toBeDefined();
  });

  it('leaves other example lines to the condition and effect phrases', () => {
    expect(lib.match('expect', 'p1’s won pile has 4 cards', vocab).status).toBe('unknown');
    expect(lib.match('given', 'hearts are broken', vocab).status).toBe('unknown');
  });
});
