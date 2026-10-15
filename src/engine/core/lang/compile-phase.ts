import { addProblem, matchEffectLine, matchLine, phaseId, rejectChildren, type LineCtx } from './compile-util';
import type { OutlineNode } from './outline';
import { normalizeLine, suggestNames } from './phrases';
import { parseParam, thirdPerson, VOCAB_TYPES } from './refs';
import type { CompiledPhase, CompiledTrigger, CondGroup, DeclaredMove, ParamType, PhraseRef, Vocab, ZoneRef } from './types';

const HINT = /^hint:\s*(.*)$/i;
const REARRANGE = /^players may rearrange their (.+) at any time$/i;
const STARTS = /^when this phase starts:?$/i;
const GO_TO = /^when (.+), go to ([^:]+)$/i;
const TRIGGER = /^when (.+):$/i;
const ONLY_IF_ONE_OF = /^only if one of:?$/i;
const ONLY_IF = /^only if (.+)$/i;
const THEN = /^then:?$/i;
/** After a player <verbs>, <turn phrase>: the verbs are single words, so the list runs as long as a comma and the turn phrase still follow it. */
const AFTER = /^after a player (\w+(?:(?:, or |, | or )\w+)*), (.+)$/i;
const VERB_SEPARATOR = /, or |, | or /i;

const RESERVED_VERB = 'reorder';
const NOT_UNDERSTOOD = "I don't understand this line in a phase. Phase lines start with Hint:, A player may…, When…, After a player…, Players take turns or Everyone acts at once.";
const NOT_UNDERSTOOD_IN_MOVE = "I don't understand this line under a move. Use Only if…, Only if one of: or Then:.";
const ONE_ZONE = 'A move goes from one zone to one zone.';
const ONE_GO_TO = 'A phase can have only one “go to” rule for now.';
const ONE_AFTER = 'A phase can have only one “After a player …” rule.';
const EMPTY_ONE_OF = 'Add the conditions under “Only if one of:”, one on each line.';

const MAX_SUGGESTIONS = 3;

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

/** One declared move with its `Only if` conditions and `Then:` effects; null when the move line itself is wrong. */
function compileMove(node: OutlineNode, found: RegExpExecArray, ctx: LineCtx): DeclaredMove | null {
  const inMove: LineCtx = { ...ctx, inMove: true };
  const verb = found[1].toLowerCase();
  const reserved = verb === RESERVED_VERB;
  if (reserved) addProblem(ctx.diagnostics, node.line, `“${RESERVED_VERB}” is reserved; pick another word.`, { text: found[1] });
  const zones = moveZones(node, found, ctx);

  const conditions: CondGroup[] = [];
  const effects: PhraseRef[] = [];
  for (const child of node.children) {
    const clean = normalizeLine(child.text);
    const group = readCondition(child, clean, inMove);
    if (group) {
      conditions.push(group);
    } else if (THEN.test(clean)) {
      for (const line of child.children) {
        rejectChildren(line, ctx.diagnostics);
        effects.push(matchEffectLine(line.text, line.line, inMove));
      }
    } else {
      addProblem(ctx.diagnostics, child.line, NOT_UNDERSTOOD_IN_MOVE, { text: clean });
    }
  }
  if (reserved || !zones) return null;
  return { verb, ...zones, fromText: found[2], conditions, effects, line: node.line };
}

/** A `When <condition>:` rule: its `Only if` lines add conditions, every other line is an effect. */
function compileTrigger(node: OutlineNode, clean: string, whenText: string, ctx: LineCtx): CompiledTrigger {
  const when = matchLine('condition', whenText, node.line, ctx);
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
  return { line: node.line, text: clean.slice(0, -1).trimEnd(), when, conditions, effects };
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

/** An `After a player <verbs>, <turn phrase>` line. `declared` is every move verb the phase's move lines name. */
function readAfter(node: OutlineNode, found: RegExpExecArray, declared: string[], ctx: LineCtx, seen: boolean): CompiledPhase['after'] {
  rejectChildren(node, ctx.diagnostics);
  if (seen) {
    addProblem(ctx.diagnostics, node.line, ONE_AFTER, { text: normalizeLine(node.text) });
    return null;
  }
  const byName = new Map(declared.map((verb) => [thirdPerson(verb), verb] as const));
  const verbs: string[] = [];
  let known = true;
  for (const word of found[1].split(VERB_SEPARATOR)) {
    const verb = byName.get(word.toLowerCase());
    if (verb === undefined) {
      const moves = byName.size > 0 ? `The moves here are: ${[...byName.keys()].join(', ')}.` : 'This phase has no moves.';
      addProblem(ctx.diagnostics, node.line, `“${word}” isn't a move in this phase. ${moves}`, { text: word });
      known = false;
    } else if (!verbs.includes(verb)) {
      verbs.push(verb);
    }
  }
  const next = matchLine('turn', found[2], node.line, ctx);
  return known ? { verbs, next, line: node.line } : null;
}

/**
 * One `Phase:` block: its hint and who acts, the moves players may make with their conditions and effects, what
 * happens when it starts, the rules that fire while it lasts, where it goes next, and when the turn passes.
 */
export function compilePhase(node: OutlineNode, ctx: LineCtx): CompiledPhase {
  const phase: CompiledPhase = {
    id: phaseId(node), line: node.line, hint: null, actor: 'current', rearrange: [], moves: [], onEnter: [],
    goTo: null, triggers: [], after: null,
  };
  const moveLine = moveLineFor(ctx.vocab);
  // After lines are read last: they may come before the moves they name. A move with a problem still counts as named.
  const afters: { node: OutlineNode; found: RegExpExecArray }[] = [];
  const moveVerbs: string[] = [];
  let hinted = false;
  let sawGoTo = false;

  for (const child of node.children) {
    const clean = normalizeLine(child.text);
    const words = clean.toLowerCase();
    const hint = HINT.exec(child.text);
    const rearrange = REARRANGE.exec(clean);
    const move = moveLine.exec(clean) ?? LOOSE_MOVE_LINE.exec(clean);
    const goTo = GO_TO.exec(clean);
    const trigger = TRIGGER.exec(clean);
    const after = AFTER.exec(clean);

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
      moveVerbs.push(move[1].toLowerCase());
      const declared = compileMove(child, move, ctx);
      if (declared) phase.moves.push(declared);
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
    } else if (trigger) {
      phase.triggers.push(compileTrigger(child, clean, trigger[1], ctx));
      continue;
    } else if (after) {
      afters.push({ node: child, found: after });
      continue;
    } else {
      addProblem(ctx.diagnostics, child.line, NOT_UNDERSTOOD, { text: clean });
      continue;
    }
    rejectChildren(child, ctx.diagnostics);
  }

  afters.forEach(({ node: line, found }, index) => {
    const after = readAfter(line, found, moveVerbs, ctx, index > 0);
    if (index === 0) phase.after = after;
  });
  return phase;
}
