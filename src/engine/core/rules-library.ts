import type { AcceptRule, RuleRegistry } from './rules';
import type { CardState } from './scene';

const RED = new Set(['H', 'D']);

function suitOf(c: CardState): string | undefined {
  return typeof c.data?.suit === 'string' ? c.data.suit : undefined;
}
function rankOf(c: CardState): number | undefined {
  return typeof c.data?.rank === 'number' ? c.data.rank : undefined;
}
function tagsOf(c: CardState): string[] {
  return Array.isArray(c.data?.tags) ? (c.data!.tags as string[]) : [];
}
function isRed(c: CardState): boolean | undefined {
  const s = suitOf(c);
  return s === undefined ? undefined : RED.has(s);
}

const alwaysAccept: AcceptRule = () => true;

const descAltColor: AcceptRule = ({ card, top }) => {
  const cr = rankOf(card);
  if (cr === undefined) return false;
  if (!top) return cr === 13; // only a King starts an empty column
  const tr = rankOf(top);
  const cRed = isRed(card);
  const tRed = isRed(top);
  return tr !== undefined && cRed !== undefined && tRed !== undefined && cRed !== tRed && cr === tr - 1;
};

const sameSuitAscending: AcceptRule = ({ card, top }) => {
  const cr = rankOf(card);
  if (cr === undefined) return false;
  if (!top) return cr === 1; // Ace starts a foundation
  const tr = rankOf(top);
  return tr !== undefined && suitOf(card) === suitOf(top) && cr === tr + 1;
};

const matchRankOrSuit: AcceptRule = ({ card, top }) => {
  if (!top) return true;
  return suitOf(card) === suitOf(top) || rankOf(card) === rankOf(top);
};

const byTag: AcceptRule = ({ card, params }) => {
  const required = (params as { tags?: string[] } | undefined)?.tags ?? [];
  const have = new Set(tagsOf(card));
  return required.every((t) => have.has(t));
};

const emptyOnly: AcceptRule = ({ zoneCards }) => zoneCards.length === 0;

export function registerStarterRules(registry: RuleRegistry): RuleRegistry {
  return registry
    .register('alwaysAccept', alwaysAccept)
    .register('descAltColor', descAltColor)
    .register('sameSuitAscending', sameSuitAscending)
    .register('matchRankOrSuit', matchRankOrSuit)
    .register('byTag', byTag)
    .register('emptyOnly', emptyOnly);
}
