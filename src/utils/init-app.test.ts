import type { BaseAppComponents } from '@ue-too/board-pixi-integration';
import { Container } from 'pixi.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('makeInitApp decor', () => {
  it('hands a decor to the table it draws', async () => {
    const app = await start();
    const draw = vi.spyOn(app.pixiTable, 'setDecor');
    const decor = { a: { ring: 'choice' as const, caption: 'x' } };
    app.setDecor(decor);
    expect(draw).toHaveBeenCalledWith(decor);
  });
});
