import type { FlowDef } from './flow';
import { refName, type FlowRegistry, type NamedRef } from './flow-registry';

export function validateFlowDef(flow: FlowDef, registry: FlowRegistry): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const pred = (ref: NamedRef, where: string) => {
    if (!registry.hasPredicate(refName(ref))) errors.push(`${where} references unknown predicate: ${refName(ref)}`);
  };
  const eff = (ref: NamedRef, where: string) => {
    if (!registry.hasEffect(refName(ref))) errors.push(`${where} references unknown effect: ${refName(ref)}`);
  };

  if (flow.phases.length === 0) errors.push('flow has no phases');
  if (flow.turn.order.length === 0) errors.push('turn.order is empty');
  if (flow.turn.next && !registry.hasPolicy(refName(flow.turn.next))) {
    errors.push(`turn.next references unknown policy: ${refName(flow.turn.next)}`);
  }

  const ids = new Set<string>();
  for (const p of flow.phases) {
    if (ids.has(p.id)) errors.push(`duplicate phase id: ${p.id}`);
    ids.add(p.id);
  }
  for (const p of flow.phases) {
    for (const e of p.onEnter ?? []) eff(e, `phase ${p.id} onEnter`);
    if (p.advance) {
      pred(p.advance.when, `phase ${p.id} advance`);
      if (!ids.has(p.advance.to)) errors.push(`phase ${p.id} advances to unknown phase: ${p.advance.to}`);
    }
    if (p.endTurn) pred(p.endTurn.when, `phase ${p.id} endTurn`);
    if (p.anyActor && p.allow !== 'any') {
      for (const t of p.anyActor) {
        if (!p.allow.includes(t)) errors.push(`phase ${p.id} anyActor lists move not in allow: ${t}`);
      }
    }
  }
  for (const t of flow.triggers ?? []) {
    pred(t.when, `trigger ${t.id}`);
    for (const e of t.then) eff(e, `trigger ${t.id}`);
  }
  (flow.end ?? []).forEach((e, i) => {
    pred(e.when, `end[${i}]`);
    eff(e.result, `end[${i}]`);
  });
  return { ok: errors.length === 0, errors };
}
