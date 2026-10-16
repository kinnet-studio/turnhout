import type { Json } from '../table-def';
import { RuleError, type Diagnostic } from './diagnostics';
import type { OutlineNode } from './outline';
import { normalizeLine, stubFor, type MatchResult, type Misnamed, type PhraseLibrary, type RegisteredOpts } from './phrases';
import { misnamedParam, parseParam } from './refs';
import type { CardFilter, CardGroup, CondGroup, ParamType, PhraseKind, PhraseRef, Vocab } from './types';

/**
 * What every line of one compile stage shares. Never change `vocab` after a line has been matched with it. `inMove`,
 * `player`, `space` and `card` say what the rule around a line is about: a card move, a player ("they"), a space or a
 * card ("it"). `drawn` is true only for the sentences of a card's says column: they are run for a card that was just drawn.
 * `amount` is true only for the lines of a button whose wording ends in “an amount”: its press carries a number. `picked` is true
 * only for the lines of a button whose wording ends in “another player”: its press picks a player. `cards` is true only for the lines
 * of a button that picks some cards (“the picked cards”), and `onto` only for those of a button that picks a card for its cards to go
 * to (“the target card”); absent means false. `choices` is true only for the lines of a button that picks a card, or that picks
 * nothing (no space, amount or player): its `Then:` lines may ask for a choice, since only such a press can be shown with one; absent
 * means false. `worked` names the values the game works out for cards, which no line may change; absent means none.
 */
export type LineCtx = {
  library: PhraseLibrary; vocab: Vocab; gameName: string; inMove: boolean; player: boolean; space: boolean; card: boolean; drawn: boolean;
  amount: boolean; picked: boolean; cards?: boolean; onto?: boolean; choices?: boolean; worked?: readonly string[]; diagnostics: Diagnostic[];
};

const MAX_SUGGESTIONS = 3;
const NOT_INDENTED = "This line shouldn't be indented under the line above.";
/** What a game with nothing to pay with is told, by the compiler and by a phrase that finds out only when it runs. */
export const NEEDS_PAYMENT = 'Say what players pay with, like “Players pay with coins.” under Board:.';
/** The score that gives points for each whole few of a counter. A few of 0 or less counts nothing, so it is refused. */
export const POINTS_FOR_EVERY = 'each player scores {int} point(s) for every {int} {counter}';
/** What a few of less than 1 is told, by the compiler and by the score should a game reach its end anyway. */
export const FOR_EVERY_AT_LEAST_ONE = 'Say a number of 1 or more after “for every”.';
const NEEDS_BOARD = (clean: string) => `“${clean}” needs a board. Add a Board: section with a line like “The board is a loop of spaces, starting at Go:”.`;
const NEEDS_DICE = (clean: string) => `“${clean}” needs dice. Add a line like “There are two six-sided dice.” under Board:.`;
const NEEDS_TWO_DICE = 'A double needs exactly two dice.';
const NEEDS_AMOUNT = (clean: string) =>
  `“${clean}” only makes sense in a button whose wording ends in “an amount”, like “A player may give an amount.”`;
const NEEDS_PICK = (clean: string) =>
  `“${clean}” only makes sense in a button whose wording ends in “another player”, like “A player may challenge another player.”`;
const NEEDS_CARDS = (clean: string) => `“${clean}” only makes sense in a button that picks some cards, like “A player may discard some cards from their hand.”`;
const NEEDS_ONTO = (clean: string) =>
  `“${clean}” only makes sense in a button that picks a card and the card it goes to, like “A player may stack a card from their hand to a card in the row.”`;
/** What a rule that would change a value worked out for cards is told, by the compiler and by a phrase that finds out only when it runs. */
export const WORKED_KEPT = (name: string) => `“${name}” is worked out from its lines, so no rule can change it.`;
/** The same for an example's Given, which would set one. */
export const WORKED_NOT_GIVEN = (name: string) => `“${name}” is worked out from its lines, so no example or rule can set it.`;
const IF_FRAME = /^if\s+(.+)$/i;
const FOR_FRAME = /^for\s+(.+)$/i;
/** group 1 = the words after “For each card ”, which say which cards and then, after a comma, what happens to each */
const FOR_EACH_FRAME = /^for each card (.+)$/i;
/** “For each card” naming no cards: nothing after it, or a comma straight after it. group 1 = those three words as written */
const EACH_CARD_ALONE = /^(for each card)(?:,.*)?$/i;
/** What “For each card ” and the words after it are read as: the group of cards those words name. */
const THE_CARDS = 'the cards ';
/** A button's cost line, which is no effect: under a rule or in `Then:` it is in the wrong place, not a phrase nobody has written. */
const COST_LINE = /^it costs /i;
const MISPLACED_COST = '“It costs …” goes right under a button, beside its Only if lines.';
const NO_HOLDER_NAMED = (head: string) => `“${head}” doesn't name a player. Write “For the player who is …,” with something players can be.`;
const NO_GROUP_NAMED = (head: string) => `“${head}” doesn't say which cards. Write “For each card in their hand, …” or “For each card on it, …”.`;
const NOTHING_FOR_EACH = 'Say what happens to each card, like “For each card in their hand, move it to the pile.”';
const COMMA = /, /g;
const PHASE_NAME = /^phase\s*:\s*(.*)$/i;
/**
 * A line that asks the presser to pick a player: group 1 = what is done to the player picked, group 2 = what a player must be to be
 * picked, in the words said of one player (“has a card …”).
 */
export const CHOICE_LINE = /^(.+) to another player of their choice who (.+)$/i;
/** A line that asks the presser to choose one of the options under it. */
export const CHOOSE_ONE_LINE = /^they choose one:?$/i;
/** A line framed by “If …,” or “For …,”: whatever it holds is that frame's, so it is never a choice of its own. */
const FRAMED = /^(?:if|for) /i;
/**
 * Whether a line asks a choice of its own: a block of options, or a choice of a player that no “If …,” or “For …,” frames (the frame's
 * own message says what is wrong with a choice inside it).
 */
export const asksChoice = (clean: string): boolean => CHOOSE_ONE_LINE.test(clean) || (!FRAMED.test(clean) && CHOICE_LINE.test(clean));
/** Where a choice was written that no press could ask: only a button's own `Then:` lines may, and not of every button. */
const MISPLACED_CHOICE = 'Only the Then: lines of a button that picks a card, or nothing, can ask for a choice.';
/**
 * A choice is asked when the press is judged, before any Then: line runs, and once: so it can't wait on a condition judged when its line is
 * reached, nor be asked again for each card or of whoever holds a flag.
 */
const CHOICE_IN_FRAME = (frame: string, instead: string) => `A choice can't sit inside “${frame}”: ${instead}`;
const CHOICE_IN_IF = CHOICE_IN_FRAME('If …,', 'write its condition under it as an “Only if …” line.');
const ONCE = 'a press asks each choice once, so write it on a line of its own.';
const CHOICE_IN_FOR_EACH = CHOICE_IN_FRAME('For each card …,', ONCE);
const CHOICE_IN_FOR = CHOICE_IN_FRAME('For …,', ONCE);

/**
 * Whether the words of a frame hold a choice after one of their commas, where the frame's effect may start: a choice of a player or a
 * block of options, or a frame of its own that holds one after a later comma.
 */
const holdsChoice = (body: string): boolean => [...body.matchAll(COMMA)].some((m) => asksChoice(body.slice(m.index + 2)));

/** Records a problem found while reading the rules. Structure errors unless `extra` says otherwise. */
export function addProblem(diagnostics: Diagnostic[], line: number, message: string, extra: Partial<Diagnostic> = {}): void {
  diagnostics.push({ line, severity: 'error', kind: 'structure', message, ...extra });
}

/** Lines that take no lines of their own: each line indented under one is reported. */
export function rejectChildren(node: OutlineNode, diagnostics: Diagnostic[]): void {
  for (const child of node.children) addProblem(diagnostics, child.line, NOT_INDENTED);
}

/** A phase is known by its name: lowercased, spaces tidied; empty when the `Phase:` line gives none. */
export function phaseId(node: OutlineNode): string {
  return (PHASE_NAME.exec(node.text)?.[1] ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** What the designer is told when code behind a phrase fails: the message of a RuleError, plain words for anything else. */
function describeThrown(error: unknown): string {
  if (error instanceof RuleError) return error.message;
  return `Something went wrong reading this line: ${error instanceof Error ? error.message : String(error)}`;
}

/** Runs `fn`; whatever it throws becomes a diagnostic (on the line the error names, if it names one) and the result is undefined. */
export function attempt<T>(ctx: LineCtx, line: number, text: string, fn: () => T): T | undefined {
  try {
    return fn();
  } catch (error) {
    const named = error instanceof RuleError ? error : undefined;
    addProblem(ctx.diagnostics, named?.line ?? line, describeThrown(error), { kind: 'invalid', text: named?.text ?? text });
    return undefined;
  }
}

/** The code behind a phrase that matched. */
export function phraseFn<F>(ctx: LineCtx, ref: PhraseRef): F {
  const entry = ctx.library.get(ref.kind as PhraseKind, ref.phrase);
  if (!entry) throw new Error(`No phrase “${ref.phrase}” is registered.`);
  return entry.fn as F;
}

/** A line nobody has written a phrase for yet: it stays in the game as a placeholder. */
export function missingRef(kind: PhraseKind, text: string, line: number): PhraseRef {
  return { kind: 'lang', phrase: 'missing', args: [kind], line, text };
}

/** True for the placeholder `missingRef` makes: a line no phrase could be found for. */
export const isMissing = (ref: PhraseRef): boolean => ref.kind === 'lang' && ref.phrase === 'missing';

/** A pattern the way a designer reads it: `{zone}` shown as `[zone]`. */
function displayPattern(pattern: string, types: ParamType[]): string {
  return pattern.replace(/\{([^{}]+)\}/g, (whole, name: string) => types.find((t) => t.name === name)?.label ?? whole);
}

/** True when a value names the player making the move, as in “their hand” or “the other player's hand”. */
function mentionsActor(value: Json): boolean {
  if (Array.isArray(value)) return value.some(mentionsActor);
  if (value !== null && typeof value === 'object') return value.who === 'actor' || value.who === 'other' || Object.values(value).some(mentionsActor);
  return false;
}

/** The library's answer for a line; a phrase or type that throws counts as an invalid line. */
function tryMatch(kind: PhraseKind, text: string, ctx: LineCtx): MatchResult {
  try {
    return ctx.library.match(kind, text, ctx.vocab);
  } catch (error) {
    return { status: 'invalid', message: describeThrown(error) };
  }
}

/** True when a phrase of `kind` reads `text` as it stands, with no diagnostics recorded. */
export function canRead(kind: PhraseKind, text: string, ctx: LineCtx): boolean {
  return tryMatch(kind, text, ctx).status === 'ok';
}

/**
 * True when the library has something to say about `text` as a phrase of `kind`: a phrase matches it (even to refuse it), phrases are
 * alike enough to be suggested, or a name in it was never defined by the game. Words that are like nothing in the library say nothing.
 */
export function libraryHasSayOn(kind: PhraseKind, text: string, ctx: LineCtx): boolean {
  const result = tryMatch(kind, text, ctx);
  return result.status !== 'unknown' || result.suggestions.length > 0 || tryMisnamed([kind], text, ctx) !== null;
}

/** A name in a line no phrase matched that the game never defined; a library that fails here just says nothing. */
function tryMisnamed(kinds: PhraseKind[], text: string, ctx: LineCtx): Misnamed | null {
  try {
    return ctx.library.misnamed(kinds, text, ctx.vocab);
  } catch {
    return null;
  }
}

const PARAM = /\{([^{}]+)\}/g;

/** The groups of cards among a phrase's arguments, and every test of a card among them: alone, or a test of one of the groups. */
type CardArgs = { groups: CardGroup[]; filters: CardFilter[] };
const NO_CARD_ARGS: CardArgs = { groups: [], filters: [] };

/** The groups and the tests a line reads, given those it has alone: each group's own tests are read with them. */
const withTheirTests = (groups: CardGroup[], filters: CardFilter[] = []): CardArgs =>
  ({ groups, filters: [...filters, ...groups.flatMap((group) => group.whose ?? [])] });

/** The groups and tests of cards among a phrase's arguments: those its pattern reads as `{cardgroup}` and `{cardfilter}`. */
function cardArgsOf(pattern: string, args: Json[]): CardArgs {
  // Asked of every line read and of every press judged, so the many phrases without either skip the reading of their parameters.
  if (!pattern.includes('{cardgroup}') && !pattern.includes('{cardfilter}')) return NO_CARD_ARGS;
  const types = [...pattern.matchAll(PARAM)].map((found) => found[1]);
  const ofType = <T>(type: string) => args.filter((_, at) => types[at] === type) as T[];
  return withTheirTests(ofType<CardGroup>('cardgroup'), ofType<CardFilter>('cardfilter'));
}

/** Whether a test compares a card with the card a press moves (“the card's”) or with the card the rule is about (“its”). */
const comparesWith = (of: 'the card' | 'it') => (filter: CardFilter): boolean => 'sameAs' in filter && filter.sameAs.of === of;

/**
 * Whether the groups and tests read “it”, the card the rule is about: “the cards on it”, or a test that compares with “its” value. Whether
 * they read the card a press moves: a test that compares with “the card's” value. Whether they read “the picked cards” of a press's set.
 */
const readsItsCard = ({ groups, filters }: CardArgs): boolean => groups.some((group) => group.kind === 'on it') || filters.some(comparesWith('it'));
const readsMovedCard = ({ filters }: CardArgs): boolean => filters.some(comparesWith('the card'));
const readsPickedCards = ({ groups }: CardArgs): boolean => groups.some((group) => group.kind === 'picked');

/**
 * Whether a line of the group reads a card a press is about: the card a move makes, or “it”, the picked cards of a set, or the
 * target card. It may read one through a group of cards or a test of one too: a total of “the cards on it” or of “the picked cards”, or a
 * test that compares a card with “the card's” value or “its”, changes with the cards pressed as surely as “it” does, so it can't be judged
 * before they are known, nor read from a zone the presser can't see. Only such phrases may, so a group without one says the same of every
 * card. A ref nobody wrote a phrase for reads nothing.
 */
export function readsPressCard(library: PhraseLibrary, group: CondGroup): boolean {
  return group.refs.some((ref) => {
    const entry = ref.kind === 'lang' ? undefined : library.get(ref.kind, ref.phrase);
    if (entry === undefined) return false;
    const cards = cardArgsOf(ref.phrase, ref.args);
    return entry.needsMove || entry.needsCard || entry.needsCards || entry.needsOnto
      || readsItsCard(cards) || readsMovedCard(cards) || readsPickedCards(cards);
  });
}

/**
 * What a phrase needs that the game or the rule around it does not give, said for the designer; null when it has all it
 * needs. The first lack is the one reported, and a board or dice comes first: no rule can make up for a game without them. A group
 * of cards or a test among `cards` needs what it reads: “the cards on it” a card, “the picked cards” a button that picks some, the cards
 * in their zones a player, as any of their zones does, a test that compares with “the card's” value a card move, and one that compares
 * with “its” a card.
 */
function unmetNeed(entry: RegisteredOpts | undefined, args: Json[], clean: string, ctx: LineCtx, cards: CardArgs = NO_CARD_ARGS): string | null {
  // A game has a board when its Board: section has a loop of spaces, and dice only come with a board.
  if (entry?.needsBoard && ctx.vocab.spaces.length === 0) return NEEDS_BOARD(clean);
  if (entry?.needsDice && !ctx.vocab.dice) return NEEDS_DICE(clean);
  if (entry?.needsTwoDice && ctx.vocab.diceCount !== 2) return NEEDS_TWO_DICE;
  const aboutPlayer = ctx.inMove || ctx.player;
  if (!ctx.inMove && (entry?.needsMove || readsMovedCard(cards))) return `“${clean}” only makes sense in a rule about a player's move.`;
  if (!aboutPlayer && entry?.needsPlayer) {
    return `“${clean}” only makes sense in a rule about a player, such as a move, an action or a “When a player …” rule.`;
  }
  if (!aboutPlayer && args.some(mentionsActor)) return `“${clean}” only makes sense in a rule about a player's move.`;
  if (!ctx.space && entry?.needsSpace) return `“${clean}” only makes sense in a rule about a space, such as an action or a “lands on” rule.`;
  if (!ctx.card && (entry?.needsCard || readsItsCard(cards))) return `“${clean}” only makes sense in a rule about a card, such as “When a card …”.`;
  if (!ctx.drawn && entry?.needsDrawnCard) return `“${clean}” only makes sense in a card's says column.`;
  if (!ctx.amount && entry?.needsAmount) return NEEDS_AMOUNT(clean);
  if (!ctx.picked && entry?.needsPick) return NEEDS_PICK(clean);
  if (!ctx.cards && (entry?.needsCards || readsPickedCards(cards))) return NEEDS_CARDS(clean);
  if (!ctx.onto && entry?.needsOnto) return NEEDS_ONTO(clean);
  if (entry?.needsPayment && ctx.vocab.payWith === null) return NEEDS_PAYMENT;
  return null;
}

/** What is wrong with a line that writes a number or flag of cards that the game works out from lines; null for any other line. */
function writesWorked(entry: RegisteredOpts | undefined, args: Json[], kind: PhraseKind, ctx: LineCtx): string | null {
  const name = entry?.writes === undefined ? undefined : args[entry.writes];
  if (typeof name !== 'string' || !ctx.worked?.includes(name)) return null;
  return kind === 'given' ? WORKED_NOT_GIVEN(name) : WORKED_KEPT(name);
}

/**
 * Reads one line as a phrase of `kind` (`text` has no leading keyword); `fallback` is the kinds to try, in order, when no
 * phrase of `kind` fits. A line no phrase matches becomes a placeholder. When it is shaped like a phrase but names
 * something the game never defined, the designer is told which name, with the closest real ones; otherwise it gets an
 * unknown-phrase diagnostic with suggestions and a stub for a developer.
 */
export function matchLine(
  kind: PhraseKind, text: string, line: number, ctx: LineCtx, fallback: PhraseKind | PhraseKind[] = [],
): PhraseRef {
  const clean = normalizeLine(text);
  const others = typeof fallback === 'string' ? [fallback] : fallback;
  let found = kind;
  let result = tryMatch(kind, clean, ctx);
  for (const other of others) {
    if (result.status !== 'unknown') break;
    const next = tryMatch(other, clean, ctx);
    if (next.status === 'unknown') {
      result = { status: 'unknown', suggestions: [...new Set([...result.suggestions, ...next.suggestions])].slice(0, MAX_SUGGESTIONS) };
    } else {
      result = next;
      found = other;
    }
  }

  switch (result.status) {
    case 'ok': {
      const entry = ctx.library.get(found, result.pattern);
      const problem = unmetNeed(entry, result.args, clean, ctx, cardArgsOf(result.pattern, result.args))
        ?? writesWorked(entry, result.args, found, ctx);
      if (problem) {
        addProblem(ctx.diagnostics, line, problem, { kind: 'invalid', text: clean });
        return missingRef(found, clean, line);
      }
      return { kind: found, phrase: result.pattern, args: result.args, line, text: clean };
    }
    case 'unknown': {
      const misnamed = tryMisnamed([kind, ...others], clean, ctx);
      if (misnamed) {
        const { message, suggestions } = misnamed.problem;
        addProblem(ctx.diagnostics, line, message, { kind: 'invalid', text: clean, suggestions });
        return missingRef(misnamed.kind, clean, line);
      }
      const diagnostic: Diagnostic = {
        line, severity: 'error', kind: 'unknown-phrase', message: `“${clean}” isn't in the phrase library yet.`, text: clean,
        suggestions: result.suggestions,
      };
      try {
        diagnostic.stub = stubFor(kind, clean, ctx.vocab, ctx.library.types(), { game: ctx.gameName, line });
      } catch {
        // The stub only saves a developer typing; the line is reported without it.
      }
      ctx.diagnostics.push(diagnostic);
      return missingRef(kind, clean, line);
    }
    case 'ambiguous': {
      const types = ctx.library.types();
      const patterns = result.patterns.map((p) => displayPattern(p, types)).join(' / ');
      addProblem(ctx.diagnostics, line, `“${clean}” matches more than one phrase: ${patterns}. A developer needs to make one of them more specific.`, { kind: 'ambiguous-phrase', text: clean });
      return missingRef(found, clean, line);
    }
    case 'invalid':
      addProblem(ctx.diagnostics, line, result.message, { kind: 'invalid', text: clean });
      return missingRef(found, clean, line);
  }
}

/**
 * Reads “For <the player who holds a flag>, <effect>”: the effect is run as that player, so “they” and “their” are them, in a rule
 * about no one too. It runs with no card move, so a phrase that needs one is refused here even in a move. The line is cut at the
 * first comma before which a holder is named; when none is, what comes before the first comma is reported, as a misspelt holder
 * when it is one (“the rivel”).
 */
function matchForLine(body: string, clean: string, line: number, ctx: LineCtx): PhraseRef {
  const cuts = [...body.matchAll(COMMA)].map((m) => ({ head: body.slice(0, m.index), effect: body.slice(m.index + 2) }));
  for (const { head, effect } of cuts) {
    const holder = parseParam('holder', head, ctx.vocab);
    if (holder === null || !('value' in holder)) continue;
    const ref = matchLine('effect', effect, line, { ...ctx, player: true, inMove: false });
    return { kind: 'lang', phrase: 'for', args: [holder.value, ref], line, text: clean };
  }
  const head = cuts[0]?.head ?? body;
  const misnamed = misnamedParam('holder', head, ctx.vocab);
  if (misnamed) addProblem(ctx.diagnostics, line, misnamed.message, { kind: 'invalid', text: clean, suggestions: misnamed.suggestions });
  else addProblem(ctx.diagnostics, line, NO_HOLDER_NAMED(head), { kind: 'invalid', text: clean });
  return missingRef('effect', clean, line);
}

/**
 * Reads “For each card <cards>, <effect>” (R6): the effect is run about each of the cards in turn, so “it” is that card, and “they” are
 * still whoever the line is about. It runs with no card move, so a phrase that needs one is refused here even in a move, and about no card
 * just drawn, so “this card” is refused even in a card's says column: there it would not be the card walked. The line is cut at
 * a comma, since either part may hold commas: the first cut where the cards and the effect both read wins, then the first where the
 * cards read, then the first. The cards are read first, as “the cards …”, and what is wrong with them is what is reported: what their
 * zones or number say is wrong (“the crew” has no owner), a zone or a number the game never defined, else words that name no cards. Cards
 * that are named must suit the rule around the line, as a phrase's own words must: their zones need a player, “the cards on it” a card.
 */
function matchForEachLine(body: string, clean: string, line: number, ctx: LineCtx): PhraseRef {
  const each: LineCtx = { ...ctx, card: true, inMove: false, drawn: false };
  const groupOf = (head: string) => parseParam('cardgroup', `${THE_CARDS}${head}`, ctx.vocab);
  const names = (head: string) => {
    const read = groupOf(head);
    return read !== null && 'value' in read;
  };
  const refuse = (message: string, extra: Partial<Diagnostic> = {}): PhraseRef => {
    addProblem(ctx.diagnostics, line, message, { kind: 'invalid', text: clean, ...extra });
    return missingRef('effect', clean, line);
  };
  const cuts = [...body.matchAll(COMMA)].map((m) => ({ head: body.slice(0, m.index), effect: body.slice(m.index + 2) }));
  const chosen = cuts.find((cut) => names(cut.head) && canRead('effect', cut.effect, each))
    ?? cuts.find((cut) => names(cut.head))
    ?? cuts[0];
  if (!chosen) return refuse(NOTHING_FOR_EACH);
  const read = groupOf(chosen.head);
  if (read !== null && 'error' in read) return refuse(read.error);
  if (read === null) {
    const misnamed = misnamedParam('cardgroup', `${THE_CARDS}${chosen.head}`, ctx.vocab);
    return misnamed ? refuse(misnamed.message, { suggestions: misnamed.suggestions }) : refuse(NO_GROUP_NAMED(chosen.head));
  }
  const group = read.value as CardGroup;
  // The words before the comma, as written: “For each card in their workshop”.
  const written = clean.slice(0, clean.length - body.length + chosen.head.length);
  const unmet = unmetNeed(undefined, [group], written, ctx, withTheirTests([group]));
  if (unmet !== null) return refuse(unmet);
  return { kind: 'lang', phrase: 'for each', args: [group, matchLine('effect', chosen.effect, line, each)], line, text: clean };
}

/** What a line does: the effect of an `If …, …`, a `For …, …` or a `For each card …, …` line, else the line itself. */
export function innerEffect(ref: PhraseRef): PhraseRef {
  return ref.kind === 'lang' && (ref.phrase === 'if' || ref.phrase === 'for' || ref.phrase === 'for each') ? (ref.args[1] as PhraseRef) : ref;
}

/**
 * Reads one effect line. “For each card …, <effect>” runs the effect for each card of a group, and “For …, <effect>” runs it as the
 * player who holds a flag. “If <condition>, <effect>” is tried
 * at every comma, since either part may hold commas; the first comma where both parts are phrases wins. When none does, the
 * part that needs fixing is the one reported. A button's cost line is reported as one in the wrong place, and kept as a placeholder;
 * so is a choice, which a button's `Then:` reads before this when it may ask one, and one inside any of the frames.
 */
export function matchEffectLine(text: string, line: number, ctx: LineCtx): PhraseRef {
  const clean = normalizeLine(text);
  const refuse = (message: string): PhraseRef => {
    addProblem(ctx.diagnostics, line, message, { text: clean });
    return missingRef('effect', clean, line);
  };
  if (COST_LINE.test(clean)) return refuse(MISPLACED_COST);
  // Tried before the holder frame, whose “For …” they start like: there, “each card” would be told it names no player.
  const each = FOR_EACH_FRAME.exec(clean);
  if (each) return holdsChoice(each[1]) ? refuse(CHOICE_IN_FOR_EACH) : matchForEachLine(each[1], clean, line, ctx);
  const alone = EACH_CARD_ALONE.exec(clean);
  if (alone) {
    addProblem(ctx.diagnostics, line, NO_GROUP_NAMED(alone[1]), { kind: 'invalid', text: clean });
    return missingRef('effect', clean, line);
  }
  const holding = FOR_FRAME.exec(clean);
  if (holding) return holdsChoice(holding[1]) ? refuse(CHOICE_IN_FOR) : matchForLine(holding[1], clean, line, ctx);
  const frame = IF_FRAME.exec(clean);
  if (!frame) {
    if (asksChoice(clean)) return refuse(MISPLACED_CHOICE);
    return matchLine('effect', clean, line, ctx);
  }

  const body = frame[1];
  if (holdsChoice(body)) return refuse(CHOICE_IN_IF);
  const splits = [...body.matchAll(COMMA)].map((m) => ({ condition: body.slice(0, m.index), effect: body.slice(m.index + 2) }));
  const reads = (kind: PhraseKind, part: string) => canRead(kind, part, ctx);
  const chosen = splits.find((s) => reads('condition', s.condition) && reads('effect', s.effect))
    ?? splits.find((s) => reads('condition', s.condition))
    ?? splits[0];
  if (!chosen) {
    addProblem(ctx.diagnostics, line, 'Say what happens when the condition is true, like “If the deck is empty, shuffle the deck.”', { kind: 'invalid', text: clean });
    return missingRef('effect', clean, line);
  }

  // With an unreadable condition that is what to fix first; its effect is only read for the placeholder.
  const effectCtx = reads('condition', chosen.condition) ? ctx : { ...ctx, diagnostics: [] };
  const condition = matchLine('condition', chosen.condition, line, ctx);
  const effect = matchLine('effect', chosen.effect, line, effectCtx);
  return { kind: 'lang', phrase: 'if', args: [condition, effect], line, text: clean };
}
