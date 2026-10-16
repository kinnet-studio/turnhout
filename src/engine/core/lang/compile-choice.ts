import { CHOOSE_ONE, CHOOSE_PLAYER, type ChoiceOption } from './choices';
import { addProblem, asksChoice, CHOICE_LINE, matchEffectLine, matchLine, rejectChildren, type LineCtx } from './compile-util';
// Each module uses the other's functions only while compiling, never while it loads, so the two may import each other.
import { readCondition } from './compile-phase';
import type { OutlineNode } from './outline';
import { normalizeLine } from './phrases';
import { canon, theyForm } from './refs';
import type { CondGroup, PhraseRef } from './types';

const ONLY_ONLY_IF = 'Under a choice, write only “Only if …” lines.';
const FEWER_THAN_TWO = 'Give “They choose one:” two or more options, each a line ending in “:” with its lines under it.';
const SAME_LABEL = (label: string) => `Two options here are both called “${label}”.`;
const LINES_THEN_OPTIONS = 'Under “They choose one:”, write its “Only if …” lines, then each option as a line ending in “:”.';
const NOTHING_UNDER = (label: string) => `Give the option “${label}” its lines under it.`;
/** A press asks each choice once, before any line runs, so a choice can't wait on which option another one comes to. */
const CHOICE_IN_CHOICE = 'A choice can\'t sit inside another choice.';
/** group 1 = an option's label: a line ending in a colon, without it, that is no `Only if one of:` block. */
const OPTION = /^(?!only if )(.+?)\s*:$/i;

/**
 * A `Then:` line that asks the presser to pick a player (`CHOICE_LINE`, found in it as `found`): “They pay the fee to another player of
 * their choice who has a card in their workshop whose mark is the card's wants.” `at` is its place among the button's choices.
 * - Its effect is read as “… to that player”, the player a press picked, so it can be any phrase that reads one.
 * - Its clause is read as a condition about “they”, judged about each player who might be picked.
 * - The `Only if` lines under it say when it is asked at all; any other line under it is reported.
 */
function readChoiceLine(node: OutlineNode, found: RegExpExecArray, at: number, ctx: LineCtx): PhraseRef {
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

/** One option of a block (`node`, labelled `label`): its `Only if` lines, wherever they are among its lines, and the lines it runs. */
function readOption(node: OutlineNode, label: string, ctx: LineCtx): ChoiceOption {
  const conditions: CondGroup[] = [];
  const effects: PhraseRef[] = [];
  for (const child of node.children) {
    const clean = normalizeLine(child.text);
    const group = readCondition(child, clean, ctx);
    if (group) {
      conditions.push(group);
    } else if (asksChoice(clean)) {
      addProblem(ctx.diagnostics, child.line, CHOICE_IN_CHOICE, { text: clean });
    } else {
      rejectChildren(child, ctx.diagnostics);
      effects.push(matchEffectLine(child.text, child.line, ctx));
    }
  }
  return { label, conditions, effects };
}

/**
 * A `Then:` block that asks the presser to choose one of its options (`CHOOSE_ONE_LINE`). `at` is its place among the button's choices.
 * - The `Only if` lines under it come first, and say when it is asked at all.
 * - Then each option: a line ending in “:”, its label, with its own `Only if` lines and the lines it runs under it. There must be two or
 *   more, with labels that differ in more than their case, and none with nothing under it.
 * - Any other line under it is reported, an `Only if` after an option among them: it could be meant for the block or for the option.
 *   So is a choice, under it or under one of its options.
 */
function readChoiceBlock(node: OutlineNode, at: number, ctx: LineCtx): PhraseRef {
  const text = normalizeLine(node.text);
  const guard: CondGroup[] = [];
  const options: ChoiceOption[] = [];
  for (const child of node.children) {
    const clean = normalizeLine(child.text);
    if (asksChoice(clean)) {
      addProblem(ctx.diagnostics, child.line, CHOICE_IN_CHOICE, { text: clean });
      continue;
    }
    const group = options.length === 0 ? readCondition(child, clean, ctx) : null;
    const label = group ? undefined : OPTION.exec(clean)?.[1];
    if (group) {
      guard.push(group);
    } else if (label !== undefined) {
      const taken = options.some((option) => canon(option.label) === canon(label));
      if (taken) addProblem(ctx.diagnostics, child.line, SAME_LABEL(label), { text: clean });
      if (child.children.length === 0) addProblem(ctx.diagnostics, child.line, NOTHING_UNDER(label), { text: clean });
      options.push(readOption(child, label, ctx));
    } else {
      addProblem(ctx.diagnostics, child.line, LINES_THEN_OPTIONS, { text: clean });
    }
  }
  if (options.length < 2) addProblem(ctx.diagnostics, node.line, FEWER_THAN_TWO, { text });
  return { kind: 'lang', phrase: CHOOSE_ONE, args: [at, guard, options], line: node.line, text };
}

/**
 * A `Then:` line that asks a choice of its own (`asksChoice`), as `clean`, read as what it asks: a choice of a player or a block of
 * options. `at` is its place among the button's choices.
 */
export function readChoice(node: OutlineNode, clean: string, at: number, ctx: LineCtx): PhraseRef {
  const found = CHOICE_LINE.exec(clean);
  return found ? readChoiceLine(node, found, at, ctx) : readChoiceBlock(node, at, ctx);
}
