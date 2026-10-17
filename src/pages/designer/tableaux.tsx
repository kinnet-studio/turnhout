import { Fragment, useMemo } from 'react';
import type { BoardView, PlayerValuesView, WorkedView } from '@/engine/core/lang/board-view';
import type { CompiledGame } from '@/engine/core/lang/types';
import { zoneIdFor } from '@/engine/core/lang/zones';
import type { CardState, PlayerId } from '@/engine/core/scene';
import { bankLine, entryFor } from './board-controls';
import { boardText } from './board-text';
import { gaugesOf } from './gauges';
import { seatColor } from './seat-colors';

/** The color of a gauge whose first value is under its second, whichever seat's color the rest of its line is in. */
export const SHORT_COLOR = '#ff8a65';

/**
 * What one player has, as text: their entry on the money line, then how many cards stand in each of the game's per-player
 * zones in Table order, then `start player` for the seat that took the first turn. Counts are all a page may say of a zone
 * the viewer cannot see into, and they say the same to every seat. A seat that is out reads "p2 out" and nothing more, and a
 * game with no board starts the line at the bare seat. The cards everyone can see are named on the seat's Board line instead.
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
  return [board ? entryFor(board, seat, false) : seat, ...counts, ...start].join(' · ');
}

/**
 * Every player's tableau, one line each in seat order and in the seat's color, the viewer's own among them, each with its
 * Board under it when there is one to list, read with what the view says the rules work out (`worked`); then what the bank has
 * left and the game's numbers, when there are any. It stands in for the zones a table that shows one seat at a time leaves off.
 * Between a seat's line and its Board go its gauges, from the values about each player the view carries (`playerValues`), so every
 * seat sees how far each player is from a button that waits on a pair of them; a seat that is out has none.
 */
export function Tableaux({ game, seats, board, cards, worked, playerValues }: {
  game: CompiledGame;
  seats: PlayerId[];
  board: BoardView | null;
  cards: CardState[];
  worked?: WorkedView;
  playerValues?: PlayerValuesView;
}) {
  const bank = board ? bankLine(board) : '';
  // The list is drawn again with the seat's panel, on every hover, but a seat's Board changes only with the cards and what the
  // rules work out from them.
  const texts = useMemo(
    () => new Map(seats.map((seat) => [seat, boardText(game, cards, seat, worked)])),
    [game, seats, cards, worked],
  );
  // A seat's gauges change only with the values the view carries.
  const gauges = useMemo(
    () => new Map(seats.map((seat) => [seat, gaugesOf(game, playerValues?.[seat])])),
    [game, seats, playerValues],
  );
  return (
    <div data-testid="tableaux" style={{ display: 'flex', flexDirection: 'column', gap: 4, font: 'bold 14px sans-serif' }}>
      {seats.map((seat) => {
        const text = texts.get(seat)!;
        const shown = board?.out.includes(seat) ? [] : gauges.get(seat)!;
        return (
          <Fragment key={seat}>
            <div style={{ color: seatColor(seat) }}>{tableauLine(game, board, cards, seat)}</div>
            {shown.length > 0 && (
              <div data-testid={`gauges-${seat}`} style={{ color: seatColor(seat) }}>
                {shown.map((gauge, i) => (
                  <Fragment key={i}>
                    {i > 0 && ' · '}
                    <span style={gauge.short ? { color: SHORT_COLOR } : undefined}>{gauge.text}</span>
                  </Fragment>
                ))}
              </div>
            )}
            {text !== '' && <div data-testid={`board-${seat}`} style={{ color: seatColor(seat), paddingLeft: 24 }}>{text}</div>}
          </Fragment>
        );
      })}
      {bank !== '' && <div style={{ color: '#d1d5db' }}>{bank}</div>}
    </div>
  );
}
