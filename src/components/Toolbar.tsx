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
import { FunctionComponent, useState } from "react";
import { useJupyterConnectivity } from "../jupyter/JupyterConnectivity";
import PythonSessionClient from "../jupyter/PythonSessionClient";
import { GithubNotebookParams } from "../shared/util/indexedDb";
import GitHubIcon from "@mui/icons-material/GitHub";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import DownloadIcon from "@mui/icons-material/Download";

type ToolbarProps = {
  executingCellId: string | null;
  onRestartSession: () => void;
  sessionClient: PythonSessionClient | null;
  onCancel?: () => void;
  githubParams?: GithubNotebookParams;
  hasLocalChanges?: boolean;
  onResetToGithub?: () => void;
  onDownload?: () => void;
};

const Toolbar: FunctionComponent<ToolbarProps> = ({
  executingCellId,
  onRestartSession,
  sessionClient,
  onCancel,
  githubParams,
  hasLocalChanges,
  onResetToGithub,
  onDownload,
}) => {
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const handleRestartSession = () => {
    setRestartDialogOpen(false);
    onRestartSession();
  };

  const handleResetToGithub = () => {
    setResetDialogOpen(false);
    onResetToGithub?.();
  };

  const { jupyterServerIsAvailable } = useJupyterConnectivity();

  const getConnectionStatus = () => {
    if (sessionClient) {
      return {
        color: "#4caf50",
        text: "Connected to session",
      };
    }
    if (jupyterServerIsAvailable) {
      return {
        color: "#ff9800",
        text: "Jupyter server available - click Restart Session to connect",
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
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <MuiToolbar
        variant="dense"
        sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}
      >
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 2, flexGrow: 1 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontFamily: "monospace" }}
            >
              Ready
            </Typography>
          )}

          {githubParams && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <GitHubIcon fontSize="small" />
              <Tooltip
                title={`${githubParams.owner}/${githubParams.repo}/${githubParams.path}`}
              >
                <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                  {githubParams.owner}/{githubParams.repo}/{githubParams.path}
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
              {hasLocalChanges && onResetToGithub && (
                <Tooltip title="Reset to GitHub version">
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
          <Button
            size="small"
            color="primary"
            onClick={onDownload}
            startIcon={<DownloadIcon />}
          >
            Download
          </Button>
          <Button
            size="small"
            color="primary"
            onClick={() => setRestartDialogOpen(true)}
            disabled={!jupyterServerIsAvailable}
          >
            Restart Session
          </Button>
          {executingCellId && onCancel && (
            <Button size="small" color="error" onClick={onCancel}>
              Cancel Execution
            </Button>
          )}
        </Box>
      </MuiToolbar>

      <Dialog
        open={restartDialogOpen}
        onClose={() => setRestartDialogOpen(false)}
        aria-labelledby="restart-dialog-title"
      >
        <DialogTitle id="restart-dialog-title">Restart Session?</DialogTitle>
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

      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        aria-labelledby="reset-dialog-title"
      >
        <DialogTitle id="reset-dialog-title">
          Reset to GitHub Version?
        </DialogTitle>
        <DialogContent>
          This will discard all local changes and reset the notebook to the
          version from GitHub.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleResetToGithub}
            color="error"
            variant="contained"
          >
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </AppBar>
  );
};

export default Toolbar;
