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
const LABEL_Y = -12;
const DETAILS_Y = 16;
/** A face lists this many of its 'key: value' lines; a card with more columns shows the first ones. */
export const FACE_DETAILS = 3;
/** The big label's size and the width it wraps at. */
const BIG_LABEL = 24;
const BIG_WRAP = CARD_WIDTH - 20;
const MEDIUM_WORD = 11;
/** The corner shows values up to this long whole, and cuts a longer first value to this many letters. */
const CORNER_LETTERS = 3;
/** Inset of the corner index: it has to fit in the strip of a card that a fanned hand leaves showing. */
const CORNER_INSET = 6;
const NUMBER = /^-?\d+$/;

/** The big label: the card's name, else every value in column order ("red 7"). */
const labelOf = (attrs: Record<string, string>): string => attrs.name ?? Object.values(attrs).join(' ');

/** Attributes the label does not already say, as small 'key: value' lines: the first FACE_DETAILS of them. */
const detailsOf = (attrs: Record<string, string>): string[] =>
  'name' in attrs
    ? Object.entries(attrs).filter(([key]) => key !== 'name').map(([key, value]) => `${key}: ${value}`).slice(0, FACE_DETAILS)
    : [];

/**
 * Bold Arial's widths, in thousandths of the font size: Pixi draws text in Arial unless told otherwise, and Liberation Sans, which
 * stands in for it where it is missing, has the same widths. A letter not listed counts as a whole font size, so a label of
 * unknown letters is never said to fit when it might not.
 */
const BOLD_WIDTHS: [number, string][] = [
  [238, "'"], [278, ' ,./Iijl'], [333, '!()-:;[]ft'], [389, '*r'], [500, 'z'], [556, '#$0123456789J_aceksvxy'],
  [584, '+<=>^~'], [611, '?FLTZbdghnopqu'], [667, 'EPSVXY'], [722, '&ABCDHKNRU'], [778, 'GOQw'], [833, 'M'], [889, '%m'],
  [944, 'W'], [975, '@'],
];
const BOLD_WIDTH = new Map(BOLD_WIDTHS.flatMap(([width, letters]) => [...letters].map((letter) => [letter, width] as const)));

/** How wide `text` is drawn in bold at `fontSize`, as Pixi measures a word to decide where a label wraps. */
export function boldTextWidth(text: string, fontSize: number): number {
  return ([...text].reduce((sum, letter) => sum + (BOLD_WIDTH.get(letter) ?? 1000), 0) * fontSize) / 1000;
}

/**
 * How the big label is set. A card with at most one detail line keeps the big centred label it has always had (every face of
 * the four games), and so does a one-word label that fits on one line of it. A card with more details has less room: any other
 * label is smaller, and ends just above them, so a word too wide for the big label is never broken in the middle.
 */
export function labelStyleOf(label: string, detailCount: number): { fontSize: number; wordWrapWidth: number; anchorY: number; y: number } {
  const words = label.split(/\s+/).filter((word) => word !== '');
  if (detailCount <= 1 || (words.length === 1 && boldTextWidth(words[0], BIG_LABEL) <= BIG_WRAP)) {
    return { fontSize: BIG_LABEL, wordWrapWidth: BIG_WRAP, anchorY: 0.5, y: LABEL_Y };
  }
  const longest = Math.max(0, ...words.map((word) => word.length));
  return { fontSize: longest <= MEDIUM_WORD ? 14 : 12, wordWrapWidth: CARD_WIDTH - 12, anchorY: 1, y: DETAILS_Y - 3 };
}

/**
 * The corner index, one value per line: the card's short values (numbers, and values of up to three letters), else the
 * first three letters of its first value. A named card is known by its name; color is left out, since the ink shows it.
 */
function cornerOf(attrs: Record<string, string>): string {
  const identifying = 'name' in attrs ? [attrs.name] : Object.entries(attrs).filter(([key]) => key !== 'color').map(([, value]) => value);
  const values = identifying.length > 0 ? identifying : Object.values(attrs);
  const short = values.filter((value) => value !== '' && (NUMBER.test(value) || value.length <= CORNER_LETTERS));
  return short.length > 0 ? short.join('\n') : values[0].slice(0, CORNER_LETTERS);
}

const drawText = (attrs: Record<string, string>): FaceDraw => (container) => {
  const ink = COLOR_VALUES[(attrs.color ?? '').toLowerCase()] ?? DEFAULT_INK;

  const g = new Graphics();
  g.roundRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 8)
    .fill(0xffffff)
    .stroke({ color: ink, width: 3 });
  container.addChild(g);

  const details = detailsOf(attrs);
  const text = labelOf(attrs);
  const looks = labelStyleOf(text, details.length);
  const label = new Text({
    text,
    style: { fontSize: looks.fontSize, fontWeight: 'bold', fill: ink, align: 'center', wordWrap: true, wordWrapWidth: looks.wordWrapWidth, breakWords: true },
  });
  label.anchor.set(0.5, looks.anchorY);
  label.position.set(0, looks.y);
  container.addChild(label);

  // Like a playing card's rank and suit: in a fanned hand only the left edge of each card shows.
  const corner = new Text({ text: cornerOf(attrs), style: { fontSize: 15, fontWeight: 'bold', fill: ink, lineHeight: 16 } });
  corner.label = 'corner-index';
  corner.position.set(-CARD_WIDTH / 2 + CORNER_INSET, -CARD_HEIGHT / 2 + CORNER_INSET);
  container.addChild(corner);

  details.forEach((line, i) => {
    const detail = new Text({ text: line, style: { fontSize: 10, fill: DEFAULT_INK } });
    detail.anchor.set(0.5, 0);
    detail.position.set(0, DETAILS_Y + i * ATTRIBUTE_LINE_HEIGHT);
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
