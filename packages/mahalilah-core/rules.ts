import rawHouses from './houses.json';
import rawJumps from './jumps.json';
import type { House, Jump, JumpType, Rules } from './types';

export const HOUSES = rawHouses as House[];
export const JUMPS = rawJumps as Jump[];

export const BOARD_ROWS = 8;
export const BOARD_COLS = 9;
export const TOTAL_CELLS = BOARD_ROWS * BOARD_COLS;

export const START_HOUSE = 68;
export const START_INDEX = START_HOUSE - 1;
export const START_ON_HOUSE = 6;

export const BOUNCE_START_INDEX = 68;
export const BOUNCE_END_INDEX = 71;

export const PROMPT_TEMPLATE =
  'Pergunta terapêutica: Onde “{name}” aparece na minha vida hoje — e qual é a micro-ação (1 minuto) que eu escolho para sustentar ou transformar isso?';

export const RULES: Rules = {
  board: {
    rows: BOARD_ROWS,
    cols: BOARD_COLS,
    totalCells: TOTAL_CELLS,
  },
  start: {
    house: START_HOUSE,
    index: START_INDEX,
    mustRollSixToStart: true,
    startOnHouse: START_ON_HOUSE,
  },
  finish: {
    returnToStartAfterStarted: true,
  },
  bounce: {
    startIndex: BOUNCE_START_INDEX,
    endIndex: BOUNCE_END_INDEX,
    skipIfLandingOnEndIndex: true,
  },
  promptTemplate: PROMPT_TEMPLATE,
};

const jumpMap = new Map<number, number>();
JUMPS.forEach((jump) => {
  jumpMap.set(jump.from, jump.to);
});

export function getHouseByNumber(number: number): House | null {
  if (number < 1 || number > HOUSES.length) return null;
  return HOUSES[number - 1] ?? null;
}

export function getJumpTarget(fromHouse: number): number | null {
  return jumpMap.get(fromHouse) ?? null;
}

export function getJumpType(fromHouse: number): JumpType | null {
  const to = getJumpTarget(fromHouse);
  if (to === null) return null;
  return to > fromHouse ? 'flecha' : 'cobra';
}

export function getHousePrompt(number: number): string {
  const house = getHouseByNumber(number);
  const name = house?.title ? house.title : `Casa ${number}`;
  return PROMPT_TEMPLATE.replace('{name}', name);
}

export function getHouseText(number: number): string {
  const house = getHouseByNumber(number);
  const title = house?.title ? `Casa ${number} — ${house.title}` : `Casa ${number}`;
  const description = house?.description ?? '';
  const jumpTarget = getJumpTarget(number);
  const jumpText = jumpTarget ? `Atalho: ${number} → ${jumpTarget}.` : '';
  return `${title}. ${description}. ${jumpText}`.trim();
}
