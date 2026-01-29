export type { House, Jump, JumpApplied, JumpType, MoveInput, MoveResult, Rules } from './types';
export { HOUSES, JUMPS, RULES } from './rules';
export {
  BOARD_COLS,
  BOARD_ROWS,
  TOTAL_CELLS,
  START_HOUSE,
  START_INDEX,
  START_ON_HOUSE,
  BOUNCE_START_INDEX,
  BOUNCE_END_INDEX,
  PROMPT_TEMPLATE,
  getHouseByNumber,
  getHousePrompt,
  getHouseText,
  getJumpTarget,
  getJumpType,
} from './rules';
export { applyMove, isCompleted } from './movement';

export { default as houses } from './houses.json';
export { default as jumps } from './jumps.json';
