export type ExecutionState = {
  executingCellId: string | null;
  cellExecutionCounts: { [key: string]: number };
  nextExecutionCount: number;
};

export type ExecutionAction =
  | { type: "start-execution"; cellId: string }
  | { type: "end-execution"; cellId: string }
  | { type: "clear-execution-counts" };

export const executionReducer = (
  state: ExecutionState,
  action: ExecutionAction,
): ExecutionState => {
  switch (action.type) {
    case "start-execution":
      return { ...state, executingCellId: action.cellId };
    case "end-execution":
      return {
        ...state,
        executingCellId: null,
        cellExecutionCounts: {
          ...state.cellExecutionCounts,
          [action.cellId]: state.nextExecutionCount,
        },
        nextExecutionCount: state.nextExecutionCount + 1,
      };
    case "clear-execution-counts":
      return {
        ...state,
        cellExecutionCounts: {},
        nextExecutionCount: 1,
      };
    default:
      return state;
  }
};

export const initialExecutionState: ExecutionState = {
  executingCellId: null,
  cellExecutionCounts: {},
  nextExecutionCount: 1,
};
