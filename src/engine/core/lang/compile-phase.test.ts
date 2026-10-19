import { describe, expect, it } from 'vitest';
import { canPlay, compileGame } from './compile';
import { actionLabel, compilePhase } from './compile-phase';
import { hasCost } from './declared-actions';
import { runExamples } from './examples';
import { createDefaultLibrary } from './library';
import { parseOutline } from './outline';
import { vocabFrom } from './phrases';
import { AMOUNT_BOARD, ANY_PLAYER_BOARD, CARD_PICK_GAME, MARK_BOARD, PICK_BOARD, TINY_BOARD_HEAD, TURN_GAME, fixtureBoardGame, vocabFor } from './testing';
import { COACH_GAME, CREW_GAME, WORKED_GAME } from './testing';

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
/** The same in a phase where everyone acts at once, whose rules about no one in particular have no player (R1.1). */
const atOnceRules = (...lines: string[]) => withPhase(['Phase: main', '  Everyone acts at once.', ...lines].join('\n'));

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
    expect(messages(atOnceRules('  When their hand is empty:', '    Shuffle the deck.'))).toEqual([
      [17, '“their hand is empty” only makes sense in a rule about a player\'s move.'],
    ]);
    expect(messages(atOnceRules('  When this phase starts:', '    Shuffle their hand.'))).toEqual([
      [18, '“Shuffle their hand” only makes sense in a rule about a player\'s move.'],
    ]);
    expect(messages(atOnceRules('  When their hand is empty, go to main.'))).toEqual([
      [17, '“their hand is empty” only makes sense in a rule about a player\'s move.'],
    ]);
    expect(messages(atOnceRules('  A player may play a card from their hand to the deck.', '    Only if their hand is empty.', '    Then:', '      Shuffle their hand.'))).toEqual([]);
    expect(messages(atOnceRules('  When the deck is empty:', '    Only if their hand is empty.', '    Shuffle the deck.'))).toEqual([
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
    const expected = 'I don\'t understand this line in a phase. Phase lines start with Hint:, A player may…, Any player may…, When…, After a player…, Players take turns or Everyone acts at once.';
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
    const phase = compilePhase(parseOutline(text).roots[0], { library: lib, vocab, gameName: 'Tiny', inMove: false, player: false, space: false, card: false, drawn: false, amount: false, picked: false, diagnostics });
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
  const phase = (lines: string[], head = TINY_BOARD_HEAD) => compileGame(`${head}\n${lines.map((l) => `  ${l}`).join('\n')}`, lib);
  const errorsOf = (lines: string[], head = TINY_BOARD_HEAD) =>
    phase(lines, head).diagnostics.filter((d) => d.severity === 'error').map((d) => [d.line, d.message]);
  /** The board head with a phase where everyone acts at once, whose rules about no one in particular have no player (R1.1). */
  const AT_ONCE_HEAD = TINY_BOARD_HEAD.replace('  Players take turns.', '  Everyone acts at once.');
  const TURN_ACTIONS = ['A player may roll the dice.', 'A player may end their turn.'];
  const NOT_UNDERSTOOD = "I don't understand this line in a phase. Phase lines start with Hint:, A player may…, Any player may…, When…, After a player…, Players take turns or Everyone acts at once.";
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
  it('takes an amount with the counter named, and says how to put it when another counter is named', () => {
    const fee = (counter: string) => [
      '  A player may pay a fee.', '    Then:', `      They pay 50 ${counter}.`, '',
      'Example: paying the fee', '  When p0 pays a fee', '  Then p0 has 1450 money',
    ].join('\n');
    const both = (text: string) => compileGame(text.replace('  Players pay with money.', '  Each player has 5 tokens that everyone can see.\n  Players pay with money.'), lib);
    const ok = both(`${TINY_BOARD_HEAD}\n${fee('money')}`);
    expect(ok.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(runExamples(ok.game!, lib)).toEqual([expect.objectContaining({ status: 'pass' })]);
    const wrong = both(`${TINY_BOARD_HEAD}\n${fee('tokens')}`);
    expect(runExamples(wrong.game!, lib)).toEqual([expect.objectContaining({ status: 'fail', message: expect.stringContaining('Players pay with money, so say “They pay 50 money.”') })]);
    // With nothing to pay with, the amount is refused as it is without the counter.
    const none = compileGame(`${TINY_BOARD_HEAD.replace('  Players pay with money.\n', '')}\n${fee('money')}`, lib);
    expect(none.diagnostics).toContainEqual(expect.objectContaining({ message: 'Say what players pay with, like “Players pay with coins.” under Board:.' }));
  });
  it('reads “they have not built a house this turn” as the button that picks a street to build on', () => {
    const lines = [
      '  A player may build a house on a street they own.', '    Only if they have not built a house this turn.', '    Then:', '      They pay 10.',
      '  A player may end their turn.', '    Only if they have built a house this turn.',
    ];
    const { game, diagnostics } = compileGame(`${TINY_BOARD_HEAD}\n${lines.join('\n')}`, lib);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const [build, end] = game!.phases[0].actions;
    expect(build.conditions[0].refs[0]).toMatchObject({ phrase: 'they have not {done} this turn', args: [['build a house on a street they own']] });
    expect(end.conditions[0].refs[0]).toMatchObject({ phrase: 'they have {done} this turn', args: [['build a house on a street they own']] });
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
  it('refuses a double in a game without exactly two dice, on the line that says it', () => {
    const withDice = (dice: string, lines: string[]) =>
      compileGame(`${TINY_BOARD_HEAD.replace('  There are two six-sided dice.', dice)}\n${lines.map((l) => `  ${l}`).join('\n')}`, lib)
        .diagnostics.filter((d) => d.severity === 'error').map((d) => [d.line, d.message]);
    const lines = ['A player may roll the dice.', '  Only if they rolled a double.', 'When a player has rolled 3 doubles this turn:', '  They are out.'];
    for (const dice of ['  There is one six-sided die.', '  There are three six-sided dice.']) {
      expect(withDice(dice, lines), dice).toEqual([[19, 'A double needs exactly two dice.'], [20, 'A double needs exactly two dice.']]);
    }
    expect(withDice('  There are two six-sided dice.', lines)).toEqual([]);
  });
  it('reports a line that lacks several things once, naming the first: a player, then a space, then something to pay with', () => {
    expect(errorsOf(['When one player is left:', '  They pay its price.'], AT_ONCE_HEAD)).toEqual([[19, NEEDS_PLAYER('They pay its price')]]);
    expect(errorsOf(['When a player has less than 0 money:', '  They pay its price.'])).toEqual([[19, NEEDS_SPACE('They pay its price')]]);
    expect(phase(['When one player is left:', '  They pay its price.'], AT_ONCE_HEAD).game).toBeUndefined();
  });
  it('gives conditions the player and the space of the rule they are in', () => {
    expect(errorsOf(['A player may buy the space they are on.', '  Only if no one owns it.'])).toEqual([]);
    expect(errorsOf(['When a player has less than 0 money:', '  Only if they have at least 10 money.'])).toEqual([]);
    expect(errorsOf(['When a player has less than 0 money:', '  Only if no one owns it.'])).toEqual([[19, NEEDS_SPACE('no one owns it')]]);
    expect(errorsOf(['When one player is left:', '  Only if they have at least 10 money.'], AT_ONCE_HEAD)).toEqual([[19, NEEDS_PLAYER('they have at least 10 money')]]);
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
  it('reads “rolled” as every roll button and a whole done-wording as one, while an After line still needs one button', () => {
    const buttons = [
      'A player may roll the dice.', 'A player may roll for a double.', 'A player may end their turn.',
      '  Only if they have rolled this turn.', '  Only if they have not rolled for a double this turn.',
    ];
    const { game, diagnostics } = phase(buttons);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(game!.phases[0].actions[2].conditions.map((g) => g.refs[0].args)).toEqual([[['roll the dice', 'roll for a double']], [['roll for a double']]]);
    expect(errorsOf([...buttons, 'After a player rolls, the turn passes to the left.'])).toEqual([
      [23, '“rolls” could be “roll the dice” or “roll for a double”; write the whole wording.'],
    ]);
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
  it('tells the designer to write “on a …” when a pick is said with another word, and makes no button of the line', () => {
    const lines: [line: string, written: string][] = [
      ['build a house on any street they own', 'on a street they own'],
      ['build a house on the street they own', 'on a street they own'],
      ['build a house on one of their streets', 'on a street they own'],
      ['build a house on one of the streets they own', 'on a street they own'],
      ['build a house on each street', 'on a street'],
      ['Build a House on Every Street', 'on a street'],
    ];
    for (const [line, written] of lines) {
      const built = phase([`A player may ${line}.`, '  Then:', '    It gets a house from the bank.']);
      expect(problems(built).map((d) => [d.line, d.message]), line).toEqual([[20, `Write “${written}” so the player picks one.`]]);
      expect(built.game, line).toBeUndefined();
    }
  });
  it('suggests no wording when the words after the pick are more than a kind of space, and still makes no button', () => {
    for (const line of ['build a house on any orange street they own', 'build a house on one of their orange streets', 'build a house on any street with houses']) {
      const built = phase([`A player may ${line}.`, '  Then:', '    It gets a house from the bank.']);
      expect(problems(built).map((d) => [d.line, d.message]), line).toEqual([[20, 'Write “on a …” so the player picks one.']]);
      expect(built.game, line).toBeUndefined();
    }
  });
  it('says nothing of a line whose last “on” names no kind of space, or picks nothing at all', () => {
    const lines = [
      'buy the space they are on', 'roll on doubles', 'carry on', 'build a house on the street they are on', 'stand on the space', 'lean on the rest of them',
    ];
    for (const line of lines) {
      const built = phase([`A player may ${line}.`]);
      expect(problems(built), line).toEqual([]);
      expect(built.game!.phases[0].actions[0], line).toMatchObject({ words: line, target: null });
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
      { library: lib, vocab, gameName: 'Tiny', inMove: false, player: false, space: false, card: false, drawn: false, amount: false, picked: false, diagnostics },
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
  it('refuses a second button that picks a space with the same words before “on”, and the same wording twice', () => {
    // Both would show “Build a house”, and an example could name neither of them.
    expect(errorsOf(['A player may build a house on a street they own.', 'A player may Build a House on a street.'])).toEqual([
      [21, 'Two rules in this phase say “A player may build a house on …”; give them different words.'],
    ]);
    const compiled = compilePhase(
      parseOutline('Phase: main\n  A player may build a house on a street they own.\n  A player may build a house on a street.').roots[0],
      { library: lib, vocab: vocabFrom({ maxPlayers: 2, phases: ['main'], board: fixtureBoardGame().board }), gameName: 'Tiny', inMove: false, player: false, space: false, card: false, drawn: false, amount: false, picked: false, diagnostics: [] },
    );
    expect(compiled.actions.map((a) => a.words)).toEqual(['build a house on a street they own']);
    expect(errorsOf(['A player may build a house on a street they own.', 'A player may Build a House on a Street they own.'])).toEqual([
      [21, 'Two rules in this phase say “A player may build a house on a street they own”.'],
    ]);
  });
  it('allows buttons that pick a space with different words before “on”, and refuses a button that picks nothing with the same label', () => {
    const lines = ['A player may build a house on a street they own.', 'A player may knock down a house on a street they own.', 'A player may build a house.'];
    // The third would show “Build a house” too, as the first does.
    expect(errorsOf(lines)).toEqual([[22, 'Two buttons in this phase would both read “Build a house”; give one of them other words.']]);
    const both = phase(lines.slice(0, 2));
    expect(problems(both)).toEqual([]);
    expect(both.game!.phases[0].actions.map((a) => [a.base, a.words])).toEqual([
      ['build a house', 'build a house on a street they own'], ['knock down a house', 'knock down a house on a street they own'],
    ]);
  });
});

describe('buttons that pick a space without “on”', () => {
  const ending = (button: string) => MARK_BOARD.replace('  A player may end their turn.', `  ${button}\n  A player may end their turn.`);

  it('picks with a target phrase after the verb: the words before it are the base and the label', () => {
    const { game, diagnostics } = compileGame(MARK_BOARD, lib);
    expect(diagnostics).toEqual([]);
    expect(game!.phases[0].actions.map((a) => [a.words, a.base, a.label, a.target?.text ?? null])).toEqual([
      ['mark a space they own', 'mark', 'Mark', 'a space they own'], ['end their turn', 'end their turn', 'End your turn', null],
    ]);
  });
  it('reads a kind of space after the verb as a pick too, and leaves words that read no target a plain button', () => {
    const seize = compileGame(ending('A player may seize a street.'), lib).game!.phases[0].actions[1];
    expect([seize.base, seize.label, seize.target?.text]).toEqual(['seize', 'Seize', 'a street']);
    const pass = compileGame(ending('A player may use a free pass.'), lib).game!.phases[0].actions[1];
    expect([pass.base, pass.label, pass.target]).toEqual(['use a free pass', 'Use a free pass', null]);
  });
  it('refuses a second button in the phase that would read the same label', () => {
    expect(messages(ending('A player may mark an amount.'))).toEqual([
      [23, 'Two buttons in this phase would both read “Mark”; give one of them other words.'],
    ]);
  });
  it('compares labels in any capitals, and reports the later line\'s own', () => {
    expect(messages(ending('A player may MARK a street.'))).toEqual([[23, 'Two buttons in this phase would both read “MARK”; give one of them other words.']]);
  });
  it('leaves the later of two buttons with one label out, as it does a repeated wording', () => {
    const diagnostics: Parameters<typeof compilePhase>[1]['diagnostics'] = [];
    const compiled = compilePhase(
      parseOutline('Phase: main\n  A player may mark a space they own.\n  A player may mark an amount.\n  A player may end their turn.').roots[0],
      { library: lib, vocab: vocabFrom({ maxPlayers: 2, phases: ['main'], board: fixtureBoardGame().board }), gameName: 'Tiny', inMove: false, player: false, space: false, card: false, drawn: false, amount: false, picked: false, diagnostics },
    );
    expect(diagnostics.map((d) => [d.line, d.message])).toEqual([[3, 'Two buttons in this phase would both read “Mark”; give one of them other words.']]);
    expect(compiled.actions.map((a) => a.words)).toEqual(['mark a space they own', 'end their turn']);
  });
  it('refuses a button that picks a space and ends in “an amount” at its own line, with or without “on”', () => {
    expect(messages(ending('A player may bid an amount on a street they own.'))).toEqual([
      [23, 'A button can\'t both pick a space and carry an amount: drop “an amount” or “on a street they own”.'],
    ]);
    expect(messages(ending('A player may raise an amount a space they own.'))).toEqual([
      [23, 'A button can\'t both pick a space and carry an amount: drop “an amount” or “a space they own”.'],
    ]);
  });
  it('lets an After line name the button by its whole wording', () => {
    const named = compileGame(MARK_BOARD.replace('After a player ends their turn,', 'After a player marks a space they own or ends their turn,'), lib);
    expect(named.diagnostics).toEqual([]);
    expect(named.game!.phases[0].after).toMatchObject({ moves: ['mark a space they own', 'end their turn'] });
  });
  it('still reports a pick said with “any”, since the words after the cut read no target', () => {
    expect(messages(ending('A player may mark a space on any street they own.'))).toEqual([
      [23, 'Write “on a street they own” so the player picks one.'],
    ]);
  });
  it('keeps a pick with “on” a pick of its own: two of them with one base are refused as before, and one without “on” is not one of them', () => {
    const phrase = (...buttons: string[]) => messages(ending(buttons.join('\n  ')));
    expect(phrase('A player may plant a flag on a street they own.', 'A player may plant a flag on a street.')).toEqual([
      [24, 'Two rules in this phase say “A player may plant a flag on …”; give them different words.'],
    ]);
    // Without “on” the base is the label's too, so it is the label that is shared.
    expect(phrase('A player may plant a street.', 'A player may plant a space they own.')).toEqual([
      [24, 'Two buttons in this phase would both read “Plant”; give one of them other words.'],
    ]);
  });
  it('reports the same wording twice as that, not as a shared label', () => {
    expect(messages(ending('A player may plant a street.\n  A player may plant a street.'))).toEqual([
      [24, 'Two rules in this phase say “A player may plant a street”.'],
    ]);
  });
});

describe('a pick without “on” whose words read no target', () => {
  /** MARK_BOARD with a flag players can have on line 16, and `button` on line 24, before ending a turn. */
  const RIVAL_BOARD = MARK_BOARD.replace('  Spaces can be marked.', '  Spaces can be marked.\n  Players can be the rival.');
  const withButton = (button: string) => RIVAL_BOARD.replace('  A player may end their turn.', `  ${button}\n    Then:\n      They own it.\n  A player may end their turn.`);
  const buttonsOf = (text: string) => compileGame(text, lib).game!.phases[0].actions.map((a) => a.words);

  it('is a pick that was meant: reported at the button line with the target phrase\'s own words, and no button at all', () => {
    const { game, diagnostics } = compileGame(withButton('A player may seize a space the rivel owns.'), lib);
    expect(diagnostics).toEqual([
      expect.objectContaining({ line: 24, kind: 'invalid', message: 'There is no player fact called “the rivel”.', suggestions: ['the rival'] }),
    ]);
    expect(game).toBeUndefined();
    // The phase itself makes no button of it, not even a plain one that would act on the presser's own space.
    const diagnosed: Parameters<typeof compilePhase>[1]['diagnostics'] = [];
    const vocab = vocabFrom({
      maxPlayers: 2, phases: ['main'], board: fixtureBoardGame().board, facts: [{ name: 'the rival', on: 'player', kind: 'flag' }],
    });
    const built = compilePhase(
      parseOutline('Phase: main\n  A player may seize a space the rivel owns.\n  A player may end their turn.').roots[0],
      { library: lib, vocab, gameName: 'Tiny', inMove: false, player: false, space: false, card: false, drawn: false, amount: false, picked: false, diagnostics: diagnosed },
    );
    expect(diagnosed.map((d) => [d.line, d.message])).toEqual([[2, 'There is no player fact called “the rivel”.']]);
    expect(built.actions.map((a) => a.words)).toEqual(['end their turn']);
  });
  it('says the same as the pick written with “on” does', () => {
    const said = (button: string) => compileGame(withButton(button), lib).diagnostics.map((d) => [d.line, d.kind, d.message, d.suggestions]);
    expect(said('A player may seize a space the rivel owns.')).toEqual(said('A player may seize on a space the rivel owns.'));
    expect(said('A player may seize a street they onw.')).toEqual(said('A player may seize on a street they onw.'));
  });
  it('is meant when its words start with “space” or a kind of space the board has, in any capitals', () => {
    for (const [button, rest] of [
      ['A player may seize a space they onw.', 'a space they onw'], ['A player may seize a street they onw.', 'a street they onw'],
      ['A player may seize a Street they onw.', 'a Street they onw'], ['A player may seize an orange street they own.', 'an orange street they own'],
      ['A player may seize a tax space twice.', 'a tax space twice'],
    ]) {
      const { game, diagnostics } = compileGame(withButton(button), lib);
      expect(diagnostics, button).toEqual([expect.objectContaining({ line: 24, kind: 'unknown-phrase', message: `“${rest}” isn't in the phrase library yet.` })]);
      // A line nobody has written a phrase for still lets the game be read, but makes no button.
      expect(game!.phases[0].actions.map((a) => a.words), button).toEqual(['mark a space they own', 'end their turn']);
    }
    expect(compileGame(withButton('A player may seize a space they onw.'), lib).diagnostics[0].suggestions).toContain('a space they own');
  });
  it('leaves a button a plain one when the words after its “a” or “an” start with no kind of space', () => {
    // A board with Jail and Go To Jail beside Go, so that neither “Get Out Of Jail Free” nor “leave jail” is read as one.
    const board = TINY_BOARD_HEAD.replace(
      '    | Rose Lane  | street | orange | 180   | 14   |     |',
      '    | Rose Lane  | street | orange | 180   | 14   |     |\n    | Jail       | jail   |        |       |      |     |\n    | Go To Jail | go to jail |    |       |      |     |',
    );
    const buttons = [
      'use a Get Out Of Jail Free', 'bid an amount', 'offer to pay an amount', 'roll for a double', 'pay to leave jail', 'build a house on a street they own',
      'use a free pass', 'trade with another player',
    ];
    const { game, diagnostics } = compileGame(`${board}\n${buttons.map((b) => `  A player may ${b}.`).join('\n')}`, lib);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(game!.phases[0].actions.map((a) => [a.words, a.base, a.label, a.target?.text ?? null, a.amount, a.picksPlayer])).toEqual([
      ['use a get out of jail free', 'use a get out of jail free', 'Use a Get Out Of Jail Free', null, false, false],
      ['bid an amount', 'bid', 'Bid', null, true, false],
      ['offer to pay an amount', 'offer to pay', 'Offer to pay', null, true, false],
      ['roll for a double', 'roll for a double', 'Roll for a double', null, false, false],
      ['pay to leave jail', 'pay to leave jail', 'Pay to leave jail', null, false, false],
      ['build a house on a street they own', 'build a house', 'Build a house', 'a street they own', false, false],
      ['use a free pass', 'use a free pass', 'Use a free pass', null, false, false],
      ['trade with another player', 'trade with', 'Trade with another player', null, false, true],
    ]);
  });
  it('leaves a button a plain one when its words only start like a pick and the library has nothing to say about them as a target', () => {
    // Kinds tax, station, utility, jail and street, and the colours brown, orange and red: each of the buttons below has a " a …" tail that begins with one.
    const board = TINY_BOARD_HEAD.replace(
      '    | Rose Lane  | street | orange | 180   | 14   |     |',
      [
        '    | Rose Lane  | street | orange | 180   | 14   |     |', '    | Market Sq  | street | red    | 220   | 18   |     |',
        '    | North Stn  | station |       | 200   |      |     |', '    | Power Co   | utility |       | 150   |      |     |',
        '    | Jail       | jail   |        |       |      |     |',
      ].join('\n'),
    );
    const buttons = ['pay a tax bill', 'use a jail pass', 'collect a station bonus', 'claim a red bonus', 'pay a street fine', 'pay a utility fee'];
    const end = '\nEnd:\n  The game ends when one player is left.\n  That player wins.';
    const { game, diagnostics } = compileGame(`${board}\n${buttons.map((b) => `  A player may ${b}.`).join('\n')}\n${end}`, lib);
    expect(diagnostics).toEqual([]);
    expect(game!.phases[0].actions.map((a) => [a.words, a.base, a.label, a.target?.text ?? null])).toEqual([
      ['pay a tax bill', 'pay a tax bill', 'Pay a tax bill', null],
      ['use a jail pass', 'use a jail pass', 'Use a jail pass', null],
      ['collect a station bonus', 'collect a station bonus', 'Collect a station bonus', null],
      ['claim a red bonus', 'claim a red bonus', 'Claim a red bonus', null],
      ['pay a street fine', 'pay a street fine', 'Pay a street fine', null],
      ['pay a utility fee', 'pay a utility fee', 'Pay a utility fee', null],
    ]);
  });
  it('still reports a pick whose words the library is close to reading as a target', () => {
    for (const rest of ['a space tehy own', 'a space they onw', 'a street they onw', 'an orange street they onw', 'a space the trade partnr owns']) {
      // A plain button would be read with no diagnostics at all, so one error at the button's line is a pick that was meant.
      expect(compileGame(withButton(`A player may seize ${rest}.`), lib).diagnostics.map((d) => [d.line, d.severity]), rest).toEqual([[24, 'error']]);
    }
  });
  it('still tells the designer to write “on a …” for a pick said with another word', () => {
    expect(messages(withButton('A player may seize a space on any street they own.'))).toEqual([[24, 'Write “on a street they own” so the player picks one.']]);
    expect(buttonsOf(withButton('A player may seize a street they own.'))).toEqual(['mark a space they own', 'seize a street they own', 'end their turn']);
  });
});

describe('rules about a card, and the other player', () => {
  /**
   * A two-player game of creatures with the phase's own lines below `Players take turns.` (line 18), or `Everyone acts at once.` with
   * `atOnce`, so the first of them is line 19.
   */
  const creatures = (phase: string[], { players = '2', setup = [] as string[], atOnce = false } = {}) => [
    'Game: Creatures', `Players: ${players}`, '', 'Cards:', '  A deck called creatures, starting in the deck:', '    | name   | health | copies |',
    '    | Knight | 3      | 2      |', '    | Viper  | 1      | 2      |', '  Cards can be poisoned.', '',
    'Table:', '  The deck is a pile in the center that no one can see.', '  The discard pile is a pile in the center that everyone can see.',
    '  Each player has a hand that only they can see.', '  Each player has a camp that everyone can see.', '',
    ...(setup.length > 0 ? ['Setup:', ...setup.map((l) => `  ${l}`), ''] : []),
    'Phase: playing', atOnce ? '  Everyone acts at once.' : '  Players take turns.', ...phase.map((l) => `  ${l}`),
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
    // Where players take turns the rule is about the player whose turn it is (R1.1); where everyone acts at once it is about no one.
    expect(errorsOf(['When the deck is empty:', '  Every card in the other player\'s camp is poisoned.'], { atOnce: true })).toEqual([
      [20, '“Every card in the other player\'s camp is poisoned” only makes sense in a rule about a player\'s move.'],
    ]);
  });
});

describe('buttons any player may press', () => {
  const found = (text: string) => compileGame(text, lib).diagnostics.map((d) => [d.line, d.message]);

  it('are told apart from the other buttons, and keep their own wording', () => {
    const { game, diagnostics } = compileGame(ANY_PLAYER_BOARD, lib);
    expect(diagnostics).toEqual([]);
    expect(game!.phases[0].actions.map((a) => [a.label, a.anyone])).toEqual([
      ['Roll the dice', false], ['End your turn', false], ['Wave', true], ['Plant a flag', true],
    ]);
  });
  it('can be written in any capitals', () => {
    const shouted = ANY_PLAYER_BOARD.replace('  Any player may wave.', '  ANY PLAYER MAY wave.');
    expect(compileGame(shouted, lib).game!.phases[0].actions.map((a) => a.anyone)).toEqual([false, false, true, true]);
  });
  it('can not be named by an After line, since they never pass the turn', () => {
    expect(found(ANY_PLAYER_BOARD.replace('After a player ends their turn,', 'After a player ends their turn or waves,')))
      .toContainEqual([34, '“waves” names a button any player may press at any time, so it can\'t pass the turn.']);
  });
  it('can not be named by a done-wording, since they are never part of a turn', () => {
    const waved = ANY_PLAYER_BOARD.replace('  A player may end their turn.\n    Only if they have rolled this turn.', '  A player may end their turn.\n    Only if they have waved this turn.');
    expect(found(waved)).toContainEqual([24, '“waved” names a button any player may press at any time, which is never part of a turn.']);
  });
  it('still read a done-wording that names a button of the turn as well, as that button alone', () => {
    const both = ANY_PLAYER_BOARD
      .replace('  Any player may wave.', '  A player may wave to the crowd.\n  Any player may wave.')
      .replace('Only if they have rolled this turn.', 'Only if they have waved this turn.');
    // “waved” is the participle of both buttons; the one anyone may press is no part of a turn, so only the other is meant.
    expect(found(both).filter(([line]) => line === 24)).toEqual([]);
    const end = compileGame(both, lib).game!.phases[0].actions.find((a) => a.words === 'end their turn')!;
    expect(end.conditions[0].refs[0].args).toEqual([['wave to the crowd']]);
  });
  describe('written both ways', () => {
    /** The errors alone: nothing leads to the second phase, which is only a warning here. */
    const errors = (text: string) => compileGame(text, lib).diagnostics.filter((d) => d.severity === 'error').map((d) => [d.line, d.message]);
    /** ANY_PLAYER_BOARD with a second phase that also has a button called “wave”; the second phase's button is on line 38. */
    const later = (opening: string) => ANY_PLAYER_BOARD.replace(
      '\n\nEnd:', `\n\nPhase: later\n  Players take turns.\n  ${opening} wave.\n    Then:\n      They get 5 money.\n\nEnd:`,
    );
    it('is told when a later phase opens a button with “A player may” that another phase opens with “Any player may”', () => {
      expect(errors(later('A player may'))).toEqual([
        [38, '“wave” is a button any player may press in another phase; use the same opening in both.'],
      ]);
    });
    it('is told when a later phase opens a button with “Any player may” that another phase opens with “A player may”', () => {
      const first = later('Any player may').replace('  Any player may wave.', '  A player may wave.');
      expect(errors(first)).toEqual([[38, '“wave” is written “A player may …” in another phase; use the same opening in both.']]);
    });
    it('is fine when both phases open it the same way', () => {
      expect(errors(later('Any player may'))).toEqual([]);
    });
  });
  it('are never card moves: “Any player may take a card …” is a move the phase can not read', () => {
    // With no cost line it can only be a button, so it is told how to be one (final review m2).
    const ONLY_A_BUTTON = '“Any player may …” can only be a button: add a cost line under it, like “It costs 1 action.”, or write '
      + '“Any player may take a card in the draw pile.” with “Then: Move it to their hand.” under it.';
    const lines = ANY_PLAYER_BOARD.split('\n');
    lines.splice(24, 0, '  Any player may take a card from the draw pile to their hand.');
    expect(found(lines.join('\n'))).toContainEqual([25, ONLY_A_BUTTON]);
  });
});

describe('buttons that carry an amount', () => {
  it('refuses a phrase that reads the amount outside a button whose wording ends in “an amount”', () => {
    const outside = AMOUNT_BOARD.replace(
      '    Only if they have rolled this turn.\n    Then:\n      They pay the pot.',
      '    Only if the amount is more than the pot.\n    Then:\n      They pay the pot.',
    );
    expect(outside).not.toBe(AMOUNT_BOARD);
    expect(compileGame(outside, lib).diagnostics.map((d) => [d.line, d.message])).toContainEqual(
      [31, '“the amount is more than the pot” only makes sense in a button whose wording ends in “an amount”, like “A player may give an amount.”'],
    );
  });
  it('says on the button line, and only there, that a button cannot both pick a space and carry an amount', () => {
    const both = [
      '  A player may bid an amount on a street they own.', '    Only if the amount is more than the pot.', '    Then:', '      The pot is the amount.',
    ].join('\n');
    const text = AMOUNT_BOARD.replace('  A player may end their turn.', `${both}\n  A player may end their turn.`);
    const line = text.split('\n').indexOf('  A player may bid an amount on a street they own.') + 1;
    // Its lines that read the amount are not blamed too: the button line says what to change.
    expect(compileGame(text, lib).diagnostics.filter((d) => d.severity === 'error').map((d) => [d.line, d.message])).toEqual([
      [line, 'A button can\'t both pick a space and carry an amount: drop “an amount” or “on a street they own”.'],
    ]);
  });
  it('leaves a button that picks a space and says “an amount” earlier in its words a plain button that picks a space', () => {
    const built = compileGame(AMOUNT_BOARD.replace('  A player may end their turn.', '  A player may plant an amount of seed on a street they own.\n  A player may end their turn.'), lib);
    expect(built.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(built.game!.phases[0].actions.find((a) => a.verb === 'plant')).toMatchObject({
      amount: false, base: 'plant an amount of seed', target: { kind: 'target' },
    });
  });
  it('reads “an amount” in any capitals, and leaves the designer\'s capitals on the label', () => {
    const shouted = compileGame(AMOUNT_BOARD.replace('  A player may raise an amount.', '  A player may Raise An Amount.'), lib);
    expect(shouted.diagnostics).toEqual([]);
    expect(shouted.game!.phases[0].actions[1]).toMatchObject({ words: 'raise an amount', base: 'raise', label: 'Raise', amount: true });
  });
  it('lets a button of the turn and one any player may press carry an amount', () => {
    const anyone = compileGame(AMOUNT_BOARD.replace('  A player may raise an amount.', '  Any player may raise an amount.'), lib);
    expect(anyone.diagnostics).toEqual([]);
    expect(anyone.game!.phases[0].actions[1]).toMatchObject({ anyone: true, amount: true });
  });
});

describe('buttons that pick another player', () => {
  it('refuses “that player” outside a button whose wording ends in “another player”', () => {
    const outside = PICK_BOARD.replace(
      '  A player may end their turn.\n    Only if they have rolled this turn.',
      '  A player may end their turn.\n    Only if they have rolled this turn.\n    Then:\n      That player is the rival.',
    );
    expect(outside).not.toBe(PICK_BOARD);
    expect(compileGame(outside, lib).diagnostics.map((d) => [d.line, d.message])).toContainEqual(
      [31, '“That player is the rival” only makes sense in a button whose wording ends in “another player”, like “A player may challenge another player.”'],
    );
  });
  it('picks a player only at the end of the wording', () => {
    const built = compileGame(PICK_BOARD.replace('  A player may end their turn.', '  A player may challenge another player twice.\n  A player may end their turn.'), lib);
    expect(built.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(built.game!.phases[0].actions.find((a) => a.verb === 'challenge' && a.words.endsWith('twice'))).toMatchObject({
      picksPlayer: false, words: 'challenge another player twice', base: 'challenge another player twice', label: 'Challenge another player twice',
    });
  });
  it('leaves “another player” in the words and out of the base, and reads it in any capitals', () => {
    const shouted = compileGame(PICK_BOARD.replace('  A player may challenge another player.', '  A player may Trade With Another Player.'), lib);
    expect(shouted.game!.phases[0].actions[1]).toMatchObject({
      words: 'trade with another player', base: 'trade with', label: 'Trade With Another Player', picksPlayer: true,
    });
  });
  it('lets a button of the turn and one any player may press pick a player', () => {
    const anyone = compileGame(PICK_BOARD.replace('  A player may challenge another player.', '  Any player may challenge another player.'), lib);
    expect(anyone.diagnostics).toEqual([]);
    expect(anyone.game!.phases[0].actions[1]).toMatchObject({ anyone: true, picksPlayer: true });
  });
  it('does not make a button that picks a space, or one that carries an amount, a button that picks a player', () => {
    // Said with no Then lines, since “That player” belongs to the buttons that do pick one.
    const without = (wording: string) => PICK_BOARD.replace(
      '  A player may challenge another player.\n    Only if they have rolled this turn.\n    Then:\n      That player is the rival.', `  A player may ${wording}.`,
    );
    const space = compileGame(without('challenge another player on a street they own'), lib);
    expect(space.diagnostics).toEqual([]);
    expect(space.game!.phases[0].actions[1]).toMatchObject({ picksPlayer: false, base: 'challenge another player' });
    const amount = compileGame(without('challenge another player an amount'), lib);
    expect(amount.diagnostics).toEqual([]);
    expect(amount.game!.phases[0].actions[1]).toMatchObject({ picksPlayer: false, amount: true, base: 'challenge another player' });
  });
  it('keeps two buttons that read alike apart, as it does for any other', () => {
    const twice = PICK_BOARD.replace('  A player may end their turn.', '  A player may challenge another player.\n  A player may end their turn.');
    expect(compileGame(twice, lib).diagnostics.map((d) => d.message)).toContain('Two rules in this phase say “A player may challenge another player”.');
  });
});

describe('“they” in a phase where players take turns', () => {
  const { game, diagnostics } = compileGame(TURN_GAME, lib);
  const phaseOf = (id: string) => game!.phases.find((p) => p.id === id)!;
  /** The 1-based number of `line` in `text`. */
  const at = (text: string, line: string) => text.split('\n').indexOf(line) + 1;
  const NEEDS_PLAYER = (line: string) => `“${line}” only makes sense in a rule about a player, such as a move, an action or a “When a player …” rule.`;

  it('reads the start lines, the “go to” condition and a rule about no one in particular as about the player whose turn it is', () => {
    expect(diagnostics).toEqual([]);
    expect(phaseOf('working').goTo!.when).toMatchObject({ kind: 'condition', phrase: 'they have less than {int} {counter}', args: [1, 'moves'] });
    expect(phaseOf('tidying').onEnter).toEqual([expect.objectContaining({ kind: 'effect', args: [1, 'coins'] })]);
    expect(phaseOf('tidying').triggers[0].when).toMatchObject({ kind: 'condition', phrase: '{zone} has fewer than {int} cards' });
  });
  it('reads them about no one in a phase where everyone acts at once', () => {
    const atOnce = TURN_GAME.replace('Phase: tidying\n', 'Phase: tidying\n  Everyone acts at once.\n');
    expect(atOnce).not.toBe(TURN_GAME);
    expect(messages(atOnce)).toEqual([
      [at(atOnce, '    They get 1 coin.'), NEEDS_PLAYER('They get 1 coin')],
      [at(atOnce, '  When their list has fewer than 2 cards:'), '“their list has fewer than 2 cards” only makes sense in a rule about a player\'s move.'],
    ]);
  });
});

describe('a button that costs part of the turn budget', () => {
  const WORK = '  A player may work.\n    Only if they have at least 1 move.\n    Then:\n      They spend 1 move.\n';
  const COSTED = TURN_GAME.replace(WORK, '  A player may work.\n    It costs 1 move.\n    Then:\n');
  /** The 1-based number of `line` in `text`. */
  const at = (text: string, line: string) => text.split('\n').indexOf(line) + 1;
  const actionsOf = (text: string) => compileGame(text, lib).game!.phases.find((p) => p.id === 'working')!.actions;
  const workOf = (text: string) => actionsOf(text).find((a) => a.words === 'work')!;
  const notABudget = (counter: string) =>
    `A button can only cost a number each player has each turn, like “Each player has 3 actions each turn.”; ${counter} isn't one.`;
  const COST_SHAPE = 'Write a cost as “It costs 1 action.”: a whole number, then a number each player has each turn.';
  const TWO_COSTS = 'A button can have only one “It costs …” line.';

  it('is read from the fixture the tests change', () => expect(TURN_GAME).toContain(WORK));
  it('reads the cost, and leaves it off a button without one', () => {
    expect(compileGame(COSTED, lib).diagnostics).toEqual([]);
    const work = workOf(COSTED);
    const stop = actionsOf(COSTED).find((a) => a.words === 'stop')!;
    expect(work.cost).toEqual({ amount: 1, counter: 'moves', line: at(COSTED, '    It costs 1 move.') });
    expect('cost' in stop).toBe(false);
    expect([hasCost(work), hasCost(stop)]).toEqual([true, false]);
  });
  it('reads the cost anywhere under the button', () => {
    const below = COSTED.replace('    It costs 1 move.\n    Then:\n      They get 1 coin.\n', '    Then:\n      They get 1 coin.\n    It costs 1 move.\n');
    expect(below).not.toBe(COSTED);
    expect(compileGame(below, lib).diagnostics).toEqual([]);
    expect(workOf(below).cost).toMatchObject({ amount: 1, counter: 'moves', line: at(below, '    It costs 1 move.') });
  });
  it('reads any whole number, and a cost of 0 still makes the button an action', () => {
    expect(workOf(COSTED.replace('It costs 1 move.', 'It costs 2 moves.')).cost).toMatchObject({ amount: 2, counter: 'moves' });
    const free = workOf(COSTED.replace('It costs 1 move.', 'It costs 0 moves.'));
    expect(free.cost).toMatchObject({ amount: 0, counter: 'moves' });
    expect(hasCost(free)).toBe(true);
  });

  describe('problems', () => {
    /** COSTED with the cost line said another way: one error, on that line, and no game. */
    const refused = (cost: string) => {
      const text = COSTED.replace('    It costs 1 move.', cost);
      expect(text).not.toBe(COSTED);
      return { errors: messages(text), game: compileGame(text, lib).game, line: at(text, cost) };
    };
    it('refuses a counter that is no number each player has each turn', () => {
      const { errors, game, line } = refused('    It costs 1 coin.');
      expect(errors).toEqual([[line, notABudget('coins')]]);
      expect(game).toBeUndefined();
    });
    it('explains a counter the game never declared, with the closest names', () => {
      const { errors, game, line } = refused('    It costs 1 mvoe.');
      expect(errors).toEqual([[line, 'There is no counter called “mvoe”.']]);
      expect(compileGame(COSTED.replace('    It costs 1 move.', '    It costs 1 mvoe.'), lib).diagnostics[0].suggestions).toContain('moves');
      expect(game).toBeUndefined();
    });
    it('refuses a cost that is not a whole number and a counter', () => {
      const { errors, game, line } = refused('    It costs one move.');
      expect(errors).toEqual([[line, COST_SHAPE]]);
      expect(game).toBeUndefined();
      expect(refused('    It costs move.').errors).toEqual([[expect.any(Number), COST_SHAPE]]);
      expect(refused('    It costs 1.5 moves.').errors).toEqual([[expect.any(Number), COST_SHAPE]]);
    });
    it('refuses a second cost line, on the second line', () => {
      const text = COSTED.replace('    It costs 1 move.', '    It costs 1 move.\n    It costs 1 move.');
      const second = text.split('\n').lastIndexOf('    It costs 1 move.') + 1;
      expect(second).toBe(at(text, '    It costs 1 move.') + 1);
      expect(messages(text)).toEqual([[second, TWO_COSTS]]);
      expect(compileGame(text, lib).game).toBeUndefined();
    });
    it('says a cost line goes right under a button, when it is under Then: or under a When rule', () => {
      const MISPLACED = '“It costs …” goes right under a button, beside its Only if lines.';
      const COST = '      It costs 1 move.';
      const inThen = COSTED.replace('    It costs 1 move.\n    Then:\n', `    Then:\n${COST}\n`);
      expect(inThen).not.toBe(COSTED);
      expect(messages(inThen)).toEqual([[at(inThen, COST), MISPLACED]]);
      expect(compileGame(inThen, lib).game).toBeUndefined();
      const RULE = '  When their list has fewer than 2 cards:';
      const inRule = COSTED.replace(`${RULE}\n`, `${RULE}\n    It costs 1 move.\n`);
      expect(inRule).not.toBe(COSTED);
      expect(messages(inRule)).toEqual([[at(inRule, RULE) + 1, MISPLACED]]);
      const STARTS = '  When this phase starts:';
      const inStart = COSTED.replace(`${STARTS}\n`, `${STARTS}\n    It costs 1 move.\n`);
      expect(inStart).not.toBe(COSTED);
      expect(messages(inStart)).toEqual([[at(inStart, STARTS) + 1, MISPLACED]]);
    });
  });
});

describe('buttons that pick a card', () => {
  const BUY_LINE = '  A player may buy a card from the shop to their stash.';
  const BUY_COST = `${BUY_LINE}\n    It costs 1 move.\n`;
  const SELL_LINE = '  A player may sell a card in their stash.';
  const ONE_ZONE = 'A move goes from one zone to one zone.';
  /** The 1-based number of `line` in `text`. */
  const at = (text: string, line: string) => text.split('\n').indexOf(line) + 1;
  const phaseOf = (text: string) => compileGame(text, lib).game!.phases[0];
  /** `text` with `line` put in after `after`, which it must hold. */
  const adding = (text: string, after: string, line: string) => {
    const added = text.replace(`${after}\n`, `${after}\n${line}\n`);
    expect(added).not.toBe(text);
    return added;
  };
  /** The shopping phase of `text` read on its own, against the words of CARD_PICK_GAME, so a line with a problem still leaves a phase to look at. */
  const phaseAlone = (text: string) => {
    const diagnostics: Parameters<typeof compilePhase>[1]['diagnostics'] = [];
    const node = parseOutline(text).roots.find((root) => root.text.startsWith('Phase:'))!;
    const vocab = vocabFor(compileGame(CARD_PICK_GAME, lib).game!);
    const ctx = { library: lib, vocab, gameName: 'Gem Picks', inMove: false, player: false, space: false, card: false, drawn: false, amount: false, picked: false, diagnostics };
    return compilePhase(node, ctx);
  };

  it('reads a button that picks a card from one zone to another, and one that picks a card in a zone', () => {
    const { game, diagnostics } = compileGame(CARD_PICK_GAME, lib);
    expect(diagnostics).toEqual([]);
    const phase = game!.phases[0];
    expect(phase.moves).toEqual([]);
    const buy = phase.actions.find((a) => a.base === 'buy')!;
    expect(buy).toMatchObject({
      words: 'buy a card from the shop to their stash', base: 'buy', label: 'Buy a card from the shop to your stash', target: null, anyone: false,
      amount: false, picksPlayer: false, line: at(CARD_PICK_GAME, BUY_LINE),
    });
    expect(buy.pick).toEqual({ some: false, from: { shared: 'shop' }, fromText: 'the shop', to: { of: { who: 'actor' }, zone: 'stash' }, onto: null, ontoText: null });
    expect(buy.cost).toMatchObject({ amount: 1, counter: 'moves' });
    const sell = phase.actions.find((a) => a.base === 'sell')!;
    expect(sell).toMatchObject({ words: 'sell a card in their stash', label: 'Sell a card in your stash' });
    expect(sell.pick).toMatchObject({ from: { of: { who: 'actor' }, zone: 'stash' }, fromText: 'their stash', to: null });
    expect('cost' in sell).toBe(false);
    expect('pick' in phase.actions.find((a) => a.words === 'stop')!).toBe(false);
  });

  it('R1: reads a card line with no cost line under it as a card move, as before', () => {
    const uncosted = CARD_PICK_GAME.replace(BUY_COST, `${BUY_LINE}\n`);
    expect(uncosted).not.toBe(CARD_PICK_GAME);
    expect(compileGame(uncosted, lib).diagnostics).toEqual([]);
    expect(phaseOf(uncosted).moves.map((m) => m.verb)).toEqual(['buy']);
    expect(phaseOf(uncosted).actions.some((a) => a.base === 'buy')).toBe(false);
  });

  describe('“it” and “the card” in a pick', () => {
    it('read the picked card in its lines', () => {
      const shining = adding(adding(CARD_PICK_GAME, '    | Opal | 1    | 4      |', '  Cards can have shine.'), '      Move it to the pile.', '      It gains 1 shine.');
      expect(compileGame(shining, lib).diagnostics).toEqual([]);
      expect(compileGame(adding(CARD_PICK_GAME, SELL_LINE, '    Only if the card is not a Ruby.'), lib).diagnostics).toEqual([]);
    });
    it('are no card in a button that picks none', () => {
      const text = adding(CARD_PICK_GAME, '      Their moves go back to 0.', '      Move it to the pile.');
      // Sell has the same line; the one under stop is the last.
      const line = text.split('\n').lastIndexOf('      Move it to the pile.') + 1;
      expect(line).toBe(at(text, '      Their moves go back to 0.') + 1);
      expect(messages(text)).toEqual([[line, '“Move it to the pile” only makes sense in a rule about a card, such as “When a card …”.']]);
    });
  });

  describe('problems', () => {
    /** CARD_PICK_GAME with the sell line written as `line`: the errors, with the line they are on, and the words of the buttons it makes. */
    const sellAs = (line: string) => {
      const text = CARD_PICK_GAME.replace(SELL_LINE, line);
      expect(text).not.toBe(CARD_PICK_GAME);
      return { errors: messages(text), line: at(text, line), buttons: phaseAlone(text).actions.map((a) => a.words) };
    };
    /** The phase's buttons but sell, which a sell line with a problem leaves as they are. */
    const NOT_SELL = [
      'buy a card from the shop to their stash', 'show a card from their stash to a card in their case', 'trade some cards from their stash to the shop', 'stop',
    ];
    it('names a zone it cannot read as a card move does', () => {
      const moved = CARD_PICK_GAME.replace(BUY_COST, '  A player may buy a card from the shop to their stsh.\n');
      const asMove = messages(moved);
      expect(asMove).toEqual([[at(moved, '  A player may buy a card from the shop to their stsh.'), expect.any(String)]]);
      const { errors, line, buttons } = sellAs('  A player may sell a card in their stsh.');
      expect(errors).toEqual([[line, asMove[0][1]]]);
      expect(buttons).toEqual(NOT_SELL);
    });
    it('picks from one zone only', () => {
      const { errors, line, buttons } = sellAs('  A player may sell a card in each stash.');
      expect(errors).toEqual([[line, ONE_ZONE]]);
      expect(buttons).toEqual(NOT_SELL);
    });
    it('says how to write a card line that is neither a card move nor a pick', () => {
      const { errors, line, buttons } = sellAs('  A player may sell a card from their stash.');
      expect(errors).toEqual([[line, MALFORMED_MOVE]]);
      expect(buttons).toEqual(NOT_SELL);
    });
    it('says a card line any player may press with no cost line can only be a button, and how to write it', () => {
      const { errors, line, buttons } = sellAs('  Any player may sell a card from their stash to the shop.');
      expect(errors).toEqual([[line, '“Any player may …” can only be a button: add a cost line under it, like “It costs 1 action.”, or write '
        + '“Any player may sell a card in their stash.” with “Then: Move it to the shop.” under it.']]);
      expect(buttons).toEqual(NOT_SELL);
    });
  });

  it('can not be a card move in one phase and a button that picks a card in another, on the later line', () => {
    /** `text` with a second phase holding `lines`: the errors alone, since nothing leads to that phase. */
    const later = (text: string, lines: string[]) => {
      const two = text.replace('\n\nEnd:', `\n\nPhase: later\n  Players take turns.\n${lines.join('\n')}\n\nEnd:`);
      expect(two).not.toBe(text);
      const errors = compileGame(two, lib).diagnostics.filter((d) => d.severity === 'error').map((d) => [d.line, d.message]);
      return { errors, line: two.split('\n').lastIndexOf(BUY_LINE) + 1 };
    };
    const asButton = later(CARD_PICK_GAME, [BUY_LINE]);
    expect(asButton.errors).toEqual([[asButton.line, '“buy” is a button in another phase, so it can\'t also be a card move. Start one with another word.']]);
    const asMove = later(CARD_PICK_GAME.replace(BUY_COST, `${BUY_LINE}\n`), [BUY_LINE, '    It costs 1 move.']);
    expect(asMove.errors).toEqual([[asMove.line, '“buy” is a card move in another phase, so it can\'t also be a button. Start one with another word.']]);
  });

  describe('a card and the card it goes to, and sets of cards', () => {
    const SHOW_LINE = '  A player may show a card from their stash to a card in their case.';
    const TRADE_LIMIT = '    Only if they picked at most 2 cards.';
    const STOP_LINE = '  A player may stop.';
    const buttonOf = (text: string, base: string) => phaseOf(text).actions.find((a) => a.base === base)!;
    /** CARD_PICK_GAME with `lines` put in before the stop button. */
    const beforeStop = (lines: string[]) => {
      const added = CARD_PICK_GAME.replace(`${STOP_LINE}\n`, `${lines.join('\n')}\n${STOP_LINE}\n`);
      expect(added).not.toBe(CARD_PICK_GAME);
      return added;
    };

    it('reads a card that goes to a card, and a set that goes to a zone', () => {
      expect(compileGame(CARD_PICK_GAME, lib).diagnostics).toEqual([]);
      const show = buttonOf(CARD_PICK_GAME, 'show');
      expect(show).toMatchObject({ words: 'show a card from their stash to a card in their case', label: 'Show a card from your stash to a card in your case' });
      expect(show.line).toBe(at(CARD_PICK_GAME, SHOW_LINE));
      expect(show.pick).toEqual({
        some: false, from: { of: { who: 'actor' }, zone: 'stash' }, fromText: 'their stash', to: null, onto: { of: { who: 'actor' }, zone: 'case' },
        ontoText: 'their case',
      });
      expect(show.cost).toMatchObject({ amount: 1, counter: 'moves' });
      const trade = buttonOf(CARD_PICK_GAME, 'trade');
      expect(trade.pick).toEqual({
        some: true, from: { of: { who: 'actor' }, zone: 'stash' }, fromText: 'their stash', to: { shared: 'shop' }, onto: null, ontoText: null,
      });
      expect(trade.conditions.map((group) => group.text)).toEqual(['they picked at most 2 cards']);
    });

    it('reads a set that goes nowhere by itself, and a set that goes to a card', () => {
      const toss = beforeStop(['  A player may toss some cards from their stash.', '    Then:', '      Move the picked cards to the pile.']);
      expect(compileGame(toss, lib).diagnostics).toEqual([]);
      expect(buttonOf(toss, 'toss').pick).toMatchObject({ some: true, from: { of: { who: 'actor' }, zone: 'stash' }, to: null, onto: null });
      const stack = beforeStop([
        '  A player may stack some cards from their stash to a card in their case.', '    Only if the target card is not a Ruby.', '    Then:',
        '      Move the picked cards to their case.',
      ]);
      expect(compileGame(stack, lib).diagnostics).toEqual([]);
      expect(buttonOf(stack, 'stack').pick).toMatchObject({ some: true, to: null, onto: { of: { who: 'actor' }, zone: 'case' }, ontoText: 'their case' });
    });

    it('reads the zone of the card it goes to as a move\'s zone is read', () => {
      const text = CARD_PICK_GAME.replace(SHOW_LINE, '  A player may show a card from their stash to a card in each case.');
      expect(text).not.toBe(CARD_PICK_GAME);
      expect(messages(text)).toEqual([[at(text, '  A player may show a card from their stash to a card in each case.'), ONE_ZONE]]);
    });

    describe('what a line needs', () => {
      const NEEDS_ONTO = (clean: string) =>
        `“${clean}” only makes sense in a button that picks a card and the card it goes to, like “A player may stack a card from their hand to a card in the row.”`;
      const NEEDS_CARDS = (clean: string) =>
        `“${clean}” only makes sense in a button that picks some cards, like “A player may discard some cards from their hand.”`;

      it('the target card, only in a button that picks one', () => {
        const text = adding(CARD_PICK_GAME, SELL_LINE, '    Only if the target card is a Ruby.');
        expect(messages(text)).toEqual([[at(text, '    Only if the target card is a Ruby.'), NEEDS_ONTO('the target card is a Ruby')]]);
      });
      it('the picked cards, only in a button that picks some', () => {
        const text = adding(CARD_PICK_GAME, '      Move it to the pile.', '      Move the picked cards to the pile.');
        expect(messages(text)).toEqual([[at(text, '      Move the picked cards to the pile.'), NEEDS_CARDS('Move the picked cards to the pile')]]);
      });
      it('no card, and no move, in a button that picks some cards', () => {
        const moved = adding(CARD_PICK_GAME, TRADE_LIMIT, '    Then:\n      Move it to the pile.');
        // Sell has the same line; the one under trade is the last.
        const line = moved.split('\n').lastIndexOf('      Move it to the pile.') + 1;
        expect(line).toBe(at(moved, TRADE_LIMIT) + 2);
        expect(messages(moved)).toEqual([[line, '“Move it to the pile” only makes sense in a rule about a card, such as “When a card …”.']]);
        const judged = adding(CARD_PICK_GAME, TRADE_LIMIT, '    Only if the card is a Ruby.');
        expect(messages(judged)).toEqual([
          [at(judged, '    Only if the card is a Ruby.'), "“the card is a Ruby” only makes sense in a rule about a player's move."],
        ]);
      });
    });
  });

  describe('Review Focus: a line that would tell the player a card they can not see', () => {
    const hidden = (zone: string) =>
      `This line would tell the player what the card is, though they can't see the cards in ${zone}. Check it in the Then: lines, after a reveal.`;
    const NOT_RUBY = '    Only if the card is not a Ruby.';
    const MOVE_IT = ['    Then:', '      Move it to their case.'];
    /** CARD_PICK_GAME for two, so that “the other player” is one seat, with `lines` put in before the stop button. */
    const forTwo = (lines: string[]) => {
      const text = CARD_PICK_GAME.replace('Players: 2 to 3', 'Players: 2').replace('  A player may stop.\n', `${lines.join('\n')}\n  A player may stop.\n`);
      expect(text.split('\n').length).toBe(CARD_PICK_GAME.split('\n').length + lines.length);
      return text;
    };

    it('refuses a line about the card under a pick from the other player\'s stash, on that line, and leaves no game', () => {
      const text = forTwo(["  A player may peek a card in the other player's stash.", NOT_RUBY, ...MOVE_IT]);
      expect(messages(text)).toEqual([[at(text, NOT_RUBY), hidden("the other player's stash")]]);
      expect(compileGame(text, lib).game).toBeUndefined();
    });
    it('reads the same line under a pick from the presser\'s own stash, or from a zone everyone sees', () => {
      expect(compileGame(forTwo(['  A player may peek a card in their stash.', NOT_RUBY, ...MOVE_IT]), lib).diagnostics).toEqual([]);
      expect(compileGame(forTwo(["  A player may peek a card in the other player's case.", NOT_RUBY, ...MOVE_IT]), lib).diagnostics).toEqual([]);
    });
    it('refuses a line about the target card when the card it goes to is in the other player\'s stash', () => {
      const ONTO = '    Only if the target card is not a Ruby.';
      const text = forTwo(["  A player may spy a card from their stash to a card in the other player's stash.", ONTO]);
      // The show button has the same line; the one under spy is the last.
      expect(messages(text)).toEqual([[text.split('\n').lastIndexOf(ONTO) + 1, hidden("the other player's stash")]]);
      expect(compileGame(forTwo(["  A player may spy a card from their stash to a card in the other player's case.", ONTO]), lib).diagnostics).toEqual([]);
    });
    it('refuses it under a pick from a zone no one can see, and from a zone named for one seat', () => {
      const pile = forTwo(['  A player may take a card in the pile.', NOT_RUBY, ...MOVE_IT]);
      expect(messages(pile)).toEqual([[at(pile, NOT_RUBY), hidden('the pile')]]);
      const seat = forTwo(["  A player may peek a card in p1's stash.", NOT_RUBY, ...MOVE_IT]);
      expect(messages(seat)).toEqual([[at(seat, NOT_RUBY), hidden("p1's stash")]]);
    });
    it('refuses a line about the picked cards of a set, and every line of an Only if one of: block that reads one', () => {
      const AT_MOST = '    Only if they picked at most 1 card.';
      const set = forTwo(["  A player may snoop some cards from the other player's stash.", AT_MOST]);
      expect(messages(set)).toEqual([[at(set, AT_MOST), hidden("the other player's stash")]]);
      const ONE_OF = '    Only if one of:';
      const either = forTwo(["  A player may peek a card in the other player's stash.", ONE_OF, '      they have at least 9 coins', '      the card is a Ruby', ...MOVE_IT]);
      expect(messages(either)).toEqual([[at(either, ONE_OF), hidden("the other player's stash")]]);
    });
    it('reads a line about the player alone under the same pick', () => {
      const text = forTwo(["  A player may peek a card in the other player's stash.", '    Only if they have at least 1 coin.', ...MOVE_IT]);
      expect(compileGame(text, lib).diagnostics).toEqual([]);
    });
  });
});

describe('a target card in several zones', () => {
  const COACH_LINE = '  A player may coach a card from their stash to a card in their workshop, their crew or their idle.';
  const ONLY_IF = '    Only if the target card is not tired.';
  const GOLD_ONLY_IF = '          Only if the target card is a Smith.';
  /** The 1-based number of `line` in `text`, which must hold it once. */
  const at = (text: string, line: string) => {
    expect(text.split('\n').filter((l) => l === line)).toHaveLength(1);
    return text.split('\n').indexOf(line) + 1;
  };
  /** `text` with `from` written as `to`, which it must hold. */
  const swapped = (text: string, from: string, to: string) => {
    const changed = text.replace(from, to);
    expect(changed).not.toBe(text);
    return changed;
  };
  /** `text` with `line` put in after `after`, which it must hold. */
  const adding = (text: string, after: string, line: string) => swapped(text, `${after}\n`, `${after}\n${line}\n`);
  const coachOf = (text: string) => compileGame(text, lib).game!.phases[0].actions.find((a) => a.base === 'coach')!;
  const stash = { of: { who: 'actor' }, zone: 'stash' };
  const mine = (zone: string) => ({ of: { who: 'actor' }, zone });

  it('reads the first zone as the one the card goes to, and each zone after it with its text', () => {
    expect(compileGame(COACH_GAME, lib).diagnostics).toEqual([]);
    expect(coachOf(COACH_GAME).pick).toEqual({
      some: false, from: stash, fromText: 'their stash', to: null, onto: mine('workshop'), ontoText: 'their workshop',
      ontoAlso: [{ zone: mine('crew'), text: 'their crew' }, { zone: mine('idle'), text: 'their idle' }],
    });
  });
  it('reads the zones the same with a comma before the last “or”', () => {
    const oxford = swapped(COACH_GAME, 'their crew or their idle.', 'their crew, or their idle.');
    expect(compileGame(oxford, lib).diagnostics).toEqual([]);
    expect(coachOf(oxford).pick).toEqual(coachOf(COACH_GAME).pick);
  });
  it('(guard) leaves a pick of one zone without the zones after it', () => {
    const hire = compileGame(CREW_GAME, lib).game!.phases[0].actions.find((a) => a.base === 'hire')!;
    expect(hire.pick).toMatchObject({ onto: mine('workshop'), ontoText: 'their workshop' });
    expect('ontoAlso' in hire.pick!).toBe(false);
  });
  it('names a zone it can not read on the button\'s line', () => {
    const line = '  A player may coach a card from their stash to a card in their workshop or their crw.';
    const text = swapped(COACH_GAME, COACH_LINE, line);
    expect(messages(text)).toEqual([[at(text, line), 'There is no zone called “crw”.']]);
  });
  it('takes each zone as one zone only', () => {
    const line = '  A player may coach a card from their stash to a card in their workshop or each idle.';
    const text = swapped(COACH_GAME, COACH_LINE, line);
    expect(messages(text)).toEqual([[at(text, line), 'A move goes from one zone to one zone.']]);
  });
  it('Review Focus: refuses each line about the target card when a zone after the first may hide it, naming that zone', () => {
    const hidden = "This line would tell the player what the card is, though they can't see the cards in p1's stash. Check it in the Then: lines, after a reveal.";
    const text = swapped(COACH_GAME, COACH_LINE, "  A player may coach a card from their stash to a card in their workshop or p1's stash.");
    // The Gold option's Only if line reads the target card too, so it is told the same (P7).
    expect(messages(text)).toEqual([[at(text, ONLY_IF), hidden], [at(text, GOLD_ONLY_IF), hidden]]);
    expect(compileGame(text, lib).game).toBeUndefined();
  });
  it('reads the target card only in a button that picks one, and the picked cards only in one that picks some', () => {
    const gains = adding(COACH_GAME, '      Their moves go back to 0.', '      The target card gains 1 drill.');
    expect(messages(gains)).toEqual([[at(gains, '      The target card gains 1 drill.'),
      '“The target card gains 1 drill” only makes sense in a button that picks a card and the card it goes to, like “A player may stack a card from their hand to a card in the row.”']]);
    const waking = adding(COACH_GAME, '      Move it to their workshop.', '      Every picked card is not tired.');
    // The rouse button has the same line; the one under start comes right after its Then line.
    expect(messages(waking)).toEqual([[at(waking, '      Move it to their workshop.') + 1,
      '“Every picked card is not tired” only makes sense in a button that picks some cards, like “A player may discard some cards from their hand.”']]);
  });
  it('asks every line about the target card for a button that picks one, and every line about the picked cards for one that picks some', () => {
    const START = '  A player may start a card in their stash.';
    const tests = ['the target card is tired', 'the target card is not tired', 'some card on the target card is tired', 'no card on the target card is tired'];
    const changes = ['The target card is tired', 'The target card is not tired', 'Every picked card is tired', 'Every picked card is not tired'];
    const text = swapped(COACH_GAME, `${START}\n    Then:\n      Move it to their workshop.\n`, [
      START, ...tests.map((test) => `    Only if ${test}.`), '    Then:', '      Move it to their workshop.', ...changes.map((change) => `      ${change}.`), '',
    ].join('\n'));
    const first = at(text, START) + 1;
    const needs = (clean: string) => (clean.startsWith('Every picked')
      ? `“${clean}” only makes sense in a button that picks some cards, like “A player may discard some cards from their hand.”`
      : `“${clean}” only makes sense in a button that picks a card and the card it goes to, like “A player may stack a card from their hand to a card in the row.”`);
    expect(messages(text)).toEqual([
      ...tests.map((test, i) => [first + i, needs(test)]), ...changes.map((change, i) => [first + tests.length + 2 + i, needs(change)]),
    ]);
  });
  it('refuses a line that would change a number worked out from its lines', () => {
    const text = swapped(WORKED_GAME, '  A player may stop.', [
      '  A player may coach a card from their stash to a card in their workshop.', '    Then:', '      The target card gains 1 red work.', '  A player may stop.',
    ].join('\n'));
    expect(messages(text)).toEqual([[at(text, '      The target card gains 1 red work.'), '“red work” is worked out from its lines, so no rule can change it.']]);
  });
  it('refuses a line that would make the target card or the picked cards so, or not so, where that is worked out from its lines', () => {
    const onTarget = ['      The target card is done.', '      The target card is not done.'];
    const onPicked = ['      Every picked card is done.', '      Every picked card is not done.'];
    const text = swapped(WORKED_GAME, '  A player may stop.', [
      '  A player may coach a card from their stash to a card in their workshop.', '    Then:', ...onTarget,
      '  A player may rouse some cards from the hall to a card in their workshop.', '    Then:', ...onPicked, '  A player may stop.',
    ].join('\n'));
    expect(messages(text)).toEqual([...onTarget, ...onPicked].map((line) => [at(text, line), '“done” is worked out from its lines, so no rule can change it.']));
  });
});
