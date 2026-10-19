// Test fixtures for the phrase library, the table layout and games run on the engine. Pure: no DOM, no clock.
import type { GameState } from '../game-state';
import { resolveDrop } from '../hittest';
import { computeZoneLayout } from '../layout';
import { makeRng } from '../rng';
import { RuleRegistry } from '../rules';
import type { CardState, PlayerId } from '../scene';
import type { Json, ZoneDef } from '../table-def';
import { placeZone } from '../zone-geometry';
import { withBoardData } from './board-state';
import { standardDeckIdentities, textFaceKey } from './cards';
import { vocabFrom, type PhraseLibrary } from './phrases';
import type {
  CompiledGame, CompiledPhase, DeclaredMove, MoveInfo, PhraseEnv, PhraseKind, SpaceSpec, Subject, Vocab, ZoneRef, ZoneSpec,
} from './types';

const FIXTURE_ZONES: ZoneSpec[] = [
  { name: 'deck', perPlayer: false, layout: 'pile', visibility: 'secret' },
  { name: 'trick', perPlayer: false, layout: 'row', visibility: 'public' },
  { name: 'discard pile', perPlayer: false, layout: 'pile', visibility: 'public' },
  { name: 'hand', perPlayer: true, layout: 'hand', visibility: 'owner' },
  { name: 'pass pile', perPlayer: true, layout: 'pile', visibility: 'owner' },
  { name: 'won pile', perPlayer: true, layout: 'pile', visibility: 'public' },
];

/** A Hearts-shaped table: standard deck (aces high) in the deck, no phases. */
export function fixtureGame(over: Partial<CompiledGame> = {}): CompiledGame {
  return {
    name: 'Fixture',
    players: { min: 2, max: 4 },
    zones: FIXTURE_ZONES.map((z) => ({ ...z })),
    cards: [{ kind: 'standard', identities: standardDeckIdentities(), start: 'deck', acesHigh: true }],
    setup: [], phases: [], end: null, examples: [], board: null, facts: [], columns: {}, says: {},
    everyPhase: { triggers: [], roundStarts: [], turnStarts: [] },
    ...over,
  };
}

const colorIdentity = (color: string, number: number) => ({ attrs: { color, number }, faceKey: textFaceKey({ color, number }) });

/** A Color Match-shaped table: a custom deck of colored, numbered cards in a draw pile, a discard pile, and hands. */
export function fixtureColorGame(over: Partial<CompiledGame> = {}): CompiledGame {
  return fixtureGame({
    name: 'Color Fixture',
    zones: [
      { name: 'draw pile', perPlayer: false, layout: 'pile', visibility: 'secret' },
      { name: 'discard pile', perPlayer: false, layout: 'pile', visibility: 'public' },
      { name: 'hand', perPlayer: true, layout: 'hand', visibility: 'owner' },
    ],
    cards: [{
      kind: 'table', start: 'draw pile', acesHigh: false,
      identities: [colorIdentity('red', 2), colorIdentity('red', 7), colorIdentity('blue', 3), colorIdentity('blue', 7)],
    }],
    ...over,
  });
}

/**
 * A small two-player trick game written the way a designer would, used to run compiled rules on the engine.
 * `When the middle has 2 cards:` is line 27, `If the card is a spade, shuffle the deck.` is line 25 and the
 * `After a player …` line is line 31.
 */
export const TEST_DUEL = [
  'Game: Test Duel',
  'Players: 2',
  '',
  'Cards:',
  '  A standard 52-card deck, aces high, starting in the deck.',
  '',
  'Table:',
  '  The deck is a pile in the center that no one can see.',
  '  The middle is a row in the center that everyone can see.',
  '  Each player has a hand that only they can see.',
  '  Each player has a won pile that everyone can see.',
  '',
  'Setup:',
  '  Deal 3 cards from the deck to each hand.',
  '',
  'Phase: play',
  '  Players take turns.',
  '  Players may rearrange their hand at any time.',
  '  A player may play a card from their hand to the middle.',
  '    Only if the card is not a heart.',
  '    Only if one of:',
  '      the middle is empty',
  '      they follow the led suit when they can',
  '    Then:',
  '      If the card is a spade, shuffle the deck.',
  '  A player may draw a card from the deck to their hand.',
  '  When the middle has 2 cards:',
  '    The highest card of the led suit wins the middle.',
  "    Move the middle to the winner's won pile.",
  '    The winner goes next.',
  '  After a player plays or draws, the turn passes to the left.',
  '',
  'End:',
  "  The game ends when a player's hand is empty.",
  '  The player with an empty hand wins.',
].join('\n');

/**
 * A board game written the way a designer would, down to its first phase line: four spaces, a piece, a counter that
 * pays for things and two dice. Line 4 is `Board:` and the last line is `  Players take turns.`; rules go below it.
 */
export const TINY_BOARD_HEAD = [
  'Game: Tiny Board', 'Players: 2 to 4', '', 'Board:',
  '  The board is a loop of spaces, starting at Go:',
  '    | space      | kind   | color  | price | rent | tax |',
  '    | Go         | go     |        |       |      |     |',
  '    | Mill Lane  | street | brown  | 60    | 2    |     |',
  '    | Income Tax | tax    |        |       |      | 200 |',
  '    | Rose Lane  | street | orange | 180   | 14   |     |',
  '  Each player has a piece that starts on Go.',
  '  Each player has 1500 money that everyone can see.',
  '  Players pay with money.',
  '  There are two six-sided dice.',
  '', 'Phase: playing', '  Players take turns.',
].join('\n');

/**
 * TINY_BOARD_HEAD played to the end: rolling, buying and ending a turn, collecting on Go, rent, tax and going out.
 * `When a player lands on a tax space:` is line 37 and `When a player has less than 0 money:` is line 39.
 */
export const TINY_BOARD = [
  TINY_BOARD_HEAD,
  '  A player may roll the dice.',
  '    Only if they have not rolled this turn.',
  '    Then:',
  '      Roll the dice.',
  '      Their piece moves forward by the roll.',
  '  A player may buy the space they are on.',
  '    Only if they have rolled this turn.',
  '    Only if it has a price.',
  '    Only if no one owns it.',
  '    Only if they have at least its price in money.',
  '    Then:',
  '      They pay its price.',
  '      They own it.',
  '  A player may end their turn.',
  '    Only if they have rolled this turn.',
  '  When a piece passes Go:',
  '    Its player gets 200 money.',
  '  When a player lands on a street someone else owns:',
  '    They pay its rent to its owner.',
  '  When a player lands on a tax space:',
  '    They pay its tax.',
  '  When a player has less than 0 money:',
  '    They are out.',
  '    Their spaces go back to the bank.',
  '  After a player ends their turn, the turn passes to the left.',
  '',
  'End:',
  '  The game ends when one player is left.',
  '  That player wins.',
].join('\n');

/**
 * TINY_BOARD_HEAD with two buttons any player may press: waving gets 5 money, and planting a flag on a street they own pays 10
 * while they have at least 10. Nothing puts a player out, so a player below 0 stays in. Rose Lane is space 3 and charges 14.
 * The anyone buttons are on lines 25 and 28, and the After line is line 34.
 */
export const ANY_PLAYER_BOARD = [
  TINY_BOARD_HEAD,
  '  A player may roll the dice.', '    Only if they have not rolled this turn.', '    Then:', '      Roll the dice.',
  '      Their piece moves forward by the roll.',
  '  A player may end their turn.', '    Only if they have rolled this turn.',
  '  Any player may wave.', '    Then:', '      They get 5 money.',
  '  Any player may plant a flag on a street they own.', '    Only if they have at least 10 money.', '    Then:', '      They pay 10.',
  '  When a player lands on a street someone else owns:', '    They pay its rent to its owner.',
  '  After a player ends their turn, the turn passes to the left.',
  '', 'End:', '  The game ends when one player is left.', '  That player wins.',
].join('\n');

/**
 * TINY_BOARD_HEAD with a pot the game keeps and a button that carries an amount: after rolling, a player may raise the pot to more
 * than it is, as long as they have that much, and ending the turn pays the pot to the bank and empties it. Line 15 declares the
 * pot; `A player may raise an amount.` is line 24 and `A player may end their turn.` line 30.
 */
export const AMOUNT_BOARD = [
  TINY_BOARD_HEAD.replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  The game has a pot of 0.'),
  '  A player may roll the dice.', '    Only if they have not rolled this turn.', '    Then:', '      Roll the dice.',
  '      Their piece moves forward by the roll.',
  '  A player may raise an amount.', '    Only if they have rolled this turn.', '    Only if the amount is more than the pot.',
  '    Only if they have at least the amount in money.', '    Then:', '      The pot is the amount.',
  '  A player may end their turn.', '    Only if they have rolled this turn.', '    Then:', '      They pay the pot.', '      The pot is 0.',
  '  After a player ends their turn, the turn passes to the left.',
  '', 'End:', '  The game ends when one player is left.', '  That player wins.',
].join('\n');

/**
 * TINY_BOARD_HEAD with a button that picks another player: after rolling, a player may challenge another player, who becomes
 * the rival. Line 15 declares the rival, `A player may challenge another player.` is line 24 and `A player may end their turn.`
 * line 28.
 */
export const PICK_BOARD = [
  TINY_BOARD_HEAD.replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  Players can be the rival.'),
  '  A player may roll the dice.', '    Only if they have not rolled this turn.', '    Then:', '      Roll the dice.',
  '      Their piece moves forward by the roll.',
  '  A player may challenge another player.', '    Only if they have rolled this turn.', '    Then:', '      That player is the rival.',
  '  A player may end their turn.', '    Only if they have rolled this turn.',
  '  After a player ends their turn, the turn passes to the left.',
  '', 'End:', '  The game ends when one player is left.', '  That player wins.',
].join('\n');

/**
 * TINY_BOARD_HEAD with a vote that interrupts the turn. After rolling, a player may call one: the vote phase starts with the player
 * on their left, and its start line makes every player voting. Voters abstain in turn, the turn skipping players who are not
 * voting; once no player is, play goes back to the caller's turn. Closing the vote goes back at once, and the After line names it.
 * `Phase: vote` is line 32.
 */
export const INTERRUPT_BOARD = [
  TINY_BOARD_HEAD.replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  Players can be voting.'),
  '  A player may roll the dice.', '    Only if they have not rolled this turn.', '    Then:', '      Roll the dice.',
  '      Their piece moves forward by the roll.',
  '  A player may call a vote.', '    Only if they have rolled this turn.', '    Then:', '      The vote phase starts with the player on their left.',
  '  A player may end their turn.', '    Only if they have rolled this turn.',
  '  After a player ends their turn, the turn passes to the left.',
  '', 'Phase: vote', '  Hint: Abstain, or close the vote.', '  When this phase starts:', '    Every player is voting.',
  '  A player may abstain.', '    Only if they are voting.', '    Then:', '      They are not voting.',
  '  A player may close the vote.', '    Then:', '      No player is voting.', '      Go back to the interrupted turn.',
  '  When no player is voting:', '    Go back to the interrupted turn.',
  '  After a player abstains or closes the vote, the turn passes to the next player on the left who is voting.',
  '', 'End:', '  The game ends when one player is left.', '  That player wins.',
].join('\n');

/**
 * TINY_BOARD_HEAD with a flag a button sets on a space it picks without “on”: a player may mark a space they own that is not
 * marked yet. Line 15 declares the flag, `A player may mark a space they own.` is line 19 and `A player may end their turn.`
 * line 23.
 */
export const MARK_BOARD = [
  TINY_BOARD_HEAD.replace('  There are two six-sided dice.', '  There are two six-sided dice.\n  Spaces can be marked.'),
  '  A player may mark a space they own.', '    Only if it is not marked.', '    Then:', '      It is marked.',
  '  A player may end their turn.',
  '  After a player ends their turn, the turn passes to the left.',
  '', 'End:', '  The game ends when one player is left.', '  That player wins.',
].join('\n');

/**
 * A board game whose two decks say what their cards do. `lucky` and `fate` are the tables under each deck line, header row
 * first; `rules` are lines under `Phase: playing`, indented as written there. Lines: the lucky table starts on line 6 (its
 * first card on line 7); the fate deck line is line 6 + lucky.length and its first card line 8 + lucky.length. The loop is
 * Go 0, Mill Lane 1, Lucky 2, North Station 3, Rose Lane 4, Lucky 5, Fate 6, Power Works 7.
 */
export function deckGameText(lucky: string[], fate: string[], rules: string[] = []): string {
  return [
    'Game: Deck Board', 'Players: 2 to 4', '', 'Cards:',
    '  A deck called lucky cards, starting in the lucky pile:', ...lucky.map((row) => `    ${row}`),
    '  A deck called fate cards, starting in the fate pile:', ...fate.map((row) => `    ${row}`),
    '', 'Table:',
    '  The lucky pile is a pile in the center that no one can see.',
    '  The fate pile is a pile in the center that no one can see.',
    '  Each player has a kept cards row that everyone can see.',
    '', 'Board:',
    '  The board is a loop of spaces, starting at Go:',
    '    | space         | kind    | color  | price | rent |',
    '    | Go            | go      |        |       |      |',
    '    | Mill Lane     | street  | brown  | 60    | 2    |',
    '    | Lucky         | lucky   |        |       |      |',
    '    | North Station | station |        | 200   | 25   |',
    '    | Rose Lane     | street  | orange | 180   | 14   |',
    '    | Lucky         | lucky   |        |       |      |',
    '    | Fate          | fate    |        |       |      |',
    '    | Power Works   | utility |        | 150   | 10   |',
    '  Each player has a piece that starts on Go.',
    '  Each player has 1500 money that everyone can see.',
    '  Players pay with money.',
    '  There are two six-sided dice.',
    '  Spaces can have houses and a hotel.',
    '  The bank has 32 houses and 12 hotels.',
    '', 'Phase: playing', '  Players take turns.',
    '  A player may roll the dice.', '    Only if they have not rolled this turn.', '    Then:', '      Roll the dice.',
    '      Their piece moves forward by the roll.',
    '  A player may end their turn.', '    Only if they have rolled this turn.',
    '  When a piece passes Go:', '    Its player gets 200 money.',
    '  When a player lands on a space someone else owns:', '    They pay its rent to its owner.',
    '  When a player has less than 0 money:', '    They are out.', '    Their spaces go back to the bank.',
    '  When a player lands on a lucky space:', '    They draw from the lucky pile and do what it says.',
    '  When a player lands on a fate space:', '    They draw from the fate pile and do what it says.',
    ...rules,
    '  After a player ends their turn, the turn passes to the left.',
    '', 'End:', '  The game ends when one player is left.', '  That player wins.',
  ].join('\n');
}

/**
 * deckGameText with a lucky card players keep (Pass), a flag cards can have (lent), and two flags players can have (leading, the
 * rival). Its one new button runs two lines about the players who hold them: lending flags every card the leader keeps, and the
 * rival gets 5 money.
 */
export const HOLDING_BOARD = deckGameText(
  ['| name | says |', '| Pass | They keep this card in their kept cards. |'], ['| name | says |', '| Calm | They get 0 money. |'],
  [
    '  A player may lend.', '    Then:',
    '      For the player who is leading, every card in their kept cards is lent.', '      For the rival, they get 5 money.',
  ],
).replace('  The bank has 32 houses and 12 hotels.', '  The bank has 32 houses and 12 hotels.\n  Cards can be lent.\n  Players can be leading.\n  Players can be the rival.');

/**
 * A card game with a number each player has and no board, its lines indented under Players:. Players buy gems from a shop row
 * for 1 coin, or pass. `Players: 2 to 3` is line 2, `A player may buy a card from the shop to their stash.` line 22, `They pay 1.`
 * line 24 and `A player may pass.` line 25.
 */
export const COUNTER_GAME = [
  'Game: Gem Shop', 'Players: 2 to 3', '  Each player has 7 coins that everyone can see.', '  Players pay with coins.', '',
  'Cards:', '  A deck called gems, starting in the pile:', '    | name | cost | copies |', '    | Ruby | 3    | 4      |', '    | Opal | 1    | 4      |', '',
  'Table:', '  The pile is a pile in the center that no one can see.', '  The shop is a row in the center that everyone can see.',
  '  Each player has a stash row that only they can see.', '',
  'Setup:', '  Deal 2 cards from the pile to the shop.', '',
  'Phase: shopping', '  Players take turns.', '  A player may buy a card from the shop to their stash.', '    Then:', '      They pay 1.',
  '  A player may pass.', '  After a player buys or passes, the turn passes to the left.', '',
  'End:', '  The game ends when the pile is empty.', '  The highest score wins.',
].join('\n');

/**
 * A card game whose buttons pick cards. Buying one from the shop costs a move and its cost in coins; selling one from your stash
 * is free and gives a coin. Showing one moves it from your stash to your case, onto a card there that is no Ruby, for a move; trading
 * moves at most 2 cards from your stash to the shop, for a move. Each player has 2 moves each turn, and the turn passes once they
 * have none.
 */
export const CARD_PICK_GAME = [
  'Game: Gem Picks', 'Players: 2 to 3', '  Each player has 7 coins that everyone can see.', '  Each player has 2 moves each turn.',
  '  Players pay with coins.', '',
  'Cards:', '  A deck called gems, starting in the pile:', '    | name | cost | copies |', '    | Ruby | 3    | 4      |', '    | Opal | 1    | 4      |', '',
  'Table:', '  The pile is a pile in the center that no one can see.', '  The shop is a row in the center that everyone can see.',
  '  Each player has a stash row that only they can see.', '  Each player has a case row that everyone can see.', '',
  'Setup:', '  Deal 2 cards from the pile to the shop.', '',
  'Phase: shopping', '  Players take turns.',
  '  A player may buy a card from the shop to their stash.', '    It costs 1 move.', "    Only if they have at least the card's cost in coins.",
  '    Then:', "      They pay the card's cost.",
  '  A player may sell a card in their stash.', '    Then:', '      Move it to the pile.', '      They get 1 coin.',
  '  A player may show a card from their stash to a card in their case.', '    It costs 1 move.', '    Only if the target card is not a Ruby.',
  '    Then:', '      Move it to their case.',
  '  A player may trade some cards from their stash to the shop.', '    It costs 1 move.', '    Only if they picked at most 2 cards.',
  '  A player may stop.', '    Then:', '      Their moves go back to 0.',
  '  When they have less than 1 move:', '    The turn passes to the left.', '',
  'End:', '  The game ends when the pile is empty.', '  The highest score wins.',
].join('\n');

/**
 * A card game whose turn is a run of steps, written the way a designer would. Each player has 2 moves each turn, and a start player
 * is chosen at random. Working and taking a card each spend a move; once a player has none left the turn goes to tidying, whose
 * start line gives them a coin, and once their list has fewer than 2 cards the turn passes to the left with no press.
 */
export const TURN_GAME = [
  'Game: Chores', 'Players: 2 to 4', '  Each player has 0 coins that everyone can see.', '  Each player has 2 moves each turn.',
  '  Players pay with coins.', '',
  'Cards:', '  A deck called chores, starting in the pile:', '    | name  | copies |', '    | Sweep | 6      |', '    | Dust  | 6      |', '',
  'Table:', '  The pile is a pile in the center that no one can see.', '  The done pile is a pile in the center that everyone can see.',
  '  Each player has a list row that only they can see.', '',
  'Setup:', '  The start player is chosen at random.', '',
  'Phase: working', '  Players take turns.',
  '  A player may work.', '    Only if they have at least 1 move.', '    Then:', '      They spend 1 move.', '      They get 1 coin.',
  '  A player may take a card from the pile to their list.', '    Only if they have at least 1 move.', '    Then:', '      They spend 1 move.',
  '  A player may stop.', '    Then:', '      Their moves go back to 0.',
  '  When they have less than 1 move, go to tidying.', '',
  'Phase: tidying', '  When this phase starts:', '    They get 1 coin.',
  '  A player may finish a card from their list to the done pile.', '    Only if their list has more than 1 card.',
  '  When their list has fewer than 2 cards:', '    The turn passes to the left.', '',
  'End:', '  The game ends when the pile is empty.', '  The highest score wins.',
].join('\n');

/**
 * TURN_GAME with rules for every phase: a round starts by moving the top card of the pile to the done pile, each turn starts with
 * a coin for the player whose turn it is, and a done pile of more than 2 cards goes back to the pile. `In every phase:` is line
 * 21, `When a round starts:` line 22, `When a player's turn starts:` line 24, the done pile rule line 26 and `Phase: working` line 29.
 */
export const ROUNDS_GAME = TURN_GAME.replace('Phase: working', [
  'In every phase:',
  '  When a round starts:',
  '    Move the top card of the pile to the done pile.',
  "  When a player's turn starts:",
  '    They get 1 coin.',
  '  When the done pile has more than 2 cards:',
  '    Move the done pile to the pile.',
  '',
  'Phase: working',
].join('\n'));

/**
 * ROUNDS_GAME whose End waits for the round once the done pile has a card, and gives each player a final count before the score, in turn
 * from the start player: its start line gives them 1 coin, and they pass it on by counting (2 coins more), or at once with 6 coins or
 * more. Coins score 1 point for every 2.
 */
export const STEPS_GAME = [
  ROUNDS_GAME.replace('  The game ends when the pile is empty.\n  The highest score wins.', [
    '  The game ends when the done pile is not empty and the round is finished.',
    '  Before the score, each player has the final count, in turn from the start player.',
    '  Each player scores 1 point for every 2 coins.', '  The highest score wins, and tied players share the win.'].join('\n')), '',
  'Phase: final count', '  Players take turns.', '  When this phase starts:', '    They get 1 coin.',
  '  A player may count.', '    Then:', '      They get 2 coins.', '      The final count passes to the left.',
  '  When they have at least 6 coins:', '    The final count passes to the left.',
].join('\n');

/**
 * A card game whose workers sit on the jobs they work on. Players start jobs from their stash in their workshop, hire workers
 * from the hall onto a job, shift a worker to another job and finish a job, which sends its crew to the idle row. Every card in a
 * crew sits on a job.
 */
export const CREW_GAME = [
  'Game: Crew', 'Players: 2 to 3', '  Each player has 9 coins that everyone can see.', '  Each player has 3 moves each turn.',
  '  Players pay with coins.', '',
  'Cards:', '  A deck called jobs, starting in the pile:',
  '    | name   | red need | gold need | pay | worth | copies |', '    | Vase   | 2        | 0         | 1   | 3     | 2      |',
  '    | Statue | 1        | 2         | 2   | 4     | 2      |',
  '  A deck called hands, starting in the hall:',
  '    | name   | craft | skill | wage | copies |', '    | Potter | red   | 1     | 1    | 3      |',
  '    | Smith  | gold  | 2     | 2    | 2      |', '    | Tinker | mixed | 1     | 0    | 2      |',
  '  Cards can be tired.', '',
  'Table:', '  The pile is a pile in the center that no one can see.', '  The hall is a row in the center that everyone can see.',
  '  The scrap is a row in the center that everyone can see.', '  Each player has a stash row that only they can see.',
  '  Each player has a workshop row that everyone can see.',
  '  Each player has a crew row that everyone can see, where every card is on a card.',
  '  Each player has an idle row that everyone can see.', '',
  'Setup:', '  Deal 2 cards from the pile to each stash.', '',
  'Phase: working', '  Players take turns.',
  '  A player may start a card in their stash.', '    Then:', '      Move it to their workshop.',
  '  A player may hire some cards from the hall to a card in their workshop.', '    It costs 1 move.', '    Then:',
  '      The picked cards go to their crew, on the target card.',
  '  A player may shift a card from their crew to a card in their workshop.', '    It costs 1 move.',
  '    Only if it is not on the target card.', '    Then:', '      It goes to their crew, on the target card.',
  '  A player may finish a card in their workshop.', '    It costs 1 move.', '    Then:',
  '      Every card on it is tired.', '      Every card on it goes to their idle.', '      Move it to the scrap.',
  '  A player may stop.', '    Then:', '      Their moves go back to 0.',
  '  When they have less than 1 move:', '    The turn passes to the left.', '',
  'End:', '  The game ends when the scrap has more than 3 cards.', '  The highest score wins.',
].join('\n');

/**
 * CREW_GAME with the numbers a job's crew works up to, and values worked out for cards from them: what a hand puts into red and gold
 * work, a Tinker's wage, and whether a job is done.
 */
export const WORKED_GAME = [
  CREW_GAME.replace('  Cards can be tired.', '  Cards can be tired.\n  Cards can have red done, gold done, new red and new gold.'), '',
  'Red work:', "  A red card's red work is its skill.", "  A mixed card's red work is its skill.", "  A tired card's red work is 0.", '',
  'Gold work:', "  A gold card's gold work is its skill.", "  A mixed card's gold work is its skill.", "  A tired card's gold work is 0.", '',
  'Wage:', "  A Tinker card's wage is 1.", '',
  'Done:', '  Only if its red done are at least its red need.', '  Only if its gold done are at least its gold need.',
].join('\n');

/** WORKED_GAME with two values about each player: the red work of the hands in their crew, and the red need of the jobs in their workshop. */
export const FORCE_GAME = [
  WORKED_GAME, '',
  'Red force:', "  A player's red force is the total red work of the cards in their crew.", '',
  'Red load:', "  A player's red load is the total red need of the cards in their workshop.",
].join('\n');

/** FORCE_GAME where a job can be resting, and a player's red load counts only the jobs in their workshop that are not resting. */
export const RESTING_GAME = FORCE_GAME
  .replace('  Cards can be tired.', '  Cards can be tired.\n  Cards can be resting.')
  .replace('red need of the cards in their workshop.', 'red need of the cards in their workshop that are not resting.');

/** RESTING_GAME where stopping waits on a player's red force reaching their red load. */
export const GAUGED_GAME = RESTING_GAME.replace('  A player may stop.', '  A player may stop.\n    Only if their red force is at least their red load.');

/**
 * FORCE_GAME where jobs gather cracks, a player's mend is the skill of the hands in their idle, and a job's worth goes up with the skill
 * of the hands on it and down with its cracks, never below 0. A tired hand's rest work is its skill.
 */
export const MEND_GAME = [
  FORCE_GAME.replace('new red and new gold.', 'new red, new gold and cracks.'), '',
  'Mend:', "  A player's mend is the total skill of the cards in their idle.", '',
  'Worth:', "  A card's worth goes up by the total skill of the cards on it.", "  A card's worth goes down by its cracks.",
  "  A card's worth is at least 0.", '',
  'Rest work:', "  A tired card's rest work is its skill.",
].join('\n');

/** CREW_GAME where a Smith that joins a job in a workshop leaves a dent in it, whatever the phase. */
export const JOIN_GAME = CREW_GAME
  .replace('  Cards can be tired.', '  Cards can be tired.\n  Cards can have dents.')
  .replace('Phase: working', ['In every phase:', '  When a Smith card joins a card in a workshop:', '    The card it joins gains 1 dent.', '',
    'Phase: working'].join('\n'));

/**
 * CREW_GAME with a shelf of finished jobs and a yard where some hands sit on a job on the shelf: a Smith clings to its job. Posting hands
 * to a shelved job puts a clinging one on it and the rest in the yard; shipping a job to the shelf takes its clinging crew along, on it,
 * and the rest to the yard; a clinging hand transfers to another shelved job.
 */
export const YARD_GAME = CREW_GAME
  .replace('  Each player has an idle row that everyone can see.', ['  Each player has an idle row that everyone can see.',
    '  Each player has a shelf row that everyone can see.',
    '  Each player has a yard row that everyone can see, where some cards are on cards in their shelf.'].join('\n'))
  .replace('  A player may stop.', [
    '  A player may post some cards from the hall to a card in their shelf.', '    Then:',
    '      The picked cards that are clinging go to their yard, on the target card.',
    '      The picked cards that are not clinging go to their yard.',
    '  A player may post some cards from the hall to their yard.', '    Only if no picked card is clinging.',
    '  A player may ship a card from their workshop to their shelf.', '    It costs 1 move.', '    Then:',
    '      Every card on it that is clinging goes to their yard, staying on it.',
    '      Every card on it that is not clinging goes to their yard.',
    '  A player may transfer a card from their yard to a card in their shelf.', '    Only if it is on a card.',
    '    Only if it is not on the target card.', '    Then:', '      It goes to their yard, on the target card.',
    '  A player may stop.'].join('\n'))
  + '\n\nClinging:\n  Only if it is a Smith card.';

/**
 * YARD_GAME with a second hire, of hands from the hall onto a job on the shelf, where they sit in the yard. Both hires take hands from the
 * hall, so an example that names the job they go to means the hire whose zone holds that job.
 */
export const TWO_HIRES_GAME = YARD_GAME.replace('  A player may stop.', [
  '  A player may hire some cards from the hall to a card in their shelf.', '    It costs 1 move.', '    Then:',
  '      The picked cards go to their yard, on the target card.', '  A player may stop.',
].join('\n'));

/** WORKED_GAME with a job's crew red: the red work of the cards on it, added up. */
export const TOTALS_GAME = [WORKED_GAME, '', 'Crew red:', "  A card's crew red is the total red work of the cards on it."].join('\n');

/** WORKED_GAME with counts: the cards on a job, the hands in a player's crew, the kinds of craft among their hands, and a gold hand. */
export const COUNT_GAME = [
  WORKED_GAME, '',
  'Crew size:', "  A card's crew size is the number of the cards on it.", '',
  'Hands at work:', "  A player's hands at work is the number of the cards in their crew.", '',
  'Craft kinds:', "  A player's craft kinds is the number of different craft values among the cards in their crew and their idle.", '',
  'Gilded:', '  Only if it is a card whose craft is gold.',
].join('\n');

/**
 * WORKED_GAME where a gold hand on a job boosts it: a job's team red is the red work of the cards on it, plus its boosters (gold hands
 * on it) times its red makers (cards on it that make red); a card's polish is its pay plus its worth; a card is guarded while its owner
 * has a tired card in their idle; a card is high while the card it is on is a Statue.
 */
export const BOOST_GAME = [
  WORKED_GAME, '',
  'Boosters:', "  A card's boosters is the number of the cards on it whose craft is gold.", '',
  'Red makers:', "  A card's red makers is the number of the cards on it whose red work is more than 0.", '',
  'Team red:', "  A card's team red is the total red work of the cards on it.", "  A card's team red goes up by its boosters times its red makers.", '',
  'Polish:', "  A card's polish is its pay.", "  A card's polish goes up by its worth.", '',
  'Guarded:', '  Only if its owner has a card in their idle that is tired.', '',
  'High:', '  Only if the card it is on is a Statue card.',
].join('\n');

/**
 * CREW_GAME with a cut a job's red need can be given, and values worked out from what kind of card each is and what is on it: the red a
 * job has left once its cut is taken off, whether a hand is working (a red one that is not tired), and whether a job is busy (some card
 * on it is working).
 */
export const SUBJECT = [
  CREW_GAME.replace('  Cards can be tired.', '  Cards can be tired.\n  Cards can have red cut.'), '',
  'Red left:', "  A card's red left is its red need.", "  A card's red left goes down by its red cut.", '',
  'Working:', '  Only if it is a red card.', '  Only if it is not tired.', '',
  'Busy:', '  Only if some card on it is working.',
].join('\n');

/**
 * CREW_GAME with a count of red done read against a job's red need, and what the rules work out from them: a job's red left (its red
 * need less its cut red done), whether a hand is working and a job busy, and a red pay that a busy job's flag turns on.
 */
export const SHOWN = [
  CREW_GAME.replace('  Cards can be tired.', '  Cards can be tired.\n  Cards can have red done and cut red done.'), '',
  'Red left:', "  A card's red left is its red need.", "  A card's red left goes down by its cut red done.", '',
  'Working:', '  Only if it is a red card.', '  Only if it is not tired.', '',
  'Busy:', '  Only if some card on it is working.', '',
  'Red pay:', "  A busy card's red pay is 1.",
].join('\n');

/**
 * A card game of jobs that want a mark another job makes. Players start jobs from their stash in their workshop, hire hands from the
 * hall onto a job, and finish a job, which sends a grumpy hand to the scrap and the rest back to the hall. A job opened from the stash
 * needs the mark it wants made in some workshop, and a player who makes none pays the fee to a player of their choice who does. A Vase
 * or Bowl wants no mark and a Tower makes none. A job in a workshop other than a Tower can be trimmed in one of three ways, as its sizes
 * allow: 2 red, 2 gold, or 1 of each.
 */
export const GUILD_GAME = [
  'Game: Guild', 'Players: 2 to 4', '  Each player has 9 coins that everyone can see.', '  Each player has 2 moves each turn.',
  '  Players pay with coins.', '  The game has a fee of 2.', '',
  'Cards:', '  A deck called jobs, starting in the pile:',
  '    | name   | mark  | wants | red size | gold size | copies |', '    | Vase   | clay  |       | 3        | 0         | 2      |',
  '    | Bowl   | clay  |       | 1        | 1         | 2      |', '    | Statue | stone | clay  | 2        | 4         | 2      |',
  '    | Tower  |       | stone | 0        | 5         | 2      |',
  '  A deck called hands, starting in the hall:', '    | name   | craft | mood   | copies |', '    | Potter | red   | calm   | 2      |',
  '    | Smith  | gold  | grumpy | 1      |',
  '  Cards can have red trim and gold trim.', '',
  'Table:', '  The pile is a pile in the center that no one can see.', '  The hall is a row in the center that everyone can see.',
  '  The scrap is a row in the center that everyone can see.', '  Each player has a stash row that only they can see.',
  '  Each player has a workshop row that everyone can see.',
  '  Each player has a crew row that everyone can see, where every card is on a card.', '',
  'Setup:', '  Deal 2 cards from the pile to each stash.', '',
  'Phase: working', '  Players take turns.',
  '  A player may start a card in their stash.', '    Then:', '      Move it to their workshop.',
  '  A player may hire a card from the hall to a card in their workshop.', '    Then:', '      It goes to their crew, on the target card.',
  '  A player may finish a card in their workshop.', '    Then:', '      Every card on it whose mood is grumpy goes to the scrap.',
  '      Every card on it goes to the hall.', '      Move it to the scrap.',
  '  A player may open a card in their stash.', '    Only if one of:', '      The card has no wants.',
  "      Some player has a card in their workshop whose mark is the card's wants.", '    Then:',
  "      They pay the fee to another player of their choice who has a card in their workshop whose mark is the card's wants.",
  "        Only if they have no card in their workshop whose mark is the card's wants.", '      Move it to their workshop.',
  '  A player may trim a card in their workshop.', '    Then:', '      They choose one:', '        Only if it is not a Tower card.',
  '        Trim 2 red:', '          Only if its red size is more than 1.', '          It gains 2 red trim.',
  '        Trim 2 gold:', '          Only if its gold size is more than 1.', '          It gains 2 gold trim.',
  '        Trim 1 of each:', '          Only if its red size is more than 0.', '          Only if its gold size is more than 0.',
  '          It gains 1 red trim.', '          It gains 1 gold trim.',
  '  A player may stop.', '    Then:', '      Their moves go back to 0.',
  '  When they have less than 1 move:', '    The turn passes to the left.', '',
  'End:', '  The game ends when the pile is empty.', '  The highest score wins.',
].join('\n');

/** The loop of the board fixtures: a start, two streets, a tax, a station, a utility and two chance spaces. */
export const FIXTURE_SPACES: SpaceSpec[] = [
  { name: 'Go', attrs: { kind: 'go' } },
  { name: 'Mill Lane', attrs: { kind: 'street', color: 'brown', price: 60, rent: 2 } },
  { name: 'Income Tax', attrs: { kind: 'tax', tax: 200 } },
  { name: 'North Station', attrs: { kind: 'station', price: 200, rent: 25 } },
  { name: 'Chance', attrs: { kind: 'chance' } },
  { name: 'Rose Lane', attrs: { kind: 'street', color: 'orange', price: 180, rent: 14 } },
  { name: 'Power Works', attrs: { kind: 'utility', price: 150 } },
  { name: 'Chance', attrs: { kind: 'chance' } },
];

/** A board game with no cards: eight spaces, a piece each, two dice and a public counter that pays for things. */
export function fixtureBoardGame(over: Partial<CompiledGame> = {}): CompiledGame {
  return fixtureGame({
    name: 'Board Fixture',
    players: { min: 2, max: 4 },
    zones: [],
    cards: [],
    board: {
      spaces: FIXTURE_SPACES,
      pieces: { start: 0 },
      counters: [{ name: 'money', start: 1500, visibility: 'public', perTurn: false }],
      dice: { count: 2, sides: 6 },
      payWith: 'money',
      bank: [],
    },
    ...over,
  });
}

export function fixtureState(cards: CardState[], over: Partial<GameState> = {}): GameState {
  return { cards, data: {}, rng: makeRng(1), ...over };
}

export function fixtureEnv(
  state: GameState,
  opts: {
    game?: CompiledGame; seats?: PlayerId[]; move?: MoveInfo; check?: PhraseEnv['check']; subject?: Subject; announce?: PhraseEnv['announce'];
    columnValue?: PhraseEnv['columnValue']; runLine?: PhraseEnv['runLine']; workedValue?: PhraseEnv['workedValue'];
    workedFlag?: PhraseEnv['workedFlag']; playerValue?: PhraseEnv['playerValue'];
  } = {},
): PhraseEnv {
  return {
    state,
    game: opts.game ?? fixtureGame(),
    seats: opts.seats ?? ['p0', 'p1', 'p2', 'p3'],
    move: opts.move,
    check: opts.check ?? (() => true),
    subject: opts.subject,
    announce: opts.announce,
    columnValue: opts.columnValue,
    runLine: opts.runLine,
    workedValue: opts.workedValue,
    workedFlag: opts.workedFlag,
    playerValue: opts.playerValue,
  };
}

/** A board game's state as a new game starts: pieces on the start space, counters at their start values, p0 to move. */
export function fixtureBoardState(game: CompiledGame = fixtureBoardGame(), seats: PlayerId[] = ['p0', 'p1']): GameState {
  return { ...withBoardData(fixtureState([]), game, seats), turn: { current: 'p0', phase: 'playing' } };
}

export function fixtureCard(id: string, zoneId: string, data: Record<string, Json>, over: Partial<CardState> = {}): CardState {
  return { id, zoneId, faceUp: false, faceKey: `k-${id}`, data, ...over };
}

export function fixtureMove(verb: string, from: ZoneRef, to: ZoneRef, over: Partial<DeclaredMove> = {}): DeclaredMove {
  return { verb, from, to, fromText: '', conditions: [], effects: [], line: 1, ...over };
}

export function fixturePhase(id: string, moves: DeclaredMove[], over: Partial<CompiledPhase> = {}): CompiledPhase {
  return {
    id, line: 1, hint: null, actor: 'current', rearrange: [], moves, onEnter: [], goTo: null, triggers: [], after: null,
    actions: [], moments: [], turnStarts: [],
    ...over,
  };
}

/**
 * The words a designer could use about this game: its zones, move verbs, card attributes and values, its facts and what it works out for
 * cards and for players.
 */
export function vocabFor(game: CompiledGame, players: number = game.players.max): Vocab {
  return vocabFrom({
    maxPlayers: players,
    zones: game.zones,
    cards: game.cards,
    phases: game.phases.map((p) => p.id),
    verbs: [...new Set(game.phases.flatMap((p) => p.moves.map((m) => m.verb)))],
    board: game.board,
    actions: game.phases.flatMap((p) => p.actions.map((a) => ({
      verb: a.verb, words: a.words, base: a.base, targeted: a.target !== null, anyone: a.anyone, amount: a.amount, picksPlayer: a.picksPlayer,
      ...(a.pick ? { picksCard: true } : {}),
    }))),
    facts: game.facts,
    worked: Object.entries(game.worked ?? {}).map(([name, value]) => ({ name, kind: value.kind })),
    playerValues: Object.keys(game.playerValues ?? {}),
  });
}

/**
 * Reads `text` as a phrase of `kind` and calls it, as the compiled game will. `extra` is whatever
 * follows the arguments: the seat for a score phrase, the scores for a winner phrase.
 */
export function runPhrase<T = unknown>(
  lib: PhraseLibrary, kind: PhraseKind, text: string, env: PhraseEnv, ...extra: unknown[]
): T {
  const m = lib.match(kind, text, vocabFor(env.game));
  if (m.status !== 'ok') throw new Error(`“${text}” → ${JSON.stringify(m)}`);
  const fn = lib.get(kind, m.pattern)!.fn as (...a: unknown[]) => unknown;
  return fn(env, m.args, ...extra) as T;
}

const ROW_CARDS = 4;
const PILE_CARDS = 3;
/** A hand counts as reachable when at least this share of its cards can be dropped onto. */
const HAND_REACHABLE = 0.7;

/**
 * Which zones a drag cannot reach, as designer-readable messages. Fills hands with `handSize` cards, rows with 4
 * and piles with 3, then drops at each zone's centre (it must land in that zone) and at each hand card's centre
 * (at least 70% must land in the hand). A later zone that covers an earlier one's centre is what usually fails.
 */
export function unreachableZones(defs: ZoneDef[], handSize: number): string[] {
  const registry = new RuleRegistry();
  const held = new Map(defs.map((d) => {
    const count = d.layout === 'fan' ? handSize : d.layout === 'row' ? ROW_CARDS : PILE_CARDS;
    return [d.id, Array.from({ length: count }, (_, i) => fixtureCard(`${d.id}#${i}`, d.id, {}))] as const;
  }));
  const zoneCardsOf = (zoneId: string) => held.get(zoneId) ?? [];
  const dragged = fixtureCard('dragged', '__hand', {});
  const dropOn = (pt: { x: number; y: number }) => resolveDrop(pt, defs, zoneCardsOf, dragged, registry)?.zoneId ?? null;

  const problems: string[] = [];
  for (const def of defs) {
    const cards = zoneCardsOf(def.id);
    const centre = placeZone(def, cards);
    const landed = dropOn(centre);
    if (landed !== def.id) problems.push(`${def.id}: centre goes to ${landed ?? 'nothing'}`);
    if (def.layout !== 'fan') continue;
    const poses = [...computeZoneLayout(def, cards).values()];
    const reachable = poses.filter((pose) => dropOn(pose) === def.id).length;
    if (reachable < HAND_REACHABLE * poses.length) {
      problems.push(`${def.id}: only ${reachable} of ${poses.length} card centres reachable`);
    }
  }
  return problems;
}
