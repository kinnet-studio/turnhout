import { describe, expect, it } from 'vitest';
import { cardById, zoneCards, type GameState } from '../../game-state';
import type { PlayerId } from '../../scene';
import { markOut } from '../board-state';
import { createEngine, initialState } from '../build';
import { compileGame } from '../compile';
import { GUILD_GAME, runPhrase } from '../testing';
import { RESTING_GAME } from '../testing';
import { COUNT_GAME } from '../testing';
import { BOOST_GAME } from '../testing';
import { putOn } from '../attach';
import { changeCard } from '../card-facts';
import type { CompiledGame } from '../types';
import { HOLDER_KEY, relocate } from '../zones';
import { createDefaultLibrary } from './index';

const lib = createDefaultLibrary();

/** Compiles rules that must have no problems at all. */
function compiled(text: string): CompiledGame {
  const { game, diagnostics } = compileGame(text, lib);
  expect(diagnostics).toEqual([]);
  return game!;
}

const game = compiled(GUILD_GAME);
const SEATS: PlayerId[] = ['p0', 'p1', 'p2'];
const { engine, runtime } = createEngine(game, lib, 3, initialState(game, 1));
/** The state once Setup has run, from seed 1: two jobs in each stash, the rest in the pile, the hands in the hall. */
const setUp = engine.getState();
const all = (name: string) => setUp.cards.filter((card) => card.data?.name === name).map((card) => card.id);
const [vase, secondVase] = all('Vase');
const [bowl] = all('Bowl');
const [statue, secondStatue] = all('Statue');
const [tower, secondTower] = all('Tower');
const [potter] = all('Potter');
const [smith] = all('Smith');

/**
 * p0's workshop holding a Vase (clay), p1's a Bowl (clay) and a Statue (stone), and p2's a Tower (no mark); and in p0's stash the other
 * Vase (wanting nothing), Statue (wanting clay) and Tower (wanting stone), for p0 to move.
 */
const table = [
  (state: GameState) => relocate(state, [vase], 'workshop-p0', game),
  (state: GameState) => relocate(state, [bowl, statue], 'workshop-p1', game),
  (state: GameState) => relocate(state, [tower], 'workshop-p2', game),
  (state: GameState) => relocate(state, [secondVase, secondStatue, secondTower], 'stash-p0', game),
].reduce((state, arrange) => arrange(state), setUp);

/**
 * A condition judged about `seat` for p0's press of the card `moved` in their stash, as the press of a button that picks a card is
 * judged: “the card” is the card the press moves, and “they” the seat it is judged about.
 */
const holds = (text: string, moved: string, seat: PlayerId, state: GameState = table) => runPhrase<boolean>(lib, 'condition', text, runtime.env(
  state, { verb: 'start', by: 'p0', cardId: moved, from: 'stash-p0', to: 'stash-p0' }, undefined, { player: seat, space: null, card: moved },
));
/** The seats a condition holds about, for p0's press of the card `moved`. */
const holdsAbout = (text: string, moved: string, state: GameState = table) => SEATS.filter((seat) => holds(text, moved, seat, state));

const HAVE = "they have a card in their workshop whose mark is the card's wants";
const HAVE_NO = "they have no card in their workshop whose mark is the card's wants";
const SOME = "some player has a card in their workshop whose mark is the card's wants";
const ANOTHER = "another player has a card in their workshop whose mark is the card's wants";

describe('a card of theirs compared with the card a press moves', () => {
  it('finds a card whose mark is what the card wants, in the zone of the player it is judged about', () => {
    // A Statue wants clay: p0's Vase and p1's Bowl make it, and p2's Tower makes nothing.
    expect(holdsAbout(HAVE, secondStatue)).toEqual(['p0', 'p1']);
    // A Tower wants stone: only p1's Statue makes it.
    expect(holdsAbout(HAVE, secondTower)).toEqual(['p1']);
  });
  it('Review Focus: blank against blank: a card that wants nothing is given it by no card, not even one that makes nothing', () => {
    expect(holdsAbout(HAVE, secondVase)).toEqual([]);
    expect(holds(HAVE, secondVase, 'p2')).toBe(false);
  });
  it('says the opposite when they have no such card', () => {
    expect(holdsAbout(HAVE_NO, secondStatue)).toEqual(['p2']);
    expect(holdsAbout(HAVE_NO, secondTower)).toEqual(['p0', 'p2']);
    expect(holdsAbout(HAVE_NO, secondVase)).toEqual(['p0', 'p1', 'p2']);
  });
  it('compares with a value written, a card without the value never passing', () => {
    expect(holdsAbout('they have a card in their workshop whose mark is clay', secondVase)).toEqual(['p0', 'p1']);
    expect(holdsAbout('they have a card in their workshop whose red size is 0', secondVase)).toEqual(['p2']);
    expect(holdsAbout('they have a card in their workshop whose gold size is more than 3', secondVase)).toEqual(['p1', 'p2']);
  });
});

describe('a card of any player compared with the card a press moves', () => {
  it('finds one in the zone of any player still in, the one it is judged about included', () => {
    expect(holds(SOME, secondTower, 'p0')).toBe(true);
    expect(holds(SOME, secondTower, 'p1')).toBe(true);
    expect(holds(SOME, secondVase, 'p0')).toBe(false);
  });
  it('finds one of another player only in the zones of the others', () => {
    // Only p1 makes stone.
    expect(holds(ANOTHER, secondTower, 'p1')).toBe(false);
    expect(holds(ANOTHER, secondTower, 'p0')).toBe(true);
  });
  it('leaves out a player who is out', () => {
    expect(holds(SOME, secondTower, 'p0', markOut(table, 'p1'))).toBe(false);
    expect(holds(ANOTHER, secondTower, 'p0', markOut(table, 'p1'))).toBe(false);
  });
});

describe('a value a card has none of', () => {
  it('reads the card a press moves', () => {
    expect(holds('the card has no wants', secondVase, 'p0')).toBe(true);
    expect(holds('the card has no wants', secondStatue, 'p0')).toBe(false);
  });
  it('reads the card a rule is about', () => {
    const about = (id: string) => runtime.env(table, undefined, undefined, { player: null, space: null, card: id });
    expect(runPhrase<boolean>(lib, 'condition', 'it has no mark', about(tower))).toBe(true);
    expect(runPhrase<boolean>(lib, 'condition', 'it has no mark', about(vase))).toBe(false);
  });
});

describe('a group of cards kept by a test', () => {
  it('adds up only the cards that pass it', () => {
    const aboutP1 = (state: GameState) => runtime.env(state, undefined, undefined, { player: 'p1', space: null, card: null });
    const total = (n: number, state: GameState) =>
      runPhrase<boolean>(lib, 'condition', `the total red size of the cards in their workshop whose mark is clay is ${n}`, aboutP1(state));
    // The Bowl's 1, and with the Vase its 3 too; the Statue's stone mark is left out.
    expect(total(1, table)).toBe(true);
    expect(total(4, relocate(table, [secondVase], 'workshop-p1', game))).toBe(true);
  });
});

describe('finishing a job', () => {
  const HIRE = 'hire a card from the hall to a card in their workshop';

  it('sends the grumpy hands on it to the scrap and the rest to the hall, then the job to the scrap', () => {
    const { engine: playing } = createEngine(game, lib, 3, relocate(setUp, [vase], 'workshop-p0', game));
    expect(playing.dispatch({ type: HIRE, by: 'p0', cardId: smith, onto: vase })).toMatchObject({ ok: true });
    expect(playing.dispatch({ type: HIRE, by: 'p0', cardId: potter, onto: vase })).toMatchObject({ ok: true });
    expect(playing.dispatch({ type: 'finish a card in their workshop', by: 'p0', cardId: vase })).toMatchObject({ ok: true });
    const state = playing.getState();
    expect(zoneCards(state, 'scrap').map((card) => card.id)).toEqual([smith, vase]);
    expect(cardById(state, potter)?.zoneId).toBe('hall');
    expect(state.cards.filter((card) => card.data !== undefined && Object.hasOwn(card.data, HOLDER_KEY))).toEqual([]);
  });
});

describe('a card of theirs that is or is not so, compared with the card a press moves', () => {
  const resting = compiled(RESTING_GAME);
  // Setup deals 2 jobs to each stash, more than the pile holds for three: a state with p0's turn set skips it.
  const built = createEngine(resting, lib, 3, { ...initialState(resting, 1), turn: { current: 'p0', phase: 'working' } });
  const start = built.engine.getState();
  const [working, started] = start.cards.filter((card) => card.data?.name === 'Vase').map((card) => card.id);
  /** A Vase (pay 1) in p0's workshop, and the other in p0's stash for p0 to start. */
  const placed = relocate(relocate(start, [working], 'workshop-p0', resting), [started], 'stash-p0', resting);
  const HAVE_CLAUSE = "they have a card in their workshop that is not resting and whose pay is the card's pay";
  const HAVE_NO_CLAUSE = "they have no card in their workshop that is not resting and whose pay is the card's pay";
  /** A condition judged about p0 for their press of the Vase in their stash. */
  const judged = (text: string, state: GameState) => runPhrase<boolean>(lib, 'condition', text, built.runtime.env(
    state, { verb: 'start', by: 'p0', cardId: started, from: 'stash-p0', to: 'stash-p0' }, undefined, { player: 'p0', space: null, card: started },
  ));

  it('finds a card that is not so and whose pay is the pay of the card pressed', () => {
    expect([judged(HAVE_CLAUSE, placed), judged(HAVE_NO_CLAUSE, placed)]).toEqual([true, false]);
  });
  it('finds none once that card is so', () => {
    const rested = changeCard(placed, working, { resting: true }, resting);
    expect([judged(HAVE_CLAUSE, rested), judged(HAVE_NO_CLAUSE, rested)]).toEqual([false, true]);
  });
});

describe('at least some cards of theirs that pass a test', () => {
  const counting = compiled(COUNT_GAME);
  // Setup deals 2 jobs to each stash, more than the pile holds for three: a state with p0's turn set skips it.
  const built = createEngine(counting, lib, 3, { ...initialState(counting, 1), turn: { current: 'p0', phase: 'working' } });
  const start = built.engine.getState();
  const every = (name: string) => start.cards.filter((card) => card.data?.name === name).map((card) => card.id);
  const [[jar], [potterHand, otherPotter], [smithHand], [tinkerHand]] = ['Vase', 'Potter', 'Smith', 'Tinker'].map(every);
  /** p0's workshop holding the Vase, with a Potter and the Smith on it in p0's crew; p0's idle holding the Tinker and the other Potter. */
  const crewed = [
    (state: GameState) => relocate(state, [jar], 'workshop-p0', counting),
    (state: GameState) => putOn(state, [potterHand, smithHand], 'crew-p0', jar, counting),
    (state: GameState) => relocate(state, [tinkerHand, otherPotter], 'idle-p0', counting),
  ].reduce((state, arrange) => arrange(state), start);
  /** Whether `seat` has at least `n` cards in their crew and their idle whose wage is more than 0. */
  const atLeast = (seat: PlayerId, n: number) => runPhrase<boolean>(
    lib, 'condition', `they have at least ${n} cards in their crew and their idle whose wage is more than 0`,
    built.runtime.env(crewed, undefined, undefined, { player: seat, space: null, card: null }),
  );

  it('holds when enough of the cards in their zones pass', () => {
    expect(atLeast('p0', 2)).toBe(true);
  });
  it('reads each card as its value is worked out, and holds no further than the cards that pass', () => {
    // Wages 1, 2, 1 and 1: the Potter, the Smith, the Tinker (whose column says 0 and whose worked wage is 1) and the other Potter.
    expect([atLeast('p0', 4), atLeast('p0', 5)]).toEqual([true, false]);
  });
  it('holds of at least 0 cards about a player who has none', () => {
    expect([atLeast('p1', 0), atLeast('p1', 1)]).toEqual([true, false]);
  });
});

describe('what its owner has', () => {
  const boost = compiled(BOOST_GAME);
  // Setup deals 2 jobs to each stash, more than the pile holds for three: a state with p0's turn set skips it.
  const built = createEngine(boost, lib, 3, { ...initialState(boost, 1), turn: { current: 'p0', phase: 'working' } });
  const start = built.engine.getState();
  const every = (name: string) => start.cards.filter((card) => card.data?.name === name).map((card) => card.id);
  const [[jar, scrapped], [potterHand]] = ['Vase', 'Potter'].map(every);
  /** A Vase in p0's workshop, the other Vase in the scrap, and a Potter in `seat`'s idle, tired or not. */
  const table = (seat: PlayerId, tired: boolean) => [
    (state: GameState) => relocate(state, [jar], 'workshop-p0', boost),
    (state: GameState) => relocate(state, [scrapped], 'scrap', boost),
    (state: GameState) => relocate(state, [potterHand], `idle-${seat}`, boost),
    (state: GameState) => changeCard(state, potterHand, { tired }, boost),
  ].reduce((state, arrange) => arrange(state), start);
  const guarded = (state: GameState, id: string) => built.runtime.workedFlag(state, id, 'guarded');
  /** A line about the card `id` and no player, read as a rule about that card reads it. */
  const judged = (text: string, state: GameState, id: string) =>
    runPhrase<boolean>(lib, 'condition', text, built.runtime.env(state, undefined, undefined, { player: null, space: null, card: id }));
  const HAS_NONE = 'its owner has no card in their idle that is tired';

  it("holds of a card in a player's zone when that player has such a card: a Vase in p0's workshop, with a tired Potter in p0's idle", () => {
    expect(guarded(table('p0', true), jar)).toBe(true);
  });
  it("does not hold when their card is not so, nor when the card that is so is another player's", () => {
    expect(guarded(table('p0', false), jar)).toBe(false);
    expect(guarded(table('p1', true), jar)).toBe(false);
  });
  it('does not hold of a card in the center, which has no owner', () => {
    expect(guarded(table('p0', true), scrapped)).toBe(false);
  });
  it('reads the other way round: it holds when its owner has none, and of a card that has no owner', () => {
    expect(judged(HAS_NONE, table('p0', true), scrapped)).toBe(true);
    expect(judged(HAS_NONE, table('p0', false), jar)).toBe(true);
    expect(judged(HAS_NONE, table('p0', true), jar)).toBe(false);
  });
  it('marks both as about a card', () => {
    for (const pattern of ['its owner has a card in their {perzone} {cardclause}', 'its owner has no card in their {perzone} {cardclause}']) {
      expect([pattern, lib.get('condition', pattern)?.needsCard]).toEqual([pattern, true]);
    }
  });
});
