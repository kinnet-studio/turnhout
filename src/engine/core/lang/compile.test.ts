import { describe, expect, it } from 'vitest';
import COLOR_MATCH_TEXT from '@/games/color-match.rules?raw';
import VENOM_TEXT from '@/games/venom.rules?raw';
import { counterOf } from './board-state';
import { createEngine, initialState } from './build';
import { canPlay, compileGame } from './compile';
import { runExamples } from './examples';
import { createDefaultLibrary } from './library';
import { PhraseLibrary, STATIC_TYPES } from './phrases';
import { VOCAB_TYPES } from './refs';
import {
  COUNTER_GAME, CREW_GAME, HOLDING_BOARD, INTERRUPT_BOARD, PICK_BOARD, ROUNDS_GAME, TINY_BOARD_HEAD, TURN_GAME, deckGameText,
} from './testing';
import type { ParamType } from './types';

const lib = createDefaultLibrary();
const BASE = [
  'Game: Tiny', 'Players: 2 to 3', '', 'Cards:', '  A standard 52-card deck, starting in the deck.', '',
  'Table:', '  The deck is a pile in the center that no one can see.', '  Each player has a hand that only they can see.', '',
  'Setup:', '  Shuffle the deck.', '  Deal 5 cards from the deck to each hand.', '',
  'Phase: main', '  Hint: Do things.', '  Players take turns.', '',
  'End:', '  The game ends when a player\'s hand is empty.', '  The player with an empty hand wins.',
].join('\n');

const messages = (text: string, library = lib) => compileGame(text, library).diagnostics.map((d) => [d.line, d.message]);

describe('compileGame', () => {
  it('compiles header, cards, table, setup, phase skeleton and end', () => {
    const { game, diagnostics } = compileGame(BASE, lib);
    expect(diagnostics).toEqual([]);
    expect(game!.name).toBe('Tiny');
    expect(game!.players).toEqual({ min: 2, max: 3 });
    expect(game!.zones.map((z) => z.name)).toEqual(['deck', 'hand']);
    expect(game!.cards[0]).toMatchObject({ kind: 'standard', start: 'deck', acesHigh: false });
    expect(game!.setup.map((r) => [r.phrase, r.line])).toEqual([['shuffle {zone}', 12], ['deal {int} cards from {zone} to {zone}', 13]]);
    expect(game!.phases[0]).toMatchObject({ id: 'main', hint: 'Do things.', actor: 'current', moves: [], goTo: null, after: null });
    expect(game!.end).toMatchObject({ line: 20, winner: { phrase: 'the player with an empty {perzone} wins' } });
    expect(canPlay({ game, diagnostics })).toEqual({ ok: true });
  });

  it('turns an unknown phrase into a placeholder, a hint and a stub', () => {
    const result = compileGame(BASE.replace('Shuffle the deck.', 'Shufle the deck.'), lib);
    expect(result.diagnostics).toEqual([expect.objectContaining({
      line: 12, kind: 'unknown-phrase', severity: 'error', message: '“Shufle the deck” isn\'t in the phrase library yet.',
      suggestions: expect.arrayContaining(['shuffle [zone]']), stub: expect.stringContaining("library.effect('shufle {zone}'"),
    })]);
    expect(result.game!.setup[0]).toMatchObject({ kind: 'lang', phrase: 'missing', line: 12 });
    expect(canPlay(result)).toEqual({ ok: false, reason: '1 phrase still needs a developer.' });
  });

  it('compiles "If <condition>, <effect>"', () => {
    const { game } = compileGame(BASE.replace('Shuffle the deck.', 'If the deck is not empty, shuffle the deck.'), lib);
    expect(game!.setup[0]).toMatchObject({ kind: 'lang', phrase: 'if', args: [{ phrase: '{zone} is not empty' }, { phrase: 'shuffle {zone}' }] });
  });

  it('reports structural problems in plain words', () => {
    expect(compileGame(BASE.replace('Players: 2 to 3', 'Players: lots'), lib).diagnostics).toContainEqual(expect.objectContaining({ message: 'Say how many players, like “Players: 4” or “Players: 2 to 5”.' }));
    expect(compileGame(`${BASE}\nTable:\n  The deck is a pile in the center that no one can see.`, lib).diagnostics).toContainEqual(expect.objectContaining({ message: 'There are two zones called “deck”.' }));
    expect(compileGame(BASE.replace(/End:[\s\S]*/, ''), lib).diagnostics).toContainEqual(expect.objectContaining({ severity: 'warning', message: 'Without an End: section the game never finishes.' }));
  });

  it('never throws on empty or half-written text', () => {
    for (const text of ['', 'Game: X', 'Game: X\nPlayers: 2\nPhase: a']) {
      const r = compileGame(text, lib);
      expect(r.diagnostics.length).toBeGreaterThan(0);
      expect(canPlay(r).ok).toBe(false);
    }
  });
});

describe('compileGame header and sections', () => {
  it('asks for what is missing', () => {
    expect(messages('')).toEqual([
      [1, 'Start with a line like “Game: My Game”.'],
      [1, 'Say how many players, like “Players: 4” or “Players: 2 to 5”.'],
      [1, 'Add a Cards: section.'],
      [1, 'Add a Table: section.'],
      [1, 'Add at least one Phase: section.'],
      [1, 'Without an End: section the game never finishes.'],
    ]);
  });

  it('accepts one player count or a range, and refuses nonsense ranges', () => {
    expect(compileGame(BASE.replace('Players: 2 to 3', 'Players: 4'), lib).game!.players).toEqual({ min: 4, max: 4 });
    expect(compileGame(BASE.replace('Players: 2 to 3', 'players: 2  TO  5'), lib).game!.players).toEqual({ min: 2, max: 5 });
    for (const bad of ['Players: 0', 'Players: 5 to 2', 'Players:']) {
      expect(messages(BASE.replace('Players: 2 to 3', bad))).toEqual([[2, 'Say how many players, like “Players: 4” or “Players: 2 to 5”.']]);
    }
  });

  it('allows at most 12 players, in either bound', () => {
    expect(compileGame(BASE.replace('Players: 2 to 3', 'Players: 12'), lib).game!.players).toEqual({ min: 12, max: 12 });
    for (const bad of ['Players: 13', 'Players: 2 to 13', 'Players: 13 to 2', 'Players: 99999999999999999999']) {
      const result = compileGame(BASE.replace('Players: 2 to 3', bad), lib);
      expect(result.diagnostics.map((d) => [d.line, d.message])).toEqual([[2, 'This game can have at most 12 players.']]);
      expect(result.game).toBeUndefined();
    }
  });

  it('reads the largest player count into the vocabulary', () => {
    expect(messages(BASE.replace('Shuffle the deck.', 'Shuffle p9\'s hand.'))).toEqual([[12, 'This game only has players p0 to p2.']]);
    expect(compileGame(BASE.replace('Shuffle the deck.', 'Shuffle p2\'s hand.'), lib).diagnostics).toEqual([]);
  });

  it('flags a second Game: or Players: line', () => {
    expect(messages(`${BASE}\nGame: Again\nPlayers: 3`)).toEqual([
      [22, 'There is already a Game: line above.'],
      [23, 'There is already a Players: line above.'],
    ]);
  });

  it('flags unknown top-level lines', () => {
    expect(messages(`${BASE}\nRules:\n  Be nice.`)).toEqual([
      [22, 'I don\'t understand this section. Sections are Game, Players, Cards, Table, Board, Setup, In every phase, Phase, End and Example, or a column of the board\'s table.'],
    ]);
  });

  it('flags indentation under lines that take none', () => {
    const text = BASE.replace('Game: Tiny', 'Game: Tiny\n  Extra').replace('  Shuffle the deck.', '  Shuffle the deck.\n    more');
    expect(messages(text)).toEqual([
      [2, 'This line shouldn\'t be indented under the line above.'],
      [14, 'This line shouldn\'t be indented under the line above.'],
    ]);
  });

  it('merges repeated sections in order', () => {
    const text = `${BASE}\nSetup:\n  Shuffle the deck.\nTable:\n  The pile is a pile in the center that everyone can see.`;
    const { game, diagnostics } = compileGame(text, lib);
    expect(diagnostics).toEqual([]);
    expect(game!.setup.map((r) => r.line)).toEqual([12, 13, 23]);
    expect(game!.zones.map((z) => z.name)).toEqual(['deck', 'hand', 'pile']);
  });

  it('keeps diagnostics in line order', () => {
    const text = [
      'Game: Tiny', 'Players: 2', 'End:', '  The game ends when the deck is emptyish.', '  The lowest score wins.',
      'Cards:', '  A standard 52-card deck, starting in the deck.',
      'Table:', '  The deck is a pile in the center that no one can see.',
      'Setup:', '  Shufle the deck.', 'Phase: main', '  Players take turns.',
    ].join('\n');
    const lines = compileGame(text, lib).diagnostics.map((d) => d.line);
    expect(lines).toEqual([4, 11]);
  });

  it('reads CRLF line endings and tab indentation like LF and spaces', () => {
    expect(compileGame(BASE.replace(/\n/g, '\r\n'), lib).diagnostics).toEqual([]);
    expect(compileGame(BASE.replace(/^ {2}/gm, '\t'), lib).diagnostics).toEqual([]);
    expect(compileGame(`﻿${BASE}`, lib).diagnostics).toEqual([]);
  });
});

describe('compileGame table and cards', () => {
  it('reads zones with their layout and who can see them', () => {
    const { game } = compileGame(BASE.replace('Each player has', 'The trick is a row in the center that everyone can see.\n  Each player has'), lib);
    expect(game!.zones).toEqual([
      { name: 'deck', perPlayer: false, layout: 'pile', visibility: 'secret' },
      { name: 'trick', perPlayer: false, layout: 'row', visibility: 'public' },
      { name: 'hand', perPlayer: true, layout: 'hand', visibility: 'owner' },
    ]);
  });

  it('turns a thrown RuleError into the designer\'s message on the line', () => {
    expect(messages(BASE.replace('The deck is a pile in the center that no one can see', 'The deck is a pile in the center that only they can see'))).toContainEqual(
      [8, 'Only a player\'s own zone can be “only they can see”.'],
    );
    expect(messages(BASE.replace('starting in the deck', 'starting in each hand'))).toEqual([
      [5, 'Cards must start in a shared zone, like “the deck”.'],
    ]);
  });

  it('turns any other thrown error into a plain message', () => {
    const broken = createDefaultLibrary().cards('a broken deck, starting in {zone}', () => { throw new Error('boom'); });
    const result = compileGame(BASE.replace('A standard 52-card deck', 'A broken deck'), broken);
    expect(result.diagnostics).toEqual([expect.objectContaining({
      line: 5, severity: 'error', kind: 'invalid', text: 'A broken deck, starting in the deck',
      message: 'Something went wrong reading this line: boom',
    })]);
    expect(canPlay(result)).toEqual({ ok: false, reason: 'Fix 1 problem in the rules first.' });
  });

  it('survives a parameter type whose resolver throws', () => {
    const boom: ParamType = { name: 'boom', label: '[boom]', source: () => 'boom', resolve: () => { throw new Error('kaboom'); } };
    const broken = new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES, boom]).effect('explode {boom}', (env) => env.state);
    expect(messages('Game: T\nPlayers: 2\nSetup:\n  Explode boom.\n  Explode again.', broken)).toContainEqual(
      [4, 'Something went wrong reading this line: kaboom'],
    );
  });

  it('never throws, even when the library itself breaks', () => {
    const broken = { match: () => ({ status: 'ambiguous', patterns: ['a'] }), types: () => { throw new Error('nope'); } } as unknown as PhraseLibrary;
    const result = compileGame('Game: T\nPlayers: 2\nSetup:\n  Shuffle the deck.', broken);
    expect(result.game).toBeUndefined();
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ line: 1, message: 'Something went wrong reading the rules: nope' }));
  });

  it('reads a card table under a deck line and lets rules mention its values', () => {
    const text = BASE
      .replace('  A standard 52-card deck, starting in the deck.', [
        '  A deck called color cards, starting in the deck:', '    | color | number | copies |', '    | red   | 1 to 2 | 2      |', '    | blue  | 7      | 1      |',
      ].join('\n'))
      .replace('Shuffle the deck.', 'The player holding the red 2 goes first.');
    const { game, diagnostics } = compileGame(text, lib);
    expect(diagnostics).toEqual([]);
    expect(game!.cards[0]).toMatchObject({ kind: 'table', start: 'deck', acesHigh: false });
    expect(game!.cards[0].identities).toHaveLength(5);
    expect(game!.setup[0]).toMatchObject({ phrase: 'the player holding {card} goes first', args: [{ color: 'red', number: 2 }] });
  });

  it('points a bad table cell at its own row', () => {
    const text = BASE.replace('  A standard 52-card deck, starting in the deck.', [
      '  A deck called color cards, starting in the deck:', '    | color | copies |', '    | red   | many   |',
    ].join('\n'));
    expect(compileGame(text, lib).diagnostics).toEqual([expect.objectContaining({ line: 7, kind: 'invalid', text: 'many' })]);
  });

  it('refuses a table of more than 1000 cards with one message on its row, at once', () => {
    for (const row of ['| red | 1 to 9 | 2000 |', '| red | 1 to 9999 | 1 |', '| red | 1 to 9999999999 | 1 |']) {
      const text = BASE.replace('  A standard 52-card deck, starting in the deck.', [
        '  A deck called color cards, starting in the deck:', '    | color | number | copies |', `    ${row}`,
      ].join('\n'));
      const started = performance.now();
      const result = compileGame(text, lib);
      expect(performance.now() - started).toBeLessThan(500);
      expect(result.diagnostics).toEqual([expect.objectContaining({ line: 7, severity: 'error', message: 'A game can have at most 1000 cards.' })]);
      expect(canPlay(result).ok).toBe(false);
    }
  });

  it('counts the cards of every set towards the 1000', () => {
    const text = BASE.replace('  A standard 52-card deck, starting in the deck.', [
      '  A standard 52-card deck, starting in the deck.', '  A deck called extras, starting in the deck:', '    | n | copies |', '    | 1 to 100 | 10 |',
    ].join('\n'));
    expect(messages(text)).toEqual([[6, 'A game can have at most 1000 cards.']]);
    expect(compileGame(text.replace('| 1 to 100 | 10 |', '| 1 to 94 | 10 |'), lib).diagnostics).toEqual([]);
  });

  it('asks for the table a custom deck needs', () => {
    expect(messages(BASE.replace('A standard 52-card deck', 'A deck called plain'))).toEqual([[5, 'Add a table of cards under this line.']]);
  });

  it('refuses a second zone with the same name even across sections', () => {
    expect(messages(BASE.replace('Each player has a hand', 'The deck is a row in the center that everyone can see.\n  Each player has a hand'))).toEqual([
      [9, 'There are two zones called “deck”.'],
    ]);
  });
});

describe('compileGame setup', () => {
  it('only allows “their” inside a rule about a move', () => {
    expect(messages(BASE.replace('Shuffle the deck.', 'Shuffle their hand.'))).toEqual([
      [12, '“Shuffle their hand” only makes sense in a rule about a player\'s move.'],
    ]);
  });

  it('reports a clash between two phrases for the developer', () => {
    const clashing = createDefaultLibrary().effect('shuffle the {name}', (env) => env.state);
    const result = compileGame(BASE, clashing);
    expect(result.diagnostics).toEqual([expect.objectContaining({
      line: 12, kind: 'ambiguous-phrase', severity: 'error',
      message: '“Shuffle the deck” matches more than one phrase: shuffle [zone] / shuffle the [name]. A developer needs to make one of them more specific.',
    })]);
    expect(result.game).toBeUndefined();
  });

  it('shows the resolver\'s own message when a line does not make sense', () => {
    expect(messages(BASE.replace('Deal 5 cards from the deck to each hand', 'Deal 5 cards from the deck to the hand'))).toEqual([
      [13, '“the hand” — whose hand? Say “their hand”, “each hand” or “p1\'s hand”.'],
    ]);
  });

  it('tries every comma of an If line, so phrases may contain commas', () => {
    const text = BASE.replace('Shuffle the deck.', 'If the deck is not empty, shuffle the deck, except its top card, into the deck.');
    const { game, diagnostics } = compileGame(text, lib);
    expect(diagnostics).toEqual([]);
    expect(game!.setup[0]).toMatchObject({ phrase: 'if', args: [{ phrase: '{zone} is not empty' }, { phrase: 'shuffle {zone}, except its top card, into {zone}' }] });
  });

  it('splits an If line after a comma that belongs to the condition', () => {
    const phrases = createDefaultLibrary().condition('the deck is empty, or the hand is empty', () => true);
    const text = BASE.replace('Shuffle the deck.', 'If the deck is empty, or the hand is empty, shuffle the deck.');
    const { game, diagnostics } = compileGame(text, phrases);
    expect(diagnostics).toEqual([]);
    expect(game!.setup[0]).toMatchObject({
      phrase: 'if',
      args: [{ kind: 'condition', phrase: 'the deck is empty, or the hand is empty', text: 'the deck is empty, or the hand is empty' }, { kind: 'effect', phrase: 'shuffle {zone}' }],
    });
  });

  it('keeps the text of an If line\'s parts without the keyword or the period', () => {
    const { game } = compileGame(BASE.replace('Shuffle the deck.', 'If the Deck is not empty, Shuffle the deck.'), lib);
    expect(game!.setup[0]).toMatchObject({ args: [{ kind: 'condition', line: 12, text: 'the Deck is not empty' }, { kind: 'effect', line: 12, text: 'Shuffle the deck' }] });
  });

  it('blames the effect when only the effect of an If line is unknown', () => {
    const result = compileGame(BASE.replace('Shuffle the deck.', 'If the deck is not empty, shufle the deck.'), lib);
    expect(result.diagnostics).toEqual([expect.objectContaining({
      line: 12, kind: 'unknown-phrase', message: '“shufle the deck” isn\'t in the phrase library yet.', stub: expect.stringContaining("library.effect('shufle {zone}'"),
    })]);
    expect(result.game!.setup[0]).toMatchObject({ phrase: 'if', args: [{ phrase: '{zone} is not empty' }, { phrase: 'missing', args: ['effect'] }] });
  });

  it('blames the condition when the condition of an If line is unknown', () => {
    const result = compileGame(BASE.replace('Shuffle the deck.', 'If the deck is feeling lucky, shuffle the deck.'), lib);
    expect(result.diagnostics).toEqual([expect.objectContaining({
      line: 12, kind: 'unknown-phrase', message: '“the deck is feeling lucky” isn\'t in the phrase library yet.', stub: expect.stringContaining('library.condition('),
    })]);
    expect(result.diagnostics).toHaveLength(1);
  });

  it('asks what happens when an If line has no comma', () => {
    expect(messages(BASE.replace('Shuffle the deck.', 'If the deck is not empty.'))).toEqual([
      [12, 'Say what happens when the condition is true, like “If the deck is empty, shuffle the deck.”'],
    ]);
  });
});

describe('compileGame phases', () => {
  it('reads Hint, turns and simultaneous play', () => {
    const { game } = compileGame(BASE.replace('Players take turns.', 'Everyone acts at once.').replace('Hint: Do things.', 'Hint:   Drag  a card. Then wait!  '), lib);
    expect(game!.phases[0]).toMatchObject({ hint: 'Drag  a card. Then wait!', actor: 'any' });
  });

  it('names a phase by its lowercased name and refuses two with the same name', () => {
    const text = `${BASE}\nPhase:  Main`;
    const { game, diagnostics } = compileGame(text, lib);
    expect(diagnostics).toEqual([expect.objectContaining({ line: 22, message: 'There are two phases called “main”.' })]);
    expect(game).toBeUndefined();
    expect(compileGame(`${BASE}\nPhase: Second Phase`, lib).game!.phases.map((p) => p.id)).toEqual(['main', 'second phase']);
  });

  it('asks for a name', () => {
    expect(messages(`${BASE}\nPhase:`)).toEqual([[22, 'Give the phase a name, like “Phase: playing”.']]);
  });

  it('leaves lines it cannot read in a phase for the designer to fix', () => {
    expect(messages(BASE.replace('Hint: Do things.', 'Hint: Do things.\n  Dance.'))).toEqual([
      [17, 'I don\'t understand this line in a phase. Phase lines start with Hint:, A player may…, Any player may…, When…, After a player…, Players take turns or Everyone acts at once.'],
    ]);
  });

  it('allows one Hint and no indentation under a phase line', () => {
    expect(messages(BASE.replace('Hint: Do things.', 'Hint: Do things.\n  Hint: And more.'))).toEqual([[17, 'A phase can have only one Hint.']]);
    expect(messages(BASE.replace('Players take turns.', 'Players take turns.\n    extra'))).toEqual([[18, 'This line shouldn\'t be indented under the line above.']]);
  });

  it('knows the phases and verbs of the whole game before any rule is read', () => {
    const phrases = createDefaultLibrary()
      .condition('someone {move} something', () => true)
      .condition('the game is in {phase}', () => true);
    const text = BASE
      .replace("a player's hand is empty", 'someone plays something')
      .replace('Players take turns.', 'Players take turns.\n  A player may play a card from their hand to the deck.')
      .replace('Shuffle the deck.', 'Shuffle the deck.\n  If the game is in second phase, shuffle the deck.')
      + '\nPhase: Second Phase';
    // The lines that use the phase and the verb were read; only the second phase, which nothing leads to, is reported.
    expect(messages(text, phrases)).toEqual([[24, 'Nothing leads to the phase “second phase”.']]);
  });
});

describe('phases a line starts', () => {
  const START = '      The vote phase starts with the player on their left.';
  const unstarted = INTERRUPT_BOARD.replace(START, '      They get 5 money.');
  it('reaches a phase a line of another phase starts', () => expect(compileGame(INTERRUPT_BOARD, lib).diagnostics).toEqual([]));
  it('warns about a phase nothing starts', () => {
    expect(messages(unstarted)).toEqual([[32, 'Nothing leads to the phase “vote”.']]);
  });
  it('does not count a line of the phase itself', () => {
    const own = unstarted.replace('      Go back to the interrupted turn.\n  When', `      Go back to the interrupted turn.\n${START}\n  When`);
    expect(own).not.toBe(unstarted);
    expect(messages(own)).toEqual([[32, 'Nothing leads to the phase “vote”.']]);
  });
  it('counts a line that starts it only if something holds', () => {
    const iffy = INTERRUPT_BOARD.replace(START, '      If they have rolled this turn, the vote phase starts with the player on their left.');
    expect(iffy).not.toBe(INTERRUPT_BOARD);
    expect(compileGame(iffy, lib).diagnostics).toEqual([]);
  });
  it('counts a card that says to start it', () => {
    const lucky = ['| name | says |', '| Recess | The vote phase starts with the player on their left. |'];
    const text = `${deckGameText(lucky, ['| name | says |', '| Calm | They get 0 money. |'])}\n\nPhase: vote\n  Hint: Vote.`;
    expect(compileGame(text, lib).diagnostics).toEqual([]);
  });
  it('counts a line that starts it with the player who pressed, alone, under an If or in a For line', () => {
    for (const line of [
      '      The vote phase starts with them.', '      If they have rolled this turn, the vote phase starts with them.',
      '      For the player who is voting, the vote phase starts with them.',
    ]) {
      const text = INTERRUPT_BOARD.replace(START, line);
      expect(text).not.toBe(INTERRUPT_BOARD);
      expect(compileGame(text, lib).diagnostics, line).toEqual([]);
    }
  });
  it('does not count a For line of the phase itself', () => {
    const own = unstarted.replace(
      '      Go back to the interrupted turn.\n  When', '      Go back to the interrupted turn.\n      For the player who is voting, the vote phase starts with them.\n  When',
    );
    expect(own).not.toBe(unstarted);
    expect(messages(own)).toEqual([[32, 'Nothing leads to the phase “vote”.']]);
  });
});

describe('lines about the player who holds a flag', () => {
  /** The 1-based number of `line` in `text`. */
  const at = (text: string, line: string) => text.split('\n').indexOf(line) + 1;

  it('says when a For line names no player, and how to name one', () => {
    const text = HOLDING_BOARD.replace('For the rival,', 'For everyone,');
    expect(messages(text)).toContainEqual([
      at(text, '      For everyone, they get 5 money.'), '“everyone” doesn\'t name a player. Write “For the player who is …,” with something players can be.',
    ]);
  });
  it('names a misspelt holder in a For line, with the flag closest to it, for the designer to fix', () => {
    for (const [from, to, message, suggestions] of [
      ['For the rival,', 'For the rivel,', 'There is no player fact called “the rivel”.', ['the rival']],
      ['For the player who is leading,', 'For the player who is leadng,', 'There is no player fact called “leadng”.', ['leading']],
    ] as const) {
      const text = HOLDING_BOARD.replace(from, to);
      const line = at(text, text.split('\n').find((l) => l.includes(to))!);
      const { game, diagnostics } = compileGame(text, lib);
      expect(diagnostics, to).toEqual([expect.objectContaining({ line, kind: 'invalid', message, suggestions })]);
      expect(game, to).toBeUndefined();
    }
  });
  it('names a misspelt holder that is paid, rather than asking a developer for the line', () => {
    const text = PICK_BOARD.replace('  Players can be the rival.', '  Players can be the rival.\n  The game has a pot of 5.')
      .replace('      That player is the rival.', '      They pay the pot to the rivel.');
    const { game, diagnostics } = compileGame(text, lib);
    expect(diagnostics).toEqual([expect.objectContaining({
      line: at(text, '      They pay the pot to the rivel.'), kind: 'invalid', message: 'There is no player fact called “the rivel”.', suggestions: ['the rival'],
    })]);
    expect(canPlay({ game, diagnostics })).toEqual({ ok: false, reason: 'Fix 1 problem in the rules first.' });
  });
  it('reads the rest of a For line as an effect, and says when no phrase reads it', () => {
    const text = HOLDING_BOARD.replace('they get 5 money', 'they dance');
    expect(messages(text)).toContainEqual([at(text, '      For the rival, they dance.'), '“they dance” isn\'t in the phrase library yet.']);
  });
});

describe('compileGame end', () => {
  it('keeps the end condition and the winner rule with their text and line', () => {
    const { game } = compileGame(BASE, lib);
    expect(game!.end!.when).toMatchObject({ kind: 'condition', phrase: "a player's {perzone} is empty", text: "a player's hand is empty", line: 20 });
    expect(game!.end!.winner).toMatchObject({ kind: 'winner', text: 'The player with an empty hand wins', line: 21 });
    expect(game!.end!.scores).toEqual([]);
  });

  it('files an unknown line as a score, or as a winner when it says “wins”', () => {
    const scoreStub = compileGame(BASE.replace('The player with an empty hand wins.', 'Each heart is bad.\n  The lowest score wins.'), lib).diagnostics[0];
    expect(scoreStub).toMatchObject({ line: 21, kind: 'unknown-phrase', stub: expect.stringContaining('library.score(') });
    const winnerStub = compileGame(BASE.replace('The player with an empty hand wins.', 'Whoever is luckiest wins.'), lib);
    expect(winnerStub.diagnostics).toEqual([expect.objectContaining({ line: 21, kind: 'unknown-phrase', stub: expect.stringContaining('library.winner(') })]);
    expect(winnerStub.game!.end!.winner).toMatchObject({ kind: 'lang', phrase: 'missing', args: ['winner'] });
  });

  it('reads score lines as scores', () => {
    const text = BASE.replace('The player with an empty hand wins.', "Each heart in a player's hand scores 1 point.\n  The lowest score wins.");
    const { game, diagnostics } = compileGame(text, lib);
    expect(diagnostics).toEqual([]);
    expect(game!.end!.scores).toEqual([expect.objectContaining({ kind: 'score', line: 21 })]);
  });

  it('needs a line saying who wins, and a line saying when the game ends', () => {
    expect(messages(BASE.replace('The player with an empty hand wins.', ''))).toEqual([[19, 'Add a line saying who wins, like “The lowest score wins.”']]);
    expect(messages(BASE.replace("The game ends when a player's hand is empty.", ''))).toEqual([
      [19, 'Add a line saying when the game ends, like “The game ends when every hand is empty.”'],
    ]);
  });

  it('allows one of each', () => {
    expect(messages(`${BASE}\n  The lowest score wins.`)).toEqual([[22, 'There is already a line saying who wins.']]);
    expect(messages(`${BASE}\n  The game ends when a player's hand is empty.`)).toEqual([[22, 'There is already a line saying when the game ends.']]);
  });

  it('does not let “their” into the end rules', () => {
    expect(messages(BASE.replace("a player's hand is empty", 'their hand is empty'))).toEqual([
      [20, '“their hand is empty” only makes sense in a rule about a player\'s move.'],
    ]);
  });
});

describe('canPlay', () => {
  it('counts phrases that still need a developer', () => {
    const two = compileGame(BASE.replace('Shuffle the deck.', 'Shufle the deck.\n  Dael 5 cards.'), lib);
    expect(canPlay(two)).toEqual({ ok: false, reason: '2 phrases still need a developer.' });
  });

  it('counts problems the designer must fix, even beside unknown phrases', () => {
    const text = BASE.replace('Shuffle the deck.', 'Shufle the deck.').replace('to each hand', 'to the hand').replace('Hint: Do things.', 'Hint: Do things.\n  Dance.');
    const result = compileGame(text, lib);
    expect(result.game).toBeUndefined();
    expect(canPlay(result)).toEqual({ ok: false, reason: 'Fix 3 problems in the rules first.' });
  });

  it('allows a game with only warnings', () => {
    const result = compileGame(BASE.replace(/End:[\s\S]*/, ''), lib);
    expect(result.diagnostics.map((d) => d.severity)).toEqual(['warning']);
    expect(canPlay(result)).toEqual({ ok: true });
  });
});

describe('compileGame names the game never defined', () => {
  const COLOR_DECK = ['  A deck called color cards, starting in the deck:', '    | color | number |', '    | red   | 1 to 2 |', '    | blue  | 7      |'].join('\n');

  it('names a zone with the closest one, as a problem for the designer rather than a phrase for a developer', () => {
    const result = compileGame(BASE.replace('Shuffle the deck.', 'Shuffle the dek.'), lib);
    expect(result.diagnostics).toEqual([{
      line: 12, severity: 'error', kind: 'invalid', message: 'There is no zone called “dek”.', text: 'Shuffle the dek', suggestions: ['deck'],
    }]);
    expect(canPlay(result)).toEqual({ ok: false, reason: 'Fix 1 problem in the rules first.' });
  });

  it('names it inside an If line', () => {
    expect(messages(BASE.replace('Shuffle the deck.', 'If the dek is empty, shuffle the deck.'))).toEqual([[12, 'There is no zone called “dek”.']]);
  });

  it('keeps a line with other words around a real zone a phrase for a developer', () => {
    expect(compileGame(BASE.replace('Shuffle the deck.', 'Shuffle the deck twice.'), lib).diagnostics).toEqual([
      expect.objectContaining({ line: 12, kind: 'unknown-phrase', stub: expect.stringContaining("library.effect('shuffle {zone} twice'") }),
    ]);
  });

  it('names phases, suits and moves in examples', () => {
    const text = BASE.replace('Players take turns.', 'Players take turns.\n  A player may play a card from their hand to the deck.')
      + "\n\nExample: typos\n  Given the phase is mian\n  And p0 holds the 2 of clbs\n  When p0 plyas a card\n  Then it is p1's turn";
    expect(compileGame(text, lib).diagnostics.map((d) => [d.line, d.kind, d.message, d.suggestions])).toEqual([
      [25, 'invalid', 'There is no phase called “mian”.', ['main']],
      [26, 'invalid', 'There is no suit called “clbs”.', ['clubs']],
      [27, 'invalid', 'There is no move called “plyas”.', ['plays']],
    ]);
  });

  it('names card values and card attributes from the card table', () => {
    const text = BASE
      .replace('  A standard 52-card deck, starting in the deck.', COLOR_DECK)
      .replace('Shuffle the deck.', 'The player holding the purple 2 goes first.')
      .replace('Players take turns.', 'Players take turns.\n  A player may play a card from their hand to the deck.\n    Only if the card has the same colour as the top card of the deck.');
    expect(compileGame(text, lib).diagnostics.map((d) => [d.line, d.message, d.suggestions])).toEqual([
      [15, 'There is no card value called “purple”.', []],
      [22, 'There is no card attribute called “colour”.', ['color']],
    ]);
  });
});

describe('compileGame after a broken Players:, Cards: or Table: line', () => {
  const HOLD_BACK = (line: number) => `Some lines below can't be checked until line ${line} is fixed.`;
  const EXAMPLE = "\n\nExample: turns\n  Given it is p1's turn\n  Then p1 holds 5 cards";

  it('holds back what a broken player count makes unreadable, with one warning', () => {
    const before = compileGame(`${BASE}${EXAMPLE}`.replace('Players: 2 to 3', 'Players: four'), lib);
    expect(before.diagnostics.map((d) => [d.line, d.severity, d.message])).toEqual([
      [2, 'error', 'Say how many players, like “Players: 4” or “Players: 2 to 5”.'],
      [24, 'warning', HOLD_BACK(2)],
    ]);
    expect(canPlay(before).ok).toBe(false);
  });

  it('holds back the card names a broken deck line leaves undefined, keeping the deck line\'s own hint', () => {
    const text = BASE.replace('A standard 52-card deck', 'A standard 52 card deck').replace('Shuffle the deck.', 'The player holding the 2 of clubs goes first.');
    const result = compileGame(text, lib);
    expect(result.diagnostics.map((d) => [d.line, d.severity, d.kind])).toEqual([[5, 'error', 'unknown-phrase'], [12, 'warning', 'structure']]);
    expect(result.diagnostics[1].message).toBe(HOLD_BACK(5));
    expect(result.diagnostics.filter((d) => d.stub !== undefined).map((d) => d.line)).toEqual([5]);
    expect(canPlay(result).ok).toBe(false);
  });

  it('shows every problem on the Players:, Cards: and Table: lines and points at the zone line the deck depends on', () => {
    const text = BASE.replace('The deck is a pile in the center that no one can see', 'The deck is a pile in the center that only they can see');
    expect(messages(text)).toEqual([
      [5, 'There is no zone called “deck”.'],
      [8, 'Only a player\'s own zone can be “only they can see”.'],
      [12, HOLD_BACK(8)],
    ]);
  });

  it('holds back nothing, and warns of nothing, when no later line has a problem', () => {
    expect(messages(BASE.replace('Players: 2 to 3', 'Players: 0'))).toEqual([[2, 'Say how many players, like “Players: 4” or “Players: 2 to 5”.']]);
  });

  it('still reports structure problems below a broken line', () => {
    expect(messages(`${BASE.replace('Players: 2 to 3', 'Players: four')}\nRules:\n  Be nice.`)).toEqual([
      [2, 'Say how many players, like “Players: 4” or “Players: 2 to 5”.'],
      [22, 'I don\'t understand this section. Sections are Game, Players, Cards, Table, Board, Setup, In every phase, Phase, End and Example, or a column of the board\'s table.'],
    ]);
  });
});

describe('the Board: section', () => {
  /** The head with `extra` lines (already indented) put in after line `after`. */
  const withLines = (after: number, ...extra: string[]) => {
    const lines = TINY_BOARD_HEAD.split('\n');
    lines.splice(after, 0, ...extra);
    return lines.join('\n');
  };
  const errors = (text: string) => compileGame(text, createDefaultLibrary()).diagnostics.filter((d) => d.severity === 'error').map((d) => [d.line, d.message]);

  it('compiles a Board: section', () => {
    const { game, diagnostics } = compileGame(TINY_BOARD_HEAD, createDefaultLibrary());
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(game!.board).toEqual({
      spaces: [
        { name: 'Go', attrs: { kind: 'go' } },
        { name: 'Mill Lane', attrs: { kind: 'street', color: 'brown', price: 60, rent: 2 } },
        { name: 'Income Tax', attrs: { kind: 'tax', tax: 200 } },
        { name: 'Rose Lane', attrs: { kind: 'street', color: 'orange', price: 180, rent: 14 } },
      ],
      pieces: { start: 0 }, counters: [{ name: 'money', start: 1500, visibility: 'public', perTurn: false }],
      dice: { count: 2, sides: 6 }, payWith: 'money', bank: [],
    });
  });
  it('needs neither a Cards: nor a Table: section, but a game without a board does', () => {
    expect(errors(TINY_BOARD_HEAD)).toEqual([]);
    const noBoard = ['Game: X', 'Players: 2', '', 'Phase: main', '  Players take turns.'].join('\n');
    expect(errors(noBoard)).toEqual([[1, 'Add a Cards: section.'], [1, 'Add a Table: section.']]);
    expect(compileGame(BASE, lib).game!.board).toBeNull();
  });
  it('reads the lines in the order written, whatever the capitals', () => {
    const text = TINY_BOARD_HEAD.replace('starts on Go.', 'starts on GO.').replace('Rose Lane  |', 'ROSE LANE  |');
    const { game, diagnostics } = compileGame(text, createDefaultLibrary());
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(game!.board!.pieces).toEqual({ start: 0 });
    expect(game!.board!.spaces[3].name).toBe('ROSE LANE');
  });
  it('names a counter the board never declared', () => {
    const { diagnostics } = compileGame(TINY_BOARD_HEAD.replace('pay with money', 'pay with gold'), createDefaultLibrary());
    expect(diagnostics).toContainEqual(expect.objectContaining({ line: 13, message: 'There is no counter called “gold”.', suggestions: ['money'] }));
  });
  it('names a space the table never defined', () => {
    const { diagnostics } = compileGame(TINY_BOARD_HEAD.replace('starts on Go.', 'starts on Goo.'), createDefaultLibrary());
    expect(diagnostics).toContainEqual(expect.objectContaining({ line: 11, message: 'There is no space called “Goo”.', suggestions: ['Go'] }));
  });
  it('says when the loop line names another first space', () => {
    const { diagnostics } = compileGame(TINY_BOARD_HEAD.replace('starting at Go:', 'starting at Start:'), createDefaultLibrary());
    expect(diagnostics).toContainEqual(expect.objectContaining({ line: 5, message: 'The first space in the table is “Go”, but this line says the board starts at “Start”.' }));
  });
  it('quotes the name on the loop line with each word capitalised, and accepts another spelling of the first space', () => {
    expect(errors(TINY_BOARD_HEAD.replace('starting at Go:', 'starting at mill lane:'))).toContainEqual(
      [5, 'The first space in the table is “Go”, but this line says the board starts at “Mill Lane”.'],
    );
    expect(errors(TINY_BOARD_HEAD.replace('starting at Go:', 'starting at GO:'))).toEqual([]);
  });
  it('wants a table under the loop line', () => {
    const text = TINY_BOARD_HEAD.split('\n').filter((_, i) => i < 5 || i > 9).join('\n');
    expect(errors(text)).toContainEqual([5, 'Add a table of spaces under this line.']);
  });
  it('shows a problem in the table on its own row, and holds back what the rest of the game says about it', () => {
    const text = `${TINY_BOARD_HEAD.replace('| Income Tax |', '| 1 to 9     |')}\n\nSetup:\n  Shuffle the deck.`;
    const diagnostics = compileGame(text, createDefaultLibrary()).diagnostics;
    expect(diagnostics.filter((d) => d.line === 9).map((d) => d.message)).toEqual(['A space table can\'t use ranges like “1 to 9”; give each space its own row.']);
    expect(diagnostics.filter((d) => d.line === 20).map((d) => [d.severity, d.message])).toEqual([['warning', 'Some lines below can\'t be checked until line 9 is fixed.']]);
  });
  it('reports a Board: with no loop of spaces in it', () => {
    const text = TINY_BOARD_HEAD.split('\n').filter((_, i) => i < 4 || i > 9).join('\n');
    const { game, diagnostics } = compileGame(text, createDefaultLibrary());
    expect(diagnostics.filter((d) => d.line === 4).map((d) => d.message)).toEqual(['Add a line like “The board is a loop of spaces, starting at Go:” under Board:.']);
    expect(game?.board ?? null).toBeNull();
  });
  it('does not ask for a loop line when the one written has a problem', () => {
    const text = TINY_BOARD_HEAD.replace('| space      |', '| place      |');
    expect(errors(text).filter(([line]) => line === 4)).toEqual([]);
    expect(errors(text)).toContainEqual([5, 'Add a “space” column naming each space.']);
  });
  it('reports a second loop, second piece line and second pay line on the later line', () => {
    const loop = TINY_BOARD_HEAD.split('\n').slice(4, 10);
    expect(errors(withLines(10, ...loop))).toContainEqual([11, 'There is already a board line above.']);
    expect(errors(withLines(11, '  Each player has a piece that starts on Mill Lane.'))).toEqual([[12, 'Pieces are already described above.']]);
    expect(errors(withLines(13, '  Players pay with money.'))).toEqual([[14, 'There is already a “Players pay with …” line above.']]);
  });
  it('reports two counters with one name, however they are written', () => {
    expect(errors(withLines(12, '  Each player has 3 Money that only they can see.'))).toEqual([[13, 'There are two counters called “money”.']]);
    const { game, diagnostics } = compileGame(withLines(12, '  Each player has 3 lives that only they can see.'), createDefaultLibrary());
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(game!.board!.counters).toEqual([
      { name: 'money', start: 1500, visibility: 'public', perTurn: false }, { name: 'lives', start: 3, visibility: 'owner', perTurn: false },
    ]);
  });
  it('lets no one hide a counter from everybody', () => {
    expect(errors(TINY_BOARD_HEAD.replace('that everyone can see', 'that no one can see'))).toContainEqual([12, 'A number a player has can be seen by everyone or only by them.']);
  });
  it('reports a second dice line', () => {
    const { diagnostics } = compileGame(TINY_BOARD_HEAD.replace('six-sided dice.', 'six-sided dice.\n  There is one six-sided die.'), createDefaultLibrary());
    expect(diagnostics).toContainEqual(expect.objectContaining({ line: 15, message: 'The dice are already described above.' }));
  });
  it('reads one die and counts as digits', () => {
    const dice = (line: string) => compileGame(TINY_BOARD_HEAD.replace('There are two six-sided dice.', line), createDefaultLibrary()).game!.board!.dice;
    expect(dice('There is one 20-sided die.')).toEqual({ count: 1, sides: 20 });
    expect(dice('There are 10 100-sided dice.')).toEqual({ count: 10, sides: 100 });
    expect(dice('There are 3 two-sided dice.')).toEqual({ count: 3, sides: 2 });
  });
  it('limits the dice to 1 to 10 dice of 2 to 100 sides', () => {
    const limit = 'Dice need 1 to 10 dice of 2 to 100 sides.';
    for (const line of ['There are 11 six-sided dice.', 'There are 0 six-sided dice.', 'There are two 101-sided dice.', 'There is one 1-sided die.', 'There are two 0-sided dice.']) {
      expect(errors(TINY_BOARD_HEAD.replace('There are two six-sided dice.', line))).toEqual([[14, limit]]);
    }
  });
  it('lets a game leave out the piece, the counters and the dice', () => {
    const text = TINY_BOARD_HEAD.split('\n').filter((_, i) => i < 10 || i > 13).join('\n');
    const { game, diagnostics } = compileGame(text, createDefaultLibrary());
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(game!.board).toMatchObject({ pieces: null, counters: [], dice: null, payWith: null });
  });
  it('says so for a line under Board: that is not a board sentence', () => {
    const { diagnostics } = compileGame(withLines(14, '  There is a bank.'), createDefaultLibrary());
    expect(diagnostics).toContainEqual(expect.objectContaining({ line: 15, kind: 'unknown-phrase', message: '“There is a bank” isn\'t in the phrase library yet.' }));
  });
});

describe('declaring facts and the bank', () => {
  /** The head with `extra` lines (already indented) put in after the dice line, which is line 14. */
  const withFacts = (...extra: string[]) => TINY_BOARD_HEAD.replace('  There are two six-sided dice.', ['  There are two six-sided dice.', ...extra].join('\n'));
  const compiled = (text: string) => compileGame(text, createDefaultLibrary());
  const errors = (text: string) => compiled(text).diagnostics.filter((d) => d.severity === 'error').map((d) => [d.line, d.message]);

  it('declares facts on spaces and a bank', () => {
    const { game, diagnostics } = compileGame(TINY_BOARD_HEAD.replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  Spaces can have houses and a hotel.\n  The bank has 32 houses and 12 hotels.'), createDefaultLibrary());
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(game!.facts).toEqual([{ name: 'houses', on: 'space', kind: 'number' }, { name: 'hotel', on: 'space', kind: 'flag' }]);
    expect(game!.board!.bank).toEqual([{ name: 'houses', start: 32 }, { name: 'hotels', start: 12 }]);
  });
  it('refuses a fact named like a column', () => {
    const { diagnostics } = compileGame(TINY_BOARD_HEAD.replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  Spaces can have a price.'), createDefaultLibrary());
    expect(diagnostics).toContainEqual(expect.objectContaining({ line: 15, message: '“price” is already a column of the table; give the fact another name.' }));
  });
  it('declares a card fact under Cards:', () => {
    const text = COLOR_MATCH_TEXT.replace('    | blue   | 1 to 9 | 2      |', '    | blue   | 1 to 9 | 2      |\n  Cards can be poisoned.');
    expect(compileGame(text, createDefaultLibrary()).game!.facts).toEqual([{ name: 'poisoned', on: 'card', kind: 'flag' }]);
  });

  it('refuses a fact about players in a game with no board, on its own line', () => {
    const text = VENOM_TEXT.replace('  Cards can be poisoned.', '  Cards can be poisoned.\n  Players can be stung.');
    const line = text.split('\n').findIndex((l) => l.includes('Players can be stung.')) + 1;
    expect(errors(text)).toEqual([[line, 'Facts about players need a Board: section or lines under Players:.']]);
    // The card fact beside it is still fine, and so is a board game's fact about players.
    expect(compiled(text).diagnostics.filter((d) => d.line !== line)).toEqual([]);
    expect(errors(withFacts('  Players can be stung.'))).toEqual([]);
  });
  it('refuses a number of the game in a game with no board, on its own line, as it does a fact about players', () => {
    const text = VENOM_TEXT.replace('  Cards can be poisoned.', '  Cards can be poisoned.\n  The game has a pot of 3.');
    const line = text.split('\n').findIndex((l) => l.includes('The game has a pot of 3.')) + 1;
    expect(errors(text)).toEqual([[line, 'Numbers that belong to the game need a Board: section or lines under Players:.']]);
    expect(compiled(text).diagnostics.filter((d) => d.line !== line)).toEqual([]);
    expect(errors(withFacts('  The game has a pot of 3.'))).toEqual([]);
  });
  it('refuses a number of the game that a counter already names, in words of its own', () => {
    expect(errors(withFacts('  The game has a money of 0.'))).toEqual([[15, '“money” is already a number each player has; give the game\'s number another name.']]);
    // A number of the game that names no counter is fine beside one that does.
    expect(errors(withFacts('  The game has a money of 0.', '  The game has a pot of 0.'))).toEqual([[15, '“money” is already a number each player has; give the game\'s number another name.']]);
  });
  it('refuses a number of the game called “amount”, which the lines of a button that carries a number already read as its own', () => {
    const AMOUNT = '“amount” already means the number a button\'s press carries; give the game\'s number another name.';
    expect(errors(withFacts('  The game has an amount of 0.'))).toEqual([[15, AMOUNT]]);
    expect(errors(withFacts('  The game has an Amount of 0.'))).toEqual([[15, AMOUNT]]);
    // Without it, a line that reads the amount a press carries would read the game's number too, and only a developer could tell them apart.
    const raising = (...extra: string[]) => errors(withFacts(...extra).replace(
      '  Players take turns.', '  Players take turns.\n  A player may raise an amount.\n    Only if they have at least the amount in money.',
    ));
    expect(raising('  The game has an amount of 0.')).toEqual([[15, AMOUNT]]);
    expect(raising('  The game has an amount of 0.', '  The game has a pot of 0.')).toEqual([[15, AMOUNT]]);
  });

  it('declares facts about players, with names of several words', () => {
    const { game, diagnostics } = compiled(withFacts('  Players can be in jail.', '  Players can have jail turns and a crown.'));
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(game!.facts).toEqual([
      { name: 'in jail', on: 'player', kind: 'flag' }, { name: 'jail turns', on: 'player', kind: 'number' }, { name: 'crown', on: 'player', kind: 'flag' },
    ]);
  });
  it('refuses a fact about players that a counter or “out” already names', () => {
    expect(errors(withFacts('  Players can have money.'))).toEqual([[15, '“money” is already a number each player has.']]);
    expect(errors(withFacts('  Players can be out.'))).toEqual([[15, '“out” is already how a player leaves the game.']]);
    expect(errors(withFacts('  Players can have OUT.'))).toEqual([[15, '“out” is already how a player leaves the game.']]);
    // Only a fact about players is refused those names: a space may still have money and an “out”.
    expect(errors(withFacts('  Spaces can have money and an out.'))).toEqual([]);
    expect(errors(withFacts('  Spaces can have tokens.', '  Players can have tokens.'))).toEqual([[16, 'There are two facts called “tokens”.']]);
  });
  it('reads player facts in any capitals, and a count of one in the singular', () => {
    const text = `${withFacts('  Players can be In Jail.', '  Players can have Jail Turns.')}\n${[
      '  A player may wait.', '    Only if They Are In Jail.', '    Then:', '      They gain 1 Jail Turn.',
      '', 'Example: waiting in jail', '  Given p0 is in jail', '  When p0 waits', '  Then p0 has 1 jail turn', '  And p0 is in jail',
    ].join('\n')}`;
    const { game, diagnostics } = compiled(text);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(runExamples(game!, createDefaultLibrary())).toEqual([expect.objectContaining({ status: 'pass' })]);
  });

  it('has no facts and no bank unless the game declares them', () => {
    const { game } = compiled(TINY_BOARD_HEAD);
    expect(game!.facts).toEqual([]);
    expect(game!.board!.bank).toEqual([]);
    expect(compileGame(COLOR_MATCH_TEXT, createDefaultLibrary()).game!.facts).toEqual([]);
  });
  it('reads every way to declare a fact, whatever the capitals, and keeps them in the order written', () => {
    const { game, diagnostics } = compiled(withFacts('  spaces CAN have Mortgages, a Deed and an Inn.', '  Cards can have health and a shield.'));
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(game!.facts).toEqual([
      { name: 'mortgages', on: 'space', kind: 'number' }, { name: 'deed', on: 'space', kind: 'flag' }, { name: 'inn', on: 'space', kind: 'flag' },
      { name: 'health', on: 'card', kind: 'number' }, { name: 'shield', on: 'card', kind: 'flag' },
    ]);
  });
  it('reads a card fact written under Board: and a space fact written under Cards:', () => {
    const text = COLOR_MATCH_TEXT.replace('    | blue   | 1 to 9 | 2      |', '    | blue   | 1 to 9 | 2      |\n  Spaces can have a hotel.');
    expect(compileGame(text, createDefaultLibrary()).game!.facts).toEqual([{ name: 'hotel', on: 'space', kind: 'flag' }]);
    expect(compiled(withFacts('  Cards can be poisoned.')).game!.facts).toEqual([{ name: 'poisoned', on: 'card', kind: 'flag' }]);
  });
  it('orders the facts of both sections by line', () => {
    const text = [
      'Game: Both', 'Players: 2', '', 'Cards:', '  A standard 52-card deck, starting in the deck.', '  Cards can be marked.', '',
      'Board:', '  The board is a loop of spaces, starting at Go:', '    | space | kind |', '    | Go | go |', '    | A | x |', '    | B | x |', '    | C | x |',
      '  Spaces can have a flag.', '', 'Table:', '  The deck is a pile in the center that no one can see.', '', 'Phase: main', '  Players take turns.',
    ].join('\n');
    const { game, diagnostics } = compiled(text);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(game!.facts.map((f) => f.name)).toEqual(['marked', 'flag']);
  });

  it('refuses a fact named like a column of a table of cards, on the line of the fact', () => {
    const declare = (fact: string) => compiled(COLOR_MATCH_TEXT.replace('    | blue   | 1 to 9 | 2      |', `    | blue   | 1 to 9 | 2      |\n  ${fact}`));
    for (const fact of ['Cards can be color.', 'Cards can have a number.', 'Cards can have health and Color.']) {
      expect(declare(fact).diagnostics).toContainEqual(expect.objectContaining({
        line: 11, severity: 'error', message: `“${fact.endsWith('number.') ? 'number' : 'color'}” is already a column of the table; give the fact another name.`,
      }));
    }
  });
  it('refuses a space fact named like a card column, and a card fact named like a space column', () => {
    const both = [
      'Game: Both', 'Players: 2', '', 'Cards:', '  A deck called color cards, starting in the deck:', '    | color | number | copies |', '    | red | 1 to 2 | 1 |',
      '  Cards can be kind.', '', 'Board:', '  The board is a loop of spaces, starting at Go:', '    | space | kind |', '    | Go | go |', '    | A | x |', '    | B | x |', '    | C | x |',
      '  Spaces can have a color.', '', 'Table:', '  The deck is a pile in the center that no one can see.', '', 'Phase: main', '  Players take turns.',
    ].join('\n');
    expect(errors(both)).toEqual([
      [8, '“kind” is already a column of the table; give the fact another name.'],
      [17, '“color” is already a column of the table; give the fact another name.'],
    ]);
  });
  it('refuses a fact named like the column that names the spaces, whatever the capitals', () => {
    expect(errors(withFacts('  Spaces can have a SPACE.'))).toEqual([[15, '“space” is already a column of the table; give the fact another name.']]);
    expect(errors(withFacts('  Spaces can have a Price.'))).toEqual([[15, '“price” is already a column of the table; give the fact another name.']]);
  });
  it('refuses a fact named like a column of a standard deck', () => {
    const text = BASE.replace('  A standard 52-card deck, starting in the deck.', '  A standard 52-card deck, starting in the deck.\n  Cards can have a rank.');
    expect(errors(text)).toEqual([[6, '“rank” is already a column of the table; give the fact another name.']]);
  });
  it('refuses a name two facts share, on the later line', () => {
    expect(errors(withFacts('  Spaces can have houses.', '  Spaces can have a hotel and houses.'))).toEqual([[16, 'There are two facts called “houses”.']]);
  });
  it('refuses a name two facts share even when one is a flag and the other a number, or they are on different things', () => {
    expect(errors(withFacts('  Spaces can have a hotel.', '  Spaces can have hotel.'))).toEqual([[16, 'There are two facts called “hotel”.']]);
    expect(errors(withFacts('  Spaces can have houses.', '  Cards can have houses.'))).toEqual([[16, 'There are two facts called “houses”.']]);
    expect(errors(withFacts('  Spaces can have houses and Houses.'))).toEqual([[15, 'There are two facts called “houses”.']]);
  });
  it('reports a name two facts share on the later line however the sections are ordered', () => {
    const text = [
      'Game: Both', 'Players: 2', '', 'Cards:', '  A standard 52-card deck, starting in the deck.', '  Cards can be marked.', '',
      'Board:', '  The board is a loop of spaces, starting at Go:', '    | space | kind |', '    | Go | go |', '    | A | x |', '    | B | x |', '    | C | x |',
      '  Spaces can have a marked.', '', 'Table:', '  The deck is a pile in the center that no one can see.', '', 'Phase: main', '  Players take turns.',
    ].join('\n');
    expect(errors(text)).toEqual([[15, 'There are two facts called “marked”.']]);
  });

  it('reads one bank line, and a second is reported on the later line', () => {
    expect(errors(withFacts('  The bank has 32 houses.', '  The bank has 12 hotels.'))).toEqual([[16, 'There is already a “The bank has …” line above.']]);
  });
  it('refuses a bank that names one thing twice', () => {
    expect(errors(withFacts('  The bank has 32 houses and 12 Houses.'))).toEqual([[15, 'There are two bank items called “houses”.']]);
  });
  it('keeps the bank apart from the facts: the bank may have what a space can have', () => {
    expect(errors(withFacts('  Spaces can have houses.', '  The bank has 32 houses.'))).toEqual([]);
  });

  it('gives the declared facts and the bank to every line below, so a misspelt name gets a hint like any other', () => {
    const library = createDefaultLibrary()
      .effect('mark {spaceflag}', (env) => env.state)
      .effect('count {spacenumber}', (env) => env.state)
      .effect('take a {banked}', (env) => env.state)
      .effect('poison {cardflag}', (env) => env.state);
    const text = (...setup: string[]) => `${withFacts('  Spaces can have houses and a hotel.', '  Cards can be poisoned.', '  The bank has 32 houses and 12 hotels.')}\n\nSetup:\n${setup.map((l) => `  ${l}`).join('\n')}`;
    const read = (...setup: string[]) => compileGame(text(...setup), library).diagnostics.filter((d) => d.severity === 'error');
    expect(read('Mark hotel.', 'Count houses.', 'Count house.', 'Take a house.', 'Take a hotel.', 'Poison poisoned.')).toEqual([]);
    expect(read('Mark hotl.')).toEqual([expect.objectContaining({ line: 23, message: 'There is no space fact called “hotl”.', suggestions: ['hotel'] })]);
    expect(read('Count hoses.')).toEqual([expect.objectContaining({ message: 'There is no space fact called “hoses”.', suggestions: ['houses'] })]);
    expect(read('Take a hotl.')).toEqual([expect.objectContaining({ message: 'There is no bank item called “hotl”.', suggestions: ['hotels'] })]);
    expect(read('Poison poisonned.')).toEqual([expect.objectContaining({ message: 'There is no card fact called “poisonned”.', suggestions: ['poisoned'] })]);
  });
  it('says what is wrong with a declaration nobody has written a phrase for, with the closest declarations', () => {
    const { diagnostics } = compiled(withFacts('  Spaces can has houses.'));
    expect(diagnostics).toContainEqual(expect.objectContaining({
      line: 15, kind: 'unknown-phrase', message: '“Spaces can has houses” isn\'t in the phrase library yet.',
      suggestions: expect.arrayContaining(['spaces can have [facts]']),
    }));
  });
  it('does not make a declaration of a line that is some other board sentence', () => {
    expect(errors(withFacts('  Players pay with gold.'))).toEqual([[15, 'There is no counter called “gold”.']]);
  });
});

describe('counters and facts under Players:', () => {
  const compiled = (text: string) => compileGame(text, lib);
  const errors = (text: string) => compiled(text).diagnostics.filter((d) => d.severity === 'error').map((d) => [d.line, d.message]);
  /** COUNTER_GAME with `extra` lines (already indented) put in after line 4, the last line under Players:. */
  const withLines = (...extra: string[]) => COUNTER_GAME.replace('  Players pay with coins.', ['  Players pay with coins.', ...extra].join('\n'));

  it('reads the lines as a board with no spaces', () => {
    const { game, diagnostics } = compiled(COUNTER_GAME);
    expect(diagnostics).toEqual([]);
    expect(game!.board).toMatchObject({ spaces: [], pieces: null, dice: null, payWith: 'coins', bank: [] });
    expect(game!.board!.counters).toMatchObject([{ name: 'coins', start: 7, visibility: 'public' }]);
  });

  it('plays: a button that pays takes the coins from the player who pressed it', () => {
    const { game } = compiled(COUNTER_GAME);
    const { engine } = createEngine(game!, lib, 2, initialState(game!, 1));
    expect(counterOf(engine.getState(), 'coins', 'p0')).toBe(7);
    const cardId = engine.getState().cards.find((card) => card.zoneId === 'shop')!.id;
    expect(engine.dispatch({ type: 'buy', by: 'p0', cardId }).ok).toBe(true);
    expect(counterOf(engine.getState(), 'coins', 'p0')).toBe(6);
    expect(counterOf(engine.getState(), 'coins', 'p1')).toBe(7);
  });

  it('declares facts about players and numbers of the game', () => {
    const { game, diagnostics } = compiled(withLines('  Players can be lucky.', '  The game has a pot of 0.'));
    expect(diagnostics).toEqual([]);
    expect(game!.facts).toEqual([{ name: 'lucky', on: 'player', kind: 'flag' }, { name: 'pot', on: 'game', kind: 'number', start: 0 }]);
  });

  it('keeps the board out of Players:', () => {
    const loop = [
      '  The board is a loop of spaces, starting at Go:',
      '    | space      | kind   |',
      '    | Go         | go     |',
      '    | Mill Lane  | street |',
      '    | Income Tax | tax    |',
      '    | Rose Lane  | street |',
    ];
    const text = COUNTER_GAME.replace('Players: 2 to 3', ['Players: 2 to 3', ...loop].join('\n'));
    expect(errors(text)).toContainEqual([3, 'The board goes under a Board: section, not under Players:.']);
  });

  it('reads only the lines under the first Players: line, and rejects those under a second', () => {
    expect(errors(withLines('Players: 2', '  Each player has 3 lives that everyone can see.'))).toEqual([
      [5, 'There is already a Players: line above.'], [6, "This line shouldn't be indented under the line above."],
    ]);
  });

  it('reads the lines under Players: beside a Board: section', () => {
    const text = TINY_BOARD_HEAD.replace('Players: 2 to 4', 'Players: 2 to 4\n  Each player has 3 lives that everyone can see.');
    const { game, diagnostics } = compiled(text);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(game!.board!.counters.map((counter) => counter.name)).toEqual(['lives', 'money']);
  });

  it('still refuses a phrase that needs a board', () => {
    const text = COUNTER_GAME.replace('      They pay 1.', '      They pay 1.\n      They own it.');
    expect(errors(text)).toEqual([[25, '“They own it” needs a board. Add a Board: section with a line like “The board is a loop of spaces, starting at Go:”.']]);
  });
});

describe('In every phase:', () => {
  const ONLY_WHEN = 'Only “When …:” rules go under In every phase:, like “When the shop has fewer than 4 cards:”.';
  const NEEDS_PLAYER = (line: string) => `“${line}” only makes sense in a rule about a player, such as a move, an action or a “When a player …” rule.`;
  const FIRST_PHASE_STARTS =
    'This phase comes first, so its “When this phase starts:” lines run only on the game\'s first turn. Put what starts each turn under “When a player\'s turn starts:”.';
  /** ROUNDS_GAME with `lines` (already indented) put in after line 22, `When a round starts:`. */
  const inRoundStart = (...lines: string[]) => ROUNDS_GAME.replace('  When a round starts:', ['  When a round starts:', ...lines].join('\n'));
  /** A game with `lines` (already indented) put in after the first phase's `Players take turns.` line. */
  const underFirstPhase = (text: string, ...lines: string[]) => text.replace('  Players take turns.', ['  Players take turns.', ...lines].join('\n'));

  it('reads the rules for a round, a turn and any time', () => {
    const { game, diagnostics } = compileGame(ROUNDS_GAME, lib);
    expect(diagnostics).toEqual([]);
    expect(game!.everyPhase.roundStarts).toMatchObject([{ kind: 'effect', phrase: 'move the top card of {zone} to {zone}', line: 23 }]);
    expect(game!.everyPhase.turnStarts).toMatchObject([{ kind: 'effect', phrase: 'they get {int} {counter}', args: [1, 'coins'], line: 25 }]);
    expect(game!.everyPhase.triggers).toMatchObject([{ line: 26, when: { phrase: '{zone} has more than {int} card(s)' } }]);
  });

  it('gives a game without the section empty lists', () => {
    expect(compileGame(TURN_GAME, lib).game!.everyPhase).toEqual({ triggers: [], roundStarts: [], turnStarts: [] });
  });

  it('takes a turn rule written with a curly apostrophe', () => {
    const { game, diagnostics } = compileGame(ROUNDS_GAME.replace("  When a player's turn starts:", '  When a player’s turn starts:'), lib);
    expect(diagnostics).toEqual([]);
    expect(game!.everyPhase.turnStarts).toHaveLength(1);
  });

  it('reports a line that is not a “When …:” rule', () => {
    expect(messages(ROUNDS_GAME.replace('In every phase:', 'In every phase:\n  Players take turns.'))).toEqual([[22, ONLY_WHEN]]);
  });

  it('reads the lines that start a round about no one', () => {
    expect(messages(inRoundStart('    They get 1 coin.'))).toEqual([[23, NEEDS_PLAYER('They get 1 coin')]]);
  });

  it('warns that the start lines of the first phase run only on the first turn, in a game that uses turns', () => {
    const starts = ['  When this phase starts:', '    They get 5 coins.'];
    expect(compileGame(underFirstPhase(ROUNDS_GAME, ...starts), lib).diagnostics).toEqual([
      expect.objectContaining({ line: 31, severity: 'warning', message: FIRST_PHASE_STARTS }),
    ]);
    expect(messages(underFirstPhase(COUNTER_GAME, ...starts))).toEqual([]);
  });

  it('keeps the turn rules written under a phase with that phase, about the player whose turn it is', () => {
    const { game, diagnostics } = compileGame(underFirstPhase(ROUNDS_GAME, "  When a player's turn starts:", '    They get 2 coins.'), lib);
    expect(diagnostics).toEqual([]);
    expect(game!.phases[0].turnStarts).toMatchObject([{ phrase: 'they get {int} {counter}', args: [2, 'coins'], line: 32 }]);
    expect(game!.phases[0].triggers).toEqual([]);
    expect(game!.phases[1].turnStarts).toEqual([]);
  });
});

describe('an End that waits for the round', () => {
  /** ROUNDS_GAME whose End waits for the round to finish, scores coins in twos and lets tied players share the win. Line 54 says when it ends. */
  const ENDING = ROUNDS_GAME.replace('  The game ends when the pile is empty.\n  The highest score wins.', [
    '  The game ends when the done pile is not empty and the round is finished.',
    '  Each player scores 1 point for every 2 coins.',
    '  The highest score wins, and tied players share the win.',
  ].join('\n'));

  it('compiles the condition inside the wait for the round', () => {
    const { game, diagnostics } = compileGame(ENDING, lib);
    expect(diagnostics).toEqual([]);
    expect(game!.end!.when).toMatchObject({
      kind: 'lang', phrase: 'round', args: [{ kind: 'condition', phrase: '{zone} is not empty' }], line: 54,
      text: 'the done pile is not empty and the round is finished',
    });
    expect(game!.end!.scores).toMatchObject([{ kind: 'score', phrase: 'each player scores {int} point(s) for every {int} {counter}', args: [1, 2, 'coins'] }]);
    expect(game!.end!.winner).toMatchObject({ kind: 'winner', phrase: 'the highest score wins, and tied players share the win' });
  });

  it('asks for a number of 1 or more after “for every” as it compiles, not only once the game ends', () => {
    for (const every of ['0', '-2']) {
      const { diagnostics } = compileGame(ENDING.replace('for every 2 coins', `for every ${every} coins`), lib);
      expect(diagnostics, every).toEqual([expect.objectContaining({
        line: 55, severity: 'error', message: 'Say a number of 1 or more after “for every”.', text: `Each player scores 1 point for every ${every} coins`,
      })]);
    }
  });

  it('reports a misnamed zone in the condition on its line', () => {
    const text = ENDING.replace('the done pile is not empty and', 'the done pil is not empty and');
    expect(compileGame(text, lib).diagnostics).toEqual([expect.objectContaining({ line: 54, message: 'There is no zone called “done pil”.' })]);
  });
});

describe('a section named after a table column', () => {
  const UNKNOWN = "I don't understand this section. Sections are Game, Players, Cards, Table, Board, Setup, In every phase, Phase, End and Example, or a column of the board's table.";
  const DOUBLE = 'A street in a full set with no buildings has double rent.';
  const compiled = (text: string) => compileGame(text, createDefaultLibrary());
  const errors = (text: string) => compiled(text).diagnostics.filter((d) => d.severity === 'error').map((d) => [d.line, d.message]);
  /** The board head with a section called `name` and its lines (already indented) after it. */
  const withSection = (name: string, ...lines: string[]) => `${TINY_BOARD_HEAD}\n\n${name}:\n${lines.join('\n')}`;

  it('keeps the lines of a section named after a column, in the order written', () => {
    const { game, diagnostics } = compiled(withSection('Rent', `  ${DOUBLE}`));
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(game!.columns.rent).toEqual([expect.objectContaining({ kind: 'column', phrase: 'a street in a full set with no buildings has double rent', line: 20 })]);
    expect(Object.keys(game!.columns)).toEqual(['rent']);
  });
  it('gives a game with no such section no columns', () => {
    expect(compiled(TINY_BOARD_HEAD).game!.columns).toEqual({});
    expect(compileGame(BASE, lib).game!.columns).toEqual({});
  });
  it('knows a column whatever the capitals, and any column of the table, not only the one with amounts', () => {
    expect(errors(withSection('RENT', `  ${DOUBLE}`))).toEqual([]);
    expect(Object.keys(compiled(withSection('Tax', `  ${DOUBLE}`)).game!.columns)).toEqual(['tax']);
  });
  it('reads a section wherever it stands, even above the Board: that has the column', () => {
    const lines = TINY_BOARD_HEAD.split('\n');
    const text = [...lines.slice(0, 3), 'Rent:', `  ${DOUBLE}`, '', ...lines.slice(3)].join('\n');
    const { game, diagnostics } = compiled(text);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(game!.columns.rent).toEqual([expect.objectContaining({ phrase: 'a street in a full set with no buildings has double rent', line: 5 })]);
  });
  it('joins two sections of one column, the second after the first', () => {
    const text = `${withSection('Rent', `  ${DOUBLE}`)}\n\nrent:\n  A street's rent depends on its houses and hotel.`;
    expect(compiled(text).game!.columns.rent.map((ref) => [ref.line, ref.phrase])).toEqual([
      [20, 'a street in a full set with no buildings has double rent'], [23, "a street's rent depends on its houses and hotel"],
    ]);
  });
  it('keeps an empty section as a column with no lines', () => {
    expect(compiled(`${TINY_BOARD_HEAD}\n\nRent:`).game!.columns).toEqual({ rent: [] });
  });
  it('gives a line nobody has written a phrase for a placeholder, a hint and a stub, as in any other section', () => {
    const { game, diagnostics } = compiled(withSection('Rent', '  A street in a half set has double rent.'));
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([expect.objectContaining({
      line: 20, kind: 'unknown-phrase', stub: expect.stringContaining("library.column('a street in a half set has double rent', (env, _args, value) =>"),
    })]);
    expect(game!.columns.rent[0]).toMatchObject({ kind: 'lang', phrase: 'missing', args: ['column'], line: 20 });
  });
  it('says what is wrong with a name in a line of the section, as in any other section', () => {
    // “things” is no kind of space of the board, and the line is shaped like the lines of this section.
    const library = createDefaultLibrary().column('every {spacekind} counts double', (_env, _args, value) => value);
    const { diagnostics } = compileGame(withSection('Rent', '  Every thing counts double.'), library);
    expect(diagnostics).toContainEqual(expect.objectContaining({ line: 20, message: 'There is no kind of space called “thing”.' }));
  });
  it('refuses lines indented under a line of the section', () => {
    expect(errors(withSection('Rent', `  ${DOUBLE}`, '    more'))).toEqual([[21, "This line shouldn't be indented under the line above."]]);
  });

  it('suggests the sections and the columns when a header is neither', () => {
    const problems = (name: string) => compiled(withSection(name, `  ${DOUBLE}`)).diagnostics.filter((d) => d.severity === 'error');
    expect(problems('Rnt')).toEqual([expect.objectContaining({ line: 19, message: UNKNOWN, text: 'Rnt:', suggestions: ['Rent'] })]);
    // Where a name is close to a section's and to a column's, both are offered.
    expect(problems('Prise')[0].suggestions).toEqual(['Price']);
    expect(problems('Phse')[0].suggestions).toEqual(['Phase']);
  });
  it('is no column section when the header is the column that names the spaces, or says more than the name', () => {
    expect(errors(withSection('Space', `  ${DOUBLE}`))).toEqual([[19, UNKNOWN]]);
    expect(errors(`${TINY_BOARD_HEAD}\n\nRent: ${DOUBLE}`)).toEqual([[19, UNKNOWN]]);
  });
  it('says the same of a header in a game with no board, and no column is to be had there', () => {
    expect(errors(`${BASE}\nRent:\n  ${DOUBLE}`)).toEqual([[22, UNKNOWN]]);
  });
  it('waits for the board when the board has a problem, since the columns are not known then', () => {
    const noTable = TINY_BOARD_HEAD.split('\n').filter((_, i) => i < 5 || i > 9).join('\n');
    const text = `${noTable}\n\nRent:\n  ${DOUBLE}`;
    const header = text.split('\n').indexOf('Rent:') + 1;
    expect(errors(text)).toContainEqual([5, 'Add a table of spaces under this line.']);
    expect(compiled(text).diagnostics.filter((d) => d.line >= header)).toEqual([]);
  });
});

describe('cards that say what they do', () => {
  const FATE = ['| name | says |', '| Calm | They get 0 money. |'];

  it('reads each says cell, sentence by sentence, as lines about the player who drew the card', () => {
    const lucky = ['| name | says |', '| Dividend | They get 50 money. |', '| Toll | They pay 15. If someone else owns it, they pay its rent to its owner. |'];
    const { game, diagnostics } = compileGame(deckGameText(lucky, FATE), lib);
    expect(diagnostics).toEqual([]);
    expect(Object.keys(game!.says)).toEqual(['They get 50 money.', 'They pay 15. If someone else owns it, they pay its rent to its owner.', 'They get 0 money.']);
    expect(game!.says['They get 50 money.']).toEqual([{ kind: 'effect', phrase: 'they get {int} {counter}', args: [50, 'money'], line: 7, text: 'They get 50 money' }]);
    expect(game!.says['They pay 15. If someone else owns it, they pay its rent to its owner.'].map((ref) => [ref.kind, ref.phrase, ref.line]))
      .toEqual([['effect', 'they pay {int}', 8], ['lang', 'if', 8]]);
    expect(JSON.parse(JSON.stringify(game!.says))).toEqual(game!.says);
  });
  it("reports a sentence the library doesn't know on its row, with a stub, and still reads the others", () => {
    const { game, diagnostics } = compileGame(deckGameText(['| name | says |', '| Jig | They dance a jig. They get 5 money. |'], FATE), lib);
    expect(diagnostics.map((d) => [d.line, d.kind, d.message])).toEqual([[7, 'unknown-phrase', "“They dance a jig” isn't in the phrase library yet."]]);
    expect(diagnostics[0].stub).toBeDefined();
    expect(game!.says['They dance a jig. They get 5 money.'].map((ref) => ref.phrase)).toEqual(['missing', 'they get {int} {counter}']);
  });
  it("Review Focus: never holds back the rest of the rules for a says sentence the library doesn't know", () => {
    const text = deckGameText(['| name | says |', '| Jig | They dance a jig. |'], FATE, ['  When a player has less than 1 money:', '    They sing.']);
    const sing = text.split('\n').indexOf('    They sing.') + 1;
    expect(compileGame(text, lib).diagnostics.map((d) => [d.line, d.severity, d.kind])).toEqual([[7, 'error', 'unknown-phrase'], [sing, 'error', 'unknown-phrase']]);
  });
  it('reads a row on each deck even when two rows say the same, and keeps one entry for the text', () => {
    const jig = ['| name | says |', '| Jig | They dance a jig. |'];
    const { game, diagnostics } = compileGame(deckGameText(jig, jig), lib);
    expect(diagnostics.map((d) => [d.line, d.kind])).toEqual([[7, 'unknown-phrase'], [10, 'unknown-phrase']]);
    expect(Object.keys(game!.says)).toEqual(['They dance a jig.']);
  });
  it('asks for a sentence in an empty cell, on its row', () => {
    const { diagnostics } = compileGame(deckGameText(['| name | says |', '| Blank | |'], FATE), lib);
    expect(diagnostics.map((d) => [d.line, d.message])).toEqual([[7, 'Say what this card does, like “They get 50 money.”']]);
  });
  it('knows the column by its name in any capitals', () => {
    const lucky = ['| name | Says |', '| Dividend | They get 50 money. |'];
    const { game, diagnostics } = compileGame(deckGameText(lucky, FATE), lib);
    expect(diagnostics).toEqual([]);
    expect(game!.says['They get 50 money.'].map((ref) => ref.phrase)).toEqual(['they get {int} {counter}']);
  });
  it('is empty for a game whose decks have no says column', () => {
    expect(compileGame(COLOR_MATCH_TEXT, lib).game!.says).toEqual({});
  });
  it('gives a game to play only while every says problem is a sentence the library does not know', () => {
    // An unknown sentence is a phrase a developer still has to write; an empty cell is a mistake in the rules.
    expect(compileGame(deckGameText(['| name | says |', '| Jig | They dance a jig. |'], FATE), lib).game).toBeDefined();
    expect(compileGame(deckGameText(['| name | says |', '| Blank | |'], FATE), lib).game).toBeUndefined();
  });

  describe('when an earlier section is broken', () => {
    const SING = ['  When a player has less than 1 money:', '    They sing.'];
    const PROBLEMS = ['| name | says |', '| Jig | They dance a jig. |', '| Blank | |'];
    const lineOf = (text: string, line: string) => text.split('\n').indexOf(line) + 1;
    const summary = (text: string) => compileGame(text, lib).diagnostics.map((d) => [d.line, d.severity, d.message]);

    it('shows the problem on the Board: line, not the same problem again on every says row', () => {
      const text = deckGameText(['| name | says |', '| Dividend | They get 50 money. |'], FATE, SING)
        .split('\n').filter((line) => !line.startsWith('    | space ')).join('\n');
      // Without the header row the board has no counters, so each says row would also name one the game seems not to have.
      // One warning on the first of those rows says they are waiting.
      expect(summary(text)).toEqual([
        [7, 'warning', 'Some card lines can\'t be checked until line 18 is fixed.'],
        [18, 'error', 'Add a “space” column naming each space.'],
        [27, 'error', 'There is no space called “Go”.'],
        [39, 'warning', 'Some lines below can\'t be checked until line 18 is fixed.'],
      ]);
    });
    it('says that card lines are waiting when their problems are held back, so a game that cannot be played has a reason', () => {
      // An unknown Board: line is a phrase for a developer, but the empty cell is a mistake: the game is not to be played, and the
      // cell's own problem is not shown while the Board: line is, so one warning on its row says what is waiting for what.
      const text = deckGameText(['| name | says |', '| Blank | |'], FATE).replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  There is a gong.');
      const result = compileGame(text, lib);
      const gong = lineOf(text, '  There is a gong.');
      expect(result.game).toBeUndefined();
      expect(result.diagnostics.map((d) => [d.line, d.severity, d.kind, d.message])).toEqual([
        [7, 'warning', 'structure', `Some card lines can't be checked until line ${gong} is fixed.`],
        [gong, 'error', 'unknown-phrase', '“There is a gong” isn\'t in the phrase library yet.'],
      ]);
      expect(canPlay(result)).toEqual({ ok: false, reason: 'Fix 1 problem in the rules first.' });
    });
    it('puts that warning on the first row that had a problem, once, however many were held back', () => {
      const text = deckGameText(PROBLEMS, ['| name | says |', '| Blank | |'])
        .replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  There is a gong.');
      const gong = lineOf(text, '  There is a gong.');
      expect(compileGame(text, lib).diagnostics.map((d) => [d.line, d.severity, d.message])).toEqual([
        [7, 'warning', `Some card lines can't be checked until line ${gong} is fixed.`],
        [gong, 'error', '“There is a gong” isn\'t in the phrase library yet.'],
      ]);
    });
    it('adds no such warning when no card line had a problem', () => {
      const text = deckGameText(['| name | says |', '| Dividend | They get 50 money. |'], FATE).replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  There is a gong.');
      expect(compileGame(text, lib).diagnostics.map((d) => [d.severity, d.message])).toEqual([['error', '“There is a gong” isn\'t in the phrase library yet.']]);
    });
    it('keeps the broken Cards: line first, holds back the rules, and leaves the says problems to be shown once it is fixed, with a warning that they wait', () => {
      const fixed = deckGameText(PROBLEMS, FATE, SING);
      const text = fixed.replace('starting in the fate pile', 'starting in the nowhere pile');
      expect(summary(text)).toEqual([
        [7, 'warning', 'Some card lines can\'t be checked until line 9 is fixed.'],
        [9, 'error', 'There is no zone called “nowhere pile”.'],
        [lineOf(text, '    They sing.'), 'warning', 'Some lines below can\'t be checked until line 9 is fixed.'],
      ]);
      // Once the zone is fixed, the says problems and the rule's own are all shown.
      expect(summary(fixed).map(([line]) => line)).toEqual([7, 8, lineOf(fixed, '    They sing.')]);
    });
  });
});

describe('zones whose cards sit on cards', () => {
  /** The 1-based number of `line` in `text`. */
  const at = (text: string, line: string) => text.split('\n').indexOf(line) + 1;
  const zoneOf = (text: string, name: string) => compileGame(text, lib).game!.zones.find((zone) => zone.name === name)!;

  it('compiles CREW_GAME with no problems', () => expect(compileGame(CREW_GAME, lib).diagnostics).toEqual([]));
  it('marks a row each player has whose line ends “, where every card is on a card”', () => {
    expect(zoneOf(CREW_GAME, 'crew')).toEqual({ name: 'crew', perPlayer: true, layout: 'row', visibility: 'public', onCards: 'every' });
  });
  it('leaves the mark out of a zone whose line does not say it, and reads “an idle row” as a row', () => {
    const idle = zoneOf(CREW_GAME, 'idle');
    expect('onCards' in idle).toBe(false);
    expect(idle).toEqual({ name: 'idle', perPlayer: true, layout: 'row', visibility: 'public' });
  });
  it('reads “an” before a zone each player has that is no row, as a pile', () => {
    const text = CREW_GAME.replace('  Each player has an idle row', '  Each player has an apron that only they can see.\n  Each player has an idle row');
    expect(compileGame(text, lib).diagnostics).toEqual([]);
    expect(zoneOf(text, 'apron')).toEqual({ name: 'apron', perPlayer: true, layout: 'pile', visibility: 'owner' });
  });
  it('refuses the mark on a zone in the center, on its line', () => {
    const line = '  The hall is a row in the center that everyone can see, where every card is on a card.';
    const text = CREW_GAME.replace('  The hall is a row in the center that everyone can see.', line);
    expect(messages(text)).toContainEqual([at(text, line), 'Only a zone each player has can hold cards on cards.']);
  });
});
