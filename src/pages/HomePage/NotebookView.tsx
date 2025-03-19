import { emptyNotebook, ImmutableNotebook } from "@nteract/commutable";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useJupyterConnectivity } from "../../jupyter/JupyterConnectivity";
import {
  ParsedUrlParams,
  saveNotebookToStorageDebounced,
} from "../../shared/util/indexedDb";
import {
  executionReducer,
  initialExecutionState,
} from "./notebook/notebook-execution";
import {
  convertToJupytext,
  downloadNotebook,
} from "./notebook/notebookFileOperations";
import { useSessionClient } from "./notebook/useSessionClient";
import NotebookViewComponent from "./NotebookViewComponent";
import {
  useCellOperations,
  useExecute,
  useGoToPreviousNextCell,
  useLoadRemoteNotebook,
  useLoadSavedNotebook,
  useSaveGist,
  useScrollToActiveCell,
  useSpecialContextForAI,
  useToggleCellType,
  useUpdateGist,
} from "./NotebookViewHooks";
import serializeNotebook from "./serializeNotebook";
import useCodeCompletions, {
  setCodeCompletionsEnabled,
} from "./useCodeCompletions";
import { useHasLocalChanges } from "./utils";
import {
  setGlobalAIContext,
  setGlobalNotebookContent,
} from "../../chat/sendChatMessage";

setCodeCompletionsEnabled(
  localStorage.getItem("codeCompletionsEnabled") === "1",
);

type NotebookViewProps = {
  width: number;
  height: number;
  parsedUrlParams: ParsedUrlParams | null;
  localname?: string;
  onJupyterConfigClick?: () => void;
};

const NotebookView: FunctionComponent<NotebookViewProps> = ({
  width,
  height,
  parsedUrlParams,
  localname,
  onJupyterConfigClick,
}) => {
  const navigate = useNavigate();
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

  useScrollToActiveCell(activeCellId);

  const [currentCellExecution, dispatchExecution] = useReducer(
    executionReducer,
    initialExecutionState,
  );

  const hasLocalChanges = useHasLocalChanges(notebook, remoteNotebook);

  const loadRemoteNotebook = useLoadRemoteNotebook(
    parsedUrlParams,
    localname,
    setLoadError,
    setRemoteNotebook,
    setRemoteNotebookFilePath,
    setNotebook,
    setActiveCellId,
  );

  const resetToRemoteVersion = useCallback(() => {
    if (remoteNotebook) {
      setNotebook(remoteNotebook);
      if (remoteNotebook.cellOrder.size > 0) {
        setActiveCellId(remoteNotebook.cellOrder.first());
      }
    }
  }, [remoteNotebook]);

  // Load saved notebook on mount or when parsedUrlParams or localname changes
  useLoadSavedNotebook(
    parsedUrlParams,
    localname,
    loadRemoteNotebook,
    setLoadError,
    setNotebook,
    setActiveCellId,
  );

  // Save notebook on changes with debouncing
  useEffect(() => {
    saveNotebookToStorageDebounced(
      serializeNotebook(notebook),
      parsedUrlParams,
      localname,
    );
  }, [notebook, parsedUrlParams, localname]);

  // set the AI context
  useEffect(() => {
    if (!activeCellId) {
      setGlobalAIContext("There is no active cell");
    } else {
      const cell = notebook.cellMap.get(activeCellId);
      if (!cell) {
        setGlobalAIContext("There is no active cell");
      } else {
        setGlobalAIContext(
          `The active cell is a ${cell.cell_type} cell with the following content:\n\n${cell.source}`,
        );
      }
    }

    const jt = convertToJupytext(notebook);
    setGlobalNotebookContent(jt);
  }, [notebook, activeCellId]);

  const handleDownload = useCallback(() => {
    downloadNotebook(notebook, localname, remoteNotebookFilePath);
  }, [notebook, localname, remoteNotebookFilePath]);

  const jupyterConnectivityState = useJupyterConnectivity();

  const { sessionClient, handleRestartSession: baseHandleRestartSession } =
    useSessionClient();

  const handleRestartSession = useCallback(() => {
    baseHandleRestartSession();
    dispatchExecution({ type: "clear-execution-counts" });
  }, [baseHandleRestartSession]);

  useEffect(() => {
    if (!sessionClient && jupyterConnectivityState.jupyterServerIsAvailable) {
      handleRestartSession();
    }
  }, [sessionClient, jupyterConnectivityState, handleRestartSession]);

  const canceledRef = useRef(false);

  const handleExecute = useExecute(
    currentCellExecution,
    dispatchExecution,
    activeCellId,
    notebook,
    setNotebook,
    sessionClient,
    canceledRef,
    setActiveCellId,
    setCellIdRequiringFocus,
    paperRef,
  );

  const { handleGoToPreviousCell, handleGoToNextCell } =
    useGoToPreviousNextCell(
      activeCellId,
      setActiveCellId,
      setCellIdRequiringFocus,
      notebook,
    );

  const handleToggleCellType = useToggleCellType(notebook, setNotebook);

  const { handleAddCellBeforeCell, handleAddCellAfterCell, handleDeleteCell } =
    useCellOperations(
      notebook,
      setNotebook,
      setActiveCellId,
      setCellIdRequiringFocus,
    );

  useSpecialContextForAI(notebook, activeCellId);

  useCodeCompletions();

  const handleSaveGist = useSaveGist(notebook, setRemoteNotebook);

  const handleUpdateGist = useUpdateGist(
    notebook,
    setRemoteNotebook,
    remoteNotebookFilePath,
    parsedUrlParams,
  );

  const handleClearUrlParams = useCallback(() => {
    navigate("?", { replace: true });
  }, [navigate]);

  return (
    <NotebookViewComponent
      width={width}
      height={height}
      loadError={loadError}
      currentCellExecution={currentCellExecution}
      onRestartSession={handleRestartSession}
      sessionClient={sessionClient}
      onCancel={() => {
        canceledRef.current = true;
      }}
      onSaveGist={handleSaveGist}
      onUpdateGist={handleUpdateGist}
      notebook={notebook}
      parsedUrlParams={parsedUrlParams}
      hasLocalChanges={hasLocalChanges}
      resetToRemoteVersion={resetToRemoteVersion}
      onDownload={handleDownload}
      paperRef={paperRef}
      onExecute={handleExecute}
      onGoToPreviousCell={handleGoToPreviousCell}
      onGoToNextCell={handleGoToNextCell}
      onToggleCellType={handleToggleCellType}
      onAddCellBeforeCell={handleAddCellBeforeCell}
      onAddCellAfterCell={handleAddCellAfterCell}
      onDeleteCell={handleDeleteCell}
      activeCellId={activeCellId}
      setActiveCellId={setActiveCellId}
      setNotebook={setNotebook}
      cellIdRequiringFocus={cellIdRequiringFocus}
      setCellIdRequiringFocus={setCellIdRequiringFocus}
      onClearUrlParams={handleClearUrlParams}
      onJupyterConfigClick={onJupyterConfigClick}
    />
  );
};

export default NotebookView;
