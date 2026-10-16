import { describe, expect, it } from 'vitest';
import { matchLine, type LineCtx } from './compile-util';
import type { Diagnostic } from './diagnostics';
import { PhraseLibrary, STATIC_TYPES, emptyVocab } from './phrases';
import { VOCAB_TYPES } from './refs';

const library = new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES])
  .cards('a deck called {name}', () => ({ kind: 'table', identities: [], start: 'deck', acesHigh: false }))
  .board('there are {count} dice', () => ({ kind: 'dice', count: 1, sides: 6 }))
  .declare('spaces can have {factlist}', () => [])
  .condition('the bank is empty', () => true)
  .condition('it is flagged', () => true, { needsCard: true })
  .effect('move it away', (env) => env.state, { needsCard: true })
  .effect('they keep this card', (env) => env.state, { needsPlayer: true, needsDrawnCard: true })
  .effect('that player is {playerflag}', (env) => env.state, { needsPick: true })
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
