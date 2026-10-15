import type { CompiledGame } from '@/engine/core/lang/types';
import type { PlayerId } from '@/engine/core/scene';
import type { Json } from '@/engine/core/table-def';
import type { ClientView } from '@/engine/net/protocol';

/** The line under a seat's name: what the game is waiting for, or how it ended. */
export function seatStatus(game: CompiledGame, view: ClientView | null, seat: PlayerId): string {
  if (!view) return '';
  if (view.result !== undefined) return gameOver(view.result);
  if (!view.turn) return '';
  const phase = game.phases.find((p) => p.id === view.turn?.phase);
  const hint = phase?.hint ?? phase?.id ?? view.turn.phase ?? '';
  if (phase?.actor === 'any') return hint;
  return view.turn.current === seat ? `Your turn — ${hint}` : `${hint} — waiting for ${view.turn.current}`;
}

function gameOver(result: Json): string {
  if (typeof result !== 'object' || result === null || Array.isArray(result)) return 'Game over';
  const { winner, scores } = result;
  const headline = typeof winner === 'string' ? `Game over — ${winner} wins` : 'Game over';
  if (typeof scores !== 'object' || scores === null || Array.isArray(scores)) return headline;
  const list = Object.entries(scores).map(([seat, points]) => `${seat} ${points}`).join(', ');
  return list === '' ? headline : `${headline} (${list})`;
}
