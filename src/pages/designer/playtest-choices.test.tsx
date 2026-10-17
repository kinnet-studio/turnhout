import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState } from '@/engine/core/game-state';
import { createEngine, initialState } from '@/engine/core/lang/build';
import { compileGame } from '@/engine/core/lang/compile';
import { fitsTable } from '@/engine/core/lang/fit-layout';
import { createDefaultLibrary } from '@/engine/core/lang/library';
import { GUILD_GAME } from '@/engine/core/lang/testing';
import { relocate } from '@/engine/core/lang/zones';
import type { CardTableProps } from '@/engine/react';
import { ChoicePicker } from './choice-picker';
import { Playtest } from './playtest';

// The canvas layer needs a real WebGL page; the seats' game logic does not.
vi.mock('@/components/PixiCanvas', () => ({ Wrapper: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
// Each seat's table is a span that keeps the props it was last drawn with, as in playtest-clicks.test.tsx; every table drawn is kept
// in order too, for a test that must know a ring never reached the canvas, not even for one render.
const propsOf = new Map<Element, CardTableProps>();
const drawnWith: CardTableProps[] = [];
vi.mock('@/engine/react', () => ({
  CardTable: (p: CardTableProps) => {
    drawnWith.push(p);
    return <span data-testid="card-table" ref={(el) => { if (el) propsOf.set(el, p); }} />;
  },
}));

const lib = createDefaultLibrary();
const SEED = 1;
/** GUILD_GAME with a button that picks nothing and pays the fee to a player of the presser's choice who makes clay. */
const TIPPING = GUILD_GAME.replace('  A player may stop.',
  '  A player may tip.\n    Then:\n      They pay the fee to another player of their choice who has a card in their workshop whose mark is clay.\n  A player may stop.');
const guild = compileGame(GUILD_GAME, lib).game!;
const SEATS = ['p0', 'p1', 'p2'];

/** Setup for three deals p0 a Statue and a Bowl, p1 a Vase and a Statue, and p2 a Bowl and a Tower; p0 acts first. */
const setUp = createEngine(guild, lib, 3, initialState(guild, SEED)).engine.getState();
const idsOf = (state: GameState, name: string, zoneId?: string) =>
  state.cards.filter((c) => c.data?.name === name && (zoneId === undefined || c.zoneId === zoneId)).map((c) => c.id);
const [statue, ...otherStatues] = idsOf(setUp, 'Statue', 'stash-p0');
const [vase, secondVase] = idsOf(setUp, 'Vase');
const bowl = idsOf(setUp, 'Bowl').find((id) => !idsOf(setUp, 'Bowl', 'stash-p0').includes(id))!;
const [hand] = idsOf(setUp, 'Potter', 'hall');
const moved = (state: GameState, ...places: [string[], string][]) =>
  places.reduce((s, [ids, zone]) => relocate(s, ids, zone, guild), state);
/** p1 makes clay with a Vase in its workshop and p2 with a Bowl in its, and p0's stash holds the one Statue, which wants clay. */
const ARRANGED = moved(setUp, [otherStatues, 'pile'], [[vase], 'workshop-p1'], [[bowl], 'workshop-p2']);
/** The same without the Bowl: only p1 makes clay. */
const ONE_PROVIDER = moved(setUp, [otherStatues, 'pile'], [[vase], 'workshop-p1']);

const mount = (rules: string, initial: GameState) =>
  render(<Playtest game={compileGame(rules, lib).game!} library={lib} players={3} seed={SEED} initial={initial} onRestart={() => {}} onStop={() => {}} />);
/** A seat's whole panel: what holds its status line. */
const panelOf = (seat: string) => screen.getByText(new RegExp(`^seat: ${seat} `)).parentElement!;
const tableOf = (seat: string) => propsOf.get(within(panelOf(seat)).getByTestId('card-table'))!;
const clickOn = (seat: string, cardId: string) => act(() => tableOf(seat).onCardClick!(cardId));
/** A seat's numbers on p0's money line, which goes on, after ' · ', with the cards the seat keeps where everyone sees them. */
const coins = (seat: string) => within(panelOf('p0')).getByText(new RegExp(`^${seat} `)).textContent!.split(' · ')[0];
const asked = () => within(panelOf('p0')).queryByRole('group', { name: 'Choices' });
const press = (name: string) => fireEvent.click(within(panelOf('p0')).getByRole('button', { name }));
const answer = (value: string) => fireEvent.click(within(asked()!).getByRole('button', { name: value }));
const options = () => within(asked()!).getAllByRole('button').map((b) => b.textContent);
const zoneOf = (cardId: string) => tableOf('p0').placement.cards.find((c) => c.id === cardId)?.zoneId;
const OPEN = 'Open a card in your stash';
const PAYEE = 'Pick who to pay the fee to (wants clay)';
/** p0 opens the Statue in its stash from the picker, which asks whom to pay. */
const openStatue = () => {
  press(OPEN);
  press('Pick Statue');
};

beforeEach(() => {
  propsOf.clear();
  drawnWith.length = 0;
});

describe('choosing among answers on the page with every seat on one screen', () => {
  it('plays the Guild at three on one table, with the one Statue in p0\'s stash', () => {
    expect(fitsTable(guild.zones, SEATS)).toBe(true);
    expect(idsOf(ARRANGED, 'Statue', 'stash-p0')).toEqual([statue]);
    expect(secondVase).toBeDefined();
  });

  it('asks whom to pay, from the list, naming what the card wants, and pays the one picked', () => {
    mount(GUILD_GAME, ARRANGED);
    openStatue();
    expect(within(asked()!).getByText(PAYEE)).toBeTruthy();
    expect(options()).toEqual(['p1', 'p2', 'Cancel']);
    expect(within(panelOf('p0')).queryByRole('group', { name: 'Pick cards' })).toBeNull();
    expect(tableOf('p0').decor?.[statue]?.ring).toBe('chosen');
    answer('p2');
    expect(coins('p0')).toBe('p0 7 coins, 2 moves');
    expect(coins('p2')).toBe('p2 11 coins, 2 moves');
    expect(zoneOf(statue)).toBe('workshop-p0');
    expect(asked()).toBeNull();
  });

  it('fills in a lone answer and sends at once, asking nothing', () => {
    mount(GUILD_GAME, ONE_PROVIDER);
    openStatue();
    expect(coins('p1')).toBe('p1 11 coins, 2 moves');
    expect(zoneOf(statue)).toBe('workshop-p0');
    expect(asked()).toBeNull();
  });

  it('asks how to trim a card clicked on the table, and trims as answered', () => {
    mount(GUILD_GAME, moved(ARRANGED, [[statue], 'workshop-p0']));
    clickOn('p0', statue);
    fireEvent.click(within(within(panelOf('p0')).getByRole('group', { name: 'Card buttons' })).getByRole('button', { name: 'Trim a card in your workshop' }));
    expect(within(asked()!).getByText('Choose one')).toBeTruthy();
    expect(options()).toEqual(['Trim 2 red', 'Trim 2 gold', 'Trim 1 of each', 'Cancel']);
    answer('Trim 2 gold');
    expect(tableOf('p0').placement.cards.find((c) => c.id === statue)?.data).toMatchObject({ 'gold trim': 2 });
    expect(asked()).toBeNull();
  });

  it('asks the choice of a button that picks nothing, with no brackets', () => {
    mount(TIPPING, ARRANGED);
    press('Tip');
    expect(within(asked()!).getByText('Pick who to pay the fee to')).toBeTruthy();
    answer('p1');
    expect(coins('p1')).toBe('p1 11 coins, 2 moves');
  });

  it('Review Focus: half answered, a table click explains and keeps the question; another button or Cancel drops it, sending nothing', () => {
    mount(GUILD_GAME, ARRANGED);
    openStatue();
    clickOn('p0', hand);
    expect(within(panelOf('p0')).getByText(`${PAYEE}.`)).toBeTruthy();
    expect(within(asked()!).getByText(PAYEE)).toBeTruthy();
    press('Start a card in your stash');
    expect(asked()).toBeNull();
    expect(within(panelOf('p0')).getByRole('group', { name: 'Pick cards' })).toBeTruthy();
    openStatue();
    expect(asked()).not.toBeNull();
    fireEvent.click(within(asked()!).getByRole('button', { name: 'Cancel' }));
    expect(asked()).toBeNull();
    for (const seat of SEATS) expect(coins(seat)).toBe(`${seat} 9 coins, 2 moves`);
    expect(zoneOf(statue)).toBe('stash-p0');
  });

  it('Review Focus: closes the question, sending nothing, once an Undo means the press asks it no more', () => {
    mount(GUILD_GAME, moved(ARRANGED, [[secondVase], 'workshop-p0']));
    press('Finish a card in your workshop');
    press('Pick Vase');
    expect(zoneOf(secondVase)).toBe('scrap');
    openStatue();
    expect(asked()).not.toBeNull();
    drawnWith.length = 0;
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(asked()).toBeNull();
    // P6: the Statue's ring went with the view that asked, before any table was drawn without it.
    expect(drawnWith.length).toBeGreaterThan(0);
    expect(drawnWith.filter((p) => p.decor?.[statue]?.ring !== undefined)).toEqual([]);
    expect(zoneOf(secondVase)).toBe('workshop-p0');
    expect(zoneOf(statue)).toBe('stash-p0');
    for (const seat of SEATS) expect(coins(seat)).toBe(`${seat} 9 coins, 2 moves`);
    expect(tableOf('p0').decor?.[statue]?.ring).toBeUndefined();
    // Closed, not hidden: finished again from a click on the table, which presses no button, the press would ask it again, but
    // nothing is open until the Statue is opened again.
    clickOn('p0', secondVase);
    fireEvent.click(within(within(panelOf('p0')).getByRole('group', { name: 'Card buttons' })).getByRole('button', { name: 'Finish a card in your workshop' }));
    expect(zoneOf(secondVase)).toBe('scrap');
    expect(asked()).toBeNull();
    expect(tableOf('p0').decor?.[statue]?.ring).toBeUndefined();
  });

  // Passes before the change too: the view lists no choices to a seat whose press the engine refuses (3-1).
  it('Review Focus: another seat sees no question', () => {
    mount(GUILD_GAME, ARRANGED);
    const button = within(panelOf('p1')).getByRole('button', { name: OPEN });
    expect(button.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(button);
    expect(within(panelOf('p1')).getByText("It's p0's turn.")).toBeTruthy();
    expect(within(panelOf('p1')).queryByRole('group', { name: 'Choices' })).toBeNull();
  });
});

describe('ChoicePicker', () => {
  const CHOICE = {
    at: 0, prompt: 'Pick who to pay the fee to: p1 or p2.',
    options: [{ value: 'p1', allowed: true as const }, { value: 'p2', allowed: 'p2 is out of coins' }],
  };

  it('answers with a live option, explains a refused one, and cancels', () => {
    const onAnswer = vi.fn();
    const onRefused = vi.fn();
    const onCancel = vi.fn();
    render(<ChoicePicker question="Pick who to pay the fee to" choice={CHOICE} onAnswer={onAnswer} onRefused={onRefused} onCancel={onCancel} />);
    const group = screen.getByRole('group', { name: 'Choices' });
    expect(within(group).getByText('Pick who to pay the fee to')).toBeTruthy();
    const refused = within(group).getByRole('button', { name: 'p2' });
    expect(refused.getAttribute('aria-disabled')).toBe('true');
    expect(refused.getAttribute('title')).toBe('p2 is out of coins');
    expect(within(group).getByRole('button', { name: 'p1' }).getAttribute('title')).toBeNull();
    fireEvent.click(refused);
    expect(onRefused).toHaveBeenCalledWith('p2 is out of coins');
    expect(onAnswer).not.toHaveBeenCalled();
    fireEvent.click(within(group).getByRole('button', { name: 'p1' }));
    expect(onAnswer).toHaveBeenCalledWith('p1');
    fireEvent.click(within(group).getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
