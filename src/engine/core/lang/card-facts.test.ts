import { describe, expect, it } from 'vitest';
import { cardFact, changeCard, faceKeyOf } from './card-facts';
import { buildCards, expandCardTable, textFaceKey } from './cards';
import { fixtureCard, fixtureColorGame, fixtureGame, fixtureState } from './testing';
import { makeRng } from '../rng';
import type { CardState } from '../scene';
import type { CompiledGame } from './types';

const knightFace = textFaceKey({ name: 'Knight', health: 3 });
const knight = (): CardState => ({ id: 'c0', zoneId: 'draw pile', faceUp: true, faceKey: knightFace, data: { name: 'Knight', health: 3, movedBy: 'p0' } });

// A table of creatures: the columns are name and health, and a card may be poisoned or carry some armor.
const creatures: CompiledGame = fixtureGame({
  cards: [{
    kind: 'table', start: 'draw pile', acesHigh: false,
    identities: [
      { attrs: { name: 'Knight', health: 3 }, faceKey: knightFace },
      { attrs: { name: 'Mage', health: 1 }, faceKey: textFaceKey({ name: 'Mage', health: 1 }) },
    ],
  }],
  facts: [{ name: 'poisoned', on: 'card', kind: 'flag' }, { name: 'armor', on: 'card', kind: 'number' }, { name: 'in jail', on: 'player', kind: 'flag' }],
});

const stateWith = (...cards: CardState[]) => fixtureState(cards);
const cardOf = (state: ReturnType<typeof stateWith>, id: string) => state.cards.find((c) => c.id === id)!;

describe('card facts', () => {
  it('reads a fact from the card, null when it is not there', () => {
    expect(cardFact(knight(), 'health')).toBe(3);
    expect(cardFact(knight(), 'poisoned')).toBeNull();
    expect(cardFact(fixtureCard('x', 'deck', {}, { data: undefined }), 'poisoned')).toBeNull();
  });
  it('merges changes into the data, keeping what was not changed', () => {
    const s = changeCard(stateWith(knight()), 'c0', { health: 2, poisoned: true }, creatures);
    expect(cardOf(s, 'c0').data).toEqual({ name: 'Knight', health: 2, movedBy: 'p0', poisoned: true });
    expect(cardFact(cardOf(s, 'c0'), 'poisoned')).toBe(true);
  });
  it('refreshes the face key: the table columns as they are now, then the facts that are set', () => {
    const s = changeCard(stateWith(knight()), 'c0', { health: 2, poisoned: true }, creatures);
    expect(cardOf(s, 'c0').faceKey).toBe(textFaceKey({ name: 'Knight', health: 2, poisoned: 'yes' }));
  });
  it('deletes a key with null, and the face key loses it', () => {
    const poisoned = changeCard(stateWith(knight()), 'c0', { health: 2, poisoned: true }, creatures);
    const cured = changeCard(poisoned, 'c0', { poisoned: null }, creatures);
    expect(cardOf(cured, 'c0').data).toEqual({ name: 'Knight', health: 2, movedBy: 'p0' });
    expect(cardOf(cured, 'c0').faceKey).toBe(textFaceKey({ name: 'Knight', health: 2 }));
    expect('poisoned' in cardOf(cured, 'c0').data!).toBe(false);
  });
  it('shows a number fact by its value, and not at all when it is 0', () => {
    const armored = changeCard(stateWith(knight()), 'c0', { armor: 2 }, creatures);
    expect(cardOf(armored, 'c0').faceKey).toBe(textFaceKey({ name: 'Knight', health: 3, armor: 2 }));
    const bare = changeCard(armored, 'c0', { armor: 0 }, creatures);
    expect(cardOf(bare, 'c0').faceKey).toBe(knightFace);
    expect(cardFact(cardOf(bare, 'c0'), 'armor')).toBe(0);
  });
  it('does not show a flag that is false', () => {
    const s = changeCard(stateWith(knight()), 'c0', { poisoned: false }, creatures);
    expect(cardOf(s, 'c0').faceKey).toBe(knightFace);
  });
  it('shows the facts in the order the game declares them, whatever the order they were set in', () => {
    const s = changeCard(changeCard(stateWith(knight()), 'c0', { armor: 1 }, creatures), 'c0', { poisoned: true }, creatures);
    expect(cardOf(s, 'c0').faceKey).toBe(textFaceKey({ name: 'Knight', health: 3, poisoned: 'yes', armor: 1 }));
  });
  it('leaves out the facts of players and keys the game never declared, such as who moved the card', () => {
    const s = changeCard(stateWith(knight()), 'c0', { 'in jail': true, mood: 'grim' }, creatures);
    expect(cardOf(s, 'c0').data).toMatchObject({ 'in jail': true, mood: 'grim', movedBy: 'p0' });
    expect(cardOf(s, 'c0').faceKey).toBe(knightFace);
    expect(cardOf(s, 'c0').faceKey).not.toContain('movedBy');
  });
  it('keeps the table columns in table order even when a column was changed last', () => {
    const s = changeCard(stateWith(knight()), 'c0', { name: 'Paladin' }, creatures);
    expect(cardOf(s, 'c0').faceKey).toBe(textFaceKey({ name: 'Paladin', health: 3 }));
  });
  it('leaves out a column the card no longer has', () => {
    const s = changeCard(stateWith(knight()), 'c0', { health: null }, creatures);
    expect(cardOf(s, 'c0').faceKey).toBe(textFaceKey({ name: 'Knight' }));
  });
  it('changes only that card and nothing else about it', () => {
    const mage: CardState = { id: 'c1', zoneId: 'hand-p0', faceUp: false, slot: 4, faceKey: textFaceKey({ name: 'Mage', health: 1 }), data: { name: 'Mage', health: 1 } };
    const before = stateWith({ ...knight(), slot: 2 }, mage);
    const after = changeCard(before, 'c0', { poisoned: true }, creatures);
    expect(cardOf(after, 'c1')).toBe(mage);
    expect(cardOf(after, 'c0')).toMatchObject({ zoneId: 'draw pile', faceUp: true, slot: 2 });
    expect(cardOf(before, 'c0').data).toEqual({ name: 'Knight', health: 3, movedBy: 'p0' });
    expect(after.rng).toBe(before.rng);
  });
  it('never changes the face key of a standard-deck card, whatever is set on it', () => {
    const game = fixtureGame({ facts: [{ name: 'poisoned', on: 'card', kind: 'flag' }] });
    const ace: CardState = { id: 'c0', zoneId: 'deck', faceUp: false, faceKey: '1S', data: { suit: 'S', rank: 1 } };
    const s = changeCard(stateWith(ace), 'c0', { poisoned: true, rank: 2 }, game);
    expect(cardOf(s, 'c0').faceKey).toBe('1S');
    expect(cardOf(s, 'c0').data).toEqual({ suit: 'S', rank: 2, poisoned: true });
    expect(faceKeyOf(ace, game)).toBe('1S');
  });
  it('gives a table card that was never changed the face key it was dealt with', () => {
    const color = fixtureColorGame();
    for (const card of buildCards(color.cards, makeRng(7)).cards) expect(faceKeyOf(card, color)).toBe(card.faceKey);
  });
  it('does so for a designer\'s table too: ranges, copies and a blank cell', () => {
    const identities = expandCardTable({
      columns: ['name', 'cost', 'copies'],
      rows: [{ cells: ['Knight', '1 to 3', '2'], line: 1 }, { cells: ['Mage', '', '1'], line: 2 }],
    });
    const game = fixtureGame({ cards: [{ kind: 'table', identities, start: 'draw pile', acesHigh: false }] });
    const { cards } = buildCards(game.cards, makeRng(3));
    expect(cards).toHaveLength(7);
    for (const card of cards) expect(faceKeyOf(card, game)).toBe(card.faceKey);
  });
  it('leaves every card of a standard deck as it was dealt', () => {
    const game = fixtureGame();
    for (const card of buildCards(game.cards, makeRng(7)).cards) expect(faceKeyOf(card, game)).toBe(card.faceKey);
  });
  it('says what the face key of a card would be without changing the card', () => {
    const poisoned = { ...knight(), data: { name: 'Knight', health: 3, movedBy: 'p0', poisoned: true } };
    expect(faceKeyOf(poisoned, creatures)).toBe(textFaceKey({ name: 'Knight', health: 3, poisoned: 'yes' }));
    expect(poisoned.faceKey).toBe(knightFace);
  });
  it('refuses a card that is not in the game', () => {
    expect(() => changeCard(stateWith(knight()), 'c9', { poisoned: true }, creatures)).toThrow('No card c9 to change.');
  });
});
