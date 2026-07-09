import { Container, Sprite, type Texture } from 'pixi.js';
import { CARD_HEIGHT, CARD_WIDTH } from '../core/scene';
import type { CardRenderState } from '../core/table-model';
import { resolveFlipVisual } from '../core/tween';

export class CardSprite extends Container {
  private faceUpSprite = new Sprite();
  private faceDownSprite = new Sprite();

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
