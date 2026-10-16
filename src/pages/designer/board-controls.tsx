import { useState, type KeyboardEvent } from 'react';
import type { ActionView, BoardView } from '@/engine/core/lang/board-view';
import { counted } from '@/engine/core/lang/refs';
import { factWords } from './board-grid';
import { seatColor } from './seat-colors';

/** The seat's number, so p10 comes after p9; anything that is not `p<n>` goes last. */
const seatNumber = (seat: string): number => Number(/^p(\d+)$/.exec(seat)?.[1] ?? Infinity);

/** Every seat the board knows of, in seat order: those with a piece, a number to show, or already out. */
function seatsOf(board: BoardView): string[] {
  const seats = new Set<string>([...Object.keys(board.pieces), ...board.out]);
  for (const counter of board.counters) for (const seat of Object.keys(counter.values)) seats.add(seat);
  return [...seats].sort((a, b) => seatNumber(a) - seatNumber(b) || a.localeCompare(b));
}

/**
 * One text for the seat: "p0 -4 money · owes p1 · asleep · 2 naps · Free Pass (lent)", its numbers, whom it owes if anyone, then
 * its facts, then the names of the cards it keeps, each with the flags set on it in brackets; "p1 ? money" where the number is
 * hidden from this viewer, or "p2 out" with nothing after it: what is true of a player who is out no longer matters.
 */
function entryFor(board: BoardView, seat: string): string {
  if (board.out.includes(seat)) return `${seat} out`;
  const numbers = board.counters.map(({ name, values }) => {
    const value = values[seat];
    return typeof value === 'number' ? `${value.toLocaleString('en-US')} ${name}` : `? ${name}`;
  });
  const base = numbers.length === 0 ? seat : `${seat} ${numbers.join(', ')}`;
  const creditor = board.owes[seat];
  const debt = creditor === undefined ? [] : [`owes ${creditor === 'bank' ? 'the bank' : creditor}`];
  const flags = board.playerCardFlags[seat] ?? [];
  const cards = (board.playerCards[seat] ?? []).map((name, i) => (flags[i]?.length ? `${name} (${flags[i].join(', ')})` : name));
  return [base, ...debt, ...factWords(board.playerFacts[seat] ?? {}), ...cards].join(' · ');
}

/**
 * What the bank has left and then the game's own numbers that are not 0, joined with " · " ("bank: 31 tokens · pot 120"); a
 * game with no bank starts at the numbers, and one with neither has nothing to say.
 */
function bankLine(board: BoardView): string {
  const bank = board.bank.length > 0 ? [`bank: ${board.bank.map(({ name, count }) => counted(count, name)).join(', ')}`] : [];
  return [...bank, ...board.gameNumbers.map(({ name, value }) => `${name} ${value.toLocaleString('en-US')}`)].join(' · ');
}

/** Everyone's numbers on one line, each in its seat's color, and under it what the bank has left and the game's numbers. */
export function MoneyLine({ board }: { board: BoardView }) {
  const bank = bankLine(board);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'bold 14px sans-serif' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
        {seatsOf(board).map((seat) => <span key={seat} style={{ color: seatColor(seat) }}>{entryFor(board, seat)}</span>)}
      </div>
      {bank !== '' && <div style={{ color: '#d1d5db' }}>{bank}</div>}
    </div>
  );
}

const BUTTON_STYLE = { padding: '6px 12px', font: '14px sans-serif' } as const;

/**
 * One button. One that carries an amount has a number box right before it, greyed with it, which keeps what was typed so the next
 * press starts from the last amount; a blank box sends no amount, and the rules say what is missing. Enter in the box does what
 * pressing the button does, and the reason it is greyed shows on hover over either.
 */
function ActionButton({ action, onPress, onPick, onRefused }: {
  action: ActionView;
  onPress(move: string, amount?: number | null): void;
  onPick(action: ActionView): void;
  onRefused(reason: string): void;
}) {
  const { move, label, allowed, target, amount, players } = action;
  const [typed, setTyped] = useState('');
  const live = allowed === true;
  const press = () => {
    if (target !== null || players !== null) onPick(action);
    else if (amount) onPress(move, typed.trim() === '' ? null : Number(typed));
    else onPress(move);
  };
  const act = () => (live ? press() : onRefused(allowed));
  const actOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    act();
  };
  const button = (
    <button
      type="button"
      aria-disabled={!live}
      title={live ? undefined : allowed}
      onClick={act}
      style={{ ...BUTTON_STYLE, opacity: live ? 1 : 0.5, cursor: live ? 'pointer' : 'not-allowed' }}
    >
      {label}
    </button>
  );
  if (!amount) return button;
  // The box and its button stay together when the row wraps. The reason is on the holder too, since not every browser shows a
  // disabled box's own hover text.
  return (
    <span title={live ? undefined : allowed} style={{ display: 'inline-flex', gap: 4 }}>
      <input
        type="number"
        min="0"
        step="1"
        aria-label={`${label} amount`}
        value={typed}
        disabled={!live}
        onChange={(e) => setTyped(e.target.value)}
        onKeyDown={actOnEnter}
        style={{ ...BUTTON_STYLE, width: 84, boxSizing: 'border-box' }}
      />
      {button}
    </span>
  );
}

/**
 * The seat's buttons. A button that may not be pressed stays on the page, greyed, with the reason on hover; pressing it
 * explains instead of sending (a real `disabled` button would say nothing on a tap). A button that picks a space or another
 * player does not send when pressed: it asks to pick, and the move goes once one is picked.
 */
export function ActionButtons({ actions, onPress, onPick, onRefused }: {
  actions: ActionView[];
  onPress(move: string, amount?: number | null): void;
  onPick(action: ActionView): void;
  onRefused(reason: string): void;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {actions.map((action, i) => <ActionButton key={`${i}-${action.move}`} action={action} onPress={onPress} onPick={onPick} onRefused={onRefused} />)}
    </div>
  );
}

/** The banner while the player picks a space or another player: a status line with room for its buttons. */
export const BANNER_STYLE = { display: 'flex', alignItems: 'center', gap: 8, padding: '2px 8px', background: '#78350f', color: '#fff' } as const;

/**
 * The banner while the player picks another player: one button for each seat in seat order, in the seat's color, then Cancel. A
 * seat the move refuses stays on the banner, greyed with the reason on hover, and pressing it explains instead of picking.
 */
export function PlayerPicker({ players, onPick, onRefused, onCancel }: {
  players: { [seat: string]: true | string };
  onPick(seat: string): void;
  onRefused(reason: string): void;
  onCancel(): void;
}) {
  const seats = Object.keys(players).sort((a, b) => seatNumber(a) - seatNumber(b) || a.localeCompare(b));
  return (
    <div role="status" style={BANNER_STYLE}>
      <span>Pick another player</span>
      {seats.map((seat) => {
        const verdict = players[seat];
        const live = verdict === true;
        return (
          <button
            key={seat}
            type="button"
            aria-label={`Pick ${seat}`}
            aria-disabled={!live}
            title={live ? undefined : verdict}
            onClick={() => (live ? onPick(seat) : onRefused(verdict))}
            style={{
              ...BUTTON_STYLE, font: 'bold 14px sans-serif', background: '#111827', color: seatColor(seat), border: `2px solid ${seatColor(seat)}`,
              opacity: live ? 1 : 0.5, cursor: live ? 'pointer' : 'not-allowed',
            }}
          >
            {seat}
          </button>
        );
      })}
      <button type="button" onClick={onCancel}>Cancel</button>
    </div>
  );
}
