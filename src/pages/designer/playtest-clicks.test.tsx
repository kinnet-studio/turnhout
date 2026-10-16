import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import COLOR_MATCH from '@/games/color-match.rules?raw';
import HEARTS from '@/games/hearts.rules?raw';
import RENT_DAY from '@/games/rent-day.rules?raw';
import VENOM from '@/games/venom.rules?raw';
import { zoneCards } from '@/engine/core/game-state';
import { createEngine, initialState } from '@/engine/core/lang/build';
import { compileGame } from '@/engine/core/lang/compile';
import { createDefaultLibrary } from '@/engine/core/lang/library';
import { CARD_PICK_GAME, deckGameText } from '@/engine/core/lang/testing';
import { relocate } from '@/engine/core/lang/zones';
import type { CardTableProps } from '@/engine/react';
import { Playtest } from './playtest';

// The canvas layer needs a real WebGL page; the seats' game logic does not.
vi.mock('@/components/PixiCanvas', () => ({ Wrapper: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
// Each seat's table is a span that keeps the props it was last drawn with. Counting renders would mix the seats up once one
// rerenders alone, as an open offer makes it do. Every table drawn is kept in order too, for a test that must know a ring never
// reached the canvas, not even for one render.
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
const mount = (game: string, players: number, initial?: Parameters<typeof Playtest>[0]['initial']) =>
  render(<Playtest game={compileGame(game, lib).game!} library={lib} players={players} seed={SEED} initial={initial} onRestart={() => {}} onStop={() => {}} />);
/** A seat's whole panel: what holds its status line. */
const panelOf = (seat: string) => screen.getByText(new RegExp(`^seat: ${seat} `)).parentElement!;
const tableOf = (seat: string) => propsOf.get(within(panelOf(seat)).getByTestId('card-table'))!;
const clickOn = (seat: string, cardId: string) => act(() => tableOf(seat).onCardClick!(cardId));

beforeEach(() => {
  propsOf.clear();
  drawnWith.length = 0;
});

describe('Playtest: clicking cards with every seat on one screen', () => {
  const pickGame = compileGame(CARD_PICK_GAME, lib).game!;
  const started = createEngine(pickGame, lib, 2, initialState(pickGame, SEED)).engine.getState();
  const named = (name: string) => started.cards.filter((c) => c.data?.name === name).map((c) => c.id);
  const [r1, r2, r3] = named('Ruby');
  const [o1, o2, o3] = named('Opal');
  /** After Setup, with the shop holding a Ruby and an Opal, and p0's stash and case each a Ruby and an Opal too. */
  const initial = [['shop', r1, o1], ['stash-p0', r2, o2], ['case-p0', r3, o3]].reduce(
    (state, [zone, ...ids]) => relocate(state, ids, zone, pickGame),
    relocate(started, zoneCards(started, 'shop').map((c) => c.id), 'pile', pickGame),
  );

  it('picks by clicking too: a card offers its buttons, and a button that picks a card for it to go to rings the cards it may go to', () => {
    mount(CARD_PICK_GAME, 2, initial);
    expect(tableOf('p0').onCardClick).toBeDefined();
    expect(tableOf('p0').decor).toBeDefined();
    clickOn('p0', o2);
    const offer = within(panelOf('p0')).getByRole('group', { name: 'Card buttons' });
    expect(within(offer).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Sell a card in your stash', 'Show a card from your stash to a card in your case', 'Trade some cards from your stash to the shop', 'Cancel',
    ]);

    fireEvent.click(within(offer).getByRole('button', { name: 'Show a card from your stash to a card in your case' }));
    const rings = () => [o3, o2, r3].map((id) => tableOf('p0').decor?.[id]?.ring);
    expect(rings()).toEqual(['choice', 'chosen', undefined]);
    clickOn('p0', r3);
    expect(within(panelOf('p0')).getByText('the target card is not a Ruby')).toBeTruthy();
    clickOn('p0', o3);
    expect(tableOf('p0').placement.cards.filter((c) => c.zoneId === 'case-p0')).toHaveLength(3);
    // The money line ends with the cards in p0's case, which everyone can see.
    expect(screen.getAllByText('p0 7 coins, 1 move · Ruby 3 · Opal 1 · Opal 1')).toHaveLength(2);

    clickOn('p1', o3);
    expect(within(panelOf('p1')).getByText('No button takes this card now.')).toBeTruthy();
  });

  it("Review Focus: never rings an offered card once no button of the seat's takes it, as when it goes where the seat can't see", () => {
    mount(CARD_PICK_GAME, 2, initial);
    const offerOf = (seat: string) => within(panelOf(seat)).queryByRole('group', { name: 'Card buttons' });
    clickOn('p1', r1);
    expect(offerOf('p1')).not.toBeNull();
    expect(tableOf('p1').decor?.[r1]?.ring).toBe('chosen');
    fireEvent.click(within(panelOf('p0')).getByRole('button', { name: 'Buy a card from the shop to your stash' }));
    drawnWith.length = 0;
    fireEvent.click(within(panelOf('p0')).getByRole('button', { name: 'Pick Ruby' }));
    // The Ruby is in p0's stash now, which p1 sees only as a back.
    expect(tableOf('p1').placement.cards.find((c) => c.id === r1)).toMatchObject({ zoneId: 'stash-p0', faceUp: false });
    expect(drawnWith.length).toBeGreaterThan(0);
    expect(drawnWith.filter((p) => p.decor?.[r1]?.ring !== undefined)).toEqual([]);
    expect(offerOf('p1')).toBeNull();
  });
});

describe('Playtest: clicking cards on a board', () => {
  it('draws the cards of a board game whose only use for them is a button that picks one, and takes clicks on them', () => {
    const keeping = deckGameText(
      ['| name | says |', '| Pass | They keep this card in their kept cards. |'], ['| name | says |', '| Calm | They get 0 money. |'],
      ['  A player may return a card in their kept cards.', '    Then:', '      Move it to the lucky pile.'],
    );
    const compiled = compileGame(keeping, lib);
    expect(compiled.diagnostics).toEqual([]);
    expect(compiled.game!.board!.spaces.length).toBeGreaterThan(0);
    expect(compiled.game!.phases.every((phase) => phase.moves.length === 0 && phase.rearrange.length === 0)).toBe(true);
    mount(keeping, 2);
    expect(tableOf('p0').onCardClick).toBeDefined();
  });
});

describe('Playtest: the four games, as before', () => {
  const venom = compileGame(VENOM, lib).game!.players.min;
  // A table per seat, as before, and none for Rent Day, whose board has no cards to drag.
  it.each([
    ['Hearts', HEARTS, 4, 4],
    ['Color Match', COLOR_MATCH, 3, 3],
    ['Venom', VENOM, venom, venom],
    ['Rent Day', RENT_DAY, 2, 0],
  ])('gives %s no clicks and nothing on its cards', (_name, rules, players, drawn) => {
    mount(rules, players);
    const tables = screen.queryAllByTestId('card-table');
    expect(tables).toHaveLength(drawn);
    for (const table of tables) {
      expect(propsOf.get(table)!.onCardClick).toBeUndefined();
      expect(propsOf.get(table)!.decor).toBeUndefined();
    }
  });
});
