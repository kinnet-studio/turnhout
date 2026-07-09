export function planDeal(cardIds: string[], staggerMs: number): { releaseAtMs: Map<string, number>; totalMs: number } {
  const releaseAtMs = new Map<string, number>();
  cardIds.forEach((id, i) => releaseAtMs.set(id, i * staggerMs));
  return { releaseAtMs, totalMs: cardIds.length > 0 ? (cardIds.length - 1) * staggerMs : 0 };
}

export function planShuffle(
  cardIds: string[],
  opts: { amplitude?: number; cycles?: number } = {},
): Map<string, number[]> {
  const amplitude = opts.amplitude ?? 30;
  const cycles = opts.cycles ?? 2;
  const count = 2 * cycles + 1;
  const out = new Map<string, number[]>();
  cardIds.forEach((id, cardIndex) => {
    const dir = cardIndex % 2 === 0 ? 1 : -1;
    const frames: number[] = [];
    for (let k = 0; k < count; k++) {
      // sine envelope: 0 at both ends, peak in the middle
      frames.push(dir * amplitude * Math.sin((k / (count - 1)) * Math.PI) * (k % 2 === 0 ? 1 : -1));
    }
    frames[0] = 0;
    frames[count - 1] = 0;
    out.set(id, frames);
  });
  return out;
}
