import { describe, expect, it } from 'vitest';
import { reconcile } from './diff';
import type { CardState, Scene } from './scene';

const c = (id: string, e: Partial<CardState> = {}): CardState => ({
  id, zoneId: 'deck', faceUp: false, faceKey: 'back', ...e,
});
const s = (cards: CardState[]): Scene => ({ cards, zones: [] });

describe('reconcile', () => {
  it('adds every card when prev is null', () => {
    expect(reconcile(null, s([c('a')]))).toEqual([{ type: 'add', card: c('a') }]);
  });

  it('removes cards absent from next', () => {
    expect(reconcile(s([c('a')]), s([]))).toEqual([{ type: 'remove', id: 'a' }]);
  });

  it('emits a move when zoneId changes', () => {
    const ops = reconcile(s([c('a', { zoneId: 'deck' })]), s([c('a', { zoneId: 'hand' })]));
    expect(ops).toEqual([{ type: 'move', id: 'a', fromZoneId: 'deck', toZoneId: 'hand' }]);
  });

  it('emits a flip when faceUp changes', () => {
    const ops = reconcile(s([c('a', { faceUp: false })]), s([c('a', { faceUp: true })]));
    expect(ops).toEqual([{ type: 'flip', id: 'a', faceUp: true }]);
  });

  it('emits reface when faceKey changes without a flip', () => {
    const ops = reconcile(s([c('a', { faceKey: 'x' })]), s([c('a', { faceKey: 'y' })]));
    expect(ops).toEqual([{ type: 'reface', id: 'a', faceKey: 'y' }]);
  });

  it('orders removes, then adds, then modifications', () => {
    const prev = s([c('gone'), c('mover', { zoneId: 'deck' })]);
    const next = s([c('mover', { zoneId: 'hand' }), c('fresh')]);
    expect(reconcile(prev, next)).toEqual([
      { type: 'remove', id: 'gone' },
      { type: 'add', card: c('fresh') },
      { type: 'move', id: 'mover', fromZoneId: 'deck', toZoneId: 'hand' },
    ]);
  });
});
