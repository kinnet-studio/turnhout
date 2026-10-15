import { describe, expect, it } from 'vitest';
import { canPlay, compileGame } from './compile';
import { createDefaultLibrary } from './library';
import { PhraseLibrary, STATIC_TYPES } from './phrases';
import { VOCAB_TYPES } from './refs';
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
      [22, 'I don\'t understand this section. Sections are Game, Players, Cards, Table, Setup, Phase, End and Example.'],
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
    const text = BASE.replace('Players: 2 to 3', 'Players: lots').replace('Shuffle the deck.', 'Shufle the deck.').replace('Deal 5', 'Dael 5');
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
