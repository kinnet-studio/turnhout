import { describe, expect, it } from 'vitest';
import { parseOutline } from './outline';

describe('parseOutline', () => {
  it('nests by indentation and keeps 1-based line numbers', () => {
    const { roots, diagnostics } = parseOutline('Phase: a\n  When x:\n    Do y.\n  Hint: z\nEnd:');
    expect(diagnostics).toEqual([]);
    expect(roots.map((r) => [r.text, r.line])).toEqual([['Phase: a', 1], ['End:', 5]]);
    expect(roots[0].children.map((c) => c.text)).toEqual(['When x:', 'Hint: z']);
    expect(roots[0].children[0].children[0]).toMatchObject({ text: 'Do y.', line: 3 });
  });

  it('treats CRLF and tabs like LF and two spaces', () => {
    expect(parseOutline('A:\r\n\tB\r\n\t\tC').roots).toEqual(parseOutline('A:\n  B\n    C').roots);
  });

  it('expands a tab to two spaces so it lines up with a two-space sibling', () => {
    const { roots, diagnostics } = parseOutline('A:\n  B\n\tC');
    expect(diagnostics).toEqual([]);
    expect(roots.map((r) => r.text)).toEqual(['A:']);
    expect(roots[0].children.map((c) => c.text)).toEqual(['B', 'C']);
  });

  it('gives a CRLF, tab-indented document the same result as its LF, space twin', () => {
    const spaces = [
      '# header comment',
      'Cards:',
      '  A deck:',
      '    | color | number |',
      '    | red   | 1 to 9 |',
      '',
      '    | blue  |',
      '  # inner comment',
      '  Note',
    ].join('\n');
    const tabs = [
      '# header comment',
      'Cards:',
      '\tA deck:',
      '\t\t| color | number |',
      '\t\t| red   | 1 to 9 |',
      '',
      '\t\t| blue  |',
      '\t# inner comment',
      '\tNote',
    ].join('\r\n');
    const expected = parseOutline(spaces);
    // Guard against two equally wrong results: the twin must actually have content.
    expect(expected.diagnostics).toEqual([
      { line: 7, severity: 'error', kind: 'structure', message: 'This row has 1 cell but the header has 2.' },
    ]);
    expect(expected.roots[0].children.map((c) => [c.text, c.line])).toEqual([['A deck:', 3], ['Note', 9]]);
    expect(expected.roots[0].children[0].table?.rows.map((r) => r.line)).toEqual([5, 7]);
    expect(parseOutline(tabs)).toEqual(expected);
  });

  it('ignores a leading byte-order mark', () => {
    const { roots, diagnostics } = parseOutline('\uFEFFA:\n  B');
    expect(diagnostics).toEqual([]);
    expect(roots.map((r) => r.text)).toEqual(['A:']);
    expect(roots[0].children.map((c) => c.text)).toEqual(['B']);
    // A BOM must not count as indentation: C is a sibling of A, not a misaligned dedent.
    const sibling = parseOutline('\uFEFFA:\n  B\nC:');
    expect(sibling.diagnostics).toEqual([]);
    expect(sibling.roots.map((r) => r.text)).toEqual(['A:', 'C:']);
  });

  it('skips blank lines and # comments without shifting line numbers', () => {
    const { roots } = parseOutline('# note\n\nA:\n  # inner\n  B');
    expect(roots[0]).toMatchObject({ text: 'A:', line: 3 });
    expect(roots[0].children[0]).toMatchObject({ text: 'B', line: 5 });
  });

  it('attaches table rows to the line they are nested under', () => {
    const { roots } = parseOutline('Cards:\n  A deck:\n    | color | number |\n    | red   | 1 to 9 |');
    expect(roots[0].children[0].table).toEqual({ columns: ['color', 'number'], rows: [{ cells: ['red', '1 to 9'], line: 4 }] });
    expect(roots[0].children[0].children).toEqual([]);
  });

  it('reports a row whose cell count differs from the header', () => {
    const { diagnostics } = parseOutline('A:\n  | a | b |\n  | 1 |');
    expect(diagnostics).toEqual([expect.objectContaining({ line: 3, severity: 'error', message: 'This row has 1 cell but the header has 2.' })]);
  });

  it('reports a dedent that matches no open level', () => {
    const { diagnostics } = parseOutline('A:\n    B\n  C');
    expect(diagnostics[0]).toMatchObject({ line: 3, kind: 'structure' });
  });

  it('attaches a misaligned dedent to the nearest shallower parent', () => {
    const { roots, diagnostics } = parseOutline('A:\n    B\n  C');
    expect(diagnostics).toEqual([
      { line: 3, severity: 'error', kind: 'structure', message: "This line's indentation doesn't line up with any line above." },
    ]);
    expect(roots[0].children.map((c) => c.text)).toEqual(['B', 'C']);
  });

  it('reports a table row that is not nested under any line', () => {
    const { roots, diagnostics } = parseOutline('| a | b |\nA:');
    expect(diagnostics).toEqual([expect.objectContaining({ line: 1, severity: 'error', kind: 'structure' })]);
    expect(roots.map((r) => r.text)).toEqual(['A:']);
  });

  it('keeps empty inner cells and drops only the outer empties', () => {
    const { roots } = parseOutline('A:\n  | a | b |\n  | 1 |  |\n  | x | y');
    expect(roots[0].table?.rows.map((r) => r.cells)).toEqual([['1', ''], ['x', 'y']]);
  });

  it('says cells when the row count is not one', () => {
    const { diagnostics } = parseOutline('A:\n  | a |\n  | 1 | 2 |');
    expect(diagnostics).toEqual([expect.objectContaining({ line: 3, message: 'This row has 2 cells but the header has 1.' })]);
  });
});
