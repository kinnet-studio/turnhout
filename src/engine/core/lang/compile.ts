import { addProblem, attempt, matchEffectLine, matchLine, phaseId, phraseFn, rejectChildren, type LineCtx } from './compile-util';
import type { Diagnostic } from './diagnostics';
import { parseOutline, type OutlineNode } from './outline';
import { normalizeLine, vocabFrom, type PhraseLibrary } from './phrases';
import type {
  CardSetSpec, CardsFn, CompiledEnd, CompiledGame, CompiledPhase, PhraseRef, Vocab, ZoneFn, ZoneSpec,
} from './types';

export type CompileResult = { game?: CompiledGame; diagnostics: Diagnostic[] };

const SECTION = /^(game|players|cards|table|setup|phase|end|example)\s*:\s*(.*)$/i;
const PLAYERS = /^(\d+)(?:\s+to\s+(\d+))?$/i;
const MOVE_VERB = /^a player may (\w+) a card from /i;
const HINT = /^hint:\s*(.*)$/i;
const GAME_ENDS = /^the game ends when\s+(.+)$/i;
const SAYS_WINS = /\bwins\b/i;
const BLOCK_SECTIONS = new Set(['cards', 'table', 'setup', 'end']);

const MAX_PLAYERS = 12;

const MISSING_GAME = 'Start with a line like “Game: My Game”.';
const BAD_PLAYERS = 'Say how many players, like “Players: 4” or “Players: 2 to 5”.';
const TOO_MANY_PLAYERS = `This game can have at most ${MAX_PLAYERS} players.`;
const UNKNOWN_SECTION = "I don't understand this section. Sections are Game, Players, Cards, Table, Setup, Phase, End and Example.";

type Section = { keyword: string; rest: string; node: OutlineNode };

/** The top-level lines that start a section; anything else is reported. */
function readSections(roots: OutlineNode[], diagnostics: Diagnostic[]): Section[] {
  const sections: Section[] = [];
  for (const node of roots) {
    const found = SECTION.exec(node.text);
    const keyword = found?.[1].toLowerCase() ?? '';
    const rest = found?.[2].trim() ?? '';
    // Sections that hold lines take them on the lines below, not after the colon.
    if (!found || (BLOCK_SECTIONS.has(keyword) && rest !== '')) {
      addProblem(diagnostics, node.line, UNKNOWN_SECTION, { text: node.text });
      continue;
    }
    sections.push({ keyword, rest, node });
  }
  return sections;
}

/** The lines inside every section of one kind, in the order written. */
const linesOf = (sections: Section[]): OutlineNode[] => sections.flatMap((s) => s.node.children);

function readGameName(games: Section[], diagnostics: Diagnostic[]): string | null {
  let name: string | null = null;
  for (const [index, { node, rest }] of games.entries()) {
    rejectChildren(node, diagnostics);
    if (index > 0) addProblem(diagnostics, node.line, 'There is already a Game: line above.');
    else if (rest === '') addProblem(diagnostics, node.line, MISSING_GAME);
    else name = rest;
  }
  if (games.length === 0) addProblem(diagnostics, 1, MISSING_GAME);
  return name;
}

function readPlayers(lines: Section[], diagnostics: Diagnostic[]): { min: number; max: number } | null {
  let players: { min: number; max: number } | null = null;
  let seen = false;
  for (const { node, rest } of lines) {
    rejectChildren(node, diagnostics);
    if (seen) {
      addProblem(diagnostics, node.line, 'There is already a Players: line above.');
      continue;
    }
    seen = true;
    const found = PLAYERS.exec(rest);
    const min = found ? Number(found[1]) : 0;
    const max = found?.[2] === undefined ? min : Number(found[2]);
    if (Math.max(min, max) > MAX_PLAYERS) addProblem(diagnostics, node.line, TOO_MANY_PLAYERS);
    else if (min >= 1 && max >= min) players = { min, max };
    else addProblem(diagnostics, node.line, BAD_PLAYERS);
  }
  if (!seen) addProblem(diagnostics, 1, BAD_PLAYERS);
  return players;
}

function compileTable(lines: OutlineNode[], ctx: LineCtx): ZoneSpec[] {
  const zones: ZoneSpec[] = [];
  for (const node of lines) {
    rejectChildren(node, ctx.diagnostics);
    const ref = matchLine('zone', node.text, node.line, ctx);
    if (ref.kind !== 'zone') continue;
    const zone = attempt(ctx, node.line, ref.text, () => phraseFn<ZoneFn>(ctx, ref)(ref.args));
    if (!zone) continue;
    if (zones.some((z) => z.name === zone.name)) addProblem(ctx.diagnostics, node.line, `There are two zones called “${zone.name}”.`);
    else zones.push(zone);
  }
  return zones;
}

function compileCards(lines: OutlineNode[], ctx: LineCtx): CardSetSpec[] {
  const sets: CardSetSpec[] = [];
  for (const node of lines) {
    rejectChildren(node, ctx.diagnostics);
    const ref = matchLine('cards', node.text.replace(/:$/, ''), node.line, ctx);
    if (ref.kind !== 'cards') continue;
    const set = attempt(ctx, node.line, ref.text, () => phraseFn<CardsFn>(ctx, ref)(ref.args, node.table));
    if (set) sets.push(set);
  }
  return sets;
}

/**
 * One `Phase:` block. Lines that set rules for the phase's moves, triggers and transitions are not read yet:
 * they are reported until the phase-rule compiler takes them over from here.
 */
function compilePhase(node: OutlineNode, ctx: LineCtx): CompiledPhase {
  const phase: CompiledPhase = {
    id: phaseId(node), line: node.line, hint: null, actor: 'current', rearrange: [], moves: [], onEnter: [],
    goTo: null, triggers: [], after: null,
  };
  let hinted = false;
  for (const child of node.children) {
    const clean = normalizeLine(child.text);
    const words = clean.toLowerCase();
    const hint = HINT.exec(child.text);
    if (hint) {
      if (hinted) addProblem(ctx.diagnostics, child.line, 'A phase can have only one Hint.');
      hinted = true;
      phase.hint = hint[1].trim() || null;
    } else if (words === 'players take turns') {
      phase.actor = 'current';
    } else if (words === 'everyone acts at once') {
      phase.actor = 'any';
    } else {
      addProblem(ctx.diagnostics, child.line, "I don't understand this line in a phase.", { text: clean });
      continue;
    }
    rejectChildren(child, ctx.diagnostics);
  }
  return phase;
}

/** A winner phrase, or the placeholder for one nobody has written yet. */
const isWinner = (ref: PhraseRef) => ref.kind === 'winner' || (ref.phrase === 'missing' && ref.args[0] === 'winner');

function compileEnd(sections: Section[], ctx: LineCtx): CompiledEnd | null {
  if (sections.length === 0) {
    addProblem(ctx.diagnostics, 1, 'Without an End: section the game never finishes.', { severity: 'warning' });
    return null;
  }
  let when: PhraseRef | null = null;
  let winner: PhraseRef | null = null;
  const scores: PhraseRef[] = [];
  for (const node of linesOf(sections)) {
    rejectChildren(node, ctx.diagnostics);
    const ends = GAME_ENDS.exec(node.text);
    if (ends) {
      const ref = matchLine('condition', ends[1], node.line, ctx);
      if (when) addProblem(ctx.diagnostics, node.line, 'There is already a line saying when the game ends.');
      else when = ref;
      continue;
    }
    // A line that no phrase fits is filed under the kind it sounds like.
    const says = SAYS_WINS.test(node.text);
    const ref = says ? matchLine('winner', node.text, node.line, ctx, 'score') : matchLine('score', node.text, node.line, ctx, 'winner');
    if (isWinner(ref)) {
      if (winner) addProblem(ctx.diagnostics, node.line, 'There is already a line saying who wins.');
      else winner = ref;
    } else {
      scores.push(ref);
    }
  }
  const at = sections[0].node.line;
  if (!when) addProblem(ctx.diagnostics, at, 'Add a line saying when the game ends, like “The game ends when every hand is empty.”');
  if (!winner) addProblem(ctx.diagnostics, at, 'Add a line saying who wins, like “The lowest score wins.”');
  return when && winner ? { line: when.line, when, scores, winner } : null;
}

function compile(text: string, library: PhraseLibrary, diagnostics: Diagnostic[]): CompiledGame | undefined {
  const outline = parseOutline(text);
  diagnostics.push(...outline.diagnostics);
  const sections = readSections(outline.roots, diagnostics);
  const of = (keyword: string) => sections.filter((s) => s.keyword === keyword);

  const name = readGameName(of('game'), diagnostics);
  const players = readPlayers(of('players'), diagnostics);
  const maxPlayers = players?.max ?? 0;
  const stage = (vocab: Vocab): LineCtx => ({ library, vocab, gameName: name ?? 'Untitled', inMove: false, diagnostics });

  if (of('cards').length === 0) addProblem(diagnostics, 1, 'Add a Cards: section.');
  if (of('table').length === 0) addProblem(diagnostics, 1, 'Add a Table: section.');
  const zones = compileTable(linesOf(of('table')), stage(vocabFrom({ maxPlayers })));

  // Phases and move verbs are read ahead, so a rule may name a phase that comes later in the text.
  const phaseNodes = of('phase').map((s) => s.node);
  for (const node of phaseNodes) if (phaseId(node) === '') addProblem(diagnostics, node.line, 'Give the phase a name, like “Phase: playing”.');
  const named = phaseNodes.filter((node) => phaseId(node) !== '');
  const phaseIds = [...new Set(named.map(phaseId))];
  const verbs = [...new Set(named.flatMap((node) => node.children).flatMap((c) => MOVE_VERB.exec(normalizeLine(c.text))?.[1].toLowerCase() ?? []))];

  const cards = compileCards(linesOf(of('cards')), stage(vocabFrom({ maxPlayers, zones, phases: phaseIds, verbs })));

  const ctx = stage(vocabFrom({ maxPlayers, zones, cards, phases: phaseIds, verbs }));
  const setup = linesOf(of('setup')).map((node) => {
    rejectChildren(node, diagnostics);
    return matchEffectLine(node.text, node.line, ctx);
  });

  const phases: CompiledPhase[] = [];
  const seen = new Set<string>();
  for (const node of named) {
    const phase = compilePhase(node, ctx);
    if (seen.has(phase.id)) addProblem(diagnostics, node.line, `There are two phases called “${phase.id}”.`);
    seen.add(phase.id);
    phases.push(phase);
  }
  if (phaseNodes.length === 0) addProblem(diagnostics, 1, 'Add at least one Phase: section.');

  const end = compileEnd(of('end'), ctx);
  // Example: blocks are not read yet.

  const onlyUnknownPhrases = diagnostics.every((d) => d.severity !== 'error' || d.kind === 'unknown-phrase');
  if (name === null || players === null || phases.length === 0 || !onlyUnknownPhrases) return undefined;
  return { name, players, zones, cards, setup, phases, end, examples: [] };
}

/**
 * Reads a game written by a designer. Never throws: whatever is wrong comes back as diagnostics in line order, and
 * `game` is present whenever the only errors are phrases the library does not have yet.
 */
export function compileGame(text: string, library: PhraseLibrary): CompileResult {
  const diagnostics: Diagnostic[] = [];
  let game: CompiledGame | undefined;
  try {
    game = compile(text, library, diagnostics);
  } catch (error) {
    // A bug in a phrase must not take the editor down with it.
    addProblem(diagnostics, 1, `Something went wrong reading the rules: ${error instanceof Error ? error.message : String(error)}`, { kind: 'invalid' });
  }
  diagnostics.sort((a, b) => a.line - b.line);
  return game ? { game, diagnostics } : { diagnostics };
}

/** Whether the game can be played now, and if not, why in a sentence for the designer. */
export function canPlay(result: CompileResult): { ok: true } | { ok: false; reason: string } {
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  if (result.game && errors.length === 0) return { ok: true };
  if (result.game && errors.every((d) => d.kind === 'unknown-phrase')) {
    return { ok: false, reason: `${errors.length} ${errors.length === 1 ? 'phrase still needs' : 'phrases still need'} a developer.` };
  }
  const problems = Math.max(1, errors.length);
  return { ok: false, reason: `Fix ${problems} ${problems === 1 ? 'problem' : 'problems'} in the rules first.` };
}
