import type { Graphics, Texture } from 'pixi.js';
import type { CardState } from '../core/scene';

export type FaceDraw = (g: Graphics) => void;
export type FaceRenderer = (card: CardState) => Texture | FaceDraw;

export class FaceTextureCache {
  private cache = new Map<string, Texture>();

  constructor(
    private renderer: FaceRenderer,
    private drawToTexture: (draw: FaceDraw) => Texture,
  ) {}

  get(card: CardState): Texture {
    const existing = this.cache.get(card.faceKey);
    if (existing) return existing;
    const result = this.renderer(card);
    const texture = typeof result === 'function' ? this.drawToTexture(result) : result;
    this.cache.set(card.faceKey, texture);
    return texture;
  }

  clear(): void {
    this.cache.clear();
  }
}
