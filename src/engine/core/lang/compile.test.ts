import { describe, expect, it } from 'vitest';
import { canPlay, compileGame } from './compile';
import { createDefaultLibrary } from './library';
import { PhraseLibrary, STATIC_TYPES } from './phrases';
import { VOCAB_TYPES } from './refs';
import { TINY_BOARD_HEAD } from './testing';
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
      [22, 'I don\'t understand this section. Sections are Game, Players, Cards, Table, Board, Setup, Phase, End and Example.'],
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
      [17, 'I don\'t understand this line in a phase. Phase lines start with Hint:, A player may…, When…, After a player…, Players take turns or Everyone acts at once.'],
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
      [22, 'I don\'t understand this section. Sections are Game, Players, Cards, Table, Board, Setup, Phase, End and Example.'],
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
      pieces: { start: 0 }, counters: [{ name: 'money', start: 1500, visibility: 'public' }],
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
      { name: 'money', start: 1500, visibility: 'public' }, { name: 'lives', start: 3, visibility: 'owner' },
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
