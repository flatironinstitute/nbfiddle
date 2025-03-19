import CodeCellView from "@components/CodeCellView";
import MarkdownCellView from "@components/MarkdownCellView";
import ScrollY from "@components/ScrollY";
import Toolbar from "@components/Toolbar";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CodeIcon from "@mui/icons-material/Code";
import DeleteIcon from "@mui/icons-material/Delete";
import TextSnippetIcon from "@mui/icons-material/TextSnippet";
import { Alert, IconButton, Paper } from "@mui/material";
import {
  appendCellToNotebook,
  emptyCodeCell,
  emptyMarkdownCell,
  ImmutableCodeCell,
  ImmutableMarkdownCell,
  ImmutableNotebook,
} from "@nteract/commutable";
import { FunctionComponent, useCallback, useEffect, useState } from "react";
import PythonSessionClient from "../../jupyter/PythonSessionClient";
import { ParsedUrlParams } from "../../shared/util/indexedDb";
import { ExecutionState } from "./notebook/notebook-execution";
import getGlobalEnterPressManager from "@components/globalEnterPressManager";

type NotebookViewComponentProps = {
  width: number;
  height: number;
  loadError: string | undefined;
  onJupyterConfigClick?: () => void;
  currentCellExecution: ExecutionState;
  onRestartSession: () => void;
  sessionClient: PythonSessionClient | null;
  onClearOutputs: () => void;
  onClearNotebook: () => void;
  onCancel: () => void;
  onSaveGist: (token: string, fileName: string) => Promise<string>;
  onUpdateGist: (token: string) => Promise<void>;
  notebook: ImmutableNotebook;
  parsedUrlParams: ParsedUrlParams | null;
  hasLocalChanges: boolean;
  resetToRemoteVersion: () => void;
  onDownload: () => void;
  paperRef: React.RefObject<HTMLDivElement>;
  onExecute: (o: { advance: boolean }) => void;
  onClearUrlParams: () => void;
  onGoToPreviousCell: () => void;
  onGoToNextCell: () => void;
  onToggleCellType: (cellId: string) => void;
  onAddCellBeforeCell: (cellId: string) => void;
  onAddCellAfterCell: (cellId: string) => void;
  onDeleteCell: (cellId: string) => void;
  activeCellId: string | undefined;
  setActiveCellId: (id: string | undefined) => void;
  setNotebook: (n: ImmutableNotebook) => void;
  cellIdRequiringFocus: string | null;
  setCellIdRequiringFocus: (id: string | null) => void;
};

const NotebookViewComponent: FunctionComponent<NotebookViewComponentProps> = ({
  width,
  height,
  loadError,
  onJupyterConfigClick,
  currentCellExecution,
  onRestartSession,
  sessionClient,
  onClearOutputs,
  onClearNotebook,
  onCancel,
  onSaveGist,
  onUpdateGist,
  notebook,
  parsedUrlParams,
  hasLocalChanges,
  resetToRemoteVersion,
  paperRef,
  onExecute,
  onGoToPreviousCell,
  onGoToNextCell,
  onClearUrlParams,
  onToggleCellType,
  onAddCellBeforeCell,
  onAddCellAfterCell,
  onDeleteCell,
  activeCellId,
  setActiveCellId,
  setNotebook,
  cellIdRequiringFocus,
  setCellIdRequiringFocus,
}) => {
  const isMobile = width <= 800;
  const [hoveredCellId, setHoveredCellId] = useState<string | null>(null);

  const [markdownCellIdsBeingEdited, setMarkdownCellIdsBeingEdited] = useState<
    Set<string>
  >(new Set());

  const onShiftEnter = useCallback(() => {
    setMarkdownCellIdsBeingEdited(
      (x) => new Set([...x].filter((a) => a !== activeCellId)),
    );
    onExecute({ advance: true });
  }, [onExecute, activeCellId]);

  const onCtrlEnter = useCallback(() => {
    setMarkdownCellIdsBeingEdited(
      (x) => new Set([...x].filter((a) => a !== activeCellId)),
    );
    onExecute({ advance: false });
  }, [onExecute, activeCellId]);

  useEffect(() => {
    getGlobalEnterPressManager().registerShiftEnterCallback(onShiftEnter);
    getGlobalEnterPressManager().registerCtrlEnterCallback(onCtrlEnter);

    return () => {
      getGlobalEnterPressManager().unregisterShiftEnterCallback(onShiftEnter);
      getGlobalEnterPressManager().unregisterCtrlEnterCallback(onCtrlEnter);
    };
  }, [onShiftEnter, onCtrlEnter]);

  const horizontalMargin = 10;
  const maxWidth = 1200;
  const notebookWidth = Math.min(width - horizontalMargin * 2, maxWidth) - 15; // - 15 to leave room for the scrollbar
  const leftPadding = Math.max((width - notebookWidth) / 2, horizontalMargin);
  return (
    <>
      {loadError && (
        <Alert severity="error" sx={{ m: 2 }}>
          {loadError}
        </Alert>
      )}
      <div
        style={{
          position: "relative",
          left: leftPadding,
          width: notebookWidth,
        }}
      >
        <Toolbar
          executingCellId={currentCellExecution.executingCellId}
          onRestartSession={onRestartSession}
          sessionClient={sessionClient}
          onCancel={onCancel}
          parsedUrlParams={parsedUrlParams}
          hasLocalChanges={hasLocalChanges}
          onResetToRemote={resetToRemoteVersion}
          onUpdateGist={onUpdateGist}
          onSaveGist={onSaveGist}
          notebook={notebook}
          onSetNotebook={setNotebook}
          onClearUrlParams={onClearUrlParams}
          onJupyterConfigClick={onJupyterConfigClick}
          onClearOutputs={onClearOutputs}
          onClearNotebook={onClearNotebook}
        />
      </div>
      <ScrollY
        width={width}
        height={height - 70}
        dataTestId="notebook-scroll-container"
      >
        <div style={{ padding: `8px ${leftPadding}px` }}>
          <Paper
            elevation={1}
            sx={{
              width: notebookWidth, // figure out a better way to do this
              minHeight: 200,
              backgroundColor: "background.paper",
              padding: 0,
              borderRadius: 1,
              "&:hover": { boxShadow: 2 },
            }}
            ref={paperRef}
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                if (event.shiftKey) {
                  if (
                    activeCellId &&
                    markdownCellIdsBeingEdited.has(activeCellId)
                  ) {
                    setMarkdownCellIdsBeingEdited(
                      (x) => new Set([...x].filter((a) => a !== activeCellId)),
                    );
                  }
                  onExecute({ advance: true });
                } else if (event.ctrlKey || event.metaKey) {
                  if (
                    activeCellId &&
                    markdownCellIdsBeingEdited.has(activeCellId)
                  ) {
                    setMarkdownCellIdsBeingEdited(
                      (x) => new Set([...x].filter((a) => a !== activeCellId)),
                    );
                  }
                  onExecute({ advance: false });
                }
              } else if (event.key === "ArrowUp") {
                onGoToPreviousCell();
                event.preventDefault();
              } else if (event.key === "ArrowDown") {
                onGoToNextCell();
                event.preventDefault();
              } else if (event.key === "a" && activeCellId) {
                onAddCellBeforeCell(activeCellId);
              } else if (event.key === "b" && activeCellId) {
                onAddCellAfterCell(activeCellId);
              } else if (event.key === "x" && activeCellId) {
                onDeleteCell(activeCellId);
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
                    position: "relative",
                  }}
                  onMouseEnter={() => setHoveredCellId(cellId)}
                  onMouseLeave={() => setHoveredCellId(null)}
                  onClick={() => {
                    setActiveCellId(cellId);
                  }}
                >
                  {((isMobile && cellId === activeCellId) ||
                    (!isMobile && cellId === hoveredCellId)) && (
                    // tool buttons
                    <div
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        display: "flex",
                        gap: 4,
                        zIndex: 100,
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddCellBeforeCell(cellId);
                        }}
                        title="Insert cell before"
                      >
                        <AddCircleIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddCellAfterCell(cellId);
                        }}
                        title="Insert cell after"
                      >
                        <AddCircleOutlineIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleCellType(cellId || "");
                        }}
                        title={
                          cell.cell_type === "code"
                            ? "Convert to Markdown"
                            : "Convert to Code"
                        }
                      >
                        {cell.cell_type === "markdown" ? (
                          <TextSnippetIcon fontSize="small" />
                        ) : (
                          <CodeIcon fontSize="small" />
                        )}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCell(cellId);
                        }}
                        title="Delete cell"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </div>
                  )}
                  <div
                    className="Cell"
                    style={{ display: "flex", alignItems: "flex-start" }}
                  >
                    <div
                      className="CellLeftPart"
                      style={{
                        width: "50px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        paddingRight: "10px",
                        userSelect: "none",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "monospace",
                          color: "#999",
                          marginBottom: "4px",
                        }}
                      >
                        {currentCellExecution.executingCellId === cellId
                          ? "[*]:"
                          : currentCellExecution.cellExecutionCounts[cellId]
                            ? `[${currentCellExecution.cellExecutionCounts[cellId]}]:`
                            : " "}
                      </div>
                      {cellId === activeCellId &&
                      (cell.cell_type === "markdown" || sessionClient) ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (cell.cell_type === "markdown") {
                              setMarkdownCellIdsBeingEdited(
                                (x) =>
                                  new Set([...x].filter((a) => a !== cellId)),
                              );
                            }
                            onExecute({ advance: true });
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
                      ) : null}
                      {cellId === activeCellId &&
                      cell.cell_type === "code" &&
                      !sessionClient ? (
                        <div
                          style={{
                            color: "#944",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onJupyterConfigClick?.();
                          }}
                          title="Click to configure Jupyter connection"
                        >
                          Not connected
                        </div>
                      ) : null}
                    </div>
                    <div className="CellMainPart" style={{ flex: 1 }}>
                      {cell.cell_type === "code" ? (
                        <CodeCellView
                          key={cellId}
                          width={notebookWidth - 120} // figure out a better way to do this
                          cell={cell}
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
                          onFocus={() => setActiveCellId(cellId)}
                        />
                      ) : cell.cell_type === "markdown" ? (
                        <MarkdownCellView
                          key={cellId}
                          width={notebookWidth - 120} // figure out a better way to do this
                          cell={cell}
                          onChange={(newCell: ImmutableMarkdownCell) => {
                            const newNotebook = notebook.setIn(
                              ["cellMap", cellId],
                              newCell,
                            );
                            setNotebook(newNotebook);
                          }}
                          isEditing={markdownCellIdsBeingEdited.has(cellId)}
                          onStartEditing={() => {
                            setMarkdownCellIdsBeingEdited(
                              (x) => new Set([...x, cellId]),
                            );
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
            <div>&nbsp;</div>
            <div>&nbsp;</div>
            <div>&nbsp;</div>
            <div>&nbsp;</div>
            <div>&nbsp;</div>
          </Paper>
        </div>
      </ScrollY>
    </>
  );
};

export default NotebookViewComponent;
