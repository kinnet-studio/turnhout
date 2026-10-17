import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DesignerPage } from './designer-page';
import { SAMPLES } from './samples';
import { loadRules, saveRules, STORAGE_KEY } from './storage';

// The playtest needs a real WebGL page; the designer page only decides when it is on screen and with what.
vi.mock('./playtest', () => ({
  Playtest: ({ players, seed, onRestart, onStop }: { players: number; seed: number; onRestart(): void; onStop(): void }) => (
    <div>
      <span>playtest {players}</span>
      <span data-testid="seed">{seed}</span>
      <button type="button" onClick={onRestart}>mock restart</button>
      <button type="button" onClick={onStop}>mock stop</button>
    </div>
  ),
}));

const HEARTS = SAMPLES[0].text;
const COLOR_MATCH = SAMPLES.find((s) => s.name === 'Color Match')!.text;

const flush = () => act(() => { vi.advanceTimersByTime(300); });
const rules = () => screen.getByLabelText('Rules') as HTMLTextAreaElement;
const edit = (value: string) => { fireEvent.change(rules(), { target: { value } }); flush(); };
const loadSample = (name: string) => fireEvent.change(screen.getByLabelText('Load sample'), { target: { value: name } });
const playButton = () => screen.getByRole('button', { name: 'Play' }) as HTMLButtonElement;
const play = () => fireEvent.click(playButton());
/** The test page has no window.confirm of its own; this one answers `answer` until told otherwise. */
const confirmAnswering = (answer: boolean) => {
  const confirm = vi.fn((_message?: string) => answer);
  Object.defineProperty(window, 'confirm', { value: confirm, configurable: true, writable: true });
  return confirm;
};

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('DesignerPage', () => {
  it('loads Hearts by default, runs its examples and allows Play', () => {
    render(<DesignerPage />); flush();
    expect(rules().value).toBe(SAMPLES[0].text);
    expect(screen.getByText('11 of 11 examples pass')).toBeTruthy();
    expect(playButton().disabled).toBe(false);
  });

  it('flags an unknown phrase with a hint and disables Play', () => {
    render(<DesignerPage />);
    fireEvent.change(screen.getByLabelText('Rules'), { target: { value: SAMPLES[0].text.replace('Shuffle the deck.', 'Shufle the deck.') } }); flush();
    expect(screen.getByText(/Line 15: “Shufle the deck” isn't in the phrase library yet\./)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy for developer' })).toBeTruthy();
    expect(playButton().disabled).toBe(true);
    expect(screen.getByText('1 phrase still needs a developer.')).toBeTruthy();
  });

  it('suggests the phrases it might have meant', () => {
    render(<DesignerPage />);
    edit(HEARTS.replace('Shuffle the deck.', 'Shufle the deck.'));
    expect(screen.getByText('Did you mean: shuffle [zone]?')).toBeTruthy();
  });

  it('names a misspelt zone for the designer to fix, with no stub for a developer', () => {
    render(<DesignerPage />);
    edit(HEARTS.replace("Move the trick to the winner's won pile.", "Move the trik to the winner's won pile."));
    expect(screen.getByText('Line 44: There is no zone called “trik”.')).toBeTruthy();
    expect(screen.getByText('Did you mean: trick?')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Copy for developer' })).toBeNull();
    expect(screen.getByText('Fix 1 problem in the rules first.')).toBeTruthy();
  });

  it('marks the lines with problems in the gutter', () => {
    render(<DesignerPage />);
    edit(HEARTS.replace('Shuffle the deck.', 'Shufle the deck.'));
    const gutter = screen.getByTestId('gutter');
    expect(within(gutter).getByText('15').getAttribute('data-problem')).toBe('error');
    expect(within(gutter).getByText('14').hasAttribute('data-problem')).toBe(false);
  });

  it('marks a warning line as a warning and still allows Play', () => {
    render(<DesignerPage />);
    // Nothing leads to the second phase any more: worth saying, not worth blocking the game.
    edit(HEARTS.replace('go to playing', 'go to passing'));
    expect(screen.getByText('Line 26: Nothing leads to the phase “playing”.')).toBeTruthy();
    expect(within(screen.getByTestId('gutter')).getByText('26').getAttribute('data-problem')).toBe('warning');
    expect(playButton().disabled).toBe(false);
  });

  it('copies the developer stub to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<DesignerPage />);
    edit(HEARTS.replace('Shuffle the deck.', 'Shufle the deck.'));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy for developer' })); });
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain("library.effect('shufle {zone}'");
    expect(screen.getByText('Copied.')).toBeTruthy();
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
  });

  it('shows the stub on the page when the clipboard is not available', () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    render(<DesignerPage />);
    edit(HEARTS.replace('Shuffle the deck.', 'Shufle the deck.'));
    expect(document.querySelector('pre')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Copy for developer' }));
    expect(document.querySelector('pre')?.textContent).toContain("library.effect('shufle {zone}'");
  });

  it('explains why Play is disabled for empty text', () => {
    render(<DesignerPage />);
    expect(() => edit('')).not.toThrow();
    expect(playButton().disabled).toBe(true);
    expect(screen.getByText(/^Fix \d+ problems? in the rules first\.$/)).toBeTruthy();
    expect(screen.getByText('Examples run once the rules read cleanly.')).toBeTruthy();
  });

  it('says so when the rules have no examples', () => {
    render(<DesignerPage />);
    edit(HEARTS.slice(0, HEARTS.indexOf('Example:')));
    expect(screen.getByText('No examples yet.')).toBeTruthy();
  });

  it('keeps Play off while a fresh edit is still being checked', () => {
    render(<DesignerPage />); flush();
    fireEvent.change(rules(), { target: { value: HEARTS + '\n' } });
    expect(playButton().disabled).toBe(true);
    expect(screen.getByText('Checking the rules…')).toBeTruthy();
    flush();
    expect(playButton().disabled).toBe(false);
  });

  it('offers a player count for Color Match and plays with it', () => {
    render(<DesignerPage />);
    loadSample('Color Match');
    const select = screen.getByLabelText('Players') as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual(['2', '3', '4', '5']);
    expect(select.value).toBe('2');
    fireEvent.change(select, { target: { value: '3' } });
    play();
    expect(screen.getByText('playtest 3')).toBeTruthy();
  });

  it('loads Rent Day with no problems, all 108 examples passing, 2 to 8 players and Play on', () => {
    render(<DesignerPage />);
    loadSample('Rent Day');
    expect(rules().value).toBe(SAMPLES.find((s) => s.name === 'Rent Day')!.text);
    expect(screen.getByText('No problems found.')).toBeTruthy();
    expect(screen.getByText('108 of 108 examples pass')).toBeTruthy();
    const select = screen.getByLabelText('Players') as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual(['2', '3', '4', '5', '6', '7', '8']);
    expect(playButton().disabled).toBe(false);
    fireEvent.change(select, { target: { value: '4' } });
    play();
    expect(screen.getByText('playtest 4')).toBeTruthy();
  });

  it('loads Startup Simulator with no problems, all 156 examples passing, 2 to 5 players and Play on', () => {
    render(<DesignerPage />);
    loadSample('Startup Simulator');
    expect(rules().value).toBe(SAMPLES.find((s) => s.name === 'Startup Simulator')!.text);
    expect(screen.getByText('No problems found.')).toBeTruthy();
    expect(screen.getByText('156 of 156 examples pass')).toBeTruthy();
    const select = screen.getByLabelText('Players') as HTMLSelectElement;
    expect([...select.options].map((o) => o.value)).toEqual(['2', '3', '4', '5']);
    expect(playButton().disabled).toBe(false);
    fireEvent.change(select, { target: { value: '3' } });
    play();
    expect(screen.getByText('playtest 3')).toBeTruthy();
  });

  it('loads Venom with no problems, all 7 examples passing, and Play on', () => {
    render(<DesignerPage />);
    loadSample('Venom');
    expect(rules().value).toBe(SAMPLES.find((s) => s.name === 'Venom')!.text);
    expect(screen.getByText('No problems found.')).toBeTruthy();
    expect(screen.getByText('7 of 7 examples pass')).toBeTruthy();
    expect(playButton().disabled).toBe(false);
    play();
    expect(screen.getByText('playtest 2')).toBeTruthy();
  });

  it('has no player count to pick for a game with a fixed number of players', () => {
    render(<DesignerPage />); flush();
    expect(screen.queryByLabelText('Players')).toBeNull();
    play();
    expect(screen.getByText('playtest 4')).toBeTruthy();
  });

  it('replaces the text when a sample is loaded', () => {
    render(<DesignerPage />);
    loadSample('Color Match');
    expect(rules().value).toBe(COLOR_MATCH);
    expect(screen.getByText(/^\d+ of \d+ examples pass$/)).toBeTruthy();
    loadSample('Hearts');
    expect(rules().value).toBe(HEARTS);
  });

  it('asks before a sample replaces rules of the designer\'s own, and keeps them on cancel', () => {
    const confirm = confirmAnswering(false);
    render(<DesignerPage />);
    edit('Game: Mine');
    loadSample('Color Match');
    expect(confirm).toHaveBeenCalledWith('Replace your current rules? Your changes will be lost.');
    expect(rules().value).toBe('Game: Mine');
    expect((screen.getByLabelText('Load sample') as HTMLSelectElement).value).toBe('');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('Game: Mine');
    confirm.mockReturnValue(true);
    loadSample('Color Match');
    expect(rules().value).toBe(COLOR_MATCH);
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('replaces empty rules or an unchanged sample without asking', () => {
    const confirm = confirmAnswering(false);
    render(<DesignerPage />);
    loadSample('Color Match');
    expect(rules().value).toBe(COLOR_MATCH);
    edit('  \n');
    loadSample('Hearts');
    expect(rules().value).toBe(HEARTS);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks before an uploaded file replaces rules of the designer\'s own', async () => {
    const confirm = confirmAnswering(false);
    render(<DesignerPage />);
    edit('Game: Mine');
    const upload = async () => act(async () => {
      fireEvent.change(screen.getByLabelText('Upload'), { target: { files: [new File([COLOR_MATCH], 'other.rules', { type: 'text/plain' })] } });
    });
    await upload();
    expect(confirm).toHaveBeenCalledWith('Replace your current rules? Your changes will be lost.');
    expect(rules().value).toBe('Game: Mine');
    confirm.mockReturnValue(true);
    await upload();
    expect(rules().value).toBe(COLOR_MATCH);
  });

  it('editing the rules ends a running playtest', () => {
    render(<DesignerPage />); flush();
    play();
    expect(screen.getByText('playtest 4')).toBeTruthy();
    fireEvent.change(rules(), { target: { value: HEARTS + '\n' } });
    expect(screen.queryByText('playtest 4')).toBeNull();
  });

  it('changing the player count ends a running playtest', () => {
    render(<DesignerPage />);
    loadSample('Color Match');
    play();
    expect(screen.getByText('playtest 2')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Players'), { target: { value: '4' } });
    expect(screen.queryByText('playtest 2')).toBeNull();
  });

  it('restarts with a new seed and stops on request', () => {
    render(<DesignerPage />); flush();
    play();
    const first = screen.getByTestId('seed').textContent;
    fireEvent.click(screen.getByRole('button', { name: 'mock restart' }));
    expect(screen.getByTestId('seed').textContent).not.toBe(first);
    fireEvent.click(screen.getByRole('button', { name: 'mock stop' }));
    expect(screen.queryByText('playtest 4')).toBeNull();
  });

  it('saves edits', () => {
    render(<DesignerPage />);
    edit(HEARTS + '\n');
    expect(localStorage.getItem('turnhout.designer.rules')).toBe(HEARTS + '\n');
  });

  it('opens with the text that was saved last time', () => {
    saveRules(COLOR_MATCH);
    render(<DesignerPage />); flush();
    expect(rules().value).toBe(COLOR_MATCH);
  });

  it('still works when browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    render(<DesignerPage />);
    expect(rules().value).toBe(HEARTS);
    expect(() => edit(HEARTS + '\n')).not.toThrow();
    expect(rules().value).toBe(HEARTS + '\n');
  });

  it('downloads the rules named after the game', () => {
    const create = vi.fn(() => 'blob:rules');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { downloads.push(this.download); });
    render(<DesignerPage />); flush();
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(downloads).toEqual(['hearts.rules']);
    expect(create).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith('blob:rules');
    loadSample('Color Match');
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(downloads).toEqual(['hearts.rules', 'color-match.rules']);
  });

  it('replaces the text with an uploaded file', async () => {
    render(<DesignerPage />);
    const input = screen.getByLabelText('Upload') as HTMLInputElement;
    expect(input.accept).toBe('.rules,.txt');
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File([COLOR_MATCH], 'mine.rules', { type: 'text/plain' })] } });
    });
    expect(rules().value).toBe(COLOR_MATCH);
    expect(screen.getByLabelText('Players')).toBeTruthy();
  });

  it('says so when an uploaded file cannot be read', async () => {
    render(<DesignerPage />);
    const file = new File(['x'], 'broken.rules');
    vi.spyOn(file, 'text').mockRejectedValue(new Error('unreadable'));
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Upload'), { target: { files: [file] } });
    });
    expect(screen.getByRole('alert').textContent).toBe("That file couldn't be read.");
    expect(rules().value).toBe(HEARTS);
  });
});

describe('storage', () => {
  beforeEach(() => vi.useRealTimers());

  it('round-trips the text under its key', () => {
    expect(loadRules()).toBeNull();
    saveRules('Game: X');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('Game: X');
    expect(loadRules()).toBe('Game: X');
  });

  it('reads and writes nothing when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(loadRules()).toBeNull();
    expect(() => saveRules('x')).not.toThrow();
  });
});
