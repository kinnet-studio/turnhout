import type { ExampleResult } from '@/engine/core/lang/examples';

const STATUS_COLOR: Record<ExampleResult['status'], string> = { pass: '#15803d', fail: '#b91c1c', blocked: '#a16207' };

/** How the examples written in the rules fared: the tally first, then each example in the order written. */
export function ExamplesPanel({ results }: { results: ExampleResult[] | null }) {
  if (results === null) return <p style={{ color: '#666' }}>Examples run once the rules read cleanly.</p>;
  if (results.length === 0) return <p style={{ color: '#666' }}>No examples yet.</p>;
  const passed = results.filter((r) => r.status === 'pass').length;
  return (
    <div>
      <p style={{ fontWeight: 600 }}>{`${passed} of ${results.length} examples pass`}</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {results.map((r) => (
          <li key={`${r.line}-${r.name}`} data-status={r.status}>
            <span>{r.name}</span>{' '}
            <strong style={{ color: STATUS_COLOR[r.status] }}>{r.status}</strong>
            {r.message && <div style={{ color: '#444' }}>{r.status === 'fail' && r.atLine ? `${r.message} (line ${r.atLine})` : r.message}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
