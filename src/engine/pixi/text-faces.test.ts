import { Container, Text } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import COLOR_MATCH from '@/games/color-match.rules?raw';
import HEARTS from '@/games/hearts.rules?raw';
import RENT_DAY from '@/games/rent-day.rules?raw';
import VENOM from '@/games/venom.rules?raw';
import { createEngine, initialState } from '../core/lang/build';
import { parseTextFaceKey, textFaceKey } from '../core/lang/cards';
import { compileGame } from '../core/lang/compile';
import { createDefaultLibrary } from '../core/lang/library';
import { CARD_HEIGHT, CARD_WIDTH, type CardState } from '../core/scene';
import type { FaceDraw } from './face-texture-cache';
import { boldTextWidth, designerFaceRenderer, labelStyleOf, textFaceRenderer } from './text-faces';

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

describe('faces of cards with many columns', () => {
  it('lists only the first three detail lines', () => {
    const container = drawn(card({ faceKey: textFaceKey({ name: 'Goblin', attack: 3, defense: 2, speed: 1, cost: 5, rarity: 'rare' }) }));
    expect(labels(container)).toEqual(expect.arrayContaining(['attack: 3', 'defense: 2', 'speed: 1']));
    expect(labels(container)).not.toContain('cost: 5');
    expect(labels(container)).not.toContain('rarity: rare');
  });

  it('keeps today\'s label for a card with at most one detail line, or a short one-word name', () => {
    const today = { fontSize: 24, wordWrapWidth: 80, anchorY: 0.5, y: -12 };
    for (const name of ['Goblin', 'Knight', 'Archer', 'Viper']) expect(labelStyleOf(name, 3), name).toEqual(today);
    expect(labelStyleOf('red 7', 0)).toEqual(today);
    expect(labelStyleOf('Wandering Merchant', 0)).toEqual(today);
    expect(labelStyleOf('Wandering Merchant', 1)).toEqual(today);
  });

  it('shrinks a longer label of a card with two or more details, and lifts it clear of them', () => {
    const lifted = { fontSize: 14, wordWrapWidth: 88, anchorY: 1, y: 13 };
    expect(labelStyleOf('Wandering Merchant', 2)).toEqual(lifted);
    expect(labelStyleOf('Big Bad', 3)).toEqual(lifted);
    expect(labelStyleOf('Extraordinarily Big', 2)).toEqual({ ...lifted, fontSize: 12 });
  });

  it('draws a long name small and above its details', () => {
    const container = drawn(card({ faceKey: textFaceKey({ name: 'Wandering Merchant', attack: 3, defense: 2 }) }));
    const label = container.children.find((ch): ch is Text => ch instanceof Text && ch.text === 'Wandering Merchant')!;
    expect(label.style.fontSize).toBe(14);
    expect(label.anchor.y).toBe(1);
  });

  it('draws a long name with one detail line as it always was', () => {
    const container = drawn(card({ faceKey: textFaceKey({ name: 'Get Out Of Jail Free', says: 'They keep this card until they use it.' }) }));
    const label = container.children.find((ch): ch is Text => ch instanceof Text && ch.text === 'Get Out Of Jail Free')!;
    expect(label.style.fontSize).toBe(24);
    expect(label.anchor.y).toBe(0.5);
    expect(label.y).toBe(-12);
  });

  it('draws a short name as it always was', () => {
    const container = drawn(card({ faceKey: textFaceKey({ name: 'Goblin', attack: 3 }) }));
    const label = container.children.find((ch): ch is Text => ch instanceof Text && ch.text === 'Goblin')!;
    expect(label.style.fontSize).toBe(24);
    expect(label.anchor.y).toBe(0.5);
    expect(label.y).toBe(-12);
  });
});

describe('a one-word name on a card with details', () => {
  const lifted = { fontSize: 14, wordWrapWidth: 88, anchorY: 1, y: 13 };

  it('is measured as the faces draw it, in bold Arial: "Hacker" is just over the big label\'s 80, "Goblin" inside it', () => {
    expect(boldTextWidth('Hacker', 24)).toBeCloseTo(80.04);
    expect(boldTextWidth('Goblin', 24)).toBeCloseTo(76.01);
    expect(boldTextWidth('Hacker', 14)).toBeCloseTo(46.69);
  });

  it('knows the width of every letter and digit, and counts any other character as a whole font size', () => {
    for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
      expect(boldTextWidth(letter, 1000), letter).toBeLessThan(1000);
    }
    expect(boldTextWidth('é', 24)).toBe(24);
  });

  it('is set smaller when it is too wide for the big label, so "Hacker" stays on one line', () => {
    const looks = labelStyleOf('Hacker', 3);
    expect(looks).toEqual(lifted);
    expect(boldTextWidth('Hacker', looks.fontSize)).toBeLessThanOrEqual(looks.wordWrapWidth);
    const container = drawn(card({ faceKey: textFaceKey({ name: 'Hacker', cost: 6, skill: 'software', output: 2 }) }));
    const label = container.children.find((ch): ch is Text => ch instanceof Text && ch.text === 'Hacker')!;
    expect(label.style.fontSize).toBe(14);
  });

  it('keeps the big label when it fits, whatever its letters', () => {
    const today = { fontSize: 24, wordWrapWidth: 80, anchorY: 0.5, y: -12 };
    for (const name of ['Diva', 'Fixer', 'Goblin', 'Archer']) {
      expect(boldTextWidth(name, 24), name).toBeLessThanOrEqual(80);
      expect(labelStyleOf(name, 3), name).toEqual(today);
    }
  });
});

describe('the faces of the four games', () => {
  const lib = createDefaultLibrary();
  const games = { Hearts: HEARTS, 'Color Match': COLOR_MATCH, Venom: VENOM, 'Rent Day': RENT_DAY };
  const labelOfFace = (faceKey: string) => drawn(card({ faceKey })).children.find((ch): ch is Text => ch instanceof Text)!;

  for (const [name, text] of Object.entries(games)) {
    it(`keeps today's big centred label on every card of ${name}`, () => {
      const game = compileGame(text, lib).game!;
      const { engine } = createEngine(game, lib, game.players.min, initialState(game, 1));
      const keys = [...new Set(engine.getState().cards.map((c) => c.faceKey))].filter((key) => parseTextFaceKey(key) !== null);
      if (name === 'Hearts') expect(keys).toEqual([]);
      else expect(keys.length).toBeGreaterThan(0);
      for (const key of keys) {
        const label = labelOfFace(key);
        expect({ fontSize: label.style.fontSize, wordWrapWidth: label.style.wordWrapWidth, anchorY: label.anchor.y, y: label.y }, key)
          .toEqual({ fontSize: 24, wordWrapWidth: 80, anchorY: 0.5, y: -12 });
      }
    });
  }
});
