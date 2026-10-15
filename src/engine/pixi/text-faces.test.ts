import { Container, Text } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { textFaceKey } from '../core/lang/cards';
import { CARD_HEIGHT, CARD_WIDTH, type CardState } from '../core/scene';
import type { FaceDraw } from './face-texture-cache';
import { designerFaceRenderer, textFaceRenderer } from './text-faces';

const card = (over: Partial<CardState> = {}): CardState => ({ id: 'c1', zoneId: 'z', faceUp: true, faceKey: 'back', ...over });

const drawn = (c: CardState): Container => {
  const draw = textFaceRenderer(c);
  expect(typeof draw).toBe('function');
  const container = new Container();
  (draw as FaceDraw)(container);
  return container;
};

const labels = (container: Container): string[] =>
  container.children.filter((ch): ch is Text => ch instanceof Text).map((t) => t.text);

describe('textFaceRenderer', () => {
  it('draws a text face with the label and colored by the color attribute', () => {
    const draw = textFaceRenderer({ id: 'c1', zoneId: 'z', faceUp: true, faceKey: textFaceKey({ color: 'red', number: 7 }) });
    expect(typeof draw).toBe('function');
    const c = new Container();
    (draw as FaceDraw)(c);
    expect(c.children.some((ch) => ch instanceof Text && ch.text === 'red 7')).toBe(true);
  });

  it('uses name as the label and lists the other attributes small as key: value', () => {
    const container = drawn(card({ faceKey: textFaceKey({ name: 'Goblin', attack: 3, color: 'green' }) }));
    expect(labels(container)).toEqual(expect.arrayContaining(['Goblin', 'attack: 3', 'color: green']));
    expect(labels(container)).not.toContain('name: Goblin');
  });

  it('colors the label with the color attribute', () => {
    const fill = (key: string) => drawn(card({ faceKey: key })).children.find((ch): ch is Text => ch instanceof Text)!.style.fill;
    expect(fill(textFaceKey({ color: 'red', number: 7 }))).toBe(0xcc2222);
    expect(fill(textFaceKey({ color: 'blue', number: 7 }))).toBe(0x2255cc);
    expect(fill(textFaceKey({ number: 7 }))).toBe(0x333333);
  });

  it('puts a corner index in the top-left, readable in the strip a fanned hand shows', () => {
    const corner = (attrs: Record<string, string | number>) => {
      const container = drawn(card({ faceKey: textFaceKey(attrs) }));
      return container.children.find((ch): ch is Text => ch instanceof Text && ch.label === 'corner-index');
    };
    const red7 = corner({ color: 'red', number: 7 })!;
    expect(red7.text).toBe('7');
    expect(red7.style.fill).toBe(0xcc2222);
    expect(red7.x).toBeLessThan(-CARD_WIDTH / 2 + 12);
    expect(red7.y).toBeLessThan(-CARD_HEIGHT / 2 + 12);
    expect(corner({ name: 'Goblin', attack: 3, color: 'green' })!.text).toBe('Gob');
    expect(corner({ suit: 'star', rank: 10, bonus: 'yes' })!.text).toBe('10\nyes');
    expect(corner({ color: 'red' })!.text).toBe('red');
    expect(corner({ shape: 'circle' })!.text).toBe('cir');
  });

  it('keeps the big centre label beside the corner index', () => {
    expect(labels(drawn(card({ faceKey: textFaceKey({ color: 'red', number: 7 }) })))).toEqual(expect.arrayContaining(['7', 'red 7']));
  });

  it('draws a card back when face down', () => {
    const container = drawn(card({ faceUp: false, faceKey: 'back' }));
    expect(labels(container)).toEqual([]);
    expect(container.children.length).toBeGreaterThan(0);
  });

  it('draws the standard look for a key that is not a text face', () => {
    expect(labels(drawn(card({ faceKey: '12S' })))).toEqual(expect.arrayContaining(['Q', '♠']));
  });
});

describe('designerFaceRenderer', () => {
  it('uses the text renderer for text keys and the standard renderer for everything else', () => {
    const text = card({ faceKey: textFaceKey({ color: 'red', number: 7 }) });
    const standard = card({ faceKey: '12S' });
    const labelsOf = (c: CardState) => {
      const container = new Container();
      (designerFaceRenderer(c) as FaceDraw)(container);
      return labels(container);
    };
    expect(labelsOf(text)).toContain('red 7');
    expect(labelsOf(standard)).toEqual(expect.arrayContaining(['Q', '♠']));
  });

  it('falls back to the standard renderer for other keys', () => {
    const c = { id: 'c1', zoneId: 'z', faceUp: true, faceKey: '12S' };
    expect(designerFaceRenderer(c)).not.toBe(textFaceRenderer(c));
  });
});
