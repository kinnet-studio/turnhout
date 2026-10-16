import { describe, expect, it } from 'vitest';
import STARTUP_SIMULATOR from './startup-simulator.rules?raw';
import { compileGame } from '@/engine/core/lang/compile';
import { createDefaultLibrary } from '@/engine/core/lang/library';
import { runExamples } from '@/engine/core/lang/examples';
import { createEngine, initialState } from '@/engine/core/lang/build';
import { NEXT_CARD_KEY } from '@/engine/core/lang/cards';
import { ROUND_KEY, START_PLAYER_KEY } from '@/engine/core/lang/turns';
import { zoneIdFor } from '@/engine/core/lang/zones';
import { zoneCards, type GameState } from '@/engine/core/game-state';
import type { CardState } from '@/engine/core/scene';

const lib = createDefaultLibrary();
const { game, diagnostics } = compileGame(STARTUP_SIMULATOR, lib);

const JUNIORS = ['Junior Software Dev', 'Junior Hardware Eng', 'Junior QA Tester'];
/** The product columns that hold a number of cubes: C4 says each is a number, 0 where the rulebook prints none of that color. */
const CUBES = ['blue cost', 'red cost', 'blue maint', 'red maint'] as const;
/** The product columns the rulebook's sums are checked over. */
const SUMMED = ['blue cost', 'red cost', 'rev', 'val', 'blue maint', 'red maint'] as const;
/** The Crash goes among the bottom ⌈34 / 5⌉ + 1 cards of the Growth Deck (§4.1). */
const CRASH_REACH = 8;

const fresh = (seed = 1) => initialState(game!, seed);
const nameOf = (card: CardState) => card.data?.name;
const inZone = (cards: CardState[], zoneId: string) => cards.filter((card) => card.zoneId === zoneId);
const sum = (cards: CardState[], column: string) => cards.reduce((total, card) => total + (card.data?.[column] as number), 0);
const sums = (cards: CardState[]) => Object.fromEntries(SUMMED.map((column) => [column, sum(cards, column)]));

/** How many cards there are of each name. */
function nameCounts(cards: CardState[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const card of cards) counts[nameOf(card) as string] = (counts[nameOf(card) as string] ?? 0) + 1;
  return counts;
}

/** The talent card whose name is `name`, as dealt at seed 1. */
const talent = (name: string) => inZone(fresh().cards, 'talent-deck').find((card) => nameOf(card) === name)!;
/** The product card whose name is `name`, as dealt at seed 1. */
const product = (name: string) => fresh().cards.find((card) => nameOf(card) === name)!;

/** An engine at the start of the game, after Setup. */
function setUp(players: number, seed: number): GameState {
  return createEngine(game!, lib, players, initialState(game!, seed)).engine.getState();
}

describe('Startup Simulator (designer language)', () => {
  it('compiles with no diagnostics', () => expect(diagnostics).toEqual([]));

  it('passes every example', () => {
    const results = runExamples(game!, lib);
    expect(results).toHaveLength(10);
    expect(results.filter((r) => r.status !== 'pass')).toEqual([]);
  });

  describe('the cards (§20)', () => {
    it('has 87 cards: 22 talent, 30 seed products, and 34 growth products with the Market Crash', () => {
      const { cards } = fresh();
      expect(cards).toHaveLength(87);
      expect(inZone(cards, 'talent-deck')).toHaveLength(22);
      expect(inZone(cards, 'seed-deck')).toHaveLength(30);
      expect(inZone(cards, 'growth-deck')).toHaveLength(35);
    });

    it('has the talent deck of §20.B.1, with its costs and salaries', () => {
      const talents = inZone(fresh().cards, 'talent-deck');
      expect(nameCounts(talents)).toEqual({
        Hacker: 1, Architect: 1, Veteran: 1, Diva: 1, Engineer: 1, Fixer: 1, 'Firmware Specialist': 2, 'Full Stack Ninja': 2,
        'QA Engineer': 3, 'Sales Rep': 3, 'HR Manager': 2, 'Junior PM': 2, 'Senior PM': 1, 'Growth Hacker': 1,
      });
      expect(sum(talents, 'cost')).toBe(122);
      expect(sum(talents, 'salary')).toBe(33);
    });

    it('reads a talent card’s columns, and leaves out the skill a Specialist has none of', () => {
      expect(talent('Hacker').data).toEqual({
        name: 'Hacker', cost: 6, skill: 'software', output: 3, salary: 2, role: 'Senior Developer', trait: 'Spaghetti Code',
      });
      expect(talent('QA Engineer').data).not.toHaveProperty('skill');
    });

    it('has the 30 Tier 1 products of the seed deck (§20.C.1, §20.F.1)', () => {
      const seeds = inZone(fresh().cards, 'seed-deck');
      expect(seeds).toHaveLength(30);
      expect(new Set(seeds.map(nameOf)).size).toBe(30);
      expect(seeds.every((card) => card.data?.tier === 'Tier 1')).toBe(true);
      expect(sums(seeds)).toEqual({ 'blue cost': 122, 'red cost': 36, rev: 58, val: 68, 'blue maint': 23, 'red maint': 8 });
    });

    it('has the 34 Tier 2 and Tier 3 products of the growth deck and the Market Crash (§20.C.2, §20.F.2–3)', () => {
      const growth = inZone(fresh().cards, 'growth-deck');
      expect(growth).toHaveLength(35);
      expect(growth.filter((card) => card.data?.tier === 'Tier 2')).toHaveLength(25);
      expect(growth.filter((card) => card.data?.tier === 'Tier 3')).toHaveLength(9);
      const crashes = growth.filter((card) => nameOf(card) === 'Market Crash');
      expect(crashes.map((card) => card.data)).toEqual([{ name: 'Market Crash' }]);
      const products = growth.filter((card) => nameOf(card) !== 'Market Crash');
      expect(sums(products)).toEqual({ 'blue cost': 315, 'red cost': 170, rev: 188, val: 369, 'blue maint': 45, 'red maint': 30 });
    });

    it('gives every product a number for each cost and maintenance, 0 where it needs none of that color (C4)', () => {
      const products = fresh().cards.filter((card) => card.data?.tier !== undefined);
      expect(products).toHaveLength(64);
      for (const card of products) {
        for (const column of CUBES) expect(typeof card.data?.[column], `${nameOf(card)}'s ${column}`).toBe('number');
      }
    });

    it('reads what a product requires and provides, and leaves out what it has none of', () => {
      expect(product('The Metaverse').data).toMatchObject({ requires: 'Media', 'also requires': 'Cloud', tag: 'Metaverse' });
      expect(product('DAO Nation').data).not.toHaveProperty('tag');
      expect(product('Smart Lock').data).not.toHaveProperty('requires');
    });

    it('has the three University stacks, which never run out (§20.B.2)', () => {
      const endless = game!.cards.filter((set) => set.kind === 'endless');
      expect(endless.map((set) => set.identities.map((identity) => identity.attrs.name))).toEqual(JUNIORS.map((name) => [name]));
    });
  });

  it('lays out the table: each player’s bench, backlog and research are rows only they can see', () => {
    const zones = game!.zones.map(({ name, perPlayer, layout, visibility }) => [zoneIdFor(name), perPlayer, layout, visibility]);
    expect(zones).toEqual([
      ['talent-deck', false, 'pile', 'secret'],
      ['agency-row', false, 'row', 'public'],
      ['open-job-market', false, 'row', 'public'],
      ['seed-deck', false, 'pile', 'secret'],
      ['growth-deck', false, 'pile', 'secret'],
      ['seed-market', false, 'row', 'public'],
      ['growth-market', false, 'row', 'public'],
      ['open-idea-pool', false, 'row', 'public'],
      ['crash-pile', false, 'pile', 'public'],
      ['box', false, 'pile', 'secret'],
      ['bench', true, 'row', 'owner'],
      ['backlog', true, 'row', 'owner'],
      ['research', true, 'row', 'owner'],
    ]);
  });

  describe('setup (§4)', () => {
    const counts = [2, 3, 4, 5];
    const seeds = Array.from({ length: 10 }, (_, i) => i + 1);

    it.each(counts)('sets up a table of %i players at every seed', (players) => {
      for (const seed of seeds) {
        const state = setUp(players, seed);
        const at = `${players} players, seed ${seed}`;
        const start = state.data[START_PLAYER_KEY];
        expect({ current: state.turn?.current, phase: state.turn?.phase }, at).toEqual({ current: start, phase: 'actions' });
        expect(state.data[ROUND_KEY], at).toBe(1);

        const growth = zoneCards(state, 'growth-deck');
        const crashAt = growth.findIndex((card) => nameOf(card) === 'Market Crash');
        expect(crashAt, at).toBeGreaterThanOrEqual(0);
        expect(crashAt, at).toBeLessThan(CRASH_REACH);

        for (let p = 0; p < players; p++) {
          expect(zoneCards(state, `bench-p${p}`).map(nameOf), `${at}, p${p}'s bench`).toEqual(JUNIORS);
          const backlog = zoneCards(state, `backlog-p${p}`);
          expect(backlog.map((card) => [card.faceUp, card.data?.tier]), `${at}, p${p}'s backlog`).toEqual([[false, 'Tier 1']]);
        }
        expect(zoneCards(state, 'agency-row'), at).toHaveLength(4);
        expect(zoneCards(state, 'seed-market'), at).toHaveLength(2);
        expect(zoneCards(state, 'growth-market'), at).toHaveLength(2);
      }
    });

    it('makes the Juniors after the 87 dealt cards, c87 to c95 at 3 players', () => {
      const state = setUp(3, 1);
      const ids = [0, 1, 2].flatMap((p) => zoneCards(state, `bench-p${p}`)).map((card) => Number(card.id.slice(1)));
      expect(ids.sort((a, b) => a - b)).toEqual(Array.from({ length: 9 }, (_, i) => 87 + i));
      expect(state.data[NEXT_CARD_KEY]).toBe(96);
    });

    it('chooses the start player at random', () => {
      const starts = new Set(Array.from({ length: 20 }, (_, i) => setUp(5, i + 1).data[START_PLAYER_KEY]));
      expect(starts.size).toBeGreaterThanOrEqual(3);
    });

    it.each([1, 6])('is for 2 to 5 players, not %i (ruling 25)', (players) => {
      expect(() => createEngine(game!, lib, players, initialState(game!, 1))).toThrow('This game is for 2 to 5 players.');
    });
  });
});
