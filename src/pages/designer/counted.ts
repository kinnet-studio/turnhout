import { singularForms } from '@/engine/core/lang/refs';

/** "1 house" or "3 houses": a name the game declares is plural, so a count of one takes the ending off (the form with the most off). */
export function counted(n: number, name: string): string {
  const singulars = singularForms(name);
  return `${n} ${n === 1 && singulars.length > 0 ? singulars[singulars.length - 1] : name}`;
}
