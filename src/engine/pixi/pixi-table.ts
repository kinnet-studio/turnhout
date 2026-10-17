import { Container, Graphics, Text } from 'pixi.js';
import { GAP } from '../core/lang/fit-layout';
import { CARD_HEIGHT, CARD_WIDTH, cardsByZone, type CardDecor, type PlacedCard, type Scene, type Vec2 } from '../core/scene';
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
  /** Behind everything else, so a name never covers a card. */
  private zoneNames = new Container();
  private nameTexts = new Map<string, Text>();
  /** Null until a page gives some, so a table that never is leaves every card's sprite as it was made. */
  private decor: { [cardId: string]: CardDecor } | null = null;

  constructor(deps: PixiTableDeps) {
    super();
    this.sortableChildren = true;
    this.faces = deps.faces;
    this.createSprite = deps.createSprite ?? (() => new CardSprite());
    this.showEmptyZones = deps.showEmptyZones ?? false;
    this.emptyZoneOutlines.zIndex = -1;
    this.addChild(this.emptyZoneOutlines);
    this.zoneNames.zIndex = -1;
    this.addChild(this.zoneNames);
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
        if (this.decor) sprite.setDecor(this.decor[card.id] ?? null);
      }
      const upTex = this.faces.get({ ...card, faceUp: true });
      const downTex = this.faces.get({ ...card, faceKey: 'back', faceUp: false });
      sprite.setFaces(upTex, downTex);
    }

    if (this.showEmptyZones) this.drawEmptyZoneOutlines(scene);
    this.drawZoneNames(scene);
  }

  /** The ring, caption and badge each card wears, by card id. A card the map lacks goes bare, and so does one that arrives later. */
  setDecor(decor: { [cardId: string]: CardDecor }): void {
    this.decor = decor;
    for (const [id, sprite] of this.sprites) sprite.setDecor(decor[id] ?? null);
  }

  /**
   * A zone's name stands above its box, whether or not the box is outlined. Only a fitted table names its zones, so a name wraps
   * to its box and the gap between the zones of a line: two long names side by side never meet. Texts are kept by zone, so a
   * move redraws none.
   */
  private drawZoneNames(scene: Scene): void {
    const named = new Set<string>();
    for (const zone of scene.zones) {
      if (zone.label === undefined) continue;
      named.add(zone.id);
      const box = placeZone(zone, []);
      const width = box.width + GAP;
      let name = this.nameTexts.get(zone.id);
      if (!name) {
        name = new Text({
          text: zone.label,
          style: { fontSize: 18, fill: 0xd1d5db, align: 'center', wordWrap: true, wordWrapWidth: width, breakWords: true },
        });
        name.label = 'zone-label';
        name.anchor.set(0.5, 1);
        this.nameTexts.set(zone.id, name);
        this.zoneNames.addChild(name);
      }
      if (name.text !== zone.label) name.text = zone.label;
      if (name.style.wordWrapWidth !== width) name.style.wordWrapWidth = width;
      name.position.set(box.x, box.y - box.height / 2 - 4);
    }
    for (const [id, name] of [...this.nameTexts]) {
      if (named.has(id)) continue;
      this.zoneNames.removeChild(name);
      name.destroy();
      this.nameTexts.delete(id);
    }
  }

  private drawEmptyZoneOutlines(scene: Scene): void {
    this.emptyZoneOutlines.clear();
    const byZone = cardsByZone(scene);
    for (const zone of scene.zones) {
      const cards = byZone.get(zone.id) ?? [];
      // Each card of a free zone says where it goes, so an empty one has no place to mark, only its resting point.
      if (cards.length > 0 || zone.layout === 'free') continue;
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
