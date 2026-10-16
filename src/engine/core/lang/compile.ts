import { MAX_CARDS, TOO_MANY_CARDS, isSaysColumn } from './cards';
import { compileExample } from './compile-example';
import {
  actionLine, actionOf, cardMoveVerb, compilePhase, compileTrigger, pickLine, readCondition, reportHiddenCardReads, startsLineOf, targetWords,
  TURN_STARTS, type TargetWords, type VerbUses,
} from './compile-phase';
import {
  addProblem, attempt, FOR_EVERY_AT_LEAST_ONE, innerEffect, matchEffectLine, matchLine, phaseId, phraseFn, POINTS_FOR_EVERY, rejectChildren, type LineCtx,
} from './compile-util';
import type { Diagnostic } from './diagnostics';
import { parseOutline, type OutlineNode } from './outline';
import { normalizeLine, suggestNames, vocabFrom, type PhraseLibrary } from './phrases';
import { canon, parseParam } from './refs';
import { ROUND_FRAME, usesTurns } from './turns';
import type {
  BankSpec, BoardFn, BoardSpec, CardSetSpec, CardsFn, CardTable, CompiledEnd, CompiledGame, CompiledPhase, DeclareFn, EveryPhase, FactSpec, PhraseRef,
  SpaceSpec, Vocab, WorkedValue, ZoneFn, ZoneSpec,
} from './types';

export type CompileResult = { game?: CompiledGame; diagnostics: Diagnostic[] };

const SECTION_NAMES = ['Game', 'Players', 'Cards', 'Table', 'Board', 'Setup', 'In every phase', 'Phase', 'End', 'Example'];
const SECTION = new RegExp(`^(${SECTION_NAMES.join('|')})\\s*:\\s*(.*)$`, 'i');
/** A top-level line that is only a name and a colon: a section that holds lines, whatever it is named. */
const HEADER = /^([^:]+?)\s*:$/;
const PLAYERS = /^(\d+)(?:\s+to\s+(\d+))?$/i;
const GAME_ENDS = /^the game ends when\s+(.+)$/i;
/** An End condition that waits for the round to finish; group 1 is the condition. Conditions have no “and” of their own (R1.5). */
const ROUND_ENDS = /^(.+?)\s+and the round is finished$/i;
const SAYS_WINS = /\bwins\b/i;
const LOOP_LINE = /^the\s+board\s+is\s+a\s+loop\b/i;
const BLOCK_SECTIONS = new Set(['cards', 'table', 'board', 'setup', 'in every phase', 'end']);
/** Where one sentence of a says cell ends and the next begins: a full stop followed by whitespace. */
const SENTENCE_END = /\.\s+/;
/** The lines under `In every phase:` that start each round. */
const ROUND_STARTS = /^when a round starts:?$/i;
/** Any other rule under `In every phase:`: group 1 is what it waits for. */
const EVERY_PHASE_RULE = /^when (.+):$/i;

const MAX_PLAYERS = 12;
/** “They are out” already says a player has left the game, so a fact about players may not be called that. */
const LEAVES_THE_GAME = 'out';

const MISSING_GAME = 'Start with a line like “Game: My Game”.';
/** A button's wording is its move type: written “Any player may” in one phase and “A player may” in another, it would be two things. */
const openedDifferently = (words: string, firstIsAnyone: boolean) => firstIsAnyone
  ? `“${words}” is a button any player may press in another phase; use the same opening in both.`
  : `“${words}” is written “A player may …” in another phase; use the same opening in both.`;
const BAD_PLAYERS = 'Say how many players, like “Players: 4” or “Players: 2 to 5”.';
const TOO_MANY_PLAYERS = `This game can have at most ${MAX_PLAYERS} players.`;
const UNKNOWN_SECTION = `I don't understand this section. Sections are ${SECTION_NAMES.slice(0, -1).join(', ')} and ${SECTION_NAMES.at(-1)}, or a column of the board's table.`;
const NO_LOOP = 'Add a line like “The board is a loop of spaces, starting at Go:” under Board:.';
const NO_BOARD_FOR_PLAYER_FACTS = 'Facts about players need a Board: section or lines under Players:.';
const NO_BOARD_FOR_GAME_NUMBERS = 'Numbers that belong to the game need a Board: section or lines under Players:.';
/** The loop of spaces is the board itself, and a game that has one says so under Board:, where its table and pieces are. */
const LOOP_UNDER_PLAYERS = 'The board goes under a Board: section, not under Players:.';
const GAME_NUMBER_IS_A_COUNTER = (name: string) => `“${name}” is already a number each player has; give the game's number another name.`;
/** What the lines of a button that carries a number call that number, so a number of the game may not be called it too. */
const THE_AMOUNT = 'amount';
const GAME_NUMBER_IS_THE_AMOUNT = `“${THE_AMOUNT}” already means the number a button's press carries; give the game's number another name.`;
const HOLD_BACK = (line: number) => `Some lines below can't be checked until line ${line} is fixed.`;
const HOLD_BACK_SAYS = (line: number) => `Some card lines can't be checked until line ${line} is fixed.`;
// The example uses one of the game's own counters, so the compiler needs no word of its own for a thing players have.
const SAYS_NOTHING = (counter: string) => `Say what this card does, like “They get 50 ${counter}.”`;
const SAYS_EXAMPLE_COUNTER = 'coins';
const ONLY_WHEN_RULES = 'Only “When …:” rules go under In every phase:, like “When the shop has fewer than 4 cards:”.';
/** The first phase starts once, as the game does: each turn after the first goes back to it without starting it again. */
const FIRST_PHASE_STARTS =
  'This phase comes first, so its “When this phase starts:” lines run only on the game\'s first turn. Put what starts each turn under “When a player\'s turn starts:”.';
/** A line of a section that works out a flag for cards. */
const ONLY_IF_LINE = /^only if /i;
/** A line of a section that works out a number for cards: “A red card's …”, “A card's …”. */
const ABOUT_A_CARD = /^an? (?:.+ )?card['‘’]s /i;
/**
 * What a line of a number section says it is about: group 1 is the name between “card's” and the first “is”, “are” or “goes down by”, as
 * a line that takes the value down names it too.
 */
const LINE_ABOUT = /card['‘’]s (.+?) (?:is|are|goes down by) /i;
const MIXED_LINES = "Write a worked-out value's lines all as “Only if …” (it holds when they all do) or all as “A … card's … is …”, not both.";
const WORKED_IS_A_FACT = (name: string) => `“${name}” is already a fact cards keep; a value worked out from lines needs a name of its own.`;
const FLAG_IS_A_COLUMN = (name: string) =>
  `“${name}” is a column of the card table, so it is a number; work it out with lines like “A … card's ${name} is …”.`;
const LINE_UNDER_OTHER = (said: string, header: string) => `This line is about “${said}”, but it is under ${header}:.`;

type Section = { keyword: string; rest: string; node: OutlineNode };
/** A section that works out a value for cards: `keyword` is the value's name, and `refines` says it is a column of a card table. */
type CardSection = Section & { refines: boolean };

/**
 * The top-level lines that start one of the fixed sections, and the other top-level lines, which are left for later: a line
 * naming a column of the board's table is a section too, but which names those are is only known once the board is read.
 */
function readSections(roots: OutlineNode[], diagnostics: Diagnostic[]): { sections: Section[]; others: OutlineNode[] } {
  const sections: Section[] = [];
  const others: OutlineNode[] = [];
  for (const node of roots) {
    const found = SECTION.exec(node.text);
    if (!found) {
      others.push(node);
      continue;
    }
    const keyword = found[1].toLowerCase();
    const rest = found[2].trim();
    // Sections that hold lines take them on the lines below, not after the colon.
    if (BLOCK_SECTIONS.has(keyword) && rest !== '') {
      addProblem(diagnostics, node.line, UNKNOWN_SECTION, { text: node.text });
      continue;
    }
    sections.push({ keyword, rest, node });
  }
  return { sections, others };
}

const capitalised = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

/** The name a top-level line that holds lines gives itself, its spaces tidied; undefined for a line that is not one. */
const headerOf = (node: OutlineNode): string | undefined => HEADER.exec(node.text)?.[1].replace(/\s+/g, ' ');

/** Every column of a board's table that holds something for some space, as the designer's table spells it; the `space` column only names them. */
const columnsOf = (board: BoardSpec): string[] => [...new Set(board.spaces.flatMap((space) => Object.keys(space.attrs)))];

/**
 * The sections named after a column of the board's table, each with the column it is about. A line that is neither one of
 * those nor a fixed section is reported, with the closest names of both kinds. While the board has a problem the columns
 * are not known, so such lines are left alone: the board's own problem is already on screen, and fixing it may show they
 * were columns.
 */
function readColumnSections(others: OutlineNode[], board: BoardSpec | null, boardFailed: boolean, diagnostics: Diagnostic[]): Section[] {
  const columns = board ? columnsOf(board) : [];
  const found: Section[] = [];
  for (const node of others) {
    const header = headerOf(node);
    const column = header === undefined ? undefined : columns.find((name) => canon(name) === canon(header));
    if (column !== undefined) {
      found.push({ keyword: column, rest: '', node });
    } else if (!boardFailed) {
      const suggestions = header === undefined ? [] : suggestNames(header, [...SECTION_NAMES, ...columns.map(capitalised)]);
      addProblem(diagnostics, node.line, UNKNOWN_SECTION, { text: node.text, suggestions });
    }
  }
  return found;
}

/** A value worked out for cards is a flag when every line of its sections is an `Only if`, and a number otherwise. */
function workedKind(sections: Section[], name: string): WorkedValue['kind'] {
  const lines = sections.filter((s) => s.keyword === name).flatMap((s) => s.node.children);
  return lines.length > 0 && lines.every((line) => ONLY_IF_LINE.test(normalizeLine(line.text))) ? 'flag' : 'number';
}

/** The values the sections work out for cards, each once, in the order first written: the words the game's lines may read them by. */
const workedNames = (sections: Section[]): { name: string; kind: WorkedValue['kind'] }[] =>
  [...new Set(sections.map((s) => s.keyword))].map((name) => ({ name, kind: workedKind(sections, name) }));

/**
 * The sections that work out a value for cards (R4), and the other top-level lines, left for `readColumnSections`. Only a game
 * with a card table has them. A header is one when it is no column of the board's table, and it names a column of a card table (which
 * the value refines) or its first line reads as one of a value's lines: “Only if …” for a flag, “A … card's …” for a number. A value
 * may not be named after a fact cards keep, and a flag not after a column, whose cells are numbers: such a header is reported, and its
 * section left out.
 */
function readCardSections(
  others: OutlineNode[], board: BoardSpec | null, cards: CardSetSpec[], facts: FactSpec[], diagnostics: Diagnostic[],
): { sections: CardSection[]; rest: OutlineNode[] } {
  const tables = cards.filter((set) => set.kind !== 'standard');
  if (tables.length === 0) return { sections: [], rest: others };
  const boardColumns = board ? columnsOf(board) : [];
  // What a card says is a rule for its player, not a number, so its column is never one to work out.
  const cardColumns = [...new Set(tables.flatMap((set) => set.identities.flatMap((identity) => Object.keys(identity.attrs))))]
    .filter((column) => !isSaysColumn(column));
  const found: CardSection[] = [];
  const rest: OutlineNode[] = [];
  for (const node of others) {
    const header = headerOf(node);
    const named = (names: string[]) => (header === undefined ? undefined : names.find((name) => canon(name) === canon(header)));
    const column = named(cardColumns);
    const first = normalizeLine(node.children[0]?.text ?? '');
    const isCardSection = header !== undefined && named(boardColumns) === undefined
      && (column !== undefined || ONLY_IF_LINE.test(first) || ABOUT_A_CARD.test(first));
    if (isCardSection) found.push({ keyword: column ?? canon(header), rest: '', node, refines: column !== undefined });
    else rest.push(node);
  }
  const sections = found.filter(({ keyword, node, refines }) => {
    const problem = facts.some((fact) => fact.on === 'card' && fact.name === keyword) ? WORKED_IS_A_FACT(keyword)
      : refines && workedKind(found, keyword) === 'flag' ? FLAG_IS_A_COLUMN(keyword) : null;
    if (problem !== null) addProblem(diagnostics, node.line, problem, { text: node.text });
    return problem === null;
  });
  return { sections, rest };
}

/**
 * What the sections that work out values for cards say, by value, the lines of its sections in the order written; each line is about a
 * card. A flag's lines are its `Only if` groups. A number's are lines of kind `value`, each about the value its section works out: an
 * `Only if` among them, or a line about another value, is reported on its line and left out.
 */
function compileWorked(sections: CardSection[], ctx: LineCtx): { [name: string]: WorkedValue } {
  const about: LineCtx = { ...ctx, card: true };
  const worked = new Map<string, WorkedValue>();
  for (const { keyword: name, node, refines } of sections) {
    const kind = workedKind(sections, name);
    const value = worked.get(name) ?? (kind === 'flag' ? { kind, conditions: [], line: node.line } : { kind, refines, refs: [], line: node.line });
    worked.set(name, value);
    const header = headerOf(node) ?? name;
    for (const line of node.children) {
      const clean = normalizeLine(line.text);
      if (value.kind === 'flag') {
        const group = readCondition(line, clean, about);
        if (group) value.conditions.push(group);
        continue;
      }
      if (ONLY_IF_LINE.test(clean)) {
        addProblem(ctx.diagnostics, line.line, MIXED_LINES, { text: clean });
        continue;
      }
      rejectChildren(line, ctx.diagnostics);
      // A name that is no value at all is left to the line's phrase, which says so with the names closest to it.
      const said = LINE_ABOUT.exec(clean)?.[1];
      const other = said === undefined ? null : parseParam('attribute', said, ctx.vocab);
      if (said !== undefined && other !== null && 'value' in other && other.value !== name) {
        addProblem(ctx.diagnostics, line.line, LINE_UNDER_OTHER(said, header), { text: clean });
        continue;
      }
      value.refs.push(matchLine('value', clean, line.line, about));
    }
  }
  return Object.fromEntries(worked);
}

/** Every line a section takes up: its own, the lines under it and the rows of their tables. */
function linesIn(node: OutlineNode): number[] {
  return [node.line, ...(node.table?.rows.map((row) => row.line) ?? []), ...node.children.flatMap(linesIn)];
}

/**
 * The Players:, Board:, Table: and Cards: sections give every other line its words: the seats, the spaces and counters,
 * the zones and the cards. While one of their lines has an error, what the rule lines below it say about those words
 * is held back, and one warning stands in for it; the problems on their own lines are always shown. The line to fix is
 * the first error in the order those words are read (cards name the zones they start in), so that fixing it cannot be
 * blocked by another. Gives that line, or null when none has an error, whether or not any line was held back for it.
 */
function holdBack(diagnostics: Diagnostic[], stages: Section[][]): number | null {
  const lineSet = (sections: Section[]) => new Set(sections.flatMap((s) => linesIn(s.node)));
  const errorLines = (lines: Set<number>) => diagnostics.filter((d) => d.severity === 'error' && lines.has(d.line)).map((d) => d.line);
  const failing = stages.map((stage) => errorLines(lineSet(stage))).find((lines) => lines.length > 0);
  if (!failing) return null;
  const root = Math.min(...failing);
  const ownLines = lineSet(stages.flat());
  const held = (d: Diagnostic) => (d.kind === 'unknown-phrase' || d.kind === 'invalid') && d.line > root && !ownLines.has(d.line);
  const heldLines = diagnostics.filter(held).map((d) => d.line);
  if (heldLines.length === 0) return root;
  const kept = diagnostics.filter((d) => !held(d));
  diagnostics.splice(0, diagnostics.length, ...kept);
  addProblem(diagnostics, Math.min(...heldLines), HOLD_BACK(root), { severity: 'warning' });
  return root;
}

/** A button as the words of the game know it, from its line: null for a line that is no button. */
function buttonOf(node: OutlineNode, target: TargetWords): Vocab['actions'][number] | null {
  const found = actionLine(node);
  if (found) {
    const { verb, words, base, target: picked, anyone, amount, picksPlayer } = actionOf(found, target);
    return { verb, words, base, targeted: picked !== null, anyone, amount, picksPlayer };
  }
  const pick = pickLine(node);
  return pick && { verb: pick.verb, words: pick.words, base: pick.base, targeted: false, anyone: pick.anyone, amount: false, picksPlayer: false, picksCard: true };
}

/**
 * The buttons the phases declare, one for each wording, the first written winning; a line that mentions a card moves one, even
 * mistyped, and is no button, unless it is a button that picks a card. One wording is one move type, so it can't be a button any player
 * may press in one phase and not in another: the later line is reported. (Twice in one phase is reported by the phase.)
 */
function readActions(phases: OutlineNode[], ctx: LineCtx): Vocab['actions'] {
  const target = targetWords(ctx);
  const byWords = new Map<string, { action: Vocab['actions'][number]; phase: OutlineNode }>();
  for (const phase of phases) {
    for (const child of phase.children) {
      const action = buttonOf(child, target);
      if (!action) continue;
      const first = byWords.get(action.words);
      if (!first) byWords.set(action.words, { action, phase });
      else if (first.phase !== phase && first.action.anyone !== action.anyone) addProblem(ctx.diagnostics, child.line, openedDifferently(action.words, first.action.anyone));
    }
  }
  return [...byWords.values()].map((first) => first.action);
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

/**
 * The player count, and the lines indented under the first `Players:` line: numbers each player has and facts, which a game
 * with no board declares there. A second `Players:` line is reported and its lines are rejected, as they were before.
 */
function readPlayers(lines: Section[], diagnostics: Diagnostic[]): { players: { min: number; max: number } | null; lines: OutlineNode[] } {
  let players: { min: number; max: number } | null = null;
  let kept: OutlineNode[] = [];
  let seen = false;
  for (const { node, rest } of lines) {
    if (seen) {
      rejectChildren(node, diagnostics);
      addProblem(diagnostics, node.line, 'There is already a Players: line above.');
      continue;
    }
    seen = true;
    kept = node.children;
    const found = PLAYERS.exec(rest);
    const min = found ? Number(found[1]) : 0;
    const max = found?.[2] === undefined ? min : Number(found[2]);
    if (Math.max(min, max) > MAX_PLAYERS) addProblem(diagnostics, node.line, TOO_MANY_PLAYERS);
    else if (min >= 1 && max >= min) players = { min, max };
    else addProblem(diagnostics, node.line, BAD_PLAYERS);
  }
  if (!seen) addProblem(diagnostics, 1, BAD_PLAYERS);
  return { players, lines: kept };
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

/** A fact a line declares and the line it is on, kept until the columns of every table are known. */
type Declared = FactSpec & { line: number };

/** Reads what a line that declares facts says, and keeps each fact in `declared`. */
function declareFacts(ref: PhraseRef, ctx: LineCtx, declared: Declared[]): void {
  const facts = attempt(ctx, ref.line, ref.text, () => phraseFn<DeclareFn>(ctx, ref)(ref.args));
  for (const fact of facts ?? []) declared.push({ ...fact, line: ref.line });
}

/**
 * The facts the game declares, in the order written. A fact's name is its own in the whole game, and is not a column of the
 * board's table or of a set of cards: a space's details and a card's face already say something under that name. A fact
 * about players is neither a counter of the board nor “out”, for players already have something under those names, and
 * only a board shows them to the seats, so a game with neither a Board: section nor lines under Players: (`hasBoard` says
 * whether it has either) may not declare one. The same goes for a number of the game: only a board shows it, and named like a
 * counter it would be read in place of each player's own number of that name. Nor may it be called “amount”: the lines of a
 * button that carries a number read that number by the name, and the two readings could only be told apart by a developer. A
 * declaration with any of these problems is reported on its own line and left out.
 */
function acceptFacts(declared: Declared[], board: BoardSpec | null, hasBoard: boolean, cards: CardSetSpec[], diagnostics: Diagnostic[]): FactSpec[] {
  const columns = new Set(
    [
      ...(board ? ['space', ...columnsOf(board)] : []),
      ...cards.flatMap((set) => set.identities.flatMap((identity) => Object.keys(identity.attrs))),
    ].map((column) => column.toLowerCase()),
  );
  const counters = new Set((board?.counters ?? []).map((counter) => counter.name));
  const facts: FactSpec[] = [];
  for (const { line, ...fact } of [...declared].sort((a, b) => a.line - b.line)) {
    // A Board: section that failed has said what is wrong already; this is for a game that never had one.
    if (fact.on === 'player' && !hasBoard) addProblem(diagnostics, line, NO_BOARD_FOR_PLAYER_FACTS);
    else if (fact.on === 'game' && !hasBoard) addProblem(diagnostics, line, NO_BOARD_FOR_GAME_NUMBERS);
    else if (fact.on === 'player' && counters.has(fact.name)) addProblem(diagnostics, line, `“${fact.name}” is already a number each player has.`);
    else if (fact.on === 'game' && counters.has(fact.name)) addProblem(diagnostics, line, GAME_NUMBER_IS_A_COUNTER(fact.name));
    else if (fact.on === 'game' && fact.name === THE_AMOUNT) addProblem(diagnostics, line, GAME_NUMBER_IS_THE_AMOUNT);
    else if (fact.on === 'player' && fact.name === LEAVES_THE_GAME) addProblem(diagnostics, line, `“${fact.name}” is already how a player leaves the game.`);
    else if (columns.has(fact.name)) addProblem(diagnostics, line, `“${fact.name}” is already a column of the table; give the fact another name.`);
    else if (facts.some((other) => other.name === fact.name)) addProblem(diagnostics, line, `There are two facts called “${fact.name}”.`);
    else facts.push(fact);
  }
  return facts;
}

/** One cell of a deck's says column, trimmed, and the line of its row. */
type SaysCell = { text: string; line: number };

/** A cell for every row of a table that has a says column; none when it has not. */
function saysCellsOf(table: CardTable | null): SaysCell[] {
  const column = table?.columns.findIndex(isSaysColumn) ?? -1;
  if (!table || column < 0) return [];
  return table.rows.map((row) => ({ text: (row.cells[column] ?? '').trim(), line: row.line }));
}

/**
 * The sets of cards the Cards: lines make, and the says cells of those that came from a table with a says column. A set that
 * has a problem is left out and so are its cells, which would only repeat that problem.
 */
function compileCards(lines: OutlineNode[], ctx: LineCtx, declared: Declared[]): { sets: CardSetSpec[]; says: SaysCell[] } {
  const sets: CardSetSpec[] = [];
  const says: SaysCell[] = [];
  let total = 0;
  for (const node of lines) {
    rejectChildren(node, ctx.diagnostics);
    const ref = matchLine('cards', node.text.replace(/:$/, ''), node.line, ctx, 'declare');
    if (ref.kind === 'declare') {
      declareFacts(ref, ctx, declared);
      continue;
    }
    if (ref.kind !== 'cards') continue;
    const set = attempt(ctx, node.line, ref.text, () => phraseFn<CardsFn>(ctx, ref)(ref.args, node.table));
    if (!set) continue;
    if (total + set.identities.length > MAX_CARDS) {
      addProblem(ctx.diagnostics, node.line, TOO_MANY_CARDS, { kind: 'invalid', text: ref.text });
      continue;
    }
    total += set.identities.length;
    sets.push(set);
    if (set.kind !== 'standard') says.push(...saysCellsOf(node.table));
  }
  return { sets, says };
}

/**
 * What each says cell tells its cards to do: every sentence is an effect line about the player who draws the card, and "it"
 * in one is the space they stand on. Every row is read, so a problem is reported on each row that has it, but rows with the
 * same text share one entry (the first one's refs stand). The problems come back apart from the rest, for the caller to show
 * without holding anything back: a card's sentence is not among the words the other lines are made of.
 */
function compileSays(cells: SaysCell[], ctx: LineCtx): { says: CompiledGame['says']; diagnostics: Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  const about: LineCtx = { ...ctx, player: true, space: true, drawn: true, diagnostics };
  // A map, for a cell may read like any property name.
  const says = new Map<string, PhraseRef[]>();
  for (const { text, line } of cells) {
    const sentences = text.split(SENTENCE_END).filter((sentence) => normalizeLine(sentence) !== '');
    if (sentences.length === 0) addProblem(diagnostics, line, SAYS_NOTHING(ctx.vocab.counters[0] ?? SAYS_EXAMPLE_COUNTER), { kind: 'invalid' });
    const refs = sentences.map((sentence) => matchEffectLine(sentence, line, about));
    if (!says.has(text)) says.set(text, refs);
  }
  return { says: Object.fromEntries(says), diagnostics };
}

/** What the Board: lines above a line have said, as a board the lines below can name spaces and counters of. */
type BoardParts = {
  spaces: SpaceSpec[] | null; pieces: BoardSpec['pieces']; counters: BoardSpec['counters']; dice: BoardSpec['dice']; payWith: string | null;
  bank: BankSpec[] | null;
};

const boardOf = (parts: BoardParts): BoardSpec => ({ ...parts, spaces: parts.spaces ?? [], bank: parts.bank ?? [] });

/**
 * Reads the lines under Players: and then the Board: lines, in the order written, with the same vocabulary for both. Every line
 * is read with the words of the lines above it (a piece starts on a space the table already named), so each gets a vocabulary of
 * its own. A line that repeats one above is reported and the first one stands. A line that declares facts goes to `declared`.
 * A loop of spaces under Players: is reported and left out: the board has a section of its own.
 *
 * With lines under Players: and no Board: section the game has a board with no spaces, which is where its numbers are kept and
 * shown from; phrases that need a space stay refused, since none is named. Null when there are neither lines under Players: nor
 * a Board: section, and when the Board: section has no loop of spaces in it.
 */
function compileBoard(
  sections: Section[], playerLines: OutlineNode[], maxPlayers: number, stage: (vocab: Vocab) => LineCtx, declared: Declared[],
): BoardSpec | null {
  if (sections.length === 0 && playerLines.length === 0) return null;
  const parts: BoardParts = { spaces: null, pieces: null, counters: [], dice: null, payWith: null, bank: null };
  const ctxFor = () => stage(vocabFrom({ maxPlayers, board: boardOf(parts) }));
  const { diagnostics } = ctxFor();
  const underBoard = linesOf(sections);
  const underPlayers = new Set(playerLines);
  for (const node of [...playerLines, ...underBoard]) {
    const ctx = ctxFor();
    if (underPlayers.has(node) && LOOP_LINE.test(node.text)) {
      addProblem(diagnostics, node.line, LOOP_UNDER_PLAYERS);
      continue;
    }
    rejectChildren(node, diagnostics);
    const ref = matchLine('board', node.text.replace(/:$/, ''), node.line, ctx, 'declare');
    if (ref.kind === 'declare') {
      declareFacts(ref, ctx, declared);
      continue;
    }
    if (ref.kind !== 'board') continue;
    const part = attempt(ctx, node.line, ref.text, () => phraseFn<BoardFn>(ctx, ref)(ref.args, node.table));
    if (!part) continue;
    const already = (message: string) => addProblem(diagnostics, node.line, message);
    switch (part.kind) {
      case 'loop':
        if (parts.spaces) already('There is already a board line above.');
        else parts.spaces = part.spaces;
        break;
      case 'pieces':
        if (parts.pieces) already('Pieces are already described above.');
        else parts.pieces = { start: part.start };
        break;
      case 'counter':
        if (parts.counters.some((c) => c.name === part.counter.name)) already(`There are two counters called “${part.counter.name}”.`);
        else parts.counters = [...parts.counters, part.counter];
        break;
      case 'dice':
        if (parts.dice) already('The dice are already described above.');
        else parts.dice = { count: part.count, sides: part.sides };
        break;
      case 'pay-with':
        if (parts.payWith) already('There is already a “Players pay with …” line above.');
        else parts.payWith = part.counter;
        break;
      case 'bank':
        if (parts.bank) already('There is already a “The bank has …” line above.');
        else parts.bank = part.bank;
        break;
    }
  }
  if (parts.spaces || sections.length === 0) return boardOf(parts);
  // A loop line with a problem has said so already; this is for a Board: that never had one.
  if (!underBoard.some((node) => LOOP_LINE.test(node.text))) addProblem(diagnostics, sections[0].node.line, NO_LOOP);
  return null;
}

/**
 * What the sections named after a column say, by column and in the order written. Each line is about a space, so it may use
 * phrases that need one.
 */
function compileColumns(sections: Section[], ctx: LineCtx): CompiledGame['columns'] {
  const about: LineCtx = { ...ctx, space: true };
  const lines = new Map<string, PhraseRef[]>();
  for (const { keyword, node } of sections) {
    const refs = lines.get(keyword) ?? [];
    lines.set(keyword, refs);
    for (const line of node.children) {
      rejectChildren(line, ctx.diagnostics);
      refs.push(matchLine('column', line.text, line.line, about));
    }
  }
  return Object.fromEntries(lines);
}

/**
 * The phase a line starts when its phrase enters the phase it names, read through what an `If …, …` or `For …, …` line does. Null
 * for any other line.
 */
function phaseStartedBy(ref: PhraseRef, library: PhraseLibrary): string | null {
  const effect = innerEffect(ref);
  if (effect.kind === 'lang') return null;
  return library.get(effect.kind, effect.phrase)?.entersPhase ? (effect.args[0] as string) : null;
}

/**
 * The rules of the `In every phase:` sections, in the order written: the lines that start each round, about no one; the lines that
 * start each turn, about the player whose turn it is; and `When …:` rules that fire whatever the phase. Those are read as a phase's
 * rules are, except that one about no one in particular is about no one, for the phase may be one where everyone acts at once. Any
 * other line is reported.
 */
function compileEveryPhase(sections: Section[], ctx: LineCtx): EveryPhase {
  const everyPhase: EveryPhase = { triggers: [], roundStarts: [], turnStarts: [] };
  const effects = (node: OutlineNode, about: LineCtx) => node.children.map((line) => {
    rejectChildren(line, ctx.diagnostics);
    return matchEffectLine(line.text, line.line, about);
  });
  for (const node of linesOf(sections)) {
    const clean = normalizeLine(node.text);
    const rule = EVERY_PHASE_RULE.exec(clean);
    if (ROUND_STARTS.test(clean)) everyPhase.roundStarts.push(...effects(node, ctx));
    else if (TURN_STARTS.test(clean)) everyPhase.turnStarts.push(...effects(node, { ...ctx, player: true }));
    else if (rule) everyPhase.triggers.push(compileTrigger(node, clean, rule[1], ctx, false));
    else addProblem(ctx.diagnostics, node.line, ONLY_WHEN_RULES, { text: clean });
  }
  return everyPhase;
}

/** Every line of the `In every phase:` sections that does something. */
const everyPhaseEffects = ({ triggers, roundStarts, turnStarts }: EveryPhase): PhraseRef[] => [
  ...roundStarts, ...turnStarts, ...triggers.flatMap((t) => t.effects),
];

/** Every line of a phase that does something: its buttons, card moves, rules, start lines and the lines that start a turn in it. */
const effectsOf = (phase: CompiledPhase): PhraseRef[] => [
  ...phase.onEnter, ...phase.actions.flatMap((a) => a.effects), ...phase.moves.flatMap((m) => m.effects),
  ...phase.triggers.flatMap((t) => t.effects), ...phase.moments.flatMap((m) => m.effects), ...phase.turnStarts,
];

/**
 * A phase that is not the first needs something to lead to it, or the game can never reach it: a `go to` in another phase, or a
 * line that starts it, in another phase or `elsewhere` (Setup, what a card says, or a rule for every phase). A phase's own lines
 * run only once it is reached, so they never lead to it.
 */
function warnUnreachable(phases: CompiledPhase[], elsewhere: PhraseRef[], library: PhraseLibrary, diagnostics: Diagnostic[]): void {
  const starts = (refs: PhraseRef[]) => new Set(refs.flatMap((ref) => phaseStartedBy(ref, library) ?? []));
  const startedElsewhere = starts(elsewhere);
  const startedBy = phases.map((phase) => starts(effectsOf(phase)));
  phases.forEach((phase, index) => {
    // A phase named twice is already reported; its repeat would only echo that.
    if (index === 0 || phases.findIndex((p) => p.id === phase.id) !== index) return;
    if (startedElsewhere.has(phase.id)) return;
    if (phases.some((p, i) => p.id !== phase.id && (p.goTo?.to === phase.id || startedBy[i].has(phase.id)))) return;
    addProblem(diagnostics, phase.line, `Nothing leads to the phase “${phase.id}”.`, { severity: 'warning' });
  });
}

/** A winner phrase, or the placeholder for one nobody has written yet. */
const isWinner = (ref: PhraseRef) => ref.kind === 'winner' || (ref.phrase === 'missing' && ref.args[0] === 'winner');

/** What “The game ends when …” waits for: the condition, held back until the round is finished when the line says so. */
function endCondition(body: string, line: number, ctx: LineCtx): PhraseRef {
  const text = normalizeLine(body);
  const round = ROUND_ENDS.exec(text);
  if (!round) return matchLine('condition', text, line, ctx);
  return { kind: 'lang', phrase: ROUND_FRAME, args: [matchLine('condition', round[1], line, ctx)], line, text };
}

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
      const ref = endCondition(ends[1], node.line, ctx);
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
      // Said now, so the designer need not play a game to its end to hear it.
      if (ref.phrase === POINTS_FOR_EVERY && (ref.args[1] as number) < 1) {
        addProblem(ctx.diagnostics, node.line, FOR_EVERY_AT_LEAST_ONE, { kind: 'invalid', text: ref.text });
      }
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
  const { sections, others } = readSections(outline.roots, diagnostics);
  const of = (keyword: string) => sections.filter((s) => s.keyword === keyword);

  const name = readGameName(of('game'), diagnostics);
  const { players, lines: playerLines } = readPlayers(of('players'), diagnostics);
  const maxPlayers = players?.max ?? 0;
  const stage = (vocab: Vocab): LineCtx => ({ library, vocab, gameName: name ?? 'Untitled', inMove: false, player: false, space: false, card: false, drawn: false, amount: false, picked: false, diagnostics });

  // A board game may have no cards and no zones at all.
  if (of('board').length === 0) {
    if (of('cards').length === 0) addProblem(diagnostics, 1, 'Add a Cards: section.');
    if (of('table').length === 0) addProblem(diagnostics, 1, 'Add a Table: section.');
  }
  const declared: Declared[] = [];
  const board = compileBoard(of('board'), playerLines, maxPlayers, stage, declared);
  const zones = compileTable(linesOf(of('table')), stage(vocabFrom({ maxPlayers })));

  // Phases and move verbs are read ahead, so a rule may name a phase that comes later in the text.
  const phaseNodes = of('phase').map((s) => s.node);
  for (const node of phaseNodes) if (phaseId(node) === '') addProblem(diagnostics, node.line, 'Give the phase a name, like “Phase: playing”.');
  const named = phaseNodes.filter((node) => phaseId(node) !== '');
  const phaseIds = [...new Set(named.map(phaseId))];
  // A card move that has a mistake still names its verb, so the examples that make it are not blamed for that mistake. A button that
  // picks a card is no card move: it is read with the buttons.
  const verbs = [...new Set(named.flatMap((node) => node.children).flatMap((line) => cardMoveVerb(line) ?? []))];

  const { sets: cards, says: saysCells } = compileCards(
    linesOf(of('cards')), stage(vocabFrom({ maxPlayers, zones, phases: phaseIds, verbs })), declared,
  );
  // Facts are checked once both tables are read, since a fact may be named like a column of either.
  const facts = acceptFacts(declared, board, of('board').length > 0 || playerLines.length > 0, cards, diagnostics);
  // The values worked out for cards are named once the facts are known, since a value may not take a fact's name, and every line from
  // here on may read them.
  const { sections: cardSections, rest } = readCardSections(others, board, cards, facts, diagnostics);
  const worked = workedNames(cardSections);
  // Buttons are read ahead too: “they have not rolled this turn” may come before the action that rolls. They wait for the facts,
  // since the words a button picks a space with may name one, and no card or declare line reads a button.
  const actions = readActions(named, stage(vocabFrom({ maxPlayers, zones, cards, phases: phaseIds, verbs, board, facts, worked })));

  // A line may read a value worked out for cards, but never change one: the compiler refuses it on that line.
  const ctx: LineCtx = {
    ...stage(vocabFrom({ maxPlayers, zones, cards, phases: phaseIds, verbs, board, actions, facts, worked })),
    ...(worked.length > 0 ? { worked: worked.map(({ name }) => name) } : {}),
  };
  const setup = linesOf(of('setup')).map((node) => {
    rejectChildren(node, diagnostics);
    return matchEffectLine(node.text, node.line, ctx);
  });
  // Which headers name a column is only known now that the board is, wherever in the text they stand.
  const boardFailed = board === null && of('board').length > 0;
  const columns = compileColumns(readColumnSections(rest, board, boardFailed, diagnostics), ctx);
  const values = compileWorked(cardSections, ctx);
  const { says, diagnostics: saysDiagnostics } = compileSays(saysCells, ctx);
  const everyPhase = compileEveryPhase(of('in every phase'), ctx);

  const phases: CompiledPhase[] = [];
  const seen = new Set<string>();
  const uses: VerbUses = { moves: new Set(), actions: new Set() };
  for (const node of named) {
    const phase = compilePhase(node, ctx, uses);
    // A phase is read without the table, so whether a pick's cards can be hidden from the player who presses it is asked here.
    reportHiddenCardReads(phase, zones, ctx);
    if (seen.has(phase.id)) addProblem(diagnostics, node.line, `There are two phases called “${phase.id}”.`);
    seen.add(phase.id);
    phases.push(phase);
  }
  if (phaseNodes.length === 0) addProblem(diagnostics, 1, 'Add at least one Phase: section.');
  warnUnreachable(phases, [...setup, ...Object.values(says).flat(), ...everyPhaseEffects(everyPhase)], library, diagnostics);

  const end = compileEnd(of('end'), ctx);
  const firstStarts = named.length > 0 ? startsLineOf(named[0]) : null;
  if (firstStarts !== null && usesTurns({ board, setup, everyPhase, end, phases })) {
    addProblem(diagnostics, firstStarts, FIRST_PHASE_STARTS, { severity: 'warning' });
  }
  const examples = of('example').map((s) => compileExample(s.node, ctx, players));

  // Decided before anything is held back: a game whose held-back lines have problems is not one to play, and neither is one
  // whose says cells have.
  const onlyUnknownPhrases = [...diagnostics, ...saysDiagnostics].every((d) => d.severity !== 'error' || d.kind === 'unknown-phrase');
  const brokenAt = holdBack(diagnostics, [of('players'), of('board'), of('table'), of('cards')]);
  // The says problems sit on lines of the Cards: section, so holding back is not run on them: they would hold back the
  // lines below them. They wait, like those lines, while a section the words come from is broken: they are probably
  // only that, and are shown once it is fixed. One warning on the first of their rows says they are waiting, for a
  // game with a problem there cannot be played and the designer would see no reason for it.
  if (brokenAt === null) diagnostics.push(...saysDiagnostics);
  else if (saysDiagnostics.length > 0) {
    addProblem(diagnostics, Math.min(...saysDiagnostics.map((d) => d.line)), HOLD_BACK_SAYS(brokenAt), { severity: 'warning' });
  }
  if (name === null || players === null || phases.length === 0 || !onlyUnknownPhrases) return undefined;
  const game: CompiledGame = { name, players, zones, cards, setup, phases, end, examples, board, facts, columns, says, everyPhase };
  // Left out, never undefined, for a game that works nothing out: such a game is the same as before there were worked values.
  return cardSections.length > 0 ? { ...game, worked: values } : game;
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
