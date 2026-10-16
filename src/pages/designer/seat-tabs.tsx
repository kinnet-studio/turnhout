import type { PlayerId } from '@/engine/core/scene';
import { seatColor } from './seat-colors';

const TAB_STYLE = { padding: '6px 14px', font: 'bold 14px sans-serif', cursor: 'pointer' } as const;

/**
 * One tab for each seat, in seat order and in the seat's color, for a table that shows one seat at a time. The seat the game
 * waits on says so on its tab, so whoever is looking at another seat can see whose turn it is.
 */
export function SeatTabs({ seats, selected, toAct, onSelect }: {
  seats: PlayerId[];
  selected: PlayerId;
  toAct: PlayerId | null;
  onSelect(seat: PlayerId): void;
}) {
  return (
    <div role="tablist" aria-label="Seats" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {seats.map((seat) => {
        const chosen = seat === selected;
        return (
          <button
            key={seat}
            type="button"
            role="tab"
            aria-selected={chosen}
            onClick={() => onSelect(seat)}
            style={{
              ...TAB_STYLE, color: seatColor(seat),
              border: `2px solid ${chosen ? seatColor(seat) : '#444'}`, background: chosen ? '#111827' : 'transparent',
            }}
          >
            {seat === toAct ? `${seat} — to act` : seat}
          </button>
        );
      })}
    </div>
  );
}
