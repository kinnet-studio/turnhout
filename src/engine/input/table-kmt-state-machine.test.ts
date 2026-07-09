import { describe, expect, it } from 'vitest';
import { createTableInputStateMachine, type TableInputSMContext } from './table-kmt-state-machine';

function ctx(): TableInputSMContext & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    setup: () => {},
    cleanup: () => {},
    pickUp: () => calls.push('pickUp'),
    dragTo: () => calls.push('dragTo'),
    drop: () => calls.push('drop'),
    hoverAt: () => calls.push('hoverAt'),
  };
}

describe('table input state machine', () => {
  it('transitions IDLE -> DRAGGING -> IDLE and routes actions', () => {
    const c = ctx();
    const sm = createTableInputStateMachine(c);
    expect(sm.currentState).toBe('IDLE');
    sm.happens('pointerMove', { world: { x: 0, y: 0 } });
    sm.happens('pointerDown', { world: { x: 0, y: 0 } });
    expect(sm.currentState).toBe('DRAGGING');
    sm.happens('pointerMove', { world: { x: 5, y: 5 } });
    sm.happens('pointerUp', { world: { x: 5, y: 5 } });
    expect(sm.currentState).toBe('IDLE');
    expect(c.calls).toEqual(['hoverAt', 'pickUp', 'dragTo', 'drop']);
  });
});
