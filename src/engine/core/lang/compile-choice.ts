import { CHOOSE_PLAYER } from './choices';
import { addProblem, matchLine, type LineCtx } from './compile-util';
// Each module uses the other's functions only while compiling, never while it loads, so the two may import each other.
import { readCondition } from './compile-phase';
import type { OutlineNode } from './outline';
import { normalizeLine } from './phrases';
import { theyForm } from './refs';
import type { CondGroup, PhraseRef } from './types';

const ONLY_ONLY_IF = 'Under a choice, write only “Only if …” lines.';

/**
 * A `Then:` line that asks the presser to pick a player (`CHOICE_LINE`, found in it as `found`): “They pay the fee to another player of
 * their choice who has a card in their workshop whose mark is the card's wants.” `at` is its place among the button's choices.
 * - Its effect is read as “… to that player”, the player a press picked, so it can be any phrase that reads one.
 * - Its clause is read as a condition about “they”, judged about each player who might be picked.
 * - The `Only if` lines under it say when it is asked at all; any other line under it is reported.
 */
export function readChoiceLine(node: OutlineNode, found: RegExpExecArray, at: number, ctx: LineCtx): PhraseRef {
  const effect = matchLine('effect', `${found[1]} to that player`, node.line, { ...ctx, picked: true });
  const who = matchLine('condition', `they ${theyForm(found[2])}`, node.line, { ...ctx, player: true });
  const guard: CondGroup[] = [];
  for (const child of node.children) {
    const clean = normalizeLine(child.text);
    const group = readCondition(child, clean, ctx);
    if (group) guard.push(group);
    else addProblem(ctx.diagnostics, child.line, ONLY_ONLY_IF, { text: clean });
  }
  return { kind: 'lang', phrase: CHOOSE_PLAYER, args: [at, guard, who, effect], line: node.line, text: normalizeLine(node.text) };
}
