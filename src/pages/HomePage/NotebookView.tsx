/* eslint-disable @typescript-eslint/no-explicit-any */
import CodeCellView from "@components/CodeCellView";
import ScrollY from "@components/ScrollY";
import Toolbar from "@components/Toolbar";
import { Alert, Paper } from "@mui/material";
import {
  appendCellToNotebook,
  deleteCell,
  emptyCodeCell,
  emptyNotebook,
  fromJS,
  ImmutableCodeCell,
  ImmutableNotebook,
  insertCellAfter,
  insertCellAt,
  toJS,
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
import {
  loadNotebook,
  saveNotebookDebounced,
  GithubNotebookParams,
  setCurrentGithubParams,
  fetchGithubNotebook,
} from "../../shared/util/indexedDb";

type HomePageProps = {
  width: number;
  height: number;
  githubParams?: GithubNotebookParams;
};

const createInitialNotebook = () =>
  appendCellToNotebook(
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

const NotebookView: FunctionComponent<HomePageProps> = ({
  width,
  height,
  githubParams,
}) => {
  const paperRef = useRef<HTMLDivElement>(null);
  const [notebook, setNotebook] = useState<ImmutableNotebook>(
    createInitialNotebook(),
  );
  const [remoteNotebook, setRemoteNotebook] =
    useState<ImmutableNotebook | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [activeCellId, setActiveCellId] = useState<string | undefined>(
    createInitialNotebook().cellOrder.first(),
  );
  const [cellIdRequiringFocus, setCellIdRequiringFocus] = useState<
    string | null
  >(null);

  const [currentCellExecution, dispatchExecution] = useReducer(
    executionReducer,
    {
      executingCellId: null,
      cellExecutionCounts: {},
      nextExecutionCount: 1,
    },
  );

  const hasLocalChanges = useHasLocalChanges(notebook, remoteNotebook);

  const loadGithubNotebook = useCallback(async () => {
    if (!githubParams) return;
    try {
      setLoadError(undefined);
      const notebookData = await fetchGithubNotebook(githubParams);
      const reconstructedNotebook = fromJS(notebookData);
      setRemoteNotebook(reconstructedNotebook);
      setNotebook(reconstructedNotebook);
      if (reconstructedNotebook.cellOrder.size > 0) {
        setActiveCellId(reconstructedNotebook.cellOrder.first());
      }
    } catch (error) {
      console.error("Error loading GitHub notebook:", error);
      setLoadError(
        `Failed to load notebook from GitHub: ${(error as Error).message}`,
      );
    }
  }, [githubParams]);

  const resetToGithubVersion = useCallback(() => {
    if (remoteNotebook) {
      setNotebook(remoteNotebook);
      if (remoteNotebook.cellOrder.size > 0) {
        setActiveCellId(remoteNotebook.cellOrder.first());
      }
    }
  }, [remoteNotebook]);

  // Load saved notebook on mount or when GitHub params change
  useEffect(() => {
    setCurrentGithubParams(githubParams || null);
    if (githubParams) {
      loadGithubNotebook();
    } else {
      loadNotebook()
        .then((savedNotebook) => {
          if (savedNotebook) {
            const reconstructedNotebook = fromJS(savedNotebook);
            setNotebook(reconstructedNotebook);
            if (reconstructedNotebook.cellOrder.size > 0) {
              setActiveCellId(reconstructedNotebook.cellOrder.first());
            }
          }
        })
        .catch((error) => {
          console.error("Error loading notebook:", error);
          setLoadError("Failed to load saved notebook");
        });
    }
  }, [githubParams, loadGithubNotebook]);

  // Save notebook on changes with debouncing
  useEffect(() => {
    saveNotebookDebounced(toJS(notebook));
  }, [notebook]);

  const maxWidth = 1200;
  const notebookWidth = Math.min(width - 48, maxWidth);
  const leftPadding = Math.max((width - notebookWidth) / 2, 24);

  const jupyterConnectivityState = useJupyterConnectivity();

  const [sessionClient, setSessionClient] =
    useState<PythonSessionClient | null>(null);
  const handleRestartSession = useCallback(async () => {
    canceledRef.current = true;
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
    if (!sessionClient && jupyterConnectivityState.jupyterServerIsAvailable) {
      handleRestartSession();
    }
  }, [sessionClient, jupyterConnectivityState, handleRestartSession]);

  const canceledRef = useRef(false);

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

      const newCodeCell = codeCell.set("outputs", emptyCodeCell.outputs);
      newNotebook = newNotebook.setIn(["cellMap", activeCellId], newCodeCell);
      setNotebook(newNotebook);

      dispatchExecution({ type: "start-execution", cellId: activeCellId });

      canceledRef.current = false;
      await executeCell(
        newCodeCell.get("source"),
        sessionClient,
        (outputs) => {
          const newCodeCell = codeCell.set("outputs", outputs);
          newNotebook = newNotebook.setIn(
            ["cellMap", activeCellId],
            newCodeCell,
          );
          setNotebook(newNotebook);
        },
        canceledRef,
      );

      dispatchExecution({ type: "end-execution", cellId: activeCellId });

      if (advance) {
        const currentIndex = newNotebook.cellOrder.indexOf(activeCellId);
        if (currentIndex === newNotebook.cellOrder.size - 1) {
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
      {loadError && (
        <Alert severity="error" sx={{ m: 2 }}>
          {loadError}
        </Alert>
      )}
      <Toolbar
        executingCellId={currentCellExecution.executingCellId}
        onRestartSession={handleRestartSession}
        sessionClient={sessionClient}
        onCancel={() => {
          canceledRef.current = true;
        }}
        githubParams={githubParams}
        hasLocalChanges={hasLocalChanges}
        onResetToGithub={resetToGithubVersion}
      />
      <ScrollY width={width} height={height - 48}>
        <div style={{ padding: `24px ${leftPadding}px` }}>
          <Paper
            elevation={1}
            sx={{
              width: notebookWidth - (leftPadding > 24 ? 0 : 48),
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
              } else if (event.key === "Escape") {
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

let dataToTest:
  | {
      notebook: ImmutableNotebook;
      remoteNotebook: ImmutableNotebook | null;
    }
  | undefined = undefined;
let testScheduled = false;
const useHasLocalChanges = (
  notebook: ImmutableNotebook,
  remoteNotebook: ImmutableNotebook | null,
) => {
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  useEffect(() => {
    dataToTest = { notebook, remoteNotebook };
    if (!testScheduled) {
      testScheduled = true;
      setTimeout(() => {
        if (dataToTest) {
          const { notebook, remoteNotebook } = dataToTest;
          setHasLocalChanges(
            remoteNotebook
              ? !checkNotebooksEqual(notebook, remoteNotebook)
              : false,
          );
          dataToTest = undefined;
          testScheduled = false;
        }
      }, 1000);
    }
  }, [notebook, remoteNotebook]);

  return hasLocalChanges;
};

const checkNotebooksEqual = (
  notebook1: ImmutableNotebook,
  notebook2: ImmutableNotebook,
) => {
  return checkDeepEqual(toJS(notebook1), toJS(notebook2));
};

const checkDeepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!checkDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!checkDeepEqual(a[key], b[key])) return false;
  }
  return true;
};

export default NotebookView;
