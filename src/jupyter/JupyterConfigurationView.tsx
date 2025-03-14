import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EditIcon from "@mui/icons-material/Edit";
import RefreshIcon from "@mui/icons-material/Refresh";
import ScienceIcon from "@mui/icons-material/Science";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { FunctionComponent, useState } from "react";
import ScrollY from "../components/ScrollY";
import { useJupyterConnectivity } from "./JupyterConnectivity";
import { publicServers } from "./publicServers";
import { TestResult, testPythonSession } from "./pythonSessionTester";

type JupyterViewProps = {
  width?: number;
  height?: number;
};

const ServerStatusIndicator = ({ isAvailable }: { isAvailable: boolean }) => (
  <Box
    component="span"
    sx={{
      display: "inline-block",
      width: 10,
      height: 10,
      borderRadius: "50%",
      backgroundColor: isAvailable ? "success.main" : "error.main",
      marginRight: 1,
    }}
  />
);

const JupyterConfigurationView: FunctionComponent<JupyterViewProps> = ({
  width,
  height,
}) => {
  const {
    jupyterServerUrl,
    jupyterServerIsAvailable,
    refreshJupyter,
    changeJupyterServerUrl,
    changeJupyterServerToken,
    selectPublicServer,
    numActiveKernels,
    jupyterServerToken,
  } = useJupyterConnectivity();

  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testOutput, setTestOutput] = useState<TestResult | null>(null);
  const jupyter = useJupyterConnectivity();
  const handleTestClick = async () => {
    setIsTestRunning(true);
    setTestOutput(null);
    try {
      const result = await testPythonSession(jupyter);
      setTestOutput(result);
    } finally {
      setIsTestRunning(false);
    }
  };

  const currentServerName = publicServers.find(
    (server) => server.url === jupyterServerUrl,
  )?.name;

  const originToAllow = window.location.origin;

  return (
    <ScrollY width={width || 600} height={height || 600}>
      <Box sx={{ p: 2 }}>
        <Paper elevation={2} sx={{ mb: 3, p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <ServerStatusIndicator isAvailable={jupyterServerIsAvailable} />
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Jupyter Connection
              {currentServerName && ` - ${currentServerName}`}
            </Typography>
            {jupyterServerIsAvailable && (
              <Typography variant="body2" color="text.secondary">
                {numActiveKernels} active{" "}
                {numActiveKernels === 1 ? "kernel" : "kernels"}
              </Typography>
            )}
          </Box>

          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Current Server Status
              </Typography>
              <Typography
                color="text.secondary"
                sx={{
                  wordBreak: "break-all",
                  mb: 1,
                }}
              >
                {jupyterServerUrl}
              </Typography>
              {jupyterServerIsAvailable && (
                <Typography variant="body2" color="success.main">
                  Connected - {numActiveKernels} active{" "}
                  {numActiveKernels === 1 ? "kernel" : "kernels"}
                </Typography>
              )}
              {!jupyterServerIsAvailable && (
                <Typography variant="body2" color="error.main">
                  Not connected
                </Typography>
              )}
            </Box>

            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                onClick={changeJupyterServerUrl}
              >
                Change URL
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                onClick={changeJupyterServerToken}
              >
                {jupyterServerToken ? "Change token" : "Set token"}
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={refreshJupyter}
                color={jupyterServerIsAvailable ? "success" : undefined}
              >
                {jupyterServerIsAvailable ? "Refresh" : "Retry"}
              </Button>
              {jupyterServerIsAvailable && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ScienceIcon />}
                  onClick={handleTestClick}
                  disabled={isTestRunning}
                >
                  {isTestRunning ? "Testing..." : "Test"}
                </Button>
              )}
            </Stack>

            {currentServerName && !jupyterServerToken && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                A token needs to be set for this public server for security
                purposes
              </Alert>
            )}

            {testOutput && (
              <Alert
                severity={testOutput.success ? "success" : "error"}
                sx={{ mt: 2 }}
              >
                {testOutput.message}
              </Alert>
            )}
          </Stack>
        </Paper>

        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Hosting Instructions
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            To run a local Jupyter server:
          </Typography>
          <Stack spacing={1} sx={{ mb: 2 }}>
            <Box
              component="pre"
              sx={{
                bgcolor: "background.paper",
                p: 2,
                borderRadius: 1,
                overflowX: "auto",
                fontSize: "0.8rem",
              }}
            >
              pip install jupyterlab
            </Box>
          </Stack>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Then start Jupyter lab with:
          </Typography>
          <Stack spacing={1}>
            <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
              <Tooltip title="Copy command">
                <IconButton
                  size="small"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `jupyter lab --NotebookApp.allow_origin='${originToAllow}' --NotebookApp.token='' --NotebookApp.disable_check_xsrf="True" --no-browser --port=${jupyterServerUrl.split(":")[2] || "8888"} --MappingKernelManager.cull_interval="300" --MappingKernelManager.cull_idle_timeout="300" --MappingKernelManager.cull_connected="True"`,
                    );
                  }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box
              component="pre"
              sx={{
                bgcolor: "background.paper",
                p: 2,
                borderRadius: 1,
                overflowX: "auto",
                fontSize: "0.8rem",
              }}
            >
              jupyter lab --NotebookApp.allow_origin='{originToAllow}'
              --NotebookApp.token='' --NotebookApp.disable_check_xsrf="True"
              --no-browser --port={jupyterServerUrl.split(":")[2] || "8888"}
              --MappingKernelManager.cull_interval="300"
            </Box>
          </Stack>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Finally, update the above URL and optional token in the form above.
          </Typography>
        </Paper>

        <Paper elevation={2} sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Public Servers
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            You can either run a local Jupyter server (see hosting instructions
            above) or connect to one of the cloud servers below. Cloud servers
            require a secret token for secure access.
          </Typography>
          <Stack spacing={2}>
            {publicServers.map((server) => (
              <Card key={server.url} variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {server.name}
                  </Typography>
                  {server.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      {server.description}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {server.url}
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ mt: 1 }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Token:{" "}
                      {currentServerName === server.name && jupyterServerToken
                        ? "*****"
                        : "not set"}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => selectPublicServer(server)}
                      variant={
                        currentServerName === server.name
                          ? "contained"
                          : "outlined"
                      }
                    >
                      {currentServerName === server.name
                        ? "This server is selected"
                        : "Select this server"}
                    </Button>
                  </Stack>
                  {currentServerName === server.name && (
                    <Box sx={{ mt: 1 }}>
                      {jupyterServerIsAvailable ? (
                        <Typography variant="body2" color="success.main">
                          Connected - {numActiveKernels} active{" "}
                          {numActiveKernels === 1 ? "kernel" : "kernels"}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="error.main">
                          Not connected -{" "}
                          {jupyterServerToken
                            ? "Check token and retry"
                            : "Set token to connect"}
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Paper>
      </Box>
    </ScrollY>
  );
};

export default JupyterConfigurationView;
