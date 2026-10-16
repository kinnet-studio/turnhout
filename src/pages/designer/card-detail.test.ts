import { describe, expect, it } from 'vitest';
import { textFaceKey } from '@/engine/core/lang/cards';
import { cardDetail } from './card-detail';

describe('cardDetail', () => {
  it('names the card, then gives every other column as key value', () => {
    expect(cardDetail(textFaceKey({ name: 'Goblin', attack: 3, color: 'green' }))).toBe('Goblin — attack 3 · color green');
  });
  it('is just the name for a card with no other column', () => {
    expect(cardDetail(textFaceKey({ name: 'Coupon' }))).toBe('Coupon');
  });
  it('gives every column of a card with no name', () => {
    expect(cardDetail(textFaceKey({ color: 'red', number: 7 }))).toBe('color red · number 7');
  });
  it('is null for a face that is not words', () => {
    expect(cardDetail('back')).toBeNull();
    expect(cardDetail('12S')).toBeNull();
  });
  it('is null for a text face with no columns', () => {
    expect(cardDetail('t:')).toBeNull();
  });
});
