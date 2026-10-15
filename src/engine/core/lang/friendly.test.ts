import { describe, expect, it } from 'vitest';
import { MissingPhraseError, RuleError } from './diagnostics';
import { friendlyError, friendlyReason } from './friendly';

describe('friendlyReason', () => {
  it.each([
    ['game is over', undefined, 'The game is over.'],
    ["not p1's turn", 'p0', "It's p0's turn."],
    ["not p1's turn", undefined, "It's not your turn."],
    ['move pass not allowed in phase playing', undefined, "You can't pass during playing."],
    ['move play not allowed in phase __setup', undefined, "You can't play during setup."],
    ['move reorder not allowed in phase __setup', undefined, "You can't rearrange cards during setup."],
    ['move reorder not allowed in phase passing', undefined, "You can't rearrange cards during passing."],
    // A button's move type is its whole wording, so the move is several words.
    ['move roll the dice not allowed in phase __setup', undefined, "You can't roll the dice during setup."],
    ['move end their turn not allowed in phase the last round', undefined, "You can't end their turn during the last round."],
    ['the card is not a heart', undefined, 'the card is not a heart'],
  ])('%s', (reason, current, out) => expect(friendlyReason(reason, current)).toBe(out));
});

describe('friendlyError', () => {
  it('points at a phrase nobody has written yet', () => {
    const error = new MissingPhraseError('“The winner sings” isn\'t implemented yet.', 25, 'The winner sings');
    expect(friendlyError(error)).toBe('Line 25: “The winner sings” isn\'t implemented yet.');
  });

  it('names the rule that never settles', () => {
    const error = new Error('flow did not settle after 100 iterations (last fired: trigger line 32: When the deck is not empty)');
    expect(friendlyError(error)).toBe('The rule on line 32 (“When the deck is not empty”) keeps firing. Its effects must change what it checks.');
  });

  it('names the phase that “go to” rules keep moving to', () => {
    const goTo = (phase: string) => new Error(`flow did not settle after 100 iterations (last fired: advance to ${phase})`);
    const again = (phase: string) =>
      `The “go to” rules keep moving the game to ${phase} and away again. A phase's “go to” condition must stop holding once the game gets there.`;
    expect(friendlyError(goTo('rest'))).toBe(again('rest'));
    expect(friendlyError(goTo('__setup'))).toBe(again('setup'));
  });

  it('never shows the engine’s words for any other flow that does not settle', () => {
    const plain = 'The rules keep firing without settling. Check your “When” and “go to” rules.';
    expect(friendlyError(new Error('flow did not settle after 100 iterations (last fired: endTurn)'))).toBe(plain);
    expect(friendlyError(new Error('flow did not settle after 100 iterations (last fired: (nothing))'))).toBe(plain);
    // Arranging an example can build an engine inside a phrase, which hands the error back with that phrase's line.
    expect(friendlyError(new RuleError('flow did not settle after 100 iterations (last fired: endTurn)', 4, 'the game is set up'))).toBe(plain);
  });

  it('puts the line and its words in front of a rule error', () => {
    expect(friendlyError(new RuleError('There is no winner yet.', 30, 'The winner goes next'))).toBe('Line 30 (“The winner goes next”): There is no winner yet.');
    expect(friendlyError(new RuleError('This game is for 2 players.'))).toBe('This game is for 2 players.');
  });

  it('keeps anything else short and free of stack traces', () => {
    const error = new TypeError('x is undefined');
    expect(friendlyError(error)).toBe('Something went wrong in the rules: x is undefined');
    expect(friendlyError('a plain string')).toBe('Something went wrong in the rules: a plain string');
  });
});
