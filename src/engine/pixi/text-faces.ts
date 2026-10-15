import { Graphics, Text } from 'pixi.js';
import { parseTextFaceKey } from '../core/lang/cards';
import type { CardState } from '../core/scene';
import { CARD_HEIGHT, CARD_WIDTH } from '../core/scene';
import type { FaceDraw, FaceRenderer } from './face-texture-cache';
import { standardFaceRenderer } from './standard-faces';

/** What a designer's `color` attribute paints: the label and the border. */
const COLOR_VALUES: Record<string, number> = {
  red: 0xcc2222,
  yellow: 0xc9a400,
  green: 0x2e8b57,
  blue: 0x2255cc,
  black: 0x222222,
  purple: 0x7b3fa0,
  orange: 0xe07b00,
};

const DEFAULT_INK = 0x333333;
const ATTRIBUTE_LINE_HEIGHT = 13;

/** The big label: the card's name, else every value in column order ("red 7"). */
const labelOf = (attrs: Record<string, string>): string => attrs.name ?? Object.values(attrs).join(' ');

/** Attributes the label does not already say, as small 'key: value' lines. */
const detailsOf = (attrs: Record<string, string>): string[] =>
  'name' in attrs ? Object.entries(attrs).filter(([key]) => key !== 'name').map(([key, value]) => `${key}: ${value}`) : [];

const drawText = (attrs: Record<string, string>): FaceDraw => (container) => {
  const ink = COLOR_VALUES[(attrs.color ?? '').toLowerCase()] ?? DEFAULT_INK;

  const g = new Graphics();
  g.roundRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 8)
    .fill(0xffffff)
    .stroke({ color: ink, width: 3 });
  container.addChild(g);

  const label = new Text({
    text: labelOf(attrs),
    style: { fontSize: 24, fontWeight: 'bold', fill: ink, align: 'center', wordWrap: true, wordWrapWidth: CARD_WIDTH - 20, breakWords: true },
  });
  label.anchor.set(0.5);
  label.position.set(0, -22);
  container.addChild(label);

  detailsOf(attrs).forEach((line, i) => {
    const detail = new Text({ text: line, style: { fontSize: 10, fill: DEFAULT_INK } });
    detail.anchor.set(0.5, 0);
    detail.position.set(0, 12 + i * ATTRIBUTE_LINE_HEIGHT);
    container.addChild(detail);
  });
};

/** Faces for cards whose key says what they are in words ('t:color=red;number=7'). Backs and other keys use the standard look. */
export const textFaceRenderer: FaceRenderer = (card: CardState) => {
  const attrs = card.faceUp && card.faceKey !== 'back' ? parseTextFaceKey(card.faceKey) : null;
  return attrs && Object.keys(attrs).length > 0 ? drawText(attrs) : standardFaceRenderer(card);
};

/** What the designer's playtest draws: text faces for 't:' keys, standard playing cards for the rest. */
export const designerFaceRenderer: FaceRenderer = (card: CardState) =>
  parseTextFaceKey(card.faceKey) ? textFaceRenderer(card) : standardFaceRenderer(card);
