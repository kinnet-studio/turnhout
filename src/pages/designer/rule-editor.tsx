import { useRef, useState } from 'react';
import type { Diagnostic } from '@/engine/core/lang/diagnostics';

type Severity = Diagnostic['severity'];

const FONT = '13px/20px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const PAD = 8;
const EDITOR_HEIGHT = 480;
// The textarea's horizontal scrollbar takes room the gutter does not have; this lets the gutter scroll as far.
const SCROLLBAR_ROOM = 24;

const COLOR: Record<Severity, string> = { error: '#b91c1c', warning: '#a16207' };
const TINT: Record<Severity, string> = { error: '#fee2e2', warning: '#fef3c7' };

/** The worst thing wrong on each line (an error outweighs a warning). */
function worstByLine(problems: Diagnostic[]): Map<number, { severity: Severity; messages: string[] }> {
  const byLine = new Map<number, { severity: Severity; messages: string[] }>();
  for (const { line, severity, message } of problems) {
    const found = byLine.get(line);
    if (!found) byLine.set(line, { severity, messages: [message] });
    else {
      found.messages.push(message);
      if (severity === 'error') found.severity = 'error';
    }
  }
  return byLine;
}

/** The rules as plain text, with line numbers beside it; the numbers of lines with a problem are marked. */
export function RuleEditor({ value, onChange, problems }: { value: string; onChange(text: string): void; problems: Diagnostic[] }) {
  const gutter = useRef<HTMLDivElement>(null);
  // Counted the way the compiler counts lines.
  const lineCount = value.split(/\r?\n/).length;
  const marked = worstByLine(problems);
  return (
    <div style={{ display: 'flex', height: EDITOR_HEIGHT, border: '1px solid #9ca3af', background: '#fff' }}>
      <div
        ref={gutter}
        data-testid="gutter"
        aria-hidden="true"
        style={{ flex: '0 0 auto', width: 48, overflow: 'hidden', boxSizing: 'border-box', padding: `${PAD}px 0 ${PAD + SCROLLBAR_ROOM}px`, background: '#f3f4f6', borderRight: '1px solid #d1d5db', font: FONT, textAlign: 'right', color: '#6b7280', userSelect: 'none' }}
      >
        {Array.from({ length: lineCount }, (_, index) => {
          const line = index + 1;
          const problem = marked.get(line);
          return (
            <div
              key={line}
              data-problem={problem?.severity}
              title={problem?.messages.join('\n')}
              style={{ padding: '0 8px', ...(problem && { background: TINT[problem.severity], color: COLOR[problem.severity], fontWeight: 700 }) }}
            >
              {line}
            </div>
          );
        })}
      </div>
      <textarea
        aria-label="Rules"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => { if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop; }}
        spellCheck={false}
        wrap="off"
        style={{ flex: '1 1 auto', minWidth: 0, boxSizing: 'border-box', padding: PAD, border: 0, outline: 'none', resize: 'none', font: FONT, tabSize: 2, whiteSpace: 'pre' }}
      />
    </div>
  );
}

/** Where the developer stub ended up after "Copy for developer". */
type StubState = 'copied' | 'shown' | null;

function Problem({ problem }: { problem: Diagnostic }) {
  const [stub, setStub] = useState<StubState>(null);
  // Without clipboard access (an insecure page, a blocked permission) the stub is shown to copy by hand.
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(problem.stub!);
      setStub('copied');
    } catch {
      setStub('shown');
    }
  };
  return (
    <li data-severity={problem.severity} style={{ color: COLOR[problem.severity] }}>
      <div>{`Line ${problem.line}: ${problem.message}`}</div>
      {problem.suggestions && problem.suggestions.length > 0 && (
        <div style={{ color: '#374151' }}>{`Did you mean: ${problem.suggestions.join(', ')}?`}</div>
      )}
      {problem.stub !== undefined && (
        <div>
          <button type="button" onClick={copy}>Copy for developer</button>
          {stub === 'copied' && <span style={{ color: '#374151' }}> Copied.</span>}
          {stub === 'shown' && <pre style={{ margin: '4px 0 0', padding: 8, background: '#f3f4f6', color: '#111827', overflow: 'auto' }}>{problem.stub}</pre>}
        </div>
      )}
    </li>
  );
}

/** Everything the compiler has to say about the rules, in line order. */
export function ProblemsList({ problems }: { problems: Diagnostic[] }) {
  if (problems.length === 0) return <p style={{ color: '#15803d' }}>No problems found.</p>;
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {problems.map((problem, index) => <Problem key={`${problem.line}-${index}`} problem={problem} />)}
    </ul>
  );
}
