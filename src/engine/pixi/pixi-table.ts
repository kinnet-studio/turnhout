import { Container } from 'pixi.js';
import type { PlacedCard, Scene, Vec2 } from '../core/scene';
import { TableModel } from '../core/table-model';
import { CardSprite } from './card-sprite';
import type { FaceTextureCache } from './face-texture-cache';

export interface PixiTableDeps {
  faces: FaceTextureCache;
  createSprite?: () => CardSprite;
}

export class PixiTable extends Container {
  private model = new TableModel();
  private sprites = new Map<string, CardSprite>();
  private faces: FaceTextureCache;
  private createSprite: () => CardSprite;

  constructor(deps: PixiTableDeps) {
    super();
    this.sortableChildren = true;
    this.faces = deps.faces;
    this.createSprite = deps.createSprite ?? (() => new CardSprite());
  }

  setScene(scene: Scene): void {
    this.model.setScene(scene);
    const present = new Set(scene.cards.map((c) => c.id));

    for (const [id, sprite] of [...this.sprites]) {
      if (!present.has(id)) {
        this.removeChild(sprite);
        sprite.destroy();
        this.sprites.delete(id);
      }
    }

    for (const card of scene.cards) {
      let sprite = this.sprites.get(card.id);
      if (!sprite) {
        sprite = this.createSprite();
        this.sprites.set(card.id, sprite);
        this.addChild(sprite);
      }
      const upTex = this.faces.get({ ...card, faceUp: true });
      const downTex = this.faces.get({ ...card, faceKey: 'back', faceUp: false });
      sprite.setFaces(upTex, downTex);
    }
  }

  advance(dtSeconds: number): void {
    this.model.advance(dtSeconds);
    for (const rs of this.model.getRenderStates()) {
      this.sprites.get(rs.id)?.applyRenderState(rs);
    }
  }

  getPlacedCards(): PlacedCard[] {
    return this.model.getPlacedCards();
  }

  beginDrag(id: string): void {
    this.model.beginDrag(id);
  }

  dragTo(id: string, world: Vec2): void {
    this.model.dragTo(id, world);
  }

  endDrag(id: string): void {
    this.model.endDrag(id);
  }

  get spriteCount(): number {
    return this.sprites.size;
  }
}
