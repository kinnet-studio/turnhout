import { Graphics, Text } from 'pixi.js';
import type { CardState } from '../core/scene';
import { CARD_HEIGHT, CARD_WIDTH } from '../core/scene';
import type { FaceDraw, FaceRenderer } from './face-texture-cache';

export const RANK_LABELS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const SUIT_GLYPHS: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };

export const isRedSuit = (s: string): boolean => s === 'H' || s === 'D';

const FACE_KEY_RE = /^([1-9]|1[0-3])([SHDC])$/;

export function parseFaceKey(faceKey: string): { rank: number; suit: string } | null {
  const m = FACE_KEY_RE.exec(faceKey);
  if (!m) return null;
  return { rank: Number(m[1]), suit: m[2] };
}

const drawBack: FaceDraw = (container) => {
  const g = new Graphics();
  g.roundRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 8)
    .fill(0x1e3a5f)
    .stroke({ color: 0x333333, width: 2 });
  g.roundRect(-CARD_WIDTH / 2 + 8, -CARD_HEIGHT / 2 + 8, CARD_WIDTH - 16, CARD_HEIGHT - 16, 6).fill(0x2c5282);
  container.addChild(g);
};

const drawNeutralFace: FaceDraw = (container) => {
  const g = new Graphics();
  g.roundRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 8)
    .fill(0xffffff)
    .stroke({ color: 0x333333, width: 2 });
  container.addChild(g);
};

const drawFace = (rank: number, suit: string): FaceDraw => (container) => {
  const g = new Graphics();
  g.roundRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 8)
    .fill(0xffffff)
    .stroke({ color: 0x333333, width: 2 });
  container.addChild(g);

  const color = isRedSuit(suit) ? 0xcc2222 : 0x222222;
  const rankLabel = RANK_LABELS[rank - 1];
  const glyph = SUIT_GLYPHS[suit];

  const cornerRank = new Text({
    text: rankLabel,
    style: { fontSize: 22, fontWeight: 'bold', fill: color },
  });
  cornerRank.position.set(-CARD_WIDTH / 2 + 14, -CARD_HEIGHT / 2 + 14);
  container.addChild(cornerRank);

  const cornerGlyph = new Text({
    text: glyph,
    style: { fontSize: 18, fill: color },
  });
  cornerGlyph.position.set(-CARD_WIDTH / 2 + 14, -CARD_HEIGHT / 2 + 14 + 24);
  container.addChild(cornerGlyph);

  const centerGlyph = new Text({
    text: glyph,
    style: { fontSize: 56, fill: color },
  });
  centerGlyph.anchor.set(0.5);
  centerGlyph.position.set(0, 0);
  container.addChild(centerGlyph);
};

export const standardFaceRenderer: FaceRenderer = (card: CardState) => {
  if (!card.faceUp || card.faceKey === 'back') return drawBack;
  const parsed = parseFaceKey(card.faceKey);
  if (!parsed) return drawNeutralFace;
  return drawFace(parsed.rank, parsed.suit);
};
