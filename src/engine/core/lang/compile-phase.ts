import { addProblem, canRead, matchEffectLine, matchLine, phaseId, rejectChildren, type LineCtx } from './compile-util';
import type { OutlineNode } from './outline';
import { normalizeLine, suggestNames } from './phrases';
import { parseParam, thirdPerson, thirdPersonWords, VOCAB_TYPES } from './refs';
import type {
  CompiledMoment, CompiledPhase, CompiledTrigger, CondGroup, DeclaredAction, DeclaredMove, ParamType, PhraseRef, Vocab, ZoneRef,
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
/** `A player may <verb> <the rest>` where the line does not move a card: a button the player presses. */
const ACTION_LINE = /^a player may (\w+)(?:\s+(.+))?$/i;
const CARD_MOVE_WORDS = / a card from /i;
/** Whole words of a button's text that name the player, as the player reads it. */
const SECOND_PERSON = new Map([['their', 'your'], ["they're", "you're"], ['they', 'you'], ['them', 'you'], ['themselves', 'yourself']]);
const THIRD_PERSON_WORD = /\b(?:they['‘’]re|themselves|their|they|them)\b/gi;

const RESERVED_VERB = 'reorder';
const NOT_UNDERSTOOD = "I don't understand this line in a phase. Phase lines start with Hint:, A player may…, When…, After a player…, Players take turns or Everyone acts at once.";
const NOT_UNDERSTOOD_IN_MOVE = "I don't understand this line under a move. Use Only if…, Only if one of: or Then:.";
const ONE_ZONE = 'A move goes from one zone to one zone.';
const ONE_GO_TO = 'A phase can have only one “go to” rule for now.';
const ONE_AFTER = 'A phase can have only one “After a player …” rule.';
const EMPTY_ONE_OF = 'Add the conditions under “Only if one of:”, one on each line.';

const MAX_SUGGESTIONS = 3;
const sameVerb = (verb: string) => `Two rules in this phase start “A player may ${verb}”. Start one with another word.`;

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

/** An `A player may …` line that does not move a card, or null: a line that does is a move, even a wrong one. */
export function actionLine(clean: string): RegExpExecArray | null {
  return CARD_MOVE_WORDS.test(clean) ? null : ACTION_LINE.exec(clean);
}

/** The verb (lowercase) and the words after “a player may” of an action line: the verb, then the rest as written. */
export function actionOf(found: RegExpExecArray): { verb: string; words: string } {
  const verb = found[1].toLowerCase();
  return { verb, words: found[2] === undefined ? verb : `${verb} ${found[2]}` };
}

/** What an action's button says: its words in the second person, as the player reads them. */
export function actionLabel(words: string): string {
  const spoken = words.replace(THIRD_PERSON_WORD, (word) => SECOND_PERSON.get(word.toLowerCase().replace(/[‘’]/g, "'")) ?? word);
  return spoken.charAt(0).toUpperCase() + spoken.slice(1);
}

/** One button a player may press, with its `Only if` conditions and `Then:` effects; null when its verb is reserved. */
function compileAction(node: OutlineNode, found: RegExpExecArray, ctx: LineCtx): DeclaredAction | null {
  const { verb, words } = actionOf(found);
  const reserved = verb === RESERVED_VERB;
  if (reserved) addProblem(ctx.diagnostics, node.line, `“${RESERVED_VERB}” is reserved; pick another word.`, { text: found[1] });
  // An action is about the player who presses it and the space their piece is on.
  const { conditions, effects } = readRuleBody(node, { ...ctx, player: true, space: true });
  if (reserved) return null;
  return { verb, words, label: actionLabel(words), conditions, effects, line: node.line };
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

/** A line placeholder or phrase that asked who a rule is about. */
const isWho = (ref: PhraseRef) => ref.kind === 'who' || (ref.phrase === 'missing' && ref.args[0] === 'who');

/** A `When <condition>:` rule, or `When a player <who>:` (the rule is then about each player it picks out). */
function compileTrigger(node: OutlineNode, clean: string, whenText: string, ctx: LineCtx): CompiledTrigger {
  const when = matchLine('condition', whenText, node.line, ctx, 'who');
  return { line: node.line, text: ruleText(clean), when, ...readWhenBody(node, isWho(when) ? { ...ctx, player: true } : ctx) };
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

/** Every way to cut the text of an After line at a comma, the first comma first. */
function afterCuts(body: string): AfterCut[] {
  return [...body.matchAll(COMMA)].map((m) => ({ list: body.slice(0, m.index), turn: body.slice(m.index + 2) }));
}

/**
 * An `After a player <names>, <turn phrase>` line. `names` holds every way this phase's moves and actions can be named
 * (“plays”, “ends their turn”), in lowercase, each for the verb it stands for. Names and phrase may both hold commas,
 * so the line is cut where a turn phrase follows names that are all known; failing that, where the names are known.
 */
function readAfter(node: OutlineNode, cuts: AfterCut[], names: Map<string, string>, ctx: LineCtx, seen: boolean): CompiledPhase['after'] {
  rejectChildren(node, ctx.diagnostics);
  if (seen) {
    addProblem(ctx.diagnostics, node.line, ONE_AFTER, { text: normalizeLine(node.text) });
    return null;
  }
  const named = (list: string) => list.split(VERB_SEPARATOR).every((word) => names.has(word.toLowerCase()));
  const cut = cuts.find((c) => named(c.list) && canRead('turn', c.turn, ctx)) ?? cuts.find((c) => named(c.list)) ?? cuts[0];
  const verbs: string[] = [];
  let known = true;
  for (const word of cut.list.split(VERB_SEPARATOR)) {
    const verb = names.get(word.toLowerCase());
    if (verb === undefined) {
      const moves = names.size > 0 ? `The moves here are: ${[...names.keys()].join(', ')}.` : 'This phase has no moves.';
      addProblem(ctx.diagnostics, node.line, `“${word}” isn't a move in this phase. ${moves}`, { text: word });
      known = false;
    } else if (!verbs.includes(verb)) {
      verbs.push(verb);
    }
  }
  const next = matchLine('turn', cut.turn, node.line, ctx);
  return known ? { verbs, next, line: node.line } : null;
}

/**
 * One `Phase:` block: its hint and who acts, the moves and actions players may make with their conditions and effects,
 * what happens when it starts, the rules that fire while it lasts, where it goes next, and when the turn passes.
 */
export function compilePhase(node: OutlineNode, ctx: LineCtx): CompiledPhase {
  const phase: CompiledPhase = {
    id: phaseId(node), line: node.line, hint: null, actor: 'current', rearrange: [], moves: [], onEnter: [],
    goTo: null, triggers: [], after: null, actions: [], moments: [],
  };
  const moveLine = moveLineFor(ctx.vocab);
  // After lines are read last: they may come before the moves and actions they name. One with a problem still counts as named.
  const afters: { node: OutlineNode; cuts: AfterCut[] }[] = [];
  const moveVerbs: string[] = [];
  const actionNames: { verb: string; words: string }[] = [];
  let hinted = false;
  let sawGoTo = false;

  for (const child of node.children) {
    const clean = normalizeLine(child.text);
    const words = clean.toLowerCase();
    const hint = HINT.exec(child.text);
    const rearrange = REARRANGE.exec(clean);
    const move = moveLine.exec(clean) ?? LOOSE_MOVE_LINE.exec(clean);
    const action = move ? null : actionLine(clean);
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
      moveVerbs.push(verb);
      const declared = compileMove(child, move, ctx);
      if (declared) phase.moves.push(declared);
      continue;
    } else if (action) {
      const { verb, words: actionWords } = actionOf(action);
      const taken = moveVerbs.includes(verb) || actionNames.some((a) => a.verb === verb);
      if (taken) addProblem(ctx.diagnostics, child.line, sameVerb(verb), { text: clean });
      else actionNames.push({ verb, words: actionWords });
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

  // “plays”, “ends” and “ends their turn” each name a verb.
  const names = new Map<string, string>();
  for (const verb of moveVerbs) names.set(thirdPerson(verb), verb);
  for (const { verb, words: actionWords } of actionNames) {
    names.set(thirdPerson(verb), verb);
    names.set(thirdPersonWords(actionWords).toLowerCase(), verb);
  }
  afters.forEach(({ node: line, cuts }, index) => {
    const after = readAfter(line, cuts, names, ctx, index > 0);
    if (index === 0) phase.after = after;
  });
  return phase;
}
