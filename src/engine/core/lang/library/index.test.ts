import { describe, expect, it } from 'vitest';
import { fixtureColorGame, fixtureGame, vocabFor } from '../testing';
import type { PhraseKind } from '../types';
import { createDefaultLibrary } from './index';

const lib = createDefaultLibrary();

type Row = [kind: PhraseKind, text: string, pattern: string];

describe('the default library', () => {
  const hearts = vocabFor(fixtureGame(), 4);
  const colorMatch = vocabFor(fixtureColorGame(), 5);

  it.each<Row>([
    ['cards', 'A standard 52-card deck, aces high, starting in the deck.', 'a standard 52-card deck, aces high, starting in {zone}'],
    ['zone', 'Each player has a pass pile that only they can see.', 'each player has a {name} that {visibility}'],
    ['effect', 'Shuffle the deck.', 'shuffle {zone}'],
    ['effect', 'Deal 13 cards from the deck to each hand.', 'deal {int} cards from {zone} to {zone}'],
    ['condition', 'every pass pile has 3 cards', '{zone} has {int} card(s)'],
    ['condition', 'their pass pile has fewer than 3 cards', '{zone} has fewer than {int} cards'],
    ['condition', 'the trick has more than 3 cards', '{zone} has more than {int} card(s)'],
    ['effect', "Each pass pile goes to the hand of the player on its owner’s left.", "each {perzone} goes to the {perzone} of the player on its owner's left"],
    ['effect', 'The player holding the 2 of clubs goes first.', 'the player holding {card} goes first'],
    ['condition', 'they follow the led suit when they can', 'they follow the led suit when they can'],
    ['condition', 'the trick is not empty', '{zone} is not empty'],
    ['condition', 'the card is not a heart', 'the card is not {cardclass}'],
    ['condition', 'hearts are broken', 'hearts are broken'],
    ['condition', 'they hold only hearts', 'they hold only {cardclass}'],
    ['effect', 'hearts are broken', 'hearts are broken'],
    ['effect', 'The highest card of the led suit wins the trick.', 'the highest card of the led suit wins {zone}'],
    ['effect', "Move the trick to the winner's won pile.", 'move {zone} to {zone}'],
    ['effect', 'The winner goes next.', 'the winner goes next'],
    ['turn', 'the turn passes to the left', 'the turn passes to the left'],
    ['condition', 'every hand and the trick are empty', '{zones} are empty'],
    ['score', "Each heart in a player's won pile scores 1 point.", "each {cardclass} in a player's {perzone} scores {int} point(s)"],
    ['score', "The queen of spades in a player's won pile scores 13 points.", "{card} in a player's {perzone} scores {int} point(s)"],
    ['winner', 'The lowest score wins.', 'the lowest score wins'],
    ['winner', 'The highest score wins.', 'the highest score wins'],
  ])('reads a Hearts sentence exactly one way: %s “%s”', (kind, text, pattern) => {
    expect(lib.match(kind, text, hearts)).toEqual(expect.objectContaining({ status: 'ok', pattern }));
    expect(lib.get(kind, pattern)).toBeDefined();
  });

  it.each<Row>([
    ['effect', 'Shuffle the draw pile.', 'shuffle {zone}'],
    ['effect', 'Deal 7 cards from the draw pile to each hand.', 'deal {int} cards from {zone} to {zone}'],
    ['effect', 'Move the top card of the draw pile to the discard pile.', 'move the top card of {zone} to {zone}'],
    ['condition', 'the card has the same color as the top card of the discard pile', 'the card has the same {attribute} as the top card of {zone}'],
    ['condition', 'the card has the same number as the top card of the discard pile', 'the card has the same {attribute} as the top card of {zone}'],
    ['condition', 'they have no card they could play', 'they have no card they could play'],
    ['condition', 'the draw pile is empty', '{zone} is empty'],
    ['effect', 'Shuffle the discard pile, except its top card, into the draw pile.', 'shuffle {zone}, except its top card, into {zone}'],
    ['condition', "a player's hand is empty", "a player's {perzone} is empty"],
    ['winner', 'The player with an empty hand wins.', 'the player with an empty {perzone} wins'],
    ['condition', 'the card is red', 'the card is {cardclass}'],
    ['condition', 'they hold only red cards', 'they hold only {cardclass}'],
  ])('reads a Color Match sentence exactly one way: %s “%s”', (kind, text, pattern) => {
    expect(lib.match(kind, text, colorMatch)).toEqual(expect.objectContaining({ status: 'ok', pattern }));
  });
});
