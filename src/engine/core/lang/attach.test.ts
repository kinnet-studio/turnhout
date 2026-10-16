import { describe, expect, it } from 'vitest';
import { cardById, zoneCards, type GameState } from '../game-state';
import { attachmentProblem, cardsOn, holderIdOf, onCardsZoneOf, putOn } from './attach';
import { initialState } from './build';
import { compileGame } from './compile';
import { RuleError } from './diagnostics';
import { createDefaultLibrary } from './library';
import { COUNTER_GAME, CREW_GAME, TEST_DUEL } from './testing';
import { BOX_ZONE, HOLDER_KEY, relocate } from './zones';

const lib = createDefaultLibrary();
const game = compileGame(CREW_GAME, lib).game!;

/** The cards as they start, every job in the pile and every hand in the hall, with the Vase moved to p0's workshop. */
const start = initialState(game, 1);
const vase = start.cards.find((card) => card.data?.name === 'Vase')!.id;
const [potter1, potter2] = zoneCards(start, 'hall').filter((card) => card.data?.name === 'Potter').map((card) => card.id);
const atWork = relocate(start, [vase], 'workshop-p0', game);

/** The state with `id` said to sit on `holder`, wherever it is: what no phrase would do, so that a broken table can be built. */
const forge = (state: GameState, id: string, holder: string): GameState =>
  ({ ...state, cards: state.cards.map((card) => (card.id === id ? { ...card, data: { ...card.data, [HOLDER_KEY]: holder } } : card)) });

const LEFT_BEHIND = (where: string) => `The Potter in p0's crew is on the Vase, which is now in ${where}. Move the cards on a card along with it.`;

describe('a card that sits on a card', () => {
  it('puts cards in a zone after what is there, each on the card, and reads the card back', () => {
    const state = putOn(atWork, [potter2, potter1], 'crew-p0', vase, game);
    expect(zoneCards(state, 'crew-p0').map((card) => card.id)).toEqual([potter2, potter1]);
    expect(holderIdOf(cardById(state, potter1)!)).toBe(vase);
    expect(holderIdOf(cardById(state, vase)!)).toBeNull();
  });
  it('lists the cards on a card in slot order', () => {
    const state = putOn(atWork, [potter2, potter1], 'crew-p0', vase, game);
    expect(cardsOn(state, vase).map((card) => card.id)).toEqual([potter2, potter1]);
    expect(cardsOn(state, potter1)).toEqual([]);
  });
  it('finds the zone a seat keeps cards on cards in', () => {
    expect(onCardsZoneOf(game, 'p1')).toBe('crew-p1');
  });
  it('says how to mark one, in a game that has none', () => {
    const counters = compileGame(COUNTER_GAME, lib).game!;
    expect(() => onCardsZoneOf(counters, 'p0')).toThrow(new RuleError(
      'This game has no zone where cards sit on cards. End a zone line each player has with “, where every card is on a card”.',
    ));
  });
});

describe('the table is whole', () => {
  it('when every card in the crew sits on a job on the same player\'s table', () => {
    expect(attachmentProblem(game, putOn(atWork, [potter1, potter2], 'crew-p0', vase, game))).toBeNull();
  });
  it('is never asked of a game with no zone where cards sit on cards', () => {
    const duel = compileGame(TEST_DUEL, lib).game!;
    const dealt = initialState(duel, 1);
    expect(attachmentProblem(duel, forge(dealt, dealt.cards[0].id, 'c999'))).toBeNull();
  });
});

describe('the table is broken', () => {
  it('when a card in the crew sits on nothing', () => {
    expect(attachmentProblem(game, relocate(atWork, [potter1], 'crew-p0', game)))
      .toBe("The Potter in p0's crew isn't on any card, but every card there must be.");
  });
  it('when a card sits on a card in a zone whose cards don\'t', () => {
    expect(attachmentProblem(game, forge(relocate(atWork, [potter1], 'idle-p0', game), potter1, vase)))
      .toBe("The Potter in p0's idle is on a card, but cards there don't sit on cards.");
  });
  it('when the card it sits on is gone, or in the box', () => {
    const NO_LONGER = "The Potter in p0's crew is on a card that is no longer on the table.";
    expect(attachmentProblem(game, putOn(atWork, [potter1], 'crew-p0', 'c999', game))).toBe(NO_LONGER);
    const boxed = relocate(putOn(atWork, [potter1], 'crew-p0', vase, game), [vase], BOX_ZONE, game);
    expect(attachmentProblem(game, boxed)).toBe(NO_LONGER);
  });
  it('when the card it sits on went where it can\'t follow: a shared zone, another player\'s, or one not everyone can see', () => {
    const hired = putOn(atWork, [potter1], 'crew-p0', vase, game);
    expect(attachmentProblem(game, relocate(hired, [vase], 'scrap', game))).toBe(LEFT_BEHIND('the scrap'));
    expect(attachmentProblem(game, relocate(hired, [vase], 'workshop-p1', game))).toBe(LEFT_BEHIND("p1's workshop"));
    expect(attachmentProblem(game, relocate(hired, [vase], 'stash-p0', game))).toBe(LEFT_BEHIND("p0's stash"));
  });
  it('gives the problem of the card the state holds first', () => {
    const broken = forge(putOn(relocate(atWork, [potter2], 'idle-p0', game), [potter1], 'crew-p0', 'c999', game), potter2, vase);
    const leading = (id: string): GameState =>
      ({ ...broken, cards: [...broken.cards.filter((card) => card.id === id), ...broken.cards.filter((card) => card.id !== id)] });
    expect(attachmentProblem(game, leading(potter1))).toBe("The Potter in p0's crew is on a card that is no longer on the table.");
    expect(attachmentProblem(game, leading(potter2))).toBe("The Potter in p0's idle is on a card, but cards there don't sit on cards.");
  });
});
