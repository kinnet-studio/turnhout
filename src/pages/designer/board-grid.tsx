import type { KeyboardEvent } from 'react';
import type { BoardView, SpaceView } from '@/engine/core/lang/board-view';
import { ringCells, ringSize } from './board-ring';
import { counted } from './counted';
import { seatColor } from './seat-colors';
import { spaceColor } from './space-colors';

const MARK = 10;
/** Up to this many of a count are drawn one by one; more than that is one mark and the number. */
const MAX_MARKS = 4;
/** The smallest a band is while it holds marks; the marks themselves are drawn at 70% of the band, so they grow with the space. */
const FACT_BAND_MIN = 9;

/** Picking a space: `spaces` is each space the button may be pointed at, by its place on the board, and whether it takes it. */
export type Picking = {
  prompt: string;
  spaces: { [space: string]: true | string };
  onPick(space: number): void;
  onRefused(reason: string): void;
};

/** What has come to be true of a space, as the view says it; a count of 0 and a flag that is off are nothing to show. */
const factsOf = ({ facts }: SpaceView): [string, number | boolean][] =>
  Object.entries(facts).filter(([, value]) => value !== 0 && value !== false);

/** What pointing at a space says: its name, then what has come to be true of it, then everything the table says about it. */
function hoverText(space: SpaceView): string {
  const said = [
    ...factsOf(space).map(([fact, value]) => (typeof value === 'number' ? counted(value, fact) : fact)),
    ...Object.entries(space.details).map(([k, v]) => `${k} ${v}`),
  ];
  return said.length === 0 ? space.name : `${space.name} — ${said.join(', ')}`;
}

const markStyle = { flex: '0 0 auto', height: '70%', boxSizing: 'border-box', border: '1px solid #111827' } as const;

/** A count as small squares, a larger one as a single square and the number; a flag that is on as a red block. */
function factMarks(space: SpaceView) {
  return factsOf(space).flatMap(([fact, value]) => {
    if (typeof value === 'boolean') {
      return [<span key={fact} data-testid="flag" style={{ ...markStyle, aspectRatio: '1.6 / 1', background: '#dc2626' }} />];
    }
    const square = (key: string) => <span key={key} data-testid="house" style={{ ...markStyle, aspectRatio: '1 / 1', background: '#16a34a' }} />;
    if (value <= MAX_MARKS) return Array.from({ length: value }, (_, i) => square(`${fact}-${i}`));
    return [
      square(fact),
      <span key={`${fact}-count`} style={{ padding: '0 2px', borderRadius: 2, background: '#fff', color: '#111827', font: 'bold 8px/9px sans-serif' }}>{value}</span>,
    ];
  });
}

/** The seats standing on each space, by the space's place in the loop. */
function piecesBySpace(pieces: BoardView['pieces']): Map<number, string[]> {
  const bySpace = new Map<number, string[]>();
  for (const [seat, at] of Object.entries(pieces)) bySpace.set(at, [...(bySpace.get(at) ?? []), seat]);
  return bySpace;
}

/** What a space is while the player picks one: open to be picked, refused (with why), or not one of the choices. */
function pickProps(index: number, name: string, picking: Picking | undefined) {
  if (!picking) return { style: {} };
  const verdict = picking.spaces[String(index)];
  if (verdict === undefined) return { style: { opacity: 0.35 } };
  const press = () => (verdict === true ? picking.onPick(index) : picking.onRefused(verdict));
  return {
    role: 'button',
    'aria-label': `Pick ${name}`,
    'aria-disabled': verdict !== true,
    tabIndex: 0,
    onClick: press,
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      press();
    },
    style: verdict === true
      ? { cursor: 'pointer', outline: '3px solid #f59e0b', outlineOffset: -3 }
      : { cursor: 'not-allowed', outline: '2px dashed #6b7280', outlineOffset: -2 },
  };
}

function Space({ space, seats, row, col, index, picking }: {
  space: SpaceView; seats: string[]; row: number; col: number; index: number; picking: Picking | undefined;
}) {
  const paint = spaceColor(space.color);
  const marks = factMarks(space);
  const { style: pickStyle, ...pick } = pickProps(index, space.name, picking);
  return (
    <div
      title={hoverText(space)}
      {...pick}
      style={{
        gridRow: row + 1, gridColumn: col + 1, minWidth: 0, minHeight: 0, overflow: 'hidden', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', background: '#f4f1e6', color: '#1f2937', border: '1px solid #6b7280',
        font: '8px/1.1 sans-serif', ...pickStyle,
      }}
    >
      {(paint !== null || marks.length > 0) && (
        <div
          data-testid={paint !== null ? 'band' : undefined}
          style={{ flex: '0 0 auto', height: '22%', minHeight: marks.length > 0 ? FACT_BAND_MIN : 5, background: paint ?? 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}
        >
          {marks}
        </div>
      )}
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

/**
 * The board as a square loop, clockwise from the bottom-right corner, with the latest roll in the middle. While the player
 * picks a space, the ones they may pick are outlined, the ones the game refuses are dashed, and the rest fade.
 */
export function BoardGrid({ board, picking }: { board: BoardView; picking?: Picking }) {
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
        <Space key={i} space={space} seats={bySpace.get(i) ?? []} row={cells[i].row} col={cells[i].col} index={i} picking={picking} />
      ))}
      {size > 2 && (
        <div style={{ gridRow: `2 / ${size}`, gridColumn: `2 / ${size}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#cfe3d2' }}>
          {picking && <div style={{ padding: '0 12px', textAlign: 'center', font: 'bold 16px sans-serif', color: '#14532d' }}>{picking.prompt}</div>}
          {board.roll !== null && <Dice roll={board.roll} />}
        </div>
      )}
    </div>
  );
}
