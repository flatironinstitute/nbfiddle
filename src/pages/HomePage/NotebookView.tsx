import CodeCellView from "@components/CodeCellView";
import MarkdownCellView from "@components/MarkdownCellView";
import ScrollY from "@components/ScrollY";
import Toolbar from "@components/Toolbar";
import { Alert, Paper } from "@mui/material";
import {
  appendCellToNotebook,
  emptyCodeCell,
  emptyMarkdownCell,
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
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useJupyterConnectivity } from "../../jupyter/JupyterConnectivity";
import {
  fetchNotebook,
  ParsedUrlParams,
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
import useCodeCompletions, {
  setCodeCompletionsEnabled,
  setSpecialContextForAI,
} from "./useCodeCompletions";
import saveAsGitHubGist, {
  updateGitHubGist,
} from "../../gists/saveAsGitHubGist";
import { useNavigate } from "react-router-dom";

setCodeCompletionsEnabled(
  localStorage.getItem("codeCompletionsEnabled") === "1",
);

type NotebookViewProps = {
  width: number;
  height: number;
  parsedUrlParams: ParsedUrlParams | null;
  localname?: string;
};

const NotebookView: FunctionComponent<NotebookViewProps> = ({
  width,
  height,
  parsedUrlParams,
  localname,
}) => {
  const paperRef = useRef<HTMLDivElement>(null);
  const [notebook, setNotebook] = useState<ImmutableNotebook>(emptyNotebook);
  const [remoteNotebookFilePath, setRemoteNotebookFilePath] = useState<
    string | null
  >(null);
  const [remoteNotebook, setRemoteNotebook] =
    useState<ImmutableNotebook | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [activeCellId, setActiveCellId] = useState<string | undefined>(
    undefined,
  );
  const [cellIdRequiringFocus, setCellIdRequiringFocus] = useState<
    string | null
  >(null);

  const navigate = useNavigate();

  // Scroll active cell into view when it changes
  useEffect(() => {
    if (activeCellId) {
      const activeElement = document.querySelector(
        `[data-cell-id="${activeCellId}"]`,
      );
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }, [activeCellId]);

  const [currentCellExecution, dispatchExecution] = useReducer(
    executionReducer,
    {
      executingCellId: null,
      cellExecutionCounts: {},
      nextExecutionCount: 1,
    },
  );

  const hasLocalChanges = useHasLocalChanges(notebook, remoteNotebook);

  const loadRemoteNotebook = useCallback(async () => {
    if (!parsedUrlParams) return;
    try {
      setLoadError(undefined);
      const { notebookContent: notebookData, filePath: notebookFilePath } =
        await fetchNotebook(parsedUrlParams);
      const reconstructedNotebook: ImmutableNotebook = fromJS(notebookData);
      setRemoteNotebook(reconstructedNotebook);
      setRemoteNotebookFilePath(notebookFilePath);
      const localModifiedNotebook = await loadNotebookFromStorage(
        parsedUrlParams,
        localname,
      );
      const localModifiedNotebookReconstructed: ImmutableNotebook | null =
        localModifiedNotebook ? fromJS(localModifiedNotebook) : null;
      const notebook0 =
        localModifiedNotebookReconstructed || reconstructedNotebook;

      setNotebook(notebook0);
      if (notebook0.cellOrder.size > 0) {
        setActiveCellId(notebook0.cellOrder.first());
      }
    } catch (error) {
      console.error("Error loading GitHub or Gist notebook:", error);
      setLoadError(
        `Failed to load notebook from GitHub or Gist: ${(error as Error).message}`,
      );
    }
  }, [parsedUrlParams, localname]);

  const resetToRemoteVersion = useCallback(() => {
    if (remoteNotebook) {
      setNotebook(remoteNotebook);
      if (remoteNotebook.cellOrder.size > 0) {
        setActiveCellId(remoteNotebook.cellOrder.first());
      }
    }
  }, [remoteNotebook]);

  // Load saved notebook on mount or when GitHub params change
  useEffect(() => {
    if (parsedUrlParams) {
      loadRemoteNotebook();
    } else {
      loadNotebookFromStorage(parsedUrlParams, localname)
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
  }, [parsedUrlParams, loadRemoteNotebook, localname]);

  // Save notebook on changes with debouncing
  useEffect(() => {
    saveNotebookToStorageDebounced(toJS(notebook), parsedUrlParams, localname);
  }, [notebook, parsedUrlParams, localname]);

  const maxWidth = 1200;
  const notebookWidth = Math.min(width - 48, maxWidth);
  const leftPadding = Math.max((width - notebookWidth) / 2, 24);

  const handleDownload = useCallback(() => {
    downloadNotebook(notebook, localname, remoteNotebookFilePath);
  }, [notebook, localname, remoteNotebookFilePath]);

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
      if (currentCellExecution.executingCellId) {
        console.warn("Cell already executing");
        return;
      }
      if (!activeCellId) return;
      const cell = notebook.cellMap.get(activeCellId);
      if (!cell) return;

      let newNotebook = notebook;
      if (cell.cell_type === "code") {
        if (!sessionClient) {
          console.warn("Python session client not available");
          return;
        }
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
      } else if (cell.cell_type === "markdown") {
        dispatchExecution({ type: "start-execution", cellId: activeCellId });
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

  const handleToggleCellType = useCallback(() => {
    if (!activeCellId) return;
    const cell = notebook.cellMap.get(activeCellId);
    if (!cell) return;
    // Create new cell of opposite type with same source
    let newCell;
    if (cell.cell_type === "code") {
      newCell = emptyMarkdownCell
        .set("source", cell.get("source"))
        .set("metadata", cell.get("metadata"));
    } else if (cell.cell_type === "markdown") {
      newCell = emptyCodeCell
        .set("source", cell.get("source"))
        .set("metadata", cell.get("metadata"));
    }
    const newNotebook = notebook.setIn(["cellMap", activeCellId], newCell);
    setNotebook(newNotebook);
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

  useEffect(() => {
    // All code in cells leading up to the active cell
    let codeCells = "";
    for (const cellId of notebook.cellOrder) {
      if (cellId === activeCellId) break;
      const cell = notebook.cellMap.get(cellId);
      if (!cell) continue;
      if (cell.cell_type === "code") {
        codeCells += cell.get("source") + "\n\n";
      }
    }
    setSpecialContextForAI(codeCells);
  }, [notebook, activeCellId]);

  useCodeCompletions();

  const handleSaveGist = useMemo(
    () => async (token: string, fileName: string) => {
      const gistUri = await saveAsGitHubGist(
        {
          [fileName]: JSON.stringify(toJS(notebook), null, 2),
        },
        {
          defaultDescription: "Notebook saved from nbfiddle",
          personalAccessToken: token,
        },
      );
      setRemoteNotebook(fromJS(toJS(notebook)));
      // replace special characters with "-"
      const morphedFileName = fileName.replace(/[^a-zA-Z0-9]/g, "-");
      navigate(`?url=${gistUri}%23file-${morphedFileName}`);
    },
    [notebook, navigate],
  );

  const handleUpdateGist = useMemo(
    () => async (token: string) => {
      if (!remoteNotebookFilePath) {
        throw new Error("No remote notebook file path");
      }
      if (!parsedUrlParams) {
        throw new Error("No parsed URL params");
      }
      if (parsedUrlParams.type !== "gist") {
        throw new Error("Not a Gist");
      }
      const gistUri = `https://gist.github.com/${parsedUrlParams.owner}/${parsedUrlParams.gistId}`;
      await updateGitHubGist(
        gistUri,
        { [remoteNotebookFilePath]: JSON.stringify(toJS(notebook), null, 2) },
        {
          personalAccessToken: token,
        },
      );
      setRemoteNotebook(fromJS(toJS(notebook)));
    },
    [notebook, remoteNotebookFilePath, parsedUrlParams],
  );

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
        parsedUrlParams={parsedUrlParams}
        hasLocalChanges={hasLocalChanges}
        onResetToRemote={resetToRemoteVersion}
        onDownload={handleDownload}
        activeCellType={
          activeCellId
            ? notebook.cellMap.get(activeCellId)?.get("cell_type", undefined)
            : undefined
        }
        onToggleCellType={activeCellId ? handleToggleCellType : undefined}
        onUpdateGist={handleUpdateGist}
        onSaveGist={handleSaveGist}
        notebook={notebook}
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
              return (
                <div
                  key={cellId}
                  data-cell-id={cellId}
                  style={{
                    border:
                      cellId === activeCellId
                        ? "2px solid #1976d2"
                        : "2px solid #f0f0f0",
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
                        display: "flex",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        paddingRight: "10px",
                        userSelect: "none",
                      }}
                    >
                      {cellId === activeCellId &&
                      (cell.cell_type === "markdown" || sessionClient) ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExecute({ advance: true });
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 2,
                            color: "#1976d2",
                            fontSize: "20px",
                            display: "flex",
                            alignItems: "center",
                          }}
                          title="Run cell and advance"
                        >
                          ▶
                        </button>
                      ) : (
                        <div style={{ fontFamily: "monospace", color: "#999" }}>
                          {currentCellExecution.executingCellId === cellId
                            ? "[*]:"
                            : currentCellExecution.cellExecutionCounts[cellId]
                              ? `[${currentCellExecution.cellExecutionCounts[cellId]}]:`
                              : " "}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      {cell.cell_type === "code" ? (
                        <CodeCellView
                          key={cellId}
                          cell={cell}
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
                      ) : cell.cell_type === "markdown" ? (
                        <MarkdownCellView
                          key={cellId}
                          cell={cell}
                          onShiftEnter={() => handleExecute({ advance: true })}
                          onCtrlEnter={() => handleExecute({ advance: false })}
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
            })}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "10px",
                marginTop: "20px",
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
              <button
                onClick={() => {
                  const newMarkdownCell = emptyMarkdownCell.set("source", "");
                  const newNotebook = appendCellToNotebook(
                    notebook,
                    newMarkdownCell,
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
                Add Markdown Cell
              </button>
            </div>
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
