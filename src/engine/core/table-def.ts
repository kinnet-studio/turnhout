import type { CardState, LayoutKind, LayoutOptions, PlayerId } from './scene';

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

export interface ZoneDef {
  id: string;
  layout: LayoutKind;
  transform: { x: number; y: number; rotation?: number };
  layoutOptions?: LayoutOptions;
  bounds?: { width: number; height: number; anchor?: { x: number; y: number } };
  owner?: PlayerId | 'shared';
  visibility?: 'public' | 'owner' | 'secret';
  capacity?: number;
  accept?: { rule: string; params?: Json };
  ordering?: 'stack' | 'ordered' | 'free';
}

export interface TableDef {
  zones: ZoneDef[];
  players?: PlayerId[];
}

export interface Placement {
  cards: CardState[];
}
