import CodeCellEditor from "@components/CodeCellEditor";
import ScrollY from "@components/ScrollY";
import Toolbar from "@components/Toolbar";
import { Paper } from "@mui/material";
import {
  appendCellToNotebook,
  emptyCodeCell,
  emptyNotebook,
  ImmutableCodeCell,
  ImmutableNotebook,
  insertCellAfter,
  insertCellAt
} from "@nteract/commutable";
import { FunctionComponent, useCallback, useEffect, useReducer, useRef, useState } from "react";
import PythonSessionClient from "../../jupyter/PythonSessionClient";
import executeCell from "./executeCell";
import { useJupyterConnectivity } from "../../jupyter/JupyterConnectivity";

type HomePageProps = { width: number; height: number };

const initialNotebook = appendCellToNotebook(
  emptyNotebook,
  emptyCodeCell.set("source", 'print("Hello from nbfiddle!")')
);

type ExecutionState = {
  executingCellId: string | null;
}

type ExecutionAction = {
  type: "start-execution";
  cellId: string;
} | {
  type: "end-execution";
  cellId: string;
}

const executionReducer = (state: ExecutionState, action: ExecutionAction): ExecutionState => {
  switch (action.type) {
    case "start-execution":
      return { executingCellId: action.cellId };
    case "end-execution":
      return { executingCellId: null };
    default:
      return state;
  }
}

const NotebookView: FunctionComponent<HomePageProps> = ({ width, height }) => {
  const paperRef = useRef<HTMLDivElement>(null);
  const [notebook, setNotebook] = useState<ImmutableNotebook>(initialNotebook);
  const [activeCellId, setActiveCellId] = useState<string | undefined>(
    initialNotebook.cellOrder.first()
  );

  const [currentCellExecution, dispatchExecution] = useReducer(executionReducer, { executingCellId: null });

  const maxWidth = 1200; // Maximum width for the notebook
  const notebookWidth = Math.min(width - 48, maxWidth); // 24px padding on each side
  const leftPadding = Math.max((width - notebookWidth) / 2, 24);

  const jupyterConnectivityState = useJupyterConnectivity();

  const [sessionClient, setSessionClient] = useState<PythonSessionClient | null>(null);
  useEffect(() => {
    const client = new PythonSessionClient(jupyterConnectivityState);
    client.initiate().then(() => {
      setSessionClient(clientOld => {
        if (clientOld) {
          clientOld.shutdown();
        }
        return client;
      });
    });
  }, [jupyterConnectivityState]);

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
      newNotebook = newNotebook.setIn(
        ["cellMap", activeCellId],
        newCodeCell
      );
      setNotebook(newNotebook);

      dispatchExecution({ type: "start-execution", cellId: activeCellId });

      await executeCell(newCodeCell.get("source"), sessionClient, (outputs) => {
        const newCodeCell = codeCell.set("outputs", outputs);
        newNotebook = newNotebook.setIn(
          ["cellMap", activeCellId],
          newCodeCell
        );
        setNotebook(newNotebook);
      });

      dispatchExecution({ type: "end-execution", cellId: activeCellId });

      if (advance) {
        const currentIndex = newNotebook.cellOrder.indexOf(activeCellId);
        if (currentIndex === newNotebook.cellOrder.size - 1) {
          // Create new cell if we're at the end
          const newId: string = makeRandomId();
          const newCodeCell = emptyCodeCell.set(
            "source",
            `print("TEST new cell id: ${newId}")`
          );
          newNotebook = insertCellAfter(
            newNotebook,
            newCodeCell,
            newId,
            activeCellId
          );
          setActiveCellId(newId);
        } else {
          setActiveCellId(newNotebook.cellOrder.get(currentIndex + 1));
        }
        paperRef.current?.focus();
      }
      setNotebook(newNotebook);
    }
    , [activeCellId, notebook, currentCellExecution, sessionClient]
  );

  const handleGoToPreviousCell = useCallback(() => {
    if (!activeCellId) return;
    const currentIndex = notebook.cellOrder.indexOf(activeCellId);
    if (currentIndex > 0) {
      setActiveCellId(notebook.cellOrder.get(currentIndex - 1));
    }
  }
    , [activeCellId, notebook]
  );

  const handleGoToNextCell = useCallback(() => {
    if (!activeCellId) return;
    const currentIndex = notebook.cellOrder.indexOf(activeCellId);
    if (currentIndex < notebook.cellOrder.size - 1) {
      setActiveCellId(notebook.cellOrder.get(currentIndex + 1));
    }
  }
    , [activeCellId, notebook]
  );

  const handleAddCellAfterActiveCell = useCallback(() => {
    if (!activeCellId) return;
    const newId: string = makeRandomId();
    const newCodeCell = emptyCodeCell.set(
      "source",
      `print("TEST new cell id: ${newId}")`
    );
    const newNotebook = insertCellAfter(
      notebook,
      newCodeCell,
      newId,
      activeCellId
    );
    setActiveCellId(newId);
    setNotebook(newNotebook);
  }
    , [activeCellId, notebook]
  );

  const handleAddCellBeforeActiveCell = useCallback(() => {
    if (!activeCellId) return;
    const newId: string = makeRandomId();
    const newCodeCell = emptyCodeCell.set(
      "source",
      `print("TEST new cell id: ${newId}")`
    );
    const index = notebook.cellOrder.indexOf(activeCellId);
    if (index === -1) return;
    const newNotebook = insertCellAt(notebook, newCodeCell, newId, index);
    setActiveCellId(newId);
    setNotebook(newNotebook);
  }
    , [activeCellId, notebook]
  );

  return (
    <>
      <Toolbar executingCellId={currentCellExecution.executingCellId} />
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
            }
            else if (event.key === "ArrowUp") {
              handleGoToPreviousCell();
            }
            else if (event.key === "ArrowDown") {
              handleGoToNextCell();
            }
            else if (event.key === "a") {
              handleAddCellBeforeActiveCell();
            }
            else if (event.key === "b") {
              handleAddCellAfterActiveCell();
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
                >
                  <CodeCellEditor
                    key={cellId}
                    cell={codeCell}
                    onActivate={() => setActiveCellId(cellId)}
                    onShiftEnter={() => handleExecute({ advance: true })}
                    onCtrlEnter={() => handleExecute({ advance: false })}
                    onChange={(newCell: ImmutableCodeCell) => {
                      const newNotebook = notebook.setIn(
                        ["cellMap", cellId],
                        newCell
                      );
                      setNotebook(newNotebook);
                    }}
                  />
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
