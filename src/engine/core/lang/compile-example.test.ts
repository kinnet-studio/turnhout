import { describe, expect, it } from 'vitest';
import { canPlay, compileGame } from './compile';
import { createDefaultLibrary } from './library';

const lib = createDefaultLibrary();
const BASE = [
  'Game: Tiny', 'Players: 2 to 3', '', 'Cards:', '  A standard 52-card deck, starting in the deck.', '',
  'Table:', '  The deck is a pile in the center that no one can see.', '  Each player has a hand that only they can see.', '',
  'Setup:', '  Shuffle the deck.', '  Deal 5 cards from the deck to each hand.', '',
  'Phase: main', '  Players take turns.', '  A player may play a card from their hand to the deck.', '',
  'End:', '  The game ends when a player\'s hand is empty.', '  The player with an empty hand wins.',
].join('\n');

/** BASE followed by example text, which starts on line 22. */
const withExamples = (...lines: string[]) => `${BASE}\n${lines.join('\n')}`;
const messages = (text: string) => compileGame(text, lib).diagnostics.map((d) => [d.line, d.message]);

describe('compileExample', () => {
  it('compiles Given/And/When/Then with fallbacks', () => {
    const { game, diagnostics } = compileGame(withExamples(
      'Example: x', '  Given the phase is main', '  And the deck is empty', '  When p0 plays the 2 of clubs', '  Then it is accepted', '  And the deck is empty',
    ), lib);
    expect(diagnostics).toEqual([]);
    expect(game!.examples).toHaveLength(1);
    const example = game!.examples[0];
    expect(example).toMatchObject({ name: 'x', line: 22, players: null });
    expect(example.steps.map((s) => [s.keyword, s.ref.kind, s.ref.phrase, s.ref.line])).toEqual([
      ['given', 'given', 'the phase is {phase}', 23],
      ['given', 'given', '{zone} is empty', 24],
      ['when', 'action', '{player} {move} {card}', 25],
      ['then', 'expect', 'it is accepted', 26],
      ['then', 'condition', '{zone} is empty', 27],
    ]);
    expect(example.steps[0].ref.args).toEqual(['main']);
    expect(example.steps[2].ref.args).toEqual(['p0', 'play', { suit: 'C', rank: 2 }]);
    expect(canPlay({ game, diagnostics })).toEqual({ ok: true });
  });

  it('falls back from given to effect, and from expect to condition', () => {
    const { game, diagnostics } = compileGame(withExamples(
      'Example: fallbacks', '  Given hearts are broken', '  Then the deck is not empty', '  But it is accepted',
    ), lib);
    expect(diagnostics).toEqual([]);
    expect(game!.examples[0].steps.map((s) => [s.keyword, s.ref.kind])).toEqual([['given', 'effect'], ['then', 'condition'], ['then', 'expect']]);
  });

  it('lets And and But repeat the keyword before them', () => {
    const { game } = compileGame(withExamples(
      'Example: repeats', '  When p0 plays a card', '  And p1 plays a card', '  Then it is accepted', '  But it is accepted', '  Given the phase is main', '  But it is p0\'s turn',
    ), lib);
    expect(game!.examples[0].steps.map((s) => [s.keyword, s.ref.kind])).toEqual([
      ['when', 'action'], ['when', 'action'], ['then', 'expect'], ['then', 'expect'], ['given', 'given'], ['given', 'given'],
    ]);
  });

  it('reads the keywords in any case', () => {
    const { game, diagnostics } = compileGame(withExamples('EXAMPLE:   Loud', '  GIVEN the phase is main', '  when p0 plays a card', '  THEN It is accepted.'), lib);
    expect(diagnostics).toEqual([]);
    expect(game!.examples[0].name).toBe('Loud');
    expect(game!.examples[0].steps.map((s) => s.keyword)).toEqual(['given', 'when', 'then']);
    expect(game!.examples[0].steps[2].ref).toMatchObject({ phrase: 'it is accepted', text: 'It is accepted' });
  });

  it('keeps several examples in the order written, with their lines', () => {
    const { game, diagnostics } = compileGame(withExamples(
      'Example: first', '  Given the phase is main', '', 'Example: second', '  When p0 plays a card', '', 'Example: third', '  Given the deck is empty',
    ), lib);
    expect(diagnostics).toEqual([]);
    expect(game!.examples.map((e) => [e.name, e.line, e.steps.length])).toEqual([['first', 22, 1], ['second', 25, 1], ['third', 28, 1]]);
  });

  it('records and checks Given N players', () => {
    const three = compileGame(withExamples('Example: three', '  Given 3 players', '  And the phase is main'), lib);
    expect(three.diagnostics).toEqual([]);
    expect(three.game!.examples[0].players).toBe(3);
    expect(three.game!.examples[0].steps.map((s) => s.ref.phrase)).toEqual(['{int} players', 'the phase is {phase}']);
    expect(messages(withExamples('Example: seven', '  Given 7 players'))).toEqual([[23, 'This game is for 2 to 3 players.']]);
    expect(messages(withExamples('Example: one', '  Given 1 players'))).toEqual([[23, 'This game is for 2 to 3 players.']]);
    expect(compileGame(withExamples('Example: two', '  Given 2 players'), lib).game!.examples[0].players).toBe(2);
    expect(compileGame(withExamples('Example: seven', '  Given 7 players'), lib).game).toBeUndefined();
  });

  it('says a single player count without “to”', () => {
    expect(messages(withExamples('Example: seven', '  Given 7 players').replace('Players: 2 to 3', 'Players: 4'))).toEqual([[23, 'This game is for 4 players.']]);
    expect(messages(withExamples('Example: two', '  Given 2 players').replace('Players: 2 to 3', 'Players: 1'))).toEqual([[23, 'This game is for 1 player.']]);
  });

  it('requires Given or When first', () => {
    expect(messages(withExamples('Example: backwards', '  Then it is accepted', '  When p0 plays a card'))).toEqual([[23, 'Start an example with Given or When.']]);
    expect(messages(withExamples('Example: and', '  And the phase is main', '  Given the phase is main'))).toEqual([[23, 'Start an example with Given or When.']]);
    expect(messages(withExamples('Example: but', '  But it is accepted'))).toEqual([[23, 'Start an example with Given or When.']]);
  });

  it('reports a bad start once, however many lines follow it', () => {
    const { game, diagnostics } = compileGame(withExamples('Example: backwards', '  Then it is accepted', '  And it is accepted', '  But it is accepted', '  When p0 plays a card', '  Then it is accepted'), lib);
    expect(diagnostics.map((d) => [d.line, d.message])).toEqual([[23, 'Start an example with Given or When.']]);
    expect(game).toBeUndefined();
  });

  it('does not let a bad start in one example hide the next example', () => {
    const { diagnostics } = compileGame(withExamples('Example: bad', '  Then it is accepted', '', 'Example: worse', '  And it is accepted', '  Given the moon is full'), lib);
    expect(diagnostics.map((d) => [d.line, d.kind])).toEqual([[23, 'structure'], [26, 'structure'], [27, 'unknown-phrase']]);
  });

  it('asks for a name', () => {
    expect(messages(withExamples('Example:', '  Given the phase is main'))).toEqual([[22, 'Give the example a name, like “Example: playing a club”.']]);
  });

  it('says what each line of an example must start with', () => {
    expect(messages(withExamples('Example: x', '  Given the phase is main', '  Play a card'))).toEqual([
      [24, 'Start each line of an example with Given, When, Then, And or But.'],
    ]);
    expect(messages(withExamples('Example: x', '  Given'))).toEqual([[23, 'Start each line of an example with Given, When, Then, And or But.']]);
  });

  it('allows no indentation under an example line', () => {
    expect(messages(withExamples('Example: x', '  Given the phase is main', '    more'))).toEqual([[24, 'This line shouldn\'t be indented under the line above.']]);
  });

  it('keeps unknown phrases as placeholders so the game can still be read', () => {
    const result = compileGame(withExamples('Example: moon', '  Given the moon is full', '  When p0 dances', '  Then the sun is up'), lib);
    expect(result.diagnostics.map((d) => [d.line, d.kind, d.text, d.stub?.match(/library\.\w+/)?.[0]])).toEqual([
      [23, 'unknown-phrase', 'the moon is full', 'library.given'],
      [24, 'unknown-phrase', 'p0 dances', 'library.action'],
      [25, 'unknown-phrase', 'the sun is up', 'library.expect'],
    ]);
    expect(result.game!.examples[0].steps.map((s) => [s.keyword, s.ref.phrase, s.ref.args])).toEqual([
      ['given', 'missing', ['given']], ['when', 'missing', ['action']], ['then', 'missing', ['expect']],
    ]);
    expect(canPlay(result)).toEqual({ ok: false, reason: '3 phrases still need a developer.' });
  });

  it('does not let “their” into an example', () => {
    expect(messages(withExamples('Example: x', '  Given the phase is main', '  Then they hold only hearts'))).toEqual([
      [24, '“they hold only hearts” only makes sense in a rule about a player\'s move.'],
    ]);
  });

  it('reports a player outside the table in the library\'s own words', () => {
    expect(messages(withExamples('Example: x', '  When p9 plays a card'))).toEqual([[23, 'This game only has players p0 to p2.']]);
  });
});
