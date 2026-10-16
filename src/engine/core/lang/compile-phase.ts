import { CHOOSE_ONE, choicesOf, type ChoiceOption } from './choices';
// Each module uses the other's functions only while compiling, never while it loads, so the two may import each other.
import { readChoice } from './compile-choice';
import {
  addProblem, asksChoice, canRead, isMissing, libraryHasSayOn, matchEffectLine, matchLine, phaseId, readsPressCard, rejectChildren, type LineCtx,
} from './compile-util';
import type { OutlineNode } from './outline';
import { normalizeLine, suggestNames } from './phrases';
import { joinOr, misnamedParam, parseParam, secondPersonWords, thirdPerson, thirdPersonWords, VOCAB_TYPES } from './refs';
import type {
  ActionCost, CardPick, CompiledMoment, CompiledPhase, CompiledTrigger, CondGroup, DeclaredAction, DeclaredMove, ParamType, PhraseKind, PhraseRef, SpaceClass,
  Vocab, ZoneRef, ZoneSpec,
} from './types';

const HINT = /^hint:\s*(.*)$/i;
const TAKE_TURNS = 'players take turns';
const AT_ONCE = 'everyone acts at once';
const REARRANGE = /^players may rearrange their (.+) at any time$/i;
const STARTS = /^when this phase starts:?$/i;
/** The lines that start each turn, under a phase or in every phase; the apostrophe may be straight or curly. */
export const TURN_STARTS = /^when a player['‘’]s turn starts:?$/i;
const GO_TO = /^when (.+), go to ([^:]+)$/i;
/** Moments come before triggers: “When a player lands on …:” is a rule about where a piece goes, not a condition. */
const MOMENT_LINE = /^when (a piece passes .+|a player lands on .+):$/i;
const TRIGGER = /^when (.+):$/i;
const ONLY_IF_ONE_OF = /^only if one of:?$/i;
const ONLY_IF = /^only if (.+)$/i;
const THEN = /^then:?$/i;
/** group 1 = what a button costs, to be read as a whole number and a counter */
const COST_LINE = /^it costs (.+)$/i;
/** group 1 = the whole number, group 2 = the counter, singular or plural */
const COST_AMOUNT = /^(\d+) (.+)$/;
/** After a player <names>, <turn phrase>: the names may hold commas themselves, so where they end is found by trying each comma. */
const AFTER = /^after a player (.+)$/i;
const VERB_SEPARATOR = /, or |, | or /i;
const COMMA = /, /g;
/**
 * `A player may <verb> <the rest>`: when it mentions a card, a card move or a button that picks a card (see `cardLineOf`), else a
 * button the player presses. `Any player may …` is a button too, one any seat may press at any time; the move lines below still start
 * “a player may”, so it is never a card move.
 */
const ACTION_LINE = /^(?:a|any) player may (\w+)(?:\s+(.+))?$/i;
/** The start of a button any seat may press, as opposed to one the player whose turn it is may. */
const ANYONE_LINE = /^any player may /i;
/** “card” or “cards” as a word of its own: “discard” does not count. */
const MENTIONS_CARD = /\bcards?\b/i;
/**
 * A button that picks a space with “on” ends in “on a …” or “on an …”: group 1 is what comes before the last “ on ”, group 2 what the
 * player may pick. A line whose last “on” has no “a” or “an” after it (“buy the space they are on”) picks nothing.
 */
const TARGETED = /^(.+) on ((?:a|an) (?:(?! on ).)+)$/i;
/** Each place a pick without “on” may start: a space before “a” or “an”, so the first word of a wording is never one. */
const BEFORE_A = / (?=an? \S)/gi;
/** A button that picks no space and ends in “an amount” carries a whole number with its press: group 1 is the wording before those words. */
const AMOUNT_WORDING = /^(.+) an amount$/i;
/** A button that picks no space, carries no amount and ends in “another player” picks a player with its press: group 1 is the wording before those words. */
const PLAYER_WORDING = /^(.+) another player$/i;
/**
 * A line whose last “on” is followed by another word than “a” or “an”: group 1 is that word or words, group 2 “their”
 * when it is “one of their”, group 3 the rest. Nothing follows the last “on” of “…on the field they are on”, so that
 * is no such line.
 */
const OTHER_PICK = /^.+ on (one of (their)|one of the|one of|any|the|each|every) ((?:(?! on\b).)+)$/i;

const RESERVED_VERB = 'reorder';
const NOT_UNDERSTOOD = "I don't understand this line in a phase. Phase lines start with Hint:, A player may…, Any player may…, When…, After a player…, Players take turns or Everyone acts at once.";
const NOT_UNDERSTOOD_IN_MOVE = "I don't understand this line under a move. Use Only if…, Only if one of: or Then:.";
const MALFORMED_MOVE = 'I can\'t read this card move. Write it as “A player may <verb> a card from <zone> to <zone>.”';
const ONE_ZONE = 'A move goes from one zone to one zone.';
const ONE_GO_TO = 'A phase can have only one “go to” rule for now.';
const ONE_AFTER = 'A phase can have only one “After a player …” rule.';
const EMPTY_ONE_OF = 'Add the conditions under “Only if one of:”, one on each line.';
const COST_SHAPE = 'Write a cost as “It costs 1 action.”: a whole number, then a number each player has each turn.';
const TWO_COSTS = 'A button can have only one “It costs …” line.';
/**
 * “Any player may” always makes a button, so a card line it starts has no card move to fall back on without a cost line (R1): it gets
 * one, or it picks the card “in” its zone and its `Then:` lines move it.
 */
const anyoneMove = (base: string, fromText: string, toText: string) =>
  '“Any player may …” can only be a button: add a cost line under it, like “It costs 1 action.”, or write '
  + `“Any player may ${base} a card in ${fromText}.” with “Then: Move it to ${toText}.” under it.`;
/** A press the rules refuse costs nothing and changes nothing, so a line about a card the presser can't see would tell them what it is. */
const tellsHiddenCard = (zoneText: string) =>
  `This line would tell the player what the card is, though they can't see the cards in ${zoneText}. Check it in the Then: lines, after a reveal.`;
/** Only a number each player has each turn can be a cost, so that “costs an action” and “has a cost” are one thing. */
const notABudget = (counter: string) =>
  `A button can only cost a number each player has each turn, like “Each player has 3 actions each turn.”; ${counter} isn't one.`;

const MAX_SUGGESTIONS = 3;
/** A card move and a button that start alike would share a name in an After line, and a one-word button a move type, so one gives way. */
const sameVerb = (verb: string) => `Two rules in this phase start “A player may ${verb}”. Start one with another word.`;
const sameWords = (words: string) => `Two rules in this phase say “A player may ${words}”.`;
/** Two buttons that pick a space with the same words before “on” would show one label, and an example could name neither. */
const samePick = (base: string) => `Two rules in this phase say “A player may ${base} on …”; give them different words.`;
/** Two buttons of one phase that read alike, whatever their wording, would be told apart by nobody who sees only the buttons. */
const sameLabel = (label: string) => `Two buttons in this phase would both read “${label}”; give one of them other words.`;
/** A bare verb in an After line that more than one button in the phase starts with. */
const sharedVerb = (word: string, wordings: string[]) => `“${word}” could be ${joinOr(wordings.map((w) => `“${w}”`))}; write the whole wording.`;
/** A button any player may press can't be what an After line waits for. */
const anyoneAfter = (word: string) => `“${word}” names a button any player may press at any time, so it can't pass the turn.`;
const moveElsewhere = (verb: string) => `“${verb}” is a card move in another phase, so it can't also be a button. Start one with another word.`;
const buttonElsewhere = (verb: string) => `“${verb}” is a button in another phase, so it can't also be a card move. Start one with another word.`;

/**
 * The verbs the phases read so far use for card moves and for buttons. A card move is named by its verb and a button by
 * its first word as well as its wording, so a card move in one phase and a button in another can't start alike; the
 * later line is the one reported.
 */
export type VerbUses = { moves: Set<string>; actions: Set<string> };

/** The type that knows what a zone looks like in this game: a move line is built from its pattern. */
const zoneType = ((): ParamType => {
  const found = VOCAB_TYPES.find((t) => t.name === 'zone');
  if (!found) throw new Error('The zone parameter type is missing.');
  return found;
})();

const moveLines = new WeakMap<Vocab, RegExp>();
/** A move line whose zones may not be the game's; they are read, and explained, one by one. */
const LOOSE_MOVE_LINE = /^a player may (\w+) a card from (.+?) to (.+)$/i;

// The lines that pick cards (R1). Each starts with the base, the words before “a card” or “some cards”: a verb, and maybe more words.
const PICKS = '^(?:a|any) player may (\\w+(?: .+?)?)';
/** group 1 = the base, 2 = “a card” or “some cards”, 3 = the zone they are picked in, 4 = the zone of the card they go to */
const PICK_ONTO = new RegExp(`${PICKS} (a card|some cards) from (.+?) to a card in (.+)$`, 'i');
/** group 1 = the base, 2 = “a card” or “some cards”, 3 = the zone they are picked in, 4 = the zone they go to */
const PICK_TO = new RegExp(`${PICKS} (a card|some cards) from (.+?) to (.+)$`, 'i');
/** group 1 = the base, 2 = the zone the cards are picked in */
const PICK_SOME = new RegExp(`${PICKS} some cards from (.+)$`, 'i');
/** group 1 = the base, 2 = the zone the card is picked in */
const PICK_IN = new RegExp(`${PICKS} a card in (.+)$`, 'i');

/** group 1 = the verb, group 2 = the zone it takes the card from, group 3 = the zone it puts it in */
function moveLineFor(vocab: Vocab): RegExp {
  let line = moveLines.get(vocab);
  if (!line) {
    const zone = zoneType.source(vocab);
    moveLines.set(vocab, (line = new RegExp(`^a player may (\\w+) a card from (${zone}) to (${zone})$`, 'i')));
  }
  return line;
}

/** A move goes between zones that are one zone each: not “each hand”, not “the winner's hand”. */
function isOneZone(ref: ZoneRef): boolean {
  if ('each' in ref) return false;
  if ('shared' in ref) return true;
  return !('who' in ref.of && ref.of.who === 'winner');
}

/** Reads the zone a move line names; says so (naming a zone the table never defined), and returns null, when it makes no sense. */
function moveZone(text: string, line: number, ctx: LineCtx): ZoneRef | null {
  const parsed = parseParam('zone', text, ctx.vocab);
  if (parsed !== null && 'value' in parsed) return parsed.value as ZoneRef;
  const misnamed = parsed === null ? zoneType.loose?.explain(text, ctx.vocab) : null;
  if (misnamed) addProblem(ctx.diagnostics, line, misnamed.message, { kind: 'invalid', text, suggestions: misnamed.suggestions });
  else addProblem(ctx.diagnostics, line, parsed?.error ?? `I don't understand “${text}” here.`, { kind: 'invalid', text });
  return null;
}

/** The zones a move line or a pick line names, read in order, or null (with the reason given) when they cannot be a move's. */
function oneZones(node: OutlineNode, texts: string[], ctx: LineCtx): ZoneRef[] | null {
  const zones = texts.map((text) => moveZone(text, node.line, ctx));
  if (zones.some((zone) => zone === null)) return null;
  const read = zones as ZoneRef[];
  if (!read.every(isOneZone)) {
    addProblem(ctx.diagnostics, node.line, ONE_ZONE, { text: normalizeLine(node.text) });
    return null;
  }
  return read;
}

/** The zones of a move line, or null (with the reason given) when they cannot be a move's. */
function moveZones(node: OutlineNode, found: RegExpExecArray, ctx: LineCtx): { from: ZoneRef; to: ZoneRef } | null {
  const zones = oneZones(node, [found[2], found[3]], ctx);
  return zones && { from: zones[0], to: zones[1] };
}

/**
 * An `Only if …` line, or an `Only if one of:` block; null for any other line. Several `Only if` lines must all
 * hold, so each is a group of its own; a block holds when any one of its lines does.
 */
export function readCondition(node: OutlineNode, clean: string, ctx: LineCtx): CondGroup | null {
  if (ONLY_IF_ONE_OF.test(clean)) {
    const refs = node.children.map((line) => {
      rejectChildren(line, ctx.diagnostics);
      return matchLine('condition', line.text, line.line, ctx);
    });
    if (refs.length === 0) addProblem(ctx.diagnostics, node.line, EMPTY_ONE_OF, { text: clean });
    return { mode: 'any', refs, text: refs.map((r) => r.text).join(' or '), line: node.line };
  }
  const only = ONLY_IF.exec(clean);
  if (!only) return null;
  rejectChildren(node, ctx.diagnostics);
  const ref = matchLine('condition', only[1], node.line, ctx);
  return { mode: 'all', refs: [ref], text: ref.text, line: node.line };
}

/**
 * An `It costs 1 action.` line read as what it costs: the whole number and the counter, which must be one each player has each turn.
 * Null, with the reason given, when it can't be.
 */
function readCost(node: OutlineNode, clean: string, text: string, ctx: LineCtx): ActionCost | null {
  const shape = COST_AMOUNT.exec(text);
  // A number past what can be told apart exactly is no cost a player could pay.
  if (!shape || !Number.isSafeInteger(Number(shape[1]))) {
    addProblem(ctx.diagnostics, node.line, COST_SHAPE, { text: clean });
    return null;
  }
  const parsed = parseParam('counter', shape[2], ctx.vocab);
  if (parsed === null || 'error' in parsed) {
    // The counter's own explanation, with the closest names; text that only holds a counter among other words is no counter's mistake.
    const misnamed = misnamedParam('counter', shape[2], ctx.vocab);
    if (misnamed) addProblem(ctx.diagnostics, node.line, misnamed.message, { kind: 'invalid', text: shape[2], suggestions: misnamed.suggestions });
    else addProblem(ctx.diagnostics, node.line, COST_SHAPE, { text: clean });
    return null;
  }
  const counter = parsed.value as string;
  if (!ctx.vocab.budgets.includes(counter)) {
    addProblem(ctx.diagnostics, node.line, notABudget(counter), { text: clean });
    return null;
  }
  return { amount: Number(shape[1]), counter, line: node.line };
}

/**
 * The `Only if` groups, the `Then:` effects and the cost under a card move or an action; any other line is reported. A second cost
 * line is reported too. A cost line that can't be read, or a second one, sets `badCost`, which leaves a button out. Where `ctx.choices`
 * says the press may ask for choices, a `Then:` line that asks for one is read as a choice, a choice of a player or a block of options,
 * numbered among them in the order written.
 */
function readRuleBody(node: OutlineNode, ctx: LineCtx): { conditions: CondGroup[]; effects: PhraseRef[]; cost: ActionCost | null; badCost: boolean } {
  const conditions: CondGroup[] = [];
  const effects: PhraseRef[] = [];
  let cost: ActionCost | null = null;
  let badCost = false;
  let sawCost = false;
  let choices = 0;
  for (const child of node.children) {
    const clean = normalizeLine(child.text);
    const group = readCondition(child, clean, ctx);
    const costs = COST_LINE.exec(clean);
    if (group) {
      conditions.push(group);
    } else if (THEN.test(clean)) {
      for (const line of child.children) {
        const text = normalizeLine(line.text);
        if (ctx.choices && asksChoice(text)) {
          effects.push(readChoice(line, text, choices++, ctx));
          continue;
        }
        rejectChildren(line, ctx.diagnostics);
        effects.push(matchEffectLine(line.text, line.line, ctx));
      }
    } else if (costs) {
      rejectChildren(child, ctx.diagnostics);
      if (sawCost) addProblem(ctx.diagnostics, child.line, TWO_COSTS, { text: clean });
      else cost = readCost(child, clean, costs[1], ctx);
      badCost ||= sawCost || cost === null;
      sawCost = true;
    } else {
      addProblem(ctx.diagnostics, child.line, NOT_UNDERSTOOD_IN_MOVE, { text: clean });
    }
  }
  return { conditions, effects, cost, badCost };
}

/** One declared move with its `Only if` conditions and `Then:` effects; null when the move line itself is wrong. */
function compileMove(node: OutlineNode, found: RegExpExecArray, ctx: LineCtx): DeclaredMove | null {
  const inMove: LineCtx = { ...ctx, inMove: true, player: true };
  const verb = found[1].toLowerCase();
  const reserved = verb === RESERVED_VERB;
  if (reserved) addProblem(ctx.diagnostics, node.line, `“${RESERVED_VERB}” is reserved; pick another word.`, { text: found[1] });
  const zones = moveZones(node, found, ctx);
  // A card move has no cost to keep: a card line with a cost line under it is a button that picks the card (see `cardLineOf`).
  const { conditions, effects } = readRuleBody(node, inMove);
  if (reserved || !zones) return null;
  return { verb, ...zones, fromText: found[2], conditions, effects, line: node.line };
}

/**
 * The words of a button that picks cards. `verb` is the first word of the base, `words` the lowercase text after “may” (the move type),
 * `written` that text as the designer wrote it, and `base` the lowercase words before “ a card” or “ some cards”. `anyone` is true
 * for “Any player may …”. `fromText`, `toText` and `ontoText` are the zones as written: the one the cards are picked in, the one they go
 * to, and the one the card they go to is picked in; null where the line names none.
 */
export type PickWords = {
  verb: string; words: string; written: string; base: string; anyone: boolean; some: boolean; fromText: string; toText: string | null;
  ontoText: string | null;
};

/**
 * What a line that mentions a card is: a card move, a button that picks a card, or a card line the phase can't read, with what to tell
 * the designer when it is more than how to write a card move.
 */
type CardLine = { kind: 'move'; verb: string } | { kind: 'pick'; words: PickWords } | { kind: 'unread'; verb: string; message?: string };

/** Whether a line has an `It costs …` line under it, which makes a card line a button. */
const hasCostLine = (node: OutlineNode): boolean => node.children.some((child) => COST_LINE.test(normalizeLine(child.text)));

/** “some cards” picks a set; “a card” picks one. */
const SOME_CARDS = /^some cards$/i;

/**
 * A button that picks cards, from its line and the parts of it a pick line found: the base, “a card” or “some cards”, the zone they are
 * picked in, and the zone they go to or the zone of the card they go to, null where the line names none.
 */
function pickCardLine(clean: string, base: string, howMany: string, fromText: string, toText: string | null, ontoText: string | null): CardLine {
  const written = clean.replace(/^(?:a|any) player may /i, '');
  const words: PickWords = {
    verb: base.split(' ')[0].toLowerCase(), words: written.toLowerCase(), written, base: base.toLowerCase(), anyone: ANYONE_LINE.test(clean),
    some: SOME_CARDS.test(howMany), fromText, toText, ontoText,
  };
  return { kind: 'pick', words };
}

/**
 * What an `A player may …` line that mentions a card is, by its words and by whether a cost line sits under it (R1), trying in order:
 * a card or some cards and the card they go to; a card move, when there is no cost line; a card from a zone to a zone, with a cost
 * line, or some cards from a zone to a zone; some cards from a zone; a card in a zone. Anything else is a card line the phase can't
 * read, even when the rest of it is mistyped: it is reported as one, never made into a plain button. One card from a zone to a zone
 * that any player may press, with no cost line, is told how to be a button. Null for a line that is no `A player may …` line about a
 * card.
 */
function cardLineOf(node: OutlineNode): CardLine | null {
  const clean = normalizeLine(node.text);
  const found = ACTION_LINE.exec(clean);
  if (!found || !MENTIONS_CARD.test(clean)) return null;
  const onto = PICK_ONTO.exec(clean);
  if (onto) return pickCardLine(clean, onto[1], onto[2], onto[3], null, onto[4]);
  const costed = hasCostLine(node);
  if (!costed && LOOSE_MOVE_LINE.test(clean)) return { kind: 'move', verb: found[1].toLowerCase() };
  // Only one card from a zone to a zone with no cost line is a card move, so a set is a button whether or not it costs anything.
  const to = PICK_TO.exec(clean);
  if (to && (costed || SOME_CARDS.test(to[2]))) return pickCardLine(clean, to[1], to[2], to[3], to[4], null);
  if (to && ANYONE_LINE.test(clean)) return { kind: 'unread', verb: found[1].toLowerCase(), message: anyoneMove(to[1], to[3], to[4]) };
  const some = PICK_SOME.exec(clean);
  if (some) return pickCardLine(clean, some[1], 'some cards', some[2], null, null);
  const inZone = PICK_IN.exec(clean);
  return inZone ? pickCardLine(clean, inZone[1], 'a card', inZone[2], null, null) : { kind: 'unread', verb: found[1].toLowerCase() };
}

/** The words of a button that picks a card, or null for any other line. */
export function pickLine(node: OutlineNode): PickWords | null {
  const line = cardLineOf(node);
  return line?.kind === 'pick' ? line.words : null;
}

/**
 * The verb of a card move, or of an `A player may …` line about a card that is neither a card move nor a button that picks a card; null
 * for any other line. Such a line still names its verb, so a rule that names it is not blamed for the line's mistake.
 */
export function cardMoveVerb(node: OutlineNode): string | null {
  const line = cardLineOf(node);
  return line === null || line.kind === 'pick' ? null : line.verb;
}

/** An `A player may …` line that is a button that picks no card, or null: a line about a card is a move or a pick, even a wrong one. */
export function actionLine(node: OutlineNode): RegExpExecArray | null {
  return cardLineOf(node) === null ? ACTION_LINE.exec(normalizeLine(node.text)) : null;
}

/**
 * A pick the wording makes without “on”: it is cut before each “a” or “an” that is not its first word, the leftmost cut first.
 * The first cut whose rest a target phrase reads is where the player picks; when none reads, so is the first whose rest was meant
 * as a pick, so that the button's line says what is wrong with it. `base` is the words before it and `target` the rest as written,
 * so “mark a space they own” picks “a space they own”. Null when no rest is either.
 */
function pickAfterVerb(written: string, target: TargetWords): { base: string; target: string } | null {
  const cuts = [...written.matchAll(BEFORE_A)].map((cut) => ({ base: written.slice(0, cut.index), target: written.slice(cut.index + 1) }));
  return cuts.find((cut) => target.reads(cut.target)) ?? cuts.find((cut) => target.meant(cut.target)) ?? null;
}

/**
 * What follows “a player may” in an action line: the verb, and all the words (lowercase, so rules and examples can
 * repeat them in any capitals). `written` keeps the designer's capitals for the button, so “Go to Rose Lane” stays one.
 * A line picks a space when it ends in “on a …”, or else when the words from some “a” or “an” on (not the first word) are a target
 * phrase or were meant as one (see `TargetWords`): `base` and `baseWritten` are the words before that “on” or “a”, and `target` is
 * what follows as written. Any other line has `base` equal to `words` and no target. `label` is the button's text, from `baseWritten`.
 * `anyone` is true for “Any player may …”.
 * A line that picks no space and ends in “an amount” is a button that carries one: `amount` is true, and `base` and `baseWritten`
 * are the words before those, so that “raise an amount” is the button 'raise' (`words` keeps them, as the move type).
 * A line that does neither and ends in “another player” is a button that picks a player: `picksPlayer` is true, and `base` and
 * `baseWritten` are the words before those, so that “challenge another player” is the button 'challenge'. Its `label` keeps
 * “another player”, since the page shows the players to pick only after the press, so the button has to say what it does.
 */
export function actionOf(found: RegExpExecArray, target: TargetWords): {
  verb: string; words: string; written: string; base: string; baseWritten: string; label: string; target: string | null; anyone: boolean; amount: boolean;
  picksPlayer: boolean;
} {
  const written = found[2] === undefined ? found[1] : `${found[1]} ${found[2]}`;
  const targeted = TARGETED.exec(written);
  const picked = targeted ? { base: targeted[1], target: targeted[2] } : pickAfterVerb(written, target);
  const carrying = picked ? null : AMOUNT_WORDING.exec(written);
  const choosing = picked || carrying ? null : PLAYER_WORDING.exec(written);
  const baseWritten = picked ? picked.base : carrying ? carrying[1] : choosing ? choosing[1] : written;
  return {
    verb: found[1].toLowerCase(), words: written.toLowerCase(), written, base: baseWritten.toLowerCase(), baseWritten,
    label: actionLabel(choosing ? written : baseWritten), target: picked ? picked.target : null, anyone: ANYONE_LINE.test(found[0]),
    amount: carrying !== null, picksPlayer: choosing !== null,
  };
}

/**
 * A pick the designer said with another word than “a” or “an” (“on any field they own”, “on one of their fields”, “on each
 * field”), when the words after it start with a kind of space; null for any other line, which is a button that picks
 * nothing (“roll on doubles”, “stand on the space”). `written` is how to write it, “on a field they own”, only when what
 * follows the pick is a bare kind of space, with “they own” or with nothing after it; “on any field with a gate” may mean
 * more than that, so it gets none.
 */
function otherPick(written: string, vocab: Vocab): { written: string | null } | null {
  const found = OTHER_PICK.exec(written);
  if (!found) return null;
  // A kind written as a plural (“one of their fields”) is picked one at a time; null for words that are no kind.
  const one = (text: string): string | null => {
    const kind = parseParam('spacekind', text, vocab);
    if (kind === null || !('value' in kind)) return null;
    const values = (kind.value as SpaceClass).values.map(String);
    return values.find((value) => value.toLowerCase() === text.toLowerCase()) ?? values[0];
  };
  const words = found[3].split(' ');
  // The longest run of words that is a kind of space, so that a kind of two words is read whole.
  for (let n = words.length; n > 0; n--) {
    const kind = one(words.slice(0, n).join(' '));
    if (kind === null) continue;
    // “one of their” says the pick is theirs, so it reads as if “they own” were written after it.
    const after = [...words.slice(n), ...(found[2] ? ['they', 'own'] : [])].join(' ').toLowerCase();
    if (after !== '' && after !== 'they own') return { written: null };
    return { written: ['on', /^[aeiou]/i.test(kind) ? 'an' : 'a', kind, ...(after === '' ? [] : ['they own'])].join(' ') };
  }
  return null;
}

/** A button whose words before the space it picks end in “an amount” (“raise an amount on a field they own”) means to do both. */
const pickAndAmount = (pick: string) => `A button can't both pick a space and carry an amount: drop “an amount” or “${pick}”.`;

/** group 1 = what follows a leading “a” or “an” */
const A_OR_AN = /^an? (.+)$/i;

/**
 * Words after a verb that start the way a pick does: “a space …”, or “a” or “an” and a kind of space the board has (“a field they
 * onw” on a board of fields). Words that start any other way (“a free pass”, “an amount”, “a double”) pick nothing.
 */
function startsLikePick(text: string, vocab: Vocab): boolean {
  const words = (A_OR_AN.exec(text)?.[1] ?? '').split(' ');
  if (words[0].toLowerCase() === 'space') return true;
  // A kind may be more than one word (“go to …”), so every run of words from the first is tried.
  return words.some((_, n) => parseParam('spacekind', words.slice(0, n + 1).join(' '), vocab) !== null);
}

/**
 * How a pick without “on” is told from words that pick nothing, as the player who presses the button: `reads` is true for words a
 * target phrase reads, and `meant` for words that start the way a pick does, read no target, and look like one: the library has
 * something to say about them as a target, being close to a target phrase or naming a fact the game never defined. Those are a pick
 * with a mistake in it (“a space the rivel owns”), reported as one written with “on” is, and never a plain button that would act on
 * the presser's own space. Words that only start like a pick and are like no target (“a tax bill” on a board with a tax kind) stay a
 * plain button. A pick said with another word (“a space on any … they own”) is not meant here: its line is told to say “on a …” instead.
 */
export type TargetWords = { reads: (text: string) => boolean; meant: (text: string) => boolean };

export const targetWords = (ctx: LineCtx): TargetWords => ({
  reads: (text) => canRead('target', text, { ...ctx, player: true }),
  meant: (text) => startsLikePick(text, ctx.vocab) && otherPick(text, ctx.vocab) === null && libraryHasSayOn('target', text, ctx),
});

/** What an action's button says: its words in the second person, as the player reads them. */
export function actionLabel(words: string): string {
  const spoken = secondPersonWords(words);
  return spoken.charAt(0).toUpperCase() + spoken.slice(1);
}

/**
 * One button a player may press, with its `Only if` conditions and `Then:` effects; null when its verb is reserved or the
 * space it picks is not something the language can read (a mistyped target, with “on” or without, is reported and never makes a
 * plain button).
 */
function compileAction(node: OutlineNode, found: RegExpExecArray, ctx: LineCtx): DeclaredAction | null {
  const { verb, words, written, base, baseWritten, label, target: targetText, anyone, amount, picksPlayer } = actionOf(found, targetWords(ctx));
  const reserved = verb === RESERVED_VERB;
  if (reserved) addProblem(ctx.diagnostics, node.line, `“${RESERVED_VERB}” is reserved; pick another word.`, { text: found[1] });
  // The player who presses the button is the one the target is about ("a field they own").
  const target = targetText === null ? null : matchLine('target', targetText, node.line, { ...ctx, player: true });
  // Made a plain button, “on any field they own” would quietly act on the space their piece is on.
  const pick = targetText === null ? otherPick(written, ctx.vocab) : null;
  if (pick !== null) {
    addProblem(ctx.diagnostics, node.line, `Write “${pick.written ?? 'on a …'}” so the player picks one.`, { kind: 'invalid', text: normalizeLine(node.text) });
  }
  // Said once on the button line; its lines are then read as the designer meant them, with the amount, so none is blamed for it.
  const both = targetText !== null && AMOUNT_WORDING.test(baseWritten);
  // The pick is told back as it was written, with its “on” or without.
  if (both) addProblem(ctx.diagnostics, node.line, pickAndAmount(written.slice(baseWritten.length).trim()), { kind: 'invalid', text: normalizeLine(node.text) });
  // An action is about the player who presses it and the space it picks, else the space their piece is on; a button that carries an amount has it,
  // and one that picks a player has that player. Only one that picks none of them may ask for a choice.
  const choices = targetText === null && !amount && !picksPlayer;
  const { conditions, effects, cost, badCost } = readRuleBody(node, { ...ctx, player: true, space: true, amount: amount || both, picked: picksPlayer, choices });
  if (reserved || pick !== null || both || badCost || (target !== null && isMissing(target))) return null;
  return { verb, words, base, label, target, anyone, amount, picksPlayer, conditions, effects, line: node.line, ...(cost ? { cost } : {}) };
}

/**
 * A button that picks cards, with its `Only if` conditions, `Then:` effects and cost; null when its verb is reserved, a zone it names
 * can't be read or is more than one zone, or its cost line has a problem. Its zones are read as a card move's are, so a misnamed one is
 * told the same way. Its lines are about the player who presses it and, as a card move's are, the one card picked: “it” and “the card”.
 * A set has no one card: its lines read “the picked cards” instead. A button that picks a card for its cards to go to reads it as
 * “the target card”.
 */
function compileCardPick(node: OutlineNode, words: PickWords, ctx: LineCtx): DeclaredAction | null {
  const { verb, written, base, anyone, some, fromText, toText, ontoText } = words;
  const reserved = verb === RESERVED_VERB;
  if (reserved) addProblem(ctx.diagnostics, node.line, `“${RESERVED_VERB}” is reserved; pick another word.`, { text: written.split(' ')[0] });
  // A line names either the zone the cards go to or the zone of the card they go to, never both.
  const second = toText ?? ontoText;
  const zones = oneZones(node, second === null ? [fromText] : [fromText, second], ctx);
  const onto = ontoText !== null;
  // Only the press of one card, with its target or without, may ask for a choice: the page shows a choice beside the card picked.
  const about: LineCtx = some
    ? { ...ctx, player: true, cards: true, onto, choices: false }
    : { ...ctx, inMove: true, player: true, card: true, onto, choices: true };
  const { conditions, effects, cost, badCost } = readRuleBody(node, about);
  if (reserved || !zones || badCost) return null;
  const pick: CardPick = {
    some, from: zones[0], fromText, to: toText === null ? null : zones[1], onto: onto ? zones[1] : null, ontoText,
  };
  return {
    verb, words: words.words, base, label: actionLabel(written), target: null, anyone, amount: false, picksPlayer: false, conditions, effects,
    line: node.line, pick, ...(cost ? { cost } : {}),
  };
}

/**
 * Whether a zone a pick names may hide its cards from the player who presses: one no one can see, or one only its owner can see that
 * is not the presser's own (another seat's, a seat named by its number, or one in the center).
 */
function mayHideFromPresser(ref: ZoneRef, zones: ZoneSpec[]): boolean {
  const name = 'shared' in ref ? ref.shared : 'each' in ref ? ref.each : ref.zone;
  const spec = zones.find((zone) => zone.name.toLowerCase() === name.toLowerCase());
  if (!spec || spec.visibility === 'public') return false;
  return spec.visibility === 'secret' || !('of' in ref && 'who' in ref.of && ref.of.who === 'actor');
}

/**
 * The lines of a button's choices that its press is judged by, as `Only if` groups in the order written: each choice of a player's
 * clause, on the choice's own line, then its guard; each block's guard, then each option's `Only if` lines. Whether a press is asked a
 * choice, of whom or of which options, tells what they came to.
 */
function choiceGroups(action: DeclaredAction): CondGroup[] {
  return choicesOf(action).flatMap((ref) => {
    if (ref.phrase === CHOOSE_ONE) {
      const [, guard, options] = ref.args as [number, CondGroup[], ChoiceOption[]];
      return [...guard, ...options.flatMap((option) => option.conditions)];
    }
    const [, guard, who] = ref.args as [number, CondGroup[], PhraseRef];
    return [{ mode: 'all', refs: [who], text: who.text, line: who.line }, ...guard];
  });
}

/**
 * Reports each `Only if` line of the phase's buttons that reads a card of the press (“the card”, the target card, the picked cards)
 * under a pick whose cards, or the card they go to, the presser may not see, and each line of a choice that does: its clause and its
 * guard. A press the line refuses, or asks a choice of, costs nothing and changes nothing, so pressing each face-down card in turn would
 * tell the player which is which. Face-down cards in a zone everyone sees are slice 9's.
 */
export function reportHiddenCardReads(phase: CompiledPhase, zones: ZoneSpec[], ctx: LineCtx): void {
  for (const action of phase.actions) {
    const { pick, conditions } = action;
    if (!pick) continue;
    const places = [{ ref: pick.from, text: pick.fromText }];
    if (pick.onto !== null && pick.ontoText !== null) places.push({ ref: pick.onto, text: pick.ontoText });
    const hidden = places.find(({ ref }) => mayHideFromPresser(ref, zones));
    if (!hidden) continue;
    for (const group of [...conditions, ...choiceGroups(action)]) {
      if (readsPressCard(ctx.library, group)) addProblem(ctx.diagnostics, group.line, tellsHiddenCard(hidden.text), { text: group.text });
    }
  }
}

/** The `Only if` groups and the effects under a `When …:` rule; every line that is not an `Only if` is an effect. */
function readWhenBody(node: OutlineNode, ctx: LineCtx): { conditions: CondGroup[]; effects: PhraseRef[] } {
  const conditions: CondGroup[] = [];
  const effects: PhraseRef[] = [];
  for (const child of node.children) {
    const group = readCondition(child, normalizeLine(child.text), ctx);
    if (group) {
      conditions.push(group);
    } else {
      rejectChildren(child, ctx.diagnostics);
      effects.push(matchEffectLine(child.text, child.line, ctx));
    }
  }
  return { conditions, effects };
}

/** The rule's own line without its colon, as the designer wrote it. */
const ruleText = (clean: string) => clean.slice(0, -1).trimEnd();

/** A line placeholder or phrase of this kind: a rule's first line asks who or which card it is about. */
const isPhraseOf = (ref: PhraseRef, kind: PhraseKind) => ref.kind === kind || (ref.phrase === 'missing' && ref.args[0] === kind);

/**
 * What a rule's lines are about, from the kind of phrase its `When` line is: each player it picks out, each card, or else what
 * `otherwise` says.
 */
function aboutOf(when: PhraseRef, ctx: LineCtx, otherwise: LineCtx = ctx): LineCtx {
  if (isPhraseOf(when, 'who')) return { ...ctx, player: true };
  return isPhraseOf(when, 'which') ? { ...ctx, card: true } : otherwise;
}

/**
 * A `When <condition>:` rule, `When a player <who>:` (the rule is then about each player it picks out) or `When a card
 * <which>:` (about each card it picks out). With `aboutTurn`, a rule of the first kind is about the player whose turn it is, its
 * `When` line too.
 */
export function compileTrigger(node: OutlineNode, clean: string, whenText: string, ctx: LineCtx, aboutTurn: boolean): CompiledTrigger {
  const turnCtx: LineCtx = aboutTurn ? { ...ctx, player: true } : ctx;
  // Only a line a condition reads is a rule about no one in particular, and only a line a phrase reads can need a player, so the
  // `When` line of a rule about each player or each card is never read as about the turn's player too.
  const when = matchLine('condition', whenText, node.line, canRead('condition', whenText, ctx) ? turnCtx : ctx, ['who', 'which']);
  return { line: node.line, text: ruleText(clean), when, ...readWhenBody(node, aboutOf(when, ctx, turnCtx)) };
}

/** A `When a piece passes …:` or `When a player lands on …:` rule, about the player whose piece it is and the space. */
function compileMoment(node: OutlineNode, clean: string, whenText: string, ctx: LineCtx): CompiledMoment {
  const about: LineCtx = { ...ctx, player: true, space: true };
  return { line: node.line, text: ruleText(clean), when: matchLine('moment', whenText, node.line, about), ...readWhenBody(node, about) };
}

/** The phase a `go to` names, or null (with suggestions given) when the game has no such phase. */
function targetPhase(name: string, line: number, ctx: LineCtx): string | null {
  const found = parseParam('phase', name, ctx.vocab);
  if (found !== null && 'value' in found) return found.value as string;
  const close = suggestNames(name, ctx.vocab.phases);
  // Typos that share no letter pairs with the right name get the phases there are instead.
  const suggestions = close.length > 0 ? close : ctx.vocab.phases.slice(0, MAX_SUGGESTIONS);
  addProblem(ctx.diagnostics, line, `There is no phase called “${name}”.`, { text: name, suggestions });
  return null;
}

/** An After line cut at one of its commas: what comes before may name moves and actions, what comes after may be a turn phrase. */
type AfterCut = { list: string; turn: string };

/**
 * What an After line may call the phase's moves, in lowercase. `names` maps each name to the move type it stands for;
 * `shared` holds the bare verbs that more than one button starts with, each with the wordings it could mean; `anyone` holds
 * the move types of the buttons any player may press, which are named like any other but can't pass the turn.
 */
type AfterNames = { names: Map<string, string>; shared: Map<string, string[]>; anyone: Set<string> };

/**
 * “plays” names a card move; “ends their turn” always names its button; “ends” names it too, unless another button in
 * the phase also starts with “end”, when only the whole wording can tell them apart.
 */
function afterNamesOf(moveVerbs: string[], buttons: { verb: string; words: string; anyone: boolean }[]): AfterNames {
  const names = new Map<string, string>();
  const shared = new Map<string, string[]>();
  for (const verb of moveVerbs) names.set(thirdPerson(verb), verb);
  for (const { verb, words } of buttons) {
    if (buttons.filter((b) => b.verb === verb).length === 1) names.set(thirdPerson(verb), words);
    names.set(thirdPersonWords(words), words);
  }
  // A one-word button's whole wording is its bare verb, so that still names it.
  for (const { verb } of buttons) {
    const bare = thirdPerson(verb);
    if (!names.has(bare)) shared.set(bare, buttons.filter((b) => b.verb === verb).map((b) => b.words));
  }
  return { names, shared, anyone: new Set(buttons.filter((b) => b.anyone).map((b) => b.words)) };
}

/** Every way to cut the text of an After line at a comma, the first comma first. */
function afterCuts(body: string): AfterCut[] {
  return [...body.matchAll(COMMA)].map((m) => ({ list: body.slice(0, m.index), turn: body.slice(m.index + 2) }));
}

/**
 * An `After a player <names>, <turn phrase>` line. `names` holds every way this phase's moves and actions can be named
 * (“plays”, “ends their turn”), in lowercase, each for the move type it stands for. Names and phrase may both hold commas,
 * so the comma is found by trying them left to right, and the first cut that is best wins: names all known and a turn
 * phrase after them; else a turn phrase after them (the names that are not known are then reported, as they would
 * be if the line had one comma); else names all known; else the first comma.
 */
function readAfter(node: OutlineNode, cuts: AfterCut[], { names, shared, anyone }: AfterNames, ctx: LineCtx, seen: boolean): CompiledPhase['after'] {
  rejectChildren(node, ctx.diagnostics);
  if (seen) {
    addProblem(ctx.diagnostics, node.line, ONE_AFTER, { text: normalizeLine(node.text) });
    return null;
  }
  // A bare verb that two buttons share is still a name, so the cut is found as it would be; it is reported below.
  const named = (list: string) => list.split(VERB_SEPARATOR).every((word) => names.has(word.toLowerCase()) || shared.has(word.toLowerCase()));
  const reads = (c: AfterCut) => canRead('turn', c.turn, ctx);
  const cut = cuts.find((c) => named(c.list) && reads(c)) ?? cuts.find(reads) ?? cuts.find((c) => named(c.list)) ?? cuts[0];
  const moves: string[] = [];
  let known = true;
  for (const word of cut.list.split(VERB_SEPARATOR)) {
    const move = names.get(word.toLowerCase());
    const wordings = shared.get(word.toLowerCase());
    if (move !== undefined && anyone.has(move)) {
      // Anyone may press it in anyone's turn, so it can't be the thing that ends this player's.
      addProblem(ctx.diagnostics, node.line, anyoneAfter(word), { text: word });
      known = false;
    } else if (move !== undefined) {
      if (!moves.includes(move)) moves.push(move);
    } else if (wordings !== undefined) {
      addProblem(ctx.diagnostics, node.line, sharedVerb(word, wordings), { text: word });
      known = false;
    } else {
      const here = names.size > 0 ? `The moves here are: ${[...names.keys()].join(', ')}.` : 'This phase has no moves.';
      addProblem(ctx.diagnostics, node.line, `“${word}” isn't a move in this phase. ${here}`, { text: word });
      known = false;
    }
  }
  const next = matchLine('turn', cut.turn, node.line, ctx);
  return known ? { moves, next, line: node.line } : null;
}

/**
 * Whether the player whose turn it is acts in the phase: they do unless the last line that says who acts says everyone does at
 * once. It is known before any line is read, since “they” in the phase's own lines may come before the line that says so.
 */
function takesTurns(node: OutlineNode): boolean {
  const said = node.children.map((child) => normalizeLine(child.text).toLowerCase());
  return said.filter((words) => words === TAKE_TURNS || words === AT_ONCE).at(-1) !== AT_ONCE;
}

/** The line of a phase's `When this phase starts:`, or null when it has none. */
export function startsLineOf(node: OutlineNode): number | null {
  return node.children.find((child) => STARTS.test(normalizeLine(child.text)))?.line ?? null;
}

/**
 * One `Phase:` block: its hint and who acts, the moves and actions players may make with their conditions and effects,
 * what happens when it starts and when a player's turn starts in it, the rules that fire while it lasts, where it goes next, and
 * when the turn passes. `uses` holds the verbs of the phases above; this phase's are added to it.
 * Where players take turns, “they” in the start lines, the `go to` condition and a rule about no one in particular is the player
 * whose turn it is. In the lines that start a turn it is always the player whose turn starts.
 */
export function compilePhase(node: OutlineNode, ctx: LineCtx, uses: VerbUses = { moves: new Set(), actions: new Set() }): CompiledPhase {
  const phase: CompiledPhase = {
    id: phaseId(node), line: node.line, hint: null, actor: 'current', rearrange: [], moves: [], onEnter: [],
    goTo: null, triggers: [], after: null, actions: [], moments: [], turnStarts: [],
  };
  const moveLine = moveLineFor(ctx.vocab);
  // After lines are read last: they may come before the moves and actions they name. One with a problem still counts as named.
  const afters: { node: OutlineNode; cuts: AfterCut[] }[] = [];
  const moveVerbs: string[] = [];
  const actionNames: { verb: string; words: string; anyone: boolean }[] = [];
  /** The words before “on” of the buttons that pick a space with it. */
  const pickBases = new Set<string>();
  /** What each button reads, lowercase: two that read alike could not be told apart on the page. */
  const labels = new Set<string>();
  const target = targetWords(ctx);
  const turnTaking = takesTurns(node);
  const turnCtx: LineCtx = turnTaking ? { ...ctx, player: true } : ctx;
  let hinted = false;
  let sawGoTo = false;

  /**
   * Whether a button may join the phase's buttons: one whose wording, label or verb is taken is reported and left out; one whose verb
   * is a card move in another phase is reported. `pickBase` is the words before “on” of a button that picks a space with it.
   */
  const joins = (line: number, clean: string, button: { verb: string; words: string; label: string; anyone: boolean }, pickBase: string | null): boolean => {
    const { verb, words, label, anyone } = button;
    // Buttons that start alike are different moves; only the same wording twice is a repeat, or two picks with one base, or two
    // buttons with one label.
    const repeated = actionNames.some((a) => a.words === words);
    const pickedAlike = pickBase !== null && pickBases.has(pickBase);
    const labelled = labels.has(label.toLowerCase());
    const taken = repeated || pickedAlike || labelled || moveVerbs.includes(verb);
    if (repeated) addProblem(ctx.diagnostics, line, sameWords(words), { text: clean });
    else if (pickedAlike) addProblem(ctx.diagnostics, line, samePick(pickBase), { text: clean });
    else if (labelled) addProblem(ctx.diagnostics, line, sameLabel(label), { text: clean });
    else if (taken) addProblem(ctx.diagnostics, line, sameVerb(verb), { text: clean });
    else if (uses.moves.has(verb)) addProblem(ctx.diagnostics, line, moveElsewhere(verb), { text: clean });
    if (!taken) {
      actionNames.push({ verb, words, anyone });
      labels.add(label.toLowerCase());
      if (pickBase !== null) pickBases.add(pickBase);
    }
    return !taken;
  };

  for (const child of node.children) {
    const clean = normalizeLine(child.text);
    const words = clean.toLowerCase();
    const hint = HINT.exec(child.text);
    const rearrange = REARRANGE.exec(clean);
    const cardLine = cardLineOf(child);
    // The strict line reads zones whose names hold “ to ”; the loose one still finds the verb when a zone is misnamed.
    const move = cardLine?.kind === 'move' ? (moveLine.exec(clean) ?? LOOSE_MOVE_LINE.exec(clean)) : null;
    const unread = cardLine?.kind === 'unread' ? cardLine : null;
    const picked = cardLine?.kind === 'pick' ? cardLine.words : null;
    const action = cardLine === null ? actionLine(child) : null;
    const goTo = GO_TO.exec(clean);
    const moment = MOMENT_LINE.exec(clean);
    const trigger = TRIGGER.exec(clean);
    const after = AFTER.exec(clean);
    const cuts = after ? afterCuts(after[1]) : [];

    if (hint) {
      if (hinted) addProblem(ctx.diagnostics, child.line, 'A phase can have only one Hint.');
      hinted = true;
      phase.hint = hint[1].trim() || null;
    } else if (words === TAKE_TURNS) {
      phase.actor = 'current';
    } else if (words === AT_ONCE) {
      phase.actor = 'any';
    } else if (rearrange) {
      const zone = parseParam('perzone', rearrange[1], ctx.vocab);
      if (zone === null || 'error' in zone) {
        addProblem(ctx.diagnostics, child.line, `Players can only rearrange a zone that each player has; “${rearrange[1]}” isn't one.`, { text: rearrange[1] });
      } else if (!phase.rearrange.includes(zone.value as string)) {
        phase.rearrange.push(zone.value as string);
      }
    } else if (move) {
      const verb = move[1].toLowerCase();
      if (actionNames.some((a) => a.verb === verb)) addProblem(ctx.diagnostics, child.line, sameVerb(verb), { text: clean });
      else if (uses.actions.has(verb)) addProblem(ctx.diagnostics, child.line, buttonElsewhere(verb), { text: clean });
      moveVerbs.push(verb);
      const declared = compileMove(child, move, ctx);
      if (declared) phase.moves.push(declared);
      continue;
    } else if (unread) {
      // Its verb still counts as a move here, so an After line that names it is not blamed for this line's mistake.
      moveVerbs.push(unread.verb);
      addProblem(ctx.diagnostics, child.line, unread.message ?? MALFORMED_MOVE, { text: clean });
      // It may have been meant as a button that picks a card, whose lines say “it” for the card: only the line itself is blamed.
      readRuleBody(child, { ...ctx, inMove: true, player: true, card: true });
      continue;
    } else if (picked) {
      const joined = joins(child.line, clean, { ...picked, label: actionLabel(picked.written) }, null);
      const declared = compileCardPick(child, picked, ctx);
      if (declared && joined) phase.actions.push(declared);
      continue;
    } else if (action) {
      const { verb, words: actionWords, base, label, anyone } = actionOf(action, target);
      const joined = joins(child.line, clean, { verb, words: actionWords, label, anyone }, TARGETED.test(actionWords) ? base : null);
      const declared = compileAction(child, action, ctx);
      if (declared && joined) phase.actions.push(declared);
      continue;
    } else if (STARTS.test(clean)) {
      for (const line of child.children) {
        rejectChildren(line, ctx.diagnostics);
        phase.onEnter.push(matchEffectLine(line.text, line.line, turnCtx));
      }
      continue;
    } else if (TURN_STARTS.test(clean)) {
      // Read before moments and rules, whose “When …:” it would also fit; a turn is always some player's, whoever acts in the phase.
      for (const line of child.children) {
        rejectChildren(line, ctx.diagnostics);
        phase.turnStarts.push(matchEffectLine(line.text, line.line, { ...ctx, player: true }));
      }
      continue;
    } else if (goTo) {
      if (sawGoTo) {
        addProblem(ctx.diagnostics, child.line, ONE_GO_TO, { text: clean });
      } else {
        const to = targetPhase(goTo[2], child.line, ctx);
        const when = matchLine('condition', goTo[1], child.line, turnCtx);
        if (to !== null) phase.goTo = { when, to, line: child.line };
      }
      sawGoTo = true;
    } else if (moment) {
      phase.moments.push(compileMoment(child, clean, moment[1], ctx));
      continue;
    } else if (trigger) {
      phase.triggers.push(compileTrigger(child, clean, trigger[1], ctx, turnTaking));
      continue;
    } else if (after && cuts.length > 0) {
      afters.push({ node: child, cuts });
      continue;
    } else {
      addProblem(ctx.diagnostics, child.line, NOT_UNDERSTOOD, { text: clean });
      continue;
    }
    rejectChildren(child, ctx.diagnostics);
  }

  const names = afterNamesOf(moveVerbs, actionNames);
  afters.forEach(({ node: line, cuts }, index) => {
    const after = readAfter(line, cuts, names, ctx, index > 0);
    if (index === 0) phase.after = after;
  });
  for (const verb of moveVerbs) uses.moves.add(verb);
  for (const { verb } of actionNames) uses.actions.add(verb);
  return phase;
}
