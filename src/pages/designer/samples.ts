import COLOR_MATCH from '@/games/color-match.rules?raw';
import HEARTS from '@/games/hearts.rules?raw';
import RENT_DAY from '@/games/rent-day.rules?raw';
import STARTUP_SIMULATOR from '@/games/startup-simulator.rules?raw';
import VENOM from '@/games/venom.rules?raw';

/** The games that ship with the language, for the designer to load and learn from. */
export const SAMPLES: { name: string; text: string }[] = [
  { name: 'Hearts', text: HEARTS },
  { name: 'Color Match', text: COLOR_MATCH },
  { name: 'Rent Day', text: RENT_DAY },
  { name: 'Startup Simulator', text: STARTUP_SIMULATOR },
  { name: 'Venom', text: VENOM },
];
