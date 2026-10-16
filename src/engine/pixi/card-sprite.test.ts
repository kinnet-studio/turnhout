import { Texture } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { CardSprite } from './card-sprite';
import type { CardRenderState } from '../core/table-model';
import type { Graphics, Text } from 'pixi.js';

const rs = (over: Partial<CardRenderState> = {}): CardRenderState => ({
  id: 'a', faceUp: true, faceKey: 'AS', draggable: true,
  current: { x: 12, y: 34, rotation: 0.5, scale: 1, z: 7 },
  target: { x: 12, y: 34, rotation: 0.5, scale: 1, z: 7 },
  ownedByDrag: false, flipProgress: 1, ...over,
});

describe('CardSprite', () => {
  it('applies transform from a render state', () => {
    const s = new CardSprite();
    s.setFaces(Texture.EMPTY, Texture.EMPTY);
    s.applyRenderState(rs());
    expect(s.x).toBeCloseTo(12);
    expect(s.y).toBeCloseTo(34);
    expect(s.rotation).toBeCloseTo(0.5);
    expect(s.zIndex).toBe(7);
  });

  it('shows the up face when settled face-up, the down face when face-down', () => {
    const s = new CardSprite();
    s.setFaces(Texture.EMPTY, Texture.EMPTY);
    s.applyRenderState(rs({ faceUp: true, flipProgress: 1 }));
    expect(s.faceUpVisible).toBe(true);
    s.applyRenderState(rs({ faceUp: false, flipProgress: 1 }));
    expect(s.faceUpVisible).toBe(false);
  });
});

describe('decor', () => {
  const kids = (s: CardSprite, label: string) => s.children.filter((c) => c.label === label);

  it('puts a ring and a caption on the card, after the two faces, so they move with it', () => {
    const s = new CardSprite();
    s.setDecor({ ring: 'chosen', caption: 'Blue 3/6\nRed 0/0' });
    expect(s.children).toHaveLength(4);
    const [ring] = kids(s, 'card-ring') as Graphics[];
    const [caption] = kids(s, 'card-caption') as Text[];
    expect(kids(s, 'card-ring')).toHaveLength(1);
    expect(kids(s, 'card-caption')).toHaveLength(1);
    expect(s.children.indexOf(ring)).toBeGreaterThanOrEqual(2);
    expect(s.children.indexOf(caption)).toBeGreaterThanOrEqual(2);
    // Pixi's bounds include the stroke: the card's 100 + 4 outside each side = 108, plus the 5-wide line.
    expect(ring.context.bounds.width).toBe(113);
    expect(caption.text).toBe('Blue 3/6\nRed 0/0');
    expect(caption.y).toBe(74);
    expect(caption.anchor.y).toBe(0);
    expect(caption.anchor.x).toBe(0.5);
    expect(caption.style).toMatchObject({ fontSize: 13, fontWeight: 'bold', fill: 0xf3f4f6, align: 'center', lineHeight: 15 });
  });

  it('draws the ring thinner and amber for a choice, thicker and green for the chosen', () => {
    const s = new CardSprite();
    s.setDecor({ ring: 'choice' });
    const choice = (kids(s, 'card-ring') as Graphics[])[0];
    expect(choice.context.bounds.width).toBe(111);
    expect(choice.context.instructions.at(-1)?.data).toMatchObject({ style: { color: 0xf59e0b, width: 3 } });
    s.setDecor({ ring: 'chosen' });
    const chosen = (kids(s, 'card-ring') as Graphics[])[0];
    expect(chosen.context.instructions.at(-1)?.data).toMatchObject({ style: { color: 0x22c55e, width: 5 } });
  });

  it('follows a change, drops a part that is gone, and leaves the two faces alone for none', () => {
    const s = new CardSprite();
    s.setDecor({ ring: 'chosen', caption: 'Blue 3/6\nRed 0/0' });
    s.setDecor({ ring: 'choice' });
    expect(kids(s, 'card-ring')).toHaveLength(1);
    expect((kids(s, 'card-ring')[0] as Graphics).context.bounds.width).toBe(111);
    expect(kids(s, 'card-caption')).toHaveLength(0);
    s.setDecor(null);
    expect(kids(s, 'card-ring')).toHaveLength(0);
    expect(kids(s, 'card-caption')).toHaveLength(0);
    expect(s.children).toHaveLength(2);
  });

  it('destroys a part it drops', () => {
    const s = new CardSprite();
    s.setDecor({ ring: 'choice', caption: 'x' });
    const [ring] = kids(s, 'card-ring') as Graphics[];
    const [caption] = kids(s, 'card-caption') as Text[];
    s.setDecor(null);
    expect(ring.destroyed).toBe(true);
    expect(caption.destroyed).toBe(true);
  });

  it('takes its decor with it when the card is destroyed', () => {
    const s = new CardSprite();
    s.setDecor({ ring: 'chosen', caption: 'x' });
    const parts = [...kids(s, 'card-ring'), ...kids(s, 'card-caption')];
    s.destroy();
    expect(parts.map((p) => p.destroyed)).toEqual([true, true]);
  });

  it('keeps one of each however often the same decor is set', () => {
    const s = new CardSprite();
    for (let i = 0; i < 2; i++) s.setDecor({ ring: 'chosen', caption: 'x' });
    expect(kids(s, 'card-ring')).toHaveLength(1);
    expect(kids(s, 'card-caption')).toHaveLength(1);
    expect(s.children).toHaveLength(4);
  });

  it('changes the caption text in place', () => {
    const s = new CardSprite();
    s.setDecor({ caption: 'x' });
    const [caption] = kids(s, 'card-caption') as Text[];
    s.setDecor({ caption: 'y' });
    expect(kids(s, 'card-caption')[0]).toBe(caption);
    expect(caption.text).toBe('y');
  });
});
