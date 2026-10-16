import { setPhase, zoneCards, type GameState } from '../../game-state';
import { shuffleWithRng } from '../../rng';
import type { PlayerId } from '../../scene';
import { interruptTurn, isOut, nextIn, playerFact, resumeTurn } from '../board-state';
import { RuleError } from '../diagnostics';
import type { PhraseLibrary } from '../phrases';
import { phaseTakesTurns } from '../turns';
import type { CardMatch, ConditionFn, EffectFn, PhraseEnv, ScoreFn, Subject, TurnFn, WinnerFn, ZoneRef } from '../types';
import { chooseNext, leftOf, matchesCard, relocate, resolveSeat, resolveZoneIds, topCard, zoneIdFor, zoneInfo } from '../zones';
import { describeZone, soleZone, theyOf, totalOf } from './support';

const idsIn = (state: GameState, zoneId: string): string[] => zoneCards(state, zoneId).map((c) => c.id);

// ---- conditions ------------------------------------------------------------------------------

/** A condition on the size of a zone; “each hand” must pass in every one of the hands. */
const sizeIs = (test: (have: number, n: number) => boolean): ConditionFn => (env, args) => {
  const [ref, n] = args as [ZoneRef, number];
  return resolveZoneIds(ref, env).every((id) => test(zoneCards(env.state, id).length, n));
};

/** A zone with a card in it, for a zone named in the singular or the plural alike. */
const notEmpty = sizeIs((have) => have > 0);

const zonesEmpty: ConditionFn = (env, args) =>
  (args[0] as ZoneRef[]).every((ref) => resolveZoneIds(ref, env).every((id) => zoneCards(env.state, id).length === 0));

const someSeatEmpty: ConditionFn = (env, args) =>
  env.seats.some((seat) => zoneCards(env.state, zoneIdFor(args[0] as string, seat)).length === 0);

// ---- effects ---------------------------------------------------------------------------------

/** Puts the zone's cards in a new order, slots rewritten 0…n-1. */
function shuffleOne(state: GameState, zoneId: string): GameState {
  const { items, rng } = shuffleWithRng(zoneCards(state, zoneId), state.rng);
  const slotById = new Map(items.map((c, i) => [c.id, i] as const));
  return {
    ...state,
    rng,
    cards: state.cards.map((c) => {
      const slot = slotById.get(c.id);
      return slot === undefined ? c : { ...c, slot };
    }),
  };
}

const shuffle: EffectFn = (env, args) => resolveZoneIds(args[0] as ZoneRef, env).reduce(shuffleOne, env.state);

function notEnoughCards(left: number, from: ZoneRef): RuleError {
  const where = describeZone(from);
  if (left === 0) return new RuleError(`There are no cards left in ${where}.`);
  return new RuleError(`Only ${left} ${left === 1 ? 'card is' : 'cards are'} left in ${where}.`);
}

export const deal: EffectFn = (env, args) => {
  const [count, fromRef, toRef] = args as [number, ZoneRef, ZoneRef];
  if (count < 0) throw new RuleError('A negative number of cards cannot be dealt.');
  const from = soleZone(fromRef, env);
  let state = env.state;
  for (const to of resolveZoneIds(toRef, env)) {
    const remaining = zoneCards(state, from);
    if (remaining.length < count) throw notEnoughCards(remaining.length, fromRef);
    const top = count > 0 ? remaining.slice(-count) : [];
    state = relocate(state, top.map((c) => c.id), to, env.game);
  }
  return state;
};

const moveAll: EffectFn = (env, args) => {
  const [fromRef, toRef] = args as [ZoneRef, ZoneRef];
  const to = soleZone(toRef, env);
  const ids = resolveZoneIds(fromRef, env).flatMap((id) => idsIn(env.state, id));
  return relocate(env.state, ids, to, env.game);
};

const moveTop: EffectFn = (env, args) => {
  const [fromRef, toRef] = args as [ZoneRef, ZoneRef];
  const from = soleZone(fromRef, env);
  const to = soleZone(toRef, env);
  const top = topCard(env.state, from);
  if (!top) throw new RuleError(`There is no card to move: ${describeZone(fromRef)} is empty.`);
  return relocate(env.state, [top.id], to, env.game);
};

const shuffleRestInto: EffectFn = (env, args) => {
  const [fromRef, toRef] = args as [ZoneRef, ZoneRef];
  const from = soleZone(fromRef, env);
  const to = soleZone(toRef, env);
  const { items, rng } = shuffleWithRng(zoneCards(env.state, from).slice(0, -1), env.state.rng);
  return relocate({ ...env.state, rng }, items.map((c) => c.id), to, env.game);
};

const passLeft: EffectFn = (env, args) => {
  const [fromZone, toZone] = args as [string, string];
  // Worked out for every seat first, so a zone that is both a source and a target passes the cards it started with.
  const passes = env.seats.map((seat) => ({
    ids: idsIn(env.state, zoneIdFor(fromZone, seat)),
    to: zoneIdFor(toZone, leftOf(seat, env.seats)),
  }));
  return passes.reduce((state, { ids, to }) => relocate(state, ids, to, env.game), env.state);
};

const winnerGoesNext: EffectFn = (env) => chooseNext(env.state, resolveSeat({ who: 'winner' }, env));

const holderGoesFirst: EffectFn = (env, args) => {
  const match = args[0] as CardMatch;
  const holds = (seat: string) =>
    env.state.cards.some((c) => matchesCard(c, match) && zoneInfo(env.game, c.zoneId)?.seat === seat);
  const holder = env.seats.find(holds);
  if (holder === undefined) throw new RuleError('No player is holding that card.');
  return chooseNext(env.state, holder);
};

// ---- interrupting a turn ---------------------------------------------------------------------

/**
 * Runs the start lines of `phase` about `seat`, the player whose turn it is, where players take turns, and about no one in
 * particular where everyone acts at once. Each line sees what the line before it did, as an advance's start lines do.
 */
function runStartLines(env: PhraseEnv, state: GameState, phase: string, seat: PlayerId): GameState {
  const startLines = env.game.phases.find((p) => p.id === phase)?.onEnter ?? [];
  if (startLines.length === 0) return state;
  const { runLine } = env;
  if (!runLine) throw new Error('This phrase needs to run the start lines of a phase, but nothing is listening.');
  const about: Subject = { player: phaseTakesTurns(env.game, phase) ? seat : null, space: null, card: null };
  return startLines.reduce((acc, ref) => runLine(acc, ref, about), state);
}

/**
 * Interrupts the turn for another phase, which starts with `next`. The phase's start lines then run, as an advance runs them: about
 * `next` where players take turns, and about no one in particular where everyone acts at once.
 *
 * Meant for a button's lines. Started by a `When` rule after a press the After line names, it swallows that pass: the flow runs
 * `When` rules before it passes the turn, and by then the phase is the new one, whose After line does not name the press. The
 * kept turn is still the presser's, with nothing done in it, so going back to it gives them the turn again.
 */
function startPhase(env: PhraseEnv, phase: string, next: PlayerId): GameState {
  return runStartLines(env, interruptTurn(env.state, phase, next), phase, next);
}

/**
 * The phases the chain of “go to” effects now running has gone to, outermost first, for each game. The lines of a phase gone to may
 * themselves go to another, so a chain is the effects now running inside one another, and it is forgotten as each one finishes.
 */
const wentThrough = new WeakMap<object, string[]>();

/**
 * Moves the game on to the phase and runs its start lines, as an advance does (R2), with the turn where it was: it is still the
 * same player's. Only the start lines run: a phase's “When a player's turn starts:” lines run as a turn starts, never as a phase
 * is gone to, so a first phase that starts each turn is not started again by a “go to” that comes back to it.
 *
 * A start line that goes back to a phase the chain already went to would never stop, so it is refused, naming the phases, rather
 * than left to the cap on lines inside lines, whose words are about cards.
 */
const goToPhase: EffectFn = (env, [phase]) => {
  if (!env.state.turn) throw new RuleError('There is no turn to move on.');
  const name = phase as string;
  const chain = wentThrough.get(env.game) ?? [];
  if (chain.includes(name)) {
    throw new RuleError(`“Go to ${name}” comes back to a phase this line already went through: ${[...chain, name].join(' → ')}.`);
  }
  wentThrough.set(env.game, [...chain, name]);
  try {
    return runStartLines(env, setPhase(env.state, name), name, env.state.turn.current);
  } finally {
    // Back to the chain this one was reached by, or to none when it was the first, even when a line threw.
    if (chain.length === 0) wentThrough.delete(env.game);
    else wentThrough.set(env.game, chain);
  }
};

/** The phase starts with the next player still in on their left: a player who is out could not act in it. */
const phaseStartsOnTheirLeft: EffectFn = (env, [phase]) => startPhase(env, phase as string, nextIn(env.state, theyOf(env), env.seats));

/**
 * The phase starts with the player the rule is about, who keeps the turn in it. A button's press is noted before its lines run, so
 * the turn kept to go back to already has it.
 */
const phaseStartsWithThem: EffectFn = (env, [phase]) => startPhase(env, phase as string, theyOf(env));

/**
 * Goes back to the interrupted turn. Whether a button's lines or a `When` rule after a press go back, the flow then judges that
 * press by the After line of the phase gone back to, so a button whose wording both phases' After lines name passes the turn
 * gone back to on at once; give the two phases' buttons different words.
 */
const goBackToTheTurn: EffectFn = (env) => resumeTurn(env.state);

// ---- turn order, scores and winners ----------------------------------------------------------

const passesLeft: TurnFn = (env) => {
  if (!env.state.turn) throw new RuleError('There is no turn to pass.');
  const { current } = env.state.turn;
  // A lone player is their own left, as before; `nextIn` would find no one else.
  if (env.seats.length === 1) return leftOf(current, env.seats);
  // `nextIn` is `leftOf` until a board game has players out, so card games pass the turn just as before.
  return nextIn(env.state, current, env.seats);
};

/**
 * The first player on the left, going round, who is still in and has the flag. With nobody, the turn stays where it is: the
 * phase's own rules are what end it then.
 */
const passesToNextWhoIs: TurnFn = (env, [fact]) => {
  if (!env.state.turn) throw new RuleError('There is no turn to pass.');
  const { current } = env.state.turn;
  let seat = current;
  for (let step = 0; step < env.seats.length; step++) {
    seat = leftOf(seat, env.seats);
    if (!isOut(env.state, seat) && playerFact(env.state, seat, fact as string) === true) return seat;
  }
  return current;
};

const everyCardScores: ScoreFn = (env, args, seat) => {
  const [match, zone, points] = args as [CardMatch, string, number];
  return zoneCards(env.state, zoneIdFor(zone, seat)).filter((c) => matchesCard(c, match)).length * points;
};

const oneCardScores: ScoreFn = (env, args, seat) => {
  const [match, zone, points] = args as [CardMatch, string, number];
  return zoneCards(env.state, zoneIdFor(zone, seat)).some((c) => matchesCard(c, match)) ? points : 0;
};

/**
 * The number each card of the seat's zone has, added up as the total of a group is: each read as every phrase reads a card's number,
 * through the values worked out for cards, and a card without it counting 0, since a zone may well hold cards of several kinds.
 */
const everyCardScoresItsNumber: ScoreFn = (env, [zone, attribute], seat) =>
  totalOf(env, attribute as string, { kind: 'in', zones: [{ of: { seat }, zone: zone as string }], whose: null });

/** The seat whose score `better` prefers; a tie goes to the earlier seat. */
const bestScore = (better: (score: number, best: number) => boolean): WinnerFn => (env: PhraseEnv, _args, scores) => {
  const scoreOf = (seat: string) => scores[seat] ?? 0;
  return env.seats.reduce((best, seat) => (better(scoreOf(seat), scoreOf(best)) ? seat : best));
};

/** Every seat with the top score, in seat order: tied players share the win. A seat with no score counts 0. */
const highestScoresShare: WinnerFn = (env, _args, scores) => {
  const scoreOf = (seat: string) => scores[seat] ?? 0;
  const top = Math.max(...env.seats.map(scoreOf));
  return env.seats.filter((seat) => scoreOf(seat) === top);
};

const emptyZoneWins: WinnerFn = (env, args) => {
  const zone = args[0] as string;
  const winner = env.seats.find((seat) => zoneCards(env.state, zoneIdFor(zone, seat)).length === 0);
  if (winner === undefined) throw new RuleError(`No player has an empty ${zone}.`);
  return winner;
};

/** Counting zones, moving and shuffling cards, who goes next, interrupting a turn and going back to it, scoring and winning. */
export function registerFlowPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .condition('{zone} has {int} card(s)', sizeIs((have, n) => have === n))
    .condition('{zone} has fewer than {int} cards', sizeIs((have, n) => have < n))
    .condition('{zone} has more than {int} card(s)', sizeIs((have, n) => have > n))
    .condition('{zone} is empty', sizeIs((have) => have === 0))
    .condition('{zone} is not empty', notEmpty)
    .condition('{zone} are not empty', notEmpty)
    .condition('{zones} are empty', zonesEmpty)
    .condition("a player's {perzone} is empty", someSeatEmpty)
    .effect('shuffle {zone}', shuffle)
    .effect('deal {int} cards from {zone} to {zone}', deal)
    .effect('move {zone} to {zone}', moveAll)
    .effect('move the top card of {zone} to {zone}', moveTop)
    .effect('shuffle {zone}, except its top card, into {zone}', shuffleRestInto)
    .effect("each {perzone} goes to the {perzone} of the player on its owner's left", passLeft)
    .effect('the winner goes next', winnerGoesNext)
    .effect('the player holding {card} goes first', holderGoesFirst)
    .effect('the {phase} phase starts with the player on their left', phaseStartsOnTheirLeft, { needsPlayer: true, entersPhase: true })
    .effect('the {phase} phase starts with them', phaseStartsWithThem, { needsPlayer: true, entersPhase: true })
    .effect('go to {phase}', goToPhase, { entersPhase: true })
    .effect('go back to the interrupted turn', goBackToTheTurn)
    .turn('the turn passes to the left', passesLeft)
    .turn('the turn passes to the next player on the left who is {playerflag}', passesToNextWhoIs)
    .score("each {cardclass} in a player's {perzone} scores {int} point(s)", everyCardScores)
    .score("each card in a player's {perzone} scores its {attribute}", everyCardScoresItsNumber)
    .score("{card} in a player's {perzone} scores {int} point(s)", oneCardScores)
    .winner('the lowest score wins', bestScore((score, best) => score < best))
    .winner('the highest score wins', bestScore((score, best) => score > best))
    .winner('the highest score wins, and tied players share the win', highestScoresShare)
    .winner('the player with an empty {perzone} wins', emptyZoneWins);
}
