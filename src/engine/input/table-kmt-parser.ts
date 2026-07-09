import { type InputOrchestrator, VanillaKMTEventParser } from '@ue-too/board';
import type { KmtInputStateMachine } from '@ue-too/board';
import type { Vec2 } from '../core/scene';

type WorldSink = {
  happens: (event: 'pointerDown' | 'pointerMove' | 'pointerUp', payload: { world: Vec2 }) => void;
};

/**
 * A KMT parser for the fixed card table. It extends VanillaKMTEventParser for
 * house-style parity, but overrides the pointer handlers to drive the card input
 * state machine instead of the camera-pan pipeline (the table does not pan).
 */
export class TableKmtParser extends VanillaKMTEventParser {
  private cardSM: WorldSink;
  private toWorld: (clientX: number, clientY: number) => Vec2;

  constructor(
    baseStateMachine: KmtInputStateMachine,
    canvas: HTMLCanvasElement,
    orchestrator: InputOrchestrator,
    cardSM: WorldSink,
    toWorld: (clientX: number, clientY: number) => Vec2,
  ) {
    super(baseStateMachine, orchestrator, canvas);
    this.cardSM = cardSM;
    this.toWorld = toWorld;
  }

  override pointerDownHandler(e: PointerEvent): void {
    if (this.disabled || e.button !== 0) return;
    this.cardSM.happens('pointerDown', { world: this.toWorld(e.clientX, e.clientY) });
  }

  override pointerMoveHandler(e: PointerEvent): void {
    if (this.disabled) return;
    this.cardSM.happens('pointerMove', { world: this.toWorld(e.clientX, e.clientY) });
  }

  override pointerUpHandler(e: PointerEvent): void {
    if (this.disabled || e.button !== 0) return;
    this.cardSM.happens('pointerUp', { world: this.toWorld(e.clientX, e.clientY) });
  }

  // Fixed table: no camera pan/zoom from wheel. The base VanillaKMTEventParser's
  // scrollHandler drives camera pan (plain wheel) and zoom (ctrl+wheel) via the
  // KMT state machine; overriding it here (rather than pointer handlers alone)
  // is required to fully neutralize camera movement on the fixed table.
  override scrollHandler(e: WheelEvent): void {
    if (this.disabled) return;
    e.preventDefault();
  }
}
