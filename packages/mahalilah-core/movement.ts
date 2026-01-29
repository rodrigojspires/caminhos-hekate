import {
  BOUNCE_END_INDEX,
  BOUNCE_START_INDEX,
  START_INDEX,
  START_ON_HOUSE,
  TOTAL_CELLS,
  getJumpTarget,
  getJumpType,
} from './rules';
import type { MoveInput, MoveResult } from './types';

function applyBounce(positionIndex: number, steps: number): { index: number; usedBounce: boolean } {
  let newPosition = positionIndex + steps;

  if (newPosition >= BOUNCE_START_INDEX && newPosition !== BOUNCE_END_INDEX) {
    let bRetrocede = false;
    newPosition = positionIndex;

    for (let i = 1; i <= steps; i += 1) {
      if (!bRetrocede) {
        if (newPosition >= BOUNCE_END_INDEX) {
          bRetrocede = true;
        }
      } else if (newPosition <= BOUNCE_START_INDEX) {
        bRetrocede = false;
      }

      newPosition = bRetrocede ? newPosition - 1 : newPosition + 1;
    }

    return { index: newPosition, usedBounce: true };
  }

  return { index: newPosition, usedBounce: false };
}

export function isCompleted(positionIndex: number, hasStarted: boolean): boolean {
  return hasStarted && positionIndex === START_INDEX;
}

export function applyMove(input: MoveInput): MoveResult {
  const fromIndex = input.positionIndex;
  const fromHouse = fromIndex + 1;
  const hasStartedBefore = input.hasStarted;

  if (!hasStartedBefore) {
    if (input.dice === 6) {
      const toIndex = START_ON_HOUSE - 1;
      return {
        fromIndex,
        toIndex,
        fromHouse,
        toHouse: toIndex + 1,
        dice: input.dice,
        hasStartedBefore,
        hasStartedAfter: true,
        startedThisRoll: true,
        usedBounce: false,
        appliedJump: null,
        shouldRecordHouseInPath: true,
      };
    }

    return {
      fromIndex,
      toIndex: fromIndex,
      fromHouse,
      toHouse: fromHouse,
      dice: input.dice,
      hasStartedBefore,
      hasStartedAfter: false,
      startedThisRoll: false,
      usedBounce: false,
      appliedJump: null,
      shouldRecordHouseInPath: false,
    };
  }

  const bounce = applyBounce(fromIndex, input.dice);
  let candidateIndex = bounce.index;
  let appliedJump: MoveResult['appliedJump'] = null;

  const jumpTarget = getJumpTarget(candidateIndex + 1);
  if (jumpTarget !== null) {
    appliedJump = {
      from: candidateIndex + 1,
      to: jumpTarget,
      type: getJumpType(candidateIndex + 1) ?? (jumpTarget > candidateIndex + 1 ? 'flecha' : 'cobra'),
    };
    candidateIndex = jumpTarget - 1;
  }

  if (candidateIndex >= TOTAL_CELLS) {
    candidateIndex = TOTAL_CELLS - 1;
  }

  return {
    fromIndex,
    toIndex: candidateIndex,
    fromHouse,
    toHouse: candidateIndex + 1,
    dice: input.dice,
    hasStartedBefore,
    hasStartedAfter: true,
    startedThisRoll: false,
    usedBounce: bounce.usedBounce,
    appliedJump,
    shouldRecordHouseInPath: true,
  };
}
