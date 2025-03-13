import { FunctionComponent, useState, useCallback } from "react";
import { Box, Button, Typography, Alert } from "@mui/material";
import { useJupyterConnectivity } from "./JupyterConnectivity";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import ScienceIcon from "@mui/icons-material/Science";
import { TestResult, testPythonSession } from "./pythonSessionTester";

type JupyterViewProps = {
  width?: number;
  height?: number;
};

const JupyterConfigurationView: FunctionComponent<JupyterViewProps> = ({
  width,
  height,
}) => {
  const jupyterConnectivity = useJupyterConnectivity();
  const {
    jupyterServerUrl,
    jupyterServerIsAvailable,
    refreshJupyter,
    changeJupyterServerUrl,
    numActiveKernels,
  } = jupyterConnectivity;

  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testOutput, setTestOutput] = useState<TestResult | null>(null);

  const runTest = useCallback(async () => {
    setIsTestRunning(true);
    setTestOutput(null);

    try {
      const result = await testPythonSession(jupyterConnectivity);
      setTestOutput(result);
    } finally {
      setIsTestRunning(false);
    }
  }, [jupyterConnectivity]);

  const originToAllow = window.location.origin;

  return (
    <Box
      sx={{
        width: (width || 200) - 20,
        height,
        padding: "10px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Typography variant="h6">Jupyter Connection</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: jupyterServerIsAvailable ? "#4caf50" : "#d32f2f",
            }}
          />
          {jupyterServerIsAvailable && (
            <Typography variant="caption" color="text.secondary">
              {numActiveKernels} active{" "}
              {numActiveKernels === 1 ? "kernel" : "kernels"}
            </Typography>
          )}
        </Box>
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Server URL
        </Typography>
        <Typography
          color="text.secondary"
          sx={{
            mb: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {jupyterServerUrl}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Button
            fullWidth
            variant="outlined"
            size="small"
            startIcon={<EditIcon />}
            onClick={changeJupyterServerUrl}
          >
            Change Server URL
          </Button>
          <Button
            fullWidth
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={refreshJupyter}
            color={jupyterServerIsAvailable ? "success" : undefined}
          >
            {jupyterServerIsAvailable
              ? "Connected - Click to Refresh"
              : "Not Connected - Click to Retry"}
          </Button>
          {jupyterServerIsAvailable && (
            <Button
              fullWidth
              variant="outlined"
              size="small"
              startIcon={<ScienceIcon />}
              onClick={runTest}
              disabled={isTestRunning}
            >
              {isTestRunning ? "Testing..." : "Run Test"}
            </Button>
          )}
        </Box>
        {testOutput && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Test Output
            </Typography>
            <Alert severity={testOutput.success ? "success" : "error"}>
              {testOutput.message}
            </Alert>
          </Box>
        )}
        {!jupyterServerIsAvailable && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            If Jupyter lab is not installed, you can install it via:
            <Box
              component="pre"
              sx={{
                bgcolor: "background.paper",
                p: 1,
                borderRadius: 1,
                overflowX: "auto",
                fontSize: "0.8rem",
                mb: 2,
              }}
            >
              pip install jupyterlab
            </Box>
            Then start Jupyter lab locally by running the following command
            <Box
              component="pre"
              sx={{
                bgcolor: "background.paper",
                p: 1,
                borderRadius: 1,
                overflowX: "auto",
                fontSize: "0.8rem",
              }}
            >
              jupyter lab --NotebookApp.allow_origin='{originToAllow}'
              --NotebookApp.token='' --NotebookApp.disable_check_xsrf="True"
              --no-browser --port={jupyterServerUrl.split(":")[2] || "8888"}
            </Box>
            After starting the server, click the retry button above to connect.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default JupyterConfigurationView;
