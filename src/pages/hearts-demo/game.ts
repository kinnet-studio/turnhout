import { GameEngine } from '@/engine/core/game-engine';
import type { GameState } from '@/engine/core/game-state';
import { MoveRegistry } from '@/engine/core/moves';
import { registerCoreMoves } from '@/engine/core/moves-library';
import { FlowRegistry } from '@/engine/core/flow-registry';
import { registerCoreFlow } from '@/engine/core/flow-library';
import { makeRng } from '@/engine/core/rng';
import { RuleRegistry } from '@/engine/core/rules';
import { GameServer } from '@/engine/net/game-server';
import { heartsDeck, SEATS, TABLE } from './cards';
import { FLOW, registerHeartsFlow } from './flow';
import { pass, play } from './moves';

export function createHeartsServer(seed = 20260715): GameServer {
  const moves = registerCoreMoves(new MoveRegistry()).register('play', play).register('pass', pass);
  const flowRegistry = registerHeartsFlow(registerCoreFlow(new FlowRegistry()));
  const initial: GameState = { cards: heartsDeck(), data: {}, rng: makeRng(seed) };
  const engine = new GameEngine({ tableDef: TABLE, rules: new RuleRegistry(), moves, initial, flow: FLOW, flowRegistry });
  return new GameServer({ engine, tableDef: TABLE, seats: [...SEATS] });
}
