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
    expect(diagnostics).toEqual([expect.objectContaining({ line: 3, severity: 'error', message: 'This row has 1 cells but the header has 2.' })]);
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
});
