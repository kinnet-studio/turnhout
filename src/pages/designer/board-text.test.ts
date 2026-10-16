import { describe, expect, it } from 'vitest';
import type { GameState } from '@/engine/core/game-state';
import { putOn } from '@/engine/core/lang/attach';
import { createEngine, initialState } from '@/engine/core/lang/build';
import { changeCard } from '@/engine/core/lang/card-facts';
import { compileGame } from '@/engine/core/lang/compile';
import { createDefaultLibrary } from '@/engine/core/lang/library';
import { CREW_GAME, fixtureCard } from '@/engine/core/lang/testing';
import type { CompiledGame } from '@/engine/core/lang/types';
import { relocate } from '@/engine/core/lang/zones';
import type { CardState } from '@/engine/core/scene';
import { boardCaptions, boardText, cardLabel, countParts } from './board-text';

const lib = createDefaultLibrary();
const TIRED = '  Cards can be tired.';
/** CREW_GAME with counts a crew works up to, each read against the job's column of its colour; the new red rides beside the red. */
const CREW = CREW_GAME.replace(TIRED, `${TIRED}\n  Cards can have red done, gold done and new red done.`);
const compiled = compileGame(CREW, lib);
const game = compiled.game!;

/** Every card with this name, in the state's order. */
const idsOf = (state: GameState, name: string) => state.cards.filter((card) => card.data?.name === name).map((card) => card.id);

/**
 * Two players after Setup: p0's workshop holds the Vase and the Statue, the Potter (tired) and the Smith sit on the Vase in that
 * order, the Vase has red done 1 and new red done 3, and the Tinker idles.
 */
function arrange(g: CompiledGame): GameState {
  let state = createEngine(g, lib, 2, initialState(g, 1)).engine.getState();
  const [vase] = idsOf(state, 'Vase');
  state = relocate(state, [vase, idsOf(state, 'Statue')[0]], 'workshop-p0', g);
  state = putOn(state, [idsOf(state, 'Potter')[0], idsOf(state, 'Smith')[0]], 'crew-p0', vase, g);
  state = changeCard(state, idsOf(state, 'Potter')[0], { tired: true }, g);
  state = changeCard(state, vase, { 'red done': 1, 'new red done': 3 }, g);
  return relocate(state, [idsOf(state, 'Tinker')[0]], 'idle-p0', g);
}

const state = arrange(game);
const cards = state.cards;
const [vase] = idsOf(state, 'Vase');
const [statue] = idsOf(state, 'Statue');
const cardOf = (s: GameState, id: string) => s.cards.find((card) => card.id === id)!;

describe('the CREW fixture', () => {
  it('compiles with no problems', () => {
    expect(compiled.diagnostics).toEqual([]);
  });
});

describe('cardLabel', () => {
  it('is the name a card is labelled with, and says no more of a face-down one', () => {
    expect(cardLabel(cardOf(state, vase), game)).toBe('Vase');
    expect(cardLabel({ ...cardOf(state, vase), faceUp: false, faceKey: 'back', data: {} }, game)).toBe('a face-down card');
  });
});

describe('countParts', () => {
  it('reads each count against its column, with a rider beside it', () => {
    expect(countParts(cardOf(state, vase), game)).toEqual(['Red 1/2 +3 new', 'Gold 0/0']);
    expect(countParts(cardOf(state, statue), game)).toEqual(['Red 0/1', 'Gold 0/2']);
  });

  it('gives nothing for a card with no column a count reads against', () => {
    expect(countParts(cardOf(state, idsOf(state, 'Potter')[0]), game)).toEqual([]);
  });

  it('leaves a rider at 0 out', () => {
    const none = changeCard(state, vase, { 'new red done': 0 }, game);
    expect(countParts(cardOf(none, vase), game)).toEqual(['Red 1/2', 'Gold 0/0']);
  });

  it('takes the first column in the card\'s own order, and a count with no column gets no part', () => {
    const card = fixtureCard('x', 'workshop-p0', { name: 'Vase', 'red need': 2, 'red cap': 5, 'red done': 1 });
    expect(countParts(card, game)).toEqual(['Red 1/2']);
  });

  it('gives a count whose name is one word no column, so no part', () => {
    const charged = compileGame(CREW.replace(TIRED, `${TIRED}\n  Cards can have charges.`), lib).game!;
    const withCharges = changeCard(arrange(charged), vase, { charges: 4 }, charged);
    expect(countParts(cardOf(withCharges, vase), charged)).toEqual(['Red 1/2 +3 new', 'Gold 0/0']);
  });

  it('says nothing of a face-down card or one with no data', () => {
    expect(countParts({ ...cardOf(state, vase), faceUp: false, faceKey: 'back' }, game)).toEqual([]);
    expect(countParts({ id: 'bare', zoneId: 'workshop-p0', faceUp: true, faceKey: 'bare' }, game)).toEqual([]);
  });
});

describe('boardText', () => {
  it("lists a seat's public zones in Table order, each card with its flags, its counts and the cards on it", () => {
    expect(boardText(game, cards, 'p0')).toBe(
      'workshop: Vase [Red 1/2 +3 new, Gold 0/0] with Potter (tired) and Smith; Statue [Red 0/1, Gold 0/2] · idle: Tinker',
    );
  });

  it('is empty for a seat with nothing on its Board', () => {
    expect(boardText(game, cards, 'p1')).toBe('');
  });

  it('never gives the crew or the stash a part of its own', () => {
    expect(cards.some((card) => card.zoneId === 'stash-p0')).toBe(true);
    expect(boardText(game, cards, 'p0')).not.toMatch(/crew|stash/);
  });

  it('keeps the cards on a face-down card listed with it, and says nothing else of it', () => {
    const faceDown = cards.map((card): CardState => (card.id === vase ? { ...card, faceUp: false, faceKey: 'back', data: {} } : card));
    expect(boardText(game, faceDown, 'p0')).toBe(
      'workshop: a face-down card with Potter (tired) and Smith; Statue [Red 0/1, Gold 0/2] · idle: Tinker',
    );
  });

  it('says nothing more of a face-down card even if its data were left on it', () => {
    const unscrubbed = { ...cardOf(state, vase).data, tired: true };
    const faceDown = cards.map((card): CardState => (card.id === vase ? { ...card, faceUp: false, faceKey: 'back', data: unscrubbed } : card));
    expect(boardText(game, faceDown, 'p0')).toMatch(/^workshop: a face-down card with Potter \(tired\) and Smith; /);
  });

  // A held card sits in the marked zone in 1b; later games hold cards in a Board zone too, and on a card of another seat.
  it('lists the cards on a card from any zone and seat, by Table order, then seat, then slot, and a held card only under its holder', () => {
    let held = putOn(state, [idsOf(state, 'Smith')[1]], 'workshop-p0', vase, game);
    held = putOn(held, [idsOf(state, 'Tinker')[1]], 'idle-p0', vase, game);
    held = putOn(held, [idsOf(state, 'Potter')[1]], 'crew-p1', vase, game);
    expect(boardText(game, held.cards, 'p0')).toBe(
      'workshop: Vase [Red 1/2 +3 new, Gold 0/0] with Smith, Potter (tired), Smith, Potter and Tinker; Statue [Red 0/1, Gold 0/2] · idle: Tinker',
    );
    expect(boardText(game, held.cards, 'p1')).toBe('');
  });
});

describe('boardCaptions', () => {
  it("captions each card on a seat's Board that has counts, one part a line", () => {
    expect(boardCaptions(game, cards)).toEqual({ [vase]: 'Red 1/2 +3 new\nGold 0/0', [statue]: 'Red 0/1\nGold 0/2' });
  });
});
