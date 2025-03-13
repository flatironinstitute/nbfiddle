import CodeCellView from "@components/CodeCellView";
import ScrollY from "@components/ScrollY";
import Toolbar from "@components/Toolbar";
import { Paper } from "@mui/material";
import {
  appendCellToNotebook,
  deleteCell,
  emptyCodeCell,
  emptyNotebook,
  ImmutableCodeCell,
  ImmutableNotebook,
  insertCellAfter,
  insertCellAt,
} from "@nteract/commutable";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import PythonSessionClient from "../../jupyter/PythonSessionClient";
import executeCell from "./executeCell";
import { useJupyterConnectivity } from "../../jupyter/JupyterConnectivity";

type HomePageProps = { width: number; height: number };

const initialNotebook = appendCellToNotebook(
  emptyNotebook,
  emptyCodeCell.set("source", 'print("Hello from nbfiddle!")'),
);

type ExecutionState = {
  executingCellId: string | null;
  cellExecutionCounts: { [key: string]: number };
  nextExecutionCount: number;
};

type ExecutionAction =
  | { type: "start-execution"; cellId: string }
  | { type: "end-execution"; cellId: string };

const executionReducer = (
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
    default:
      return state;
  }
};

const NotebookView: FunctionComponent<HomePageProps> = ({ width, height }) => {
  const paperRef = useRef<HTMLDivElement>(null);
  const [notebook, setNotebook] = useState<ImmutableNotebook>(initialNotebook);
  const [activeCellId, setActiveCellId] = useState<string | undefined>(
    initialNotebook.cellOrder.first(),
  );
  const [cellIdRequiringFocus, setCellIdRequiringFocus] = useState<
    string | null
  >(null);

  const [currentCellExecution, dispatchExecution] = useReducer(
    executionReducer,
    { executingCellId: null, cellExecutionCounts: {}, nextExecutionCount: 1 },
  );

  const maxWidth = 1200; // Maximum width for the notebook
  const notebookWidth = Math.min(width - 48, maxWidth); // 24px padding on each side
  const leftPadding = Math.max((width - notebookWidth) / 2, 24);

  const jupyterConnectivityState = useJupyterConnectivity();

  const [sessionClient, setSessionClient] =
    useState<PythonSessionClient | null>(null);
  const handleRestartSession = useCallback(async () => {
    if (sessionClient) {
      await sessionClient.shutdown();
      setSessionClient(null);
    }
    if (jupyterConnectivityState.jupyterServerIsAvailable) {
      const newClient = new PythonSessionClient(jupyterConnectivityState);
      await newClient.initiate();
      setSessionClient(newClient);
    }
  }, [sessionClient, jupyterConnectivityState]);
  useEffect(() => {
    // if there is no session, but jupyter server is available, then restart the session
    if (!sessionClient && jupyterConnectivityState.jupyterServerIsAvailable) {
      handleRestartSession();
    }
  }, [sessionClient, jupyterConnectivityState, handleRestartSession]);

  const handleExecute = useCallback(
    async ({ advance }: { advance: boolean }) => {
      if (currentCellExecution.executingCellId) {
        console.warn("Cell already executing");
        return;
      }
      if (!sessionClient) {
        console.warn("Python session client not available");
        return;
      }
      if (!activeCellId) return;
      const cell = notebook.cellMap.get(activeCellId);
      if (!cell || cell.cell_type !== "code") return;
      const codeCell = cell as ImmutableCodeCell;

      let newNotebook = notebook;

      // clear the outputs
      const newCodeCell = codeCell.set("outputs", emptyCodeCell.outputs);
      newNotebook = newNotebook.setIn(["cellMap", activeCellId], newCodeCell);
      setNotebook(newNotebook);

      dispatchExecution({ type: "start-execution", cellId: activeCellId });

      await executeCell(newCodeCell.get("source"), sessionClient, (outputs) => {
        const newCodeCell = codeCell.set("outputs", outputs);
        newNotebook = newNotebook.setIn(["cellMap", activeCellId], newCodeCell);
        setNotebook(newNotebook);
      });

      dispatchExecution({ type: "end-execution", cellId: activeCellId });

      if (advance) {
        const currentIndex = newNotebook.cellOrder.indexOf(activeCellId);
        if (currentIndex === newNotebook.cellOrder.size - 1) {
          // Create new cell if we're at the end
          const newId: string = makeRandomId();
          const newCodeCell = emptyCodeCell.set("source", ``);
          newNotebook = insertCellAfter(
            newNotebook,
            newCodeCell,
            newId,
            activeCellId,
          );
          setActiveCellId(newId);
          setCellIdRequiringFocus(newId);
        } else {
          setActiveCellId(newNotebook.cellOrder.get(currentIndex + 1));
          paperRef.current?.focus();
          setCellIdRequiringFocus(null);
        }
      }
      setNotebook(newNotebook);
    },
    [activeCellId, notebook, currentCellExecution, sessionClient],
  );

  const handleGoToPreviousCell = useCallback(() => {
    if (!activeCellId) return;
    const currentIndex = notebook.cellOrder.indexOf(activeCellId);
    if (currentIndex > 0) {
      setActiveCellId(notebook.cellOrder.get(currentIndex - 1));
      setCellIdRequiringFocus(null);
    }
  }, [activeCellId, notebook]);

  const handleGoToNextCell = useCallback(() => {
    if (!activeCellId) return;
    const currentIndex = notebook.cellOrder.indexOf(activeCellId);
    if (currentIndex < notebook.cellOrder.size - 1) {
      setActiveCellId(notebook.cellOrder.get(currentIndex + 1));
      setCellIdRequiringFocus(null);
    }
  }, [activeCellId, notebook]);

  const handleAddCellAfterActiveCell = useCallback(() => {
    if (!activeCellId) return;
    const newId: string = makeRandomId();
    const newCodeCell = emptyCodeCell.set("source", "");
    const newNotebook = insertCellAfter(
      notebook,
      newCodeCell,
      newId,
      activeCellId,
    );
    setActiveCellId(newId);
    setCellIdRequiringFocus(null);
    setNotebook(newNotebook);
  }, [activeCellId, notebook]);

  const handleAddCellBeforeActiveCell = useCallback(() => {
    if (!activeCellId) return;
    const newId: string = makeRandomId();
    const newCodeCell = emptyCodeCell.set("source", "");
    const index = notebook.cellOrder.indexOf(activeCellId);
    if (index === -1) return;
    const newNotebook = insertCellAt(notebook, newCodeCell, newId, index);
    setActiveCellId(newId);
    setCellIdRequiringFocus(null);
    setNotebook(newNotebook);
  }, [activeCellId, notebook]);

  const handleDeleteActiveCell = useCallback(() => {
    if (!activeCellId) return;
    const index = notebook.cellOrder.indexOf(activeCellId);
    if (index === -1) return;
    const newNotebook = deleteCell(notebook, activeCellId);
    setNotebook(newNotebook);
    setActiveCellId(newNotebook.cellOrder.get(Math.max(0, index - 1)));
  }, [activeCellId, notebook]);

  return (
    <>
      <Toolbar
        executingCellId={currentCellExecution.executingCellId}
        onRestartSession={handleRestartSession}
        sessionClient={sessionClient}
      />
      <ScrollY width={width} height={height - 48}>
        <div style={{ padding: `24px ${leftPadding}px` }}>
          <Paper
            elevation={1}
            sx={{
              width: notebookWidth - (leftPadding > 24 ? 0 : 48), // Adjust width if we're at minimum padding
              minHeight: 200,
              backgroundColor: "background.paper",
              padding: 3,
              borderRadius: 1,
              "&:hover": { boxShadow: 2 },
            }}
            ref={paperRef}
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                if (event.shiftKey) {
                  handleExecute({ advance: true });
                } else if (event.ctrlKey || event.metaKey) {
                  handleExecute({ advance: false });
                }
              } else if (event.key === "ArrowUp") {
                handleGoToPreviousCell();
              } else if (event.key === "ArrowDown") {
                handleGoToNextCell();
              } else if (event.key === "a") {
                handleAddCellBeforeActiveCell();
              } else if (event.key === "b") {
                handleAddCellAfterActiveCell();
              } else if (event.key === "x") {
                handleDeleteActiveCell();
              }
              // escape
              else if (event.key === "Escape") {
                console.log("Escape");
                // need to set focus to the paper so that it unfocuses the editor in the code cell
                paperRef.current?.focus();
              }
            }}
          >
            {notebook.cellOrder.map((cellId: string) => {
              const cell = notebook.cellMap.get(cellId);
              if (!cell) return null;
              if (cell.cell_type === "code") {
                const codeCell = cell as ImmutableCodeCell;
                return (
                  <div
                    key={cellId}
                    style={{
                      border:
                        cellId === activeCellId
                          ? "2px solid #1976d2"
                          : "2px solid transparent",
                      borderRadius: 4,
                      padding: 8,
                      marginBottom: 8,
                    }}
                    onClick={() => {
                      setActiveCellId(cellId);
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start" }}>
                      <div
                        style={{
                          width: "50px",
                          textAlign: "right",
                          paddingRight: "10px",
                          fontFamily: "monospace",
                          color: "#999",
                          userSelect: "none",
                        }}
                      >
                        {currentCellExecution.executingCellId === cellId
                          ? "[*]:"
                          : currentCellExecution.cellExecutionCounts[cellId]
                            ? `[${currentCellExecution.cellExecutionCounts[cellId]}]:`
                            : " "}
                      </div>
                      <div style={{ flex: 1 }}>
                        <CodeCellView
                          key={cellId}
                          cell={codeCell}
                          onShiftEnter={() => handleExecute({ advance: true })}
                          onCtrlEnter={() => handleExecute({ advance: false })}
                          onChange={(newCell: ImmutableCodeCell) => {
                            const newNotebook = notebook.setIn(
                              ["cellMap", cellId],
                              newCell,
                            );
                            setNotebook(newNotebook);
                          }}
                          requiresFocus={
                            cellId === activeCellId &&
                            cellIdRequiringFocus === cellId
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              } else {
                return <pre>Cell of type {cell.cell_type} not supported</pre>;
              }
            })}
          </Paper>
        </div>
      </ScrollY>
    </>
  );
};

function makeRandomId() {
  return crypto.randomUUID();
}

export default NotebookView;
