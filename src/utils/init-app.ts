import { type KmtInputStateMachine, convertFromCanvas2ViewPort, convertFromWindow2Canvas } from '@ue-too/board';
import { type BaseAppComponents, type InitAppOptions, baseInitApp } from '@ue-too/board-pixi-integration';
import { Graphics, RenderTexture, type Texture } from 'pixi.js';
import type { AppComponents } from '@/app-components';
import type { PlacedZone, Scene, Vec2 } from '@/engine/core/scene';
import { CARD_HEIGHT, CARD_WIDTH } from '@/engine/core/scene';
import type { TableIntents } from '@/engine/input/table-input-context';
import { createTableInputStateMachine, trackerToSMContext } from '@/engine/input/table-kmt-state-machine';
import { TableKmtParser } from '@/engine/input/table-kmt-parser';
import { TableInputTracker } from '@/engine/input/table-input-tracker';
import { type FaceRenderer, FaceTextureCache } from '@/engine/pixi/face-texture-cache';
import { PixiTable } from '@/engine/pixi/pixi-table';

const TABLE_BOUNDS = { min: { x: -800, y: -600 }, max: { x: 800, y: 600 } };

// A neutral default face renderer; the demo (Task 16) overrides this per game.
const defaultRenderer: FaceRenderer = (card) => (g: Graphics) => {
  g.roundRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 8)
    .fill(card.faceUp ? 0xffffff : 0x1e3a5f)
    .stroke({ color: 0x333333, width: 2 });
};

export const initApp = async (
  canvas: HTMLCanvasElement,
  option: Partial<InitAppOptions> = { fullScreen: true, limitEntireViewPort: false, boundaries: TABLE_BOUNDS },
): Promise<AppComponents> => {
  const base: BaseAppComponents = await baseInitApp(canvas, option);

  // Custom input: destroy Pixi's event federation; drive input through KMT.
  base.app.renderer.events.destroy();

  const drawToTexture = (draw: (g: Graphics) => void): Texture => {
    const g = new Graphics();
    draw(g);
    const tex = RenderTexture.create({ width: CARD_WIDTH, height: CARD_HEIGHT });
    // Draw is centered on the origin; shift so it lands inside the texture.
    g.position.set(CARD_WIDTH / 2, CARD_HEIGHT / 2);
    base.app.renderer.render({ container: g, target: tex });
    g.destroy();
    return tex;
  };

  const faces = new FaceTextureCache(defaultRenderer, drawToTexture);
  const pixiTable = new PixiTable({ faces });
  base.app.stage.addChild(pixiTable);
  base.app.ticker.add((t) => pixiTable.advance(t.deltaMS / 1000));

  // Window client coords -> world coords, via canvasProxy + camera. Mirrors the
  // real (azabu) recipe: convertFromWindow2Canvas -> convertFromCanvas2ViewPort
  // (centered on the canvas midpoint) -> camera.convertFromViewPort2WorldSpace.
  // (The plan sketch used the raw convertFromViewport2World free function with
  // camera.viewPortWidth/Height for centering; using the camera's own method and
  // canvasProxy dimensions instead matches the verified azabu implementation.)
  const clientToWorld = (clientX: number, clientY: number): Vec2 => {
    const canvasPt = convertFromWindow2Canvas({ x: clientX, y: clientY }, base.canvasProxy);
    const viewportPt = convertFromCanvas2ViewPort(canvasPt, {
      x: base.canvasProxy.width / 2,
      y: base.canvasProxy.height / 2,
    });
    return base.camera.convertFromViewPort2WorldSpace(viewportPt);
  };

  let currentScene: Scene = { cards: [], zones: [] };
  let currentZones: PlacedZone[] = [];

  let intents: TableIntents = {};
  const tracker = new TableInputTracker({
    clientToWorld,
    getPlacedCards: () => pixiTable.getPlacedCards(),
    getPlacedZones: () => currentZones,
    getScene: () => currentScene,
    beginDrag: (id) => pixiTable.beginDrag(id),
    dragTo: (id, world) => pixiTable.dragTo(id, world),
    endDrag: (id) => pixiTable.endDrag(id),
    intents: {
      onDrop: (i) => intents.onDrop?.(i),
      onCardClick: (id) => intents.onCardClick?.(id),
      onHover: (id) => intents.onHover?.(id),
    },
  });

  const sm = createTableInputStateMachine(trackerToSMContext(tracker));

  // Fixed table: replace base pan/zoom parsers with our card parser.
  base.kmtParser.tearDown();
  // BaseAppComponents widens kmtInputStateMachine to the generic (structural)
  // `StateMachine` interface, but baseInitApp actually builds it via
  // createKmtInputStateMachine(...), i.e. it is a real KmtInputStateMachine at
  // runtime — the published .d.ts is just looser than the concrete value.
  // Mirrors azabu's `stateMachine as unknown as TouchInputStateMachine` cast in
  // extended-touch-parser.ts for the same kind of gap.
  const parser = new TableKmtParser(
    base.kmtInputStateMachine as unknown as KmtInputStateMachine,
    canvas,
    base.inputOrchestrator,
    sm,
    clientToWorld,
  );
  parser.setUp();
  base.kmtParser = parser;
  base.touchParser.tearDown();

  // Fit camera to the table bounds; lock zoom and pan (fixed table).
  // `option.boundaries` isn't guaranteed to reach baseInitApp (main.tsx passes
  // its own `option` with no `boundaries` key, so the default parameter here
  // never applies), so set the camera's position boundaries explicitly here to
  // keep the pan clamp consistent with the `fit` zoom computed from
  // TABLE_BOUNDS below.
  base.camera.boundaries = TABLE_BOUNDS;
  const fit = Math.min(
    base.camera.viewPortWidth / (TABLE_BOUNDS.max.x - TABLE_BOUNDS.min.x),
    base.camera.viewPortHeight / (TABLE_BOUNDS.max.y - TABLE_BOUNDS.min.y),
  );
  base.camera.setPosition({ x: 0, y: 0 });
  base.camera.zoomBoundaries = { min: fit, max: fit };
  base.camera.setZoomLevel(fit);

  const setScene = (scene: Scene): void => {
    currentScene = scene;
    currentZones = scene.zones.map((z) => ({
      id: z.id,
      x: z.transform.x,
      y: z.transform.y,
      width: (z.layoutOptions?.spacing ?? CARD_WIDTH) * 4,
      height: CARD_HEIGHT * 2,
      accepts: z.accepts,
    }));
    pixiTable.setScene(scene);
  };

  return {
    ...base,
    type: 'table',
    pixiTable,
    inputTracker: tracker,
    setScene,
    setIntents: (next) => {
      intents = next;
    },
    clientToWorld,
  };
};
