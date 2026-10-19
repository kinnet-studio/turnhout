import { Texture } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { CardSprite } from './card-sprite';
import type { CardRenderState } from '../core/table-model';
import type { Graphics, Text } from 'pixi.js';
import * as PIXI from 'pixi.js';

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

  it('draws no caption for an empty one, and takes off the one it had', () => {
    const s = new CardSprite();
    s.setDecor({ caption: '' });
    expect(kids(s, 'card-caption')).toHaveLength(0);
    expect(s.children).toHaveLength(2);
    s.setDecor({ ring: 'choice', caption: 'x' });
    const [caption] = kids(s, 'card-caption') as Text[];
    s.setDecor({ ring: 'choice', caption: '' });
    expect(kids(s, 'card-caption')).toHaveLength(0);
    expect(caption.destroyed).toBe(true);
    expect(kids(s, 'card-ring')).toHaveLength(1);
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

describe('badge', () => {
  const kids = (parent: PIXI.Container, label: string) => parent.children.filter((c) => c.label === label);
  /** The card's one badge, with its back and its text. */
  const badgeOf = (s: CardSprite) => {
    const badges = kids(s, 'card-badge');
    expect(badges).toHaveLength(1);
    const [badge] = badges;
    return { badge, back: kids(badge, 'card-badge-back')[0] as PIXI.Graphics, text: kids(badge, 'card-badge-text')[0] as PIXI.Text };
  };
  /** The back's box, as [x, y, width, height]. */
  const boxOf = (back: PIXI.Graphics) => {
    const { x, y, width, height } = back.context.bounds;
    return [x, y, width, height].map((n) => Math.round(n * 100) / 100);
  };

  it('draws the flags white on red inside the card’s top-right corner, the back sized to the text', () => {
    const s = new CardSprite();
    s.setDecor({ badge: 'busy' });
    const { badge, back, text } = badgeOf(s);
    expect([badge.x, badge.y]).toEqual([46, -66]);
    expect(badge.children).toHaveLength(2);
    expect(badge.children[0]).toBe(back);
    expect(badge.children[1]).toBe(text);
    expect(back).toBeInstanceOf(PIXI.Graphics);
    expect(text).toBeInstanceOf(PIXI.Text);
    expect(text.text).toBe('busy');
    expect([text.anchor.x, text.anchor.y]).toEqual([1, 0]);
    expect([text.x, text.y]).toEqual([-3, 1]);
    expect(text.style).toMatchObject({ fontSize: 10, fontWeight: 'bold', fill: 0xffffff, align: 'right', lineHeight: 12, wordWrap: false });
    // 'busy' is 23.34 wide in bold at 10: the back is 3 wider on each side, and one line of 12 tall with 1 above and below.
    expect(boxOf(back)).toEqual([-29.34, 0, 29.34, 14]);
    expect(back.context.instructions.at(-1)?.data).toMatchObject({ style: { color: 0xb91c1c } });
  });

  it('breaks a badge too wide for the corner at a space, and sizes the back to its widest line and its lines', () => {
    const s = new CardSprite();
    // 94.47 wide on one line, past the 56 the corner has room for: the first line takes as many words as fit, 'busy, tired,' (53.35).
    s.setDecor({ badge: 'busy, tired, working' });
    const two = badgeOf(s);
    expect(two.text.text).toBe('busy, tired,\nworking');
    expect(boxOf(two.back)).toEqual([-59.35, 0, 59.35, 26]);
    // 50.57 wide: one line.
    s.setDecor({ badge: 'busy, tired' });
    const one = badgeOf(s);
    expect(one.text.text).toBe('busy, tired');
    expect(boxOf(one.back)).toEqual([-56.57, 0, 56.57, 14]);
  });

  it('breaks only between the badge’s comma-separated parts, never inside a count and its name', () => {
    const s = new CardSprite();
    // 56.68 wide on one line, past the 56 of the corner. A break at a word would leave 'tired, 1' (32.79) over 'dent', which reads as a count of
    // tired: the part '1 dent' moves down whole.
    s.setDecor({ badge: 'tired, 1 dent' });
    expect(badgeOf(s).text.text).toBe('tired,\n1 dent');
    // Parts that fit together stay on a line: 'busy, tired,' is 53.35 wide, and '1 dent' no longer fits after it.
    s.setDecor({ badge: 'busy, tired, 1 dent' });
    expect(badgeOf(s).text.text).toBe('busy, tired,\n1 dent');
    // A part wider than a line of its own (96.14) starts a line and breaks at its spaces, as the parts around it do not.
    s.setDecor({ badge: 'busy, 12 dents in the code, tired' });
    expect(badgeOf(s).text.text).toBe('busy,\n12 dents in\nthe code,\ntired');
  });

  it('sits beside a ring and a caption, after the two faces', () => {
    const s = new CardSprite();
    s.setDecor({ ring: 'chosen', caption: 'Red 1/1', badge: 'busy' });
    expect(s.children).toHaveLength(5);
    expect(s.children.indexOf(badgeOf(s).badge)).toBeGreaterThanOrEqual(2);
  });

  it('redraws both parts of the same badge for a new text', () => {
    const s = new CardSprite();
    s.setDecor({ badge: 'busy' });
    const before = badgeOf(s);
    s.setDecor({ badge: 'busy, tired' });
    const after = badgeOf(s);
    expect(after.badge).toBe(before.badge);
    expect(after.back).toBe(before.back);
    expect(after.text).toBe(before.text);
    expect(after.text.text).toBe('busy, tired');
    expect(boxOf(after.back)).toEqual([-56.57, 0, 56.57, 14]);
  });

  it('takes off and destroys a badge that is gone, empty or left with the rest', () => {
    const s = new CardSprite();
    s.setDecor({ badge: 'busy' });
    const { badge, back, text } = badgeOf(s);
    const drawing = back.context;
    s.setDecor({ caption: 'x' });
    expect(kids(s, 'card-badge')).toHaveLength(0);
    expect([badge, back, text].map((part) => part.destroyed)).toEqual([true, true, true]);
    // The back's drawing goes too, which a Graphics keeps when it is destroyed with options, as a box hands its children.
    expect(drawing.instructions).toBeNull();
    s.setDecor({ badge: 'busy' });
    s.setDecor({ badge: '' });
    expect(kids(s, 'card-badge')).toHaveLength(0);
    s.setDecor({ ring: 'choice', caption: 'x', badge: 'busy' });
    s.setDecor(null);
    expect(kids(s, 'card-badge')).toHaveLength(0);
    expect(s.children).toHaveLength(2);
  });

  it('keeps one badge however often the same one is set, and takes it with the card', () => {
    const s = new CardSprite();
    for (let i = 0; i < 2; i++) s.setDecor({ badge: 'busy' });
    expect(kids(s, 'card-badge')).toHaveLength(1);
    expect(s.children).toHaveLength(3);
    const { badge, back, text } = badgeOf(s);
    s.destroy();
    expect([badge, back, text].map((part) => part.destroyed)).toEqual([true, true, true]);
  });
});

describe('dim', () => {
  const kids = (s: CardSprite, label: string) => s.children.filter((c) => c.label === label);
  /** The alpha of the two face sprites, the card's first two children. */
  const faces = (s: CardSprite) => [s.children[0].alpha, s.children[1].alpha];

  it('fades both faces of a dimmed card', () => {
    const s = new CardSprite();
    expect(faces(s)).toEqual([1, 1]);
    s.setDecor({ dim: true });
    expect(faces(s)).toEqual([0.4, 0.4]);
  });

  it('leaves the badge and the ring of a dimmed card as they are', () => {
    const s = new CardSprite();
    s.setDecor({ dim: true, badge: 'busy', ring: 'chosen' });
    expect(faces(s)).toEqual([0.4, 0.4]);
    expect(kids(s, 'card-badge').map((c) => c.alpha)).toEqual([1]);
    expect(kids(s, 'card-ring').map((c) => c.alpha)).toEqual([1]);
  });

  it('brings both faces back for decor that is not dimmed, and for none', () => {
    const s = new CardSprite();
    s.setDecor({ dim: true });
    s.setDecor({ caption: 'x' });
    expect(faces(s)).toEqual([1, 1]);
    s.setDecor({ dim: true });
    s.setDecor(null);
    expect(faces(s)).toEqual([1, 1]);
  });
});
