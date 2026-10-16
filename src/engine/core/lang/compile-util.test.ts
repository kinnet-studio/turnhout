import { describe, expect, it } from 'vitest';
import { innerEffect, matchEffectLine, matchLine, type LineCtx } from './compile-util';
import type { Diagnostic } from './diagnostics';
import { PhraseLibrary, STATIC_TYPES, emptyVocab } from './phrases';
import { VOCAB_TYPES } from './refs';
import type { PhraseRef } from './types';
import { compileGame } from './compile';
import { createDefaultLibrary } from './library/index';
import { TOTALS_GAME, vocabFor } from './testing';

const library = new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES])
  .cards('a deck called {name}', () => ({ kind: 'table', identities: [], start: 'deck', acesHigh: false }))
  .board('there are {count} dice', () => ({ kind: 'dice', count: 1, sides: 6 }))
  .declare('spaces can have {factlist}', () => [])
  .condition('the bank is empty', () => true)
  .condition('it is flagged', () => true, { needsCard: true })
  .effect('move it away', (env) => env.state, { needsCard: true })
  .effect('they keep this card', (env) => env.state, { needsPlayer: true, needsDrawnCard: true })
  .effect('that player is {playerflag}', (env) => env.state, { needsPick: true })
  .effect('they cheer', (env) => env.state, { needsPlayer: true })
  .effect('the card flips', (env) => env.state, { needsMove: true })
  .which('a card in a {perzone} has {int} {attribute}', () => []);

const ctx = (): LineCtx & { diagnostics: Diagnostic[] } =>
  ({ library, vocab: emptyVocab(), gameName: 'Test', inMove: false, player: false, space: false, card: false, drawn: false, amount: false, picked: false, diagnostics: [] });

describe('matchLine with other kinds to try', () => {
  it('reads a line as the kind asked for before any other', () => {
    expect(matchLine('board', 'There are 2 dice', 3, ctx(), ['declare', 'cards'])).toMatchObject({ kind: 'board', phrase: 'there are {count} dice' });
  });
  it('tries the other kinds in order, and the line is of the kind that read it', () => {
    const one = ctx();
    expect(matchLine('board', 'Spaces can have houses', 3, one, 'declare')).toMatchObject({ kind: 'declare', phrase: 'spaces can have {factlist}' });
    expect(matchLine('board', 'A deck called x', 4, one, ['declare', 'cards'])).toMatchObject({ kind: 'cards', phrase: 'a deck called {name}' });
    expect(matchLine('board', 'Spaces can have houses', 5, one, ['cards', 'declare'])).toMatchObject({ kind: 'declare' });
    expect(one.diagnostics).toEqual([]);
  });
  it('makes a placeholder of the first kind for a line none of them reads, with suggestions from all of them', () => {
    const several = ctx();
    const ref = matchLine('board', 'Spaces can has houses', 3, several, ['cards', 'declare']);
    expect(ref).toMatchObject({ kind: 'lang', phrase: 'missing', args: ['board'] });
    expect(several.diagnostics).toEqual([expect.objectContaining({
      line: 3, kind: 'unknown-phrase', suggestions: ['spaces can have [facts]'], stub: expect.stringContaining("library.board('spaces can has houses'"),
    })]);
  });
  it('still takes one other kind, or none', () => {
    expect(matchLine('condition', 'The bank is empty', 1, ctx())).toMatchObject({ kind: 'condition' });
    expect(matchLine('board', 'The bank is empty', 1, ctx(), 'condition')).toMatchObject({ kind: 'condition' });
    const none = ctx();
    expect(matchLine('board', 'The bank is empty', 1, none)).toMatchObject({ kind: 'lang', phrase: 'missing' });
    expect(none.diagnostics).toHaveLength(1);
  });
});

describe('matchLine and the rule around a line', () => {
  const NEEDS_CARD = (line: string) => `“${line}” only makes sense in a rule about a card, such as “When a card …”.`;

  it('refuses a phrase about “it” the card outside a rule about a card, and says what the rule should be', () => {
    const outside = ctx();
    expect(matchLine('condition', 'It is flagged', 6, outside)).toMatchObject({ kind: 'lang', phrase: 'missing', args: ['condition'] });
    expect(matchLine('effect', 'Move it away', 7, outside)).toMatchObject({ kind: 'lang', phrase: 'missing', args: ['effect'] });
    expect(outside.diagnostics).toEqual([
      expect.objectContaining({ line: 6, kind: 'invalid', severity: 'error', message: NEEDS_CARD('It is flagged'), text: 'It is flagged' }),
      expect.objectContaining({ line: 7, kind: 'invalid', message: NEEDS_CARD('Move it away') }),
    ]);
  });
  it('reads it in a rule about a card', () => {
    const about = { ...ctx(), card: true };
    expect(matchLine('condition', 'It is flagged', 6, about)).toMatchObject({ kind: 'condition', phrase: 'it is flagged' });
    expect(about.diagnostics).toEqual([]);
  });
  it('is no help to a rule about a player or a space, or to a move', () => {
    for (const about of [{ player: true }, { space: true }, { inMove: true }]) {
      const one = { ...ctx(), ...about };
      matchLine('condition', 'It is flagged', 6, one);
      expect(one.diagnostics.map((d) => d.message), JSON.stringify(about)).toEqual([NEEDS_CARD('It is flagged')]);
    }
  });
  it('reads the line of a rule about a card as the kind of the rule: tried after “who”', () => {
    const one = { ...ctx(), vocab: { ...emptyVocab(), playerZones: ['camp'], attributes: ['health'] } };
    expect(matchLine('condition', 'A card in a camp has 0 health', 3, one, ['who', 'which'])).toMatchObject({
      kind: 'which', phrase: 'a card in a {perzone} has {int} {attribute}', args: ['camp', 0, 'health'],
    });
    expect(one.diagnostics).toEqual([]);
  });
});

describe('matchLine and a card that was just drawn', () => {
  const NEEDS_DRAWN = '“They keep this card” only makes sense in a card\'s says column.';

  it('refuses a phrase about the drawn card anywhere but in a card\'s says column, even in a rule about a player', () => {
    for (const about of [{}, { player: true }, { card: true }, { inMove: true, player: true }]) {
      const one = { ...ctx(), player: true, ...about };
      expect(matchLine('effect', 'They keep this card', 4, one)).toMatchObject({ kind: 'lang', phrase: 'missing', args: ['effect'] });
      expect(one.diagnostics.map((d) => [d.line, d.message]), JSON.stringify(about)).toEqual([[4, NEEDS_DRAWN]]);
    }
  });
  it('reads it in a card\'s says column', () => {
    const says = { ...ctx(), player: true, drawn: true };
    expect(matchLine('effect', 'They keep this card', 4, says)).toMatchObject({ kind: 'effect', phrase: 'they keep this card' });
    expect(says.diagnostics).toEqual([]);
  });
  it('asks for the player first, so a rule about no one hears about that', () => {
    const none = { ...ctx(), drawn: false };
    matchLine('effect', 'They keep this card', 4, none);
    expect(none.diagnostics.map((d) => d.message)).toEqual([expect.stringContaining('only makes sense in a rule about a player')]);
  });
});

describe('matchLine and the player a button picks', () => {
  const NEEDS_PICK = '“That player is the rival” only makes sense in a button whose wording ends in “another player”, like “A player may challenge another player.”';
  const rival = () => ({ ...ctx(), vocab: { ...emptyVocab(), facts: [{ name: 'the rival', on: 'player' as const, kind: 'flag' as const }] } });

  it('refuses a phrase that reads the pick anywhere but in a button that picks another player', () => {
    for (const about of [{}, { player: true }, { player: true, space: true }, { player: true, amount: true }]) {
      const one = { ...rival(), ...about };
      expect(matchLine('effect', 'That player is the rival', 4, one)).toMatchObject({ kind: 'lang', phrase: 'missing', args: ['effect'] });
      expect(one.diagnostics.map((d) => [d.line, d.message]), JSON.stringify(about)).toEqual([[4, NEEDS_PICK]]);
    }
  });
  it('reads it in a button that picks another player', () => {
    const picking = { ...rival(), player: true, space: true, picked: true };
    expect(matchLine('effect', 'That player is the rival', 4, picking)).toMatchObject({ kind: 'effect', phrase: 'that player is {playerflag}' });
    expect(picking.diagnostics).toEqual([]);
  });
});

describe('a line run as the player who holds a flag', () => {
  const leading = () => ({ ...ctx(), vocab: { ...emptyVocab(), facts: [{ name: 'leading', on: 'player' as const, kind: 'flag' as const }] } });

  it('reads the rest of the line about that player, even in a rule about no one', () => {
    const none = leading();
    expect(matchEffectLine('For the player who is leading, they cheer.', 5, none)).toEqual({
      kind: 'lang', phrase: 'for', line: 5, text: 'For the player who is leading, they cheer',
      args: ['leading', { kind: 'effect', phrase: 'they cheer', args: [], line: 5, text: 'they cheer' }],
    });
    expect(none.diagnostics).toEqual([]);
  });
  it('refuses a phrase that needs a card move, even in one: the line runs with no move', () => {
    const moving = { ...leading(), inMove: true, player: true };
    expect(matchEffectLine('For the player who is leading, the card flips.', 5, moving)).toMatchObject({
      phrase: 'for', args: ['leading', { kind: 'lang', phrase: 'missing', args: ['effect'] }],
    });
    expect(moving.diagnostics.map((d) => [d.line, d.message])).toEqual([[5, '“the card flips” only makes sense in a rule about a player\'s move.']]);
  });
});

describe('the effect a line runs', () => {
  const effect: PhraseRef = { kind: 'effect', phrase: 'they cheer', args: [], line: 3, text: 'they cheer' };
  const condition: PhraseRef = { kind: 'condition', phrase: 'the bank is empty', args: [], line: 3, text: 'the bank is empty' };

  it('is the line itself, or what an If or For line does', () => {
    expect(innerEffect(effect)).toBe(effect);
    expect(innerEffect({ kind: 'lang', phrase: 'if', args: [condition, effect], line: 3, text: 'If the bank is empty, they cheer' })).toBe(effect);
    expect(innerEffect({ kind: 'lang', phrase: 'for', args: ['leading', effect], line: 3, text: 'For the player who is leading, they cheer' })).toBe(effect);
  });
});

const defaultLibrary = createDefaultLibrary();
const totals = compileGame(TOTALS_GAME, defaultLibrary).game!;
/** The context of a line of TOTALS_GAME, read with the default library, in a rule about what `about` says. */
const totalsCtx = (about: Partial<LineCtx> = {}): LineCtx & { diagnostics: Diagnostic[] } => ({
  ...ctx(), library: defaultLibrary, vocab: vocabFor(totals), gameName: 'Crew', ...about, diagnostics: [],
});

describe('a line run for each card of a group', () => {
  const NEEDS_CARD = (head: string) => `“${head}” only makes sense in a rule about a card, such as “When a card …”.`;

  it('reads the rest of the line about each card, and “they” as whoever the line is about', () => {
    const button = totalsCtx({ player: true, space: true });
    expect(matchEffectLine('For each card in their workshop, it loses its new red.', 5, button)).toEqual({
      kind: 'lang', phrase: 'for each', line: 5, text: 'For each card in their workshop, it loses its new red',
      args: [
        { kind: 'in', zones: [{ of: { who: 'actor' }, zone: 'workshop' }], whose: null },
        { kind: 'effect', phrase: 'it loses its {attribute}', args: ['new red'], line: 5, text: 'it loses its new red' },
      ],
    });
    expect(button.diagnostics).toEqual([]);
  });
  it('(guard: passes before and after) leaves “For the player who is …” to the holder frame', () => {
    const vocab = vocabFor(totals);
    const first = totalsCtx({ vocab: { ...vocab, facts: [...vocab.facts, { name: 'first', on: 'player', kind: 'flag' }] } });
    expect(matchEffectLine('For the player who is first, they get 1 coin.', 5, first)).toMatchObject({
      kind: 'lang', phrase: 'for', args: ['first', { kind: 'effect', phrase: 'they get {int} {counter}', args: [1, 'coins'] }],
    });
    expect(first.diagnostics).toEqual([]);
  });
  it('reads the cards first: a group of their cards needs a player', () => {
    const none = totalsCtx();
    expect(matchEffectLine('For each card in their workshop, they get 1 coin.', 5, none)).toMatchObject({ kind: 'lang', phrase: 'missing', args: ['effect'] });
    expect(none.diagnostics).toEqual([expect.objectContaining({
      line: 5, kind: 'invalid', message: '“For each card in their workshop” only makes sense in a rule about a player\'s move.',
      text: 'For each card in their workshop, they get 1 coin',
    })]);
  });
  it('names a misnamed zone', () => {
    const button = totalsCtx({ player: true });
    expect(matchEffectLine('For each card in their wrokshop, it is tired.', 5, button)).toMatchObject({ kind: 'lang', phrase: 'missing' });
    expect(button.diagnostics).toEqual([expect.objectContaining({
      line: 5, kind: 'invalid', message: 'There is no zone called “wrokshop”.', suggestions: ['workshop'],
    })]);
  });
  it('needs a card for the cards on it', () => {
    const button = totalsCtx({ player: true });
    expect(matchEffectLine('For each card on it, it is tired.', 5, button)).toMatchObject({ kind: 'lang', phrase: 'missing' });
    expect(button.diagnostics.map((d) => [d.line, d.message])).toEqual([[5, NEEDS_CARD('For each card on it')]]);
    const aboutCard = totalsCtx({ card: true });
    expect(matchEffectLine('For each card on it, it is tired.', 5, aboutCard)).toMatchObject({ phrase: 'for each', args: [{ kind: 'on it' }, { phrase: 'it is {cardflag}' }] });
    expect(aboutCard.diagnostics).toEqual([]);
  });
  it('passes on what is wrong with a zone it names', () => {
    const button = totalsCtx({ player: true });
    matchEffectLine('For each card in the crew, it is tired.', 5, button);
    expect(button.diagnostics.map((d) => [d.line, d.message])).toEqual([[5, '“the crew” — whose crew? Say “their crew”, “each crew” or “p1\'s crew”.']]);
  });
  it('names a misnamed number', () => {
    const button = totalsCtx({ player: true });
    matchEffectLine('For each card in the hall whose skil is more than 1, it is tired.', 5, button);
    expect(button.diagnostics).toEqual([expect.objectContaining({ line: 5, message: 'There is no card attribute called “skil”.', suggestions: ['skill'] })]);
  });
  it('says “which cards” for a line that names none before its comma', () => {
    const button = totalsCtx({ player: true });
    expect(matchEffectLine('For each card, it is tired.', 5, button)).toMatchObject({ kind: 'lang', phrase: 'missing' });
    matchEffectLine('For each card.', 6, button);
    const WHICH = '“For each card” doesn\'t say which cards. Write “For each card in their hand, …” or “For each card on it, …”.';
    expect(button.diagnostics.map((d) => [d.line, d.message])).toEqual([[5, WHICH], [6, WHICH]]);
  });
  it('says “which cards” for words that are no group', () => {
    const button = totalsCtx({ player: true });
    matchEffectLine('For each card picked, it is tired.', 5, button);
    expect(button.diagnostics.map((d) => [d.line, d.message])).toEqual([
      [5, '“picked” doesn\'t say which cards. Write “For each card in their hand, …” or “For each card on it, …”.'],
    ]);
  });
  it('runs its effect with no card move, so a phrase that needs one is refused even in one', () => {
    const moving = totalsCtx({ inMove: true, player: true, card: true });
    expect(matchEffectLine('For each card in their workshop, they pay the card\'s pay.', 5, moving)).toMatchObject({
      phrase: 'for each', args: [{ kind: 'in' }, { kind: 'lang', phrase: 'missing' }],
    });
    expect(moving.diagnostics.map((d) => d.message)).toEqual(['“they pay the card\'s pay” only makes sense in a rule about a player\'s move.']);
  });
  it('runs its effect about no card just drawn, even in a card\'s says column: “this card” is not the card walked', () => {
    const says = totalsCtx({ player: true, drawn: true });
    expect(matchEffectLine('They keep this card in their stash.', 4, says)).toMatchObject({ kind: 'effect', phrase: 'they keep this card in their {perzone}' });
    expect(matchEffectLine('For each card in their workshop, they keep this card in their stash.', 5, says)).toMatchObject({
      phrase: 'for each', args: [{ kind: 'in' }, { kind: 'lang', phrase: 'missing' }],
    });
    expect(says.diagnostics.map((d) => [d.line, d.message])).toEqual([[5, '“they keep this card in their stash” only makes sense in a card\'s says column.']]);
  });
  it('cuts the line at the first comma where both parts read', () => {
    const button = totalsCtx({ player: true });
    expect(matchEffectLine('For each card in their crew and their idle, it is tired.', 5, button)).toMatchObject({
      phrase: 'for each', args: [{ zones: [{ of: { who: 'actor' }, zone: 'crew' }, { of: { who: 'actor' }, zone: 'idle' }] }, { phrase: 'it is {cardflag}' }],
    });
    expect(button.diagnostics).toEqual([]);
  });
  it('asks what happens to each card when nothing follows a comma', () => {
    const button = totalsCtx({ player: true });
    expect(matchEffectLine('For each card in their workshop.', 5, button)).toMatchObject({ kind: 'lang', phrase: 'missing' });
    expect(button.diagnostics.map((d) => d.message)).toEqual([expect.stringContaining('Say what happens to each card')]);
  });
});

describe('a group of cards a phrase reads', () => {
  it('needs a card for the cards on it', () => {
    const none = totalsCtx();
    expect(matchLine('condition', 'the total wage of the cards on it is 0', 4, none)).toMatchObject({ kind: 'lang', phrase: 'missing' });
    expect(none.diagnostics.map((d) => [d.line, d.message])).toEqual([
      [4, '“the total wage of the cards on it is 0” only makes sense in a rule about a card, such as “When a card …”.'],
    ]);
    const aboutCard = totalsCtx({ card: true });
    expect(matchLine('condition', 'the total wage of the cards on it is 0', 4, aboutCard)).toMatchObject({ kind: 'condition' });
    expect(aboutCard.diagnostics).toEqual([]);
  });
  it('needs a button that picks some cards for the picked cards', () => {
    const button = totalsCtx({ player: true, space: true });
    expect(matchLine('condition', 'the total wage of the picked cards is 0', 4, button)).toMatchObject({ kind: 'lang', phrase: 'missing' });
    expect(button.diagnostics.map((d) => [d.line, d.message])).toEqual([
      [4, '“the total wage of the picked cards is 0” only makes sense in a button that picks some cards, like “A player may discard some cards from their hand.”'],
    ]);
    const picking = totalsCtx({ player: true, cards: true });
    expect(matchLine('condition', 'the total wage of the picked cards is 0', 4, picking)).toMatchObject({ kind: 'condition' });
    expect(picking.diagnostics).toEqual([]);
  });
  it('needs a player for their cards', () => {
    const none = totalsCtx();
    matchLine('condition', 'the total wage of the cards in their crew is 0', 4, none);
    expect(none.diagnostics.map((d) => d.message)).toEqual(['“the total wage of the cards in their crew is 0” only makes sense in a rule about a player\'s move.']);
  });
});

describe('the effect a line run for each card runs', () => {
  it('is the line it runs for each card', () => {
    const effect: PhraseRef = { kind: 'effect', phrase: 'it is {cardflag}', args: ['tired'], line: 3, text: 'it is tired' };
    expect(innerEffect({ kind: 'lang', phrase: 'for each', args: [{ kind: 'on it' }, effect], line: 3, text: 'For each card on it, it is tired' })).toBe(effect);
  });
});
