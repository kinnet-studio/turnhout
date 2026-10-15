import { describe, expect, it } from 'vitest';
import { zoneCards, type GameState } from '../../game-state';
import { bankOf, ownerOf, placePiece, setBank, setOwner, setSpaceFact, spaceFact } from '../board-state';
import { cardFact, changeCard } from '../card-facts';
import { textFaceKey } from '../cards';
import { compileGame } from '../compile';
import { runExamples } from '../examples';
import { RuleError } from '../diagnostics';
import {
  FIXTURE_SPACES, TINY_BOARD_HEAD, fixtureBoardGame, fixtureBoardState, fixtureCard, fixtureEnv, fixtureGame, fixtureState, runPhrase,
} from '../testing';
import type { CompiledGame, FactSpec, Moment, MoveInfo, SpaceSpec, Subject } from '../types';
import { createDefaultLibrary } from './index';

const lib = createDefaultLibrary();

// Rose Lane (5) has a second orange street to go with it. FIXTURE_SPACES stays at its eight spaces: slice 1's walks depend on them.
const LILY_LANE: SpaceSpec = { name: 'Lily Lane', attrs: { kind: 'street', color: 'orange', price: 180, rent: 14 } };
const FACTS: FactSpec[] = [{ name: 'houses', on: 'space', kind: 'number' }, { name: 'hotel', on: 'space', kind: 'flag' }];
const boardOf = (over: Partial<NonNullable<ReturnType<typeof fixtureBoardGame>['board']>>) => ({ ...fixtureBoardGame().board!, ...over });
const game = fixtureBoardGame({
  facts: FACTS,
  board: boardOf({ spaces: [...FIXTURE_SPACES, LILY_LANE], bank: [{ name: 'houses', start: 32 }, { name: 'hotels', start: 12 }] }),
});

const ROSE = 5;
const LILY = 8;
const fresh = (g = game) => fixtureBoardState(g);
/** The env of a rule about a player and, unless the rule is about the space their piece is on, a space. */
const about = (state: GameState, space: number | null = null, g = game, player = 'p0') =>
  fixtureEnv(state, { game: g, seats: ['p0', 'p1'], subject: { player, space, card: null } });
/** The env of an example line: no player, no space. */
const bare = (state: GameState, g = game) => fixtureEnv(state, { game: g, seats: ['p0', 'p1'] });

const effect = (text: string, state: GameState, space: number | null = ROSE, g = game) => runPhrase<GameState>(lib, 'effect', text, about(state, space, g));
const condition = (text: string, state: GameState, space: number | null = ROSE, g = game, player = 'p0') =>
  runPhrase<boolean>(lib, 'condition', text, about(state, space, g, player));
const given = (text: string, state: GameState = fresh()) => runPhrase<GameState>(lib, 'given', text, bare(state));
const expectThat = (text: string, state: GameState = fresh()) => runPhrase<true | string>(lib, 'expect', text, bare(state));

const withHouses = (state: GameState, space: number, n: number) => setSpaceFact(state, space, 'houses', n);
const withHotel = (state: GameState, space: number) => setSpaceFact(state, space, 'hotel', true);

describe('taking from the bank', () => {
  it('takes one from the bank and adds one to the count the space has', () => {
    const s = effect('it gets a house from the bank', fresh());
    expect(spaceFact(s, ROSE, 'houses')).toBe(1);
    expect(bankOf(s, 'houses')).toBe(31);
    expect(spaceFact(effect('it gets a house from the bank', s), ROSE, 'houses')).toBe(2);
  });
  it('is about the space the rule names, else the one their piece is on', () => {
    expect(spaceFact(effect('it gets a house from the bank', fresh(), LILY), LILY, 'houses')).toBe(1);
    expect(spaceFact(effect('it gets a house from the bank', placePiece(fresh(), 'p0', 1), null), 1, 'houses')).toBe(1);
  });
  it('says so when the bank has none left, and changes nothing', () => {
    const empty = setBank(fresh(), 'houses', 0);
    expect(() => effect('it gets a house from the bank', empty)).toThrow(new RuleError('The bank has no houses left.'));
    expect(() => effect('it gets a hotel from the bank', setBank(fresh(), 'hotels', 0))).toThrow(new RuleError('The bank has no hotels left.'));
  });
  it('sets the flag that is named the singular of what it takes, and leaves the rest of the bank as it was', () => {
    const s = effect('it gets a hotel from the bank', fresh());
    expect(spaceFact(s, ROSE, 'hotel')).toBe(true);
    expect(bankOf(s, 'hotels')).toBe(11);
    expect(bankOf(s, 'houses')).toBe(32);
    expect(spaceFact(s, ROSE, 'houses')).toBeNull();
  });
  it('says so when the flag is already set, and takes nothing from the bank', () => {
    const once = effect('it gets a hotel from the bank', fresh());
    expect(() => effect('it gets a hotel from the bank', once)).toThrow(new RuleError('Rose Lane already has a hotel.'));
    expect([bankOf(once, 'hotels'), spaceFact(once, ROSE, 'hotel')]).toEqual([11, true]);
    // A space that was only given the flag, with the bank full, is no different.
    expect(() => effect('it gets a hotel from the bank', withHotel(fresh(), LILY), LILY)).toThrow('Lily Lane already has a hotel.');
    // Another space may still have one, and so may a space that had its flag cleared.
    expect(spaceFact(effect('it gets a hotel from the bank', once, LILY), LILY, 'hotel')).toBe(true);
    expect(spaceFact(effect('it gets a hotel from the bank', setSpaceFact(once, ROSE, 'hotel', false)), ROSE, 'hotel')).toBe(true);
  });
  it('goes with the number of the same name before the flag named its singular', () => {
    const both = fixtureBoardGame({
      facts: [{ name: 'token', on: 'space', kind: 'flag' }, { name: 'tokens', on: 'space', kind: 'number' }],
      board: boardOf({ bank: [{ name: 'tokens', start: 5 }] }),
    });
    const s = effect('it gets a token from the bank', fresh(both), ROSE, both);
    expect([spaceFact(s, ROSE, 'tokens'), spaceFact(s, ROSE, 'token')]).toEqual([1, null]);
  });
  it('says so when no fact goes with the bank item', () => {
    const lonely = fixtureBoardGame({ facts: [], board: boardOf({ bank: [{ name: 'tokens', start: 5 }] }) });
    expect(() => effect('it gets a token from the bank', fresh(lonely), ROSE, lonely)).toThrow(new RuleError("No fact goes with the bank's tokens."));
    // A fact on cards, or a number the bank does not name, is no match either.
    const wrong = fixtureBoardGame({
      facts: [{ name: 'token', on: 'card', kind: 'flag' }, { name: 'coins', on: 'space', kind: 'number' }],
      board: boardOf({ bank: [{ name: 'tokens', start: 5 }] }),
    });
    expect(() => effect('it gets a token from the bank', fresh(wrong), ROSE, wrong)).toThrow("No fact goes with the bank's tokens.");
  });
});

describe('giving back to the bank', () => {
  it('adds what it had to the bank and sets the count to 0', () => {
    const start = setBank(withHouses(fresh(), ROSE, 4), 'houses', 20);
    const s = effect('its houses go back to the bank', start);
    expect(spaceFact(s, ROSE, 'houses')).toBe(0);
    expect(bankOf(s, 'houses')).toBe(24);
  });
  it('is no change in the bank for a space that has none, and leaves other spaces alone', () => {
    const start = withHouses(withHouses(fresh(), LILY, 3), ROSE, 1);
    const s = effect('its houses go back to the bank', start, LILY);
    expect([spaceFact(s, LILY, 'houses'), spaceFact(s, ROSE, 'houses'), bankOf(s, 'houses')]).toEqual([0, 1, 35]);
    expect(bankOf(effect('its houses go back to the bank', fresh()), 'houses')).toBe(32);
  });
  it('says so when the bank keeps nothing of that name', () => {
    const lonely = fixtureBoardGame({ facts: [{ name: 'tokens', on: 'space', kind: 'number' }], board: boardOf({ bank: [] }) });
    expect(() => effect('its tokens go back to the bank', setSpaceFact(fresh(lonely), ROSE, 'tokens', 2), ROSE, lonely))
      .toThrow(new RuleError('No bank item goes with the fact tokens.'));
  });

  it('returns a count and a flag from every space they own, and only theirs', () => {
    const owned = setOwner(setOwner(setOwner(fresh(), ROSE, 'p0'), LILY, 'p0'), 3, 'p1');
    const start = withHotel(withHotel(withHouses(withHouses(owned, ROSE, 2), 3, 4), LILY), 3);
    const hotels = effect('their hotels go back to the bank', start, null);
    expect(bankOf(hotels, 'hotels')).toBe(13);
    expect([ROSE, LILY, 3].map((at) => spaceFact(hotels, at, 'hotel'))).toEqual([false, false, true]);
    expect(bankOf(hotels, 'houses')).toBe(32);
    const houses = effect('their houses go back to the bank', start, null);
    expect(bankOf(houses, 'houses')).toBe(34);
    expect([ROSE, LILY, 3].map((at) => spaceFact(houses, at, 'houses'))).toEqual([0, 0, 4]);
  });
  it('returns one hotel per owned space that has one', () => {
    const base = setOwner(setOwner(setOwner(fresh(), 1, 'p0'), ROSE, 'p0'), LILY, 'p0');
    const s = effect('their hotels go back to the bank', setBank(withHotel(withHotel(base, ROSE), LILY), 'hotels', 10), null);
    expect(bankOf(s, 'hotels')).toBe(12);
    expect(ownerOf(s, ROSE)).toBe('p0');
  });
  it('gives back for the player the rule is about', () => {
    const owned = withHotel(setOwner(setOwner(fresh(), ROSE, 'p0'), LILY, 'p1'), LILY);
    const s = runPhrase<GameState>(lib, 'effect', 'their hotels go back to the bank', about(withHotel(owned, ROSE), null, game, 'p1'));
    expect([bankOf(s, 'hotels'), spaceFact(s, LILY, 'hotel'), spaceFact(s, ROSE, 'hotel')]).toEqual([13, false, true]);
  });
  it('says so when no fact goes with the bank item', () => {
    const lonely = fixtureBoardGame({ facts: [], board: boardOf({ bank: [{ name: 'tokens', start: 5 }] }) });
    expect(() => effect('their tokens go back to the bank', fresh(lonely), null, lonely)).toThrow(new RuleError("No fact goes with the bank's tokens."));
  });
  it('is no clash with their spaces going back to the bank', () => {
    const start = setOwner(fresh(), ROSE, 'p0');
    expect(ownerOf(effect('their spaces go back to the bank', start, null), ROSE)).toBeNull();
  });
});

describe('judging what a space has', () => {
  it('judges a flag, which a space never given one does not have', () => {
    expect(condition('it has a hotel', fresh())).toBe(false);
    expect(condition('it has no hotel', fresh())).toBe(true);
    const s = withHotel(fresh(), ROSE);
    expect(condition('it has a hotel', s)).toBe(true);
    expect(condition('it has no hotel', s)).toBe(false);
    expect(condition('it has a hotel', s, LILY)).toBe(false);
    expect(condition('it has a hotel', setSpaceFact(s, ROSE, 'hotel', false))).toBe(false);
  });
  it('judges a count, which a space never given one has none of', () => {
    expect(condition('it has 0 houses', fresh())).toBe(true);
    const s = withHouses(fresh(), ROSE, 3);
    expect(condition('it has 3 houses', s)).toBe(true);
    expect(condition('it has 2 houses', s)).toBe(false);
    expect(condition('it has 3 houses', s, LILY)).toBe(false);
    expect(condition('it has 1 house', withHouses(fresh(), ROSE, 1))).toBe(true);
  });
  it('judges fewer than', () => {
    const s = withHouses(fresh(), ROSE, 3);
    expect(condition('it has fewer than 4 houses', s)).toBe(true);
    expect(condition('it has fewer than 3 houses', s)).toBe(false);
    expect(condition('it has fewer than 1 house', fresh())).toBe(true);
  });
  it('judges whether the bank has one, when it has any at all', () => {
    expect(condition('the bank has a house', fresh())).toBe(true);
    expect(condition('the bank has a house', setBank(fresh(), 'houses', 1))).toBe(true);
    expect(condition('the bank has a house', setBank(fresh(), 'houses', 0))).toBe(false);
    expect(condition('the bank has a hotel', setBank(fresh(), 'hotels', 0))).toBe(false);
  });
});

describe('owning every space of a set', () => {
  const owning = (...spaces: number[]) => spaces.reduce((state, at) => setOwner(state, at, 'p0'), fresh());
  const OWNS_SET = 'they own every street of its color';

  it('is so when they own the other orange street too, from either of them', () => {
    expect(condition(OWNS_SET, owning(ROSE, LILY))).toBe(true);
    expect(condition(OWNS_SET, owning(ROSE, LILY), LILY)).toBe(true);
  });
  it('is not so with only one of them, or when another player owns the other', () => {
    expect(condition(OWNS_SET, owning(ROSE))).toBe(false);
    expect(condition(OWNS_SET, owning(LILY))).toBe(false);
    expect(condition(OWNS_SET, setOwner(owning(ROSE), LILY, 'p1'))).toBe(false);
    expect(condition(OWNS_SET, fresh())).toBe(false);
  });
  it('is about the player the rule is about', () => {
    expect(condition(OWNS_SET, owning(ROSE, LILY), ROSE, game, 'p1')).toBe(false);
  });
  it('is about the spaces of that kind and color only', () => {
    // Other spaces owned do not make the set, and an orange space of another kind is not in it.
    expect(condition(OWNS_SET, owning(ROSE, 3, 1))).toBe(false);
    const park = fixtureBoardGame({ board: boardOf({ spaces: [...FIXTURE_SPACES, { ...LILY_LANE, attrs: { ...LILY_LANE.attrs, kind: 'park' } }] }) });
    const rose = setOwner(fresh(park), ROSE, 'p0');
    expect(condition(OWNS_SET, rose, ROSE, park)).toBe(true);
    expect(condition('they own every park of its color', rose, LILY, park)).toBe(false);
    expect(condition('they own every park of its color', setOwner(rose, LILY, 'p0'), LILY, park)).toBe(true);
  });
  it('is not so for a space that has no color, since it is in no set', () => {
    expect(condition(OWNS_SET, owning(1, 3), 3)).toBe(false);
    expect(condition(OWNS_SET, owning(0), 0)).toBe(false);
  });
});

describe('the moment someone lands on a space someone else owns', () => {
  const MOMENT = 'a player lands on a space someone else owns';
  const lands = (state: GameState, space: number, seat = 'p0') =>
    runPhrase<boolean>(lib, 'moment', MOMENT, bare(state), { kind: 'land', seat, space } satisfies Moment);

  it('holds for a land on an owned station or utility, whatever the space is', () => {
    expect(lands(setOwner(fresh(), 3, 'p1'), 3)).toBe(true);
    expect(lands(setOwner(fresh(), 6, 'p1'), 6)).toBe(true);
    expect(lands(setOwner(fresh(), ROSE, 'p1'), ROSE)).toBe(true);
  });
  it('does not hold for a space no one owns, or one the lander owns', () => {
    expect(lands(fresh(), 3)).toBe(false);
    expect(lands(setOwner(fresh(), 3, 'p0'), 3)).toBe(false);
    expect(lands(setOwner(fresh(), 3, 'p0'), 3, 'p1')).toBe(true);
  });
  it('does not hold for passing a space', () => {
    expect(runPhrase<boolean>(lib, 'moment', MOMENT, bare(setOwner(fresh(), 3, 'p1')), { kind: 'pass', seat: 'p0', space: 3 })).toBe(false);
  });
});

describe('the spaces a button may point at', () => {
  const MILL = 1;
  const STATION = 3;
  /** Whether the target phrase allows `space` for `player`, who has the owners it is given. */
  const allows = (text: string, space: number, owners: [number, string][] = [], player = 'p0', g = game) =>
    runPhrase<boolean>(lib, 'target', text, about(owners.reduce((state, [at, seat]) => setOwner(state, at, seat), fresh(g)), null, g, player), space);

  it('“a street they own” is a street, and one they own', () => {
    const owners: [number, string][] = [[MILL, 'p0'], [ROSE, 'p1'], [STATION, 'p0']];
    expect(allows('a street they own', MILL, owners)).toBe(true);
    // Someone else's, no one's, and not a street at all.
    expect(allows('a street they own', ROSE, owners)).toBe(false);
    expect(allows('a street they own', LILY, owners)).toBe(false);
    expect(allows('a street they own', STATION, owners)).toBe(false);
    expect(allows('a street they own', 0, owners)).toBe(false);
  });
  it('is about the player who presses the button', () => {
    const owners: [number, string][] = [[MILL, 'p0']];
    expect(allows('a street they own', MILL, owners, 'p1')).toBe(false);
    expect(allows('a street they own', MILL, [[MILL, 'p1']], 'p1')).toBe(true);
  });
  it('“a street” is any street, whoever owns it or none', () => {
    expect(allows('a street', MILL)).toBe(true);
    expect(allows('a street', ROSE, [[ROSE, 'p1']])).toBe(true);
    expect(allows('a street', STATION, [[STATION, 'p0']])).toBe(false);
    expect(allows('a street', 0)).toBe(false);
  });
  it('“a space they own” is any space they own, of any kind', () => {
    const owners: [number, string][] = [[STATION, 'p0'], [ROSE, 'p1']];
    expect(allows('a space they own', STATION, owners)).toBe(true);
    expect(allows('a space they own', ROSE, owners)).toBe(false);
    expect(allows('a space they own', 0, owners)).toBe(false);
    // Space 0 is a space too.
    expect(allows('a space they own', 0, [[0, 'p0']])).toBe(true);
  });
  it('says “an” for a kind that starts with a vowel, and means the same as “a”', () => {
    const AIRPORT = 9;
    const airports = fixtureBoardGame({
      facts: FACTS, board: boardOf({ spaces: [...FIXTURE_SPACES, LILY_LANE, { name: 'Heathrow', attrs: { kind: 'airport', price: 300 } }] }),
    });
    const owners: [number, string][] = [[AIRPORT, 'p0'], [MILL, 'p1']];
    expect(allows('an airport they own', AIRPORT, owners, 'p0', airports)).toBe(true);
    expect(allows('an airport they own', AIRPORT, owners, 'p1', airports)).toBe(false);
    expect(allows('an airport they own', MILL, owners, 'p1', airports)).toBe(false);
    expect(allows('an airport', AIRPORT, [], 'p1', airports)).toBe(true);
    expect(allows('an airport', MILL, [[MILL, 'p0']], 'p0', airports)).toBe(false);
  });
  it('needs a board and a player, so the compiler keeps it out of a game that has none', () => {
    for (const phrase of ['a {spacekind} they own', 'an {spacekind} they own', 'a {spacekind}', 'an {spacekind}', 'a space they own']) {
      expect(lib.get('target', phrase), phrase).toMatchObject({ needsBoard: true, needsPlayer: phrase.endsWith('they own') });
    }
  });
});

describe('example phrases', () => {
  describe('given', () => {
    it('sets what a space has, without touching the bank', () => {
      const s = given('Rose Lane has 4 houses');
      expect([spaceFact(s, ROSE, 'houses'), bankOf(s, 'houses')]).toEqual([4, 32]);
      const one = given('Lily Lane has 1 house');
      expect(spaceFact(one, LILY, 'houses')).toBe(1);
    });
    it('sets a flag, without touching the bank', () => {
      const s = given('Rose Lane has a hotel');
      expect([spaceFact(s, ROSE, 'hotel'), bankOf(s, 'hotels')]).toEqual([true, 12]);
    });
    it('says what the bank has, without touching anything a space has', () => {
      const s = given('the bank has 20 houses', given('Rose Lane has 4 houses'));
      expect([bankOf(s, 'houses'), spaceFact(s, ROSE, 'houses')]).toEqual([20, 4]);
      expect(bankOf(given('the bank has 0 hotels'), 'hotels')).toBe(0);
      expect(bankOf(given('the bank has 1 hotel'), 'hotels')).toBe(1);
    });
  });
  describe('expect', () => {
    it('passes when a space has what it should', () => {
      expect(expectThat('Rose Lane has 0 houses')).toBe(true);
      expect(expectThat('Rose Lane has 1 house', withHouses(fresh(), ROSE, 1))).toBe(true);
      expect(expectThat('Rose Lane has a hotel', withHotel(fresh(), ROSE))).toBe(true);
      expect(expectThat('Rose Lane has no hotel')).toBe(true);
      expect(expectThat('the bank has 32 houses')).toBe(true);
    });
    it('says what a space has instead', () => {
      expect(expectThat('Rose Lane has 1 house')).toBe('Expected Rose Lane to have 1 house, but it has 0.');
      expect(expectThat('Rose Lane has 2 houses', withHouses(fresh(), ROSE, 3))).toBe('Expected Rose Lane to have 2 houses, but it has 3.');
      expect(expectThat('Rose Lane has a hotel')).toBe('Expected Rose Lane to have a hotel, but it has none.');
      expect(expectThat('Lily Lane has no hotel', withHotel(fresh(), LILY))).toBe('Expected Lily Lane to have no hotel, but it has one.');
    });
    it('says what the bank has instead', () => {
      expect(expectThat('the bank has 31 houses')).toBe('Expected the bank to have 31 houses, but it has 32.');
      expect(expectThat('the bank has 1 hotel')).toBe('Expected the bank to have 1 hotel, but it has 12.');
      expect(expectThat('the bank has 0 hotels', setBank(fresh(), 'hotels', 2))).toBe('Expected the bank to have 0 hotels, but it has 2.');
    });
    it('names a plural bank item in the singular for one of it, with the plural forms English has', () => {
      const odd = fixtureBoardGame({
        facts: [{ name: 'boxes', on: 'space', kind: 'number' }, { name: 'pennies', on: 'space', kind: 'number' }],
        board: boardOf({ bank: [{ name: 'boxes', start: 3 }, { name: 'pennies', start: 3 }] }),
      });
      expect(runPhrase(lib, 'expect', 'the bank has 1 box', bare(fresh(odd), odd))).toBe('Expected the bank to have 1 box, but it has 3.');
      expect(runPhrase(lib, 'expect', 'the bank has 1 penny', bare(fresh(odd), odd))).toBe('Expected the bank to have 1 penny, but it has 3.');
      expect(runPhrase(lib, 'expect', 'the bank has 2 pennies', bare(fresh(odd), odd))).toBe('Expected the bank to have 2 pennies, but it has 3.');
    });
    it('says "an" before a flag that starts with a vowel', () => {
      const inns = fixtureBoardGame({ facts: [{ name: 'inn', on: 'space', kind: 'flag' }], board: boardOf({}) });
      expect(runPhrase(lib, 'expect', 'Rose Lane has a inn', bare(fresh(inns), inns))).toBe('Expected Rose Lane to have an inn, but it has none.');
    });
  });
});

describe('reading the lines of a game', () => {
  const WITH_FACTS = TINY_BOARD_HEAD.replace(
    '  There are two six-sided dice.', ['  There are two six-sided dice.', '  Spaces can have houses and a hotel.', '  The bank has 32 houses and 12 hotels.'].join('\n'),
  );
  const BUILDING = [
    '  A player may build on the space they are on.',
    '    Only if it has a price.',
    '    Only if it has a hotel.',
    '    Only if it has no hotel.',
    '    Only if it has 2 houses.',
    '    Only if it has fewer than 4 houses.',
    '    Only if the bank has a house.',
    '    Only if they own every street of its color.',
    '    Then:',
    '      It gets a house from the bank.',
    '      It gets a hotel from the bank.',
    '      Its houses go back to the bank.',
    '      Their hotels go back to the bank.',
    '      Their spaces go back to the bank.',
    '  When a player lands on a space someone else owns:',
    '    They pay its rent to its owner.',
    '  When a player lands on a street someone else owns:',
    '    They pay its rent to its owner.',
    '  When a player lands on a street or tax space someone else owns:',
    '    They pay its rent to its owner.',
  ].join('\n');
  const text = `${WITH_FACTS}\n${BUILDING}`;
  const compiled = compileGame(text, lib);

  it('reads "it has a price" as a detail of the space and "it has a hotel" as a fact, with no clash', () => {
    expect(compiled.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const [build] = compiled.game!.phases[0].actions;
    const read = (words: string) => build.conditions.flatMap((group) => group.refs).find((ref) => ref.text === words)?.phrase;
    expect(read('it has a price')).toBe('it has a {spaceattr}');
    expect(read('it has a hotel')).toBe('it has a {spaceflag}');
    expect(read('it has no hotel')).toBe('it has no {spaceflag}');
    expect(read('it has 2 houses')).toBe('it has {int} {spacenumber}');
    expect(read('it has fewer than 4 houses')).toBe('it has fewer than {int} {spacenumber}');
    expect(read('the bank has a house')).toBe('the bank has a {banked}');
    expect(read('they own every street of its color')).toBe('they own every {spacekind} of its {spaceattr}');
    expect(build.effects.map((ref) => ref.phrase)).toEqual([
      'it gets a {banked} from the bank', 'it gets a {banked} from the bank', 'its {spacenumber} go back to the bank',
      'their {banked} go back to the bank', 'their spaces go back to the bank',
    ]);
  });
  it('reads "a space someone else owns" as the new moment, and a kind of space as the old one', () => {
    const phrases = compiled.game!.phases[0].moments.map((moment) => moment.when.phrase);
    expect(phrases).toEqual([
      'a player lands on a space someone else owns', 'a player lands on {spaceclass} someone else owns', 'a player lands on {spaceclass} someone else owns',
    ]);
  });
  it('names the fact a misspelt flag was meant for, and the detail a misspelt detail was meant for', () => {
    const problem = (line: string, text = WITH_FACTS) =>
      compileGame(`${text}\n  A player may build on the space they are on.\n    Only if ${line}.`, lib).diagnostics.filter((d) => d.severity === 'error');
    expect(problem('it has a hotl')).toEqual([expect.objectContaining({ message: 'There is no space fact called “hotl”.', suggestions: ['hotel'] })]);
    expect(problem('it has a prise')).toEqual([expect.objectContaining({ message: 'There is no space detail called “prise”.', suggestions: ['price'] })]);
    expect(problem('it has a hotel')).toEqual([]);
    expect(problem('it has fewer than 3 hoses')).toEqual([expect.objectContaining({ message: 'There is no space fact called “hoses”.', suggestions: ['houses'] })]);
    expect(problem('the bank has a hotl')).toEqual([expect.objectContaining({ message: 'There is no bank item called “hotl”.', suggestions: ['hotels'] })]);
  });
  it('reads a flag that is written with "an" in every phrase that has an article', () => {
    const inns = WITH_FACTS.replace('  Spaces can have houses and a hotel.', '  Spaces can have an inn.').replace('32 houses and 12 hotels', '32 houses and 12 inns');
    const rules = [
      inns, '  A player may build on the space they are on.', '    Only if it has an inn.', '    Only if it has no inn.', '    Only if the bank has an inn.',
      '    Then:', '      It gets an inn from the bank.', '', 'Example: an inn', '  Given p0 is on Rose Lane', '  And Rose Lane has an inn',
      '  Then Rose Lane has an inn', '  And Mill Lane has no inn',
    ].join('\n');
    const built = compileGame(rules, lib);
    expect(built.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(runExamples(built.game!, lib).map((r) => r.status)).toEqual(['pass']);
    const problem = (line: string) =>
      compileGame(`${inns}\n  A player may build on the space they are on.\n    Only if ${line}.`, lib).diagnostics.filter((d) => d.severity === 'error');
    expect(problem('it has an inm')).toEqual([expect.objectContaining({ message: 'There is no space fact called “inm”.', suggestions: ['inn'] })]);
    expect(problem('it has an prise')).toEqual([expect.objectContaining({ message: 'There is no space detail called “prise”.', suggestions: ['price'] })]);
  });
  it('builds and gives back in a played example, in a designer\'s words', () => {
    const rules = [
      WITH_FACTS,
      '  A player may build on the space they are on.',
      '    Only if it has fewer than 4 houses.',
      '    Then:',
      '      It gets a house from the bank.',
      '  A player may knock down the space they are on.',
      '    Then:',
      '      Their houses go back to the bank.',
      '',
      'Example: a house comes from the bank',
      '  Given p0 is on Rose Lane',
      '  When p0 builds on the space they are on',
      '  Then Rose Lane has 1 house',
      '  And the bank has 31 houses',
      '',
      'Example: a house is refused at four',
      '  Given p0 is on Rose Lane',
      '  And Rose Lane has 4 houses',
      '  When p0 builds on the space they are on',
      '  Then it is rejected',
      '',
      'Example: a wrong count says what there was',
      '  Given p0 is on Rose Lane',
      '  When p0 builds on the space they are on',
      '  Then Rose Lane has 2 houses',
      '',
      'Example: giving back',
      '  Given p0 owns Rose Lane',
      '  And Rose Lane has 3 houses',
      '  And the bank has 20 houses',
      '  When p0 knocks down the space they are on',
      '  Then Rose Lane has no hotel',
      '  And the bank has 23 houses',
    ].join('\n');
    const built = compileGame(rules, lib);
    expect(built.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const results = runExamples(built.game!, lib);
    expect(results.map((r) => [r.status, r.message])).toEqual([
      ['pass', null], ['pass', null], ['fail', 'Expected Rose Lane to have 2 houses, but it has 1.'], ['pass', null],
    ]);
  });
});

describe('facts on cards', () => {
  // Two creatures' camps (a public row each), a hand, the deck and the discard pile, for two players.
  const creatures: CompiledGame = fixtureGame({
    name: 'Venom Fixture',
    players: { min: 2, max: 2 },
    zones: [
      { name: 'deck', perPlayer: false, layout: 'pile', visibility: 'secret' },
      { name: 'discard pile', perPlayer: false, layout: 'pile', visibility: 'public' },
      { name: 'hand', perPlayer: true, layout: 'hand', visibility: 'owner' },
      { name: 'camp', perPlayer: true, layout: 'row', visibility: 'public' },
    ],
    cards: [{
      kind: 'table', start: 'deck', acesHigh: false,
      identities: [['Knight', 3], ['Archer', 2], ['Viper', 1]].map(([name, health]) => ({ attrs: { name, health }, faceKey: textFaceKey({ name, health }) })),
    }],
    facts: [{ name: 'poisoned', on: 'card', kind: 'flag' }],
  });
  const SEATS = ['p0', 'p1'];

  const faceOf = (name: string, health: number, poisoned = false) => textFaceKey({ name, health, ...(poisoned ? { poisoned: 'yes' } : {}) });
  const creature = (id: string, zoneId: string, slot: number, name: string, health: number, poisoned = false) =>
    fixtureCard(id, zoneId, { name, health, ...(poisoned ? { poisoned: true } : {}) }, { slot, faceKey: faceOf(name, health, poisoned), faceUp: true });
  /**
   * p0's camp holds c0, c1 (poisoned) and c6 (no health left); p1's holds c2, c3 (poisoned), c4 (poisoned) and c5 (no health left).
   * c7 is at 0 health in a hand and c8 in the discard pile, where no camp rule reaches them.
   */
  const table = (): GameState => fixtureState([
    creature('c0', 'camp-p0', 0, 'Knight', 3), creature('c1', 'camp-p0', 1, 'Archer', 2, true), creature('c6', 'camp-p0', 2, 'Knight', 0),
    creature('c2', 'camp-p1', 0, 'Knight', 3), creature('c3', 'camp-p1', 1, 'Viper', 1, true), creature('c4', 'camp-p1', 2, 'Knight', 3, true),
    creature('c5', 'camp-p1', 3, 'Viper', 0), creature('c7', 'hand-p0', 0, 'Archer', 0), creature('c8', 'discard-pile', 0, 'Knight', 0),
  ]);
  const env = (state: GameState, subject: Subject | undefined, move?: MoveInfo) => fixtureEnv(state, { game: creatures, seats: SEATS, subject, move });
  const byPlayer = (player: string): Subject => ({ player, space: null, card: null });
  const aboutCard = (card: string): Subject => ({ player: null, space: null, card });
  const cardOf = (state: GameState, id: string) => state.cards.find((c) => c.id === id)!;
  const healthOf = (state: GameState, ...ids: string[]) => ids.map((id) => cardFact(cardOf(state, id), 'health'));

  const effectAs = (text: string, subject: Subject, state = table()) => runPhrase<GameState>(lib, 'effect', text, env(state, subject));
  const holdsFor = (text: string, subject: Subject, state = table(), move?: MoveInfo) =>
    runPhrase<boolean>(lib, 'condition', text, env(state, subject, move));
  const bare = (state: GameState) => env(state, undefined);

  describe('every card in a zone is …', () => {
    it('sets the fact on every card of the other player\'s camp, and on no other card', () => {
      const s = effectAs("every card in the other player's camp is poisoned", byPlayer('p0'));
      for (const id of ['c2', 'c3', 'c4', 'c5']) expect(cardFact(cardOf(s, id), 'poisoned'), id).toBe(true);
      for (const id of ['c0', 'c6', 'c7', 'c8']) expect(cardFact(cardOf(s, id), 'poisoned'), id).toBeNull();
      expect(cardFact(cardOf(s, 'c1'), 'poisoned')).toBe(true);
    });
    it('is the other seat for whoever the rule is about', () => {
      const s = effectAs("every card in the other player's camp is poisoned", byPlayer('p1'));
      expect(s.cards.filter((c) => c.zoneId === 'camp-p0').map((c) => cardFact(c, 'poisoned'))).toEqual([true, true, true]);
      expect(cardFact(cardOf(s, 'c2'), 'poisoned')).toBeNull();
    });
    it('is about the player making the move, when a move is being made', () => {
      const move: MoveInfo = { verb: 'play', by: 'p1', cardId: 'c3', from: 'hand-p1', to: 'camp-p1' };
      const s = runPhrase<GameState>(lib, 'effect', "every card in the other player's camp is poisoned", env(table(), undefined, move));
      expect(cardFact(cardOf(s, 'c0'), 'poisoned')).toBe(true);
      expect(cardFact(cardOf(s, 'c2'), 'poisoned')).toBeNull();
    });
    it('refreshes the face of each card it changes, and leaves the rest as they were', () => {
      const before = table();
      const s = effectAs("every card in the other player's camp is poisoned", byPlayer('p0'), before);
      expect(cardOf(s, 'c2').faceKey).toBe(faceOf('Knight', 3, true));
      expect(cardOf(s, 'c5').faceKey).toBe(faceOf('Viper', 0, true));
      expect(cardOf(s, 'c0')).toBe(cardOf(before, 'c0'));
    });
    it('takes a zone of its own name, and every one of the zones “each camp” names', () => {
      const own = effectAs('every card in their camp is poisoned', byPlayer('p0'));
      expect(cardFact(cardOf(own, 'c0'), 'poisoned')).toBe(true);
      expect(cardFact(cardOf(own, 'c2'), 'poisoned')).toBeNull();
      const all = effectAs('every card in each camp is poisoned', aboutCard('c0'));
      expect(all.cards.filter((c) => c.zoneId.startsWith('camp-')).every((c) => cardFact(c, 'poisoned') === true)).toBe(true);
      expect(cardFact(cardOf(all, 'c7'), 'poisoned')).toBeNull();
    });
    it('does nothing to an empty zone', () => {
      const before = fixtureState([]);
      expect(effectAs("every card in the other player's camp is poisoned", byPlayer('p0'), before)).toEqual(before);
    });
  });

  describe('each … card in a zone loses …', () => {
    it('lowers only the poisoned cards of the zone, and their faces show it', () => {
      const s = effectAs('each poisoned card in their camp loses 1 health', byPlayer('p0'));
      expect(healthOf(s, 'c0', 'c1', 'c6')).toEqual([3, 1, 0]);
      expect(cardOf(s, 'c1').faceKey).toBe(faceOf('Archer', 1, true));
      expect(cardOf(s, 'c0').faceKey).toBe(faceOf('Knight', 3));
      // The other camp, a hand and the discard pile are not touched.
      expect(healthOf(s, 'c2', 'c3', 'c4', 'c5', 'c7', 'c8')).toEqual([3, 1, 3, 0, 0, 0]);
    });
    it('is about the other camp for the other player', () => {
      const s = effectAs('each poisoned card in their camp loses 1 health', byPlayer('p1'));
      expect(healthOf(s, 'c2', 'c3', 'c4')).toEqual([3, 0, 2]);
      expect(cardOf(s, 'c3').faceKey).toBe(textFaceKey({ name: 'Viper', health: 0, poisoned: 'yes' }));
      expect(healthOf(s, 'c1')).toEqual([2]);
    });
    it('takes the whole amount, down to 0 and never below it, so a rule about 0 health still finds the card', () => {
      expect(healthOf(effectAs('each poisoned card in their camp loses 3 health', byPlayer('p0')), 'c1')).toEqual([0]);
      const dead = effectAs('each poisoned card in their camp loses 1 health', byPlayer('p1'), effectAs('each poisoned card in their camp loses 1 health', byPlayer('p1')));
      expect(healthOf(dead, 'c3')).toEqual([0]);
    });
    it('leaves a poisoned card that has no health to lose as it is', () => {
      const state = fixtureState([fixtureCard('c0', 'camp-p0', { name: 'Ghost', poisoned: true }, { faceKey: textFaceKey({ name: 'Ghost', poisoned: 'yes' }), slot: 0 })]);
      expect(effectAs('each poisoned card in their camp loses 1 health', byPlayer('p0'), state)).toEqual(state);
    });
  });

  describe('which cards a rule is about', () => {
    it('lists the cards of the camps that have that much health, camp by camp and slot by slot', () => {
      expect(runPhrase<string[]>(lib, 'which', 'a card in a camp has 0 health', bare(table()))).toEqual(['c6', 'c5']);
      expect(runPhrase<string[]>(lib, 'which', 'a card in a camp has 1 health', bare(table()))).toEqual(['c3']);
      expect(runPhrase<string[]>(lib, 'which', 'a card in a camp has 3 health', bare(table()))).toEqual(['c0', 'c2', 'c4']);
    });
    it('lists nothing when no card has it', () => {
      expect(runPhrase<string[]>(lib, 'which', 'a card in a camp has 9 health', bare(table()))).toEqual([]);
    });
    it('follows the slots, not the order of the cards in the game', () => {
      const state = fixtureState([creature('c0', 'camp-p1', 1, 'Viper', 0), creature('c1', 'camp-p1', 0, 'Viper', 0), creature('c2', 'camp-p0', 5, 'Viper', 0)]);
      expect(runPhrase<string[]>(lib, 'which', 'a card in a camp has 0 health', bare(state))).toEqual(['c2', 'c1', 'c0']);
    });
    it('goes by what a card has now, so a card that lost its health is listed', () => {
      const s = effectAs('each poisoned card in their camp loses 1 health', byPlayer('p1'));
      expect(runPhrase<string[]>(lib, 'which', 'a card in a camp has 0 health', bare(s))).toEqual(['c6', 'c3', 'c5']);
    });
  });

  describe('judging a card', () => {
    it('“it is poisoned” is about the card the rule is about', () => {
      expect(holdsFor('it is poisoned', aboutCard('c3'))).toBe(true);
      expect(holdsFor('it is poisoned', aboutCard('c0'))).toBe(false);
      expect(holdsFor('it is poisoned', aboutCard('c1'))).toBe(true);
    });
    it('is not so for a flag that was cleared or set to no', () => {
      expect(holdsFor('it is poisoned', aboutCard('c3'), changeCard(table(), 'c3', { poisoned: false }, creatures))).toBe(false);
      expect(holdsFor('it is poisoned', aboutCard('c3'), changeCard(table(), 'c3', { poisoned: null }, creatures))).toBe(false);
    });
    it('says so when the rule is about no card', () => {
      expect(() => holdsFor('it is poisoned', byPlayer('p0'))).toThrow('This phrase needs a card, but none is being judged.');
    });
    it('“the card is poisoned” is about the card of the move', () => {
      const move = (cardId: string): MoveInfo => ({ verb: 'play', by: 'p0', cardId, from: 'hand-p0', to: 'camp-p0' });
      expect(holdsFor('the card is poisoned', byPlayer('p0'), table(), move('c1'))).toBe(true);
      expect(holdsFor('the card is poisoned', byPlayer('p0'), table(), move('c0'))).toBe(false);
    });
    it('needs a card for “it”, and a move for “the card”, so the compiler keeps each to the rules it fits', () => {
      expect(lib.get('condition', 'it is {cardflag}')).toMatchObject({ needsCard: true, needsMove: false });
      expect(lib.get('condition', 'the card is {cardflag}')).toMatchObject({ needsMove: true, needsCard: false });
      expect(lib.get('effect', 'move it to {zone}')).toMatchObject({ needsCard: true });
      expect(lib.get('effect', 'every card in {zone} is {cardflag}')).toMatchObject({ needsCard: false });
    });
  });

  describe('moving the card a rule is about', () => {
    it('puts it at the end of the zone, with every fact it had', () => {
      const s = effectAs('move it to the discard pile', aboutCard('c3'));
      expect(cardOf(s, 'c3')).toMatchObject({ zoneId: 'discard-pile', slot: 1, faceUp: true, faceKey: faceOf('Viper', 1, true) });
      expect(cardFact(cardOf(s, 'c3'), 'poisoned')).toBe(true);
      expect(healthOf(s, 'c3')).toEqual([1]);
      expect(zoneCards(s, 'camp-p1').map((c) => c.id)).toEqual(['c2', 'c4', 'c5']);
      expect(zoneCards(s, 'discard-pile').map((c) => c.id)).toEqual(['c8', 'c3']);
    });
    it('moves only that card', () => {
      const before = table();
      const s = effectAs('move it to the discard pile', aboutCard('c5'), before);
      expect(s.cards.filter((c, i) => c !== before.cards[i]).map((c) => c.id)).toEqual(['c5']);
    });
    it('says so when the rule is about no card', () => {
      expect(() => effectAs('move it to the discard pile', byPlayer('p0'))).toThrow('This phrase needs a card, but none is being judged.');
    });
    it('says so when the zone is more than one', () => {
      expect(() => effectAs('move it to each camp', aboutCard('c3'))).toThrow(new RuleError('each camp is more than one zone, but this rule needs just one.'));
    });
  });

  describe('the player with the most cards', () => {
    const MOST = 'the player with the most cards in their camp wins';
    const winner = (state: GameState) => runPhrase<string>(lib, 'winner', MOST, bare(state), {});
    it('is whose camp holds the most', () => {
      expect(winner(table())).toBe('p1');
      expect(winner(effectAs('move it to the discard pile', aboutCard('c6')))).toBe('p1');
      expect(winner(effectAs('move it to the discard pile', aboutCard('c4'), effectAs('move it to the discard pile', aboutCard('c3'))))).toBe('p0');
    });
    it('is the earliest seat in a tie', () => {
      const tied = effectAs('move it to the discard pile', aboutCard('c2'));
      expect(winner(tied)).toBe('p0');
      expect(runPhrase<string>(lib, 'winner', MOST, fixtureEnv(tied, { game: creatures, seats: ['p1', 'p0'] }), {})).toBe('p1');
      expect(winner(fixtureState([]))).toBe('p0');
    });
    it('counts the cards of that zone only', () => {
      const state = fixtureState([creature('c0', 'camp-p0', 0, 'Knight', 3), creature('c1', 'hand-p1', 0, 'Knight', 3), creature('c2', 'hand-p1', 1, 'Knight', 3)]);
      expect(winner(state)).toBe('p0');
    });
  });

  describe('example phrases', () => {
    const given = (text: string, state = table()) => runPhrase<GameState>(lib, 'given', text, bare(state));
    const expectThat = (text: string, state = table()) => runPhrase<true | string>(lib, 'expect', text, bare(state));

    it('gives a card a fact, and its face shows it', () => {
      const s = given("the Knight in p1's camp is poisoned");
      expect(cardFact(cardOf(s, 'c2'), 'poisoned')).toBe(true);
      expect(cardOf(s, 'c2').faceKey).toBe(faceOf('Knight', 3, true));
      expect(cardFact(cardOf(s, 'c0'), 'poisoned')).toBeNull();
    });
    it('means the first card of the zone that is that card, and is just as sure of an article', () => {
      expect(cardFact(cardOf(given("a Knight in p1's camp is poisoned", table()), 'c2'), 'poisoned')).toBe(true);
      expect(cardFact(cardOf(given("the Archer in p0's camp is poisoned", table()), 'c1'), 'poisoned')).toBe(true);
    });
    it('says so when the zone has no such card', () => {
      expect(() => given("the Viper in p0's camp is poisoned")).toThrow(new RuleError("There is no Viper in p0's camp."));
    });

    it('expects a fact', () => {
      expect(expectThat("the Viper in p1's camp is poisoned")).toBe(true);
      expect(expectThat("the Knight in p1's camp is poisoned")).toBe("Expected the Knight in p1's camp to be poisoned, but it isn't.");
      expect(expectThat("the Knight in p1's camp is not poisoned")).toBe(true);
      expect(expectThat("the Viper in p1's camp is not poisoned")).toBe("Expected the Viper in p1's camp not to be poisoned, but it is.");
    });
    it('expects a number a card has', () => {
      expect(expectThat("the Knight in p1's camp has 3 health")).toBe(true);
      expect(expectThat("the Knight in p1's camp has 2 health")).toBe("Expected the Knight in p1's camp to have 2 health, but it has 3.");
      expect(expectThat("the Archer in p0's camp has 0 health", effectAs('each poisoned card in their camp loses 3 health', byPlayer('p0')))).toBe(true);
    });
    it('says what is missing when the zone has no such card', () => {
      expect(expectThat("the Viper in p0's camp is poisoned")).toBe("Expected the Viper in p0's camp to be poisoned, but there is no Viper in p0's camp.");
      expect(expectThat("the Viper in p0's camp is not poisoned")).toBe("Expected the Viper in p0's camp not to be poisoned, but there is no Viper in p0's camp.");
      expect(expectThat("the Viper in p0's camp has 1 health")).toBe("Expected the Viper in p0's camp to have 1 health, but there is no Viper in p0's camp.");
    });
    it('says a card has no number it was never given', () => {
      const state = fixtureState([fixtureCard('c0', 'camp-p0', { name: 'Knight' }, { slot: 0 })]);
      expect(expectThat("the Knight in p0's camp has 1 health", state)).toBe("Expected the Knight in p0's camp to have 1 health, but it has no health.");
    });
  });
});

describe('a small card game with facts, played from a designer\'s words', () => {
  const VENOM = [
    'Game: Venom Rules', 'Players: 2', '', 'Cards:', '  A deck called creatures, starting in the deck:',
    '    | name   | health | copies |', '    | Knight | 3      | 6      |', '    | Archer | 2      | 6      |', '    | Viper  | 1      | 4      |',
    '  Cards can be poisoned.', '',
    'Table:', '  The deck is a pile in the center that no one can see.', '  The discard pile is a pile in the center that everyone can see.',
    '  Each player has a hand that only they can see.', '  Each player has a camp that everyone can see.', '',
    'Setup:', '  Shuffle the deck.', '  Deal 4 cards from the deck to each hand.', '',
    'Phase: playing', '  Players take turns.',
    '  A player may play a card from their hand to their camp.', '    Then:',
    '      Each poisoned card in their camp loses 1 health.', '      If the card is a Viper, every card in the other player\'s camp is poisoned.',
    '  When a card in a camp has 0 health:', '    Only if it is poisoned.', '    Move it to the discard pile.',
    '  A player may cure a card from their camp to their hand.', '    Only if the card is poisoned.',
    '  After a player plays or cures, the turn passes to the left.', '',
    'End:', '  The game ends when the deck and every hand are empty.', '  The player with the most cards in their camp wins.',
  ].join('\n');
  const EXAMPLES = [
    '', 'Example: a Viper poisons the other camp', '  Given p0 holds a Viper', "  And p1's camp has a Knight", '  When p0 plays a Viper',
    "  Then the Knight in p1's camp is poisoned", "  And the Knight in p1's camp has 3 health", '',
    'Example: poisoned cards lose health when their owner plays and go when they have none', '  Given it is p1\'s turn', '  And p1 holds an Archer',
    "  And p1's camp has a Viper", "  And the Viper in p1's camp is poisoned", '  When p1 plays an Archer',
    '  Then the discard pile has a Viper', "  And p1's camp has an Archer", '',
    'Example: a wrong health says what there was', "  Given p0 holds a Viper", "  And p1's camp has a Knight", '  When p0 plays a Viper',
    "  Then the Knight in p1's camp has 2 health", '',
    'Example: only a poisoned card can be cured', "  Given p0's camp has a Knight", '  When p0 cures a Knight', '  Then it is rejected because "the card is poisoned"',
  ].join('\n');

  it('reads every line, with the card rule bound to cards and no problem', () => {
    const { game, diagnostics } = compileGame(`${VENOM}${EXAMPLES}`, lib);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const [play] = game!.phases[0].moves;
    expect(play.effects.map((ref) => [ref.kind, ref.phrase])).toEqual([['effect', 'each {cardflag} card in {zone} loses {int} {attribute}'], ['lang', 'if']]);
    const [, cure] = game!.phases[0].moves;
    expect(cure.conditions[0].refs[0]).toMatchObject({ kind: 'condition', phrase: 'the card is {cardflag}' });
    expect(game!.phases[0].triggers[0].conditions[0].refs[0]).toMatchObject({ kind: 'condition', phrase: 'it is {cardflag}' });
    expect(game!.phases[0].triggers[0].effects[0]).toMatchObject({ kind: 'effect', phrase: 'move it to {zone}' });
    expect(game!.phases[0].triggers[0].when).toMatchObject({ kind: 'which', phrase: 'a card in a {perzone} has {int} {attribute}', args: ['camp', 0, 'health'] });
    expect(game!.end!.winner).toMatchObject({ kind: 'winner', phrase: 'the player with the most cards in their {perzone} wins' });
  });
  it('plays its examples: the card rule moves each card that ran out of health, and a wrong number is said', () => {
    const { game } = compileGame(`${VENOM}${EXAMPLES}`, lib);
    expect(runExamples(game!, lib).map((r) => [r.status, r.message])).toEqual([
      ['pass', null], ['pass', null], ['fail', "Expected the Knight in p1's camp to have 2 health, but it has 3."], ['pass', null],
    ]);
  });
});
