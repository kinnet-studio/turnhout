import type { CardState } from './scene';
import type { Json, ZoneDef } from './table-def';

export type AcceptRule = (args: {
  card: CardState;
  zone: ZoneDef;
  zoneCards: CardState[];
  top: CardState | null;
  params?: Json;
}) => boolean;

export class RuleRegistry {
  private rules = new Map<string, AcceptRule>();

  register(name: string, fn: AcceptRule): this {
    this.rules.set(name, fn);
    return this;
  }

  get(name: string): AcceptRule | undefined {
    return this.rules.get(name);
  }

  has(name: string): boolean {
    return this.rules.has(name);
  }
}

export function canAccept(
  zone: ZoneDef,
  card: CardState,
  zoneCards: CardState[],
  registry: RuleRegistry,
): boolean {
  if (zone.capacity !== undefined && zoneCards.length >= zone.capacity) return false;
  if (!zone.accept) return true;
  const rule = registry.get(zone.accept.rule);
  if (!rule) throw new Error(`unknown accept rule: ${zone.accept.rule}`);
  const top = zoneCards.length > 0 ? zoneCards[zoneCards.length - 1] : null;
  return rule({ card, zone, zoneCards, top, params: zone.accept.params });
}
