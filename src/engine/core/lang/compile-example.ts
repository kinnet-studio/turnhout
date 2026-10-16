import { addProblem, matchLine, missingRef, rejectChildren, type LineCtx } from './compile-util';
import type { OutlineNode } from './outline';
import { normalizeLine } from './phrases';
import { misnamedParam, parseParam } from './refs';
import type { CompiledExample, ExampleStep, PhraseRef } from './types';

const NAME = /^example\s*:\s*(.*)$/i;
const STEP = /^(given|when|then|and|but)\s+(.+)$/i;
/** The phrase of “Given 3 players”, which also says how many seats the example is played with. */
const PLAYER_COUNT = '{int} players';
/**
 * A When step that names the choices of its press: its args are the action before them, the players named after “, paying” (none when
 * it names none) and the option named after “, choosing”, as written (null when it names none).
 */
export const CHOOSING = 'choosing';
/** group 1 = the press, group 2 = the players it pays, group 3 = the option it chooses; at least one of the last two is there. */
const NAMES_CHOICES = /^(.+?)(?:, paying (.+?))?(?:, choosing (.+))?$/i;

const NEEDS_NAME = 'Give the example a name, like “Example: playing a club”.';
const NEEDS_KEYWORD = 'Start each line of an example with Given, When, Then, And or But.';
const NEEDS_START = 'Start an example with Given or When.';

const players = (n: number) => `${n} ${n === 1 ? 'player' : 'players'}`;

/** Says how many players the game has, the way “Players:” does. */
export const gameIsFor = ({ min, max }: { min: number; max: number }) => `This game is for ${min === max ? players(min) : `${min} to ${players(max)}`}.`;

/**
 * A When step: a press, or a press and the choices it names, “p0 opens the Statue, paying p2”, “…, choosing trim 2 gold” or both, in that
 * order (see `CHOOSING`). The press is read as a When line of its own would be, and its problems are the line's. Players the game doesn't
 * have, or misspelt, are reported on the line; words after “, paying” that are not even shaped like players leave the line to be read whole.
 */
function readWhen(text: string, line: number, ctx: LineCtx): PhraseRef {
  const clean = normalizeLine(text);
  const [, head, paying, choosing] = NAMES_CHOICES.exec(clean)!;
  if (paying === undefined && choosing === undefined) return matchLine('action', clean, line, ctx);
  const players = paying === undefined ? { value: [] } : parseParam('players', paying, ctx.vocab);
  const misnamed = players === null ? misnamedParam('players', paying, ctx.vocab) : null;
  // Words after “, paying” that are not even shaped like players belong to some other press.
  if (players === null && misnamed === null) return matchLine('action', clean, line, ctx);
  const action = matchLine('action', head, line, ctx);
  if (players !== null && 'value' in players) {
    return { kind: 'lang', phrase: CHOOSING, args: [action, players.value, choosing ?? null], line, text: clean };
  }
  if (players === null) addProblem(ctx.diagnostics, line, misnamed!.message, { kind: 'invalid', text: clean, suggestions: misnamed!.suggestions });
  else addProblem(ctx.diagnostics, line, players.error, { kind: 'invalid', text: clean });
  return missingRef('action', clean, line);
}

/** The step a Given, When or Then line stands for; the phrase kinds that line is looked up as depend on the keyword. */
function readStep(keyword: ExampleStep['keyword'], text: string, line: number, ctx: LineCtx): PhraseRef {
  switch (keyword) {
    case 'given': return matchLine('given', text, line, ctx, 'effect');
    case 'when': return readWhen(text, line, ctx);
    case 'then': return matchLine('expect', text, line, ctx, 'condition');
  }
}

/**
 * One `Example: <name>` block. Its Given lines arrange the table, its When lines make moves and its Then lines check
 * what came of them; And and But carry on with the keyword before them. `range` is how many players the game allows,
 * which a “Given 3 players” line is checked against.
 */
export function compileExample(node: OutlineNode, ctx: LineCtx, range: { min: number; max: number } | null = null): CompiledExample {
  const name = (NAME.exec(node.text)?.[1] ?? '').trim();
  if (name === '') addProblem(ctx.diagnostics, node.line, NEEDS_NAME);
  const example: CompiledExample = { name, line: node.line, players: null, steps: [] };

  let keyword: ExampleStep['keyword'] | null = null;
  let startReported = false;
  for (const child of node.children) {
    rejectChildren(child, ctx.diagnostics);
    const clean = normalizeLine(child.text);
    const found = STEP.exec(clean);
    if (!found) {
      addProblem(ctx.diagnostics, child.line, NEEDS_KEYWORD, { text: clean });
      continue;
    }
    const said = found[1].toLowerCase();
    const next: ExampleStep['keyword'] | null = said === 'and' || said === 'but' ? keyword : (said as ExampleStep['keyword']);
    // An example has to start by arranging or acting; once it has, And and But carry on from the line before.
    if (next === null || (keyword === null && next === 'then')) {
      if (!startReported) addProblem(ctx.diagnostics, child.line, NEEDS_START, { text: clean });
      startReported = true;
      continue;
    }
    keyword = next;

    const ref = readStep(keyword, found[2], child.line, ctx);
    example.steps.push({ keyword, ref });
    if (ref.kind === 'given' && ref.phrase === PLAYER_COUNT) {
      const count = ref.args[0] as number;
      if (range && (count < range.min || count > range.max)) addProblem(ctx.diagnostics, child.line, gameIsFor(range), { text: ref.text });
      else example.players = count;
    }
  }
  return example;
}
