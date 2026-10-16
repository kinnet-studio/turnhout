import { Container, Sprite, type Texture } from 'pixi.js';
import { CARD_HEIGHT, CARD_WIDTH } from '../core/scene';
import type { CardRenderState } from '../core/table-model';
import { resolveFlipVisual } from '../core/tween';
import { Graphics, Text } from 'pixi.js';
import type { CardDecor } from '../core/scene';

export class CardSprite extends Container {
  private faceUpSprite = new Sprite();
  private faceDownSprite = new Sprite();
  // A page's ring and caption. Both are children of the card, so they move, turn and stack with it.
  private ring: Graphics | null = null;
  private ringKind: CardDecor['ring'] = undefined;
  private caption: Text | null = null;

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

  /** Puts the ring and the caption in `decor` on the card, and takes off any that it lacks. `null` leaves the card bare. */
  setDecor(decor: CardDecor | null): void {
    this.setRing(decor?.ring);
    this.setCaption(decor?.caption);
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
    if (text === undefined) {
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

  private dropChild(child: Container): void {
    this.removeChild(child);
    child.destroy();
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
