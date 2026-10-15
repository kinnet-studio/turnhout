import type { BoardView, SpaceView } from '@/engine/core/lang/board-view';
import { ringCells, ringSize } from './board-ring';
import { seatColor } from './seat-colors';
import { spaceColor } from './space-colors';

const MARK = 10;

/** What pointing at a space says: its name, then everything the table says about it. */
function hoverText({ name, details }: SpaceView): string {
  const attrs = Object.entries(details).map(([k, v]) => `${k} ${v}`).join(', ');
  return attrs === '' ? name : `${name} — ${attrs}`;
}

/** The seats standing on each space, by the space's place in the loop. */
function piecesBySpace(pieces: BoardView['pieces']): Map<number, string[]> {
  const bySpace = new Map<number, string[]>();
  for (const [seat, at] of Object.entries(pieces)) bySpace.set(at, [...(bySpace.get(at) ?? []), seat]);
  return bySpace;
}

function Space({ space, seats, row, col }: { space: SpaceView; seats: string[]; row: number; col: number }) {
  const paint = spaceColor(space.color);
  return (
    <div
      title={hoverText(space)}
      style={{
        gridRow: row + 1, gridColumn: col + 1, minWidth: 0, minHeight: 0, overflow: 'hidden', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', background: '#f4f1e6', color: '#1f2937', border: '1px solid #6b7280',
        font: '8px/1.1 sans-serif',
      }}
    >
      {paint !== null && <div data-testid="band" style={{ flex: '0 0 auto', height: '22%', minHeight: 5, background: paint }} />}
      <div style={{ flex: '1 1 auto', minHeight: 0, padding: '1px 2px', textAlign: 'center', overflow: 'hidden', overflowWrap: 'anywhere' }}>{space.name}</div>
      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, padding: 2, minHeight: MARK + 4 }}>
        {space.owner !== null
          ? <span title={`Owned by ${space.owner}`} style={{ width: MARK, height: MARK, borderRadius: 2, boxSizing: 'border-box', border: '1px solid #111827', backgroundColor: seatColor(space.owner) }} />
          : <span />}
        <span style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 2 }}>
          {seats.map((seat) => (
            <span key={seat} title={seat} style={{ width: MARK, height: MARK, borderRadius: '50%', boxSizing: 'border-box', border: '1px solid #fff', boxShadow: '0 0 0 1px #111827', backgroundColor: seatColor(seat) }} />
          ))}
        </span>
      </div>
    </div>
  );
}

function Dice({ roll }: { roll: number[] }) {
  return (
    <div role="img" aria-label={`Rolled ${roll.join(' and ')}`} style={{ display: 'flex', gap: 10 }}>
      {roll.map((face, i) => (
        <span
          key={i}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 8,
            background: '#fff', color: '#111827', border: '2px solid #111827', font: 'bold 24px sans-serif',
          }}
        >
          {face}
        </span>
      ))}
    </div>
  );
}

/** The board as a square loop, clockwise from the bottom-right corner, with the latest roll in the middle. */
export function BoardGrid({ board }: { board: BoardView }) {
  const size = ringSize(board.spaces.length);
  const cells = ringCells(board.spaces.length);
  const bySpace = piecesBySpace(board.pieces);
  return (
    <div
      style={{
        display: 'grid', gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
        width: '100%', maxWidth: 560, aspectRatio: '1 / 1', background: '#6b7280', gap: 1, border: '1px solid #6b7280', boxSizing: 'border-box',
      }}
    >
      {board.spaces.map((space, i) => (
        <Space key={i} space={space} seats={bySpace.get(i) ?? []} row={cells[i].row} col={cells[i].col} />
      ))}
      {size > 2 && (
        <div style={{ gridRow: `2 / ${size}`, gridColumn: `2 / ${size}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#cfe3d2' }}>
          {board.roll !== null && <Dice roll={board.roll} />}
        </div>
      )}
    </div>
  );
}
