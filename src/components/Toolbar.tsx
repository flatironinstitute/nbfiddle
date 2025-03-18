import CancelIcon from "@mui/icons-material/Cancel";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DownloadIcon from "@mui/icons-material/Download";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import SaveIcon from "@mui/icons-material/Save";
import GitHubIcon from "@mui/icons-material/GitHub";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Toolbar as MuiToolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { ImmutableNotebook } from "@nteract/commutable";
import { FunctionComponent, useState } from "react";
import { useJupyterConnectivity } from "../jupyter/JupyterConnectivity";
import PythonSessionClient from "../jupyter/PythonSessionClient";
import { ParsedUrlParams } from "../shared/util/indexedDb";
import { fromJS } from "@nteract/commutable";
import CloudSaveDialog from "./CloudSaveDialog";
import DownloadOptionsDialog from "./DownloadOptionsDialog";
import FileUploadDialog from "./FileUploadDialog";
import LocalSaveDialog from "./LocalSaveDialog";
import { convertFromJupytext } from "../pages/HomePage/notebook/notebookFileOperations";

type ToolbarProps = {
  onSetNotebook: (notebook: ImmutableNotebook) => void;
  onClearUrlParams: () => void;
  onJupyterConfigClick?: () => void;
  executingCellId: string | null;
  onRestartSession: () => void;
  sessionClient: PythonSessionClient | null;
  onCancel?: () => void;
  parsedUrlParams: ParsedUrlParams | null;
  hasLocalChanges?: boolean;
  onResetToRemote?: () => void;
  onUpdateGist: (token: string) => Promise<void>;
  onSaveGist: (token: string, fileName: string) => Promise<string>;
  notebook: ImmutableNotebook;
};

const Toolbar: FunctionComponent<ToolbarProps> = ({
  executingCellId,
  onRestartSession,
  sessionClient,
  onCancel,
  parsedUrlParams,
  hasLocalChanges,
  onResetToRemote,
  onUpdateGist,
  onSaveGist,
  notebook,
  onSetNotebook,
  onClearUrlParams,
  onJupyterConfigClick,
}) => {
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [cloudSaveDialogOpen, setCloudSaveDialogOpen] = useState(false);
  const [downloadOptionsDialogOpen, setDownloadOptionsDialogOpen] =
    useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [localSaveDialogOpen, setLocalSaveDialogOpen] = useState(false);

  const handleRestartSession = () => {
    setRestartDialogOpen(false);
    onRestartSession();
  };

  const handleResetToRemote = () => {
    setResetDialogOpen(false);
    onResetToRemote?.();
  };

  const { jupyterServerIsAvailable } = useJupyterConnectivity();

  const getConnectionStatus = () => {
    if (sessionClient) {
      return {
        color: "#4caf50",
      };
    }
    if (jupyterServerIsAvailable) {
      return {
        color: "#ff9800",
        text: "Starting session...",
      };
    }
    return {
      color: "#d32f2f",
      text: "No Jupyter server",
    };
  };

  const a = parsedUrlParams
    ? parsedUrlParams.type === "github"
      ? `${parsedUrlParams.owner}/${parsedUrlParams.repo}/${parsedUrlParams.path}`
      : parsedUrlParams.type === "gist"
        ? `${parsedUrlParams.owner}/${parsedUrlParams.gistId}/${parsedUrlParams.gistFileMorphed}`
        : "Invalid parsedUrlParams"
    : null;

  const status = getConnectionStatus();
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <MuiToolbar
        variant="dense"
        sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexGrow: 1,
            userSelect: "none",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              cursor: "pointer",
              "&:hover": {
                opacity: 0.8,
              },
            }}
            onClick={() => onJupyterConfigClick?.()}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: status.color,
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {status.text}
            </Typography>
          </Box>
          {executingCellId ? (
            <Tooltip title={`Executing cell`}>
              <CircularProgress size={20} color="primary" />
            </Tooltip>
          ) : sessionClient ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontFamily: "monospace", cursor: "pointer" }}
              onClick={() => onJupyterConfigClick?.()}
            >
              Ready
            </Typography>
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontFamily: "monospace", cursor: "pointer" }}
              onClick={() => onJupyterConfigClick?.()}
            >
              Not connected
            </Typography>
          )}

          {parsedUrlParams && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <GitHubIcon fontSize="small" />
              <Tooltip title={a}>
                <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                  {a}
                </Typography>
              </Tooltip>
              {hasLocalChanges && (
                <Typography
                  variant="body2"
                  color="warning.main"
                  sx={{ fontStyle: "italic" }}
                >
                  (Modified)
                </Typography>
              )}
              {hasLocalChanges && onResetToRemote && (
                <Tooltip
                  title={
                    parsedUrlParams.type === "github"
                      ? "Reset to GitHub version"
                      : parsedUrlParams.type === "gist"
                        ? "Reset to Gist version"
                        : "Invalid parsedUrlParams"
                  }
                >
                  <IconButton
                    size="small"
                    onClick={() => setResetDialogOpen(true)}
                  >
                    <RestartAltIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Save Locally">
            <IconButton
              size="small"
              color="primary"
              onClick={() => setLocalSaveDialogOpen(true)}
            >
              <SaveIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Save to cloud">
            <IconButton
              size="small"
              color="primary"
              onClick={() => setCloudSaveDialogOpen(true)}
            >
              <CloudUploadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download Options">
            <IconButton
              size="small"
              color="primary"
              onClick={() => setDownloadOptionsDialogOpen(true)}
            >
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Upload Notebook">
            <IconButton
              size="small"
              color="primary"
              onClick={() => setUploadDialogOpen(true)}
            >
              <FileUploadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Restart Kernel">
            <span>
              <IconButton
                size="small"
                color="primary"
                onClick={() => setRestartDialogOpen(true)}
                disabled={!jupyterServerIsAvailable}
              >
                <RestartAltIcon />
              </IconButton>
            </span>
          </Tooltip>
          {executingCellId && onCancel && (
            <Tooltip title="Cancel Execution">
              <IconButton size="small" color="error" onClick={onCancel}>
                <CancelIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </MuiToolbar>

      <Dialog
        open={restartDialogOpen}
        onClose={() => setRestartDialogOpen(false)}
        aria-labelledby="restart-dialog-title"
      >
        <DialogTitle id="restart-dialog-title">Restart Kernel?</DialogTitle>
        <DialogContent>
          This will clear all kernel state. Any variables or imports in your
          current session will be lost.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestartDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleRestartSession}
            color="primary"
            variant="contained"
          >
            Restart
          </Button>
        </DialogActions>
      </Dialog>

      {cloudSaveDialogOpen && (
        <CloudSaveDialog
          open={true}
          onClose={() => setCloudSaveDialogOpen(false)}
          parsedUrlParams={parsedUrlParams}
          onSaveGist={onSaveGist}
          onUpdateGist={onUpdateGist}
          notebook={notebook}
        />
      )}

      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        aria-labelledby="reset-dialog-title"
      >
        <DialogTitle id="reset-dialog-title">
          {parsedUrlParams?.type === "github"
            ? "Reset to GitHub Version?"
            : parsedUrlParams?.type === "gist"
              ? "Reset to Gist Version?"
              : "Invalid parsedUrlParams"}
        </DialogTitle>
        <DialogContent>
          This will discard all local changes and reset the notebook to the
          version from{" "}
          {parsedUrlParams?.type === "github"
            ? "GitHub"
            : parsedUrlParams?.type === "gist"
              ? "the gist"
              : "Invalid parsedUrlParams"}
          .
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleResetToRemote}
            color="error"
            variant="contained"
          >
            Reset
          </Button>
        </DialogActions>
      </Dialog>

      <DownloadOptionsDialog
        open={downloadOptionsDialogOpen}
        onClose={() => setDownloadOptionsDialogOpen(false)}
        notebook={notebook}
        remoteNotebookFilePath={
          parsedUrlParams?.type === "github"
            ? parsedUrlParams.path
            : parsedUrlParams?.type === "gist"
              ? parsedUrlParams.gistFileMorphed
              : null
        }
      />

      <LocalSaveDialog
        open={localSaveDialogOpen}
        onClose={() => setLocalSaveDialogOpen(false)}
      />

      <FileUploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onFileSelected={async (file) => {
          const content = await file.text();
          if (file.name.endsWith(".py")) {
            // Convert from jupytext
            const notebook = convertFromJupytext(content);
            onClearUrlParams();
            onSetNotebook(notebook);
          } else if (file.name.endsWith(".ipynb")) {
            // Parse as ipynb
            const notebookData = JSON.parse(content);
            const notebook = fromJS(notebookData);
            onClearUrlParams();
            onSetNotebook(notebook);
          }
          // Clear URL params without reloading
          onClearUrlParams();
        }}
        onContentPasted={(jupytext) => {
          // Convert from jupytext
          const notebook = convertFromJupytext(jupytext);
          // Clear URL params first
          onClearUrlParams();
          onSetNotebook(notebook);
        }}
      />
    </AppBar>
  );
};

export default Toolbar;
