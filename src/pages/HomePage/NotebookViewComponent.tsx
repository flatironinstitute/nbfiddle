import CodeCellView from "@components/CodeCellView";
import getGlobalEnterPressManager from "@components/globalEnterPressManager";
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

type NotebookViewComponentProps = {
  width: number;
  height: number;
  loadError: string | undefined;
  onJupyterConfigClick?: () => void;
  currentCellExecution: ExecutionState;
  onRestartSession: () => void;
  sessionClient: PythonSessionClient | null;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
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
  setNotebook: (n: ImmutableNotebook, o: { isTrusted?: boolean }) => void;
  cellIdRequiringFocus: string | null;
  setCellIdRequiringFocus: (id: string | null) => void;
  notebookIsTrusted: boolean;
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
  notebookIsTrusted,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
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

  const handleLogCell = (cellId: string) => {
    const c = notebook.cellMap.get(cellId);
    if (!c) {
      console.info(`Cell not found: ${cellId}`);
      return;
    }
    const a = c.asMutable().toJS();
    console.info("Cell:");
    console.info(a);
  };

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
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={canUndo}
          canRedo={canRedo}
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
              minHeight: 100,
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
              } else if (event.key === "a" && !event.ctrlKey && activeCellId) {
                onAddCellBeforeCell(activeCellId);
              } else if (event.key === "b" && !event.ctrlKey && activeCellId) {
                onAddCellAfterCell(activeCellId);
              } else if (event.key === "x" && !event.ctrlKey && activeCellId) {
                const okayToDelete = window.confirm(
                  "Are you sure you want to delete this cell?",
                );
                if (!okayToDelete) return;
                onDeleteCell(activeCellId);
              } else if (event.key === "d" && activeCellId) {
                handleLogCell(activeCellId);
              } else if (event.key === "Escape") {
                paperRef.current?.focus();
              } else if (event.key === "Home") {
                setActiveCellId(notebook.cellOrder.first());
              } else if (event.key === "End") {
                setActiveCellId(notebook.cellOrder.last());
              } else if (event.key === "z" && event.ctrlKey) {
                onUndo();
              } else if (event.key === "y" && event.ctrlKey) {
                onRedo();
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
                    backgroundColor:
                      hoveredCellId === cellId ? "#fafafa" : "transparent",
                    transition: "background-color 0.15s ease-in-out",
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
                        right: 35,
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
                          width={notebookWidth - 100} // figure out a better way to do this
                          cell={cell}
                          onChange={(newCell: ImmutableCodeCell) => {
                            const newNotebook = notebook.setIn(
                              ["cellMap", cellId],
                              newCell,
                            );
                            setNotebook(newNotebook, { isTrusted: undefined });
                          }}
                          requiresFocus={
                            cellId === activeCellId &&
                            cellIdRequiringFocus === cellId
                          }
                          onFocus={() => setActiveCellId(cellId)}
                          notebookIsTrusted={notebookIsTrusted}
                          setNotebookIsTrusted={() => {
                            setNotebook(notebook, { isTrusted: true });
                          }}
                          cellCollapsed={
                            cell.metadata.get("collapsed") || false
                          }
                          setCellCollapsed={(collapsed: boolean) => {
                            const newCell = cell.setIn(
                              ["metadata", "collapsed"],
                              collapsed,
                            );
                            const newNotebook = notebook.setIn(
                              ["cellMap", cellId],
                              newCell,
                            );
                            setNotebook(newNotebook, { isTrusted: undefined });
                          }}
                        />
                      ) : cell.cell_type === "markdown" ? (
                        <MarkdownCellView
                          key={cellId}
                          width={notebookWidth - 100} // figure out a better way to do this
                          cell={cell}
                          onChange={(newCell: ImmutableMarkdownCell) => {
                            const newNotebook = notebook.setIn(
                              ["cellMap", cellId],
                              newCell,
                            );
                            setNotebook(newNotebook, { isTrusted: undefined });
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
            <div>&nbsp;</div>
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
                  setNotebook(newNotebook, { isTrusted: undefined });
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
                  setNotebook(newNotebook, { isTrusted: undefined });
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
            {notebook.cellOrder.size === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  marginTop: "20px",
                }}
              >
                <h2 style={{ marginBottom: "20px", color: "#1976d2" }}>
                  Welcome to nbfiddle!
                </h2>
                <p style={{ fontSize: "16px", marginBottom: "20px" }}>
                  Get started by exploring our welcome notebook
                </p>
                <a
                  href="https://nbfiddle.app/?url=https://gist.github.com/magland/c5b5c777c093d8c8e9eb89857a52eb7b%23file-nbfiddle-welcome-ipynb"
                  style={{
                    display: "inline-block",
                    padding: "12px 24px",
                    backgroundColor: "#1976d2",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: "4px",
                    marginBottom: "20px",
                    fontWeight: "bold",
                  }}
                >
                  View Welcome Notebook
                </a>
              </div>
            )}
            <div>&nbsp;</div>
          </Paper>
        </div>
      </ScrollY>
    </>
  );
};

export default NotebookViewComponent;
