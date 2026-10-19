import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import { CARD_HEIGHT, CARD_WIDTH, type CardDecor } from '../core/scene';
import type { CardRenderState } from '../core/table-model';
import { resolveFlipVisual } from '../core/tween';
import { boldTextWidth } from './text-faces';

// The badge's text, bold in white on red, in lines at most BADGE_ROOM wide so it stays in the card's corner. The lines are broken here,
// with the face renderer's bold widths, because a Text is never measured: it measures on a canvas, which a test's page lacks.
const BADGE_SIZE = 10;
const BADGE_LINE = 12;
const BADGE_ROOM = 56;
// A dimmed card's faces are drawn this see-through; its ring, caption and badge are not, so they stay as easy to read.
const DIM_ALPHA = 0.4;

/** Packs `pieces` into lines joined by a space, each as long as fits in the corner; a piece too wide for it has a line of its own. */
function packLines(pieces: string[]): string[] {
  const lines: string[] = [];
  for (const piece of pieces) {
    const longer = lines.length === 0 ? null : `${lines[lines.length - 1]} ${piece}`;
    if (longer !== null && boldTextWidth(longer, BADGE_SIZE) <= BADGE_ROOM) lines[lines.length - 1] = longer;
    else lines.push(piece);
  }
  return lines;
}

/**
 * A badge's text in lines, each as long as fits in the corner. The text is a list of parts joined by ', ', and a line breaks only
 * between parts, so a count stays with what it counts (`tired,` then `1 dent`). Only a part too wide for a line of its own is broken,
 * at its spaces; a word too wide for a line has a line of its own.
 */
function badgeLines(text: string): string[] {
  const parts = text.split(', ').map((part, i, all) => (i < all.length - 1 ? `${part},` : part));
  return packLines(parts).flatMap((line) => (boldTextWidth(line, BADGE_SIZE) <= BADGE_ROOM ? [line] : packLines(line.split(' '))));
}

type Badge = { box: Container; back: Graphics; text: Text; says: string };

export class CardSprite extends Container {
  private faceUpSprite = new Sprite();
  private faceDownSprite = new Sprite();
  // A page's ring, caption and badge. All are children of the card, so they move, turn and stack with it.
  private ring: Graphics | null = null;
  private ringKind: CardDecor['ring'] = undefined;
  private caption: Text | null = null;
  private badge: Badge | null = null;

  constructor() {
    super();
    for (const s of [this.faceDownSprite, this.faceUpSprite]) {
      s.anchor.set(0.5);
      s.width = CARD_WIDTH;
      s.height = CARD_HEIGHT;
      this.addChild(s);
    }
  }

  /** Test/inspection helper. */
  get faceUpVisible(): boolean {
    return this.faceUpSprite.visible;
  }

  setFaces(faceUpTex: Texture, faceDownTex: Texture): void {
    this.faceUpSprite.texture = faceUpTex;
    this.faceDownSprite.texture = faceDownTex;
  }

  /**
   * Puts the ring, the caption and the badge in `decor` on the card, and takes off any that it lacks; fades both faces when it is
   * `dim`, and brings them back when not. `null` leaves the card bare.
   */
  setDecor(decor: CardDecor | null): void {
    this.setRing(decor?.ring);
    this.setCaption(decor?.caption);
    this.setBadge(decor?.badge);
    const alpha = decor?.dim === true ? DIM_ALPHA : 1;
    this.faceUpSprite.alpha = alpha;
    this.faceDownSprite.alpha = alpha;
  }

  private setRing(kind: CardDecor['ring']): void {
    if (kind === undefined) {
      if (this.ring) this.dropChild(this.ring);
      this.ring = null;
      this.ringKind = undefined;
      return;
    }
    if (!this.ring) {
      this.ring = new Graphics();
      this.ring.label = 'card-ring';
      this.addChild(this.ring);
    }
    if (this.ringKind === kind) return;
    this.ringKind = kind;
    // Four outside the card's edge, so the ring never covers the face.
    this.ring
      .clear()
      .roundRect(-CARD_WIDTH / 2 - 4, -CARD_HEIGHT / 2 - 4, CARD_WIDTH + 8, CARD_HEIGHT + 8, 10)
      .stroke(kind === 'chosen' ? { color: 0x22c55e, width: 5 } : { color: 0xf59e0b, width: 3 });
  }

  private setCaption(text: string | undefined): void {
    // An empty caption is no caption: a Text with nothing to say would still hold a canvas.
    if (text === undefined || text === '') {
      if (this.caption) this.dropChild(this.caption);
      this.caption = null;
      return;
    }
    if (!this.caption) {
      this.caption = new Text({
        text,
        style: { fontSize: 13, fontWeight: 'bold', fill: 0xf3f4f6, align: 'center', lineHeight: 15 },
      });
      this.caption.label = 'card-caption';
      this.caption.anchor.set(0.5, 0);
      this.caption.position.set(0, CARD_HEIGHT / 2 + 4);
      this.addChild(this.caption);
    } else if (this.caption.text !== text) {
      this.caption.text = text;
    }
  }

  private setBadge(says: string | undefined): void {
    // An empty badge is no badge, as for the caption.
    if (says === undefined || says === '') {
      this.dropBadge();
      return;
    }
    if (!this.badge) {
      const box = new Container();
      box.label = 'card-badge';
      // Inside the card's top-right corner, so it shows in the strip a stack leaves of a card under another.
      box.position.set(CARD_WIDTH / 2 - 4, -CARD_HEIGHT / 2 + 4);
      const back = new Graphics();
      back.label = 'card-badge-back';
      const text = new Text({
        text: '',
        style: { fontSize: BADGE_SIZE, fontWeight: 'bold', fill: 0xffffff, align: 'right', lineHeight: BADGE_LINE },
      });
      text.label = 'card-badge-text';
      text.anchor.set(1, 0);
      text.position.set(-3, 1);
      box.addChild(back, text);
      this.addChild(box);
      this.badge = { box, back, text, says: '' };
    }
    if (this.badge.says === says) return;
    const lines = badgeLines(says);
    const width = Math.max(...lines.map((line) => boldTextWidth(line, BADGE_SIZE)));
    const height = lines.length * BADGE_LINE;
    this.badge.says = says;
    this.badge.text.text = lines.join('\n');
    // Three wider than the text on each side, and one taller above and below; its right edge is the box's.
    this.badge.back.clear().roundRect(-width - 6, 0, width + 6, height + 2, 3).fill(0xb91c1c);
  }

  private dropChild(child: Container): void {
    this.removeChild(child);
    child.destroy();
  }

  private dropBadge(): void {
    if (!this.badge) return;
    const { box, back, text } = this.badge;
    this.removeChild(box);
    // Each part on its own: a box told to destroy its children hands them its options, and a Graphics given any keeps its drawing.
    for (const part of [back, text, box]) part.destroy();
    this.badge = null;
  }

  /** A Text holds a canvas of its own, so the card's decor goes with it. */
  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    this.setDecor(null);
    super.destroy(options);
  }

  applyRenderState(rs: CardRenderState): void {
    const { scaleX, showFaceUp } = resolveFlipVisual(rs.flipProgress, rs.faceUp);
    this.position.set(rs.current.x, rs.current.y);
    this.rotation = rs.current.rotation;
    this.scale.set(rs.current.scale * scaleX, rs.current.scale);
    this.zIndex = rs.current.z;
    this.faceUpSprite.visible = showFaceUp;
    this.faceDownSprite.visible = !showFaceUp;
  }
}
