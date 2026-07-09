import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CardTable } from './card-table';
import type { Scene } from '../core/scene';

const setScene = vi.fn();
const setIntents = vi.fn();

vi.mock('@/hooks/use-app', () => ({
  useApp: () => ({ setScene, setIntents }),
}));

const scene: Scene = { cards: [], zones: [{ id: 'deck', layout: 'pile', transform: { x: 0, y: 0 } }] };

describe('CardTable', () => {
  it('pushes the scene into the engine on mount', () => {
    setScene.mockClear();
    render(<CardTable scene={scene} />);
    expect(setScene).toHaveBeenCalledWith(scene);
  });

  it('registers intents from props', () => {
    setIntents.mockClear();
    const onDrop = vi.fn();
    render(<CardTable scene={scene} onDrop={onDrop} />);
    expect(setIntents).toHaveBeenCalled();
    const passed = setIntents.mock.calls.at(-1)![0];
    expect(passed.onDrop).toBe(onDrop);
  });
});
