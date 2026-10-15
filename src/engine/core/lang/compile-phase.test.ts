import { describe, expect, it } from 'vitest';
import { canPlay, compileGame } from './compile';
import { compilePhase } from './compile-phase';
import { createDefaultLibrary } from './library';
import { parseOutline } from './outline';
import { vocabFrom } from './phrases';

const lib = createDefaultLibrary();
const BASE = [
  'Game: Tiny', 'Players: 2 to 3', '', 'Cards:', '  A standard 52-card deck, starting in the deck.', '',
  'Table:', '  The deck is a pile in the center that no one can see.', '  Each player has a hand that only they can see.', '',
  'Setup:', '  Shuffle the deck.', '  Deal 5 cards from the deck to each hand.', '',
  'Phase: main', '  Hint: Do things.', '  Players take turns.', '',
  'End:', '  The game ends when a player\'s hand is empty.', '  The player with an empty hand wins.',
].join('\n');

/** BASE with its one phase replaced; the first phase line is line 15. */
const withPhase = (phase: string) => BASE.replace(/Phase: main[\s\S]*?\n\nEnd:/, `${phase}\n\nEnd:`);
const messages = (text: string) => compileGame(text, lib).diagnostics.map((d) => [d.line, d.message]);

const PHASE = [
  'Phase: main',
  '  Players take turns.',
  '  Players may rearrange their hand at any time.',
  '  A player may play a card from their hand to the deck.',
  '    Only if the card is not a heart.',
  '    Only if one of:',
  '      the deck is empty',
  '      they hold only hearts',
  '    Then:',
  '      If the card is a spade, shuffle the deck.',
  '  When the deck has 10 cards:',
  '    Only if the deck is not empty.',
  '    Shuffle the deck.',
  '  When the deck has 52 cards, go to main.',
  '  After a player plays, the turn passes to the left.',
].join('\n');

/** The phase's own lines, under `Phase: main` and `Players take turns.`; the first of them is line 17. */
const rules = (...lines: string[]) => withPhase(['Phase: main', '  Players take turns.', ...lines].join('\n'));

describe('compilePhase', () => {
  it('compiles a declared move with conditions and effects', () => {
    const { game, diagnostics } = compileGame(withPhase(PHASE), lib);
    expect(diagnostics).toEqual([]);
    const p = game!.phases[0];
    expect(p.rearrange).toEqual(['hand']);
    expect(p.moves).toHaveLength(1);
    expect(p.moves[0]).toMatchObject({ verb: 'play', from: { of: { who: 'actor' }, zone: 'hand' }, to: { shared: 'deck' }, fromText: 'their hand', line: 18 });
    expect(p.moves[0].conditions.map((g) => [g.mode, g.text, g.line])).toEqual([
      ['all', 'the card is not a heart', 19],
      ['any', 'the deck is empty or they hold only hearts', 20],
    ]);
    expect(p.moves[0].conditions[0].refs).toEqual([expect.objectContaining({ kind: 'condition', phrase: 'the card is not {cardclass}', line: 19 })]);
    expect(p.moves[0].conditions[1].refs.map((r) => [r.phrase, r.line])).toEqual([['{zone} is empty', 21], ['they hold only {cardclass}', 22]]);
    expect(p.moves[0].effects).toHaveLength(1);
    expect(p.moves[0].effects[0]).toMatchObject({ kind: 'lang', phrase: 'if', line: 24 });
    expect(p.triggers[0]).toMatchObject({ text: 'When the deck has 10 cards', line: 25, when: { kind: 'condition', phrase: '{zone} has {int} card(s)' }, conditions: [{ mode: 'all', text: 'the deck is not empty', line: 26 }] });
    expect(p.triggers[0].effects).toEqual([expect.objectContaining({ kind: 'effect', phrase: 'shuffle {zone}', line: 27 })]);
    expect(p.goTo).toMatchObject({ to: 'main', line: 28, when: { kind: 'condition', phrase: '{zone} has {int} card(s)' } });
    expect(p.after).toMatchObject({ verbs: ['play'], line: 29, next: { kind: 'turn', phrase: 'the turn passes to the left' } });
    expect(canPlay({ game, diagnostics })).toEqual({ ok: true });
  });

  it('reads the zones of a move whoever owns them', () => {
    const { game, diagnostics } = compileGame(rules("  A player may give a card from the deck to p1's hand."), lib);
    expect(diagnostics).toEqual([]);
    expect(game!.phases[0].moves[0]).toMatchObject({ verb: 'give', from: { shared: 'deck' }, to: { of: { seat: 'p1' }, zone: 'hand' }, fromText: 'the deck' });
    expect(game!.phases[0].moves[0]).toMatchObject({ conditions: [], effects: [] });
  });

  it('keeps several moves, and every Then block, in order', () => {
    const { game, diagnostics } = compileGame(rules(
      '  A player may play a card from their hand to the deck.', '    Then:', '      Shuffle the deck.',
      '  A player may draw a card from the deck to their hand.',
    ), lib);
    expect(diagnostics).toEqual([]);
    expect(game!.phases[0].moves.map((m) => [m.verb, m.effects.length])).toEqual([['play', 1], ['draw', 0]]);
  });

  it('reads the frames in any case, with curly apostrophes and extra spaces', () => {
    const { game, diagnostics } = compileGame(rules(
      '  PLAYERS MAY REARRANGE THEIR HAND AT ANY TIME.',
      '  a Player  may Play a card from the deck to p1’s hand.',
      '    only if THE DECK IS EMPTY',
      '    ONLY IF ONE OF',
      '      the deck is empty',
      '      the deck is not empty',
      '    THEN',
      '      Shuffle the deck.',
      '  WHEN THE DECK HAS 10 CARDS:',
      '    Shuffle the deck.',
      '  when the deck has 52 cards, GO TO main.',
      '  AFTER a player PLAYS, the turn passes to the left.',
      '  when this PHASE starts:',
      '    Shuffle the deck.',
    ), lib);
    expect(diagnostics).toEqual([]);
    const p = game!.phases[0];
    expect(p.rearrange).toEqual(['hand']);
    expect(p.moves[0]).toMatchObject({ verb: 'play', to: { of: { seat: 'p1' }, zone: 'hand' } });
    expect(p.moves[0].conditions.map((g) => g.mode)).toEqual(['all', 'any']);
    expect(p.moves[0].effects).toHaveLength(1);
    expect(p.triggers[0].text).toBe('WHEN THE DECK HAS 10 CARDS');
    expect(p.goTo).toMatchObject({ to: 'main' });
    expect(p.after).toMatchObject({ verbs: ['play'] });
    expect(p.onEnter).toHaveLength(1);
  });

  it('keeps the designer\'s capitalisation in condition and trigger text', () => {
    const { game } = compileGame(rules(
      '  A player may play a card from their hand to the deck.', '    Only if The Deck is empty.', '    Only if one of:', '      The Deck is empty.', '      They hold only Hearts.',
      '  When The Deck has 10 cards:', '    Shuffle the deck.',
    ), lib);
    const p = game!.phases[0];
    expect(p.moves[0].conditions.map((g) => g.text)).toEqual(['The Deck is empty', 'The Deck is empty or They hold only Hearts']);
    expect(p.triggers[0].text).toBe('When The Deck has 10 cards');
  });

  it('runs “When this phase starts” effects on entry', () => {
    const { game, diagnostics } = compileGame(rules('  When this phase starts:', '    Shuffle the deck.', '    If the deck is not empty, shuffle the deck.'), lib);
    expect(diagnostics).toEqual([]);
    expect(game!.phases[0].onEnter.map((r) => [r.phrase, r.line])).toEqual([['shuffle {zone}', 18], ['if', 19]]);
  });

  it('lets an After line name several moves', () => {
    const rule = (verbs: string) => rules(
      '  A player may play a card from their hand to the deck.', '  A player may draw a card from the deck to their hand.',
      '  A player may catch a card from the deck to their hand.', `  After a player ${verbs}, the turn passes to the left.`,
    );
    const cases: [string, string[]][] = [
      ['plays or draws', ['play', 'draw']],
      ['plays, draws', ['play', 'draw']],
      ['plays, draws or catches', ['play', 'draw', 'catch']],
      ['plays, draws, or catches', ['play', 'draw', 'catch']],
      ['plays or plays', ['play']],
    ];
    for (const [verbs, expected] of cases) {
      const { game, diagnostics } = compileGame(rule(verbs), lib);
      expect(diagnostics).toEqual([]);
      expect(game!.phases[0].after!.verbs).toEqual(expected);
    }
  });

  it('forms the third person like the vocabulary does', () => {
    const { game, diagnostics } = compileGame(rules(
      '  A player may pass a card from their hand to the deck.', '  After a player passes, the turn passes to the left.',
    ), lib);
    expect(diagnostics).toEqual([]);
    expect(game!.phases[0].after!.verbs).toEqual(['pass']);
  });

  it('rearranges only zones every player has', () => {
    expect(compileGame(rules('  Players may rearrange their hand at any time.', '  Players may rearrange their hand at any time.'), lib).game!.phases[0].rearrange).toEqual(['hand']);
    expect(messages(rules('  Players may rearrange their deck at any time.'))).toEqual([
      [17, 'Players can only rearrange a zone that each player has; “deck” isn\'t one.'],
    ]);
    expect(messages(rules('  Players may rearrange their pile at any time.'))).toEqual([
      [17, 'Players can only rearrange a zone that each player has; “pile” isn\'t one.'],
    ]);
  });

  it('rejects “their” outside a move', () => {
    expect(messages(rules('  When their hand is empty:', '    Shuffle the deck.'))).toEqual([
      [17, '“their hand is empty” only makes sense in a rule about a player\'s move.'],
    ]);
    expect(messages(rules('  When this phase starts:', '    Shuffle their hand.'))).toEqual([
      [18, '“Shuffle their hand” only makes sense in a rule about a player\'s move.'],
    ]);
    expect(messages(rules('  When their hand is empty, go to main.'))).toEqual([
      [17, '“their hand is empty” only makes sense in a rule about a player\'s move.'],
    ]);
    expect(messages(rules('  A player may play a card from their hand to the deck.', '    Only if their hand is empty.', '    Then:', '      Shuffle their hand.'))).toEqual([]);
    expect(messages(rules('  When the deck is empty:', '    Only if their hand is empty.', '    Shuffle the deck.'))).toEqual([
      [18, '“their hand is empty” only makes sense in a rule about a player\'s move.'],
    ]);
  });

  it('refuses reserved verbs and zones that are not one zone', () => {
    expect(messages(rules('  A player may reorder a card from their hand to the deck.'))).toEqual([
      [17, '“reorder” is reserved; pick another word.'],
    ]);
    expect(messages(rules('  A player may Reorder a card from their hand to the deck.'))).toEqual([
      [17, '“reorder” is reserved; pick another word.'],
    ]);
    for (const line of [
      '  A player may play a card from each hand to the deck.',
      '  A player may play a card from their hand to every hand.',
      "  A player may play a card from the winner's hand to the deck.",
      '  A player may play a card from their hand to the winner’s hand.',
    ]) {
      expect(messages(rules(line))).toEqual([[17, 'A move goes from one zone to one zone.']]);
    }
    expect(compileGame(rules('  A player may play a card from each hand to the deck.'), lib).game).toBeUndefined();
  });

  it('explains a zone that does not make sense, in the library\'s own words', () => {
    expect(messages(rules('  A player may play a card from the hand to the deck.'))).toEqual([
      [17, '“the hand” — whose hand? Say “their hand”, “each hand” or “p1\'s hand”.'],
    ]);
    expect(messages(rules("  A player may play a card from their hand to p7's hand."))).toEqual([
      [17, 'This game only has players p0 to p2.'],
    ]);
  });

  it('names a zone of a move line the table never defined', () => {
    const result = compileGame(rules('  A player may play a card from their hnad to the deck.', '    Only if the moon is full.'), lib);
    expect(result.diagnostics).toEqual([
      { line: 17, severity: 'error', kind: 'invalid', message: 'There is no zone called “hnad”.', text: 'their hnad', suggestions: ['hand'] },
      expect.objectContaining({ line: 18, kind: 'unknown-phrase' }),
    ]);
    expect(messages(rules('  A player may play a card from their hand to the dek.'))).toEqual([[17, 'There is no zone called “dek”.']]);
    expect(messages(rules('  A player may play a card from their hand to the deck and shout.'))).toEqual([[17, 'I don\'t understand “the deck and shout” here.']]);
  });

  it('still reads the conditions and effects of a move that has a problem', () => {
    const result = compileGame(rules('  A player may reorder a card from their hand to the deck.', '    Only if the moon is full.'), lib);
    expect(result.diagnostics.map((d) => [d.line, d.kind])).toEqual([[17, 'structure'], [18, 'unknown-phrase']]);
  });

  it('checks the target of “go to”', () => {
    const result = compileGame(rules('  When the deck is empty, go to maine.'), lib);
    expect(result.game).toBeUndefined();
    expect(result.diagnostics).toEqual([expect.objectContaining({
      line: 17, severity: 'error', kind: 'structure', message: 'There is no phase called “maine”.', text: 'maine', suggestions: ['main'],
    })]);
  });

  it('suggests the phases that are closest to a mistyped target', () => {
    const text = `${rules('  When the deck is empty, go to playing.')}\nPhase: placing\nPhase: dealing\nPhase: scoring\nPhase: wrapping up`;
    const found = compileGame(text, lib).diagnostics.find((d) => d.message.startsWith('There is no phase'));
    expect(found?.suggestions?.[0]).toBe('placing');
    expect(found?.suggestions?.length).toBeLessThanOrEqual(3);
    const nothingClose = compileGame(`${rules('  When the deck is empty, go to zzzz.')}\nPhase: placing`, lib).diagnostics.find((d) => d.message.startsWith('There is no phase'));
    expect(nothingClose?.suggestions).toEqual(['main', 'placing']);
  });

  it('allows only one “go to” and one After line', () => {
    expect(messages(rules('  When the deck is empty, go to main.', '  When the deck is not empty, go to main.'))).toEqual([
      [18, 'A phase can have only one “go to” rule for now.'],
    ]);
    expect(messages(rules(
      '  A player may play a card from their hand to the deck.',
      '  After a player plays, the turn passes to the left.', '  After a player plays, the turn passes to the left.',
    ))).toEqual([[19, 'A phase can have only one “After a player …” rule.']]);
  });

  it('refuses an After line for a move the phase does not declare', () => {
    const result = compileGame(rules('  A player may play a card from their hand to the deck.', '  After a player plays or dances, the turn passes to the left.'), lib);
    expect(result.game).toBeUndefined();
    expect(result.diagnostics).toEqual([expect.objectContaining({
      line: 18, severity: 'error', message: '“dances” isn\'t a move in this phase. The moves here are: plays.', text: 'dances',
    })]);
    expect(messages(rules('  After a player plays, the turn passes to the left.'))).toEqual([
      [17, '“plays” isn\'t a move in this phase. This phase has no moves.'],
    ]);
  });

  it('does not blame an After line for a move line that has a problem of its own', () => {
    expect(messages(rules('  A player may play a card from each hand to the deck.', '  After a player plays, the turn passes to the left.'))).toEqual([
      [17, 'A move goes from one zone to one zone.'],
    ]);
    expect(messages(rules('  A player may reorder a card from their hand to the deck.', '  After a player reorders, the turn passes to the left.'))).toEqual([
      [17, '“reorder” is reserved; pick another word.'],
    ]);
  });

  it('knows the moves of the phase an After line is in, wherever the line is', () => {
    const text = [
      'Phase: first', '  After a player plays, the turn passes to the left.', '  A player may play a card from their hand to the deck.',
      'Phase: second', '  A player may draw a card from the deck to their hand.', '  After a player plays, the turn passes to the left.',
    ].join('\n');
    expect(messages(withPhase(text))).toEqual([
      [18, 'Nothing leads to the phase “second”.'],
      [20, '“plays” isn\'t a move in this phase. The moves here are: draws.'],
    ]);
  });

  it('reads the phrase at the end of an After line like any other', () => {
    const result = compileGame(rules('  A player may play a card from their hand to the deck.', '  After a player plays, the turn goes nowhere.'), lib);
    expect(result.diagnostics).toEqual([expect.objectContaining({
      line: 18, kind: 'unknown-phrase', message: '“the turn goes nowhere” isn\'t in the phrase library yet.', stub: expect.stringContaining("library.turn('the turn goes nowhere'"),
    })]);
    expect(result.game!.phases[0].after).toMatchObject({ verbs: ['play'], next: { kind: 'lang', phrase: 'missing', args: ['turn'], line: 18 } });
    expect(canPlay(result)).toEqual({ ok: false, reason: '1 phrase still needs a developer.' });
  });

  it('keeps unknown phrases anywhere in a phase as placeholders', () => {
    const result = compileGame(rules(
      '  A player may play a card from their hand to the deck.', '    Only if the moon is full.', '    Only if one of:', '      the sun is up', '      the deck is empty',
      '    Then:', '      Howl at the moon.',
      '  When the sea is calm:', '    Only if the tide is out.', '    Sing.',
      '  When the owl hoots, go to main.',
    ), lib);
    expect(result.diagnostics.map((d) => [d.line, d.kind, d.text])).toEqual([
      [18, 'unknown-phrase', 'the moon is full'], [20, 'unknown-phrase', 'the sun is up'], [23, 'unknown-phrase', 'Howl at the moon'],
      [24, 'unknown-phrase', 'the sea is calm'], [25, 'unknown-phrase', 'the tide is out'], [26, 'unknown-phrase', 'Sing'],
      [27, 'unknown-phrase', 'the owl hoots'],
    ]);
    const p = result.game!.phases[0];
    expect(p.moves[0].conditions[0].refs[0]).toMatchObject({ phrase: 'missing', args: ['condition'], line: 18 });
    expect(p.moves[0].conditions[1]).toMatchObject({ mode: 'any', text: 'the sun is up or the deck is empty' });
    expect(p.moves[0].effects[0]).toMatchObject({ phrase: 'missing', args: ['effect'], line: 23 });
    expect(p.triggers[0]).toMatchObject({ text: 'When the sea is calm', when: { phrase: 'missing' }, conditions: [{ text: 'the tide is out' }] });
    expect(p.goTo).toMatchObject({ to: 'main', when: { phrase: 'missing', args: ['condition'] } });
  });

  it('says what it does not understand in a phase', () => {
    const expected = 'I don\'t understand this line in a phase. Phase lines start with Hint:, A player may…, When…, After a player…, Players take turns or Everyone acts at once.';
    for (const line of ['  Dance.', '  When the deck is empty', '  After a player, the turn passes to the left.', '  Players may rearrange at any time.']) {
      expect(messages(rules(line))).toEqual([[17, expected]]);
    }
    expect(compileGame(rules('  Dance.'), lib).diagnostics[0].text).toBe('Dance');
  });

  it('says what it does not understand under a move', () => {
    expect(messages(rules('  A player may play a card from their hand to the deck.', '    Dance.'))).toEqual([
      [18, 'I don\'t understand this line under a move. Use Only if…, Only if one of: or Then:.'],
    ]);
  });

  it('asks for the lines of “Only if one of:”', () => {
    expect(messages(rules('  A player may play a card from their hand to the deck.', '    Only if one of:'))).toEqual([
      [18, 'Add the conditions under “Only if one of:”, one on each line.'],
    ]);
  });

  it('allows no indentation under lines that take none', () => {
    for (const line of ['  Players may rearrange their hand at any time.', '  When the deck is empty, go to main.', '  Everyone acts at once.']) {
      expect(messages(rules(`${line}\n      more`))).toEqual([[18, 'This line shouldn\'t be indented under the line above.']]);
    }
    expect(messages(rules('  When this phase starts:', '    Shuffle the deck.\n      more'))).toEqual([
      [19, 'This line shouldn\'t be indented under the line above.'],
    ]);
    expect(messages(rules('  A player may play a card from their hand to the deck.\n    more\n      deeper'))).toEqual([
      [18, 'I don\'t understand this line under a move. Use Only if…, Only if one of: or Then:.'],
    ]);
    expect(messages(rules('  A player may play a card from their hand to the deck.', '    Only if the deck is empty.\n      more'))).toEqual([
      [19, 'This line shouldn\'t be indented under the line above.'],
    ]);
    expect(messages(rules('  A player may play a card from their hand to the deck.', '    Only if one of:', '      the deck is empty\n        more'))).toEqual([
      [20, 'This line shouldn\'t be indented under the line above.'],
    ]);
    expect(messages(rules('  A player may play a card from their hand to the deck.', '    Then:', '      Shuffle the deck.\n        more'))).toEqual([
      [20, 'This line shouldn\'t be indented under the line above.'],
    ]);
    expect(messages(rules('  When the deck is empty:', '    Only if the deck is empty.\n      more', '    Shuffle the deck.\n      more'))).toEqual([
      [19, 'This line shouldn\'t be indented under the line above.'], [21, 'This line shouldn\'t be indented under the line above.'],
    ]);
  });

  it('warns about unreachable phases', () => {
    const { game, diagnostics } = compileGame(withPhase(`${PHASE}\nPhase: scoring\n  Hint: Count up.`), lib);
    expect(diagnostics).toEqual([expect.objectContaining({ line: 30, severity: 'warning', kind: 'structure', message: 'Nothing leads to the phase “scoring”.' })]);
    expect(game!.phases.map((p) => p.id)).toEqual(['main', 'scoring']);
    expect(canPlay({ game, diagnostics })).toEqual({ ok: true });
  });

  it('does not warn about the first phase, or about a phase some other phase leads to', () => {
    const text = `${rules('  When the deck is empty, go to second.')}\nPhase: second\n  When the deck is not empty, go to third.\nPhase: third`;
    expect(compileGame(text, lib).diagnostics).toEqual([]);
  });

  it('warns about a phase only it leads to, and once about a phase with a repeated name', () => {
    const alone = `${rules('  When the deck is empty, go to main.')}\nPhase: second\n  When the deck is empty, go to second.`;
    expect(messages(alone)).toEqual([[22, 'Nothing leads to the phase “second”.']]);
    expect(messages(`${rules('  When the deck is empty, go to main.')}\nPhase: Main`)).toEqual([[22, 'There are two phases called “main”.']]);
  });

  it('keeps the phase\'s hint, actor and line', () => {
    const { game } = compileGame(withPhase(PHASE.replace('Players take turns.', 'Hint: Play!\n  Everyone acts at once.')), lib);
    expect(game!.phases[0]).toMatchObject({ id: 'main', line: 15, hint: 'Play!', actor: 'any' });
  });

  it('reads “When this phase starts” with or without its colon', () => {
    const { game, diagnostics } = compileGame(rules('  When this phase starts', '    Shuffle the deck.'), lib);
    expect(diagnostics).toEqual([]);
    expect(game!.phases[0].onEnter).toHaveLength(1);
  });
});

describe('compilePhase on its own', () => {
  const phaseFrom = (text: string) => {
    const diagnostics: Parameters<typeof compilePhase>[1]['diagnostics'] = [];
    const vocab = vocabFrom({
      maxPlayers: 2, phases: ['main'], verbs: ['play', 'reorder'],
      zones: [{ name: 'deck', perPlayer: false, layout: 'pile', visibility: 'secret' }, { name: 'hand', perPlayer: true, layout: 'hand', visibility: 'owner' }],
    });
    const phase = compilePhase(parseOutline(text).roots[0], { library: lib, vocab, gameName: 'Tiny', inMove: false, diagnostics });
    return { phase, diagnostics };
  };

  it('compiles one Phase: node into a phase', () => {
    const { phase, diagnostics } = phaseFrom('Phase: Main\n  Hint: Go.\n  A player may play a card from their hand to the deck.');
    expect(diagnostics).toEqual([]);
    expect(phase).toMatchObject({ id: 'main', line: 1, hint: 'Go.', actor: 'current', rearrange: [], onEnter: [], goTo: null, triggers: [], after: null });
    expect(phase.moves.map((m) => m.verb)).toEqual(['play']);
  });

  it('leaves out a move whose verb is reserved', () => {
    const { phase, diagnostics } = phaseFrom('Phase: main\n  A player may reorder a card from their hand to the deck.');
    expect(diagnostics.map((d) => d.message)).toEqual(['“reorder” is reserved; pick another word.']);
    expect(phase.moves).toEqual([]);
  });

  it('keeps the first After line when a second one is refused', () => {
    const { phase, diagnostics } = phaseFrom([
      'Phase: main', '  A player may play a card from their hand to the deck.',
      '  After a player plays, the turn passes to the left.', '  After a player plays, the turn passes to the left.',
    ].join('\n'));
    expect(diagnostics.map((d) => [d.line, d.message])).toEqual([[4, 'A phase can have only one “After a player …” rule.']]);
    expect(phase.after).toMatchObject({ verbs: ['play'], line: 3 });
  });
});
