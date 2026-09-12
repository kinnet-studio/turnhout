import { Container, Graphics } from 'pixi.js';
import { CARD_HEIGHT, CARD_WIDTH, cardsByZone, type PlacedCard, type Scene, type Vec2 } from '../core/scene';
import { TableModel } from '../core/table-model';
import { placeZone } from '../core/zone-geometry';
import { CardSprite } from './card-sprite';
import type { FaceTextureCache } from './face-texture-cache';

export interface PixiTableDeps {
  faces: FaceTextureCache;
  createSprite?: () => CardSprite;
  /** Draw a faint outline where each empty zone sits. Default off (byte-identical to prior behavior). */
  showEmptyZones?: boolean;
}

export class PixiTable extends Container {
  private model = new TableModel();
  private sprites = new Map<string, CardSprite>();
  private faces: FaceTextureCache;
  private createSprite: () => CardSprite;
  private showEmptyZones: boolean;
  private emptyZoneOutlines = new Graphics();

  constructor(deps: PixiTableDeps) {
    super();
    this.sortableChildren = true;
    this.faces = deps.faces;
    this.createSprite = deps.createSprite ?? (() => new CardSprite());
    this.showEmptyZones = deps.showEmptyZones ?? false;
    this.emptyZoneOutlines.zIndex = -1;
    this.addChild(this.emptyZoneOutlines);
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

    if (this.showEmptyZones) this.drawEmptyZoneOutlines(scene);
  }

  private drawEmptyZoneOutlines(scene: Scene): void {
    this.emptyZoneOutlines.clear();
    const byZone = cardsByZone(scene);
    for (const zone of scene.zones) {
      const cards = byZone.get(zone.id) ?? [];
      if (cards.length > 0) continue;
      const box = placeZone(zone, cards);
      const width = box.width > 0 ? box.width : CARD_WIDTH;
      const height = box.height > 0 ? box.height : CARD_HEIGHT;
      this.emptyZoneOutlines
        .roundRect(box.x - width / 2, box.y - height / 2, width, height, 8)
        .stroke({ color: 0x888888, width: 2, alpha: 0.3 });
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
