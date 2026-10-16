import type { KeyboardEvent } from 'react';
import type { BoardView, SpaceView } from '@/engine/core/lang/board-view';
import { counted } from '@/engine/core/lang/refs';
import { ringCells, ringSize } from './board-ring';
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

type Facts = { [fact: string]: number | boolean };

/** What is true of something, in the order given: a flag that is on by its name, a count other than 0 with its number. */
export function factWords(facts: Facts): string[] {
  return Object.entries(facts)
    .filter(([, value]) => value !== 0 && value !== false)
    .map(([fact, value]) => (typeof value === 'number' ? counted(value, fact) : fact));
}

/** A seat and what is true of it: "p0 (asleep, 2 naps)"; null when nothing is, and the seat is then left bare. */
function seatWithFacts(seat: string, facts: Facts | undefined): string | null {
  const words = factWords(facts ?? {});
  return words.length === 0 ? null : `${seat} (${words.join(', ')})`;
}

/** A piece is ringed when its player has any yes/no fact set to yes; a count alone is no reason to stand out. */
const rings = (facts: Facts | undefined): boolean => Object.values(facts ?? {}).some((value) => value === true);

/**
 * What pointing at a space says: its name, then the players on it who have facts set, then what has come to be true of the
 * space, then everything the table says about it.
 */
function hoverText(space: SpaceView, seats: string[], playerFacts: BoardView['playerFacts']): string {
  const said = [
    ...seats.flatMap((seat) => seatWithFacts(seat, playerFacts[seat]) ?? []),
    ...factWords(space.facts),
    ...Object.entries(space.details).map(([k, v]) => `${k} ${v}`),
  ];
  return said.length === 0 ? space.name : `${space.name} — ${said.join(', ')}`;
}

const PIECE_SHADOW = '0 0 0 1px #111827';
/**
 * Outside the piece's usual outline: a white band between two dark edges, so it shows on a pale space and on any seat's
 * color. The ring reaches 4px out and the space clips at its padding, so the piece keeps that much room around it.
 */
const RING_STYLE = { boxShadow: `${PIECE_SHADOW}, 0 0 0 3px #fff, 0 0 0 4px #111827`, margin: 2 } as const;

/**
 * Diagonal bars across a striped space's whole face: dark ones for a pale space, light ones between them so a dark color band
 * shows them too. They pass clicks through to the space, and sit under its name, its tags and its row of owner and pieces.
 */
const STRIPE_FILL = 'repeating-linear-gradient(135deg, rgba(17, 24, 39, 0.3) 0 3px, rgba(255, 255, 255, 0.4) 3px 6px)';
/** Above the stripes, so what the space says stays readable. */
const ABOVE_STRIPES = { position: 'relative', zIndex: 2 } as const;
/**
 * The pick outline is a layer of its own over the whole space, above the stripes: drawn on the space itself, the stripes
 * would paint over it, and an outline that may be picked would look dashed, as a refused one does.
 */
const OUTLINE_LAYER = { position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' } as const;

/**
 * A dark label with light text, which shows on a pale space and on any color band alike. It sits above the stripes, which look the
 * same whatever the flag is, so the tag is what tells one striped space from another.
 */
const TAG_STYLE = { padding: '0 2px', borderRadius: 2, background: '#111827', color: '#fff', font: 'bold 7px/8px sans-serif' } as const;

/**
 * The size and line of a striped space's name, one line of which it always keeps. A space is about 50px tall, and a striped one
 * holds its band, its tags, a name of two lines and a row of owner and ringed pieces: the tags lie over the band (which grows to
 * hold them), and the name and that row take less room there (a smaller name on tight lines with no padding round it, and a row
 * that is the mark and its padding in all, not on top of them), so a tag never covers a line of the name.
 */
const NAME_LINE = 7;

const markStyle = { flex: '0 0 auto', height: '70%', boxSizing: 'border-box', border: '1px solid #111827' } as const;

/**
 * A count as small squares, a larger one as a single square and the number; a flag that is on as a red block, unless no bank
 * item goes with it: the space is striped for those (`stripes` in its view), and a block as well would say it twice.
 */
function factMarks(space: SpaceView) {
  return factsOf(space).filter(([fact]) => !space.stripes.includes(fact)).flatMap(([fact, value]) => {
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

/**
 * What a space is while the player picks one: open to be picked, refused (with why), or not one of the choices. `outline`
 * is the style of the layer that outlines a space that is one of the choices; null for the others.
 */
function pickProps(index: number, name: string, picking: Picking | undefined) {
  if (!picking) return { style: {}, outline: null };
  const verdict = picking.spaces[String(index)];
  if (verdict === undefined) return { style: { opacity: 0.35 }, outline: null };
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
    style: { cursor: verdict === true ? 'pointer' : 'not-allowed' },
    outline: verdict === true ? { outline: '3px solid #f59e0b', outlineOffset: -3 } : { outline: '2px dashed #6b7280', outlineOffset: -2 },
  };
}

/** A seat's piece in its color; its title says what is true of the player, and a yes/no fact that is on rings it. */
function Piece({ seat, facts }: { seat: string; facts: Facts | undefined }) {
  const ringed = rings(facts);
  return (
    <span
      title={seatWithFacts(seat, facts) ?? seat}
      data-ring={ringed ? 'true' : undefined}
      style={{ width: MARK, height: MARK, borderRadius: '50%', boxSizing: 'border-box', border: '1px solid #fff', ...(ringed ? RING_STYLE : { boxShadow: PIECE_SHADOW }), backgroundColor: seatColor(seat) }}
    />
  );
}

function Space({ space, seats, playerFacts, row, col, index, picking }: {
  space: SpaceView; seats: string[]; playerFacts: BoardView['playerFacts']; row: number; col: number; index: number; picking: Picking | undefined;
}) {
  const paint = spaceColor(space.color);
  const marks = factMarks(space);
  const striped = space.stripes.length > 0;
  const { style: pickStyle, outline, ...pick } = pickProps(index, space.name, picking);
  // The color band, and what the space has drawn on it; on a striped space it fills the top it shares with the tags.
  const band = (paint !== null || marks.length > 0) && (
    <div
      data-testid={paint !== null ? 'band' : undefined}
      style={{
        flex: '0 0 auto', ...(striped ? { gridArea: '1 / 1' } : { height: '22%' }), minHeight: marks.length > 0 ? FACT_BAND_MIN : 5,
        background: paint ?? 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
      }}
    >
      {marks}
    </div>
  );
  return (
    <div
      title={hoverText(space, seats, playerFacts)}
      data-stripes={striped ? space.stripes.join(' ') : undefined}
      {...pick}
      style={{
        position: 'relative', gridRow: row + 1, gridColumn: col + 1, minWidth: 0, minHeight: 0, overflow: 'hidden', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', background: '#f4f1e6', color: '#1f2937', border: '1px solid #6b7280',
        font: '8px/1.1 sans-serif', ...pickStyle,
      }}
    >
      {striped ? (
        // The band and the tags share the top of the space, the tags over the band, which is as tall as they need.
        <div style={{ flex: '0 0 auto', display: 'grid', minHeight: '22%' }}>
          {band}
          <div style={{ ...ABOVE_STRIPES, gridArea: '1 / 1', display: 'flex', flexWrap: 'wrap', alignContent: 'center', justifyContent: 'center', columnGap: 1, padding: '0 1px' }}>
            {space.stripes.map((flag) => <span key={flag} data-testid="tag" style={TAG_STYLE}>{flag}</span>)}
          </div>
        </div>
      ) : band}
      {striped && <div aria-hidden="true" data-testid="stripes" style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', backgroundImage: STRIPE_FILL }} />}
      <div style={{ ...ABOVE_STRIPES, flex: '1 1 auto', minHeight: striped ? NAME_LINE : 0, padding: striped ? '0 2px' : '1px 2px', font: striped ? `${NAME_LINE}px/1 sans-serif` : undefined, textAlign: 'center', overflow: 'hidden', overflowWrap: 'anywhere' }}>{space.name}</div>
      <div style={{ ...ABOVE_STRIPES, flex: '0 0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, padding: 2, minHeight: MARK + 4, boxSizing: striped ? 'border-box' : undefined }}>
        {space.owner !== null
          ? <span title={`Owned by ${space.owner}`} style={{ width: MARK, height: MARK, borderRadius: 2, boxSizing: 'border-box', border: '1px solid #111827', backgroundColor: seatColor(space.owner) }} />
          : <span />}
        <span style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 2 }}>
          {seats.map((seat) => (
            <Piece key={seat} seat={seat} facts={playerFacts[seat]} />
          ))}
        </span>
      </div>
      {outline && <div aria-hidden="true" data-testid="pick-outline" style={{ ...OUTLINE_LAYER, ...outline }} />}
    </div>
  );
}

/**
 * The card drawn last, as one sentence, in the middle of the board until the next draw. It scrolls when the middle is too small
 * for it rather than pushing the board out of shape, and it is no `status`: the picking banner is the page's status.
 */
function LastDrawn({ drawn }: { drawn: NonNullable<BoardView['lastDrawn']> }) {
  return (
    <div
      data-testid="last-drawn"
      style={{
        boxSizing: 'border-box', maxWidth: '90%', maxHeight: '45%', overflowY: 'auto', padding: '6px 10px', textAlign: 'center',
        background: '#fffdf5', color: '#1f2937', border: '2px solid #111827', borderLeft: `6px solid ${seatColor(drawn.seat)}`, borderRadius: 6,
        font: '13px/1.3 sans-serif', overflowWrap: 'anywhere',
      }}
    >
      {`${drawn.seat} drew from ${drawn.zone}: ${drawn.name} — ${drawn.says}`}
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
 * The board as a square loop, clockwise from the bottom-right corner, with the latest roll and the card drawn last in the
 * middle. While the player picks a space, the ones they may pick are outlined, the ones the game refuses are dashed, and the
 * rest fade.
 */
export function BoardGrid({ board, picking }: { board: BoardView; picking?: Picking }) {
  const size = ringSize(board.spaces.length);
  const cells = ringCells(board.spaces.length);
  const bySpace = piecesBySpace(board.pieces);
  return (
    <div
      data-testid="board-grid"
      style={{
        display: 'grid', gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
        width: '100%', maxWidth: 560, aspectRatio: '1 / 1', background: '#6b7280', gap: 1, border: '1px solid #6b7280', boxSizing: 'border-box',
      }}
    >
      {board.spaces.map((space, i) => (
        <Space key={i} space={space} seats={bySpace.get(i) ?? []} playerFacts={board.playerFacts} row={cells[i].row} col={cells[i].col} index={i} picking={picking} />
      ))}
      {size > 2 && (
        <div style={{ gridRow: `2 / ${size}`, gridColumn: `2 / ${size}`, minWidth: 0, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#cfe3d2' }}>
          {picking && <div style={{ padding: '0 12px', textAlign: 'center', font: 'bold 16px sans-serif', color: '#14532d' }}>{picking.prompt}</div>}
          {board.roll !== null && <Dice roll={board.roll} />}
          {board.lastDrawn !== null && <LastDrawn drawn={board.lastDrawn} />}
        </div>
      )}
    </div>
  );
}
