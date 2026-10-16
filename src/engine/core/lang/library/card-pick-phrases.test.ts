import { describe, expect, it } from 'vitest';
import { compileGame } from '../compile';
import { runExamples } from '../examples';
import { CARD_PICK_GAME, vocabFor } from '../testing';
import { createDefaultLibrary } from './index';

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
    it('says so, naming both wordings, when the example does not', () => {
      const [result] = run(TWO_WAYS, pressing('p0 buys the Ruby', ['Then it is accepted']));
      expect(result.status).toBe('fail');
      expect(result.message).toMatch(/p0 could buy a Ruby with more than one button: “buy a card from the shop to their stash” or “buy a card from the shop to their case”\. Say where it goes\.$/);
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
      expect(both.message).toMatch(/with more than one button: “trade some cards from their stash to the shop” or “trade a card in their stash”\. Say where it goes\.$/);
    });
  });
});
