import { computeZoneLayout } from './layout';
import { cardsByZone, type PlacedCard, type Scene, type TargetTransform, type Vec2 } from './scene';
import { advanceFlip, stepToward } from './tween';

const FLIP_DURATION_S = 0.3;

export interface CardRenderState {
  id: string;
  faceUp: boolean;
  faceKey: string;
  draggable: boolean;
  current: TargetTransform;
  target: TargetTransform;
  ownedByDrag: boolean;
  flipProgress: number;
}

export class TableModel {
  private states = new Map<string, CardRenderState>();

  setScene(scene: Scene): void {
    const grouped = cardsByZone(scene);
    const nextTargets = new Map<string, TargetTransform>();
    const nextCards = new Map(scene.cards.map((c) => [c.id, c]));

    scene.zones.forEach((zone, zoneIndex) => {
      const members = grouped.get(zone.id) ?? [];
      const layout = computeZoneLayout(zone, members, zoneIndex * 1000);
      for (const [id, t] of layout) nextTargets.set(id, t);
    });

    // Remove departed cards.
    for (const id of [...this.states.keys()]) {
      if (!nextCards.has(id)) this.states.delete(id);
    }

    // Add / update present cards.
    for (const card of scene.cards) {
      const target = nextTargets.get(card.id) ?? { x: 0, y: 0, rotation: 0, scale: 1, z: 0 };
      const existing = this.states.get(card.id);
      if (!existing) {
        this.states.set(card.id, {
          id: card.id,
          faceUp: card.faceUp,
          faceKey: card.faceKey,
          draggable: card.draggable ?? true,
          current: { ...target },
          target,
          ownedByDrag: false,
          flipProgress: 1,
        });
        continue;
      }
      if (existing.faceUp !== card.faceUp) existing.flipProgress = 0;
      existing.faceUp = card.faceUp;
      existing.faceKey = card.faceKey;
      existing.draggable = card.draggable ?? true;
      // Intentionally retarget even drag-owned cards: `advance` already skips
      // position-stepping while ownedByDrag (current follows dragTo), so keeping
      // target on the live layout means the card animates to its declared home on
      // drop. Do NOT re-guard this with `if (!ownedByDrag)` — that reintroduces a
      // bug where a card dropped after a mid-drag scene change never animates home.
      existing.target = target;
    }
  }

  advance(dtSeconds: number): void {
    for (const s of this.states.values()) {
      if (!s.ownedByDrag) s.current = stepToward(s.current, s.target, dtSeconds);
      if (s.flipProgress < 1) s.flipProgress = advanceFlip(s.flipProgress, dtSeconds, FLIP_DURATION_S);
    }
  }

  beginDrag(id: string): void {
    const s = this.states.get(id);
    if (s) s.ownedByDrag = true;
  }

  dragTo(id: string, world: Vec2): void {
    const s = this.states.get(id);
    if (!s || !s.ownedByDrag) return;
    s.current = { ...s.current, x: world.x, y: world.y, z: 100000 };
  }

  endDrag(id: string): void {
    const s = this.states.get(id);
    if (s) s.ownedByDrag = false;
  }

  getRenderStates(): CardRenderState[] {
    return [...this.states.values()];
  }

  getPlacedCards(): PlacedCard[] {
    return [...this.states.values()].map((s) => ({ id: s.id, transform: s.current, draggable: s.draggable }));
  }
}
