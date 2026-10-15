import { readSpaceTable } from '../board';
import { RuleError } from '../diagnostics';
import type { PhraseLibrary } from '../phrases';
import { canon } from '../refs';
import type { BoardFn } from '../types';

const MIN_DICE = 1;
const MAX_DICE = 10;
const MIN_SIDES = 2;
const MAX_SIDES = 100;

/** A `{name}` arrives in lowercase; to show it back the way a space is usually written, each word gets a capital. */
const titled = (name: string): string => name.replace(/(^|\s)(\S)/g, (_, space: string, letter: string) => space + letter.toUpperCase());

const loop: BoardFn = ([name], table) => {
  if (!table) throw new RuleError('Add a table of spaces under this line.');
  const spaces = readSpaceTable(table);
  // The line says where the loop starts so that a reader of the rules does not have to open the table to know.
  if (canon(spaces[0].name) !== canon(name as string)) {
    throw new RuleError(`The first space in the table is “${spaces[0].name}”, but this line says the board starts at “${titled(name as string)}”.`);
  }
  return { kind: 'loop', spaces };
};

const pieces: BoardFn = ([space]) => ({ kind: 'pieces', start: space as number });

const counter: BoardFn = ([start, name, visibility]) => {
  if (visibility === 'secret') throw new RuleError('A number a player has can be seen by everyone or only by them.');
  return { kind: 'counter', counter: { name: name as string, start: start as number, visibility: visibility as 'public' | 'owner' } };
};

const payWith: BoardFn = ([name]) => ({ kind: 'pay-with', counter: name as string });

function diceOf(count: number, sides: number) {
  if (count < MIN_DICE || count > MAX_DICE || sides < MIN_SIDES || sides > MAX_SIDES) {
    throw new RuleError(`Dice need ${MIN_DICE} to ${MAX_DICE} dice of ${MIN_SIDES} to ${MAX_SIDES} sides.`);
  }
  return { kind: 'dice' as const, count, sides };
}

/** The sentences under Board: that say what the board is, who plays on it and what they roll and pay with. */
export function registerBoardPhrases(lib: PhraseLibrary): PhraseLibrary {
  return lib
    .board('the board is a loop of spaces, starting at {name}', loop)
    .board('each player has a piece that starts on {space}', pieces)
    .board('each player has {int} {name} that {visibility}', counter)
    .board('players pay with {counter}', payWith)
    .board('there are {count} {count}-sided dice', ([count, sides]) => diceOf(count as number, sides as number))
    .board('there is one {count}-sided die', ([sides]) => diceOf(1, sides as number));
}
