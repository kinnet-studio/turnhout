import { describe, expect, it } from 'vitest';
import { PhraseLibrary, STATIC_TYPES, emptyVocab, stubFor } from './phrases';
import type { ParamType } from './types';

const V = emptyVocab();
const lib = () => new PhraseLibrary(STATIC_TYPES);

describe('PhraseLibrary.match', () => {
  it('ignores case, extra spaces and one trailing period', () => {
    const l = lib().effect('deal {int} cards', (env) => env.state);
    expect(l.match('effect', 'Deal  3 cards.', V)).toEqual({ status: 'ok', pattern: 'deal {int} cards', args: [3] });
  });

  it('supports an optional (s)', () => {
    const l = lib().score('scores {int} point(s)', () => 0);
    expect(l.match('score', 'scores 1 point', V).status).toBe('ok');
    expect(l.match('score', 'scores 2 points', V).status).toBe('ok');
  });

  it('{string} accepts straight and curly quotes and keeps case', () => {
    const l = lib().expect('it is rejected because {string}', () => true);
    expect(l.match('expect', 'It is rejected because “They Can’t”.', V)).toMatchObject({ status: 'ok', args: ['They Can’t'] });
    expect(l.match('expect', 'it is rejected because "x"', V)).toMatchObject({ status: 'ok', args: ['x'] });
  });

  it('keeps kinds separate', () => {
    const l = lib().condition('hearts are broken', () => true).effect('hearts are broken', (e) => e.state);
    expect(l.match('condition', 'Hearts are broken', V).status).toBe('ok');
    expect(l.match('effect', 'Hearts are broken', V).status).toBe('ok');
    expect(l.match('turn', 'Hearts are broken', V).status).toBe('unknown');
  });

  it('reports ambiguity', () => {
    const l = lib().effect('move {name}', (e) => e.state).effect('move the {name}', (e) => e.state);
    expect(l.match('effect', 'move the deck', V)).toEqual({ status: 'ambiguous', patterns: ['move {name}', 'move the {name}'] });
  });

  it('suggests the closest phrases of the same kind', () => {
    const l = lib()
      .effect('shuffle {name}', (e) => e.state)
      .effect('deal {int} cards from the deck', (e) => e.state)
      .effect('flip a coin', (e) => e.state);
    const r = l.match('effect', 'Deal 3 card from the deck', V);
    expect(r.status).toBe('unknown');
    if (r.status === 'unknown') {
      expect(r.suggestions[0]).toBe('deal [number] cards from the deck');
      expect(r.suggestions).not.toContain('flip a coin');
    }
  });

  it('reports a parameter that fails to resolve as invalid', () => {
    const even: ParamType = { name: 'even', label: '[even]', source: () => '\\d+', resolve: (t) => (Number(t) % 2 === 0 ? { value: Number(t) } : { error: `${t} is odd` }) };
    const l = new PhraseLibrary([...STATIC_TYPES, even]).condition('{even} things', () => true);
    expect(l.match('condition', '3 things', V)).toEqual({ status: 'invalid', message: '3 is odd' });
  });

  it('rejects unknown parameter types at registration', () => {
    expect(() => lib().effect('do {foo}', (e) => e.state)).toThrow('unknown parameter type {foo} in "do {foo}"');
  });

  it('resolves the static parameter types', () => {
    const l = lib().zone('{name} is a {layout} that {visibility}, tagged {word}', () => ({ name: '', perPlayer: false, layout: 'pile', visibility: 'secret' }));
    expect(l.match('zone', 'The Deck is a Row that Only they can see, tagged X1.', V)).toEqual({
      status: 'ok',
      pattern: '{name} is a {layout} that {visibility}, tagged {word}',
      args: ['the deck', 'row', 'owner', 'X1'],
    });
  });

  it('finds a phrase from a typo', () => {
    const l = lib().effect('shuffle {name}', (e) => e.state).effect('flip a coin', (e) => e.state);
    expect(l.match('effect', 'Shufle the deck', V)).toEqual({ status: 'unknown', suggestions: ['shuffle [name]'] });
  });

  it('looks a registered phrase up by kind and pattern', () => {
    const fn = () => true;
    const l = lib().condition('it is their move', fn, { needsMove: true }).condition('hearts are broken', () => true);
    expect(l.get('condition', 'it is their move')).toEqual({ fn, needsMove: true });
    expect(l.get('condition', 'hearts are broken')?.needsMove).toBe(false);
    expect(l.get('effect', 'it is their move')).toBeUndefined();
  });
});

describe('stubFor', () => {
  it('writes a ready-to-paste stub with typed parameters', () => {
    expect(stubFor('effect', 'The winner draws 2 cards.', V, STATIC_TYPES, { game: 'Hearts', line: 31 })).toBe(
      [
        '// Requested by a designer — game "Hearts", line 31:',
        '//   "The winner draws 2 cards"',
        "library.effect('the winner draws {int} cards', (env, [a1]) => {",
        "  throw new Error('not implemented yet');",
        '});',
      ].join('\n'),
    );
  });

  it('replaces quoted text before numbers and matches the callback to the kind', () => {
    expect(stubFor('score', 'Scores 3 points for "Hearts".', V, STATIC_TYPES, { game: 'G', line: 2 })).toContain(
      "library.score('scores {int} points for {string}', (env, [a1, a2], seat) => {",
    );
  });

  it('escapes apostrophes in the pattern', () => {
    expect(stubFor('condition', "It's their turn", V, STATIC_TYPES, { game: 'G', line: 2 })).toContain("library.condition('it\\'s their turn', (env) => {");
  });
});
