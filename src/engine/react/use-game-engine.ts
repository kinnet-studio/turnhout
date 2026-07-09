import { useCallback, useEffect, useState } from 'react';
import type { DispatchResult, GameEngine } from '@/engine/core/game-engine';
import type { GameState } from '@/engine/core/game-state';
import type { Move } from '@/engine/core/moves';

export function useGameEngine(engine: GameEngine): {
  state: GameState;
  dispatch: (move: Move) => DispatchResult;
  canDispatch: (move: Move) => true | string;
  undo: () => void;
} {
  const [state, setState] = useState<GameState>(() => engine.getState());

  useEffect(() => {
    setState(engine.getState());
    return engine.subscribe(setState);
  }, [engine]);

  const dispatch = useCallback((move: Move) => engine.dispatch(move), [engine]);
  const canDispatch = useCallback((move: Move) => engine.canDispatch(move), [engine]);
  const undo = useCallback(() => engine.undo(), [engine]);

  return { state, dispatch, canDispatch, undo };
}
