import { useEffect, useState, type ChangeEvent } from 'react';
import { canPlay, compileGame, type CompileResult } from '@/engine/core/lang/compile';
import { runExamples, type ExampleResult } from '@/engine/core/lang/examples';
import { createDefaultLibrary } from '@/engine/core/lang/library';
import { slug } from '@/engine/core/lang/zones';
import { ExamplesPanel } from './examples-panel';
import { Playtest } from './playtest';
import { ProblemsList, RuleEditor } from './rule-editor';
import { SAMPLES } from './samples';
import { loadRules, saveRules } from './storage';

/** How long after the last keystroke the rules are read again. */
const DEBOUNCE_MS = 300;

// One library for the page's lifetime: the playtest keys its game on it, so its identity must not change.
const LIBRARY = createDefaultLibrary();

type Analysis = {
  text: string; // what was read
  result: CompileResult;
  examples: ExampleResult[] | null; // null while there is no game to run them on
  verdict: ReturnType<typeof canPlay>;
};

function analyze(text: string): Analysis {
  const result = compileGame(text, LIBRARY);
  return { text, result, examples: result.game ? runExamples(result.game, LIBRARY) : null, verdict: canPlay(result) };
}

/** A seed for a new game, never the one the game on screen already has (restarting must always remount). */
function freshSeed(previous?: number): number {
  const seed = Date.now() >>> 0;
  return seed === previous ? (seed + 1) >>> 0 : seed;
}

/** The name on the text's `Game:` line, for naming the download even while the rest does not read yet. */
function gameName(text: string): string {
  return /^\s*game\s*:\s*(.+?)\s*$/im.exec(text)?.[1] ?? '';
}

function download(text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slug(gameName(text)) || 'my-game'}.rules`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const SECTION_TITLE = { margin: '16px 0 8px', fontSize: 16 } as const;

/** Write a game in the rule language, see what the compiler and its examples make of it, and play it. */
export function DesignerPage() {
  const [text, setText] = useState(() => loadRules() ?? SAMPLES[0].text);
  const [analysis, setAnalysis] = useState(() => analyze(text));
  const [playtest, setPlaytest] = useState<{ seed: number } | null>(null);
  const [chosenPlayers, setChosenPlayers] = useState<number | null>(null);
  const [fileProblem, setFileProblem] = useState<string | null>(null);

  // Re-read the rules once typing pauses.
  useEffect(() => {
    if (analysis.text === text) return;
    const timer = setTimeout(() => setAnalysis(analyze(text)), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, analysis.text]);

  // Every edit is kept and ends the game in progress: Play starts a fresh one under the new rules.
  const edit = (next: string, readNow = false) => {
    setText(next);
    saveRules(next);
    setPlaytest(null);
    setFileProblem(null);
    if (readNow) setAnalysis(analyze(next));
  };

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // so choosing the same file again still loads it
    if (!file) return;
    try {
      edit(await file.text(), true);
    } catch {
      setFileProblem("That file couldn't be read.");
    }
  };

  const game = analysis.result.game;
  const range = game?.players;
  const chooseCount = range !== undefined && range.min < range.max;
  const players = range === undefined ? 0 : chosenPlayers !== null && chosenPlayers >= range.min && chosenPlayers <= range.max ? chosenPlayers : range.min;
  const pending = analysis.text !== text;
  const reason = pending ? 'Checking the rules…' : analysis.verdict.ok ? null : analysis.verdict.reason;
  const play = () => setPlaytest({ seed: freshSeed(playtest?.seed) });

  return (
    <div style={{ padding: 16, font: '14px/1.4 system-ui, sans-serif', color: '#1f2937' }}>
      <h1 style={{ margin: '0 0 12px', fontSize: 20 }}>Game designer</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <select
          aria-label="Load sample"
          value=""
          onChange={(e) => {
            const sample = SAMPLES.find((s) => s.name === e.target.value);
            if (sample) edit(sample.text, true);
          }}
        >
          <option value="">Load sample…</option>
          {SAMPLES.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
        <button type="button" onClick={() => download(text)}>Download</button>
        <label>Upload <input type="file" accept=".rules,.txt" onChange={upload} /></label>
        {fileProblem && <span role="alert" style={{ color: '#b91c1c' }}>{fileProblem}</span>}
        {chooseCount && (
          <>
            <span aria-hidden="true" style={{ marginLeft: 24 }}>Players</span>
            <select
              aria-label="Players"
              value={players}
              onChange={(e) => {
                setChosenPlayers(Number(e.target.value));
                setPlaytest(null);
              }}
            >
              {Array.from({ length: range.max - range.min + 1 }, (_, i) => range.min + i).map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </>
        )}
        <button type="button" disabled={reason !== null} onClick={play} style={{ marginLeft: chooseCount ? 0 : 24 }}>Play</button>
        {reason !== null && <span>{reason}</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24, alignItems: 'start' }}>
        <div>
          <RuleEditor value={text} onChange={edit} problems={analysis.result.diagnostics} />
          <h2 style={SECTION_TITLE}>Problems</h2>
          <ProblemsList problems={analysis.result.diagnostics} />
        </div>
        <div>
          <h2 style={{ ...SECTION_TITLE, marginTop: 0 }}>Examples</h2>
          <ExamplesPanel results={analysis.examples} />
        </div>
      </div>
      {playtest && game && (
        <div style={{ marginTop: 24 }}>
          <Playtest
            key={`${playtest.seed}-${players}`}
            game={game}
            library={LIBRARY}
            players={players}
            seed={playtest.seed}
            onRestart={() => setPlaytest({ seed: freshSeed(playtest.seed) })}
            onStop={() => setPlaytest(null)}
          />
        </div>
      )}
    </div>
  );
}
