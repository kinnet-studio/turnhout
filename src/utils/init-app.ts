import { type KmtInputStateMachine, convertFromCanvas2ViewPort, convertFromWindow2Canvas } from '@ue-too/board';
import { type BaseAppComponents, type InitAppOptions, baseInitApp } from '@ue-too/board-pixi-integration';
import { Container, Graphics, RenderTexture, type Texture } from 'pixi.js';
import type { AppComponents } from '@/app-components';
import type { CardState, PlayerId, Vec2 } from '@/engine/core/scene';
import { CARD_HEIGHT, CARD_WIDTH } from '@/engine/core/scene';
import type { Placement, TableDef } from '@/engine/core/table-def';
import { RuleRegistry } from '@/engine/core/rules';
import { registerStarterRules } from '@/engine/core/rules-library';
import { deriveScene } from '@/engine/core/derive-scene';
import type { TableIntents } from '@/engine/input/table-input-context';
import { createTableInputStateMachine, trackerToSMContext } from '@/engine/input/table-kmt-state-machine';
import { TableKmtParser } from '@/engine/input/table-kmt-parser';
import { TableInputTracker } from '@/engine/input/table-input-tracker';
import { type FaceDraw, type FaceRenderer, FaceTextureCache } from '@/engine/pixi/face-texture-cache';
import { PixiTable } from '@/engine/pixi/pixi-table';

const TABLE_BOUNDS = { min: { x: -800, y: -600 }, max: { x: 800, y: 600 } };

// A neutral default face renderer; the demo (Task 16) overrides this per game.
const defaultRenderer: FaceRenderer = (card) => (container: Container) => {
  const g = new Graphics();
  g.roundRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 8)
    .fill(card.faceUp ? 0xffffff : 0x1e3a5f)
    .stroke({ color: 0x333333, width: 2 });
  container.addChild(g);
};

export const makeInitApp =
  (faceRenderer: FaceRenderer = defaultRenderer) =>
  async (
    canvas: HTMLCanvasElement,
    option: Partial<InitAppOptions> = { fullScreen: true, limitEntireViewPort: false, boundaries: TABLE_BOUNDS },
  ): Promise<AppComponents> => {
    const base: BaseAppComponents = await baseInitApp(canvas, option);

    // Custom input: destroy Pixi's event federation; drive input through KMT.
    base.app.renderer.events.destroy();

    const drawToTexture = (draw: FaceDraw): Texture => {
      const container = new Container();
      draw(container);
      const tex = RenderTexture.create({ width: CARD_WIDTH, height: CARD_HEIGHT });
      // Draw is centered on the origin; shift so it lands inside the texture.
      container.position.set(CARD_WIDTH / 2, CARD_HEIGHT / 2);
      base.app.renderer.render({ container, target: tex });
      container.destroy({ children: true });
      return tex;
    };

    const faces = new FaceTextureCache(faceRenderer, drawToTexture);
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

    const registry = registerStarterRules(new RuleRegistry());
    let currentDef: TableDef = { zones: [] };
    let currentCards: CardState[] = [];

    let intents: TableIntents = {};
    const tracker = new TableInputTracker({
      clientToWorld,
      getPlacedCards: () => pixiTable.getPlacedCards(),
      getZones: () => currentDef.zones,
      getCards: () => currentCards,
      registry,
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

    const setTable = (def: TableDef, placement: Placement, viewer?: PlayerId): void => {
      currentDef = def;
      currentCards = placement.cards;
      pixiTable.setScene(deriveScene(def, placement, viewer));
    };

    return {
      ...base,
      type: 'table',
      pixiTable,
      inputTracker: tracker,
      registry,
      setTable,
      setIntents: (next) => {
        intents = next;
      },
      clientToWorld,
    };
  };

export const initApp = makeInitApp();
