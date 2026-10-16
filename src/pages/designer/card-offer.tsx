import { BUTTON_STYLE } from './board-controls';
import type { Taker } from './card-pick';

/**
 * The buttons that may take a card clicked on the table, under the seat's buttons where the card picker opens. Every one is offered,
 * even when only one takes it, so a stray click never presses anything. A button greyed for this card stays on the offer with the
 * reason on hover, and pressing it explains instead of choosing it.
 */
export function CardOffer({ name, takers, onChoose, onRefused, onCancel }: {
  name: string;
  takers: Taker[];
  onChoose(move: string): void;
  onRefused(reason: string): void;
  onCancel(): void;
}) {
  return (
    <div role="group" aria-label="Card buttons" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <span>{name}:</span>
      {takers.map(({ move, label, allowed }) => {
        const live = allowed === true;
        return (
          <button
            key={move}
            type="button"
            aria-disabled={!live}
            title={live ? undefined : allowed}
            onClick={() => (live ? onChoose(move) : onRefused(allowed))}
            style={{ ...BUTTON_STYLE, opacity: live ? 1 : 0.5, cursor: live ? 'pointer' : 'not-allowed' }}
          >
            {label}
          </button>
        );
      })}
      <button type="button" onClick={onCancel} style={BUTTON_STYLE}>Cancel</button>
    </div>
  );
}
