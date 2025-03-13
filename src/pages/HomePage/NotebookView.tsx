import CodeCellView from "@components/CodeCellView";
import MarkdownCellView from "@components/MarkdownCellView";
import ScrollY from "@components/ScrollY";
import Toolbar from "@components/Toolbar";
import { Alert, Paper } from "@mui/material";
import {
  appendCellToNotebook,
  emptyCodeCell,
  emptyNotebook,
  fromJS,
  ImmutableCodeCell,
  ImmutableMarkdownCell,
  ImmutableNotebook,
  insertCellAfter,
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
import { useJupyterConnectivity } from "../../jupyter/JupyterConnectivity";
import {
  fetchGithubNotebook,
  GithubNotebookParams,
  loadNotebookFromStorage,
  saveNotebookToStorageDebounced,
} from "../../shared/util/indexedDb";
import executeCell from "./executeCell";
import {
  addCellAfterActiveCell,
  addCellBeforeActiveCell,
  deleteActiveCell,
} from "./notebook/notebook-cell-operations";
import { executionReducer } from "./notebook/notebook-execution";
import { checkNotebooksEqual } from "./notebook/notebook-utils";
import { downloadNotebook } from "./notebook/notebookFileOperations";
import { useSessionClient } from "./notebook/useSessionClient";

type HomePageProps = {
  width: number;
  height: number;
  githubParams: GithubNotebookParams | null;
};

const NotebookView: FunctionComponent<HomePageProps> = ({
  width,
  height,
  githubParams,
}) => {
  const paperRef = useRef<HTMLDivElement>(null);
  const [notebook, setNotebook] = useState<ImmutableNotebook>(emptyNotebook);
  const [remoteNotebook, setRemoteNotebook] =
    useState<ImmutableNotebook | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [activeCellId, setActiveCellId] = useState<string | undefined>(
    undefined,
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
      const reconstructedNotebook: ImmutableNotebook = fromJS(notebookData);
      setRemoteNotebook(reconstructedNotebook);
      const localModifiedNotebook = await loadNotebookFromStorage(githubParams);
      const localModifiedNotebookReconstructed: ImmutableNotebook | null =
        localModifiedNotebook ? fromJS(localModifiedNotebook) : null;
      const notebook0 =
        localModifiedNotebookReconstructed || reconstructedNotebook;

      setNotebook(notebook0);
      if (notebook0.cellOrder.size > 0) {
        setActiveCellId(notebook0.cellOrder.first());
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
    if (githubParams) {
      loadGithubNotebook();
    } else {
      loadNotebookFromStorage(githubParams)
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
    saveNotebookToStorageDebounced(toJS(notebook), githubParams);
  }, [notebook, githubParams]);

  const maxWidth = 1200;
  const notebookWidth = Math.min(width - 48, maxWidth);
  const leftPadding = Math.max((width - notebookWidth) / 2, 24);

  const handleDownload = useCallback(() => {
    downloadNotebook(notebook, githubParams);
  }, [notebook, githubParams]);

  const jupyterConnectivityState = useJupyterConnectivity();

  const { sessionClient, handleRestartSession } = useSessionClient();
  useEffect(() => {
    if (!sessionClient && jupyterConnectivityState.jupyterServerIsAvailable) {
      handleRestartSession();
    }
  }, [sessionClient, jupyterConnectivityState, handleRestartSession]);

  const canceledRef = useRef(false);

  const handleExecute = useCallback(
    async ({ advance }: { advance: boolean }) => {
      console.log("--- handleExecute");
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
      if (!cell) return;
      let newNotebook = notebook;
      if (cell.cell_type === "code") {
        const codeCell = cell as ImmutableCodeCell;

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
      }

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
    const { newNotebook, newCellId } = addCellAfterActiveCell(
      notebook,
      activeCellId,
    );
    setActiveCellId(newCellId);
    setCellIdRequiringFocus(null);
    setNotebook(newNotebook);
  }, [activeCellId, notebook]);

  const handleAddCellBeforeActiveCell = useCallback(() => {
    if (!activeCellId) return;
    const v = addCellBeforeActiveCell(notebook, activeCellId);
    if (!v) return;
    setActiveCellId(v.newCellId);
    setCellIdRequiringFocus(null);
    setNotebook(v.newNotebook);
  }, [activeCellId, notebook]);

  const handleDeleteActiveCell = useCallback(() => {
    if (!activeCellId) return;
    const { newNotebook, newActiveCellId } = deleteActiveCell(
      notebook,
      activeCellId,
    );
    setNotebook(newNotebook);
    setActiveCellId(newActiveCellId);
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
        onDownload={handleDownload}
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
            {notebook.cellOrder.size === 0 ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "20px",
                }}
              >
                <button
                  onClick={() => {
                    const newCodeCell = emptyCodeCell.set("source", "");
                    const newNotebook = appendCellToNotebook(
                      notebook,
                      newCodeCell,
                    );
                    const newCellId = newNotebook.cellOrder.last() ?? null;
                    setNotebook(newNotebook);
                    if (newCellId) {
                      setActiveCellId(newCellId);
                      setCellIdRequiringFocus(newCellId);
                    }
                  }}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#1976d2",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Add Code Cell
                </button>
              </div>
            ) : (
              notebook.cellOrder.map((cellId: string) => {
                const cell = notebook.cellMap.get(cellId);
                if (!cell) return null;
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
                        {cell.cell_type === "code" ? (
                          <CodeCellView
                            key={cellId}
                            cell={cell}
                            onShiftEnter={() =>
                              handleExecute({ advance: true })
                            }
                            onCtrlEnter={() =>
                              handleExecute({ advance: false })
                            }
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
                        ) : cell.cell_type === "markdown" ? (
                          <MarkdownCellView
                            key={cellId}
                            cell={cell}
                            onShiftEnter={() =>
                              handleExecute({ advance: true })
                            }
                            onCtrlEnter={() =>
                              handleExecute({ advance: false })
                            }
                            onChange={(newCell: ImmutableMarkdownCell) => {
                              const newNotebook = notebook.setIn(
                                ["cellMap", cellId],
                                newCell,
                              );
                              setNotebook(newNotebook);
                            }}
                          />
                        ) : (
                          <div>Unsupported cell type: {cell.cell_type}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
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

export default NotebookView;
