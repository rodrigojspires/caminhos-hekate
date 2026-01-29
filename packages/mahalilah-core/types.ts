export type House = {
  number: number;
  title: string;
  description: string;
};

export type Jump = {
  from: number;
  to: number;
};

export type JumpType = 'flecha' | 'cobra';

export type Rules = {
  board: {
    rows: number;
    cols: number;
    totalCells: number;
  };
  start: {
    house: number;
    index: number;
    mustRollSixToStart: boolean;
    startOnHouse: number;
  };
  finish: {
    returnToStartAfterStarted: boolean;
  };
  bounce: {
    startIndex: number;
    endIndex: number;
    skipIfLandingOnEndIndex: boolean;
  };
  promptTemplate: string;
};

export type MoveInput = {
  positionIndex: number;
  dice: number;
  hasStarted: boolean;
};

export type JumpApplied = {
  from: number;
  to: number;
  type: JumpType;
};

export type MoveResult = {
  fromIndex: number;
  toIndex: number;
  fromHouse: number;
  toHouse: number;
  dice: number;
  hasStartedBefore: boolean;
  hasStartedAfter: boolean;
  startedThisRoll: boolean;
  usedBounce: boolean;
  appliedJump: JumpApplied | null;
  shouldRecordHouseInPath: boolean;
};
