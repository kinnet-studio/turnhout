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
});
