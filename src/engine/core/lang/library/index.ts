import { PhraseLibrary, STATIC_TYPES } from '../phrases';
import { VOCAB_TYPES } from '../refs';
import { registerBoardPhrases } from './board-phrases';
import { registerExamplePhrases } from './example-phrases';
import { registerFlowPhrases } from './flow-phrases';
import { registerHeartsPhrases } from './hearts';
import { registerMovePhrases } from './move-phrases';
import { registerSetupPhrases } from './setup-phrases';
import { registerStandardDeckPhrases } from './standard-deck';

const REGISTRARS: ((lib: PhraseLibrary) => PhraseLibrary)[] = [
  registerSetupPhrases,
  registerFlowPhrases,
  registerBoardPhrases,
  registerMovePhrases,
  registerStandardDeckPhrases,
  registerHeartsPhrases,
  registerExamplePhrases,
];

/** Every phrase that ships with the language. */
export function createDefaultLibrary(): PhraseLibrary {
  return REGISTRARS.reduce((lib, register) => register(lib), new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES]));
}
