import type { CardState, LayoutKind, LayoutOptions, PlayerId } from './scene';
import type { RuleRegistry } from './rules';

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

export interface ZoneDef {
  id: string;
  layout: LayoutKind;
  transform: { x: number; y: number; rotation?: number };
  layoutOptions?: LayoutOptions;
  bounds?: { width: number; height: number; anchor?: { x: number; y: number } };
  owner?: PlayerId | 'shared';
  visibility?: 'public' | 'owner' | 'secret';
  capacity?: number;
  accept?: { rule: string; params?: Json };
  ordering?: 'stack' | 'ordered' | 'free';
}

export interface TableDef {
  zones: ZoneDef[];
  players?: PlayerId[];
}

export interface Placement {
  cards: CardState[];
}

export function validateTableDef(
  def: TableDef,
  registry: RuleRegistry,
): { ok: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  const players = new Set(def.players ?? []);

  for (const z of def.zones) {
    if (seen.has(z.id)) errors.push(`duplicate zone id: ${z.id}`);
    seen.add(z.id);
    if (z.capacity !== undefined && z.capacity < 1) errors.push(`zone ${z.id} has capacity < 1`);
    if (z.bounds && (z.bounds.width <= 0 || z.bounds.height <= 0)) {
      errors.push(`zone ${z.id} has non-positive bounds`);
    }
    if (z.accept && !registry.has(z.accept.rule)) {
      errors.push(`zone ${z.id} references unknown rule: ${z.accept.rule}`);
    }
    if (z.owner !== undefined && z.owner !== 'shared' && def.players && !players.has(z.owner)) {
      warnings.push(`zone ${z.id} owner is not a declared player: ${z.owner}`);
    }
  }
  return { ok: errors.length === 0, errors, warnings };
}
