import { describe, expect, it } from 'vitest';
import { cardById, zoneCards, type GameState } from '../game-state';
import { attachmentProblem, cardsOn, holderIdOf, onCardsZoneOf, putOn } from './attach';
import { initialState } from './build';
import { compileGame } from './compile';
import { RuleError } from './diagnostics';
import { createDefaultLibrary } from './library';
import { COUNTER_GAME, CREW_GAME, TEST_DUEL } from './testing';
import { BOX_ZONE, HOLDER_KEY, relocate } from './zones';
import { YARD_GAME } from './testing';
import type { ZoneSpec } from './types';

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

describe('a zone where some cards sit on cards in a zone it names', () => {
  const yard = compileGame(YARD_GAME, lib).game!;
  const begun = initialState(yard, 1);
  const [smith] = zoneCards(begun, 'hall').filter((card) => card.data?.name === 'Smith').map((card) => card.id);
  const firstVase = begun.cards.find((card) => card.data?.name === 'Vase')!.id;
  /** The Vase in `zoneId`, with the Smith on it in p0's yard. */
  const smithOnVaseIn = (zoneId: string) => putOn(relocate(begun, [firstVase], zoneId, yard), [smith], 'yard-p0', firstVase, yard);
  const YARD_LINE = '  Each player has a yard row that everyone can see, where some cards are on cards in their shelf.';
  const lineOf = (text: string, line: string) => text.split('\n').indexOf(line) + 1;

  describe('compiled', () => {
    it('compiles with no problems', () => expect(compileGame(YARD_GAME, lib).diagnostics).toEqual([]));
    it('refuses a zone named for the cards they sit on that no player has, on its line, with the closest such zones', () => {
      const text = YARD_GAME.replace(YARD_LINE, YARD_LINE.replace('their shelf.', 'their shelff.'));
      expect(compileGame(text, lib).diagnostics).toEqual([expect.objectContaining({
        line: lineOf(text, YARD_LINE.replace('their shelf.', 'their shelff.')), severity: 'error',
        message: 'There is no zone each player has called “shelff”.', suggestions: ['shelf'],
      })]);
    });
    it('refuses one in the center as no zone each player has', () => {
      const text = YARD_GAME.replace(YARD_LINE, YARD_LINE.replace('their shelf.', 'their hall.'));
      expect(compileGame(text, lib).diagnostics.map((d) => [d.line, d.message]))
        .toEqual([[lineOf(text, YARD_LINE.replace('their shelf.', 'their hall.')), 'There is no zone each player has called “hall”.']]);
    });
    it('Review Focus: refuses a zone named for the cards they sit on that not everyone can see', () => {
      const text = YARD_GAME.replace(YARD_LINE, YARD_LINE.replace('their shelf.', 'their stash.'));
      expect(compileGame(text, lib).diagnostics.map((d) => [d.line, d.message])).toEqual([[
        lineOf(text, YARD_LINE.replace('their shelf.', 'their stash.')),
        'Cards sit only on cards everyone can see, and not everyone can see their stash.',
      ]]);
    });
  });

  describe('the yard', () => {
    it('holds a card on nothing', () => expect(attachmentProblem(yard, relocate(begun, [smith], 'yard-p0', yard))).toBeNull());
    it('holds a card on a card in the same player\'s shelf', () => expect(attachmentProblem(yard, smithOnVaseIn('shelf-p0'))).toBeNull());
  });

  describe('the yard, refused', () => {
    const LEFT = (where: string) => `The Smith in p0's yard is on the Vase, which is now in ${where}. Move the cards on a card along with it.`;
    it('when the card it sits on is in another zone of the same player\'s, everyone can see', () =>
      expect(attachmentProblem(yard, smithOnVaseIn('workshop-p0'))).toBe(LEFT("p0's workshop")));
    it('when the card it sits on is in another player\'s shelf', () =>
      expect(attachmentProblem(yard, smithOnVaseIn('shelf-p1'))).toBe(LEFT("p1's shelf")));
  });

  describe('M1: a zone where every card sits on a card in a zone it names', () => {
    const CREW_LINE = '  Each player has a crew row that everyone can see, where every card is on a card.';
    const potter = zoneCards(begun, 'hall').find((card) => card.data?.name === 'Potter')!.id;
    /** The Vase in p0's shelf, with a Potter on it in p0's crew. */
    const onShelvedVase = (game: typeof yard) => putOn(relocate(begun, [firstVase], 'shelf-p0', game), [potter], 'crew-p0', firstVase, game);

    it('holds its cards to that zone', () => {
      const text = YARD_GAME.replace(CREW_LINE, CREW_LINE.replace('on a card.', 'on a card in their workshop.'));
      const marked = compileGame(text, lib);
      expect(marked.diagnostics).toEqual([]);
      expect(attachmentProblem(marked.game!, onShelvedVase(marked.game!)))
        .toBe("The Potter in p0's crew is on the Vase, which is now in p0's shelf. Move the cards on a card along with it.");
    });
    it('(guard) holds them to no zone in particular when it names none', () => expect(attachmentProblem(yard, onShelvedVase(yard))).toBeNull());
  });

  describe('onCardsZoneOf', () => {
    it('picks the zone named for the holder\'s zone, else the first zone where every card sits on a card and that names none', () => {
      expect(onCardsZoneOf(yard, 'p0', 'shelf')).toBe('yard-p0');
      expect(onCardsZoneOf(yard, 'p0', 'workshop')).toBe('crew-p0');
      expect(onCardsZoneOf(yard, 'p0')).toBe('crew-p0');
    });
    it('says no zone holds cards on cards in the holder\'s zone, when none does', () => {
      const unmarked = ({ onCards: _mark, ...zone }: ZoneSpec): ZoneSpec => zone;
      const onlyYard = { ...yard, zones: yard.zones.map((zone) => (zone.name === 'crew' ? unmarked(zone) : zone)) };
      expect(onlyYard.zones.filter((zone) => zone.onCards !== undefined).map((zone) => zone.name)).toEqual(['yard']);
      expect(() => onCardsZoneOf(onlyYard, 'p0', 'workshop'))
        .toThrow(new RuleError('No zone each player has holds cards on cards in their workshop.'));
    });
  });
});
