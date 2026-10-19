import { describe, expect, it } from 'vitest';
import { compileGame } from '../compile';
import { runExamples } from '../examples';
import { CARD_PICK_GAME, vocabFor } from '../testing';
import { TWO_HIRES_GAME } from '../testing';
import { createDefaultLibrary } from './index';
import type { GameState } from '../../game-state';
import { putOn } from '../attach';
import { RuleError } from '../diagnostics';
import { COACH_GAME, fixtureCard, fixtureEnv, fixtureState, runPhrase } from '../testing';
import { cardById } from '../zone-index';

const lib = createDefaultLibrary();

/** The results of running `examples` on `text`, which must compile with no problems. */
function run(text: string, examples: string) {
  const { game, diagnostics } = compileGame(`${text}\n\n${examples}\n`, lib);
  expect(diagnostics).toEqual([]);
  return runExamples(game!, lib);
}

const BUYING_AND_SELLING = [
  'Example: buying and selling by name',
  '  Given the shop has a Ruby and an Opal',
  "  And p0's stash has an Opal",
  '  When p0 sells the Ruby',
  '  Then it is rejected because "Pick a card in your stash to sell."',
  '  When p0 buys the Ruby',
  '  Then it is accepted',
  '  And p0 has 4 coins',
  '  And p0 has 1 move',
  "  And p0's stash has an Opal and a Ruby",
  '  When p0 sells the Opal',
  '  Then it is accepted',
  '  And p0 has 5 coins',
  "  And p0's stash has a Ruby",
  '  And the shop has an Opal',
].join('\n');

/** CARD_PICK_GAME with a second way to buy: to the case, which shows the card to everyone. */
const TWO_WAYS = CARD_PICK_GAME.replace(
  '  A player may sell a card in their stash.\n',
  '  A player may buy a card from the shop to their case.\n    It costs 1 move.\n  A player may sell a card in their stash.\n',
);

/** An example of one press: the shop has a Ruby, and `when` is the When line. */
const pressing = (when: string, then: string[] = []) =>
  ['Example: one press', '  Given the shop has a Ruby', `  When ${when}`, ...then.map((line) => `  ${line}`)].join('\n');

describe('examples that press a button that picks a card', () => {
  it('read the button by its base and the cards after it, and the zone after those', () => {
    const vocab = vocabFor(compileGame(CARD_PICK_GAME, lib).game!);
    expect(lib.match('action', 'p0 buys the Ruby', vocab)).toEqual({ status: 'ok', pattern: '{player} {cardaction} {cardlist}', args: ['p0', 'buy', [{ name: 'Ruby' }]] });
    expect(lib.match('action', "p0 sells the Opal to p0's case", vocab)).toEqual({
      status: 'ok', pattern: '{player} {cardaction} {cardlist} to {zone}', args: ['p0', 'sell', [{ name: 'Opal' }], { of: { seat: 'p0' }, zone: 'case' }],
    });
  });

  it('names the card after the button, and finds it where the button takes it from', () => {
    expect(run(CARD_PICK_GAME, BUYING_AND_SELLING)).toEqual([expect.objectContaining({ status: 'pass', message: null })]);
  });

  describe('Review Focus: two buttons that could take the card', () => {
    it('is the TWO_WAYS game', () => expect(TWO_WAYS).not.toBe(CARD_PICK_GAME));
    it('lets the example say where the card goes', () => {
      const results = run(TWO_WAYS, pressing("p0 buys the Ruby to p0's case", ["Then p0's case has a Ruby"]));
      expect(results).toEqual([expect.objectContaining({ status: 'pass', message: null })]);
    });
    it('says so, naming both buttons and the words that press each, when the example does not', () => {
      const [result] = run(TWO_WAYS, pressing('p0 buys the Ruby', ['Then it is accepted']));
      expect(result.status).toBe('fail');
      expect(result.message).toMatch(
        /p0 could buy a Ruby with more than one button: “buy a card from the shop to their stash” or “buy a card from the shop to their case”\. Say where it goes: “… to p0's stash” or “… to p0's case”\.$/,
      );
    });
  });

  describe('Review Focus: two buttons that take the card from two rows to one zone', () => {
    /** CARD_PICK_GAME with a second row to buy from, the stall: both buys put the card in the stash. */
    const TWO_ROWS = CARD_PICK_GAME
      .replace('  The shop is a row in the center that everyone can see.\n', '  The shop is a row in the center that everyone can see.\n  The stall is a row in the center that everyone can see.\n')
      .replace('  A player may sell a card in their stash.\n', '  A player may buy a card from the stall to their stash.\n    It costs 1 move.\n  A player may sell a card in their stash.\n');
    /** An example of one press with a Ruby in both rows: `when` is the When line. */
    const inBoth = (when: string, then: string[] = []) =>
      ['Example: a Ruby in both rows', '  Given the shop has a Ruby', '  And the stall has a Ruby', `  When ${when}`, ...then.map((line) => `  ${line}`)].join('\n');
    const BOTH_BUTTONS = 'p0 could buy a Ruby with more than one button: “buy a card from the shop to their stash” or “buy a card from the stall to their stash”.';

    it('is the TWO_ROWS game', () => expect(TWO_ROWS.split('\n').length).toBe(CARD_PICK_GAME.split('\n').length + 3));
    it('reads where the cards come from after them, and then where they go', () => {
      const vocab = vocabFor(compileGame(TWO_ROWS, lib).game!);
      expect(lib.match('action', 'p0 buys the Ruby from the stall', vocab)).toEqual({
        status: 'ok', pattern: '{player} {cardaction} {cardlist} from {zone}', args: ['p0', 'buy', [{ name: 'Ruby' }], { shared: 'stall' }],
      });
      expect(lib.match('action', "p0 buys the Ruby from the stall to p0's stash", vocab)).toEqual({
        status: 'ok', pattern: '{player} {cardaction} {cardlist} from {zone} to {zone}',
        args: ['p0', 'buy', [{ name: 'Ruby' }], { shared: 'stall' }, { of: { seat: 'p0' }, zone: 'stash' }],
      });
      expect(lib.match('action', "p0 shows the Opal from p0's stash to the Ruby", vocab)).toEqual({
        status: 'ok', pattern: '{player} {cardaction} {cardlist} from {zone} to {card}',
        args: ['p0', 'show', [{ name: 'Opal' }], { of: { seat: 'p0' }, zone: 'stash' }, { name: 'Ruby' }],
      });
    });
    it('presses the button that takes the card from the zone the example names', () => {
      const fromStall = inBoth('p0 buys the Ruby from the stall', ['Then it is accepted', 'And the stall is empty', 'And the shop has a Ruby', "And p0's stash has a Ruby"]);
      expect(run(TWO_ROWS, fromStall)).toEqual([expect.objectContaining({ status: 'pass', message: null })]);
      const fromShop = inBoth('p0 buys the Ruby from the shop', ['Then it is accepted', 'And the shop is empty', 'And the stall has a Ruby']);
      expect(run(TWO_ROWS, fromShop)).toEqual([expect.objectContaining({ status: 'pass', message: null })]);
      const both = inBoth("p0 buys the Ruby from the stall to p0's stash", ['Then it is accepted', 'And the stall is empty', 'And the shop has a Ruby']);
      expect(run(TWO_ROWS, both)).toEqual([expect.objectContaining({ status: 'pass', message: null })]);
    });
    it('says where it comes from when the example does not, and saying where it goes does not help', () => {
      const ASK = 'Say where it comes from: “… from the shop” or “… from the stall”.';
      for (const when of ['p0 buys the Ruby', "p0 buys the Ruby to p0's stash"]) {
        const [result] = run(TWO_ROWS, inBoth(when, ['Then it is accepted']));
        expect(result.status, when).toBe('fail');
        expect(result.message, when).toMatch(new RegExp(`${BOTH_BUTTONS.replace(/\./g, '\\.')} ${ASK.replace(/\./g, '\\.')}$`));
      }
    });
    it('says no button takes the card from a zone none of them takes it from', () => {
      const [result] = run(TWO_ROWS, ['Example: selling from the shop', '  Given the shop has an Opal', '  When p0 sells the Opal from the shop'].join('\n'));
      expect(result.status).toBe('fail');
      expect(result.message).toMatch(/No button lets p0 sell a card from the shop\.$/);
    });
    it('asks for other words when neither where the cards come from nor where they go tells two buttons apart', () => {
      // A one-card button and a set button that both take from the stash to a card in the case: an example names the card, not its zone.
      const SHOW_SOME = CARD_PICK_GAME.replace('  A player may stop.\n', '  A player may show some cards from their stash to a card in their case.\n  A player may stop.\n');
      expect(SHOW_SOME).not.toBe(CARD_PICK_GAME);
      const showing = ['Example: showing one', "  Given p0's stash has an Opal", "  And p0's case has an Opal", '  When p0 shows the Opal to the Opal'].join('\n');
      const [result] = run(SHOW_SOME, showing);
      expect(result.status).toBe('fail');
      expect(result.message).toMatch(
        /with more than one button: “show a card from their stash to a card in their case” or “show some cards from their stash to a card in their case”\. Give the buttons different words\.$/,
      );
    });
  });

  describe('Review Focus: three buttons that neither where the card comes from nor where it goes tells apart', () => {
    const STALL = '  The shop is a row in the center that everyone can see.\n';
    /** CARD_PICK_GAME with a stall beside the shop, and `buttons` written before the sell. */
    const withStall = (buttons: string[]) => CARD_PICK_GAME
      .replace(STALL, `${STALL}  The stall is a row in the center that everyone can see.\n`)
      .replace('  A player may sell a card in their stash.\n', [...buttons, '  A player may sell a card in their stash.', ''].join('\n'));
    /** Buys from the shop to the stash or the case, and from the stall to the stash. */
    const THREE_WAYS = withStall([
      '  A player may buy a card from the stall to their stash.', '    It costs 1 move.',
      '  A player may buy a card from the shop to their case.', '    It costs 1 move.',
    ]);
    /** An example of one press with a Ruby in both rows: `when` is the When line. */
    const inBoth = (when: string, then: string[] = []) =>
      ['Example: a Ruby in both rows', '  Given the shop has a Ruby', '  And the stall has a Ruby', `  When ${when}`, ...then.map((line) => `  ${line}`)].join('\n');
    /** The wordings an advice gives, each as the words an example adds after its cards. */
    const wordingsIn = (message: string) => [...message.matchAll(/“… ([^”]+)”/g)].map(([, wording]) => wording);

    it('is a game of three buys', () => expect(THREE_WAYS.match(/A player may buy /g)).toHaveLength(3));
    it('names, for each button, the fewest words that press it and no other', () => {
      const [result] = run(THREE_WAYS, inBoth('p0 buys the Ruby', ['Then it is accepted']));
      expect(result.status).toBe('fail');
      const buttons = '“buy a card from the shop to their stash”, “buy a card from the stall to their stash” or “buy a card from the shop to their case”';
      const ask = "Say which: “… from the shop to p0's stash”, “… from the stall” or “… to p0's case”.";
      expect(result.message!.slice(-`${buttons}. ${ask}`.length)).toBe(`${buttons}. ${ask}`);
    });
    it('gives wordings that each press the one button they are given for', () => {
      const [advice] = run(THREE_WAYS, inBoth('p0 buys the Ruby', ['Then it is accepted']));
      const lands: Record<string, string[]> = {
        "from the shop to p0's stash": ["And p0's stash has a Ruby", 'And the shop is empty', 'And the stall has a Ruby'],
        'from the stall': ["And p0's stash has a Ruby", 'And the stall is empty', 'And the shop has a Ruby'],
        "to p0's case": ["And p0's case has a Ruby", 'And the shop is empty', 'And the stall has a Ruby'],
      };
      const wordings = wordingsIn(advice.message!);
      expect(wordings.sort()).toEqual(Object.keys(lands).sort());
      for (const wording of wordings) {
        const results = run(THREE_WAYS, inBoth(`p0 buys the Ruby ${wording}`, ['Then it is accepted', ...lands[wording]]));
        expect(results, wording).toEqual([expect.objectContaining({ status: 'pass', message: null })]);
      }
    });
    it('names the buttons no wording presses alone, and the wording of each other one', () => {
      // A set and a one-card buy take the Ruby from the shop to the stash alike: only the stall's buy has words of its own.
      const SOME_TOO = withStall([
        '  A player may buy some cards from the shop to their stash.', '    It costs 1 move.',
        '  A player may buy a card from the stall to their stash.', '    It costs 1 move.',
      ]);
      const [result] = run(SOME_TOO, inBoth('p0 buys the Ruby', ['Then it is accepted']));
      expect(result.status).toBe('fail');
      const ask = 'Say which: “… from the stall”. “buy a card from the shop to their stash” and “buy some cards from the shop to their stash” need different words.';
      expect(result.message!.slice(-ask.length)).toBe(ask);
      const [stall] = run(SOME_TOO, inBoth(`p0 buys the Ruby ${wordingsIn(ask)[0]}`, ['Then it is accepted', 'And the stall is empty', 'And the shop has a Ruby']));
      expect(stall).toEqual(expect.objectContaining({ status: 'pass', message: null }));
    });
    it('names the card it goes to in the wording of a button that picks one', () => {
      // Three shows to a card in the case: from the stash, a set from the stash, and from the shop, which alone says where it comes from.
      const SHOWS = withStall([]).replace('  A player may stop.\n', [
        '  A player may show some cards from their stash to a card in their case.',
        '  A player may show a card from the shop to a card in their case.', '    Then:', '      Move it to their case.',
        '  A player may stop.', '',
      ].join('\n'));
      const showing = (when: string, then: string[]) => [
        'Example: showing an Opal', "  Given p0's stash has an Opal", '  And the shop has an Opal', "  And p0's case has an Opal", `  When ${when}`,
        ...then.map((line) => `  ${line}`),
      ].join('\n');
      const [result] = run(SHOWS, showing('p0 shows the Opal to the Opal', ['Then it is accepted']));
      expect(result.status).toBe('fail');
      const ask = 'Say which: “… from the shop to the Opal”. “show a card from their stash to a card in their case” and “show some cards from their stash to a card in their case” need different words.';
      expect(result.message!.slice(-ask.length)).toBe(ask);
      const [shop] = run(SHOWS, showing(`p0 shows the Opal ${wordingsIn(ask)[0]}`, ['Then it is accepted', 'And the shop is empty', "And p0's case has an Opal and an Opal"]));
      expect(shop).toEqual(expect.objectContaining({ status: 'pass', message: null }));
    });
    it('says a single button with no words of its own needs different words', () => {
      // A buy in the shop that takes the card nowhere shares the shop with the buy to the stash, which shares the stash with the stall's.
      const NOWHERE_TOO = withStall([
        '  A player may buy a card in the shop.', '    Then:', '      Move it to the pile.',
        '  A player may buy a card from the stall to their stash.', '    It costs 1 move.',
      ]);
      const [result] = run(NOWHERE_TOO, inBoth('p0 buys the Ruby', ['Then it is accepted']));
      expect(result.status).toBe('fail');
      const ask = "Say which: “… from the shop to p0's stash” or “… from the stall”. “buy a card in the shop” needs different words.";
      expect(result.message!.slice(-ask.length)).toBe(ask);
    });
  });

  describe('Review Focus: two buttons that pick a card for theirs to go to, each from a zone of its own', () => {
    /** CARD_PICK_GAME with a second show, from the shop: both show a card on a card in the case. */
    const TWO_SHOWS = CARD_PICK_GAME.replace('  A player may stop.\n', [
      '  A player may show a card from the shop to a card in their case.', '    Then:', '      Move it to their case.', '  A player may stop.', '',
    ].join('\n'));
    const showing = (when: string, then: string[]) => [
      'Example: showing an Opal', "  Given p0's stash has an Opal", '  And the shop has an Opal', "  And p0's case has an Opal", `  When ${when}`,
      ...then.map((line) => `  ${line}`),
    ].join('\n');

    it('says where it comes from in words that keep the card it goes to, and each of them presses its one button', () => {
      const [result] = run(TWO_SHOWS, showing('p0 shows the Opal to the Opal', ['Then it is accepted']));
      expect(result.status).toBe('fail');
      const ask = "Say where it comes from: “… from p0's stash to the Opal” or “… from the shop to the Opal”.";
      expect(result.message!.slice(-ask.length)).toBe(ask);
      const lands: Record<string, string[]> = {
        "from p0's stash to the Opal": ["And p0's stash is empty", 'And the shop has an Opal'],
        'from the shop to the Opal': ["And p0's stash has an Opal", 'And the shop is empty'],
      };
      const wordings = [...ask.matchAll(/“… ([^”]+)”/g)].map(([, wording]) => wording);
      expect(wordings.sort()).toEqual(Object.keys(lands).sort());
      for (const wording of wordings) {
        const then = ['Then it is accepted', "And p0's case has an Opal and an Opal", ...lands[wording]];
        expect(run(TWO_SHOWS, showing(`p0 shows the Opal ${wording}`, then)), wording).toEqual([expect.objectContaining({ status: 'pass', message: null })]);
      }
    });
  });

  describe('a zone no button takes the card to', () => {
    it('presses the button whose zone it is', () => {
      const results = run(CARD_PICK_GAME, pressing("p0 buys the Ruby to p0's stash", ["Then p0's stash has a Ruby"]));
      expect(results).toEqual([expect.objectContaining({ status: 'pass', message: null })]);
    });
    it('says no button does it', () => {
      const [result] = run(CARD_PICK_GAME, ["Example: selling to the case", "  Given p0's stash has an Opal", "  When p0 sells the Opal to p0's case"].join('\n'));
      expect(result.status).toBe('fail');
      expect(result.message).toMatch(/No button lets p0 sell a card to p0's case\.$/);
    });
  });

  describe('a card and the card it goes to, and sets of cards', () => {
    const SHOWING = [
      'Example: showing a card on a card',
      "  Given p0's stash has an Opal",
      "  And p0's case has a Ruby and an Opal",
      '  When p0 shows the Opal to the Ruby',
      '  Then it is rejected because "the target card is not a Ruby"',
      '  When p0 shows the Opal to the Opal',
      '  Then it is accepted',
      "  And p0's case has a Ruby, an Opal and an Opal",
      '  And p0 has 1 move',
    ].join('\n');
    const TRADING = [
      'Example: trading at most two cards',
      "  Given p0's stash has a Ruby, an Opal and an Opal",
      '  And the shop is empty',
      '  When p0 trades the Ruby, the Opal and the Opal',
      '  Then it is rejected because "they picked at most 2 cards"',
      '  When p0 trades the Ruby and the Opal',
      '  Then it is accepted',
      '  And the shop has a Ruby and an Opal, in that order',
      "  And p0's stash has an Opal",
    ].join('\n');

    it('read the card it goes to after “to”', () => {
      const vocab = vocabFor(compileGame(CARD_PICK_GAME, lib).game!);
      expect(lib.match('action', 'p0 shows the Opal to the Ruby', vocab)).toEqual({
        status: 'ok', pattern: '{player} {cardaction} {cardlist} to {card}', args: ['p0', 'show', [{ name: 'Opal' }], { name: 'Ruby' }],
      });
    });
    it('press a button that picks a card and the card it goes to', () => {
      expect(run(CARD_PICK_GAME, SHOWING)).toEqual([expect.objectContaining({ status: 'pass', message: null })]);
    });
    it('press a button that picks a set with every card named', () => {
      expect(run(CARD_PICK_GAME, TRADING)).toEqual([expect.objectContaining({ status: 'pass', message: null })]);
    });
    it('say no button lets a card go to another card', () => {
      const [result] = run(CARD_PICK_GAME, ['Example: selling onto a card', "  Given p0's stash has an Opal", '  When p0 sells the Opal to the Ruby'].join('\n'));
      expect(result.status).toBe('fail');
      expect(result.message).toMatch(/No button lets p0 sell a card to another card\.$/);
    });
    it('press either kind of button with one card, and say so when both could take it', () => {
      const ONE_OR_MORE = CARD_PICK_GAME.replace('  A player may stop.\n', '  A player may trade a card in their stash.\n  A player may stop.\n');
      expect(ONE_OR_MORE).not.toBe(CARD_PICK_GAME);
      const one = ['Example: trading one', "  Given p0's stash has an Opal", '  And the shop is empty', '  When p0 trades the Opal'].join('\n');
      expect(run(CARD_PICK_GAME, `${one}\n  Then it is accepted\n  And the shop has an Opal`)).toEqual([expect.objectContaining({ status: 'pass' })]);
      const [both] = run(ONE_OR_MORE, `${one}\n  Then it is accepted`);
      expect(both.status).toBe('fail');
      // One card can't press the button that puts it nowhere alone: no words an example adds leave out the one that puts it in the shop.
      expect(both.message).toMatch(
        /with more than one button: “trade some cards from their stash to the shop” or “trade a card in their stash”\. Say which: “… to the shop”\. “trade a card in their stash” needs different words\.$/,
      );
    });
  });
});

describe('an example that names the card its cards go to, when two buttons take them to cards in two zones', () => {
  /** An example that hires from the hall: `given` arranges the jobs, and the rest are its When and Then lines. */
  const hiring = (given: string[], ...lines: string[]) => ['Example: hiring hands', ...given.map((line, i) => `  ${i === 0 ? 'Given' : 'And'} ${line}`),
    ...lines.map((line) => `  ${line}`)].join('\n');
  const PASSED = [expect.objectContaining({ status: 'pass', message: null })];
  const VASE_IN_BOTH = ["p0's workshop has a Vase", "p0's shelf has a Vase"];

  it('is the TWO_HIRES_GAME, with two hires from the hall', () => expect(TWO_HIRES_GAME.match(/A player may hire some cards from the hall/g)).toHaveLength(2));

  it('reads the zone of the card they go to after it', () => {
    const vocab = vocabFor(compileGame(TWO_HIRES_GAME, lib).game!);
    const shelf = { of: { seat: 'p0' }, zone: 'shelf' };
    expect(lib.match('action', "p0 hires a Potter to the Vase in p0's shelf", vocab)).toEqual({
      status: 'ok', pattern: '{player} {cardaction} {cardlist} to {card} in {zone}', args: ['p0', 'hire', [{ name: 'Potter' }], { name: 'Vase' }, shelf],
    });
    expect(lib.match('action', "p0 hires a Potter from the hall to the Vase in p0's shelf", vocab)).toEqual({
      status: 'ok', pattern: '{player} {cardaction} {cardlist} from {zone} to {card} in {zone}',
      args: ['p0', 'hire', [{ name: 'Potter' }], { shared: 'hall' }, { name: 'Vase' }, shelf],
    });
  });

  it('presses the button whose zone holds the card they go to', () => {
    const example = hiring(["p0's workshop has a Vase", "p0's shelf has a Statue"],
      'When p0 hires a Potter to the Vase', 'Then it is accepted', "And the Vase in p0's workshop has the Potter on it", "And p0's crew has a Potter",
      'When p0 hires a Smith to the Statue', 'Then it is accepted', "And the Statue in p0's shelf has the Smith on it", "And p0's yard has a Smith");
    expect(run(TWO_HIRES_GAME, example)).toEqual(PASSED);
  });

  it('keeps the error that names both buttons when both zones hold such a card', () => {
    const [result] = run(TWO_HIRES_GAME, hiring(VASE_IN_BOTH, 'When p0 hires a Potter to the Vase', 'Then it is accepted'));
    expect(result.status).toBe('fail');
    // The error starts with the press, after the line the example is told it on.
    expect(result.message).toMatch(/^Line \d+ \(“p0 hires a Potter to the Vase”\): p0 could hire a Potter with more than one button: /);
    expect(result.message).toContain('“hire some cards from the hall to a card in their workshop” or “hire some cards from the hall to a card in their shelf”.');
  });

  it('presses the button of the zone the example names', () => {
    const example = hiring(VASE_IN_BOTH, "When p0 hires a Potter to the Vase in p0's shelf", 'Then it is accepted',
      "And the Vase in p0's shelf has the Potter on it", "And p0's yard has a Potter", "And the Vase in p0's workshop has no cards on it", "And p0's crew is empty");
    expect(run(TWO_HIRES_GAME, example)).toEqual(PASSED);
    const fromTheHall = hiring(VASE_IN_BOTH, "When p0 hires a Potter from the hall to the Vase in p0's workshop", 'Then it is accepted',
      "And the Vase in p0's workshop has the Potter on it", "And p0's yard is empty");
    expect(run(TWO_HIRES_GAME, fromTheHall)).toEqual(PASSED);
  });

  it('says which zone to name, in words that each press one button', () => {
    const [advice] = run(TWO_HIRES_GAME, hiring(VASE_IN_BOTH, 'When p0 hires a Potter to the Vase', 'Then it is accepted'));
    const ask = "Say which: “… to the Vase in p0's workshop” or “… to the Vase in p0's shelf”.";
    expect(advice.message!.slice(-ask.length)).toBe(ask);
    const lands: Record<string, string> = {
      "to the Vase in p0's workshop": "And the Vase in p0's workshop has the Potter on it", "to the Vase in p0's shelf": "And the Vase in p0's shelf has the Potter on it",
    };
    const wordings = [...ask.matchAll(/“… ([^”]+)”/g)].map(([, wording]) => wording);
    expect(wordings.sort()).toEqual(Object.keys(lands).sort());
    for (const wording of wordings) {
      const example = hiring(VASE_IN_BOTH, `When p0 hires a Potter ${wording}`, 'Then it is accepted', lands[wording]);
      expect(run(TWO_HIRES_GAME, example), wording).toEqual(PASSED);
    }
  });

  it('presses the first button that fits when no zone it takes cards to holds the card, for the game to refuse it', () => {
    const [result] = run(TWO_HIRES_GAME, hiring(["p0's stash has a Vase"], 'When p0 hires a Potter to the Vase', 'Then it is accepted'));
    expect(result).toMatchObject({ status: 'fail', message: 'Expected the move to be accepted, but it was rejected: Pick where they go: a card in your workshop.' });
  });

  it('presses the button of the zone the example names even when that zone holds no such card, for the game to refuse it', () => {
    const [result] = run(TWO_HIRES_GAME, hiring(["p0's workshop has a Vase"], "When p0 hires a Potter to the Vase in p0's shelf", 'Then it is accepted'));
    expect(result).toMatchObject({ status: 'fail', message: 'Expected the move to be accepted, but it was rejected: Pick where they go: a card in your shelf.' });
  });

  it('says no button takes the cards to a card in a zone none of them takes them to', () => {
    const [result] = run(TWO_HIRES_GAME, hiring(["p0's idle has a Vase"], "When p0 hires a Potter to the Vase in p0's idle"));
    expect(result.status).toBe('fail');
    expect(result.message).toMatch(/No button lets p0 hire a card to another card in p0's idle\.$/);
  });
});

describe('the target card and the picked cards', () => {
  const game = compileGame(COACH_GAME, lib).game!;
  /** p0's workshop holds a Vase with a Potter and a Smith on it in their crew, and their idle a Tinker; only the cards `tired` names are tired. */
  const table = (...tired: string[]): GameState => {
    const card = (id: string, zoneId: string, name: string) => fixtureCard(id, zoneId, { name, ...(tired.includes(id) ? { tired: true } : {}) });
    const cards = [card('vase', 'workshop-p0', 'Vase'), card('potter', 'hall', 'Potter'), card('smith', 'hall', 'Smith'), card('tinker', 'idle-p0', 'Tinker')];
    return putOn(fixtureState(cards), ['potter', 'smith'], 'crew-p0', 'vase', game);
  };
  const aboutOnto = (state: GameState, onto: string) => fixtureEnv(state, { game, seats: ['p0', 'p1'], subject: { player: 'p0', space: null, card: null, onto } });
  const aboutPicked = (state: GameState, cards: string[]) =>
    fixtureEnv(state, { game, seats: ['p0', 'p1'], subject: { player: 'p0', space: null, card: null, cards } });
  const holds = (text: string, env: ReturnType<typeof fixtureEnv>) => runPhrase<boolean>(lib, 'condition', text, env);
  const ran = (text: string, env: ReturnType<typeof fixtureEnv>) => runPhrase<GameState>(lib, 'effect', text, env);
  const tiredOnes = (state: GameState) => state.cards.filter((card) => card.data?.tired === true).map((card) => card.id);

  it('tests whether the target card is so, each way', () => {
    expect([holds('the target card is tired', aboutOnto(table('vase'), 'vase')), holds('the target card is tired', aboutOnto(table(), 'vase'))]).toEqual([true, false]);
    expect([holds('the target card is not tired', aboutOnto(table('vase'), 'vase')), holds('the target card is not tired', aboutOnto(table(), 'vase'))])
      .toEqual([false, true]);
  });
  it('tests whether some card, or no card, on the target card is so, each way', () => {
    const some = (state: GameState, onto: string) => holds('some card on the target card is tired', aboutOnto(state, onto));
    const none = (state: GameState, onto: string) => holds('no card on the target card is tired', aboutOnto(state, onto));
    expect([some(table('smith'), 'vase'), some(table(), 'vase'), some(table('vase'), 'vase'), some(table('smith'), 'tinker')]).toEqual([true, false, false, false]);
    expect([none(table('smith'), 'vase'), none(table(), 'vase'), none(table('vase'), 'vase'), none(table('smith'), 'tinker')]).toEqual([false, true, true, true]);
  });
  it('makes the target card so, and not so, clearing the key', () => {
    expect(tiredOnes(ran('the target card is tired', aboutOnto(table(), 'tinker')))).toEqual(['tinker']);
    const woken = ran('the target card is not tired', aboutOnto(table('vase', 'smith'), 'vase'));
    expect(cardById(woken, 'vase')!.data).not.toHaveProperty('tired');
    expect(tiredOnes(woken)).toEqual(['smith']);
  });
  it('gives the target card more of a count the game keeps on cards, and no other number', () => {
    const once = ran('the target card gains 1 drill', aboutOnto(table(), 'vase'));
    const twice = ran('the target card gains 2 gold drills', aboutOnto(ran('the target card gains 1 drill', aboutOnto(once, 'vase')), 'vase'));
    expect(cardById(twice, 'vase')!.data).toMatchObject({ drills: 2, 'gold drills': 2 });
    expect(() => ran('the target card gains 1 wage', aboutOnto(table(), 'vase'))).toThrow(
      new RuleError("Only a number the game keeps on cards can change, like “Cards can have charges.”; wage isn't one."),
    );
  });
  it('makes every picked card so, and not so, and no other card', () => {
    expect(tiredOnes(ran('every picked card is tired', aboutPicked(table(), ['potter', 'tinker'])))).toEqual(['potter', 'tinker']);
    expect(tiredOnes(ran('every picked card is not tired', aboutPicked(table('vase', 'potter', 'smith'), ['potter', 'tinker'])))).toEqual(['vase', 'smith']);
  });

  describe('as examples', () => {
    const PASSED = [expect.objectContaining({ status: 'pass', message: null })];
    const LAST_ZONE = [
      'Example: a target in the last of three zones, with the choice it asks',
      "  Given p0's stash has a Statue",
      "  And p0's idle has a Smith",
      '  When p0 coaches the Statue to the Smith, choosing gold',
      "  Then the Smith in p0's idle has 1 gold drill",
    ].join('\n');
    const FIRST_HOLDING = [
      'Example: Review Focus: the first zone written that holds the target, unless the press names another',
      "  Given p0's stash has a Statue and a Vase",
      "  And p0's workshop has a Vase",
      "  And the Vase in p0's workshop has a Potter on it",
      "  And p0's idle has a Potter",
      '  When p0 coaches the Statue to the Potter',
      "  Then the Potter in p0's crew has 1 drill",
      "  When p0 coaches the Vase to the Potter in p0's idle",
      "  Then the Potter in p0's idle has 1 drill",
    ].join('\n');
    /** p0's stash has a Statue and their workshop a Vase with a Potter on it, the Potter alone in their crew, and the When and Then lines are `lines`. */
    const potterOnVase = (title: string, ...lines: string[]) => [
      `Example: ${title}`, "  Given p0's stash has a Statue", "  And p0's workshop has a Vase", "  And the Vase in p0's workshop has a Potter on it",
      ...lines.map((line) => `  ${line}`),
    ].join('\n');

    it('press a button with a target in the last of its zones, choosing', () => expect(run(COACH_GAME, LAST_ZONE)).toEqual(PASSED));
    it('Review Focus: take the target from the first zone written that holds it, unless the press names another', () => {
      expect(run(COACH_GAME, FIRST_HOLDING)).toEqual(PASSED);
    });
    it('Review Focus: take the target from the first zone written that holds it, whichever card is first on the table', () => {
      // The Potter in the idle is claimed first, so it is the first Potter on the table; the crew comes before the idle in the line.
      const example = [
        'Example: the Potter in the idle comes first', "  Given p0's stash has a Statue", "  And p0's idle has a Potter", "  And p0's workshop has a Vase",
        "  And the Vase in p0's workshop has a Potter on it", '  When p0 coaches the Statue to the Potter', "  Then the Potter in p0's crew has 1 drill",
        "  And the Potter in p0's idle has 0 drills",
      ].join('\n');
      expect(run(COACH_GAME, example)).toEqual(PASSED);
    });
    it('Review Focus: never take the target from another of the button\'s zones than the one the press names', () => {
      const [alone] = run(COACH_GAME, potterOnVase('no Potter in the idle', 'And the hall is empty', "When p0 coaches the Statue to the Potter in p0's idle"));
      expect(alone.status).toBe('fail');
      expect(alone.message).toMatch(/: I can't find a Potter for p0 to coach\.$/);
      // A Potter outside the button's zones is pressed instead, for the game to refuse it in its own words.
      const [refused] = run(COACH_GAME, potterOnVase('a Potter in the hall', 'And the hall has a Potter', "When p0 coaches the Statue to the Potter in p0's idle",
        'Then it is rejected because "Pick where it goes: a card in your workshop, your crew or your idle."'));
      expect(refused).toMatchObject({ status: 'pass', message: null });
    });
    it('Review Focus: say which zone to name for a button with several, in words that each press one button', () => {
      const TWO_COACHES = COACH_GAME.replace('  A player may stop.', [
        '  A player may coach a card from their stash to a card in the hall.', '    Then:', '      The target card gains 1 gold drill.', '  A player may stop.',
      ].join('\n'));
      expect(TWO_COACHES).not.toBe(COACH_GAME);
      const [advice] = run(TWO_COACHES, potterOnVase('two coaches', 'And the hall has a Potter', 'When p0 coaches the Statue to the Potter', 'Then it is accepted'));
      const ask = "Say which: “… to the Potter in p0's crew” or “… to the Potter in the hall”.";
      expect(advice.status).toBe('fail');
      expect(advice.message!.slice(-ask.length)).toBe(ask);
      const lands: Record<string, string> = {
        "to the Potter in p0's crew": "And the Potter in p0's crew has 1 drill", 'to the Potter in the hall': 'And the Potter in the hall has 1 gold drill',
      };
      for (const [wording, then] of Object.entries(lands)) {
        const example = potterOnVase('two coaches', 'And the hall has a Potter', `When p0 coaches the Statue ${wording}`, 'Then it is accepted', then);
        expect(run(TWO_COACHES, example), wording).toEqual(PASSED);
      }
    });
  });
});
