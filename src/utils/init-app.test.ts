import type { BaseAppComponents } from '@ue-too/board-pixi-integration';
import { Container } from 'pixi.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { afterEach } from 'vitest';
import { getTrueRect } from '@ue-too/board';
import { TableInputTracker } from '@/engine/input/table-input-tracker';
import { makeInitApp } from './init-app';

// baseInitApp starts Pixi on the GPU, which the tests have none of: stand in for the parts of it that makeInitApp uses.
const fake = vi.hoisted(() => ({ base: null as unknown }));
vi.mock('@ue-too/board-pixi-integration', () => ({ baseInitApp: async () => fake.base }));

function fakeBase() {
  // Pixi's own size, when baseInitApp is given none: it is not full screen and has no size to resize to.
  const camera = {
    viewPortWidth: 800,
    viewPortHeight: 600,
    setPosition: vi.fn(),
    setZoomLevel: vi.fn(),
    convertFromViewPort2WorldSpace: (point: { x: number; y: number }) => point,
  };
  // Like the listener baseInitApp puts on the renderer, resizing it resizes the camera's view port.
  const resize = vi.fn((width: number, height: number) => {
    camera.viewPortWidth = width;
    camera.viewPortHeight = height;
  });
  return {
    app: { renderer: { resize, events: { destroy: vi.fn() }, render: vi.fn() }, stage: new Container(), ticker: { add: vi.fn() } },
    camera,
    canvasProxy: { width: 800, height: 600 },
    inputOrchestrator: {},
    kmtInputStateMachine: {},
    kmtParser: { tearDown: vi.fn() },
    touchParser: { tearDown: vi.fn() },
    cleanup: vi.fn(),
    cleanups: [] as (() => void)[],
  };
}

let base: ReturnType<typeof fakeBase>;
beforeEach(() => {
  base = fakeBase();
  fake.base = base as unknown as BaseAppComponents;
});

const start = (opts?: Parameters<typeof makeInitApp>[1]) => makeInitApp(undefined, opts)(document.createElement('canvas'), { fullScreen: false });

describe('makeInitApp', () => {
  it('draws on a canvas of the size it is given, and fits the 1600-wide world to it', async () => {
    await start({ size: { width: 1200, height: 900 } });
    expect(base.app.renderer.resize).toHaveBeenCalledWith(1200, 900);
    expect(base.camera.setZoomLevel).toHaveBeenCalledWith(0.75);
  });

  it('keeps the canvas Pixi starts with when given no size', async () => {
    await start({ showEmptyZones: true });
    expect(base.app.renderer.resize).not.toHaveBeenCalled();
    expect(base.camera.setZoomLevel).toHaveBeenCalledWith(0.5);
  });

  it('tells the table the pointer points at nothing once it leaves the canvas, until the app is torn down', async () => {
    const leave = vi.spyOn(TableInputTracker.prototype, 'pointerLeave');
    const canvas = document.createElement('canvas');
    const app = await makeInitApp()(canvas, { fullScreen: false });
    canvas.dispatchEvent(new PointerEvent('pointerleave'));
    expect(leave).toHaveBeenCalledTimes(1);
    for (const cleanup of app.cleanups) cleanup();
    canvas.dispatchEvent(new PointerEvent('pointerleave'));
    expect(leave).toHaveBeenCalledTimes(1);
    leave.mockRestore();
  });
});

describe('makeInitApp pointer', () => {
  /**
   * A canvas in the page whose box starts at `box.top`, which a test moves as a row opening or closing above it would. The place
   * the library keeps for it, measured as the library measures it, is where the canvas started: no scroll or resize moves it on.
   */
  const placedCanvas = (box: { top: number }, style: Partial<CSSStyleDeclaration> = {}) => {
    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, { padding: '0px', border: '0px solid', ...style });
    canvas.getBoundingClientRect = () => new DOMRect(0, box.top, 800, 600);
    document.body.appendChild(canvas);
    const kept = getTrueRect(canvas.getBoundingClientRect(), window.getComputedStyle(canvas));
    Object.assign(base.canvasProxy, { position: { x: kept.left, y: kept.top } });
    return canvas;
  };
  afterEach(() => document.body.replaceChildren());

  it('reads the pointer against where the canvas is now, not where it was at its last scroll or resize', async () => {
    const box = { top: 100 };
    const app = await makeInitApp()(placedCanvas(box), { fullScreen: false });
    // The camera's view port is centred on the canvas's middle, and the fake camera's world is its view port.
    expect(app.clientToWorld(400, 400)).toEqual({ x: 0, y: 0 });
    box.top = 60;
    expect(app.clientToWorld(400, 400)).toEqual({ x: 0, y: 40 });
    expect(app.clientToWorld(400, 360)).toEqual({ x: 0, y: 0 });
  });

  it('measures from inside the canvas\'s border and padding, as the library does', async () => {
    const app = await makeInitApp()(placedCanvas({ top: 100 }, { padding: '5px', border: '3px solid' }), { fullScreen: false });
    expect(app.clientToWorld(408, 408)).toEqual({ x: 0, y: 0 });
  });
});

describe('makeInitApp decor', () => {
  it('hands a decor to the table it draws', async () => {
    const app = await start();
    const draw = vi.spyOn(app.pixiTable, 'setDecor');
    const decor = { a: { ring: 'choice' as const, caption: 'x' } };
    app.setDecor(decor);
    expect(draw).toHaveBeenCalledWith(decor);
  });
});

describe('makeInitApp world', () => {
  const world = { min: { x: -800, y: -920 }, max: { x: 800, y: 920 } };

  it('pans and fits to the world it is given, centred on its middle', async () => {
    await start({ size: { width: 1200, height: 1380 }, world });
    expect(base.app.renderer.resize).toHaveBeenCalledWith(1200, 1380);
    expect(base.camera.setZoomLevel).toHaveBeenCalledWith(0.75);
    expect(base.camera.setPosition).toHaveBeenCalledWith({ x: 0, y: 0 });
    expect((fake.base as BaseAppComponents).camera.boundaries).toEqual(world);
  });

  it('fits the world\'s height when it is the tighter side', async () => {
    // 1200 / 1600 is 0.75, but 920 / 1840 is 0.5.
    await start({ size: { width: 1200, height: 920 }, world });
    expect(base.camera.setZoomLevel).toHaveBeenCalledWith(0.5);
  });

  it('looks at the middle of a world that is not centred on the origin', async () => {
    await start({ size: { width: 1200, height: 900 }, world: { min: { x: 0, y: 0 }, max: { x: 1600, y: 1200 } } });
    expect(base.camera.setPosition).toHaveBeenCalledWith({ x: 800, y: 600 });
  });
});
