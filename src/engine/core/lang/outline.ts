import type { Diagnostic } from './diagnostics';

export type OutlineTable = { columns: string[]; rows: { cells: string[]; line: number }[] };
export type OutlineNode = { text: string; line: number; children: OutlineNode[]; table: OutlineTable | null };

type Open = { indent: number; node: OutlineNode };

/** Splits `| a | b |` into trimmed cells, dropping the empties outside the outer pipes. */
function splitCells(trimmed: string): string[] {
  const cells = trimmed.split('|').map((c) => c.trim());
  cells.shift();
  if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
  return cells;
}

/**
 * First pipeline stage: turns designer text into an indentation tree.
 * Blank lines and `#` comments are skipped, `|` lines become the table of the
 * line they are nested under, and `line` always points into the original text.
 */
export function parseOutline(text: string): { roots: OutlineNode[]; diagnostics: Diagnostic[] } {
  const roots: OutlineNode[] = [];
  const diagnostics: Diagnostic[] = [];
  const open: Open[] = [];

  // A leading byte-order mark is an encoding marker, not part of the first line's indentation.
  text.replace(/^\uFEFF/, '').split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const expanded = raw.replace(/\t/g, '  ').trimEnd();
    const trimmed = expanded.trim();
    if (trimmed === '' || trimmed.startsWith('#')) return;
    const indent = expanded.length - expanded.trimStart().length;

    if (trimmed.startsWith('|')) {
      // A table belongs to the nearest open line indented less than the row.
      let owner: OutlineNode | undefined;
      for (let i = open.length - 1; i >= 0; i--) {
        if (open[i].indent < indent) {
          owner = open[i].node;
          break;
        }
      }
      if (!owner) {
        diagnostics.push({ line, severity: 'error', kind: 'structure', message: 'This table row is not nested under any line above.' });
        return;
      }
      const cells = splitCells(trimmed);
      if (!owner.table) {
        owner.table = { columns: cells, rows: [] };
        return;
      }
      if (cells.length !== owner.table.columns.length) {
        diagnostics.push({
          line,
          severity: 'error',
          kind: 'structure',
          message: `This row has ${cells.length} ${cells.length === 1 ? 'cell' : 'cells'} but the header has ${owner.table.columns.length}.`,
        });
      }
      owner.table.rows.push({ cells, line });
      return;
    }

    // Close every level deeper than this line; a dedent must land on an open level.
    let closedDeeper = false;
    while (open.length > 0 && open[open.length - 1].indent > indent) {
      open.pop();
      closedDeeper = true;
    }
    if (open.length > 0 && open[open.length - 1].indent === indent) {
      open.pop();
    } else if (closedDeeper) {
      diagnostics.push({
        line,
        severity: 'error',
        kind: 'structure',
        message: "This line's indentation doesn't line up with any line above.",
      });
    }

    const node: OutlineNode = { text: trimmed, line, children: [], table: null };
    const parent = open.length > 0 ? open[open.length - 1].node : undefined;
    (parent ? parent.children : roots).push(node);
    open.push({ indent, node });
  });

  return { roots, diagnostics };
}
