import type { BoardView } from '@/engine/core/lang/board-view';
import type { CompiledGame } from '@/engine/core/lang/types';
import { zoneIdFor } from '@/engine/core/lang/zones';
import type { CardState, PlayerId } from '@/engine/core/scene';
import { bankLine, entryFor } from './board-controls';
import { seatColor } from './seat-colors';

/**
 * What one player has, as text: their entry on the money line, then how many cards stand in each of the game's per-player
 * zones in Table order, then `start player` for the seat that took the first turn. Counts are all a page may say of a zone
 * the viewer cannot see into, and they say the same to every seat. A seat that is out reads "p2 out" and nothing more, and a
 * game with no board starts the line at the bare seat.
 */
export function tableauLine(game: CompiledGame, board: BoardView | null, cards: CardState[], seat: PlayerId): string {
  if (board?.out.includes(seat)) return entryFor(board, seat);
  const counts = game.zones
    .filter((zone) => zone.perPlayer)
    .map((zone) => {
      const id = zoneIdFor(zone.name, seat);
      return `${zone.name} ${cards.filter((card) => card.zoneId === id).length}`;
    });
  const start = board?.startPlayer === seat ? ['start player'] : [];
  return [board ? entryFor(board, seat) : seat, ...counts, ...start].join(' · ');
}

/**
 * Every player's tableau, one line each in seat order and in the seat's color, the viewer's own among them; then what the
 * bank has left and the game's numbers, when there are any. It stands in for the zones a table that shows one seat at a time
 * leaves off.
 */
export function Tableaux({ game, seats, board, cards }: {
  game: CompiledGame;
  seats: PlayerId[];
  board: BoardView | null;
  cards: CardState[];
}) {
  const bank = board ? bankLine(board) : '';
  return (
    <div data-testid="tableaux" style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'bold 14px sans-serif' }}>
      {seats.map((seat) => <div key={seat} style={{ color: seatColor(seat) }}>{tableauLine(game, board, cards, seat)}</div>)}
      {bank !== '' && <div style={{ color: '#d1d5db' }}>{bank}</div>}
    </div>
  );
}
