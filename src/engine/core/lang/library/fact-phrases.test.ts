import { describe, expect, it } from 'vitest';
import type { GameState } from '../../game-state';
import { bankOf, ownerOf, placePiece, setBank, setOwner, setSpaceFact, spaceFact } from '../board-state';
import { compileGame } from '../compile';
import { runExamples } from '../examples';
import { RuleError } from '../diagnostics';
import { FIXTURE_SPACES, TINY_BOARD_HEAD, fixtureBoardGame, fixtureBoardState, fixtureEnv, runPhrase } from '../testing';
import type { FactSpec, Moment, SpaceSpec } from '../types';
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
