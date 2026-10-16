import { describe, expect, it } from 'vitest';
import type { GameEngine } from '../../game-engine';
import { zoneCards, type GameState } from '../../game-state';
import { counterOf, isOut, lastDrawn, pieceAt, placePiece, queueRoll, setCounter, setOwner, withBoardData } from '../board-state';
import { createEngine, initialState, seatsFor } from '../build';
import { deckOf, makeCard } from '../cards';
import { compileGame } from '../compile';
import { RuleError } from '../diagnostics';
import { LangRuntime, MAX_MOMENT_DEPTH } from '../runtime';
import { deckGameText, fixtureCard, fixtureEnv, fixtureGame, fixtureState, runPhrase } from '../testing';
import type { CompiledGame, PhraseEnv, PhraseRef, Subject } from '../types';
import { BOX_ZONE, relocate, zoneIdFor } from '../zones';
import { createDefaultLibrary } from './index';

const lib = createDefaultLibrary();
const LUCKY = 'lucky-pile';
const HEAD = '| name | says |';
const CALM = [HEAD, '| Calm | They get 0 money. |'];
const DIVIDEND = '| Dividend | They get 50 money. |';
function decks(lucky: string[], fate: string[] = CALM, rules: string[] = []): CompiledGame {
  const { game, diagnostics } = compileGame(deckGameText(lucky, fate, rules), lib);
  expect(diagnostics).toEqual([]);
  return game!;
}
/** p0 to move from `from` with `roll` to come; the named lucky cards go on top in the order given, so the last named is on top. */
function started(game: CompiledGame, roll: number[], opts: { from?: number; top?: string[]; players?: number; arrange?: (s: GameState) => GameState } = {}): GameEngine {
  const { from = 0, top = [], players = 2, arrange = (s: GameState) => s } = opts;
  let s: GameState = { ...withBoardData(initialState(game, 1), game, seatsFor(players)), turn: { current: 'p0', phase: 'playing' } };
  for (const name of top) s = relocate(s, [s.cards.find((c) => c.zoneId === LUCKY && c.data?.name === name)!.id], LUCKY, game);
  return createEngine(game, lib, players, arrange(queueRoll(placePiece(s, 'p0', from), roll))).engine;
}
const rollDice = (engine: GameEngine) => engine.dispatch({ type: 'roll the dice', by: 'p0' });
const names = (state: GameState, zoneId: string) => zoneCards(state, zoneId).map((c) => c.data?.name);

describe('drawing a card and doing what it says', () => {
  it('does what the top card says for the player who drew it, then puts it at the bottom face down', () => {
    const engine = started(decks([HEAD, DIVIDEND, '| Fine | They pay 15. |']), [1, 1], { top: ['Fine', 'Dividend'] });
    expect(rollDice(engine).ok).toBe(true);
    const s = engine.getState();
    expect(counterOf(s, 'money', 'p0')).toBe(1550);
    expect(names(s, LUCKY)).toEqual(['Dividend', 'Fine']);
    expect(zoneCards(s, LUCKY).every((c) => !c.faceUp)).toBe(true);
    expect(lastDrawn(s)).toEqual({ seat: 'p0', zone: 'the lucky pile', name: 'Dividend', says: 'They get 50 money.' });
  });
  it('reads “it” as the space their piece is on, again for each sentence', () => {
    const hop = '| Hop | Their piece goes straight to Rose Lane. If someone else owns it, they pay its rent to its owner. |';
    const engine = started(decks([HEAD, hop]), [1, 1], { arrange: (s) => setOwner(s, 4, 'p1') });
    rollDice(engine);
    expect(['p0', 'p1'].map((seat) => counterOf(engine.getState(), 'money', seat))).toEqual([1486, 1514]);
  });
  it('Review Focus: a card that lands its player on another space of its pile draws the next card, never itself again', () => {
    // From Power Works (7), 1 and 2 passes Go and lands on Lucky (2); Again walks the same 3 to the other Lucky (5).
    const engine = started(decks([HEAD, DIVIDEND, '| Again | Their piece moves forward by the roll. |']), [1, 2], { from: 7, top: ['Dividend', 'Again'] });
    rollDice(engine);
    const s = engine.getState();
    expect([pieceAt(s, 'p0'), counterOf(s, 'money', 'p0')]).toEqual([5, 1750]);
    expect(names(s, LUCKY)).toEqual(['Dividend', 'Again']);
    expect(zoneCards(s, LUCKY).every((c) => !c.faceUp)).toBe(true);
    expect(lastDrawn(s)!.name).toBe('Dividend');
  });
  it('draws from the pile of the space it landed on, and says which player drew', () => {
    const engine = started(decks([HEAD, DIVIDEND], [HEAD, '| Windfall | They get 70 money. |']), [3, 3], { players: 3 });
    rollDice(engine);
    const s = engine.getState();
    expect(counterOf(s, 'money', 'p0')).toBe(1570);
    expect(names(s, 'fate-pile')).toEqual(['Windfall']);
    expect(lastDrawn(s)).toEqual({ seat: 'p0', zone: 'the fate pile', name: 'Windfall', says: 'They get 70 money.' });
  });
  it('keeps the card in the player\'s kept cards, face up, and it leaves the pile', () => {
    const engine = started(decks([HEAD, DIVIDEND, '| Free Pass | They keep this card in their kept cards. |']), [1, 1], { top: ['Free Pass'] });
    rollDice(engine);
    const s = engine.getState();
    expect(names(s, 'kept-cards-p0')).toEqual(['Free Pass']);
    expect(zoneCards(s, 'kept-cards-p0').every((c) => c.faceUp)).toBe(true);
    expect(names(s, LUCKY)).toEqual(['Dividend']);
    expect(counterOf(s, 'money', 'p0')).toBe(1500);
    expect(lastDrawn(s)!.name).toBe('Free Pass');
  });
  it('keeps the card for whoever drew it', () => {
    const keep = '| Free Pass | They keep this card in their kept cards. |';
    const engine = started(decks([HEAD, DIVIDEND, keep]), [1, 1], { top: ['Free Pass'], arrange: (s) => ({ ...s, turn: { current: 'p1', phase: 'playing' } }) });
    engine.dispatch({ type: 'roll the dice', by: 'p1' });
    const s = engine.getState();
    expect([names(s, 'kept-cards-p0'), names(s, 'kept-cards-p1')]).toEqual([[], ['Free Pass']]);
  });
  it('says there is no card to draw when the pile is empty', () => {
    const game = decks([HEAD, DIVIDEND]);
    const engine = started(game, [1, 1], { arrange: (s) => relocate(s, zoneCards(s, LUCKY).map((c) => c.id), BOX_ZONE, game) });
    expect(() => rollDice(engine)).toThrow('There is no card to draw in the lucky pile.');
  });
  it('never lets a card do nothing: a deck with no says column is told so', () => {
    const engine = started(decks([HEAD, DIVIDEND], ['| name |', '| Calm |']), [3, 3]);
    expect(() => rollDice(engine)).toThrow('The card drawn from the fate pile says nothing to do: its deck has no says column.');
  });
  it('stops cards that keep drawing cards', () => {
    const engine = started(decks([HEAD, '| Loop | They draw from the lucky pile and do what it says. |']), [1, 1]);
    expect(() => rollDice(engine)).toThrow('Cards keep drawing cards without stopping.');
  });
  it('points at the row of the card that recursed', () => {
    const ONE = 'They draw from the lucky pile and do what it says.';
    const TWO = 'They draw from the fate pile and do what it says.';
    const single = decks([HEAD, `| Loop | ${ONE} |`]);
    const thrown = (g: CompiledGame) => {
      try {
        rollDice(started(g, [1, 1]));
      } catch (error) {
        return error;
      }
      return undefined;
    };
    expect(thrown(single)).toMatchObject({ message: 'Cards keep drawing cards without stopping.', line: 7, text: ONE.replace(/\.$/, '') });
    // Two cards that send the player to each other (rows 7 and 10): the sentence that is refused is the one the cap is reached on,
    // the lucky card's at an even depth and the fate card's at an odd one, not the one that drew it.
    const pair = decks([HEAD, `| Back | ${TWO} |`], [HEAD, `| Forth | ${ONE} |`]);
    const refused = MAX_MOMENT_DEPTH % 2 === 0 ? { line: 7, text: TWO } : { line: 10, text: ONE };
    expect(thrown(pair)).toMatchObject({ line: refused.line, text: refused.text.replace(/\.$/, '') });
  });
  it('counts only the cards that are running inside one another, so a stopped loop leaves nothing behind', () => {
    const game = decks([HEAD, '| Loop | They draw from the lucky pile and do what it says. |']);
    const runtime = new LangRuntime(game, lib, seatsFor(2));
    const state = placePiece(withBoardData(initialState(game, 1), game, seatsFor(2)), 'p0', 2);
    const subject = { player: 'p0', space: 2, card: null };
    expect(() => runtime.runLine(state, game.says['They draw from the lucky pile and do what it says.'][0], subject))
      .toThrow('Cards keep drawing cards without stopping.');
    // Had the depth stayed raised, even a harmless line would now be refused.
    const calm = runtime.runLine(state, game.says['They get 0 money.'][0], subject);
    expect(counterOf(calm, 'money', 'p0')).toBe(1500);
  });
});

describe('the draw phrase on its own', () => {
  const seats = ['p0', 'p1'];
  const DRAW = "they draw from p1's pass pile and do what it says";
  const sentence: PhraseRef = { kind: 'effect', phrase: 'they get {int} {counter}', args: [50, 'money'], line: 7, text: 'They get 50 money' };
  const game = fixtureGame({ says: { 'Go ahead': [sentence] } });
  const pile = [
    fixtureCard('under', 'pass-pile-p1', { says: 'Go ahead' }, { slot: 0 }),
    fixtureCard('top', 'pass-pile-p1', { says: 'Go ahead' }, { slot: 1, faceUp: true }),
  ];
  const start = placePiece(fixtureState(pile), 'p0', 3);
  const draw = (runLine?: PhraseEnv['runLine'], over: GameState = start) =>
    runPhrase<GameState>(lib, 'effect', DRAW, fixtureEnv(over, { game, seats, subject: { player: 'p0', space: null, card: null }, runLine }));

  it('reads the card at the bottom of its pile, face up, about the space their piece is on, then turns it face down', () => {
    const seen: { pile: unknown[]; ref: PhraseRef; subject: Subject }[] = [];
    const s = draw((state, ref, subject) => {
      seen.push({ pile: zoneCards(state, 'pass-pile-p1').map((c) => [c.id, c.faceUp]), ref, subject });
      return state;
    });
    expect(seen).toEqual([{ pile: [['top', true], ['under', false]], ref: sentence, subject: { player: 'p0', space: 3, card: 'top' } }]);
    expect(zoneCards(s, 'pass-pile-p1').map((c) => [c.id, c.faceUp])).toEqual([['top', false], ['under', false]]);
  });
  it('says the pile with its owner, and which player drew', () => {
    expect(lastDrawn(draw((state) => state))).toEqual({ seat: 'p0', zone: "p1's pass pile", name: 'k-top', says: 'Go ahead' });
  });
  it('reads the space again before each sentence', () => {
    const twice = fixtureGame({ says: { 'Go ahead': [sentence, sentence] } });
    const spaces: (number | null)[] = [];
    runPhrase(lib, 'effect', DRAW, fixtureEnv(start, {
      game: twice, seats, subject: { player: 'p0', space: null, card: null },
      runLine: (state, _ref, subject) => {
        spaces.push(subject.space);
        return placePiece(state, 'p0', 5);
      },
    }));
    expect(spaces).toEqual([3, 5]);
  });
  it('finds a card\'s sentences only among the cells of the game, never among what every object has', () => {
    const odd = fixtureGame({ says: {} });
    const state = fixtureState([fixtureCard('top', 'pass-pile-p1', { says: 'constructor' }, { slot: 0 })]);
    expect(() => runPhrase(lib, 'effect', DRAW, fixtureEnv(state, { game: odd, seats, subject: { player: 'p0', space: null, card: null }, runLine: (s) => s })))
      .toThrow("The card drawn from p1's pass pile says nothing to do: its deck has no says column.");
  });
  it('needs the runtime to run a card, which supplies runLine', () => {
    expect(() => draw()).toThrow(/listening/);
  });
});

describe('keeping a card outside a card', () => {
  it('is refused where no card has been drawn', () => {
    const rules = ['  When a player has less than 1 money:', '    They keep this card in their kept cards.'];
    const text = deckGameText([HEAD, DIVIDEND], CALM, rules);
    const line = text.split('\n').findIndex((l) => l.includes('They keep this card')) + 1;
    const { diagnostics } = compileGame(text, lib);
    expect(diagnostics.map((d) => [d.line, d.message])).toEqual([[line, '“They keep this card in their kept cards” only makes sense in a card\'s says column.']]);
  });
});

describe('using a kept card', () => {
  const PASS = '| Free Pass | They keep this card in their kept cards. |';
  const USE = ['  A player may use a Free Pass.', '    Only if their kept cards has a Free Pass.', '    Then:',
    '      A Free Pass from their kept cards goes to the bottom of the pile it came from.'];
  const game = decks([HEAD, DIVIDEND, PASS], [HEAD, '| Calm | They get 0 money. |', PASS], USE);
  /** The Free Pass of the deck that starts in `pile`. */
  const passOf = (pile: string) => initialState(game, 1).cards
    .find((c) => c.data?.name === 'Free Pass' && zoneIdFor(deckOf(game.cards, c.id)!.start) === pile)!.id;

  it('greys the button until they keep one, and each card goes back under the pile its own deck starts in', () => {
    const [lucky, fate] = [passOf('lucky-pile'), passOf('fate-pile')];
    expect(started(game, [1, 1]).canDispatch({ type: 'use a free pass', by: 'p0' })).toBe('their kept cards has a Free Pass');
    const engine = started(game, [1, 1], { arrange: (s) => relocate(s, [fate, lucky], 'kept-cards-p0', game) });
    expect(engine.dispatch({ type: 'use a free pass', by: 'p0' }).ok).toBe(true);
    expect(engine.dispatch({ type: 'use a free pass', by: 'p0' }).ok).toBe(true);
    const s = engine.getState();
    expect(zoneCards(s, 'kept-cards-p0')).toEqual([]);
    expect([zoneCards(s, 'lucky-pile')[0].id, zoneCards(s, 'fate-pile')[0].id]).toEqual([lucky, fate]);
    expect(s.cards.filter((c) => c.id === lucky || c.id === fate).every((c) => !c.faceUp)).toBe(true);
  });
  it('reads “have” as well as “has”, for a zone named in the plural, with the same effect', () => {
    const have = decks([HEAD, DIVIDEND, PASS], [HEAD, '| Calm | They get 0 money. |', PASS], USE.map((line) => line.replace('kept cards has', 'kept cards have')));
    const keeping = (g: CompiledGame, ...ids: string[]) => started(g, [1, 1], { arrange: (s) => relocate(s, ids, 'kept-cards-p0', g) });
    for (const [g, said] of [[game, 'their kept cards has a Free Pass'], [have, 'their kept cards have a Free Pass']] as const) {
      expect(started(g, [1, 1]).canDispatch({ type: 'use a free pass', by: 'p0' }), said).toBe(said);
      expect(keeping(g, passOf('lucky-pile')).canDispatch({ type: 'use a free pass', by: 'p0' }), said).toBe(true);
    }
    // The same condition, whichever way it is said, and for the player it is about.
    const subject = { player: 'p0', space: null, card: null };
    const env = (g: CompiledGame, ...ids: string[]) => fixtureEnv(keeping(g, ...ids).getState(), { game: g, seats: ['p0', 'p1'], subject });
    for (const said of ['their kept cards has a Free Pass', 'their kept cards have a Free Pass']) {
      expect(runPhrase(lib, 'condition', said, env(game, passOf('fate-pile'))), said).toBe(true);
      expect(runPhrase(lib, 'condition', said, env(game)), said).toBe(false);
    }
  });
  it('says a card made from a stack that never runs out has no pile to go back to', () => {
    // The Free Pass a stack that never runs out makes, with the lucky deck's own Free Pass besides.
    const stack = ['', '  A stack called spare passes that never runs out:', `    ${HEAD}`, `    ${PASS}`].join('\n');
    const text = deckGameText([HEAD, DIVIDEND, PASS], CALM, USE).replace('\n\nTable:', `${stack}\n\nTable:`);
    const { game: stocked, diagnostics } = compileGame(text, lib);
    expect(diagnostics).toEqual([]);
    const made = makeCard(started(stocked!, [1, 1]).getState(), stocked!, { name: 'Free Pass' }, 'kept-cards-p0')!;
    expect(deckOf(stocked!.cards, made.id)).toBeNull();
    const env = fixtureEnv(made.state, { game: stocked!, seats: ['p0', 'p1'], subject: { player: 'p0', space: null, card: null } });
    const putBack = () => runPhrase(lib, 'effect', 'a Free Pass from their kept cards goes to the bottom of the pile it came from', env);
    expect(putBack).toThrow(RuleError);
    expect(putBack).toThrow('A card made from a stack that never runs out has no pile to go back to.');
  });
  it('says there is no such card when they keep none', () => {
    const state = started(game, [1, 1]).getState();
    const env = fixtureEnv(state, { game, seats: ['p0', 'p1'], subject: { player: 'p0', space: null, card: null } });
    expect(() => runPhrase(lib, 'effect', 'a Free Pass from their kept cards goes to the bottom of the pile it came from', env))
      .toThrow('There is no Free Pass in their kept cards.');
  });
  it('Review Focus: collecting from each other player takes a player below 0 out, and the rest are paid', () => {
    const party = decks([HEAD, '| Party | They get 50 money from each other player. |']);
    const engine = started(party, [1, 1], { players: 3, arrange: (s) => setCounter(s, 'money', 'p1', 30) });
    expect(rollDice(engine).ok).toBe(true);
    const s = engine.getState();
    expect([counterOf(s, 'money', 'p0'), counterOf(s, 'money', 'p2')]).toEqual([1600, 1450]);
    expect(isOut(s, 'p1')).toBe(true);
  });
});
