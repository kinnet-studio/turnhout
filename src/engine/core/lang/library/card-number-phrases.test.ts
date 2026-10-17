import { describe, expect, it } from 'vitest';
import { cardById, type GameState } from '../../game-state';
import type { CardState } from '../../scene';
import { createEngine, initialState } from '../build';
import { cardAttribute, changeCard } from '../card-facts';
import { parseTextFaceKey } from '../cards';
import { compileGame } from '../compile';
import { RuleError } from '../diagnostics';
import { CREW_GAME, fixtureEnv, runPhrase } from '../testing';
import { MEND_GAME } from '../testing';
import type { PhraseKind } from '../types';
import { relocate } from '../zones';
import { createDefaultLibrary } from './index';
import { cardNumber } from './support';

const lib = createDefaultLibrary();

/** CREW_GAME with the numbers a job's crew works up to: what is done and what is new, in red and in gold. */
const NUMBERED = CREW_GAME.replace('  Cards can be tired.', '  Cards can be tired.\n  Cards can have red done, gold done, new red and new gold.');
const game = compileGame(NUMBERED, lib).game!;

/** The 1-based number of `line` in `text`. */
const at = (text: string, line: string) => text.split('\n').indexOf(line) + 1;
const messages = (text: string) => compileGame(text, lib).diagnostics.map((d) => [d.line, d.message]);

/** The state once Setup has run, from seed 1. */
const setUp = createEngine(game, lib, 2, initialState(game, 1)).engine.getState();
const named = (name: string) => setUp.cards.find((card) => card.data?.name === name)!.id;
const [vase, statue, potter] = [named('Vase'), named('Statue'), named('Potter')];

/** The set-up state with the numbers `facts` given to the card `id`. */
const given = (id: string, facts: Record<string, number | boolean>): GameState => changeCard(setUp, id, facts, game);

/** A line about `id`, as a button or a rule about that card reads it. */
const about = (state: GameState, id: string) => fixtureEnv(state, { game, subject: { player: 'p0', space: null, card: id } });
const effect = (text: string, state: GameState, id: string): GameState => runPhrase<GameState>(lib, 'effect', text, about(state, id));
const condition = (text: string, state: GameState, id: string): boolean => runPhrase<boolean>(lib, 'condition', text, about(state, id));
const card = (state: GameState, id: string): CardState => cardById(state, id)!;
const has = (state: GameState, id: string, name: string) => cardAttribute(card(state, id), name, game);

describe('a number going up by another', () => {
  const vaseAt = (done: number) => given(vase, { 'red done': done, 'new red': 3 });

  it('gains the other number', () => {
    expect(has(effect('its red done go up by its new red', vaseAt(1), vase), vase, 'red done')).toBe(4);
  });
  it('reads the same in the singular', () => {
    expect(has(effect('its red done goes up by its new red', vaseAt(1), vase), vase, 'red done')).toBe(4);
  });
  it('gains a number the card has from its table, as well as one the game keeps on cards', () => {
    expect(has(effect('its red done go up by its pay', vaseAt(1), vase), vase, 'red done')).toBe(2);
  });
  it('stops at the cap', () => {
    expect(has(effect('its red done go up by its new red, up to its red need', vaseAt(1), vase), vase, 'red done')).toBe(2);
    expect(has(effect('its red done goes up by its new red, up to its red need', vaseAt(1), vase), vase, 'red done')).toBe(2);
  });
  it('reaches the cap exactly, and is never lowered when already past it', () => {
    expect(has(effect('its red done go up by its pay, up to its red need', vaseAt(1), vase), vase, 'red done')).toBe(2);
    expect(has(effect('its red done go up by its new red, up to its red need', vaseAt(5), vase), vase, 'red done')).toBe(5);
    expect(has(effect('its red done goes up by its new red, up to its red need', vaseAt(5), vase), vase, 'red done')).toBe(5);
  });
  it('shows the new count on the face, and changes nothing else', () => {
    const state = effect('its red done go up by its new red', vaseAt(1), vase);
    expect(parseTextFaceKey(card(state, vase).faceKey)).toMatchObject({ 'red done': '4', 'new red': '3' });
    expect(card(state, statue)).toEqual(card(setUp, statue));
  });
  it('changes only a number the game keeps on cards', () => {
    const only = new RuleError('Only a number the game keeps on cards can change, like “Cards can have charges.”; pay isn\'t one.');
    expect(() => effect('its pay go up by its new red', vaseAt(1), vase)).toThrow(only);
    expect(() => effect('its pay goes up by its new red, up to its red need', vaseAt(1), vase)).toThrow(only);
  });
});

describe('a number lost', () => {
  const holding = given(vase, { 'new red': 3, 'new gold': 1 });

  it('goes back to 0 with its key removed, so the face shows nothing', () => {
    expect(parseTextFaceKey(card(holding, vase).faceKey)).toMatchObject({ 'new red': '3', 'new gold': '1' });
    const state = effect('it loses its new red', holding, vase);
    expect(card(state, vase).data).not.toHaveProperty('new red');
    expect(has(state, vase, 'new red')).toBe(0);
    expect(parseTextFaceKey(card(state, vase).faceKey)).not.toHaveProperty('new red');
    expect(has(state, vase, 'new gold')).toBe(1);
  });
  it('is no change for a card that never had it', () => {
    const state = effect('it loses its new red', setUp, statue);
    expect(card(state, statue)).toEqual(card(setUp, statue));
  });
  it('changes only a number the game keeps on cards', () => {
    expect(() => effect('it loses its pay', holding, vase)).toThrow(
      new RuleError('Only a number the game keeps on cards can change, like “Cards can have charges.”; pay isn\'t one.'),
    );
  });
});

describe('comparing numbers on a card', () => {
  it('is at least another number', () => {
    for (const text of ['its red done is at least its red need', 'its red done are at least its red need']) {
      expect(condition(text, given(vase, { 'red done': 1 }), vase)).toBe(false);
      expect(condition(text, given(vase, { 'red done': 2 }), vase)).toBe(true);
      expect(condition(text, given(vase, { 'red done': 3 }), vase)).toBe(true);
    }
  });
  it('is more than a whole number', () => {
    for (const text of ['its pay is more than 1', 'its pay are more than 1']) {
      expect(condition(text, setUp, vase)).toBe(false);
      expect(condition(text, setUp, statue)).toBe(true);
    }
  });
  it('counts a number the game keeps on cards as 0 until it changes', () => {
    expect(condition('its new red are more than 0', setUp, vase)).toBe(false);
    expect(condition('its new red are more than 0', given(vase, { 'new red': 1 }), vase)).toBe(true);
  });
});

describe('a flag set on the card', () => {
  it('is set by “It is …”', () => {
    expect(card(effect('it is tired', setUp, potter), potter).data).toMatchObject({ tired: true });
  });
  it('is taken off by “It is not …”, as “No card is …” takes it off', () => {
    const tired = effect('it is tired', setUp, potter);
    expect(condition('it is tired', tired, potter)).toBe(true);
    const rested = effect('it is not tired', tired, potter);
    expect(card(rested, potter).data).not.toHaveProperty('tired');
    expect(condition('it is tired', rested, potter)).toBe(false);
    expect(card(rested, potter).faceKey).toBe(card(setUp, potter).faceKey);
  });
});

describe('a card with no such number', () => {
  it('has none to gain from', () => {
    expect(() => effect('its red done go up by its skill', given(vase, { 'new red': 3 }), vase)).toThrow(new RuleError('This card has no skill.'));
    expect(() => effect('its red done go up by its pay, up to its skill', setUp, vase)).toThrow(new RuleError('This card has no skill.'));
  });
  it('has none to compare', () => {
    expect(() => condition('its skill is at least its pay', setUp, vase)).toThrow(new RuleError('This card has no skill.'));
  });
  it('has a column that is no number', () => {
    expect(() => condition('its craft is more than 0', setUp, potter)).toThrow(new RuleError("This card's craft isn't a number."));
    expect(() => condition('its skill is at least its craft', setUp, potter)).toThrow(new RuleError("This card's craft isn't a number."));
  });
});

describe('the number of a card, read one way', () => {
  const env = about(given(vase, { 'new red': 3 }), vase);

  it('is a column of its table or a count the game keeps on cards', () => {
    expect(cardNumber(env, card(env.state, vase), 'pay')).toBe(1);
    expect(cardNumber(env, card(env.state, vase), 'new red')).toBe(3);
    expect(cardNumber(env, card(env.state, vase), 'gold done')).toBe(0);
  });
  it('says why a card shows none', () => {
    expect(() => cardNumber(env, card(env.state, vase), 'skill')).toThrow(new RuleError('This card has no skill.'));
    expect(() => cardNumber(env, card(env.state, potter), 'craft')).toThrow(new RuleError("This card's craft isn't a number."));
  });
});

describe('what the lines need', () => {
  const PHRASES: [PhraseKind, string][] = [
    ['effect', 'it loses its {attribute}'],
    ['effect', 'its {attribute} go up by its {attribute}'],
    ['effect', 'its {attribute} goes up by its {attribute}'],
    ['effect', 'its {attribute} go up by its {attribute}, up to its {attribute}'],
    ['effect', 'its {attribute} goes up by its {attribute}, up to its {attribute}'],
    ['effect', 'it is {cardflag}'],
    ['effect', 'it is not {cardflag}'],
    ['condition', 'its {attribute} is at least its {attribute}'],
    ['condition', 'its {attribute} are at least its {attribute}'],
    ['condition', 'its {attribute} is more than {int}'],
    ['condition', 'its {attribute} are more than {int}'],
  ];

  it('marks every phrase as about a card, so a face-down view and a hidden pick are judged by it', () => {
    for (const [kind, pattern] of PHRASES) expect([pattern, lib.get(kind, pattern)?.needsCard]).toEqual([pattern, true]);
  });
  it('reads “It loses its …” only in a rule about a card', () => {
    // The line goes under stop, a button that picks no card.
    const line = '      It loses its new red.';
    const text = NUMBERED.replace('      Their moves go back to 0.', `      Their moves go back to 0.\n${line}`);
    expect(messages(text)).toEqual([[at(text, line), '“It loses its new red” only makes sense in a rule about a card, such as “When a card …”.']]);
  });
});

describe('the sentences in a rule', () => {
  /** The crew game's finish, with a rule that works a job's crew up to its need when it is finished. */
  const FINISHING = NUMBERED.replace(
    '      Every card on it is tired.',
    [
      '      Its red done go up by its new red, up to its red need.',
      '      Its gold done goes up by its pay.',
      '      It loses its new red.',
      '      It is tired.',
      '      Every card on it is tired.',
    ].join('\n'),
  );

  it('is read, and does what it says, in a button that picks a card', () => {
    const compiled = compileGame(FINISHING, lib);
    expect(compiled.diagnostics).toEqual([]);
    const inWorkshop = relocate(changeCard(setUp, vase, { 'red done': 1, 'new red': 3 }, game), [vase], 'workshop-p0', game);
    const { engine } = createEngine(compiled.game!, lib, 2, inWorkshop);
    expect(engine.dispatch({ type: 'finish a card in their workshop', by: 'p0', cardId: vase })).toMatchObject({ ok: true });
    const finished = card(engine.getState(), vase);
    expect(finished).toMatchObject({ zoneId: 'scrap', data: { 'red done': 2, 'gold done': 1, tired: true } });
    expect(finished.data).not.toHaveProperty('new red');
  });
});

describe('numbers that go down, in MEND_GAME', () => {
  const mend = compileGame(MEND_GAME, lib);
  const mendGame = mend.game!;
  // Setup deals 2 jobs to each stash, more than the pile holds for three: a state with p0's turn set skips it.
  const built = createEngine(mendGame, lib, 3, { ...initialState(mendGame, 1), turn: { current: 'p0', phase: 'working' } });
  /** The state as p0's turn starts, from seed 1: the jobs in the pile, the hands in the hall. */
  const start = built.engine.getState();
  const first = (name: string) => start.cards.find((c) => c.data?.name === name)!.id;
  // The Vase's pay is 1 and the Statue's 2.
  const [jar, bust] = [first('Vase'), first('Statue')];
  /** The start with `cracks` on the card `id`. */
  const cracked = (id: string, cracks: number): GameState => changeCard(start, id, { cracks }, mendGame);
  /** A line about the card `id`, as a button or a rule about that card reads it, with the values the runtime works out. */
  const env = (state: GameState, id: string) => built.runtime.env(state, undefined, undefined, { player: 'p0', space: null, card: id });
  const run = (text: string, state: GameState, id: string) => runPhrase<GameState>(lib, 'effect', text, env(state, id));
  const holds = (text: string, state: GameState, id: string) => runPhrase<boolean>(lib, 'condition', text, env(state, id));
  const dataOf = (state: GameState, id: string) => card(state, id).data;
  const onlyKept = new RuleError('Only a number the game keeps on cards can change, like “Cards can have charges.”; pay isn\'t one.');

  it('compiles with no problems', () => expect(mend.diagnostics).toEqual([]));

  describe('going down by another number', () => {
    it('takes the other number off the count', () => {
      expect(dataOf(run('its cracks go down by its pay', cracked(jar, 3), jar), jar)).toMatchObject({ cracks: 2 });
    });
    it('stops at 0, with its key removed so the face shows nothing, in the singular too', () => {
      const state = run('its cracks goes down by its pay', cracked(bust, 1), bust);
      expect(dataOf(state, bust)).not.toHaveProperty('cracks');
      expect(parseTextFaceKey(card(state, bust).faceKey)).not.toHaveProperty('cracks');
    });
    it('changes only a number the game keeps on cards', () => {
      expect(() => run('its pay goes down by its cracks', cracked(jar, 3), jar)).toThrow(onlyKept);
    });
  });

  describe('losing a number', () => {
    it('takes that many off the count', () => {
      expect(dataOf(run('it loses 1 crack', cracked(jar, 2), jar), jar)).toMatchObject({ cracks: 1 });
    });
    it('takes the last one off with its key, and leaves a card at 0 without one', () => {
      expect(dataOf(run('it loses 1 crack', cracked(jar, 1), jar), jar)).not.toHaveProperty('cracks');
      expect(dataOf(run('it loses 1 crack', start, jar), jar)).not.toHaveProperty('cracks');
    });
    it('never goes below 0', () => {
      expect(dataOf(run('it loses 3 cracks', cracked(jar, 2), jar), jar)).not.toHaveProperty('cracks');
    });
  });

  describe('refused', () => {
    it('changes only a number the game keeps on cards', () => {
      expect(() => run('it loses 1 pay', cracked(jar, 2), jar)).toThrow(onlyKept);
    });
    it('says a worked value can\'t go down, on its line, when the rules are read', () => {
      const line = '      Its worth goes down by its pay.';
      const text = MEND_GAME.replace('      Every card on it is tired.', `      Every card on it is tired.\n${line}`);
      expect(messages(text)).toEqual([[at(text, line), '“worth” is worked out from its lines, so no rule can change it.']]);
    });
  });

  describe('the plural', () => {
    it('reads a count as “its … are …”', () => {
      expect(holds('its cracks are 0', start, jar)).toBe(true);
      expect(holds('its cracks are 2', cracked(jar, 2), jar)).toBe(true);
      expect(holds('its cracks are 1', cracked(jar, 2), jar)).toBe(false);
    });
  });

  it('marks each new line as about a card, and the name of what it changes', () => {
    expect(lib.get('effect', 'its {attribute} go down by its {attribute}')).toMatchObject({ needsCard: true, writes: 0 });
    expect(lib.get('effect', 'its {attribute} goes down by its {attribute}')).toMatchObject({ needsCard: true, writes: 0 });
    expect(lib.get('effect', 'it loses {int} {attribute}')).toMatchObject({ needsCard: true, writes: 1 });
    expect(lib.get('condition', 'its {attribute} are {int}')).toMatchObject({ needsCard: true });
  });
});
