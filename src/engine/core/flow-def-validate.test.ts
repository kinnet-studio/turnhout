import { describe, expect, it } from 'vitest';
import { validateFlowDef } from './flow-def-validate';
import type { FlowDef } from './flow';
import { FlowRegistry } from './flow-registry';

const reg = () =>
  new FlowRegistry()
    .registerPredicate('always', () => true)
    .registerEffect('noop', (s) => s)
    .registerPolicy('rr', (_s, order) => order[0]);

const base = (): FlowDef => ({
  turn: { order: ['a', 'b'] },
  phases: [{ id: 'main', allow: 'any' }],
});

describe('validateFlowDef', () => {
  it('accepts a minimal valid flow', () => {
    expect(validateFlowDef(base(), reg())).toEqual({ ok: true, errors: [] });
  });

  it('rejects empty phases and empty turn order', () => {
    const v = validateFlowDef({ turn: { order: [] }, phases: [] }, reg());
    expect(v.ok).toBe(false);
    expect(v.errors).toContain('flow has no phases');
    expect(v.errors).toContain('turn.order is empty');
  });

  it('rejects duplicate phase ids', () => {
    const f = base();
    f.phases.push({ id: 'main', allow: 'any' });
    expect(validateFlowDef(f, reg()).errors).toContain('duplicate phase id: main');
  });

  it('rejects advance.to naming an unknown phase', () => {
    const f = base();
    f.phases[0].advance = { when: 'always', to: 'nope' };
    expect(validateFlowDef(f, reg()).errors).toContain('phase main advances to unknown phase: nope');
  });

  it('rejects unresolved named refs of each kind', () => {
    const f: FlowDef = {
      turn: { order: ['a'], next: 'missingPolicy' },
      phases: [
        {
          id: 'p',
          allow: ['x'],
          onEnter: ['missingEffect'],
          advance: { when: 'missingPred', to: 'p' },
          endTurn: { when: { name: 'missingPred2', params: null } },
        },
      ],
      triggers: [{ id: 't1', when: 'missingPred3', then: ['missingEffect2'] }],
      end: [{ when: 'missingPred4', result: 'missingEffect3' }],
    };
    const v = validateFlowDef(f, reg());
    expect(v.ok).toBe(false);
    expect(v.errors).toContain('turn.next references unknown policy: missingPolicy');
    expect(v.errors).toContain('phase p onEnter references unknown effect: missingEffect');
    expect(v.errors).toContain('phase p advance references unknown predicate: missingPred');
    expect(v.errors).toContain('phase p endTurn references unknown predicate: missingPred2');
    expect(v.errors).toContain('trigger t1 references unknown predicate: missingPred3');
    expect(v.errors).toContain('trigger t1 references unknown effect: missingEffect2');
    expect(v.errors).toContain('end[0] references unknown predicate: missingPred4');
    expect(v.errors).toContain('end[0] references unknown effect: missingEffect3');
  });

  it('rejects anyActor entries missing from allow', () => {
    const f = base();
    f.phases[0] = { id: 'main', allow: ['play'], anyActor: ['reorder'] };
    expect(validateFlowDef(f, reg()).errors).toContain('phase main anyActor lists move not in allow: reorder');
  });

  it("accepts anyActor entries when allow is 'any'", () => {
    const f = base();
    f.phases[0] = { id: 'main', allow: 'any', anyActor: ['reorder'] };
    expect(validateFlowDef(f, reg()).ok).toBe(true);
  });

  it('rejects endTurn.after entries missing from allow', () => {
    const f = base();
    f.phases[0] = { id: 'main', allow: ['play'], endTurn: { when: 'always', after: ['reorder'] } };
    expect(validateFlowDef(f, reg()).errors).toContain('phase main endTurn.after lists move not in allow: reorder');
  });

  it("accepts endTurn.after entries when allow is 'any'", () => {
    const f = base();
    f.phases[0] = { id: 'main', allow: 'any', endTurn: { when: 'always', after: ['reorder'] } };
    expect(validateFlowDef(f, reg()).ok).toBe(true);
  });
});
