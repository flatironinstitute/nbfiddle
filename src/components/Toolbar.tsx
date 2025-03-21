import CancelIcon from "@mui/icons-material/Cancel";
import ClearAllIcon from "@mui/icons-material/ClearAll";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import DownloadIcon from "@mui/icons-material/Download";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SaveIcon from "@mui/icons-material/Save";
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
  Menu,
  MenuItem,
  Toolbar as MuiToolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { fromJS, ImmutableNotebook } from "@nteract/commutable";
import { FunctionComponent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useJupyterConnectivity } from "../jupyter/JupyterConnectivity";
import PythonSessionClient from "../jupyter/PythonSessionClient";
import { convertFromJupytext } from "../pages/HomePage/notebook/notebookFileOperations";
import {
  ParsedUrlParams,
  saveNotebookToStorage,
} from "../shared/util/indexedDb";
import CloudSaveDialog from "./CloudSaveDialog";
import DownloadOptionsDialog from "./DownloadOptionsDialog";
import FileImportDialog from "./FileImportDialog";
import LocalSaveDialog from "./LocalSaveDialog";
import serializeNotebook from "../pages/HomePage/serializeNotebook";

type ToolbarProps = {
  onSetNotebook: (
    notebook: ImmutableNotebook,
    o: { isTrusted: boolean | undefined },
  ) => void;
  onClearUrlParams: () => void;
  onJupyterConfigClick?: () => void;
  onClearOutputs?: () => void;
  onClearNotebook?: () => void;
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
  onJupyterConfigClick,
  onClearOutputs,
  onClearNotebook,
  onSetNotebook,
}) => {
  const navigate = useNavigate();
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [cloudSaveDialogOpen, setCloudSaveDialogOpen] = useState(false);
  const [downloadOptionsDialogOpen, setDownloadOptionsDialogOpen] =
    useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [localSaveDialogOpen, setLocalSaveDialogOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchorEl);

  const handleRestartSession = () => {
    setRestartDialogOpen(false);
    onRestartSession();
  };

  const handleResetToRemote = () => {
    setResetDialogOpen(false);
    onResetToRemote?.();
  };

  const { jupyterServerIsAvailable, jupyterServerUrl } =
    useJupyterConnectivity();

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

  const status = getConnectionStatus();
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: "background.paper",
        borderBottom: "3px solid",
        marginTop: 1,
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
          <Tooltip
            title={sessionClient ? `Connected to ${jupyterServerUrl}` : ""}
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
          </Tooltip>
          {executingCellId ? (
            <Tooltip title={`Executing cell`}>
              <CircularProgress size={20} color="primary" />
            </Tooltip>
          ) : sessionClient ? (
            <Tooltip title={`Connected to ${jupyterServerUrl}`}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontFamily: "monospace", cursor: "pointer" }}
                onClick={() => onJupyterConfigClick?.()}
              >
                Ready
              </Typography>
            </Tooltip>
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
          {executingCellId && onCancel && (
            <Tooltip title="Cancel Execution">
              <IconButton size="small" color="error" onClick={onCancel}>
                <CancelIcon />
              </IconButton>
            </Tooltip>
          )}
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
          {parsedUrlParams && (
            <>
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
                <>
                  <Tooltip
                    title={
                      parsedUrlParams.type === "github"
                        ? "Reset to GitHub version"
                        : parsedUrlParams.type === "gist"
                          ? "Reset to Gist version"
                          : "Invalid parsedUrlParams"
                    }
                  >
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setResetDialogOpen(true)}
                    >
                      Revert
                    </Button>
                  </Tooltip>
                  {parsedUrlParams.type === "gist" && (
                    <Tooltip title="Update the gist with local changes">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setCloudSaveDialogOpen(true)}
                      >
                        Update Gist
                      </Button>
                    </Tooltip>
                  )}
                </>
              )}
            </>
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Notebook Actions">
            <IconButton
              size="small"
              color="primary"
              onClick={(event) => setMenuAnchorEl(event.currentTarget)}
            >
              <MoreVertIcon />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={menuAnchorEl}
            open={menuOpen}
            onClose={() => setMenuAnchorEl(null)}
          >
            <MenuItem
              onClick={() => {
                setUploadDialogOpen(true);
                setMenuAnchorEl(null);
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FileUploadIcon fontSize="small" />
                <Typography>Import notebook</Typography>
              </Box>
            </MenuItem>
            <MenuItem
              onClick={() => {
                setDownloadOptionsDialogOpen(true);
                setMenuAnchorEl(null);
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <DownloadIcon fontSize="small" />
                <Typography>Download notebook</Typography>
              </Box>
            </MenuItem>
            <MenuItem
              onClick={() => {
                setLocalSaveDialogOpen(true);
                setMenuAnchorEl(null);
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <SaveIcon fontSize="small" />
                <Typography>Save locally</Typography>
              </Box>
            </MenuItem>
            <MenuItem
              onClick={() => {
                setCloudSaveDialogOpen(true);
                setMenuAnchorEl(null);
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CloudUploadIcon fontSize="small" />
                <Typography>Save to cloud</Typography>
              </Box>
            </MenuItem>
            <MenuItem
              onClick={() => {
                onClearOutputs?.();
                setMenuAnchorEl(null);
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <ClearAllIcon fontSize="small" />
                <Typography>Clear all outputs</Typography>
              </Box>
            </MenuItem>
            <MenuItem
              onClick={() => {
                onClearNotebook?.();
                setMenuAnchorEl(null);
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <DeleteSweepIcon fontSize="small" />
                <Typography>Clear notebook</Typography>
              </Box>
            </MenuItem>
            <MenuItem
              onClick={() => {
                navigate("?localname=default");
                setMenuAnchorEl(null);
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography>Open default notebook</Typography>
              </Box>
            </MenuItem>
          </Menu>
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

      <FileImportDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onFileSelected={async (file, options) => {
          const content = await file.text();
          let notebook: ImmutableNotebook;

          if (file.name.endsWith(".py")) {
            // Convert from jupytext
            notebook = convertFromJupytext(content);
          } else if (file.name.endsWith(".ipynb")) {
            // Parse as ipynb
            const notebookData = JSON.parse(content);
            notebook = fromJS(notebookData);
          } else {
            return; // Unsupported file type
          }

          if (options.replaceExisting) {
            // If replacing existing, just set the notebook without saving to storage
            onSetNotebook(notebook, { isTrusted: false });
          } else {
            // Otherwise prompt for name and save to storage
            const name = prompt(
              "Enter a name for the notebook",
              localNameFromFileName(file.name),
            );
            if (!name) return;
            await saveNotebookToStorage(
              serializeNotebook(notebook),
              null,
              name,
              false,
            );
            navigate(`?localname=${name}`);
          }
        }}
        onContentPasted={async (jupytextOrIpynb, options) => {
          // Convert from jupytext or parse ipynb
          let notebook: ImmutableNotebook;
          try {
            // try to parse as json - then it's an ipynb
            const notebookData = JSON.parse(jupytextOrIpynb);
            notebook = fromJS(notebookData);
          } catch {
            // otherwise we assume jupytext
            notebook = convertFromJupytext(jupytextOrIpynb);
          }

          if (options.replaceExisting) {
            // If replacing existing, just set the notebook without saving to storage
            onSetNotebook(notebook, { isTrusted: false });
          } else {
            // Otherwise prompt for name and save to storage
            const name = prompt("Enter a name for the notebook", "default");
            if (!name) return;
            await saveNotebookToStorage(
              serializeNotebook(notebook),
              null,
              name,
              false,
            );
            navigate(`?localname=${name}`);
          }
        }}
      />
    </AppBar>
  );
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const localNameFromFileName = (_fileName: string) => {
  // for now we default to default
  return "default";
};

export default Toolbar;
