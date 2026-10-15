import type { ActionView, BoardView } from '@/engine/core/lang/board-view';
import { counted } from '@/engine/core/lang/refs';
import { seatColor } from './seat-colors';

/** The seat's number, so p10 comes after p9; anything that is not `p<n>` goes last. */
const seatNumber = (seat: string): number => Number(/^p(\d+)$/.exec(seat)?.[1] ?? Infinity);

/** Every seat the board knows of, in seat order: those with a piece, a number to show, or already out. */
function seatsOf(board: BoardView): string[] {
  const seats = new Set<string>([...Object.keys(board.pieces), ...board.out]);
  for (const counter of board.counters) for (const seat of Object.keys(counter.values)) seats.add(seat);
  return [...seats].sort((a, b) => seatNumber(a) - seatNumber(b) || a.localeCompare(b));
}

/** One text for the seat: "p0 1,500 money", "p1 ? money" where the number is hidden from this viewer, or "p2 out". */
function entryFor(board: BoardView, seat: string): string {
  if (board.out.includes(seat)) return `${seat} out`;
  const numbers = board.counters.map(({ name, values }) => {
    const value = values[seat];
    return typeof value === 'number' ? `${value.toLocaleString('en-US')} ${name}` : `? ${name}`;
  });
  return numbers.length === 0 ? seat : `${seat} ${numbers.join(', ')}`;
}

/** Everyone's numbers on one line, each in its seat's color, and under it what the bank has left: "bank: 31 houses, 12 hotels". */
export function MoneyLine({ board }: { board: BoardView }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'bold 14px sans-serif' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
        {seatsOf(board).map((seat) => <span key={seat} style={{ color: seatColor(seat) }}>{entryFor(board, seat)}</span>)}
      </div>
      {board.bank.length > 0 && <div style={{ color: '#d1d5db' }}>bank: {board.bank.map(({ name, count }) => counted(count, name)).join(', ')}</div>}
    </div>
  );
}

/**
 * The seat's buttons. A button that may not be pressed stays on the page, greyed, with the reason on hover; pressing it
 * explains instead of sending (a real `disabled` button would say nothing on a tap). A button that picks a space does not
 * send when pressed: it asks to pick, and the move goes once a space is.
 */
export function ActionButtons({ actions, onPress, onPick, onRefused }: {
  actions: ActionView[];
  onPress(move: string): void;
  onPick(action: ActionView): void;
  onRefused(reason: string): void;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {actions.map((action, i) => {
        const { move, label, allowed, target } = action;
        const press = () => (target !== null ? onPick(action) : onPress(move));
        return (
          <button
            key={`${i}-${move}`}
            type="button"
            aria-disabled={allowed !== true}
            title={allowed === true ? undefined : allowed}
            onClick={() => (allowed === true ? press() : onRefused(allowed))}
            style={{ padding: '6px 12px', font: '14px sans-serif', opacity: allowed === true ? 1 : 0.5, cursor: allowed === true ? 'pointer' : 'not-allowed' }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
