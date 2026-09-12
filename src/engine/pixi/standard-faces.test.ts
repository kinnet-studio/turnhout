import { describe, expect, it } from 'vitest';
import { RANK_LABELS, SUIT_GLYPHS, isRedSuit, parseFaceKey, standardFaceRenderer } from './standard-faces';
import type { CardState } from '../core/scene';

const card = (over: Partial<CardState> = {}): CardState => ({
  id: 'x',
  zoneId: 'z',
  faceUp: true,
  faceKey: 'AS',
  ...over,
});

describe('parseFaceKey', () => {
  it('parses rank 1 (ace) and 10 and 13 (king) for each suit', () => {
    expect(parseFaceKey('1S')).toEqual({ rank: 1, suit: 'S' });
    expect(parseFaceKey('10H')).toEqual({ rank: 10, suit: 'H' });
    expect(parseFaceKey('13D')).toEqual({ rank: 13, suit: 'D' });
    expect(parseFaceKey('7C')).toEqual({ rank: 7, suit: 'C' });
  });

  it('accepts all four suit letters', () => {
    expect(parseFaceKey('5S')?.suit).toBe('S');
    expect(parseFaceKey('5H')?.suit).toBe('H');
    expect(parseFaceKey('5D')?.suit).toBe('D');
    expect(parseFaceKey('5C')?.suit).toBe('C');
  });

  it('rejects rank 0, rank 14, the "back" key, an unknown suit letter, and the empty string', () => {
    expect(parseFaceKey('0S')).toBeNull();
    expect(parseFaceKey('14S')).toBeNull();
    expect(parseFaceKey('back')).toBeNull();
    expect(parseFaceKey('1X')).toBeNull();
    expect(parseFaceKey('')).toBeNull();
  });
});

describe('RANK_LABELS / SUIT_GLYPHS / isRedSuit', () => {
  it('maps rank 1 to A and rank 12 to Q', () => {
    expect(RANK_LABELS[1 - 1]).toBe('A');
    expect(RANK_LABELS[12 - 1]).toBe('Q');
  });

  it('maps H to the heart glyph', () => {
    expect(SUIT_GLYPHS.H).toBe('♥');
  });

  it('treats only H and D as red suits', () => {
    expect(isRedSuit('H')).toBe(true);
    expect(isRedSuit('D')).toBe(true);
    expect(isRedSuit('S')).toBe(false);
    expect(isRedSuit('C')).toBe(false);
  });
});

describe('standardFaceRenderer', () => {
  it('returns a FaceDraw function for a face-up card', () => {
    const result = standardFaceRenderer(card({ faceUp: true, faceKey: '1S' }));
    expect(typeof result).toBe('function');
  });

  it('returns a FaceDraw function for a face-down card', () => {
    const result = standardFaceRenderer(card({ faceUp: false, faceKey: 'back' }));
    expect(typeof result).toBe('function');
  });
});
