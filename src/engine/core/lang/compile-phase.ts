import { addProblem, canRead, isMissing, matchEffectLine, matchLine, phaseId, rejectChildren, type LineCtx } from './compile-util';
import type { OutlineNode } from './outline';
import { normalizeLine, suggestNames } from './phrases';
import { joinOr, parseParam, secondPersonWords, thirdPerson, thirdPersonWords, VOCAB_TYPES } from './refs';
import type {
  CompiledMoment, CompiledPhase, CompiledTrigger, CondGroup, DeclaredAction, DeclaredMove, ParamType, PhraseKind, PhraseRef, SpaceClass, Vocab,
  ZoneRef,
} from './types';

const HINT = /^hint:\s*(.*)$/i;
const REARRANGE = /^players may rearrange their (.+) at any time$/i;
const STARTS = /^when this phase starts:?$/i;
const GO_TO = /^when (.+), go to ([^:]+)$/i;
/** Moments come before triggers: “When a player lands on …:” is a rule about where a piece goes, not a condition. */
const MOMENT_LINE = /^when (a piece passes .+|a player lands on .+):$/i;
const TRIGGER = /^when (.+):$/i;
const ONLY_IF_ONE_OF = /^only if one of:?$/i;
const ONLY_IF = /^only if (.+)$/i;
const THEN = /^then:?$/i;
/** After a player <names>, <turn phrase>: the names may hold commas themselves, so where they end is found by trying each comma. */
const AFTER = /^after a player (.+)$/i;
const VERB_SEPARATOR = /, or |, | or /i;
const COMMA = /, /g;
/** `A player may <verb> <the rest>`: a card move when it mentions a card, else a button the player presses. */
const ACTION_LINE = /^a player may (\w+)(?:\s+(.+))?$/i;
/** “card” or “cards” as a word of its own: “discard” does not count. */
const MENTIONS_CARD = /\bcards?\b/i;
/**
 * A button that picks a space ends in “on a …” or “on an …”: group 1 is what comes before the last “ on ”, group 2 what the
 * player may pick. A line whose last “on” has no “a” or “an” after it (“buy the space they are on”) picks nothing.
 */
const TARGETED = /^(.+) on ((?:a|an) (?:(?! on ).)+)$/i;
/**
 * A line whose last “on” is followed by another word than “a” or “an”: group 1 is that word or words, group 2 “their”
 * when it is “one of their”, group 3 the rest. Nothing follows the last “on” of “…on the field they are on”, so that
 * is no such line.
 */
const OTHER_PICK = /^.+ on (one of (their)|one of the|one of|any|the|each|every) ((?:(?! on\b).)+)$/i;

const RESERVED_VERB = 'reorder';
const NOT_UNDERSTOOD = "I don't understand this line in a phase. Phase lines start with Hint:, A player may…, When…, After a player…, Players take turns or Everyone acts at once.";
const NOT_UNDERSTOOD_IN_MOVE = "I don't understand this line under a move. Use Only if…, Only if one of: or Then:.";
const MALFORMED_MOVE = 'I can\'t read this card move. Write it as “A player may <verb> a card from <zone> to <zone>.”';
const ONE_ZONE = 'A move goes from one zone to one zone.';
const ONE_GO_TO = 'A phase can have only one “go to” rule for now.';
const ONE_AFTER = 'A phase can have only one “After a player …” rule.';
const EMPTY_ONE_OF = 'Add the conditions under “Only if one of:”, one on each line.';

const MAX_SUGGESTIONS = 3;
/** A card move and a button that start alike would share a name in an After line, and a one-word button a move type, so one gives way. */
const sameVerb = (verb: string) => `Two rules in this phase start “A player may ${verb}”. Start one with another word.`;
const sameWords = (words: string) => `Two rules in this phase say “A player may ${words}”.`;
/** Two buttons that pick a space with the same words before “on” would show one label, and an example could name neither. */
const samePick = (base: string) => `Two rules in this phase say “A player may ${base} on …”; give them different words.`;
/** A bare verb in an After line that more than one button in the phase starts with. */
const sharedVerb = (word: string, wordings: string[]) => `“${word}” could be ${joinOr(wordings.map((w) => `“${w}”`))}; write the whole wording.`;
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

/** The zones of a move line, or null (with the reason given) when they cannot be a move's. */
function moveZones(node: OutlineNode, found: RegExpExecArray, ctx: LineCtx): { from: ZoneRef; to: ZoneRef } | null {
  const from = moveZone(found[2], node.line, ctx);
  const to = moveZone(found[3], node.line, ctx);
  if (!from || !to) return null;
  if (!isOneZone(from) || !isOneZone(to)) {
    addProblem(ctx.diagnostics, node.line, ONE_ZONE, { text: normalizeLine(node.text) });
    return null;
  }
  return { from, to };
}

/**
 * An `Only if …` line, or an `Only if one of:` block; null for any other line. Several `Only if` lines must all
 * hold, so each is a group of its own; a block holds when any one of its lines does.
 */
function readCondition(node: OutlineNode, clean: string, ctx: LineCtx): CondGroup | null {
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

/** The `Only if` groups and the `Then:` effects under a card move or an action; any other line is reported. */
function readRuleBody(node: OutlineNode, ctx: LineCtx): { conditions: CondGroup[]; effects: PhraseRef[] } {
  const conditions: CondGroup[] = [];
  const effects: PhraseRef[] = [];
  for (const child of node.children) {
    const clean = normalizeLine(child.text);
    const group = readCondition(child, clean, ctx);
    if (group) {
      conditions.push(group);
    } else if (THEN.test(clean)) {
      for (const line of child.children) {
        rejectChildren(line, ctx.diagnostics);
        effects.push(matchEffectLine(line.text, line.line, ctx));
      }
    } else {
      addProblem(ctx.diagnostics, child.line, NOT_UNDERSTOOD_IN_MOVE, { text: clean });
    }
  }
  return { conditions, effects };
}

/** One declared move with its `Only if` conditions and `Then:` effects; null when the move line itself is wrong. */
function compileMove(node: OutlineNode, found: RegExpExecArray, ctx: LineCtx): DeclaredMove | null {
  const inMove: LineCtx = { ...ctx, inMove: true, player: true };
  const verb = found[1].toLowerCase();
  const reserved = verb === RESERVED_VERB;
  if (reserved) addProblem(ctx.diagnostics, node.line, `“${RESERVED_VERB}” is reserved; pick another word.`, { text: found[1] });
  const zones = moveZones(node, found, ctx);
  const { conditions, effects } = readRuleBody(node, inMove);
  if (reserved || !zones) return null;
  return { verb, ...zones, fromText: found[2], conditions, effects, line: node.line };
}

/**
 * The verb of an `A player may …` line that mentions a card, or null for any other line. Such a line moves a card even
 * when the rest of it is mistyped, so it is reported as a move it can't read, never made into a button.
 */
export function cardMoveVerb(clean: string): string | null {
  const found = ACTION_LINE.exec(clean);
  return found && MENTIONS_CARD.test(clean) ? found[1].toLowerCase() : null;
}

/** An `A player may …` line that does not mention a card, or null: a line that does is a move, even a wrong one. */
export function actionLine(clean: string): RegExpExecArray | null {
  return cardMoveVerb(clean) === null ? ACTION_LINE.exec(clean) : null;
}

/**
 * What follows “a player may” in an action line: the verb, and all the words (lowercase, so rules and examples can
 * repeat them in any capitals). `written` keeps the designer's capitals for the button, so “Go to Rose Lane” stays one.
 * A line that ends in “on a …” picks a space: `base` and `baseWritten` are the words before that “on”, and `target` is what
 * follows it as written. Any other line has `base` equal to `words` and no target.
 */
export function actionOf(found: RegExpExecArray): {
  verb: string; words: string; written: string; base: string; baseWritten: string; target: string | null;
} {
  const written = found[2] === undefined ? found[1] : `${found[1]} ${found[2]}`;
  const targeted = TARGETED.exec(written);
  const baseWritten = targeted ? targeted[1] : written;
  return {
    verb: found[1].toLowerCase(), words: written.toLowerCase(), written, base: baseWritten.toLowerCase(), baseWritten, target: targeted ? targeted[2] : null,
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

/** What an action's button says: its words in the second person, as the player reads them. */
export function actionLabel(words: string): string {
  const spoken = secondPersonWords(words);
  return spoken.charAt(0).toUpperCase() + spoken.slice(1);
}

/**
 * One button a player may press, with its `Only if` conditions and `Then:` effects; null when its verb is reserved or the
 * space it picks is not something the language can read (a mistyped target is reported and never makes a plain button).
 */
function compileAction(node: OutlineNode, found: RegExpExecArray, ctx: LineCtx): DeclaredAction | null {
  const { verb, words, written, base, baseWritten, target: targetText } = actionOf(found);
  const reserved = verb === RESERVED_VERB;
  if (reserved) addProblem(ctx.diagnostics, node.line, `“${RESERVED_VERB}” is reserved; pick another word.`, { text: found[1] });
  // The player who presses the button is the one the target is about ("a field they own").
  const target = targetText === null ? null : matchLine('target', targetText, node.line, { ...ctx, player: true });
  // Made a plain button, “on any field they own” would quietly act on the space their piece is on.
  const pick = targetText === null ? otherPick(written, ctx.vocab) : null;
  if (pick !== null) {
    addProblem(ctx.diagnostics, node.line, `Write “${pick.written ?? 'on a …'}” so the player picks one.`, { kind: 'invalid', text: normalizeLine(node.text) });
  }
  // An action is about the player who presses it and the space it picks, else the space their piece is on.
  const { conditions, effects } = readRuleBody(node, { ...ctx, player: true, space: true });
  if (reserved || pick !== null || (target !== null && isMissing(target))) return null;
  return { verb, words, base, label: actionLabel(baseWritten), target, conditions, effects, line: node.line };
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

/** What a rule's lines are about, from the kind of phrase its `When` line is: each player it picks out, each card, or no one. */
function aboutOf(when: PhraseRef, ctx: LineCtx): LineCtx {
  if (isPhraseOf(when, 'who')) return { ...ctx, player: true };
  return isPhraseOf(when, 'which') ? { ...ctx, card: true } : ctx;
}

/**
 * A `When <condition>:` rule, `When a player <who>:` (the rule is then about each player it picks out) or `When a card
 * <which>:` (about each card it picks out).
 */
function compileTrigger(node: OutlineNode, clean: string, whenText: string, ctx: LineCtx): CompiledTrigger {
  const when = matchLine('condition', whenText, node.line, ctx, ['who', 'which']);
  return { line: node.line, text: ruleText(clean), when, ...readWhenBody(node, aboutOf(when, ctx)) };
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
 * `shared` holds the bare verbs that more than one button starts with, each with the wordings it could mean.
 */
type AfterNames = { names: Map<string, string>; shared: Map<string, string[]> };

/**
 * “plays” names a card move; “ends their turn” always names its button; “ends” names it too, unless another button in
 * the phase also starts with “end”, when only the whole wording can tell them apart.
 */
function afterNamesOf(moveVerbs: string[], buttons: { verb: string; words: string }[]): AfterNames {
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
  return { names, shared };
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
function readAfter(node: OutlineNode, cuts: AfterCut[], { names, shared }: AfterNames, ctx: LineCtx, seen: boolean): CompiledPhase['after'] {
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
    if (move !== undefined) {
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
 * One `Phase:` block: its hint and who acts, the moves and actions players may make with their conditions and effects,
 * what happens when it starts, the rules that fire while it lasts, where it goes next, and when the turn passes.
 * `uses` holds the verbs of the phases above; this phase's are added to it.
 */
export function compilePhase(node: OutlineNode, ctx: LineCtx, uses: VerbUses = { moves: new Set(), actions: new Set() }): CompiledPhase {
  const phase: CompiledPhase = {
    id: phaseId(node), line: node.line, hint: null, actor: 'current', rearrange: [], moves: [], onEnter: [],
    goTo: null, triggers: [], after: null, actions: [], moments: [],
  };
  const moveLine = moveLineFor(ctx.vocab);
  // After lines are read last: they may come before the moves and actions they name. One with a problem still counts as named.
  const afters: { node: OutlineNode; cuts: AfterCut[] }[] = [];
  const moveVerbs: string[] = [];
  const actionNames: { verb: string; words: string }[] = [];
  /** The words before “on” of the buttons that pick a space. */
  const pickBases = new Set<string>();
  let hinted = false;
  let sawGoTo = false;

  for (const child of node.children) {
    const clean = normalizeLine(child.text);
    const words = clean.toLowerCase();
    const hint = HINT.exec(child.text);
    const rearrange = REARRANGE.exec(clean);
    const move = moveLine.exec(clean) ?? LOOSE_MOVE_LINE.exec(clean);
    const unreadMove = move ? null : cardMoveVerb(clean);
    const action = move || unreadMove !== null ? null : actionLine(clean);
    const goTo = GO_TO.exec(clean);
    const moment = MOMENT_LINE.exec(clean);
    const trigger = TRIGGER.exec(clean);
    const after = AFTER.exec(clean);
    const cuts = after ? afterCuts(after[1]) : [];

    if (hint) {
      if (hinted) addProblem(ctx.diagnostics, child.line, 'A phase can have only one Hint.');
      hinted = true;
      phase.hint = hint[1].trim() || null;
    } else if (words === 'players take turns') {
      phase.actor = 'current';
    } else if (words === 'everyone acts at once') {
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
    } else if (unreadMove !== null) {
      // Its verb still counts as a move here, so an After line that names it is not blamed for this line's mistake.
      moveVerbs.push(unreadMove);
      addProblem(ctx.diagnostics, child.line, MALFORMED_MOVE, { text: clean });
      readRuleBody(child, { ...ctx, inMove: true, player: true });
      continue;
    } else if (action) {
      const { verb, words: actionWords, base, target } = actionOf(action);
      // Buttons that start alike are different moves; only the same wording twice is a repeat, or two picks with one base.
      const repeated = actionNames.some((a) => a.words === actionWords);
      const pickedAlike = target !== null && pickBases.has(base);
      const taken = repeated || pickedAlike || moveVerbs.includes(verb);
      if (repeated) addProblem(ctx.diagnostics, child.line, sameWords(actionWords), { text: clean });
      else if (pickedAlike) addProblem(ctx.diagnostics, child.line, samePick(base), { text: clean });
      else if (taken) addProblem(ctx.diagnostics, child.line, sameVerb(verb), { text: clean });
      else if (uses.moves.has(verb)) addProblem(ctx.diagnostics, child.line, moveElsewhere(verb), { text: clean });
      if (!taken) actionNames.push({ verb, words: actionWords });
      if (!taken && target !== null) pickBases.add(base);
      const declared = compileAction(child, action, ctx);
      if (declared && !taken) phase.actions.push(declared);
      continue;
    } else if (STARTS.test(clean)) {
      for (const line of child.children) {
        rejectChildren(line, ctx.diagnostics);
        phase.onEnter.push(matchEffectLine(line.text, line.line, ctx));
      }
      continue;
    } else if (goTo) {
      if (sawGoTo) {
        addProblem(ctx.diagnostics, child.line, ONE_GO_TO, { text: clean });
      } else {
        const to = targetPhase(goTo[2], child.line, ctx);
        const when = matchLine('condition', goTo[1], child.line, ctx);
        if (to !== null) phase.goTo = { when, to, line: child.line };
      }
      sawGoTo = true;
    } else if (moment) {
      phase.moments.push(compileMoment(child, clean, moment[1], ctx));
      continue;
    } else if (trigger) {
      phase.triggers.push(compileTrigger(child, clean, trigger[1], ctx));
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
