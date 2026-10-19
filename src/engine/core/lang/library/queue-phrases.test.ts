import { describe, expect, it } from 'vitest';
import { zoneCards, type GameState } from '../../game-state';
import { createEngine, initialState, seatsFor } from '../build';
import { compileGame } from '../compile';
import { RuleError } from '../diagnostics';
import { misnamedParam } from '../refs';
import { COUNTER_GAME, CREW_GAME, fixtureCard, fixtureEnv, fixtureState, runPhrase, vocabFor } from '../testing';
import type { PhraseEnv, PhraseKind, Subject } from '../types';
import { relocate } from '../zones';
import { BOX_ZONE } from '../zones';
import { RESHUFFLE_GAME } from '../testing';
import { shuffleWithRng } from '../../rng';
import { createDefaultLibrary } from './index';

const lib = createDefaultLibrary();

/** COUNTER_GAME with a second public row, so a card that goes into a zone can be told to turn face up there. */
const QUEUES = COUNTER_GAME.replace(
  '  The shop is a row in the center that everyone can see.',
  '  The shop is a row in the center that everyone can see.\n  The pool is a row in the center that everyone can see.',
);
const compiled = compileGame(QUEUES, lib);
// Read when a test runs, so a game that does not compile fails its own tests and not the whole file.
const game = () => compiled.game!;
const seats = seatsFor(2);

const envOf = (cards: ReturnType<typeof fixtureCard>[], over: Partial<GameState> = {}): PhraseEnv =>
  fixtureEnv(fixtureState(cards, over), { game: game(), seats, subject: { player: 'p0', space: null, card: null } });
const run = <T = unknown>(kind: PhraseKind, text: string, env: PhraseEnv) => runPhrase<T>(lib, kind, text, env);
const effect = (text: string, env: PhraseEnv) => run<GameState>('effect', text, env);
const ids = (state: GameState, zoneId: string) => zoneCards(state, zoneId).map((c) => c.id);

/** A gem in a zone, at a slot counted from the bottom. */
const gem = (id: string, zoneId: string, name: string, slot: number) => fixtureCard(id, zoneId, { name, cost: 1 }, { slot });

describe('the queue phrases', () => {
  it('compile with the game they are tried on', () => {
    expect(compiled.diagnostics).toEqual([]);
  });
});

describe('the bottom card', () => {
  it('moves the first card in slot order, whatever order the cards are listed in', () => {
    const env = envOf([gem('c2', 'pile', 'Opal', 2), gem('c0', 'pile', 'Opal', 0), gem('c1', 'pile', 'Opal', 1)]);
    const next = effect('move the bottom card of the pile to the shop', env);
    expect(ids(next, 'shop')).toEqual(['c0']);
    expect(ids(next, 'pile')).toEqual(['c1', 'c2']);
  });
  it('puts it on top of what the other zone holds', () => {
    const env = envOf([gem('c0', 'pile', 'Opal', 0), gem('c1', 'shop', 'Ruby', 0)]);
    expect(ids(effect('move the bottom card of the pile to the shop', env), 'shop')).toEqual(['c1', 'c0']);
  });
  it('says so when the zone is empty', () => {
    const empty = () => effect('move the bottom card of the pile to the shop', envOf([]));
    expect(empty).toThrow(new RuleError('There is no card to move: the pile is empty.'));
  });
});

describe('a shared zone has a card', () => {
  const holds = (zoneId: string) => envOf([gem('c0', zoneId, 'Ruby', 0), gem('c1', 'shop', 'Opal', 0)]);

  it('is true when some card in the shop matches, and false when none does', () => {
    expect(run('condition', 'the shop has a Ruby', holds('shop'))).toBe(true);
    expect(run('condition', 'the shop has a Ruby', holds('pile'))).toBe(false);
    expect(run('condition', 'the shop has an Opal', holds('pile'))).toBe(true);
  });
  it('looks in that zone only', () => {
    expect(run('condition', 'the pool has a Ruby', holds('shop'))).toBe(false);
    expect(run('condition', 'the pool has a Ruby', holds('pool'))).toBe(true);
  });
  it('leaves “their stash has a card” to the phrase for a zone each player has', () => {
    const found = lib.match('condition', 'their stash has a Ruby', vocabFor(game()));
    expect(found).toMatchObject({ status: 'ok', pattern: 'their {perzone} has {card}' });
    expect(lib.match('condition', 'the shop has a Ruby', vocabFor(game()))).toMatchObject({ status: 'ok', pattern: '{sharedzone} has {card}' });
  });
  it('is still the phrase for a count when it says how many cards', () => {
    expect(lib.match('condition', 'the shop has 2 cards', vocabFor(game()))).toMatchObject({ status: 'ok', pattern: '{zone} has {int} card(s)' });
  });
  it('does not read a zone each player has as shared', () => {
    expect(lib.match('condition', 'the stash has a Ruby', vocabFor(game())).status).not.toBe('ok');
  });
});

describe('a shared zone that is misnamed', () => {
  const vocab = () => vocabFor(game());

  it('names the shared zones that are close, and not the ones each player has', () => {
    expect(misnamedParam('sharedzone', 'the shp', vocab())).toEqual({ message: 'There is no zone called “shp”.', suggestions: ['shop'] });
    expect(lib.misnamed(['condition'], 'the shp has a Ruby', vocab())).toEqual({
      kind: 'condition', problem: { message: 'There is no zone called “shp”.', suggestions: ['shop'] },
    });
  });
  it('leaves a real zone to the phrases that read it', () => {
    for (const text of ['the shop', 'the stash', 'their stash']) expect(misnamedParam('sharedzone', text, vocab())).toBeNull();
  });
  it('says what is wrong with the card, not the zone, when the zone is right', () => {
    expect(lib.misnamed(['condition'], 'the shop has a Rubby', vocab())).toEqual({
      kind: 'condition', problem: { message: 'There is no card value called “Rubby”.', suggestions: ['Ruby'] },
    });
  });
});

describe('moving a named card', () => {
  it('moves the first matching card in slot order of the first zone', () => {
    const env = envOf([gem('c0', 'shop', 'Opal', 0), gem('c1', 'shop', 'Ruby', 2), gem('c2', 'shop', 'Ruby', 1), gem('c3', 'pool', 'Ruby', 0)]);
    const next = effect('move a Ruby from the shop to the pile', env);
    expect(ids(next, 'pile')).toEqual(['c2']);
    expect(ids(next, 'shop')).toEqual(['c0', 'c1']);
    expect(ids(next, 'pool')).toEqual(['c3']);
  });
  it('says so when there is none there, even if there is one elsewhere', () => {
    const none = () => effect('move a Ruby from the shop to the pile', envOf([gem('c0', 'shop', 'Opal', 0), gem('c1', 'pool', 'Ruby', 0)]));
    expect(none).toThrow(new RuleError('There is no Ruby in the shop.'));
  });
  it('is not the phrase that moves every card of a zone', () => {
    const found = lib.match('effect', 'move a Ruby from the shop to the pile', vocabFor(game()));
    expect(found).toMatchObject({ status: 'ok', pattern: 'move {card} from {zone} to {zone}' });
  });
});

describe('dealing up to a number of cards', () => {
  const pile = (n: number) => Array.from({ length: n }, (_, i) => gem(`c${i}`, 'pile', 'Opal', i));

  it('deals as many as it says when the zone has them', () => {
    const next = effect('deal up to 2 cards from the pile to their stash', envOf(pile(3)));
    expect(ids(next, 'stash-p0')).toEqual(['c1', 'c2']);
    expect(ids(next, 'pile')).toEqual(['c0']);
  });
  it('takes what is there when the zone is short, in pile order', () => {
    const next = effect('deal up to 3 cards from the pile to their stash', envOf(pile(2)));
    expect(ids(next, 'stash-p0')).toEqual(['c0', 'c1']);
    expect(ids(next, 'pile')).toEqual([]);
  });
  it('moves none from an empty zone, and does not complain', () => {
    const env = envOf([]);
    expect(effect('deal up to 3 cards from the pile to their stash', env)).toEqual(env.state);
  });
  it('refuses a negative number as deal does', () => {
    const negative = () => effect('deal up to -1 cards from the pile to their stash', envOf(pile(2)));
    expect(negative).toThrow(new RuleError('A negative number of cards cannot be dealt.'));
  });
  it('deals to each player what is left when its turn comes', () => {
    const next = effect('deal up to 2 cards from the pile to each stash', envOf(pile(3)));
    expect(ids(next, 'stash-p0')).toEqual(['c1', 'c2']);
    expect(ids(next, 'stash-p1')).toEqual(['c0']);
  });

  it('deals 1 card to each stash, one to every seat', () => {
    const next = effect('deal 1 card from the pile to each stash', envOf(pile(3)));
    expect(ids(next, 'stash-p0')).toEqual(['c2']);
    expect(ids(next, 'stash-p1')).toEqual(['c1']);
    expect(ids(next, 'pile')).toEqual(['c0']);
  });
  it('deals 1 card as deal does: it refuses a zone that has none', () => {
    const empty = () => effect('deal 1 card from the pile to their stash', envOf([]));
    expect(empty).toThrow(new RuleError('There are no cards left in the pile.'));
  });
});

describe('a card goes into the bottom fifth of a zone', () => {
  const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);

  /** `n` other cards in the pile, slots 0 to n-1, and an Opal in the shop that goes in. */
  const stacked = (n: number, seed: number): PhraseEnv => {
    const others = Array.from({ length: n }, (_, i) => gem(`o${i}`, 'pile', 'Ruby', i));
    const state = fixtureState([...others, fixtureCard('in', 'shop', { name: 'Opal', cost: 1 }, { faceUp: true })]);
    return fixtureEnv({ ...state, rng: { seed, count: 0 } }, { game: game(), seats });
  };
  const slotAfter = (n: number, seed: number): number => {
    const next = effect('an Opal goes into the bottom fifth of the pile', stacked(n, seed));
    return ids(next, 'pile').indexOf('in');
  };
  const slotsFor = (n: number) => new Set(SEEDS.map((seed) => slotAfter(n, seed)));

  it('with 34 other cards, goes into slots 0 to 7, and every one of them comes up', () => {
    expect([...slotsFor(34)].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
  it('with no other card, goes to slot 0', () => {
    expect([...slotsFor(0)]).toEqual([0]);
  });
  it('with 3 other cards, goes into slots 0 to 1', () => {
    expect([...slotsFor(3)].sort((a, b) => a - b)).toEqual([0, 1]);
  });
  it('with 6 other cards, goes into slots 0 to 2', () => {
    expect([...slotsFor(6)].sort((a, b) => a - b)).toEqual([0, 1, 2]);
  });
  it('with 1 other card, goes below it or above it', () => {
    expect([...slotsFor(1)].sort((a, b) => a - b)).toEqual([0, 1]);
  });

  it('counts the slots from the bottom, and keeps the other cards in their order', () => {
    const next = effect('an Opal goes into the bottom fifth of the pile', stacked(10, 5));
    const slot = ids(next, 'pile').indexOf('in');
    expect(ids(next, 'pile').filter((id) => id !== 'in')).toEqual(Array.from({ length: 10 }, (_, i) => `o${i}`));
    expect(zoneCards(next, 'pile').map((c) => c.slot)).toEqual(Array.from({ length: 11 }, (_, i) => i));
    expect(slot).toBeLessThanOrEqual(2);
  });
  it('turns the card face down in a zone no one can see', () => {
    const next = effect('an Opal goes into the bottom fifth of the pile', stacked(5, 1));
    expect(next.cards.find((c) => c.id === 'in')).toMatchObject({ zoneId: 'pile', faceUp: false });
  });
  it('leaves it face up in a zone everyone can see', () => {
    const env = envOf([gem('o0', 'pool', 'Ruby', 0), fixtureCard('in', 'pile', { name: 'Opal', cost: 1 })]);
    const next = effect('an Opal goes into the bottom fifth of the pool', env);
    expect(next.cards.find((c) => c.id === 'in')).toMatchObject({ zoneId: 'pool', faceUp: true });
  });
  it('moves the random numbers on, once, and the same seed gives the same slot', () => {
    const env = stacked(34, 7);
    const next = effect('an Opal goes into the bottom fifth of the pile', env);
    expect(next.rng).toEqual({ seed: 7, count: 1 });
    expect(slotAfter(34, 7)).toBe(slotAfter(34, 7));
    expect(env.state.rng).toEqual({ seed: 7, count: 0 });
  });
  it('moves the random numbers on even when there is nothing to choose between', () => {
    expect(effect('an Opal goes into the bottom fifth of the pile', stacked(0, 7)).rng).toEqual({ seed: 7, count: 1 });
  });
  it('takes the first matching card in play, and leaves one that is out of the game alone', () => {
    const state = fixtureState([
      fixtureCard('gone', '__box', { name: 'Opal', cost: 1 }), fixtureCard('first', 'shop', { name: 'Opal', cost: 1 }),
      fixtureCard('second', 'stash-p1', { name: 'Opal', cost: 1 }), gem('o0', 'pile', 'Ruby', 0),
    ]);
    const next = effect('an Opal goes into the bottom fifth of the pile', fixtureEnv(state, { game: game(), seats }));
    expect(ids(next, 'pile')).toContain('first');
    expect(ids(next, 'pile')).not.toContain('second');
    expect(next.cards.find((c) => c.id === 'gone')?.zoneId).toBe('__box');
  });
  it('does not count itself among the other cards when it is in the zone already', () => {
    const cards = [...Array.from({ length: 5 }, (_, i) => gem(`o${i}`, 'pile', 'Ruby', i)), fixtureCard('in', 'pile', { name: 'Opal', cost: 1 }, { slot: 5 })];
    const next = effect('an Opal goes into the bottom fifth of the pile', fixtureEnv(fixtureState(cards), { game: game(), seats }));
    expect(ids(next, 'pile').indexOf('in')).toBeLessThanOrEqual(1);
    expect(ids(next, 'pile')).toHaveLength(6);
  });
  it('says so when no card is that kind', () => {
    const none = () => effect('an Opal goes into the bottom fifth of the pile', envOf([gem('o0', 'pile', 'Ruby', 0)]));
    expect(none).toThrow(new RuleError('No card is an Opal.'));
  });
  it('takes the card off the card it sat on, as any move does', () => {
    const env = envOf([gem('o0', 'pile', 'Ruby', 0), fixtureCard('in', 'shop', { name: 'Opal', cost: 1, 'lang:on': 'o0' })]);
    const next = effect('an Opal goes into the bottom fifth of the pile', env);
    expect(next.cards.find((c) => c.id === 'in')).toMatchObject({ zoneId: 'pile', data: { name: 'Opal', cost: 1 } });
    expect(next.cards.find((c) => c.id === 'in')?.data).not.toHaveProperty('lang:on');
  });
});

describe('the cards a press picked, and the left end of a row', () => {
  const crewCompiled = compileGame(CREW_GAME, lib);
  const crew = () => crewCompiled.game!;
  /** The 1-based number of `line` in `text`. */
  const at = (text: string, line: string) => text.split('\n').indexOf(line) + 1;
  const crewEnv = (cards: ReturnType<typeof fixtureCard>[], subject?: Subject): PhraseEnv =>
    fixtureEnv(fixtureState(cards), { game: crew(), seats, subject: subject ?? { player: 'p0', space: null, card: null } });
  const crewEffect = (text: string, env: PhraseEnv) => run<GameState>('effect', text, env);
  /** A card with a name, in a zone, at a slot counted from the bottom. */
  const card = (id: string, zoneId: string, slot: number, data: Record<string, string | number> = {}) =>
    fixtureCard(id, zoneId, { name: 'Potter', ...data }, { slot });

  it('compiles with the crew game it is tried on', () => {
    expect(crewCompiled.diagnostics).toEqual([]);
  });

  describe('dealing as many cards as were picked', () => {
    const DEAL = 'deal up to as many cards as they picked from the pile to their stash';
    const picked = (...cards: string[]): Subject => ({ player: 'p0', space: null, card: null, cards });
    const pile = (n: number) => Array.from({ length: n }, (_, i) => card(`c${i}`, 'pile', i));

    it('deals the top cards of the pile, as many as were picked, in pile order', () => {
      const next = crewEffect(DEAL, crewEnv(pile(4), picked('a', 'b')));
      expect(ids(next, 'stash-p0')).toEqual(['c2', 'c3']);
      expect(ids(next, 'pile')).toEqual(['c0', 'c1']);
    });
    it('deals what there is when the pile is short, and none from an empty pile', () => {
      expect(ids(crewEffect(DEAL, crewEnv(pile(1), picked('a', 'b'))), 'stash-p0')).toEqual(['c0']);
      const empty = crewEnv([], picked('a', 'b'));
      expect(crewEffect(DEAL, empty)).toEqual(empty.state);
    });
    it('deals none when none were picked', () => {
      const env = crewEnv(pile(2), picked());
      expect(crewEffect(DEAL, env)).toEqual(env.state);
    });
    it('is the phrase that needs the picked cards', () => {
      expect(lib.get('effect', 'deal up to as many cards as they picked from {zone} to {zone}')).toMatchObject({ needsCards: true });
    });
    it('is said in a button that picks no set only in the words that name what it needs', () => {
      const line = `      ${DEAL[0].toUpperCase()}${DEAL.slice(1)}.`;
      const text = CREW_GAME.replace('  A player may stop.', `  A player may count.\n    Then:\n${line}\n  A player may stop.`);
      expect(compileGame(text, lib).diagnostics.map((d) => [d.line, d.message])).toEqual([[
        at(text, line),
        `“${DEAL[0].toUpperCase()}${DEAL.slice(1)}” only makes sense in a button that picks some cards, like “A player may discard some cards from their hand.”`,
      ]]);
    });
    it('leaves a number of cards to the phrase for one (guard: passes before and after)', () => {
      const found = lib.match('effect', 'deal up to 2 cards from the pile to their stash', vocabFor(crew()));
      expect(found).toMatchObject({ status: 'ok', pattern: 'deal up to {int} cards from {zone} to {zone}' });
    });
  });

  describe('the left end of a row', () => {
    const MOVE = 'move their stash to the left end of the hall';
    // The hall is a row everyone can see, so its cards lie face up.
    const table = (extra: ReturnType<typeof fixtureCard>[] = []) => [
      { ...card('h1', 'hall', 0), faceUp: true }, { ...card('h2', 'hall', 1), faceUp: true }, { ...card('h3', 'hall', 2), faceUp: true },
      card('s1', 'stash-p0', 0), card('s2', 'stash-p0', 1), ...extra,
    ];

    it('puts each card of the first zone under the cards of the second, keeping its own order', () => {
      const next = crewEffect(MOVE, crewEnv(table()));
      expect(ids(next, 'hall')).toEqual(['s1', 's2', 'h1', 'h2', 'h3']);
      expect(zoneCards(next, 'hall').map((c) => c.slot)).toEqual([0, 1, 2, 3, 4]);
      expect(ids(next, 'stash-p0')).toEqual([]);
    });
    it('turns them face up in a row everyone can see', () => {
      const next = crewEffect(MOVE, crewEnv(table()));
      expect(zoneCards(next, 'hall').map((c) => c.faceUp)).toEqual([true, true, true, true, true]);
    });
    it('takes a card off the card it sat on', () => {
      const next = crewEffect(MOVE, crewEnv(table([card('s3', 'stash-p0', 2, { 'lang:on': 'h1' })])));
      expect(ids(next, 'hall')).toEqual(['s1', 's2', 's3', 'h1', 'h2', 'h3']);
      expect(next.cards.find((c) => c.id === 's3')?.data).toEqual({ name: 'Potter' });
    });
    it('gathers the zones of “each stash” in seat order, the first seat’s cards at the very left', () => {
      const env = crewEnv(table([card('t1', 'stash-p1', 0), card('t2', 'stash-p1', 1)]));
      expect(ids(crewEffect('move each stash to the left end of the hall', env), 'hall')).toEqual(['s1', 's2', 't1', 't2', 'h1', 'h2', 'h3']);
    });
    it('leaves the row alone when the first zone is empty', () => {
      const env = crewEnv([card('h1', 'hall', 0)]);
      expect(ids(crewEffect(MOVE, env), 'hall')).toEqual(['h1']);
    });
    it('is a phrase of its own', () => {
      expect(lib.match('effect', MOVE, vocabFor(crew()))).toMatchObject({ status: 'ok', pattern: 'move {zone} to the left end of {zone}' });
    });
    it('leaves a move to the top of a zone to the phrase for it (guard: passes before and after)', () => {
      const found = lib.match('effect', 'move their stash to the hall', vocabFor(crew()));
      expect(found).toMatchObject({ status: 'ok', pattern: 'move {zone} to {zone}' });
    });
  });

  // R7: a row that is over its limit lets its top cards go, so cards that come in at the left end push out the ones at the right.
  describe('R7: the push-out order', () => {
    const RETURNING = CREW_GAME
      .replace('Phase: working', 'In every phase:\n  When the hall has more than 4 cards:\n    Move the top card of the hall to the scrap.\n\nPhase: working')
      .replace(
        '  A player may stop.',
        '  A player may return some cards from their stash.\n    Then:\n      Move their stash to the left end of the hall.\n  A player may stop.',
      );

    it('lets the cards at the right end go first, the one on top of the row before the one under it', () => {
      const { game: returning, diagnostics } = compileGame(RETURNING, lib);
      expect(diagnostics).toEqual([]);
      const setUp = createEngine(returning!, lib, 2, initialState(returning!, 1)).engine.getState();
      const [s1, s2] = ids(setUp, 'stash-p0');
      // Setup has already pushed three hands out of the hall, so every hand goes back to the pile before four of them come to the hall.
      const hands = [...ids(setUp, 'hall'), ...ids(setUp, 'scrap')];
      const [h1, h2, h3, h4] = ids(setUp, 'hall');
      // Four cards in the hall, an empty scrap, and p0 holding the two cards that return.
      const arranged = relocate(relocate(setUp, hands, 'pile', returning!), [h1, h2, h3, h4], 'hall', returning!);
      const { engine } = createEngine(returning!, lib, 2, arranged);
      expect(engine.dispatch({ type: 'return some cards from their stash', by: 'p0', cardIds: [s1, s2] })).toMatchObject({ ok: true });
      const state = engine.getState();
      expect(ids(state, 'hall')).toEqual([s1, s2, h1, h2]);
      expect(ids(state, 'scrap')).toEqual([h4, h3]);
      expect(ids(state, 'stash-p0')).toEqual([]);
    });
  });
});

describe('a deal that shuffles a discard back in', () => {
  const reshuffling = compileGame(RESHUFFLE_GAME, lib);
  const dealGame = () => reshuffling.game!;
  const DEAL = 'deal up to 3 cards from the pile to their list, shuffling the done pile into it when it runs out';

  /** The 12 cards of the game: `pile` in the pile, then `done` in the done pile (face up there), the rest boxed. Ids c0…c11, slots from 0. */
  const arranged = (pile: number, done: number): GameState => fixtureState(Array.from({ length: 12 }, (_, i) => {
    if (i < pile) return fixtureCard(`c${i}`, 'pile', { name: 'Sweep' }, { slot: i });
    if (i < pile + done) return fixtureCard(`c${i}`, 'done-pile', { name: 'Sweep' }, { slot: i - pile, faceUp: true });
    return fixtureCard(`c${i}`, BOX_ZONE, { name: 'Sweep' });
  }));
  /** A line about p0 on `state`. */
  const envFor = (state: GameState): PhraseEnv => fixtureEnv(state, { game: dealGame(), seats, subject: { player: 'p0', space: null, card: null } });
  const dealing = (state: GameState, text = DEAL) => runPhrase<GameState>(lib, 'effect', text, envFor(state));

  it('compiles with the game it is tried on', () => {
    expect(reshuffling.diagnostics).toEqual([]);
  });

  it('shuffles the done pile into the pile when the pile runs out, and goes on dealing', () => {
    const before = arranged(1, 4);
    const next = dealing(before);
    // The done pile's cards go to the pile in their slot order, and the pile is shuffled with the state's random numbers.
    const { items, rng } = shuffleWithRng(zoneCards(before, 'done-pile'), before.rng);
    const shuffled = items.map((c) => c.id);
    // The pile's card goes first, as a run of its own; then the top two of the shuffled pile, in the order `deal up to` gives a run.
    expect(ids(next, 'list-p0')).toEqual(['c0', shuffled[2], shuffled[3]]);
    expect(ids(next, 'pile')).toEqual([shuffled[0], shuffled[1]]);
    expect(ids(next, 'done-pile')).toEqual([]);
    expect(next.rng).toEqual(rng);
    expect(next.rng).not.toEqual(before.rng);
  });
  it('turns the cards that go back face down, as the pile shows them', () => {
    const pile = zoneCards(dealing(arranged(1, 4)), 'pile');
    expect(pile).toHaveLength(2);
    expect(pile.every((c) => !c.faceUp)).toBe(true);
  });
  it('places the cards as deal up to does: the top three of the pile in their pile order, the top one last', () => {
    const next = dealing(arranged(5, 3));
    expect(ids(next, 'list-p0')).toEqual(['c2', 'c3', 'c4']);
    expect(zoneCards(next, 'list-p0').map((c) => c.slot)).toEqual([0, 1, 2]);
  });
  it('gives exactly what deal up to gives when the pile does not run dry, to one player and to each', () => {
    const plain = (text: string) => text.replace(', shuffling the done pile into it when it runs out', '');
    const EACH = DEAL.replace('their list', 'each list');
    // A pile that has enough, runs out exactly, or runs out with no done pile to bring back, for p0 alone and for both players.
    const cases: [string, number, number][] = [[DEAL, 5, 3], [DEAL, 3, 2], [DEAL, 4, 0], [EACH, 7, 3], [EACH, 6, 2], [EACH, 4, 0]];
    for (const [text, pile, done] of cases) {
      const before = arranged(pile, done);
      const next = dealing(before, text);
      expect(next).toEqual(dealing(before, plain(text)));
      expect(next.rng).toEqual(before.rng);
    }
  });

  describe('Review Focus: the random numbers move only when it shuffles', () => {
    it('leaves them alone when the pile has enough', () => {
      const before = arranged(5, 3);
      const next = dealing(before);
      expect([ids(next, 'list-p0').length, ids(next, 'pile').length, ids(next, 'done-pile').length]).toEqual([3, 2, 3]);
      expect(next.rng).toEqual(before.rng);
    });
    it('leaves them alone when the pile runs out exactly at the number', () => {
      const before = arranged(3, 2);
      const next = dealing(before);
      expect([ids(next, 'list-p0').length, ids(next, 'pile').length, ids(next, 'done-pile').length]).toEqual([3, 0, 2]);
      expect(next.rng).toEqual(before.rng);
    });
    it('leaves them alone when nothing is owed, though the pile is empty and the done pile is not', () => {
      const before = arranged(0, 2);
      const next = dealing(before, 'deal up to 0 cards from the pile to their list, shuffling the done pile into it when it runs out');
      expect(next).toEqual(before);
    });
  });

  describe('Review Focus: when there is little to deal', () => {
    it('moves nothing, and says nothing, when both are empty', () => {
      const before = arranged(0, 0);
      expect(dealing(before)).toEqual(before);
    });
    it('deals what the done pile holds when the pile is empty', () => {
      const before = arranged(0, 2);
      const next = dealing(before);
      expect(ids(next, 'list-p0')).toHaveLength(2);
      expect([ids(next, 'pile'), ids(next, 'done-pile')]).toEqual([[], []]);
      expect(next.rng).not.toEqual(before.rng);
    });
  });

  it('refuses a negative number as deal does, whatever the piles hold', () => {
    const negative = () => dealing(arranged(2, 2), 'deal up to -1 cards from the pile to their list, shuffling the done pile into it when it runs out');
    expect(negative).toThrow(new RuleError('A negative number of cards cannot be dealt.'));
  });
  it('reads 1 card as well as 3 cards', () => {
    const next = dealing(arranged(0, 2), 'deal up to 1 card from the pile to their list, shuffling the done pile into it when it runs out');
    expect(ids(next, 'list-p0')).toHaveLength(1);
    expect(ids(next, 'pile')).toHaveLength(1);
  });
  it('deals to each player in turn, shuffling when the pile runs out between them', () => {
    const next = dealing(arranged(4, 2), 'deal up to 3 cards from the pile to each list, shuffling the done pile into it when it runs out');
    expect([ids(next, 'list-p0').length, ids(next, 'list-p1').length, ids(next, 'pile').length, ids(next, 'done-pile').length]).toEqual([3, 3, 0, 0]);
    // p0 had the pile's top three before it ran out, as deal up to places them; p1 had the one left, and then two of the done pile's cards.
    expect(ids(next, 'list-p0')).toEqual(['c1', 'c2', 'c3']);
    expect(ids(next, 'list-p1')[0]).toBe('c0');
  });
  it('is not the phrase that deals without shuffling', () => {
    const found = lib.match('effect', 'deal up to 3 cards from the pile to their list', vocabFor(dealGame()));
    expect(found).toMatchObject({ status: 'ok', pattern: 'deal up to {int} cards from {zone} to {zone}' });
    const shuffling = lib.match('effect', DEAL, vocabFor(dealGame()));
    expect(shuffling).toMatchObject({ status: 'ok', pattern: 'deal up to {int} card(s) from {zone} to {zone}, shuffling {zone} into it when it runs out' });
  });

  describe('in the game', () => {
    const { game: g } = reshuffling;
    // p0 to move, so Setup is skipped; one card stays in the pile, four go to the done pile and the rest are boxed.
    const start = (): GameState => {
      const dealt = { ...initialState(g!, 1), turn: { current: 'p0', phase: 'working' } };
      const all = dealt.cards.map((c) => c.id);
      return relocate(relocate(dealt, all.slice(1, 5), 'done-pile', g!), all.slice(5), BOX_ZONE, g!);
    };

    it('replays from its log to the same state, shuffle and all, and undoes to the state before', () => {
      const before = start();
      const { engine } = createEngine(g!, lib, 2, before);
      const built = engine.getState();
      expect(engine.dispatch({ type: 'gather', by: 'p0' })).toMatchObject({ ok: true });
      const after = engine.getState();
      expect([ids(after, 'list-p0').length, ids(after, 'pile').length, ids(after, 'done-pile').length]).toEqual([3, 2, 0]);
      expect(after.rng).not.toEqual(built.rng);
      const fresh = createEngine(g!, lib, 2, before).engine;
      fresh.loadLog([...engine.getLog()]);
      expect(fresh.getState()).toEqual(after);
      engine.undo();
      expect(engine.getState()).toEqual(built);
    });
  });
});
