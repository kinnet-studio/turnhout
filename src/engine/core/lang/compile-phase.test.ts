import { describe, expect, it } from 'vitest';
import { canPlay, compileGame } from './compile';
import { actionLabel, compilePhase } from './compile-phase';
import { createDefaultLibrary } from './library';
import { parseOutline } from './outline';
import { vocabFrom } from './phrases';
import { TINY_BOARD_HEAD, fixtureBoardGame } from './testing';

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
const MALFORMED_MOVE = 'I can\'t read this card move. Write it as “A player may <verb> a card from <zone> to <zone>.”';

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
    expect(p.after).toMatchObject({ moves: ['play'], line: 29, next: { kind: 'turn', phrase: 'the turn passes to the left' } });
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
    expect(p.after).toMatchObject({ moves: ['play'] });
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
      expect(game!.phases[0].after!.moves).toEqual(expected);
    }
  });

  it('forms the third person like the vocabulary does', () => {
    const { game, diagnostics } = compileGame(rules(
      '  A player may pass a card from their hand to the deck.', '  After a player passes, the turn passes to the left.',
    ), lib);
    expect(diagnostics).toEqual([]);
    expect(game!.phases[0].after!.moves).toEqual(['pass']);
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
    expect(result.game!.phases[0].after).toMatchObject({ moves: ['play'], next: { kind: 'lang', phrase: 'missing', args: ['turn'], line: 18 } });
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
    const phase = compilePhase(parseOutline(text).roots[0], { library: lib, vocab, gameName: 'Tiny', inMove: false, player: false, space: false, card: false, diagnostics });
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

  it('makes no move and no button of a card move it cannot read', () => {
    const { phase, diagnostics } = phaseFrom('Phase: main\n  A player may play a card form their hand to the deck.');
    expect(diagnostics.map((d) => [d.line, d.message])).toEqual([[2, MALFORMED_MOVE]]);
    expect([phase.moves, phase.actions]).toEqual([[], []]);
  });

  it('leaves out an action whose wording an action above already has', () => {
    const { phase, diagnostics } = phaseFrom('Phase: main\n  A player may pay the fine.\n  A player may Pay the Fine.');
    expect(diagnostics.map((d) => [d.line, d.message])).toEqual([[3, 'Two rules in this phase say “A player may pay the fine”.']]);
    expect(phase.actions.map((a) => a.words)).toEqual(['pay the fine']);
  });
  it('keeps actions that only start alike, each with its own words', () => {
    const { phase, diagnostics } = phaseFrom('Phase: main\n  A player may pay the fine.\n  A player may pay the toll.');
    expect(diagnostics).toEqual([]);
    expect(phase.actions.map((a) => [a.verb, a.words])).toEqual([['pay', 'pay the fine'], ['pay', 'pay the toll']]);
  });

  it('keeps the first After line when a second one is refused', () => {
    const { phase, diagnostics } = phaseFrom([
      'Phase: main', '  A player may play a card from their hand to the deck.',
      '  After a player plays, the turn passes to the left.', '  After a player plays, the turn passes to the left.',
    ].join('\n'));
    expect(diagnostics.map((d) => [d.line, d.message])).toEqual([[4, 'A phase can have only one “After a player …” rule.']]);
    expect(phase.after).toMatchObject({ moves: ['play'], line: 3 });
  });
});

describe('actions, moments and player rules on a board', () => {
  /** The board head, then `lines` as the phase's own lines; the first of them is line 18. */
  const phase = (lines: string[]) => compileGame(`${TINY_BOARD_HEAD}\n${lines.map((l) => `  ${l}`).join('\n')}`, lib);
  const errorsOf = (lines: string[]) => phase(lines).diagnostics.filter((d) => d.severity === 'error').map((d) => [d.line, d.message]);
  const TURN_ACTIONS = ['A player may roll the dice.', 'A player may end their turn.'];
  const NOT_UNDERSTOOD = "I don't understand this line in a phase. Phase lines start with Hint:, A player may…, When…, After a player…, Players take turns or Everyone acts at once.";
  const NEEDS_PLAYER = (line: string) => `“${line}” only makes sense in a rule about a player, such as a move, an action or a “When a player …” rule.`;
  const NEEDS_SPACE = (line: string) => `“${line}” only makes sense in a rule about a space, such as an action or a “lands on” rule.`;

  it('compiles an action with its conditions, effects and button label', () => {
    const { game } = phase(['A player may roll the dice.', '  Only if they have not rolled this turn.', '  Then:', '    Roll the dice.', '    Their piece moves forward by the roll.']);
    expect(game!.phases[0].actions).toEqual([expect.objectContaining({
      verb: 'roll', words: 'roll the dice', label: 'Roll the dice', line: 18,
      conditions: [expect.objectContaining({ text: 'they have not rolled this turn' })],
      effects: [expect.objectContaining({ phrase: 'roll the dice' }), expect.objectContaining({ phrase: 'their piece moves forward by the roll' })],
    })]);
  });
  it('reads the actions of the whole game first, so a rule can say what was done before the action is written', () => {
    expect(errorsOf(['When a player has less than 0 money:', '  Only if they have not rolled this turn.', '  They are out.', ...TURN_ACTIONS])).toEqual([]);
    expect(errorsOf(['A player may roll the dice.', '  Only if they have not bought this turn.'])).toEqual([
      [19, '“they have not bought this turn” isn\'t in the phrase library yet.'],
    ]);
  });
  it('labels buttons in the second person', () => {
    expect(actionLabel('end their turn')).toBe('End your turn');
    expect(actionLabel('buy the space they are on')).toBe('Buy the space you are on');
    expect(actionLabel('roll the dice')).toBe('Roll the dice');
    expect(actionLabel("skip a go if they're broke")).toBe("Skip a go if you're broke");
    expect(actionLabel('swap with them')).toBe('Swap with you');
    expect(actionLabel('save themselves')).toBe('Save yourself');
    expect(actionLabel('wait for Their friends')).toBe('Wait for your friends');
  });
  it('swaps whole words only', () => {
    expect(actionLabel('thank theirs then')).toBe('Thank theirs then');
    expect(actionLabel('gather them there')).toBe('Gather you there');
  });
  it('keeps the words in lowercase and the designer\'s capitals on the button', () => {
    const { game } = phase(['A player may Buy the space they are on.']);
    expect(game!.phases[0].actions[0]).toMatchObject({ verb: 'buy', words: 'buy the space they are on', label: 'Buy the space you are on' });
    expect(phase(['A player may Go to Rose Lane.']).game!.phases[0].actions[0]).toMatchObject({ verb: 'go', words: 'go to rose lane', label: 'Go to Rose Lane' });
    expect(phase(['A player may end their turn.']).game!.phases[0].actions[0]).toMatchObject({ words: 'end their turn', label: 'End your turn' });
  });
  it('lets a rule name an action in any capitals', () => {
    const lines = ['A player may Go to Rose Lane.', 'After a player GOES TO ROSE LANE, the turn passes to the left.'];
    expect(errorsOf(lines)).toEqual([]);
    expect(phase(lines).game!.phases[0].after).toMatchObject({ moves: ['go to rose lane'] });
  });
  it('lets a one-word action stand alone', () => {
    const { game } = phase(['A player may pass.']);
    expect(errorsOf(['A player may pass.'])).toEqual([]);
    expect(game!.phases[0].actions[0]).toMatchObject({ verb: 'pass', words: 'pass', label: 'Pass' });
  });
  it('compiles a moment rule and a player rule', () => {
    const { game, diagnostics } = phase(['When a piece passes Go:', '  Its player gets 200 money.', 'When a player has less than 0 money:', '  They are out.', '  Their spaces go back to the bank.']);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(game!.phases[0].moments[0].when).toMatchObject({ kind: 'moment', phrase: 'a piece passes {space}', args: [0] });
    expect(game!.phases[0].triggers[0].when).toMatchObject({ kind: 'who' });
  });
  it('keeps a moment rule apart from the other rules, with its line, text, conditions and effects', () => {
    const lines = [
      'When a player lands on a tax space:', '  Only if they have at least 10 money.', '  They pay its tax.', '  Only if no one owns it.',
      'When one player is left:', '  Roll the dice.',
    ];
    const { game } = phase(lines);
    expect(errorsOf(lines)).toEqual([]);
    const p = game!.phases[0];
    expect(p.moments).toHaveLength(1);
    expect(p.moments[0]).toMatchObject({
      line: 18, text: 'When a player lands on a tax space', when: { kind: 'moment', phrase: 'a player lands on {spaceclass}' },
      conditions: [{ text: 'they have at least 10 money', line: 19 }, { text: 'no one owns it', line: 21 }],
      effects: [{ phrase: 'they pay its {spaceattr}', line: 20 }],
    });
    expect(p.triggers.map((t) => t.text)).toEqual(['When one player is left']);
  });
  it('names a misspelt kind of space in a moment rule, with the words of the board\'s table', () => {
    const typo = (when: string) => phase([when, '  They pay its tax.']).diagnostics.filter((d) => d.severity === 'error');
    expect(typo('When a player lands on a taks space:')).toEqual([
      expect.objectContaining({ line: 18, kind: 'invalid', message: 'There is no kind of space called “taks”.', suggestions: ['tax'] }),
    ]);
    expect(typo('When a player lands on a stret someone else owns:')).toEqual([
      expect.objectContaining({ line: 18, message: 'There is no kind of space called “stret”.', suggestions: ['street'] }),
    ]);
    expect(typo('When a player lands on Rose Lan:')).toEqual([
      expect.objectContaining({ line: 18, message: 'There is no space called “Rose Lan”.', suggestions: ['Rose Lane'] }),
    ]);
  });
  it('lets a moment rule talk about the player and the space', () => {
    expect(errorsOf([
      'When a player lands on Rose Lane:', '  Only if no one owns it.', '  They own it.', '  Their piece moves forward by the roll.',
      'When a player lands on a street someone else owns:', '  They pay its rent to its owner.',
    ])).toEqual([]);
  });
  it('names the space a moment rule is about', () => {
    const { diagnostics } = phase(['When a piece passes Goo:', '  Its player gets 200 money.']);
    expect(diagnostics).toContainEqual(expect.objectContaining({ line: 18, message: 'There is no space called “Goo”.', suggestions: ['Go'] }));
  });
  it('lets an action talk about the player and the space', () => {
    expect(errorsOf([
      'A player may buy the space they are on.', '  Only if no one owns it.', '  Only if they have at least its price in money.',
      '  Then:', '    They pay its price.', '    They own it.',
    ])).toEqual([]);
  });
  it('lets an action in a card game name their zones', () => {
    const { diagnostics } = compileGame(BASE.replace('Phase: main', 'Phase: main\n  A player may tidy up.\n    Then:\n      Shuffle their hand.'), lib);
    expect(diagnostics).toEqual([]);
  });
  it('reads an After line that names an action', () => {
    const { game } = phase(['A player may end their turn.', 'After a player ends their turn, the turn passes to the left.']);
    expect(game!.phases[0].after).toMatchObject({ moves: ['end their turn'] });
  });
  it('names an action by its verb or by all its words, in the third person', () => {
    for (const named of ['ends', 'ends their turn', 'Ends Their Turn']) {
      const lines = [...TURN_ACTIONS, `After a player ${named}, the turn passes to the left.`];
      const { game } = phase(lines);
      expect(errorsOf(lines)).toEqual([]);
      expect(game!.phases[0].after).toMatchObject({ moves: ['end their turn'], line: 20 });
    }
  });
  it('lets an After line list several actions, each of several words', () => {
    const lines = [...TURN_ACTIONS, 'A player may buy the space they are on.'];
    const cases: [string, string[]][] = [
      ['rolls the dice or ends their turn', ['roll the dice', 'end their turn']],
      ['rolls, buys the space they are on, or ends their turn', ['roll the dice', 'buy the space they are on', 'end their turn']],
      ['rolls, buys or ends', ['roll the dice', 'buy the space they are on', 'end their turn']],
    ];
    for (const [named, moves] of cases) {
      const all = [...lines, `After a player ${named}, the turn passes to the left.`];
      const { game } = phase(all);
      expect(errorsOf(all)).toEqual([]);
      expect(game!.phases[0].after).toMatchObject({ moves, next: { kind: 'turn', phrase: 'the turn passes to the left' } });
    }
  });
  it('names card moves and actions in one After line', () => {
    const { game, diagnostics } = compileGame(rules(
      '  A player may play a card from their hand to the deck.', '  A player may pass.', '  After a player plays or passes, the turn passes to the left.',
    ), lib);
    expect(diagnostics).toEqual([]);
    expect(game!.phases[0].after).toMatchObject({ moves: ['play', 'pass'] });
  });
  it('cuts an After line at the best comma: names known and a turn phrase after, else a turn phrase after, else names known, else the first', () => {
    // No comma leaves a turn phrase: the first cut that names known actions stands, and what follows it is read as the phrase.
    const loose = phase([...TURN_ACTIONS, 'After a player rolls, ends their turn, the turn goes nowhere.']);
    expect(loose.game!.phases[0].after).toMatchObject({ moves: ['roll the dice'], next: { phrase: 'missing', text: 'ends their turn, the turn goes nowhere' } });
    // A turn phrase follows the second comma, so the names before it are the ones reported.
    const unknown = phase([...TURN_ACTIONS, 'After a player dances, sings, the turn passes to the left.']);
    expect(unknown.diagnostics.filter((d) => d.message.includes('isn\'t a move')).map((d) => [d.line, d.text, d.message])).toEqual([
      [20, 'dances', '“dances” isn\'t a move in this phase. The moves here are: rolls, rolls the dice, ends, ends their turn.'],
      [20, 'sings', '“sings” isn\'t a move in this phase. The moves here are: rolls, rolls the dice, ends, ends their turn.'],
    ]);
    expect(unknown.diagnostics.filter((d) => d.kind === 'unknown-phrase')).toEqual([]);
    expect(unknown.game).toBeUndefined();
  });
  it('reports a typo in a list of moves as a move that is not there, not as an unknown turn phrase', () => {
    const lines = [
      '  A player may play a card from their hand to the deck.', '  A player may draw a card from the deck to their hand.',
      '  After a player plays, drawz, the turn passes to the left.',
    ];
    const result = compileGame(rules(...lines), lib);
    expect(result.diagnostics).toEqual([expect.objectContaining({
      line: 19, kind: 'structure', text: 'drawz', message: '“drawz” isn\'t a move in this phase. The moves here are: plays, draws.',
    })]);
    expect(result.game).toBeUndefined();
  });
  it('lists the actions among the moves an After line can name', () => {
    expect(errorsOf(['A player may end their turn.', 'After a player plays, the turn passes to the left.'])).toEqual([
      [19, '“plays” isn\'t a move in this phase. The moves here are: ends, ends their turn.'],
    ]);
  });
  it('knows the actions of the phase an After line is in', () => {
    const text = ['Phase: first', '  A player may roll the dice.', 'Phase: second', '  A player may end their turn.', '  After a player rolls, the turn passes to the left.'].join('\n');
    expect(compileGame(`${TINY_BOARD_HEAD}\n${text}`, lib).diagnostics.map((d) => d.message)).toContain(
      '“rolls” isn\'t a move in this phase. The moves here are: ends, ends their turn.',
    );
  });
  it('still wants a comma and a turn phrase after the names of an After line', () => {
    for (const line of ['After a player ends their turn', 'After a player ends their turn,', 'After a player, the turn passes to the left.']) {
      expect(errorsOf([...TURN_ACTIONS, line])).toEqual([[20, NOT_UNDERSTOOD]]);
    }
  });
  it('refuses “they” outside a rule about a player, “it” outside a rule about a space, and pay lines with nothing to pay with', () => {
    const they = compileGame(TINY_BOARD_HEAD.replace('Phase: playing', 'Setup:\n  They are out.\n\nPhase: playing'), lib);
    expect(they.diagnostics).toContainEqual(expect.objectContaining({ line: 17, kind: 'invalid', message: NEEDS_PLAYER('They are out') }));
    const it2 = phase(['When a player has less than 0 money:', '  They own it.']);
    expect(it2.diagnostics).toContainEqual(expect.objectContaining({ message: NEEDS_SPACE('They own it') }));
    const pay = compileGame(`${TINY_BOARD_HEAD.replace('  Players pay with money.\n', '')}\n  A player may buy the space they are on.\n    Then:\n      They pay its price.`, lib);
    expect(pay.diagnostics).toContainEqual(expect.objectContaining({ message: 'Say what players pay with, like “Players pay with coins.” under Board:.' }));
  });
  it('refuses board phrases in a game with no board, and rolling in a game with no dice', () => {
    const NEEDS_BOARD = (line: string) => `“${line}” needs a board. Add a Board: section with a line like “The board is a loop of spaces, starting at Go:”.`;
    const NEEDS_DICE = (line: string) => `“${line}” needs dice. Add a line like “There are two six-sided dice.” under Board:.`;
    // A card game whose one button runs `line`, on line 18.
    const inCardGame = (line: string) => messages(BASE.replace('Phase: main', `Phase: main\n  A player may tidy up.\n    Then:\n      ${line}`));
    expect(inCardGame('Roll the dice.')).toEqual([[18, NEEDS_DICE('Roll the dice')]]);
    expect(inCardGame('Their piece moves forward by the roll.')).toEqual([[18, NEEDS_BOARD('Their piece moves forward by the roll')]]);
    expect(inCardGame('Their spaces go back to the bank.')).toEqual([[18, NEEDS_BOARD('Their spaces go back to the bank')]]);
    expect(inCardGame('They own it.')).toEqual([[18, NEEDS_BOARD('They own it')]]);
    // What the game lacks is said before what the rule lacks: a rule about a player won't help a game with no board.
    expect(messages(BASE.replace('  Shuffle the deck.', '  Their piece moves forward by the roll.'))).toEqual([
      [12, NEEDS_BOARD('Their piece moves forward by the roll')],
    ]);

    // A board with no dice, whose phase lines start on line 17.
    const noDice = (lines: string[]) => compileGame(`${TINY_BOARD_HEAD.replace('  There are two six-sided dice.\n', '')}\n${lines.map((l) => `  ${l}`).join('\n')}`, lib)
      .diagnostics.filter((d) => d.severity === 'error').map((d) => [d.line, d.message]);
    expect(noDice(['A player may roll the dice.', '  Then:', '    Roll the dice.', '    Their piece moves forward by the roll.'])).toEqual([
      [19, NEEDS_DICE('Roll the dice')], [20, NEEDS_DICE('Their piece moves forward by the roll')],
    ]);
    expect(noDice(['When a player lands on a street someone else owns:', '  They pay 4 times the roll to its owner.'])).toEqual([
      [18, NEEDS_DICE('They pay 4 times the roll to its owner')],
    ]);
    expect(noDice(['A player may give up.', '  Then:', '    Their spaces go back to the bank.', '    They own it.'])).toEqual([]);
  });
  it('reports a line that lacks several things once, naming the first: a player, then a space, then something to pay with', () => {
    expect(errorsOf(['When one player is left:', '  They pay its price.'])).toEqual([[19, NEEDS_PLAYER('They pay its price')]]);
    expect(errorsOf(['When a player has less than 0 money:', '  They pay its price.'])).toEqual([[19, NEEDS_SPACE('They pay its price')]]);
    expect(phase(['When one player is left:', '  They pay its price.']).game).toBeUndefined();
  });
  it('gives conditions the player and the space of the rule they are in', () => {
    expect(errorsOf(['A player may buy the space they are on.', '  Only if no one owns it.'])).toEqual([]);
    expect(errorsOf(['When a player has less than 0 money:', '  Only if they have at least 10 money.'])).toEqual([]);
    expect(errorsOf(['When a player has less than 0 money:', '  Only if no one owns it.'])).toEqual([[19, NEEDS_SPACE('no one owns it')]]);
    expect(errorsOf(['When one player is left:', '  Only if they have at least 10 money.'])).toEqual([[19, NEEDS_PLAYER('they have at least 10 money')]]);
    expect(errorsOf(['Only if they have at least 10 money.'])).toEqual([[18, NOT_UNDERSTOOD]]);
  });
  it('does not blame the lines of a player rule for a player rule it could not read', () => {
    expect(errorsOf(['When a player has less than 0 gold:', '  They are out.'])).toEqual([[18, 'There is no counter called “gold”.']]);
  });
  it('lets two buttons share a first word', () => {
    const { game, diagnostics } = phase(['A player may build a house.', 'A player may build a hotel.']);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(game!.phases[0].actions.map((a) => a.words)).toEqual(['build a house', 'build a hotel']);
  });
  it('needs the whole wording in an After line when a verb is shared', () => {
    const { diagnostics } = phase(['A player may build a house.', 'A player may build a hotel.', 'After a player builds, the turn passes to the left.']);
    expect(diagnostics).toContainEqual(expect.objectContaining({ message: '“builds” could be “build a house” or “build a hotel”; write the whole wording.' }));
    const whole = phase(['A player may build a house.', 'A player may build a hotel.', 'After a player builds a hotel, the turn passes to the left.']);
    expect(whole.game!.phases[0].after).toMatchObject({ moves: ['build a hotel'] });
  });
  it('names every wording a shared verb could mean, and still takes the whole ones', () => {
    const buttons = ['A player may build a house.', 'A player may build a hotel.', 'A player may build a camp.'];
    expect(errorsOf([...buttons, 'After a player builds, the turn passes to the left.'])).toEqual([
      [21, '“builds” could be “build a house”, “build a hotel” or “build a camp”; write the whole wording.'],
    ]);
    const both = phase([...buttons, 'After a player builds a house or builds a camp, the turn passes to the left.']);
    expect(both.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(both.game!.phases[0].after).toMatchObject({ moves: ['build a house', 'build a camp'] });
  });
  it('lets a bare verb name the one button that has it, beside buttons with other verbs', () => {
    const { game, diagnostics } = phase(['A player may build a house.', 'A player may build a hotel.', ...TURN_ACTIONS, 'After a player ends, the turn passes to the left.']);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(game!.phases[0].after).toMatchObject({ moves: ['end their turn'] });
  });
  it('lets a one-word button keep its own name beside longer buttons that start alike', () => {
    const { game, diagnostics } = phase(['A player may build.', 'A player may build a house.', 'After a player builds, the turn passes to the left.']);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(game!.phases[0].after).toMatchObject({ moves: ['build'] });
  });
  it('leaves a bare verb that two buttons share out of the moves it lists', () => {
    expect(errorsOf(['A player may build a house.', 'A player may build a hotel.', 'After a player dances, the turn passes to the left.'])).toEqual([
      [20, '“dances” isn\'t a move in this phase. The moves here are: builds a house, builds a hotel.'],
    ]);
  });
  it('says which buttons “built” could mean when two of them share the verb, and takes what only one button did', () => {
    const hotels = ['A player may build a house.', '  Only if they have not built this turn.', 'A player may build a hotel.'];
    expect(errorsOf(hotels)).toEqual([[19, '“built” could mean “build a house” or “build a hotel”.']]);
    const ends = ['A player may build a house.', 'A player may build a hotel.', 'A player may end their turn.', '  Only if they have not ended this turn.'];
    expect(errorsOf(ends)).toEqual([]);
  });
  it('refuses two actions with the same wording', () => {
    const { diagnostics, game } = phase(['A player may pay the fine.', 'A player may pay the fine.']);
    expect(diagnostics).toContainEqual(expect.objectContaining({ line: 19, message: 'Two rules in this phase say “A player may pay the fine”.' }));
    expect(game).toBeUndefined();
  });
  it('refuses an action whose verb a card move uses, whichever comes first, but not two moves', () => {
    const move = '  A player may play a card from their hand to the deck.';
    const clash = 'Two rules in this phase start “A player may play”. Start one with another word.';
    expect(messages(rules(move, '  A player may play the fool.'))).toEqual([[18, clash]]);
    expect(messages(rules('  A player may play the fool.', move))).toEqual([[18, clash]]);
    expect(messages(rules(move, move))).toEqual([]);
  });
  it('allows the same verb in different phases', () => {
    const text = ['Phase: first', '  A player may roll the dice.', 'Phase: second', '  A player may roll the dice.'].join('\n');
    expect(compileGame(`${TINY_BOARD_HEAD}\n${text}`, lib).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });
  it('refuses a verb that is a card move in one phase and a button in another, on the later line', () => {
    const errors = (first: string, second: string) => compileGame(withPhase([
      'Phase: first', `  ${first}`, '  When the deck is empty, go to second.', '', 'Phase: second', `  ${second}`,
    ].join('\n')), lib).diagnostics.filter((d) => d.severity === 'error').map((d) => [d.line, d.message]);
    const move = 'A player may play a card from their hand to the deck.';
    const button = 'A player may play the fool.';
    expect(errors(move, button)).toEqual([[20, '“play” is a card move in another phase, so it can\'t also be a button. Start one with another word.']]);
    expect(errors(button, move)).toEqual([[20, '“play” is a button in another phase, so it can\'t also be a card move. Start one with another word.']]);
    expect(errors('A player may play a card to the deck.', button)).toEqual([
      [16, MALFORMED_MOVE], [20, '“play” is a card move in another phase, so it can\'t also be a button. Start one with another word.'],
    ]);
    expect(errors(move, move)).toEqual([]);
    expect(errors(button, button)).toEqual([]);
  });
  it('keeps “reorder” reserved for actions too', () => {
    expect(errorsOf(['A player may reorder the board.'])).toEqual([[18, '“reorder” is reserved; pick another word.']]);
    expect(phase(['A player may reorder the board.']).game).toBeUndefined();
  });
  it('says what it does not understand under an action', () => {
    expect(errorsOf(['A player may roll the dice.', '  Dance.'])).toEqual([
      [19, 'I don\'t understand this line under a move. Use Only if…, Only if one of: or Then:.'],
    ]);
  });
  it('reads every “A player may …” line about a card as a card move, and says how to write one it cannot read', () => {
    for (const line of [
      'A player may take a card from the deck.', 'A player may play a card to the deck.', 'A player may draw the top card of the deck.',
      'A player may pass a card form their hand to the deck.', 'A player may discard two CARDS.',
    ]) {
      expect(messages(rules(`  ${line}`)), line).toEqual([[17, MALFORMED_MOVE]]);
    }
  });
  it('still reads the conditions and effects under a card move it cannot read', () => {
    expect(messages(rules('  A player may play a card to the deck.', '    Only if the card is a heart.', '    Then:', '      Shuffle the dek.'))).toEqual([
      [17, MALFORMED_MOVE], [20, 'There is no zone called “dek”.'],
    ]);
  });
  it('lets an After line name a card move it cannot read, so only the move line is blamed', () => {
    expect(messages(rules('  A player may play a card to the deck.', '  After a player plays, the turn passes to the left.'))).toEqual([[17, MALFORMED_MOVE]]);
  });
  it('never reads a line about a card as a button, not even ahead for what was done this turn', () => {
    const errors = phase(['A player may play a card to the deck.', 'A player may end their turn.', '  Only if they have played this turn.'])
      .diagnostics.filter((d) => d.severity === 'error');
    // Had the move line been read as a button, “they have played this turn” would be a phrase the game knows.
    expect(errors.map((d) => [d.line, d.kind])).toEqual([[18, 'structure'], [20, 'unknown-phrase']]);
    expect(errors[0].message).toBe(MALFORMED_MOVE);
  });
  it('keeps a line that says card inside another word a button', () => {
    expect(errorsOf(['A player may discard their hand.', '  Then:', '    Roll the dice.'])).toEqual([]);
  });
  it('allows no indentation under the lines of an action', () => {
    expect(errorsOf(['A player may roll the dice.', '  Then:', '    Roll the dice.', '      more'])).toEqual([[21, 'This line shouldn\'t be indented under the line above.']]);
  });
});

describe('buttons that pick a target', () => {
  /** The board head with houses and a hotel to build and a bank to take them from, then `lines` as the phase's own; the first is line 20. */
  const BUILDING_HEAD = TINY_BOARD_HEAD.replace(
    '  There are two six-sided dice.', '  There are two six-sided dice.\n  Spaces can have houses and a hotel.\n  The bank has 32 houses and 12 hotels.',
  );
  const phase = (lines: string[]) => compileGame(`${BUILDING_HEAD}\n${lines.map((l) => `  ${l}`).join('\n')}`, lib);
  const problems = (result: ReturnType<typeof phase>) => result.diagnostics.filter((d) => d.severity === 'error');
  const errorsOf = (lines: string[]) => problems(phase(lines)).map((d) => [d.line, d.message]);
  const BUILD = ['A player may build a house on a street they own.', '  Then:', '    It gets a house from the bank.'];

  it('compiles a button whose line ends in “on a …”: the wording stays the move, the base is the words before “on”', () => {
    const built = phase(BUILD);
    const { game } = built;
    expect(problems(built)).toEqual([]);
    expect(game!.phases[0].actions).toEqual([expect.objectContaining({
      verb: 'build', words: 'build a house on a street they own', base: 'build a house', label: 'Build a house', line: 20,
      target: expect.objectContaining({ kind: 'target', phrase: 'a {spacekind} they own', line: 20 }),
      effects: [expect.objectContaining({ phrase: 'it gets a {banked} from the bank' })],
    })]);
  });
  it('keeps the designer\'s capitals on the button, and reads the target in any capitals', () => {
    const built = phase(['A player may Build a House on A Street they own.']);
    const { game } = built;
    expect(problems(built)).toEqual([]);
    expect(game!.phases[0].actions[0]).toMatchObject({
      words: 'build a house on a street they own', base: 'build a house', label: 'Build a House', target: { phrase: 'a {spacekind} they own' },
    });
  });
  it('reads “on an …” as a target too: the kinds of a board may start with a vowel', () => {
    const withAirport = BUILDING_HEAD.replace('    | Rose Lane  | street | orange | 180   | 14   |     |', '    | Rose Lane  | street | orange | 180   | 14   |     |\n    | Heathrow   | airport |       | 300   |      |     |');
    expect(withAirport).not.toBe(BUILDING_HEAD);
    const on = (target: string) => compileGame(`${withAirport}\n  A player may build a house on ${target}.`, lib);
    for (const [target, phrase] of [['an airport they own', 'an {spacekind} they own'], ['an airport', 'an {spacekind}']]) {
      const built = on(target);
      expect(problems(built), target).toEqual([]);
      expect(built.game!.phases[0].actions[0], target).toMatchObject({
        words: `build a house on ${target}`, base: 'build a house', target: { kind: 'target', phrase },
      });
    }
    expect(problems(on('an airpot they own')).map((d) => d.message)).toEqual(['There is no kind of space called “airpot”.']);
    expect(on('an airpot they own').game).toBeUndefined();
  });
  it('asks a developer for an “an …” target nobody has written a phrase for', () => {
    expect(errorsOf(['A player may build a house on an orange street.'])).toEqual([[20, '“an orange street” isn\'t in the phrase library yet.']]);
  });
  it('reads each way of saying where: a kind of space they own, any space of a kind, any space they own', () => {
    const phrases = ['a street they own', 'a street', 'a space they own'].map((target) => {
      const built = phase([`A player may build a house on ${target}.`]);
      expect(problems(built)).toEqual([]);
      return built.game!.phases[0].actions[0].target!.phrase;
    });
    expect(phrases).toEqual(['a {spacekind} they own', 'a {spacekind}', 'a space they own']);
  });
  it('makes a button that takes no target have the base of its words, and no target', () => {
    const { game } = phase(['A player may buy the space they are on.', 'A player may end their turn.']);
    expect(game!.phases[0].actions).toEqual([
      expect.objectContaining({ words: 'buy the space they are on', base: 'buy the space they are on', label: 'Buy the space you are on', target: null }),
      expect.objectContaining({ words: 'end their turn', base: 'end their turn', label: 'End your turn', target: null }),
    ]);
  });
  it('is no target when the text after “on” is not “a …” or “an …”, so a rule may still end in “…they are on”', () => {
    for (const line of ['A player may buy the space they are on.', 'A player may roll on doubles.', 'A player may carry on.']) {
      const built = phase([line]);
      expect(problems(built), line).toEqual([]);
      expect(built.game!.phases[0].actions[0].target, line).toBeNull();
    }
  });
  it('splits at the last “on”, so a base may hold one', () => {
    const { game } = phase(['A player may turn on a light on a street they own.']);
    expect(game!.phases[0].actions[0]).toMatchObject({ base: 'turn on a light', target: { phrase: 'a {spacekind} they own' } });
  });
  it('names a misspelt kind of space in the target, and makes no button of the line, not even a plain one', () => {
    expect(errorsOf(['A player may build a house on a stret they own.', '  Then:', '    It gets a house from the bank.'])).toEqual([
      [20, 'There is no kind of space called “stret”.'],
    ]);
    expect(phase(['A player may build a house on a stret they own.']).game).toBeUndefined();

    const diagnostics: Parameters<typeof compilePhase>[1]['diagnostics'] = [];
    const vocab = vocabFrom({ maxPlayers: 2, phases: ['main'], board: fixtureBoardGame().board });
    const built = compilePhase(
      parseOutline('Phase: main\n  A player may build a house on a stret they own.').roots[0],
      { library: lib, vocab, gameName: 'Tiny', inMove: false, player: false, space: false, card: false, diagnostics },
    );
    expect(diagnostics.map((d) => [d.line, d.message])).toEqual([[2, 'There is no kind of space called “stret”.']]);
    expect(built.actions).toEqual([]);
  });
  it('suggests the kinds the board has for a misspelt one', () => {
    expect(problems(phase(['A player may build a house on a stret they own.']))[0].suggestions).toEqual(['street']);
  });
  it('asks a developer for a target nobody has written a phrase for, and makes no button of it', () => {
    const built = phase(['A player may build a house on a street they love.']);
    const { game } = built;
    expect(problems(built)).toEqual([expect.objectContaining({
      line: 20, kind: 'unknown-phrase', message: '“a street they love” isn\'t in the phrase library yet.',
      stub: expect.stringContaining("library.target('a street they love', (env, _args, space) => {"),
    })]);
    expect(game!.phases[0].actions).toEqual([]);
  });
  it('lets an After line name the button by its whole wording, since a button that picks a target is a move like any other', () => {
    const built = phase([...BUILD, 'After a player builds a house on a street they own, the turn passes to the left.']);
    const { game } = built;
    expect(problems(built)).toEqual([]);
    expect(game!.phases[0].after).toMatchObject({ moves: ['build a house on a street they own'] });
  });
  it('still reads “it” as the space of the rule in the lines under the button, and “they” as the player', () => {
    expect(errorsOf([
      'A player may build a house on a street they own.', '  Only if it has fewer than 4 houses.', '  Only if they have at least its price in money.',
      '  Then:', '    It gets a house from the bank.',
    ])).toEqual([]);
  });
  it('allows two buttons with the same base and different targets, and refuses the same wording twice', () => {
    const both = phase(['A player may build a house on a street they own.', 'A player may build a house on a street.']);
    expect(problems(both)).toEqual([]);
    expect(both.game!.phases[0].actions.map((a) => [a.base, a.words])).toEqual([
      ['build a house', 'build a house on a street they own'], ['build a house', 'build a house on a street'],
    ]);
    expect(errorsOf(['A player may build a house on a street they own.', 'A player may Build a House on a Street they own.'])).toEqual([
      [21, 'Two rules in this phase say “A player may build a house on a street they own”.'],
    ]);
  });
});

describe('rules about a card, and the other player', () => {
  /** A two-player game of creatures with the phase's own lines below `Players take turns.` (line 18), so the first of them is line 19. */
  const creatures = (phase: string[], { players = '2', setup = [] as string[] } = {}) => [
    'Game: Creatures', `Players: ${players}`, '', 'Cards:', '  A deck called creatures, starting in the deck:', '    | name   | health | copies |',
    '    | Knight | 3      | 2      |', '    | Viper  | 1      | 2      |', '  Cards can be poisoned.', '',
    'Table:', '  The deck is a pile in the center that no one can see.', '  The discard pile is a pile in the center that everyone can see.',
    '  Each player has a hand that only they can see.', '  Each player has a camp that everyone can see.', '',
    ...(setup.length > 0 ? ['Setup:', ...setup.map((l) => `  ${l}`), ''] : []),
    'Phase: playing', '  Players take turns.', ...phase.map((l) => `  ${l}`),
  ].join('\n');
  const built = (phase: string[], over: Parameters<typeof creatures>[1] = {}) => compileGame(creatures(phase, over), lib);
  const errorsOf = (phase: string[], over: Parameters<typeof creatures>[1] = {}) =>
    built(phase, over).diagnostics.filter((d) => d.severity === 'error').map((d) => [d.line, d.message]);
  const WHEN = 'When a card in a camp has 0 health:';
  const PLAY = 'A player may play a card from their hand to their camp.';
  const NEEDS_CARD = (line: string) => `“${line}” only makes sense in a rule about a card, such as “When a card …”.`;
  const NEEDS_TWO = '“the other player” needs a game for two players.';

  it('compiles a rule about each card a phrase picks out, with the lines under it about “it”', () => {
    const { game, diagnostics } = built([WHEN, '  Move it to the discard pile.']);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(game!.phases[0].triggers).toEqual([expect.objectContaining({
      line: 19, text: WHEN.slice(0, -1), conditions: [],
      when: expect.objectContaining({ kind: 'which', phrase: 'a card in a {perzone} has {int} {attribute}', args: ['camp', 0, 'health'], line: 19 }),
      effects: [expect.objectContaining({ kind: 'effect', phrase: 'move it to {zone}', args: [{ shared: 'discard pile' }], line: 20 })],
    })]);
  });
  it('reads “Only if” lines about the card too', () => {
    const { game, diagnostics } = built([WHEN, '  Only if it is poisoned.', '  Move it to the discard pile.']);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(game!.phases[0].triggers[0].conditions).toEqual([
      expect.objectContaining({ mode: 'all', text: 'it is poisoned', refs: [expect.objectContaining({ kind: 'condition', phrase: 'it is {cardflag}' })] }),
    ]);
  });
  it('keeps a rule about a card and a rule about nothing in particular apart', () => {
    const { game } = built([WHEN, '  Move it to the discard pile.', 'When the deck is empty:', '  Shuffle the discard pile.']);
    expect(game!.phases[0].triggers.map((t) => t.when.kind)).toEqual(['which', 'condition']);
  });
  it('tells a rule about a card what it may not say: nothing about a player, a space or a move', () => {
    expect(errorsOf([WHEN, '  Move it to their hand.'])).toEqual([[20, '“Move it to their hand” only makes sense in a rule about a player\'s move.']]);
    expect(errorsOf([WHEN, '  Only if the card is poisoned.', '  Move it to the discard pile.'])).toEqual([[20, '“the card is poisoned” only makes sense in a rule about a player\'s move.']]);
  });
  it('refuses “it” the card anywhere but in a rule about a card', () => {
    expect(errorsOf([], { setup: ['Move it to the discard pile.'] })).toEqual([[18, NEEDS_CARD('Move it to the discard pile')]]);
    expect(errorsOf([PLAY, '  Only if it is poisoned.', '  Then:', '    Move it to the discard pile.'])).toEqual([
      [20, NEEDS_CARD('it is poisoned')], [22, NEEDS_CARD('Move it to the discard pile')],
    ]);
    expect(errorsOf(['When the deck is empty:', '  Move it to the discard pile.'])).toEqual([[20, NEEDS_CARD('Move it to the discard pile')]]);
  });
  it('says which line is wrong with a misspelt attribute, and still reads the lines under it as about the card', () => {
    const typo = built(['When a card in a camp has 0 helth:', '  Move it to the discard pile.']);
    expect(typo.diagnostics.filter((d) => d.severity === 'error')).toEqual([
      expect.objectContaining({ line: 19, kind: 'invalid', message: 'There is no card attribute called “helth”.', suggestions: ['health'] }),
    ]);
  });
  it('reads the other player\'s zone in a game for two, as a move\'s zone and in an effect', () => {
    const { game, diagnostics } = built([
      'A player may give a card from their hand to the other player\'s camp.', '  Then:', '    Every card in the other player\'s camp is poisoned.',
    ]);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(game!.phases[0].moves[0]).toMatchObject({ verb: 'give', from: { of: { who: 'actor' }, zone: 'hand' }, to: { of: { who: 'other' }, zone: 'camp' } });
    expect(game!.phases[0].moves[0].effects[0]).toMatchObject({ phrase: 'every card in {zone} is {cardflag}', args: [{ of: { who: 'other' }, zone: 'camp' }, 'poisoned'] });
  });
  it('is an error on the line in a game that allows more than two players', () => {
    const more = { players: '2 to 4' };
    expect(errorsOf(['A player may give a card from their hand to the other player\'s camp.'], more)).toEqual([[19, NEEDS_TWO]]);
    expect(errorsOf([PLAY, '  Then:', '    Every card in the other player\'s camp is poisoned.'], more)).toEqual([[21, NEEDS_TWO]]);
    expect(errorsOf([PLAY, '  Then:', '    Every card in the other player\'s camp is poisoned.'], { players: '1 to 2' })).toEqual([]);
    expect(errorsOf([PLAY, '  Then:', '    Every card in the other player\'s camp is poisoned.'], { players: '1' })).toEqual([[21, NEEDS_TWO]]);
  });
  it('says “their” and “the other player\'s” only in a rule about a player', () => {
    expect(errorsOf(['When the deck is empty:', '  Every card in the other player\'s camp is poisoned.'])).toEqual([
      [20, '“Every card in the other player\'s camp is poisoned” only makes sense in a rule about a player\'s move.'],
    ]);
  });
});
