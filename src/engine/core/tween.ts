import type { TargetTransform } from './scene';

export function stepToward(
  current: TargetTransform,
  target: TargetTransform,
  dtSeconds: number,
  tau = 0.08,
): TargetTransform {
  if (dtSeconds <= 0) return { ...current };
  const a = 1 - Math.exp(-dtSeconds / tau);
  const lerp = (c: number, t: number) => c + (t - c) * a;
  return {
    x: lerp(current.x, target.x),
    y: lerp(current.y, target.y),
    rotation: lerp(current.rotation, target.rotation),
    scale: lerp(current.scale, target.scale),
    z: target.z,
  };
}

export function flipScaleX(progress: number): number {
  return Math.abs(Math.cos(progress * Math.PI));
}

export function advanceFlip(progress: number, dtSeconds: number, durationSeconds: number): number {
  return Math.min(1, progress + dtSeconds / durationSeconds);
}

export function resolveFlipVisual(progress: number, faceUp: boolean): { scaleX: number; showFaceUp: boolean } {
  // Before the midpoint we still show the origin side (the opposite of the destination).
  const showFaceUp = progress >= 0.5 ? faceUp : !faceUp;
  return { scaleX: flipScaleX(progress), showFaceUp };
}
