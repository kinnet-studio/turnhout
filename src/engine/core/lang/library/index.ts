import { PhraseLibrary, STATIC_TYPES } from '../phrases';
import { VOCAB_TYPES } from '../refs';
import { registerAmountPhrases } from './amount-phrases';
import { registerAttachPhrases } from './attach-phrases';
import { registerBoardPhrases } from './board-phrases';
import { registerCardPickPhrases } from './card-pick-phrases';
import { registerDebtPhrases } from './debt-phrases';
import { registerDrawPhrases } from './draw-phrases';
import { registerExamplePhrases } from './example-phrases';
import { registerFactPhrases } from './fact-phrases';
import { registerFlowPhrases } from './flow-phrases';
import { registerGameNumberPhrases } from './game-numbers';
import { registerHeartsPhrases } from './hearts';
import { registerMovePhrases } from './move-phrases';
import { registerPickPhrases } from './pick-phrases';
import { registerPlayerFactPhrases } from './player-facts';
import { registerQueuePhrases } from './queue-phrases';
import { registerRentDayPhrases } from './rent-day';
import { registerSetupPhrases } from './setup-phrases';
import { registerStackPhrases } from './stack-phrases';
import { registerStandardDeckPhrases } from './standard-deck';
import { registerTurnPhrases } from './turn-phrases';

const REGISTRARS: ((lib: PhraseLibrary) => PhraseLibrary)[] = [
  registerSetupPhrases,
  registerStackPhrases,
  registerFlowPhrases,
  registerQueuePhrases,
  registerBoardPhrases,
  registerFactPhrases,
  registerAttachPhrases,
  registerPlayerFactPhrases,
  registerDrawPhrases,
  registerDebtPhrases,
  registerGameNumberPhrases,
  registerAmountPhrases,
  registerPickPhrases,
  registerCardPickPhrases,
  registerTurnPhrases,
  registerMovePhrases,
  registerStandardDeckPhrases,
  registerHeartsPhrases,
  registerRentDayPhrases,
  registerExamplePhrases,
];

/** Every phrase that ships with the language. */
export function createDefaultLibrary(): PhraseLibrary {
  return REGISTRARS.reduce((lib, register) => register(lib), new PhraseLibrary([...STATIC_TYPES, ...VOCAB_TYPES]));
}
