import type { ChoiceView } from '@/engine/core/lang/board-view';
import { BUTTON_STYLE } from './board-controls';

/**
 * One question of a press, listed under the buttons where the card picker opens: the question, a button for each value that may
 * answer it, then Cancel. A value the engine refuses stays on the list, greyed with the reason on hover, and pressing it explains
 * instead of answering.
 */
export function ChoicePicker({ question, choice, onAnswer, onRefused, onCancel }: {
  question: string;
  choice: ChoiceView;
  onAnswer(value: string): void;
  onRefused(reason: string): void;
  onCancel(): void;
}) {
  return (
    <div role="group" aria-label="Choices" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <span>{question}</span>
      {choice.options.map(({ value, allowed }) => {
        const live = allowed === true;
        return (
          <button
            key={value}
            type="button"
            aria-disabled={!live}
            title={live ? undefined : allowed}
            onClick={() => (live ? onAnswer(value) : onRefused(allowed))}
            style={{ ...BUTTON_STYLE, opacity: live ? 1 : 0.5, cursor: live ? 'pointer' : 'not-allowed' }}
          >
            {value}
          </button>
        );
      })}
      <button type="button" onClick={onCancel} style={BUTTON_STYLE}>Cancel</button>
    </div>
  );
}
