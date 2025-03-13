import {
  AppBar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Toolbar as MuiToolbar,
  Typography,
} from "@mui/material";
import { FunctionComponent, useState } from "react";
import { useJupyterConnectivity } from "../jupyter/JupyterConnectivity";
import PythonSessionClient from "../jupyter/PythonSessionClient";

type ToolbarProps = {
  executingCellId: string | null;
  onRestartSession: () => void;
  sessionClient: PythonSessionClient | null;
};

const Toolbar: FunctionComponent<ToolbarProps> = ({
  executingCellId,
  onRestartSession,
  sessionClient,
}) => {
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);

  const handleRestartSession = () => {
    setRestartDialogOpen(false);
    onRestartSession();
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
      <MuiToolbar variant="dense" sx={{ display: "flex", gap: 2 }}>
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
        <Typography
          variant="body2"
          color={executingCellId ? "primary" : "text.secondary"}
          sx={{ fontFamily: "monospace" }}
        >
          {executingCellId ? `Executing cell: ${executingCellId}` : "Ready"}
        </Typography>
        <Button
          size="small"
          color="primary"
          onClick={() => setRestartDialogOpen(true)}
          sx={{ ml: "auto" }}
          disabled={!jupyterServerIsAvailable}
        >
          Restart Session
        </Button>
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
    </AppBar>
  );
};

export default Toolbar;
