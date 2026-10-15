import { describe, expect, it } from 'vitest';
import { matchLine, type LineCtx } from './compile-util';
import type { Diagnostic } from './diagnostics';
import { PhraseLibrary, STATIC_TYPES, emptyVocab } from './phrases';
import { VOCAB_TYPES } from './refs';

const library = new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES])
  .cards('a deck called {name}', () => ({ kind: 'table', identities: [], start: 'deck', acesHigh: false }))
  .board('there are {count} dice', () => ({ kind: 'dice', count: 1, sides: 6 }))
  .declare('spaces can have {factlist}', () => [])
  .condition('the bank is empty', () => true);

const ctx = (): LineCtx & { diagnostics: Diagnostic[] } =>
  ({ library, vocab: emptyVocab(), gameName: 'Test', inMove: false, player: false, space: false, diagnostics: [] });

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
